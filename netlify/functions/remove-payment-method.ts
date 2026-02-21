/**
 * Netlify Function: remove-payment-method
 * Detaches a Stripe PaymentMethod from the customer and deletes the DB record.
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

  try {
    const { paymentMethodId } = JSON.parse(event.body || '{}');

    if (!paymentMethodId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing paymentMethodId' }) };
    }

    // Lookup DB record to get Stripe ID
    const { data: pm } = await supabase
      .from('payment_methods')
      .select('stripe_payment_method_id, user_id, is_default')
      .eq('id', paymentMethodId)
      .single();

    if (!pm) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Payment method not found' }) };
    }

    // Detach from Stripe
    await stripe.paymentMethods.detach(pm.stripe_payment_method_id);

    // Remove from Supabase
    await supabase.from('payment_methods').delete().eq('id', paymentMethodId);

    // If it was the default, promote the next available card
    if (pm.is_default) {
      const { data: remaining } = await supabase
        .from('payment_methods')
        .select('id, stripe_payment_method_id')
        .eq('user_id', pm.user_id)
        .order('created_at', { ascending: true })
        .limit(1);

      if (remaining && remaining.length > 0) {
        await supabase
          .from('payment_methods')
          .update({ is_default: true })
          .eq('id', remaining[0].id);

        // Also update Stripe customer default
        const { data: profile } = await supabase
          .from('profiles')
          .select('stripe_customer_id')
          .eq('id', pm.user_id)
          .single();

        if (profile?.stripe_customer_id) {
          await stripe.customers.update(profile.stripe_customer_id, {
            invoice_settings: {
              default_payment_method: remaining[0].stripe_payment_method_id,
            },
          });
        }
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true }),
    };
  } catch (err: unknown) {
    console.error('remove-payment-method error:', err);
    const message = err instanceof Error ? err.message : 'Internal error';
    return { statusCode: 500, body: JSON.stringify({ error: message }) };
  }
};
