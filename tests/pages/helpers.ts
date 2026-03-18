/**
 * Shared fixtures, factories, and mock builders for page-level tests.
 */
import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const FAKE_USER_ID = 'user-page-001';
export const FAKE_OTHER_USER_ID = 'user-page-002';
export const FAKE_THIRD_USER_ID = 'user-page-003';

export const FAKE_USER = { id: FAKE_USER_ID, email: 'alice@example.com' };
export const FAKE_PROFILE = {
  id: FAKE_USER_ID,
  full_name: 'Alice Tester',
  avatar_url: null,
  profile_photo_url: null,
  average_rating: 4.5,
  total_rides_offered: 10,
  total_rides_taken: 5,
  bio: 'Testing is my passion',
};

export const FAKE_OTHER_PROFILE = {
  id: FAKE_OTHER_USER_ID,
  full_name: 'Bob Driver',
  avatar_url: 'https://example.com/bob.jpg',
  profile_photo_url: null,
  average_rating: 4.8,
  total_rides_offered: 25,
  total_rides_taken: 3,
};

export const FAKE_THIRD_PROFILE = {
  id: FAKE_THIRD_USER_ID,
  full_name: 'Charlie Rider',
  avatar_url: null,
  profile_photo_url: null,
  average_rating: 3.9,
  total_rides_offered: 2,
  total_rides_taken: 20,
};

// ---------------------------------------------------------------------------
// Ride & Booking fixtures
// ---------------------------------------------------------------------------

const future = new Date(Date.now() + 86_400_000).toISOString(); // +1 day
const past = new Date(Date.now() - 86_400_000).toISOString(); // -1 day

export const FAKE_RIDE = {
  id: 'ride-001',
  driver_id: FAKE_USER_ID,
  vehicle_id: 'vehicle-001',
  origin: 'London',
  origin_lat: 51.5,
  origin_lng: -0.12,
  destination: 'Manchester',
  destination_lat: 53.48,
  destination_lng: -2.24,
  departure_time: future,
  available_until: null,
  time_type: 'depart',
  available_seats: 3,
  total_seats: 4,
  status: 'active',
  notes: 'Pet-friendly ride',
  is_recurring: false,
  ride_type: 'daily_commute',
  estimated_distance: null,
  estimated_duration: null,
  pickup_radius_km: 10,
};

export const FAKE_VEHICLE = {
  id: 'vehicle-001',
  make: 'Tesla',
  model: 'Model 3',
  color: 'White',
  year: 2023,
  fuel_type: 'electric',
  capacity: 5,
  license_plate: 'AB12 CDE',
};

export const FAKE_BOOKING = {
  id: 'booking-001',
  passenger_id: FAKE_OTHER_USER_ID,
  pickup_location: 'London Bridge',
  dropoff_location: 'Manchester Piccadilly',
  seats_requested: 1,
  status: 'pending',
  created_at: new Date().toISOString(),
  ride: {
    id: 'ride-001',
    origin: 'London',
    destination: 'Manchester',
    departure_time: future,
    available_until: null,
    driver: FAKE_PROFILE,
  },
};

export const FAKE_BOOKING_REQUEST = {
  id: 'breq-001',
  pickup_location: 'King\'s Cross',
  dropoff_location: 'Old Trafford',
  seats_requested: 2,
  status: 'pending',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  passenger: {
    id: FAKE_OTHER_USER_ID,
    full_name: 'Bob Driver',
    average_rating: 4.8,
    total_bookings: 15,
    cancelled_bookings: 1,
    last_minute_cancellations: 0,
    reliability_score: 95,
    bio: 'Regular commuter',
    phone: null,
    avatar_url: null,
    profile_photo_url: null,
  },
  ride: {
    id: 'ride-001',
    origin: 'London',
    destination: 'Manchester',
    departure_time: future,
    available_until: null,
    available_seats: 3,
  },
};

export const FAKE_TRIP_REQUEST = {
  id: 'tripreq-001',
  from_location: 'Birmingham',
  to_location: 'Leeds',
  departure_time: future,
  flexible_time: true,
  seats_needed: 1,
  notes: 'Early morning preferred',
  status: 'active',
  created_at: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Community / Social fixtures
// ---------------------------------------------------------------------------

export const FAKE_COMMUNITY_POST = {
  id: 'post-001',
  title: 'Best routes this week',
  author_name: 'Bob Driver',
  category: 'Rides',
  comment_count: 5,
  score: 12,
  created_at: new Date(Date.now() - 3600_000).toISOString(),
};

export const FAKE_FRIENDSHIP = {
  id: 'fs-001',
  user_a: FAKE_USER_ID,
  user_b: FAKE_OTHER_USER_ID,
  created_at: new Date().toISOString(),
};

export const FAKE_ONLINE_FRIEND = {
  id: FAKE_OTHER_USER_ID,
  full_name: 'Bob Driver',
  avatar_url: null,
  is_online: true,
};

// ---------------------------------------------------------------------------
// Challenge / Leaderboard fixtures
// ---------------------------------------------------------------------------

export const FAKE_CHALLENGE = {
  id: 'ch-001',
  title: 'Weekly Warrior',
  description: 'Complete 5 rides this week',
  challenge_type: 'rides',
  target_value: 5,
  reward_value: '50',
  badge_icon: '🏆',
  is_active: true,
  start_date: past,
  end_date: future,
  created_at: past,
};

export const FAKE_USER_CHALLENGE = {
  challenge_id: 'ch-001',
  user_id: FAKE_USER_ID,
  progress: 3,
  completed: false,
};

export const FAKE_HELP_ARTICLE = {
  id: 'ha-001',
  slug: 'getting-started',
  title: 'Getting Started with Carpool Network',
  summary: 'Learn the basics',
  content_md: '# Getting Started\nWelcome to Carpool Network.',
  category: 'getting-started',
  tags: ['new', 'onboarding'],
  is_published: true,
  sort_order: 1,
};

export const FAKE_POOL = {
  id: 'pool-001',
  name: 'London Commuters',
  origin: 'London Bridge',
  destination: 'Canary Wharf',
  schedule: 'Mon-Fri 8am',
  member_count: 5,
  max_members: 10,
  created_by: FAKE_USER_ID,
  invite_code: 'ABC123',
  created_at: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Supabase mock chain builder
// ---------------------------------------------------------------------------

export function buildMockChain(data: any = [], error: any = null) {
  const chain: Record<string, any> = {};
  const methods = [
    'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'neq', 'or', 'not', 'in', 'order', 'limit',
    'is', 'ilike', 'like', 'gt', 'gte', 'lt', 'lte',
    'filter', 'range', 'contains', 'match', 'textSearch',
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }

  // maybeSingle / single — return thenable resolving to first item or null
  const singleItem = Array.isArray(data) ? (data.length > 0 ? data[0] : null) : data;
  const singleResult = { data: singleItem, error };
  const singlePromise = Promise.resolve(singleResult);
  const singleChain: Record<string, any> = {};
  for (const m of methods) {
    singleChain[m] = vi.fn().mockReturnValue(chain);
  }
  Object.defineProperty(singleChain, 'then', {
    value: singlePromise.then.bind(singlePromise),
    writable: true, configurable: true, enumerable: false,
  });
  chain.maybeSingle = vi.fn().mockReturnValue(singleChain);
  chain.single = vi.fn().mockReturnValue(singleChain);

  const result = { data, error, count: Array.isArray(data) ? data.length : 0 };
  const p = Promise.resolve(result);
  Object.defineProperty(chain, 'then', {
    value: p.then.bind(p),
    writable: true, configurable: true, enumerable: false,
  });
  return chain;
}

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

let _uid = 0;
const uid = () => String(++_uid);

export function makeRide(overrides: Record<string, any> = {}) {
  return { ...FAKE_RIDE, id: `ride-${uid()}`, ...overrides };
}

export function makeBooking(overrides: Record<string, any> = {}) {
  return { ...FAKE_BOOKING, id: `booking-${uid()}`, ...overrides };
}

export function makeBookingRequest(overrides: Record<string, any> = {}) {
  return { ...FAKE_BOOKING_REQUEST, id: `breq-${uid()}`, ...overrides };
}

export function makeTripRequest(overrides: Record<string, any> = {}) {
  return { ...FAKE_TRIP_REQUEST, id: `tripreq-${uid()}`, ...overrides };
}

export function makeCommunityPost(overrides: Record<string, any> = {}) {
  return { ...FAKE_COMMUNITY_POST, id: `post-${uid()}`, ...overrides };
}

export function makeChallenge(overrides: Record<string, any> = {}) {
  return { ...FAKE_CHALLENGE, id: `ch-${uid()}`, ...overrides };
}

export function makeHelpArticle(overrides: Record<string, any> = {}) {
  return { ...FAKE_HELP_ARTICLE, id: `ha-${uid()}`, slug: `article-${uid()}`, ...overrides };
}
