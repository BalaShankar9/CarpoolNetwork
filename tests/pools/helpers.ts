/**
 * Shared fixtures, factories, and mock builders for Pools module tests.
 */
import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const FAKE_USER_ID = 'user-pool-001';
export const FAKE_OTHER_USER_ID = 'user-pool-002';
export const FAKE_POOL_ID = 'pool-001';

export const FAKE_USER = { id: FAKE_USER_ID, email: 'pooler@example.com' };

export const FAKE_PROFILE = {
  id: FAKE_USER_ID,
  full_name: 'Pool Tester',
  avatar_url: '/avatar1.png',
  profile_photo_url: '/photo1.png',
  average_rating: 4.5,
};

export const FAKE_OTHER_PROFILE = {
  id: FAKE_OTHER_USER_ID,
  full_name: 'Other Member',
  avatar_url: '/avatar2.png',
  profile_photo_url: '/photo2.png',
  average_rating: 4.0,
};

// ---------------------------------------------------------------------------
// Pool fixture
// ---------------------------------------------------------------------------

export const FAKE_POOL = {
  id: FAKE_POOL_ID,
  name: 'Downtown Commuters',
  description: 'Daily commute from North to Downtown',
  origin_area: 'North Side',
  destination_area: 'Business District',
  schedule_type: 'weekdays' as const,
  preferred_time: '08:00',
  preferred_days: ['1', '2', '3', '4', '5'],
  max_members: 10,
  member_count: 5,
  is_private: false,
  created_by: FAKE_USER_ID,
  created_at: '2024-01-15T10:00:00Z',
  invite_code: 'ABC123',
  creator: {
    full_name: 'Pool Tester',
    avatar_url: '/avatar1.png',
    profile_photo_url: '/photo1.png',
  },
};

export const FAKE_PRIVATE_POOL = {
  ...FAKE_POOL,
  id: 'pool-002',
  name: 'Private Riders',
  is_private: true,
  invite_code: 'XYZ789',
};

export const FAKE_FULL_POOL = {
  ...FAKE_POOL,
  id: 'pool-003',
  name: 'Full Pool',
  member_count: 10,
  max_members: 10,
};

// ---------------------------------------------------------------------------
// Member fixtures
// ---------------------------------------------------------------------------

export const FAKE_MEMBER_ADMIN = {
  id: 'member-001',
  pool_id: FAKE_POOL_ID,
  user_id: FAKE_USER_ID,
  role: 'admin' as const,
  is_driver: true,
  joined_at: '2024-01-15T10:00:00Z',
  user: FAKE_PROFILE,
};

export const FAKE_MEMBER_PASSENGER = {
  id: 'member-002',
  pool_id: FAKE_POOL_ID,
  user_id: FAKE_OTHER_USER_ID,
  role: 'member' as const,
  is_driver: false,
  joined_at: '2024-01-16T10:00:00Z',
  user: FAKE_OTHER_PROFILE,
};

export const FAKE_MEMBER_DRIVER = {
  id: 'member-003',
  pool_id: FAKE_POOL_ID,
  user_id: 'user-pool-003',
  role: 'member' as const,
  is_driver: true,
  joined_at: '2024-01-17T10:00:00Z',
  user: {
    id: 'user-pool-003',
    full_name: 'Third Driver',
    avatar_url: '/avatar3.png',
    profile_photo_url: '/photo3.png',
    average_rating: 3.8,
  },
};

export const FAKE_MEMBERS = [FAKE_MEMBER_ADMIN, FAKE_MEMBER_PASSENGER, FAKE_MEMBER_DRIVER];

// ---------------------------------------------------------------------------
// Schedule fixtures
// ---------------------------------------------------------------------------

export const FAKE_SCHEDULE_SLOT_1 = {
  id: 'slot-001',
  pool_id: FAKE_POOL_ID,
  day_of_week: 1,
  departure_time: '08:00',
  driver_id: FAKE_USER_ID,
  is_recurring: true,
};

export const FAKE_SCHEDULE_SLOT_2 = {
  id: 'slot-002',
  pool_id: FAKE_POOL_ID,
  day_of_week: 1,
  departure_time: '17:30',
  driver_id: null,
  is_recurring: true,
};

export const FAKE_SCHEDULE_SLOT_3 = {
  id: 'slot-003',
  pool_id: FAKE_POOL_ID,
  day_of_week: 3,
  departure_time: '08:00',
  driver_id: FAKE_USER_ID,
  is_recurring: true,
};

export const FAKE_SCHEDULE = [FAKE_SCHEDULE_SLOT_1, FAKE_SCHEDULE_SLOT_2, FAKE_SCHEDULE_SLOT_3];

// ---------------------------------------------------------------------------
// Chat message fixtures
// ---------------------------------------------------------------------------

export const FAKE_MESSAGE_OWN = {
  id: 'msg-001',
  pool_id: FAKE_POOL_ID,
  user_id: FAKE_USER_ID,
  content: 'Hello everyone!',
  message_type: 'text' as const,
  created_at: '2024-02-01T10:00:00Z',
  user: {
    id: FAKE_USER_ID,
    full_name: 'Pool Tester',
    avatar_url: '/avatar1.png',
    profile_photo_url: '/photo1.png',
  },
};

export const FAKE_MESSAGE_OTHER = {
  id: 'msg-002',
  pool_id: FAKE_POOL_ID,
  user_id: FAKE_OTHER_USER_ID,
  content: 'Hey! Ready for tomorrow?',
  message_type: 'text' as const,
  created_at: '2024-02-01T10:05:00Z',
  user: {
    id: FAKE_OTHER_USER_ID,
    full_name: 'Other Member',
    avatar_url: '/avatar2.png',
    profile_photo_url: '/photo2.png',
  },
};

export const FAKE_MESSAGE_LOCATION = {
  id: 'msg-003',
  pool_id: FAKE_POOL_ID,
  user_id: FAKE_USER_ID,
  content: 'Meet at 123 Main St',
  message_type: 'location' as const,
  created_at: '2024-02-01T10:10:00Z',
  user: {
    id: FAKE_USER_ID,
    full_name: 'Pool Tester',
    avatar_url: '/avatar1.png',
    profile_photo_url: '/photo1.png',
  },
};

export const FAKE_MESSAGES = [FAKE_MESSAGE_OWN, FAKE_MESSAGE_OTHER, FAKE_MESSAGE_LOCATION];

// ---------------------------------------------------------------------------
// buildMockChain — Supabase query builder mock
// ---------------------------------------------------------------------------

export function buildMockChain(data: any = [], error: any = null) {
  const isArray = Array.isArray(data);
  const thenable = {
    then(resolve: (val: any) => void) {
      resolve({ data, error, count: isArray ? data.length : data ? 1 : 0 });
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

export function makePool(overrides: Record<string, any> = {}) {
  return { ...FAKE_POOL, ...overrides };
}

export function makeMember(overrides: Record<string, any> = {}) {
  return { ...FAKE_MEMBER_PASSENGER, ...overrides };
}

export function makeScheduleSlot(overrides: Record<string, any> = {}) {
  return { ...FAKE_SCHEDULE_SLOT_1, ...overrides };
}

export function makeMessage(overrides: Record<string, any> = {}) {
  return { ...FAKE_MESSAGE_OWN, ...overrides };
}
