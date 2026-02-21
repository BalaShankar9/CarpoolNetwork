/**
 * Netlify Function: stripe-webhook
 * Receives Stripe webhook events and syncs subscription/payment state to Supabase.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET  – from Stripe Dashboard → Webhooks → Signing secret
 *   SUPABASE_URL / SUPABASE_SERVICE_KEY
 *
 * Events handled:
 *   checkout.session.completed
 *   customer.subscription.updated
 *   customer.subscription.deleted
 *   invoice.payment_succeeded
 *   invoice.payment_failed
 *   payment_intent.succeeded
 *   payment_intent.payment_failed
 */

import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-04-30.basil',
});

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error('Missing Stripe signature or webhook secret');
    return { statusCode: 400, body: 'Missing signature' };
  }

  let stripeEvent: Stripe.Event;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body || '',
      sig,
      webhookSecret
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', message);
    return { statusCode: 400, body: `Webhook Error: ${message}` };
  }

  try {
    switch (stripeEvent.type) {
      // -----------------------------------------------------------------------
      // Checkout completed → create/update membership record
      // -----------------------------------------------------------------------
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription') break;

        const userId = session.metadata?.supabase_user_id;
        const planId = session.metadata?.plan_id;
        if (!userId || !session.subscription) break;

        // Retrieve full subscription from Stripe
        const sub = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        await upsertMembership(userId, planId, sub);
        break;
      }

      // -----------------------------------------------------------------------
      // Subscription updated (upgrade/downgrade/renewal)
      // -----------------------------------------------------------------------
      case 'customer.subscription.updated': {
        const sub = stripeEvent.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id;
        if (!userId) {
          // Try to find user via customer ID
          const customer = await stripe.customers.retrieve(sub.customer as string);
          const uid = (customer as Stripe.Customer).metadata?.supabase_user_id;
          if (uid) await upsertMembership(uid, sub.metadata?.plan_id, sub);
        } else {
          await upsertMembership(userId, sub.metadata?.plan_id, sub);
        }
        break;
      }

      // -----------------------------------------------------------------------
      // Subscription cancelled/expired
      // -----------------------------------------------------------------------
      case 'customer.subscription.deleted': {
        const sub = stripeEvent.data.object as Stripe.Subscription;

        await supabase
          .from('user_memberships')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', sub.id);

        // Downgrade profile to free
        const customer = await stripe.customers.retrieve(sub.customer as string);
        const uid = (customer as Stripe.Customer).metadata?.supabase_user_id;
        if (uid) {
          await supabase
            .from('profiles')
            .update({ is_premium: false })
            .eq('id', uid);
        }
        break;
      }

      // -----------------------------------------------------------------------
      // Invoice paid → mark payment complete
      // -----------------------------------------------------------------------
      case 'invoice.payment_succeeded': {
        const invoice = stripeEvent.data.object as Stripe.Invoice;
        if (!invoice.payment_intent) break;

        await supabase
          .from('payments')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('stripe_payment_intent_id', invoice.payment_intent);
        break;
      }

      // -----------------------------------------------------------------------
      // Invoice payment failed → mark subscription past_due
      // -----------------------------------------------------------------------
      case 'invoice.payment_failed': {
        const invoice = stripeEvent.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await supabase
            .from('user_memberships')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', invoice.subscription);
        }
        break;
      }

      // -----------------------------------------------------------------------
      // One-time payment succeeded
      // -----------------------------------------------------------------------
      case 'payment_intent.succeeded': {
        const pi = stripeEvent.data.object as Stripe.PaymentIntent;
        await supabase
          .from('payments')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('stripe_payment_intent_id', pi.id);
        break;
      }

      // -----------------------------------------------------------------------
      // One-time payment failed
      // -----------------------------------------------------------------------
      case 'payment_intent.payment_failed': {
        const pi = stripeEvent.data.object as Stripe.PaymentIntent;
        await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('stripe_payment_intent_id', pi.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err: unknown) {
    console.error('Webhook handler error:', err);
    const message = err instanceof Error ? err.message : 'Internal error';
    return { statusCode: 500, body: JSON.stringify({ error: message }) };
  }
};

// ---------------------------------------------------------------------------
// Helper: upsert membership record from a Stripe Subscription object
// ---------------------------------------------------------------------------
async function upsertMembership(
  userId: string,
  planId: string | undefined,
  sub: Stripe.Subscription
): Promise<void> {
  const periodStart = new Date(sub.current_period_start * 1000);
  const periodEnd = new Date(sub.current_period_end * 1000);

  // Determine tier from price metadata or plan lookup
  const priceId = sub.items.data[0]?.price.id;
  let tier: 'plus' | 'pro' = 'plus';
  if (priceId) {
    // Look up plan tier from subscription_plans table
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('tier')
      .eq('stripe_price_id', priceId)
      .single();
    if (plan?.tier === 'pro') tier = 'pro';
  }

  const statusMap: Record<string, string> = {
    active: 'active',
    trialing: 'trialing',
    past_due: 'past_due',
    canceled: 'cancelled',
    incomplete: 'past_due',
    incomplete_expired: 'expired',
    unpaid: 'past_due',
    paused: 'cancelled',
  };

  const mappedStatus = statusMap[sub.status] || 'active';

  await supabase.from('user_memberships').upsert(
    {
      user_id: userId,
      tier,
      status: mappedStatus,
      billing_cycle: 'monthly',
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end,
      trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      stripe_subscription_id: sub.id,
      stripe_customer_id: sub.customer as string,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  // Update profile premium flag
  const isPremium = mappedStatus === 'active' || mappedStatus === 'trialing';
  await supabase
    .from('profiles')
    .update({ is_premium: isPremium })
    .eq('id', userId);
}
