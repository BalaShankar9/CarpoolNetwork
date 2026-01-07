import { supabase } from '../lib/supabase';

// Types
export interface PaymentMethod {
  id: string;
  userId: string;
  type: 'card' | 'bank_account' | 'wallet';
  brand?: string;
  last4: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  stripePaymentMethodId: string;
  createdAt: Date;
}

export interface Payment {
  id: string;
  rideId: string;
  payerId: string;
  recipientId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  type: 'fuel_contribution' | 'premium_subscription' | 'carbon_offset' | 'tip';
  stripePaymentIntentId?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  completedAt?: Date;
}

export interface PaymentSplit {
  id: string;
  paymentId: string;
  userId: string;
  amount: number;
  status: 'pending' | 'paid' | 'refunded';
}

export interface FuelContribution {
  rideId: string;
  suggestedAmount: number;
  currency: string;
  distanceKm: number;
  fuelPricePerLiter: number;
  fuelEfficiency: number; // km per liter
  passengers: number;
}

export interface PaymentReceipt {
  id: string;
  paymentId: string;
  receiptNumber: string;
  pdfUrl?: string;
  emailSent: boolean;
  createdAt: Date;
}

// Fuel price defaults (can be updated from admin)
const DEFAULT_FUEL_PRICE = 1.45; // £/L
const DEFAULT_FUEL_EFFICIENCY = 12; // km/L average

// Payment Service
export const paymentService = {
  // Calculate suggested fuel contribution
  calculateFuelContribution(
    distanceKm: number,
    passengers: number,
    fuelPricePerLiter: number = DEFAULT_FUEL_PRICE,
    fuelEfficiency: number = DEFAULT_FUEL_EFFICIENCY
  ): FuelContribution {
    // Total fuel cost for the trip
    const totalFuelCost = (distanceKm / fuelEfficiency) * fuelPricePerLiter;
    
    // Split evenly among passengers (driver doesn't pay)
    const suggestedPerPassenger = passengers > 0 ? totalFuelCost / passengers : 0;
    
    return {
      rideId: '',
      suggestedAmount: Math.round(suggestedPerPassenger * 100) / 100,
      currency: 'GBP',
      distanceKm,
      fuelPricePerLiter,
      fuelEfficiency,
      passengers,
    };
  },

  // Create a payment intent (for Stripe)
  async createPaymentIntent(
    userId: string,
    amount: number,
    currency: string,
    type: Payment['type'],
    metadata: Record<string, unknown> = {}
  ): Promise<{ clientSecret: string; paymentId: string }> {
    try {
      // In production, this would call a Netlify function that interfaces with Stripe
      const response = await fetch('/.netlify/functions/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount: Math.round(amount * 100), // Convert to cents
          currency,
          type,
          metadata,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      return await response.json();
    } catch (error) {
      console.error('Payment intent creation failed:', error);
      
      // Fallback for development/demo - create local payment record
      const paymentId = crypto.randomUUID();
      await this.recordPayment({
        id: paymentId,
        rideId: (metadata.rideId as string) || '',
        payerId: userId,
        recipientId: (metadata.recipientId as string) || '',
        amount,
        currency,
        status: 'pending',
        type,
        metadata,
        createdAt: new Date(),
      });

      return {
        clientSecret: `demo_secret_${paymentId}`,
        paymentId,
      };
    }
  },

  // Record a payment in the database
  async recordPayment(payment: Payment): Promise<Payment> {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        id: payment.id,
        ride_id: payment.rideId || null,
        payer_id: payment.payerId,
        recipient_id: payment.recipientId || null,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        type: payment.type,
        stripe_payment_intent_id: payment.stripePaymentIntentId,
        metadata: payment.metadata,
        created_at: payment.createdAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to record payment:', error);
      return payment; // Return original for demo purposes
    }

    return this.mapPaymentFromDb(data);
  },

  // Update payment status
  async updatePaymentStatus(
    paymentId: string,
    status: Payment['status'],
    stripePaymentIntentId?: string
  ): Promise<void> {
    const updateData: Record<string, unknown> = { status };
    
    if (stripePaymentIntentId) {
      updateData.stripe_payment_intent_id = stripePaymentIntentId;
    }
    
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', paymentId);

    if (error) {
      console.error('Failed to update payment status:', error);
    }
  },

  // Get user's payments
  async getUserPayments(userId: string, type?: Payment['type']): Promise<Payment[]> {
    let query = supabase
      .from('payments')
      .select('*')
      .or(`payer_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to get user payments:', error);
      return [];
    }

    return data.map(this.mapPaymentFromDb);
  },

  // Get payment by ID
  async getPayment(paymentId: string): Promise<Payment | null> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (error) {
      console.error('Failed to get payment:', error);
      return null;
    }

    return this.mapPaymentFromDb(data);
  },

  // Process refund
  async processRefund(
    paymentId: string,
    reason: string,
    amount?: number // Partial refund if specified
  ): Promise<{ success: boolean; refundId?: string }> {
    try {
      const response = await fetch('/.netlify/functions/process-refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          reason,
          amount,
        }),
      });

      if (!response.ok) {
        throw new Error('Refund failed');
      }

      const result = await response.json();
      
      // Update local payment status
      await this.updatePaymentStatus(paymentId, 'refunded');

      return result;
    } catch (error) {
      console.error('Refund processing failed:', error);
      
      // Demo mode - just update status
      await this.updatePaymentStatus(paymentId, 'refunded');
      return { success: true, refundId: `demo_refund_${Date.now()}` };
    }
  },

  // Payment methods management
  async addPaymentMethod(
    userId: string,
    stripePaymentMethodId: string
  ): Promise<PaymentMethod | null> {
    try {
      const response = await fetch('/.netlify/functions/add-payment-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          stripePaymentMethodId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add payment method');
      }

      return await response.json();
    } catch (error) {
      console.error('Add payment method failed:', error);
      return null;
    }
  },

  async getUserPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false });

    if (error) {
      console.error('Failed to get payment methods:', error);
      return [];
    }

    return data.map((pm: any) => ({
      id: pm.id,
      userId: pm.user_id,
      type: pm.type,
      brand: pm.brand,
      last4: pm.last4,
      expiryMonth: pm.expiry_month,
      expiryYear: pm.expiry_year,
      isDefault: pm.is_default,
      stripePaymentMethodId: pm.stripe_payment_method_id,
      createdAt: new Date(pm.created_at),
    }));
  },

  async setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    // First, unset all defaults
    await supabase
      .from('payment_methods')
      .update({ is_default: false })
      .eq('user_id', userId);

    // Set new default
    await supabase
      .from('payment_methods')
      .update({ is_default: true })
      .eq('id', paymentMethodId);
  },

  async removePaymentMethod(paymentMethodId: string): Promise<boolean> {
    try {
      const response = await fetch('/.netlify/functions/remove-payment-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove payment method');
      }

      await supabase
        .from('payment_methods')
        .delete()
        .eq('id', paymentMethodId);

      return true;
    } catch (error) {
      console.error('Remove payment method failed:', error);
      return false;
    }
  },

  // Split payment between multiple passengers
  async createSplitPayment(
    rideId: string,
    driverId: string,
    totalAmount: number,
    passengerIds: string[],
    currency: string = 'GBP'
  ): Promise<{ paymentId: string; splits: PaymentSplit[] }> {
    const paymentId = crypto.randomUUID();
    const amountPerPerson = totalAmount / passengerIds.length;

    // Create main payment record
    await this.recordPayment({
      id: paymentId,
      rideId,
      payerId: '', // Multiple payers
      recipientId: driverId,
      amount: totalAmount,
      currency,
      status: 'pending',
      type: 'fuel_contribution',
      metadata: { splitPayment: true, passengerCount: passengerIds.length },
      createdAt: new Date(),
    });

    // Create split records
    const splits: PaymentSplit[] = passengerIds.map((passengerId) => ({
      id: crypto.randomUUID(),
      paymentId,
      userId: passengerId,
      amount: Math.round(amountPerPerson * 100) / 100,
      status: 'pending' as const,
    }));

    // Store splits in database
    const { error } = await supabase.from('payment_splits').insert(
      splits.map((s) => ({
        id: s.id,
        payment_id: s.paymentId,
        user_id: s.userId,
        amount: s.amount,
        status: s.status,
      }))
    );

    if (error) {
      console.error('Failed to create payment splits:', error);
    }

    return { paymentId, splits };
  },

  // Get payment statistics
  async getPaymentStats(userId: string): Promise<{
    totalPaid: number;
    totalReceived: number;
    pendingPayments: number;
    paymentCount: number;
  }> {
    const payments = await this.getUserPayments(userId);

    const totalPaid = payments
      .filter((p) => p.payerId === userId && p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalReceived = payments
      .filter((p) => p.recipientId === userId && p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingPayments = payments.filter(
      (p) => p.payerId === userId && p.status === 'pending'
    ).length;

    return {
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalReceived: Math.round(totalReceived * 100) / 100,
      pendingPayments,
      paymentCount: payments.length,
    };
  },

  // Generate receipt
  async generateReceipt(paymentId: string): Promise<PaymentReceipt | null> {
    const payment = await this.getPayment(paymentId);
    if (!payment || payment.status !== 'completed') {
      return null;
    }

    const receipt: PaymentReceipt = {
      id: crypto.randomUUID(),
      paymentId,
      receiptNumber: `RCP-${Date.now()}-${paymentId.slice(0, 8).toUpperCase()}`,
      emailSent: false,
      createdAt: new Date(),
    };

    // Store receipt
    await supabase.from('payment_receipts').insert({
      id: receipt.id,
      payment_id: receipt.paymentId,
      receipt_number: receipt.receiptNumber,
      email_sent: receipt.emailSent,
      created_at: receipt.createdAt.toISOString(),
    });

    return receipt;
  },

  // Helper to map database record to Payment type
  mapPaymentFromDb(data: any): Payment {
    return {
      id: data.id,
      rideId: data.ride_id,
      payerId: data.payer_id,
      recipientId: data.recipient_id,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
      type: data.type,
      stripePaymentIntentId: data.stripe_payment_intent_id,
      metadata: data.metadata || {},
      createdAt: new Date(data.created_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
    };
  },
};
