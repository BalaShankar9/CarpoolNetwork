/**
 * Netlify Function: create-subscription
 * Creates a Stripe Checkout Session for a subscription plan upgrade.
 * Returns a Stripe Checkout URL that the frontend redirects to.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY
 *   APP_URL            – e.g. https://carpoolnetwork.co.uk
 *   SUPABASE_URL / SUPABASE_SERVICE_KEY
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

const APP_URL = process.env.APP_URL || 'https://carpoolnetwork.co.uk';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { userId, priceId, planId, billingCycle } = JSON.parse(event.body || '{}');

    if (!userId || !priceId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing userId or priceId' }),
      };
    }

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email, full_name')
      .eq('id', userId)
      .single();

    let customerId: string = profile?.stripe_customer_id || '';

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email,
        name: profile?.full_name,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    // Check if user already has an active subscription
    const { data: existingMembership } = await supabase
      .from('user_memberships')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .single();

    if (existingMembership?.stripe_subscription_id) {
      // Return Stripe Customer Portal URL instead for upgrades/downgrades
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${APP_URL}/settings?tab=subscription`,
      });
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkoutUrl: session.url, isPortal: true }),
      };
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          supabase_user_id: userId,
          plan_id: planId,
          billing_cycle: billingCycle,
        },
      },
      success_url: `${APP_URL}/settings?tab=subscription&session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${APP_URL}/settings?tab=subscription&cancelled=true`,
      metadata: {
        supabase_user_id: userId,
        plan_id: planId,
      },
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkoutUrl: session.url }),
    };
  } catch (err: unknown) {
    console.error('create-subscription error:', err);
    const message = err instanceof Error ? err.message : 'Internal error';
    return { statusCode: 500, body: JSON.stringify({ error: message }) };
  }
};
