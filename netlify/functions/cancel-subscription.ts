/**
 * Netlify Function: cancel-subscription
 * Cancels a Stripe subscription immediately or at period end.
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
    const { subscriptionId, atPeriodEnd = true } = JSON.parse(event.body || '{}');

    if (!subscriptionId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing subscriptionId' }) };
    }

    if (atPeriodEnd) {
      // Schedule cancellation at end of current period
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      // Cancel immediately
      await stripe.subscriptions.cancel(subscriptionId);
    }

    // Update Supabase record
    await supabase
      .from('user_memberships')
      .update({
        cancel_at_period_end: atPeriodEnd,
        status: atPeriodEnd ? 'active' : 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscriptionId);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true }),
    };
  } catch (err: unknown) {
    console.error('cancel-subscription error:', err);
    const message = err instanceof Error ? err.message : 'Internal error';
    return { statusCode: 500, body: JSON.stringify({ error: message }) };
  }
};
