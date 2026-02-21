/**
 * Netlify Function: create-payment-intent
 * Creates a Stripe PaymentIntent for a ride fuel contribution or tip.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY  – your Stripe secret key (sk_live_… / sk_test_…)
 *   SUPABASE_URL       – Supabase project URL
 *   SUPABASE_SERVICE_KEY – Supabase service-role key (NOT the anon key)
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
    const { userId, amount, currency = 'gbp', type, metadata = {} } = JSON.parse(
      event.body || '{}'
    );

    if (!userId || !amount) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId or amount' }) };
    }

    // Ensure user has a Stripe customer ID
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

    // Create the PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // amount in smallest currency unit (pence)
      currency: currency.toLowerCase(),
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      metadata: {
        supabase_user_id: userId,
        payment_type: type,
        ...metadata,
      },
    });

    // Record in Supabase immediately as 'pending'
    const paymentId = crypto.randomUUID();
    await supabase.from('payments').insert({
      id: paymentId,
      payer_id: userId,
      recipient_id: (metadata as Record<string, string>).recipientId || null,
      ride_id: (metadata as Record<string, string>).rideId || null,
      amount: amount / 100,
      currency: currency.toUpperCase(),
      status: 'pending',
      type,
      stripe_payment_intent_id: paymentIntent.id,
      metadata,
      created_at: new Date().toISOString(),
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentId,
      }),
    };
  } catch (err: unknown) {
    console.error('create-payment-intent error:', err);
    const message = err instanceof Error ? err.message : 'Internal error';
    return {
      statusCode: 500,
      body: JSON.stringify({ error: message }),
    };
  }
};
