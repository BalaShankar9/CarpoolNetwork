/**
 * Shared test helpers for Analytics module tests.
 *
 * Provides constants, fixtures, factory functions, and a configurable
 * Supabase client mock used across all analytics test files.
 */
import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const FAKE_USER_ID = 'user-analytics-001';
export const FAKE_OTHER_USER_ID = 'user-analytics-002';
export const FAKE_THIRD_USER_ID = 'user-analytics-003';
export const FAKE_RIDE_ID_1 = 'ride-analytics-001';
export const FAKE_RIDE_ID_2 = 'ride-analytics-002';
export const FAKE_RIDE_ID_3 = 'ride-analytics-003';
export const FAKE_BOOKING_ID_1 = 'booking-analytics-001';
export const FAKE_BOOKING_ID_2 = 'booking-analytics-002';
export const FAKE_REVIEW_ID_1 = 'review-analytics-001';

// Replicate service constants for test assertions
export const CO2_PER_KM_CAR = 0.21;
export const FUEL_PRICE_PER_LITER = 1.45;
export const FUEL_EFFICIENCY = 12;
export const CO2_PER_TREE_PER_YEAR = 21;
export const LITERS_PER_GALLON = 3.785;
export const KM_PER_MILE = 1.609;

// ---------------------------------------------------------------------------
// Fixtures: Rides (driver)
// ---------------------------------------------------------------------------
export const FAKE_DRIVER_RIDE = {
  id: FAKE_RIDE_ID_1,
  origin: 'London Bridge',
  destination: 'Canary Wharf',
  origin_lat: 51.5079,
  origin_lng: -0.0877,
  destination_lat: 51.5054,
  destination_lng: -0.0235,
  departure_time: '2026-01-15T08:00:00Z',
  distance_km: 10,
  duration_minutes: 25,
  driver_id: FAKE_USER_ID,
  status: 'completed',
  ride_bookings: [
    { id: FAKE_BOOKING_ID_1, passenger_id: FAKE_OTHER_USER_ID, status: 'confirmed' },
  ],
};

export const FAKE_DRIVER_RIDE_2 = {
  id: FAKE_RIDE_ID_2,
  origin: 'London Bridge',
  destination: 'Canary Wharf',
  origin_lat: 51.5079,
  origin_lng: -0.0877,
  destination_lat: 51.5054,
  destination_lng: -0.0235,
  departure_time: '2026-01-16T08:30:00Z',
  distance_km: 10,
  duration_minutes: 30,
  driver_id: FAKE_USER_ID,
  status: 'completed',
  ride_bookings: [
    { id: FAKE_BOOKING_ID_2, passenger_id: FAKE_THIRD_USER_ID, status: 'confirmed' },
  ],
};

export const FAKE_DRIVER_RIDE_NO_PASSENGERS = {
  id: FAKE_RIDE_ID_3,
  origin: 'Victoria',
  destination: 'Waterloo',
  origin_lat: 51.4952,
  origin_lng: -0.1441,
  destination_lat: 51.5036,
  destination_lng: -0.1143,
  departure_time: '2026-01-17T09:00:00Z',
  distance_km: 5,
  duration_minutes: 15,
  driver_id: FAKE_USER_ID,
  status: 'completed',
  ride_bookings: [],
};

// ---------------------------------------------------------------------------
// Fixtures: Bookings (passenger)
// ---------------------------------------------------------------------------
export const FAKE_PASSENGER_BOOKING = {
  id: FAKE_BOOKING_ID_1,
  status: 'confirmed',
  seats_booked: 1,
  created_at: '2026-01-15T07:00:00Z',
  ride: {
    id: FAKE_RIDE_ID_1,
    origin: 'Camden Town',
    destination: 'Kings Cross',
    departure_time: '2026-01-15T08:00:00Z',
    distance_km: 8,
    duration_minutes: 20,
    driver_id: FAKE_OTHER_USER_ID,
  },
};

export const FAKE_PASSENGER_BOOKING_2 = {
  id: FAKE_BOOKING_ID_2,
  status: 'confirmed',
  seats_booked: 1,
  created_at: '2026-01-16T07:30:00Z',
  ride: {
    id: FAKE_RIDE_ID_2,
    origin: 'Camden Town',
    destination: 'Kings Cross',
    departure_time: '2026-01-16T08:30:00Z',
    distance_km: 8,
    duration_minutes: 20,
    driver_id: FAKE_OTHER_USER_ID,
  },
};

// ---------------------------------------------------------------------------
// Fixtures: Reviews
// ---------------------------------------------------------------------------
export const FAKE_REVIEWS = [
  { rating: 5 },
  { rating: 4 },
  { rating: 5 },
  { rating: 4 },
];

// ---------------------------------------------------------------------------
// Fixtures: Profiles
// ---------------------------------------------------------------------------
export const FAKE_PROFILE = {
  id: FAKE_USER_ID,
  full_name: 'Alice Analytics',
  avatar_url: 'https://example.com/alice.jpg',
  profile_photo_url: 'https://example.com/alice-photo.jpg',
  average_rating: 4.5,
  reliability_score: 90,
  total_rides: 20,
  total_distance: 200,
  created_at: '2025-01-01T00:00:00Z',
};

export const FAKE_PARTNER_PROFILE = {
  id: FAKE_OTHER_USER_ID,
  full_name: 'Bob Partner',
  avatar_url: 'https://example.com/bob.jpg',
};

export const FAKE_PARTNER_PROFILE_2 = {
  id: FAKE_THIRD_USER_ID,
  full_name: 'Carol Partner',
  avatar_url: null,
};

// ---------------------------------------------------------------------------
// Fixtures: Environmental Impact all-users rides
// ---------------------------------------------------------------------------
export const FAKE_ALL_USERS_RIDES = [
  {
    driver_id: FAKE_USER_ID,
    distance_km: 10,
    ride_bookings: [{ status: 'confirmed' }],
  },
  {
    driver_id: FAKE_USER_ID,
    distance_km: 15,
    ride_bookings: [{ status: 'confirmed' }],
  },
  {
    driver_id: FAKE_OTHER_USER_ID,
    distance_km: 5,
    ride_bookings: [{ status: 'confirmed' }],
  },
];

// ---------------------------------------------------------------------------
// Fixtures: Component-specific data
// ---------------------------------------------------------------------------

// For PersonalStats component
export const FAKE_PERSONAL_STATS = {
  totalRides: 15,
  totalDistance: 150,
  totalTime: 375,
  co2Saved: 31.5,
  moneySaved: 120,
  averageRating: 4.5,
  uniquePartners: 8,
  completionRate: 93,
  ridesAsDriver: 10,
  ridesAsPassenger: 5,
  thisMonth: { rides: 5, distance: 50, savings: 40 },
  lastMonth: { rides: 3, distance: 30, savings: 24 },
};

// For RideHistoryChart component
export const FAKE_CHART_RIDES = [
  { id: 'r1', departure_time: '2026-01-15T08:00:00Z', status: 'completed' },
  { id: 'r2', departure_time: '2026-01-10T09:00:00Z', status: 'completed' },
];

export const FAKE_CHART_BOOKINGS = [
  { ride: { departure_time: '2026-01-12T10:00:00Z' }, status: 'confirmed' },
];

// For CarpoolPartners component
export const FAKE_DRIVER_RIDES_WITH_BOOKINGS = [
  {
    id: FAKE_RIDE_ID_1,
    departure_time: '2026-01-15T08:00:00Z',
    ride_bookings: [
      {
        passenger_id: FAKE_OTHER_USER_ID,
        status: 'confirmed',
        passenger: {
          id: FAKE_OTHER_USER_ID,
          full_name: 'Bob Partner',
          avatar_url: 'https://example.com/bob.jpg',
          average_rating: 4.8,
        },
      },
    ],
  },
];

export const FAKE_PASSENGER_BOOKINGS_WITH_RIDES = [
  {
    ride: {
      id: FAKE_RIDE_ID_2,
      departure_time: '2026-01-16T08:30:00Z',
      driver_id: FAKE_THIRD_USER_ID,
      driver: {
        id: FAKE_THIRD_USER_ID,
        full_name: 'Carol Partner',
        avatar_url: null,
        average_rating: 4.2,
      },
    },
    status: 'confirmed',
  },
];

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------
let _counter = 0;
function uid() { return `${++_counter}-${Math.random().toString(36).substr(2, 6)}`; }

export function makeDriverRide(overrides: Record<string, any> = {}) {
  return { ...FAKE_DRIVER_RIDE, id: `ride-${uid()}`, ...overrides };
}

export function makePassengerBooking(overrides: Record<string, any> = {}) {
  return { ...FAKE_PASSENGER_BOOKING, id: `booking-${uid()}`, ...overrides };
}

export function makeProfile(overrides: Record<string, any> = {}) {
  return { ...FAKE_PROFILE, id: overrides.id || `profile-${uid()}`, ...overrides };
}

export function makeReview(rating: number = 5) {
  return { rating };
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
