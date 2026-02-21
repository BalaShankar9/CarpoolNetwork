/**
 * Netlify Function: add-payment-method
 * Attaches a Stripe PaymentMethod to the customer and stores metadata in Supabase.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY
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

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { userId, stripePaymentMethodId } = JSON.parse(event.body || '{}');

    if (!userId || !stripePaymentMethodId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing userId or stripePaymentMethodId' }),
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

    // Attach the payment method to the customer
    await stripe.paymentMethods.attach(stripePaymentMethodId, {
      customer: customerId,
    });

    // Retrieve full card details from Stripe
    const pm = await stripe.paymentMethods.retrieve(stripePaymentMethodId);
    const card = pm.card;

    if (!card) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Not a card payment method' }) };
    }

    // Check if this is the first card (make it default)
    const { count } = await supabase
      .from('payment_methods')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    const isDefault = (count ?? 0) === 0;

    // Store metadata in Supabase
    const { data, error } = await supabase
      .from('payment_methods')
      .insert({
        user_id: userId,
        type: 'card',
        brand: card.brand,
        last4: card.last4,
        expiry_month: card.exp_month,
        expiry_year: card.exp_year,
        is_default: isDefault,
        stripe_payment_method_id: stripePaymentMethodId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    // If default, update customer's default payment method on Stripe side
    if (isDefault) {
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: stripePaymentMethodId },
      });
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: data.id,
        userId: data.user_id,
        type: data.type,
        brand: data.brand,
        last4: data.last4,
        expiryMonth: data.expiry_month,
        expiryYear: data.expiry_year,
        isDefault: data.is_default,
        stripePaymentMethodId: data.stripe_payment_method_id,
        createdAt: data.created_at,
      }),
    };
  } catch (err: unknown) {
    console.error('add-payment-method error:', err);
    const message = err instanceof Error ? err.message : 'Internal error';
    return { statusCode: 500, body: JSON.stringify({ error: message }) };
  }
};
