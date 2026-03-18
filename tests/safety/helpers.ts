/**
 * Shared test helpers for Safety & Emergency module tests.
 *
 * Provides constants, fixtures, factory functions, and a configurable
 * Supabase client mock used across all safety test files.
 */
import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const FAKE_USER_ID = 'user-safe-001';
export const FAKE_OTHER_USER_ID = 'user-safe-002';
export const FAKE_ADMIN_USER_ID = 'user-safe-admin';
export const FAKE_RIDE_ID = 'ride-safe-001';
export const FAKE_BOOKING_ID = 'booking-safe-001';
export const FAKE_CONTACT_ID = 'contact-safe-001';
export const FAKE_ALERT_ID = 'alert-safe-001';
export const FAKE_SHARE_ID = 'share-safe-001';
export const FAKE_CHECKIN_ID = 'checkin-safe-001';
export const FAKE_INCIDENT_ID = 'incident-safe-001';
export const FAKE_BADGE_ID = 'badge-safe-001';

// ---------------------------------------------------------------------------
// Fixtures: Emergency Contacts (safetyService style — snake_case)
// ---------------------------------------------------------------------------
export const FAKE_EMERGENCY_CONTACT = {
  id: FAKE_CONTACT_ID,
  user_id: FAKE_USER_ID,
  name: 'Jane Safety',
  phone: '+1234567890',
  relationship: 'spouse',
  notify_on_sos: true,
  notify_on_trip_start: true,
  created_at: '2026-01-10T10:00:00Z',
};

// emergencyService style — snake_case DB rows (mapContact converts)
export const FAKE_EMERGENCY_CONTACT_DB = {
  id: FAKE_CONTACT_ID,
  user_id: FAKE_USER_ID,
  name: 'Jane Safety',
  phone: '+1234567890',
  email: 'jane@example.com',
  relationship: 'spouse',
  is_primary: true,
  notify_on_ride_start: true,
  notify_on_sos: true,
  created_at: '2026-01-10T10:00:00Z',
};

// ---------------------------------------------------------------------------
// Fixtures: SOS Alerts
// ---------------------------------------------------------------------------
export const FAKE_SOS_ALERT_DB = {
  id: FAKE_ALERT_ID,
  ride_id: FAKE_RIDE_ID,
  user_id: FAKE_USER_ID,
  latitude: 37.7749,
  longitude: -122.4194,
  alert_type: 'sos',
  status: 'active',
  message: null,
  responded_at: null,
  resolved_at: null,
  created_at: '2026-01-15T10:00:00Z',
};

// ---------------------------------------------------------------------------
// Fixtures: Trip Shares
// ---------------------------------------------------------------------------
export const FAKE_TRIP_SHARE = {
  id: FAKE_SHARE_ID,
  ride_id: FAKE_RIDE_ID,
  booking_id: FAKE_BOOKING_ID,
  user_id: FAKE_USER_ID,
  share_token: 'abc123token',
  shared_with_contacts: [FAKE_CONTACT_ID],
  shared_via_link: false,
  expires_at: '2026-01-16T10:00:00Z',
  created_at: '2026-01-15T10:00:00Z',
  ride: {
    id: FAKE_RIDE_ID,
    origin: 'Downtown',
    destination: 'Airport',
    departure_time: '2026-01-15T08:00:00Z',
    status: 'in-progress',
    driver: {
      id: FAKE_OTHER_USER_ID,
      full_name: 'Bob Driver',
      avatar_url: null,
      profile_photo_url: null,
    },
  },
};

export const FAKE_LIVE_TRIP_SHARE_DB = {
  id: FAKE_SHARE_ID,
  ride_id: FAKE_RIDE_ID,
  user_id: FAKE_USER_ID,
  share_code: 'share-code-abc',
  shared_with: [FAKE_CONTACT_ID],
  expires_at: '2026-01-16T10:00:00Z',
  is_active: true,
  last_location_update: null,
  created_at: '2026-01-15T10:00:00Z',
};

// ---------------------------------------------------------------------------
// Fixtures: Safety Check-Ins
// ---------------------------------------------------------------------------
export const FAKE_CHECKIN_DB = {
  id: FAKE_CHECKIN_ID,
  ride_id: FAKE_RIDE_ID,
  user_id: FAKE_USER_ID,
  scheduled_at: '2026-01-15T10:30:00Z',
  responded_at: null,
  status: 'pending',
  attempts: 0,
};

// ---------------------------------------------------------------------------
// Fixtures: Safety Incidents
// ---------------------------------------------------------------------------
export const FAKE_INCIDENT = {
  id: FAKE_INCIDENT_ID,
  type: 'sos_alert' as const,
  severity: 'high' as const,
  user_id: FAKE_USER_ID,
  ride_id: FAKE_RIDE_ID,
  description: 'Suspicious route deviation detected',
  metadata: { deviation_km: 2.5 },
  resolved_at: null,
  created_at: '2026-01-15T10:00:00Z',
};

// ---------------------------------------------------------------------------
// Fixtures: Profiles
// ---------------------------------------------------------------------------
export const FAKE_PROFILE = {
  id: FAKE_USER_ID,
  full_name: 'Alice Safety',
  avatar_url: 'https://example.com/alice.jpg',
  profile_photo_url: 'https://example.com/alice-photo.jpg',
  email_verified: true,
  phone_verified: true,
  phone_verified_at: '2026-01-05T10:00:00Z',
  id_verified: true,
  id_verified_at: '2026-01-06T10:00:00Z',
  average_rating: 4.8,
  reliability_score: 92,
  trust_score: 85,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2026-01-15T10:00:00Z',
};

// ---------------------------------------------------------------------------
// Fixtures: Badges
// ---------------------------------------------------------------------------
export const FAKE_USER_BADGE_DB = {
  id: FAKE_BADGE_ID,
  user_id: FAKE_USER_ID,
  badge_type: 'verified_id',
  name: 'Verified Identity',
  description: 'ID has been verified',
  icon: '🪪',
  earned_at: '2026-01-06T10:00:00Z',
};

// ---------------------------------------------------------------------------
// Fixtures: Verification
// ---------------------------------------------------------------------------
export const FAKE_VERIFICATION_DB = {
  user_id: FAKE_USER_ID,
  email_verified: true,
  phone_verified: true,
  id_verified: true,
  driver_license_verified: true,
  vehicle_verified: true,
  background_check_passed: true,
};

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------
let _counter = 0;
function uid() { return `${++_counter}-${Math.random().toString(36).substr(2, 6)}`; }

export function makeEmergencyContact(overrides: Record<string, any> = {}) {
  return { ...FAKE_EMERGENCY_CONTACT, id: `contact-${uid()}`, ...overrides };
}

export function makeEmergencyContactDB(overrides: Record<string, any> = {}) {
  return { ...FAKE_EMERGENCY_CONTACT_DB, id: `contact-${uid()}`, ...overrides };
}

export function makeSOSAlertDB(overrides: Record<string, any> = {}) {
  return { ...FAKE_SOS_ALERT_DB, id: `alert-${uid()}`, ...overrides };
}

export function makeTripShare(overrides: Record<string, any> = {}) {
  return { ...FAKE_TRIP_SHARE, id: `share-${uid()}`, ...overrides };
}

export function makeLiveTripShareDB(overrides: Record<string, any> = {}) {
  return { ...FAKE_LIVE_TRIP_SHARE_DB, id: `share-${uid()}`, ...overrides };
}

export function makeCheckInDB(overrides: Record<string, any> = {}) {
  return { ...FAKE_CHECKIN_DB, id: `checkin-${uid()}`, ...overrides };
}

export function makeIncident(overrides: Record<string, any> = {}) {
  return { ...FAKE_INCIDENT, id: `incident-${uid()}`, ...overrides };
}

export function makeProfile(overrides: Record<string, any> = {}) {
  return { ...FAKE_PROFILE, ...overrides };
}

export function makeBadgeDB(overrides: Record<string, any> = {}) {
  return { ...FAKE_USER_BADGE_DB, id: `badge-${uid()}`, ...overrides };
}

// ---------------------------------------------------------------------------
// Supabase mock builder (chainable query)
// ---------------------------------------------------------------------------

/** Build a chainable Supabase query mock that resolves to the given data */
export function buildChain(result: { data: any; error: any; count?: number | null }) {
  const mock: Record<string, any> = {};

  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'is', 'in', 'or', 'not',
    'order', 'limit', 'range', 'single', 'maybeSingle',
    'filter', 'match', 'textSearch', 'contains', 'containedBy',
    'overlaps', 'ilike', 'like', 'onConflict', 'head',
  ];

  for (const method of chainMethods) {
    mock[method] = vi.fn().mockReturnValue(mock);
  }

  // Terminal methods
  mock.single = vi.fn().mockResolvedValue(result);
  mock.maybeSingle = vi.fn().mockResolvedValue(result);

  // Make mock thenable (for bare await on chain)
  const thenableResult = Promise.resolve(result);
  Object.defineProperty(mock, 'then', {
    value: thenableResult.then.bind(thenableResult),
    writable: true,
    configurable: true,
    enumerable: false,
  });

  return mock;
}

/** Build a minimal Supabase channel mock */
export function makeChannelMock(overrides: Record<string, any> = {}) {
  const channel: Record<string, any> = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  channel.subscribe = vi.fn().mockImplementation((cb?: Function) => {
    if (cb) cb('SUBSCRIBED');
    return channel;
  });
  return channel;
}

/** Build a minimal Supabase client mock */
export function makeSupabaseMock(overrides: Record<string, any> = {}) {
  const defaultQuery = buildChain({ data: null, error: null });

  return {
    from: vi.fn(() => defaultQuery),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn(() => makeChannelMock()),
    removeChannel: vi.fn().mockResolvedValue(undefined),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: FAKE_USER_ID } }, error: null }),
    },
    ...overrides,
  };
}
