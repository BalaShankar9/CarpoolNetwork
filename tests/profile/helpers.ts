/**
 * Shared fixtures, factories, and mock builders for Profile module tests.
 */
import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const FAKE_USER_ID = 'user-prof-001';
export const FAKE_OTHER_USER_ID = 'user-prof-002';

export const FAKE_USER = { id: FAKE_USER_ID, email: 'alice@example.com' };

export const FAKE_PROFILE = {
  id: FAKE_USER_ID,
  full_name: 'Alice Tester',
  avatar_url: null,
  profile_photo_url: 'https://example.com/alice.jpg',
  profile_verified: true,
  average_rating: 4.5,
  total_rides_offered: 10,
  total_rides_taken: 5,
  bio: 'Testing is my passion and my career',
  phone_e164: '+447700900001',
  phone_verified: true,
  is_verified: true,
  email_verified: true,
  photo_verified: true,
  id_verified: false,
  trust_score: 72,
  created_at: '2024-06-15T10:00:00Z',
};

/** Profile with nothing completed — useful for "empty" tests */
export const FAKE_EMPTY_PROFILE = {
  ...FAKE_PROFILE,
  avatar_url: null,
  profile_photo_url: null,
  profile_verified: false,
  phone_e164: null,
  phone_verified: false,
  bio: '',
  total_rides_offered: 0,
  total_rides_taken: 0,
  is_verified: false,
  email_verified: false,
  photo_verified: false,
  id_verified: false,
  trust_score: 10,
  average_rating: 0,
};

// ---------------------------------------------------------------------------
// Profile-specific fixtures
// ---------------------------------------------------------------------------

export const FAKE_DRIVER_LICENSE = {
  id: 'lic-001',
  user_id: FAKE_USER_ID,
  license_number: 'SMITH90106AB1CD',
  issue_date: '2020-01-01',
  expiry_date: '2028-01-01',
  issuing_country: 'UK',
  license_class: 'B',
  status: 'verified' as const,
  rejection_reason: null,
  document_path: 'documents/user-prof-001/license_123.jpg',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
};

export const FAKE_INSURANCE = {
  id: 'ins-001',
  user_id: FAKE_USER_ID,
  vehicle_id: 'veh-001',
  policy_number: 'POL-123456',
  provider: 'Aviva',
  issue_date: '2024-01-01',
  expiry_date: '2027-12-31',
  coverage_type: 'comprehensive',
  status: 'active' as const,
  rejection_reason: null,
  document_path: null,
};

export const FAKE_VEHICLE = {
  id: 'veh-001',
  user_id: FAKE_USER_ID,
  make: 'Toyota',
  model: 'Corolla',
  year: 2022,
  color: 'Silver',
  license_plate: 'AB12CDE',
  capacity: 4,
  is_active: true,
  fuel_type: 'petrol',
  vehicle_type: 'sedan',
  registration_year: 2022,
  engine_capacity: 1800,
  image_url: null,
  vehicle_photo_url: 'https://example.com/car.jpg',
  mot_status: 'valid',
  mot_expiry_date: '2027-06-01',
  tax_status: 'taxed',
  tax_due_date: '2027-03-01',
};

export const FAKE_EMERGENCY_CONTACT = {
  id: 'ec-001',
  name: 'John Smith',
  phone: '+447700900002',
  relationship: 'spouse',
  is_primary: true,
};

export const FAKE_REVIEW = {
  id: 'rev-001',
  rating: 5,
  comment: 'Great driver, very safe!',
  review_type: 'driver' as const,
  created_at: '2025-01-15T12:00:00Z',
  reviewer: {
    id: FAKE_OTHER_USER_ID,
    full_name: 'Bob Driver',
    avatar_url: null,
    profile_photo_url: null,
  },
};

export const FAKE_RELIABILITY_DATA = {
  reliability_score: 85,
  total_rides: 30,
  completed_rides: 27,
  cancelled_rides: 3,
  completion_ratio: 0.9,
  cancellation_ratio: 0.1,
  last_minute_cancellations: 1,
  warnings_count: 0,
  is_in_grace_period: false,
  grace_rides_remaining: 0,
};

export const FAKE_RESTRICTION = {
  restriction_type: 'booking_limit',
  reason: 'Excessive cancellations',
  starts_at: '2025-03-01T00:00:00Z',
  ends_at: '2025-04-01T00:00:00Z',
  is_active: true,
};

// ---------------------------------------------------------------------------
// buildMockChain — Supabase query builder mock
// ---------------------------------------------------------------------------

export function buildMockChain(data: any = [], error: any = null) {
  const isArray = Array.isArray(data);
  const thenable = {
    then(resolve: (val: any) => void) {
      resolve({ data, error, count: isArray ? data.length : (data ? 1 : 0) });
      return thenable;
    },
  };

  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnValue({
      then(resolve: (v: any) => void) {
        resolve({ data: isArray ? data[0] ?? null : data, error });
        return { then: (r: any) => r({ data: isArray ? data[0] ?? null : data, error }) };
      },
    }),
    maybeSingle: vi.fn().mockReturnValue({
      then(resolve: (v: any) => void) {
        resolve({ data: isArray ? data[0] ?? null : data, error });
        return { then: (r: any) => r({ data: isArray ? data[0] ?? null : data, error }) };
      },
    }),
    then: thenable.then,
  };

  return chain;
}

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

export function makeReview(overrides: Record<string, any> = {}) {
  return { ...FAKE_REVIEW, id: `rev-${Math.random().toString(36).slice(2, 8)}`, ...overrides };
}

export function makeVehicle(overrides: Record<string, any> = {}) {
  return { ...FAKE_VEHICLE, id: `veh-${Math.random().toString(36).slice(2, 8)}`, ...overrides };
}

export function makeEmergencyContact(overrides: Record<string, any> = {}) {
  return { ...FAKE_EMERGENCY_CONTACT, id: `ec-${Math.random().toString(36).slice(2, 8)}`, ...overrides };
}

export function makeInsurance(overrides: Record<string, any> = {}) {
  return { ...FAKE_INSURANCE, id: `ins-${Math.random().toString(36).slice(2, 8)}`, ...overrides };
}
