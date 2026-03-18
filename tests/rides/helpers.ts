/**
 * Shared test helpers for Rides module tests.
 *
 * Provides factory functions for fake rides, bookings, vehicles, waypoints,
 * and a configurable Supabase client mock.
 */
import { vi } from 'vitest';
import type { Waypoint } from '../../src/services/multiStopRouteService';

// ---------------------------------------------------------------------------
// Fake data
// ---------------------------------------------------------------------------
export const FAKE_USER_ID = 'user-ride-001';
export const FAKE_DRIVER_ID = 'driver-001';

export const FAKE_VEHICLE = {
  id: 'veh-001',
  user_id: FAKE_DRIVER_ID,
  make: 'Toyota',
  model: 'Corolla',
  year: 2021,
  color: 'Silver',
  license_plate: 'ABC-1234',
  total_seats: 4,
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
};

export const FAKE_RIDE = {
  id: 'ride-001',
  driver_id: FAKE_DRIVER_ID,
  vehicle_id: FAKE_VEHICLE.id,
  origin: '123 Main St, London',
  origin_lat: 51.5074,
  origin_lng: -0.1278,
  destination: '456 Oxford St, London',
  destination_lat: 51.5155,
  destination_lng: -0.1413,
  departure_time: new Date(Date.now() + 3600_000).toISOString(), // 1h from now
  available_seats: 3,
  status: 'active',
  ride_type: 'daily_commute',
  notes: '',
  is_recurring: false,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

export const FAKE_BOOKING = {
  id: 'booking-001',
  ride_id: FAKE_RIDE.id,
  passenger_id: FAKE_USER_ID,
  seats_booked: 1,
  status: 'confirmed',
  pickup_location: FAKE_RIDE.origin,
  pickup_lat: FAKE_RIDE.origin_lat,
  pickup_lng: FAKE_RIDE.origin_lng,
  dropoff_location: FAKE_RIDE.destination,
  dropoff_lat: FAKE_RIDE.destination_lat,
  dropoff_lng: FAKE_RIDE.destination_lng,
  created_at: '2025-01-01T00:00:00Z',
};

export const FAKE_TRACKING = {
  id: 'track-001',
  ride_id: FAKE_RIDE.id,
  driver_id: FAKE_DRIVER_ID,
  current_location: { type: 'Point', coordinates: [-0.1278, 51.5074] },
  current_speed_kmh: 40,
  heading_degrees: 90,
  route_deviation_meters: 0,
  eta_to_next_stop: null,
  passengers_onboard: [],
  last_updated: '2025-01-01T00:00:00Z',
  ride_started_at: '2025-01-01T00:00:00Z',
  ride_ended_at: null,
};

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

/** Create a Waypoint for testing multiStopRouteService */
export function makeWaypoint(overrides: Partial<Waypoint> = {}): Waypoint {
  return {
    id: `wp_${Math.random().toString(36).substr(2, 9)}`,
    location: 'Test Location',
    lat: 51.5074,
    lng: -0.1278,
    order: 0,
    type: 'pickup',
    ...overrides,
  };
}

/** Create a ride object for testing */
export function makeRide(overrides: Record<string, any> = {}) {
  return { ...FAKE_RIDE, ...overrides };
}

/** Create a booking object for testing */
export function makeBooking(overrides: Record<string, any> = {}) {
  return { ...FAKE_BOOKING, ...overrides };
}

// ---------------------------------------------------------------------------
// London coordinates for geo-tests
// ---------------------------------------------------------------------------
export const LONDON_COORDS = { lat: 51.5074, lng: -0.1278 };
export const OXFORD_COORDS = { lat: 51.752, lng: -1.2577 };
export const BIRMINGHAM_COORDS = { lat: 52.4862, lng: -1.8904 };
export const PARIS_COORDS = { lat: 48.8566, lng: 2.3522 };

// Well-known distances (approximate)
export const LONDON_TO_OXFORD_KM = 83; // ~83 km
export const LONDON_TO_BIRMINGHAM_KM = 163; // ~163 km
export const LONDON_TO_PARIS_KM = 344; // ~344 km

// ---------------------------------------------------------------------------
// Supabase mock builder (chainable query)
// ---------------------------------------------------------------------------

/** Build a chainable Supabase query mock that resolves to the given data */
export function makeQueryMock(result: { data: any; error: any; count?: number }) {
  const mock: Record<string, any> = {};

  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'is', 'in', 'or', 'not',
    'order', 'limit', 'range', 'single', 'maybeSingle',
    'filter', 'match', 'textSearch', 'contains', 'containedBy',
    'overlaps', 'ilike', 'like',
  ];

  for (const method of chainMethods) {
    mock[method] = vi.fn().mockReturnValue(mock);
  }

  // Terminal methods resolve to the result
  mock.then = undefined; // prevent auto-thenable
  mock.single = vi.fn().mockResolvedValue(result);
  mock.maybeSingle = vi.fn().mockResolvedValue(result);
  mock.order = vi.fn().mockResolvedValue(result);

  // For count queries
  if (result.count !== undefined) {
    mock.select = vi.fn().mockReturnValue(mock);
  }

  return mock;
}

/** Build a minimal Supabase client mock */
export function makeSupabaseClient(overrides: Record<string, any> = {}) {
  const defaultQuery = makeQueryMock({ data: null, error: null });

  return {
    from: vi.fn(() => defaultQuery),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
    ...overrides,
  } as any;
}
