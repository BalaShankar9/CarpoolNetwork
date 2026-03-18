import { vi } from 'vitest';

/* ------------------------------------------------------------------ */
/*  Fake IDs                                                           */
/* ------------------------------------------------------------------ */
export const FAKE_USER_ID = 'user-pay-001';
export const FAKE_OTHER_USER_ID = 'user-pay-002';
export const FAKE_RIDE_ID = 'ride-pay-001';
export const FAKE_PM_ID_1 = 'pm-001';
export const FAKE_PM_ID_2 = 'pm-002';
export const FAKE_PAYMENT_ID_1 = 'pay-001';
export const FAKE_PAYMENT_ID_2 = 'pay-002';
export const FAKE_PAYMENT_ID_3 = 'pay-003';

/* ------------------------------------------------------------------ */
/*  Fake user                                                          */
/* ------------------------------------------------------------------ */
export const FAKE_USER = { id: FAKE_USER_ID, email: 'payer@test.com' };

/* ------------------------------------------------------------------ */
/*  PaymentMethod fixtures                                             */
/* ------------------------------------------------------------------ */
export const FAKE_METHOD_DEFAULT = {
  id: FAKE_PM_ID_1,
  userId: FAKE_USER_ID,
  type: 'card' as const,
  brand: 'Visa',
  last4: '4242',
  expiryMonth: 12,
  expiryYear: 2026,
  isDefault: true,
  stripePaymentMethodId: 'pm_stripe_001',
  createdAt: new Date('2024-01-15'),
};

export const FAKE_METHOD_SECONDARY = {
  id: FAKE_PM_ID_2,
  userId: FAKE_USER_ID,
  type: 'card' as const,
  brand: 'Mastercard',
  last4: '5555',
  expiryMonth: 3,
  expiryYear: 2025,
  isDefault: false,
  stripePaymentMethodId: 'pm_stripe_002',
  createdAt: new Date('2024-02-20'),
};

export const FAKE_METHODS = [FAKE_METHOD_DEFAULT, FAKE_METHOD_SECONDARY];

/* ------------------------------------------------------------------ */
/*  Payment fixtures                                                   */
/* ------------------------------------------------------------------ */
export const FAKE_PAYMENT_SENT = {
  id: FAKE_PAYMENT_ID_1,
  rideId: FAKE_RIDE_ID,
  payerId: FAKE_USER_ID,
  recipientId: FAKE_OTHER_USER_ID,
  amount: 5.5,
  currency: 'GBP',
  status: 'completed' as const,
  type: 'fuel_contribution' as const,
  stripePaymentIntentId: 'pi_001',
  metadata: {},
  createdAt: new Date('2024-06-10T14:30:00Z'),
  completedAt: new Date('2024-06-10T14:31:00Z'),
};

export const FAKE_PAYMENT_RECEIVED = {
  id: FAKE_PAYMENT_ID_2,
  rideId: FAKE_RIDE_ID,
  payerId: FAKE_OTHER_USER_ID,
  recipientId: FAKE_USER_ID,
  amount: 3.25,
  currency: 'GBP',
  status: 'completed' as const,
  type: 'tip' as const,
  stripePaymentIntentId: 'pi_002',
  metadata: {},
  createdAt: new Date('2024-06-11T09:00:00Z'),
  completedAt: new Date('2024-06-11T09:01:00Z'),
};

export const FAKE_PAYMENT_PENDING = {
  id: FAKE_PAYMENT_ID_3,
  rideId: FAKE_RIDE_ID,
  payerId: FAKE_USER_ID,
  recipientId: FAKE_OTHER_USER_ID,
  amount: 7.0,
  currency: 'GBP',
  status: 'pending' as const,
  type: 'carbon_offset' as const,
  metadata: {},
  createdAt: new Date('2024-06-12T10:00:00Z'),
};

export const FAKE_PAYMENTS = [FAKE_PAYMENT_SENT, FAKE_PAYMENT_RECEIVED, FAKE_PAYMENT_PENDING];

/* ------------------------------------------------------------------ */
/*  FuelContribution fixture                                           */
/* ------------------------------------------------------------------ */
export const FAKE_FUEL_CONTRIBUTION = {
  rideId: '',
  suggestedAmount: 4.83,
  currency: 'GBP',
  distanceKm: 40,
  fuelPricePerLiter: 1.45,
  fuelEfficiency: 12,
  passengers: 2,
};

/* ------------------------------------------------------------------ */
/*  Payment stats fixture                                              */
/* ------------------------------------------------------------------ */
export const FAKE_STATS = {
  totalPaid: 12.5,
  totalReceived: 3.25,
  pendingPayments: 1,
  paymentCount: 3,
};
