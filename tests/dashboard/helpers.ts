import { vi } from 'vitest';

/* ── fake user / profile ── */
export const FAKE_USER = { id: 'user-1', email: 'driver@test.com' };

export const FAKE_PROFILE = {
  id: 'user-1',
  full_name: 'Test Driver',
  avatar_url: null,
  profile_photo_url: null,
  total_rides_offered: 25,
  total_rides_taken: 8,
  average_rating: 4.7,
  created_at: '2023-06-15T00:00:00Z',
};

/* ── Dashboard (offered rides) ── */
export const FAKE_OFFERED_RIDES = [
  {
    id: 'ride-1',
    driver_id: 'user-1',
    origin: 'Downtown',
    destination: 'Airport',
    departure_time: '2025-03-15T09:00:00Z',
    status: 'active',
    available_seats: 2,
    total_seats: 4,
    is_recurring: true,
  },
  {
    id: 'ride-2',
    driver_id: 'user-1',
    origin: 'North Side',
    destination: 'Campus',
    departure_time: '2025-03-16T14:00:00Z',
    status: 'completed',
    available_seats: 0,
    total_seats: 3,
    is_recurring: false,
  },
];

/* ── Dashboard (booked rides) ── */
export const FAKE_BOOKED_RIDES = [
  {
    id: 'booking-1',
    passenger_id: 'user-1',
    ride_id: 'ride-10',
    status: 'confirmed',
    pickup_location: 'Mall',
    dropoff_location: 'University',
    seats_requested: 1,
    created_at: '2025-03-10T08:00:00Z',
    ride: {
      id: 'ride-10',
      departure_time: '2025-03-18T07:30:00Z',
      origin: 'Mall',
      destination: 'University',
    },
  },
  {
    id: 'booking-2',
    passenger_id: 'user-1',
    ride_id: 'ride-11',
    status: 'pending',
    pickup_location: 'Station',
    dropoff_location: 'Office Park',
    seats_requested: 2,
    created_at: '2025-03-11T10:00:00Z',
    ride: {
      id: 'ride-11',
      departure_time: '2025-03-20T08:00:00Z',
      origin: 'Station',
      destination: 'Office Park',
    },
  },
];

/* ── DriverDashboard data ── */
export const FAKE_RIDES_RAW = [
  { id: 'r1', status: 'completed', distance_km: 30 },
  { id: 'r2', status: 'completed', distance_km: 20 },
  { id: 'r3', status: 'active', distance_km: 15 },
];

export const FAKE_REVIEWS = [
  { overall_rating: 5 },
  { overall_rating: 4 },
  { overall_rating: 4.5 },
];

export const FAKE_BOOKINGS_RAW = [
  { id: 'b1', seats_requested: 2, status: 'completed', ride: { driver_id: 'user-1' } },
  { id: 'b2', seats_requested: 1, status: 'completed', ride: { driver_id: 'user-1' } },
  { id: 'b3', seats_requested: 1, status: 'pending', ride: { driver_id: 'user-1' } },
];

export const FAKE_UPCOMING_RIDES = [
  {
    id: 'ur1',
    origin: 'City Center',
    destination: 'Beach',
    departure_time: '2025-04-01T09:00:00Z',
    available_seats: 3,
    status: 'active',
    ride_bookings: [{ id: 'rb1', status: 'confirmed' }, { id: 'rb2', status: 'pending' }],
  },
];

export const FAKE_PENDING_BOOKINGS = [
  {
    id: 'pb1',
    ride_id: 'ur1',
    pickup_location: 'Train Station',
    seats_requested: 1,
    created_at: '2025-03-28T10:00:00Z',
    passenger: {
      id: 'pass-1',
      full_name: 'Alice Rider',
      avatar_url: null,
      profile_photo_url: 'https://example.com/alice.jpg',
    },
  },
];

export const FAKE_PENDING_MATCHES = [
  {
    id: 'pm1',
    ride_id: 'ur1',
    match_score: 92,
    status: 'pending',
    trip_request: {
      rider_id: 'pass-2',
      origin: 'Park Ave',
      destination: 'Beach',
      rider: { full_name: 'Bob Commuter' },
    },
  },
];

/* ── Supabase chain builder ── */
export function buildMockChain(data: any = null, error: any = null) {
  const result = { data, error };
  const chain: any = {};
  const self = () => chain;
  chain.select = vi.fn(self);
  chain.insert = vi.fn(self);
  chain.update = vi.fn(self);
  chain.delete = vi.fn(self);
  chain.eq = vi.fn(self);
  chain.neq = vi.fn(self);
  chain.in = vi.fn(self);
  chain.gte = vi.fn(self);
  chain.lte = vi.fn(self);
  chain.order = vi.fn(self);
  chain.limit = vi.fn(self);
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.then = (cb: any) => Promise.resolve(result).then(cb);
  return chain;
}
