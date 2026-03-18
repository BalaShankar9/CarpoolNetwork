/**
 * Shared fixtures, factories, and mock builders for Preferences module tests.
 */
import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const FAKE_USER_ID = 'user-pref-001';
export const FAKE_OTHER_USER_ID = 'user-pref-002';

export const FAKE_USER = { id: FAKE_USER_ID, email: 'prefs@example.com' };

// ---------------------------------------------------------------------------
// Ride Preferences (for RidePreferencesForm / PreferenceMatchIndicator)
// ---------------------------------------------------------------------------

export const FAKE_RIDE_PREFERENCES = {
  id: 'rp-001',
  user_id: FAKE_USER_ID,
  music: 'any' as const,
  conversation: 'some' as const,
  smoking: false,
  pets: true,
  children: true,
  ac: 'no_preference' as const,
  max_detour: 10,
  luggage_space: 'medium' as const,
  created_at: '2024-06-15T10:00:00Z',
  updated_at: '2024-06-15T10:00:00Z',
};

export const FAKE_RIDE_PREFERENCES_STRICT = {
  ...FAKE_RIDE_PREFERENCES,
  id: 'rp-002',
  music: 'quiet' as const,
  conversation: 'quiet' as const,
  smoking: false,
  pets: false,
  children: false,
  ac: 'required' as const,
  max_detour: 5,
  luggage_space: 'small' as const,
};

// ---------------------------------------------------------------------------
// Driver / User Preferences (for DriverPreferenceDashboard)
// ---------------------------------------------------------------------------

export const FAKE_USER_PREFERENCES = {
  user_id: FAKE_USER_ID,
  music_preference: 'moderate',
  music_genres_preferred: ['Pop', 'Rock'],
  conversation_level: 'moderate',
  temperature_preference: 'moderate',
  ac_heating_available: true,
  phone_charging_available: true,
  wifi_available: false,
  wheelchair_accessible: false,
  child_seats_available: 0,
  luggage_policy: 'medium-allowed',
  luggage_space_description: 'Decent trunk space',
  special_equipment: ['Bike rack'],
  smoking_policy: 'no-smoking',
  food_drinks_allowed: 'snacks-ok',
  pets_allowed: true,
  allowed_pet_types: 'Dogs, Cats',
  pet_size_limit: 'medium',
  pet_carrier_required: false,
  max_stops_allowed: 3,
  max_detour_minutes: 15,
  allow_groups: false,
  max_group_size: 4,
  instant_booking_enabled: false,
  minimum_passenger_rating: 0,
  require_passenger_verification: false,
  require_passenger_profile_photo: false,
  gender_preference: 'any',
  age_restriction_min: null,
  age_restriction_max: null,
  allow_minors_with_guardian: false,
  share_live_location_automatically: true,
  emergency_contact_auto_notify: false,
  require_photo_verification_at_pickup: false,
  communication_preference: 'in-app-only',
  updated_at: '2024-06-15T10:00:00Z',
};

// ---------------------------------------------------------------------------
// Search Filter Settings (for PassengerFilterCenter)
// ---------------------------------------------------------------------------

export const FAKE_SAVED_FILTER = {
  id: 'sf-001',
  user_id: FAKE_USER_ID,
  filter_name: 'Daily Commute',
  filter_settings: {
    priorityAlgorithm: 'cheapest' as const,
    minRating: 3.0,
    carpoolingOk: true,
  },
  is_default: false,
  use_count: 5,
  last_used_at: '2024-06-01T08:00:00Z',
};

export const FAKE_SAVED_FILTER_2 = {
  id: 'sf-002',
  user_id: FAKE_USER_ID,
  filter_name: 'Weekend Trip',
  filter_settings: {
    priorityAlgorithm: 'comfort' as const,
    minRating: 4.5,
    requireAC: true,
  },
  is_default: false,
  use_count: 2,
  last_used_at: '2024-05-20T09:00:00Z',
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
    or: vi.fn().mockReturnThis(),
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

export function makeSavedFilter(overrides: Record<string, any> = {}) {
  return {
    ...FAKE_SAVED_FILTER,
    id: `sf-${Math.random().toString(36).slice(2, 8)}`,
    ...overrides,
  };
}

export function makeUserPreferences(overrides: Record<string, any> = {}) {
  return { ...FAKE_USER_PREFERENCES, ...overrides };
}

export function makeRidePreferences(overrides: Record<string, any> = {}) {
  return { ...FAKE_RIDE_PREFERENCES, ...overrides };
}
