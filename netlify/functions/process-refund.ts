/**
 * Netlify Function: process-refund
 * Issues a full or partial refund via Stripe and updates the Supabase payment record.
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
    const { paymentId, reason, amount } = JSON.parse(event.body || '{}');

    if (!paymentId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing paymentId' }) };
    }

    // Retrieve payment from Supabase
    const { data: payment } = await supabase
      .from('payments')
      .select('stripe_payment_intent_id, amount, currency, status')
      .eq('id', paymentId)
      .single();

    if (!payment) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Payment not found' }) };
    }

    if (payment.status === 'refunded') {
      return { statusCode: 400, body: JSON.stringify({ error: 'Payment already refunded' }) };
    }

    let refundId: string | undefined;

    if (payment.stripe_payment_intent_id) {
      // Refund via Stripe
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: payment.stripe_payment_intent_id,
        reason: 'requested_by_customer',
      };

      if (amount) {
        refundParams.amount = Math.round(amount * 100); // partial refund in pence
      }

      const refund = await stripe.refunds.create(refundParams);
      refundId = refund.id;
    }

    // Update Supabase record
    await supabase
      .from('payments')
      .update({
        status: 'refunded',
        metadata: { refund_reason: reason, refund_id: refundId },
      })
      .eq('id', paymentId);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, refundId }),
    };
  } catch (err: unknown) {
    console.error('process-refund error:', err);
    const message = err instanceof Error ? err.message : 'Internal error';
    return { statusCode: 500, body: JSON.stringify({ error: message }) };
  }
};
