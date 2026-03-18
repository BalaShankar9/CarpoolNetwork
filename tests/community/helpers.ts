/**
 * Shared test helpers for Community & Social module tests.
 *
 * Provides factory functions for friends, groups, activities, notifications,
 * profiles, and a configurable Supabase client mock.
 */
import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const FAKE_USER_ID = 'user-comm-001';
export const FAKE_OTHER_USER_ID = 'user-comm-002';
export const FAKE_THIRD_USER_ID = 'user-comm-003';
export const FAKE_GROUP_ID = 'group-001';
export const FAKE_FRIENDSHIP_ID = 'friendship-001';
export const FAKE_REQUEST_ID = 'request-001';
export const FAKE_BLOCK_ID = 'block-001';
export const FAKE_RIDE_ID = 'ride-001';
export const FAKE_INVITE_ID = 'invite-001';
export const FAKE_NOTIFICATION_ID = 'notif-001';

// ---------------------------------------------------------------------------
// Profile fixtures
// ---------------------------------------------------------------------------
export const FAKE_PROFILE = {
  id: FAKE_USER_ID,
  full_name: 'Alice Community',
  avatar_url: 'https://example.com/alice.jpg',
  profile_photo_url: null,
  bio: 'Love carpooling!',
  average_rating: 4.8,
  total_rides_offered: 20,
  total_rides_taken: 15,
  trust_score: 85,
  profile_verified: true,
};

export const FAKE_OTHER_PROFILE = {
  id: FAKE_OTHER_USER_ID,
  full_name: 'Bob Social',
  avatar_url: 'https://example.com/bob.jpg',
  profile_photo_url: null,
  bio: 'Green commuter',
  average_rating: 4.5,
  total_rides_offered: 10,
  total_rides_taken: 25,
  trust_score: 72,
  profile_verified: true,
};

export const FAKE_THIRD_PROFILE = {
  id: FAKE_THIRD_USER_ID,
  full_name: 'Charlie Groups',
  avatar_url: 'https://example.com/charlie.jpg',
  profile_photo_url: null,
  bio: 'Weekend driver',
  average_rating: 4.2,
  total_rides_offered: 5,
  total_rides_taken: 8,
  trust_score: 60,
  profile_verified: false,
};

// ---------------------------------------------------------------------------
// Friendship fixtures
// ---------------------------------------------------------------------------
export const FAKE_FRIENDSHIP = {
  id: FAKE_FRIENDSHIP_ID,
  user_a: FAKE_USER_ID,
  user_b: FAKE_OTHER_USER_ID,
  created_at: '2026-01-10T10:00:00Z',
  friend_id: FAKE_OTHER_USER_ID,
  friend: FAKE_OTHER_PROFILE,
};

export const FAKE_FRIEND_REQUEST = {
  id: FAKE_REQUEST_ID,
  from_user_id: FAKE_OTHER_USER_ID,
  to_user_id: FAKE_USER_ID,
  status: 'PENDING' as const,
  created_at: '2026-01-15T10:00:00Z',
  friend: FAKE_OTHER_PROFILE,
};

export const FAKE_BLOCKED_USER = {
  block_id: FAKE_BLOCK_ID,
  blocked_id: FAKE_OTHER_USER_ID,
  full_name: 'Bob Social',
  avatar_url: 'https://example.com/bob.jpg',
  blocked_at: '2026-01-12T00:00:00Z',
};

// ---------------------------------------------------------------------------
// Group fixtures
// ---------------------------------------------------------------------------
export const FAKE_GROUP = {
  id: FAKE_GROUP_ID,
  name: 'Campus Commuters',
  description: 'A group for daily campus commuters',
  avatar_url: null,
  cover_image_url: null,
  owner_id: FAKE_USER_ID,
  visibility: 'PUBLIC' as const,
  category: 'Commuters',
  location: 'San Francisco, CA',
  member_count: 12,
  max_members: 50,
  rules: 'Be respectful',
  created_at: '2026-01-01T00:00:00Z',
  is_member: true,
  user_role: 'OWNER',
  owner: {
    id: FAKE_USER_ID,
    full_name: 'Alice Community',
    avatar_url: null,
  },
};

export const FAKE_GROUP_INVITE = {
  id: FAKE_INVITE_ID,
  group_id: FAKE_GROUP_ID,
  inviter_id: FAKE_OTHER_USER_ID,
  status: 'PENDING',
  message: 'Join us!',
  created_at: '2026-01-15T00:00:00Z',
  group: FAKE_GROUP,
  inviter: {
    id: FAKE_OTHER_USER_ID,
    full_name: 'Bob Social',
    avatar_url: null,
  },
};

export const FAKE_GROUP_MEMBER = {
  id: 'member-001',
  group_id: FAKE_GROUP_ID,
  user_id: FAKE_USER_ID,
  role: 'OWNER' as const,
  joined_at: '2026-01-01T00:00:00Z',
  profile: FAKE_PROFILE,
};

// ---------------------------------------------------------------------------
// Activity / Feed fixtures
// ---------------------------------------------------------------------------
export const FAKE_ACTIVITY = {
  id: 'activity-001',
  type: 'ride_completed' as const,
  text: 'Alice completed a ride from Home to Office',
  userName: 'Alice Community',
  userAvatar: 'https://example.com/alice.jpg',
  userId: FAKE_USER_ID,
  timestamp: '2026-01-15T10:00:00Z',
  meta: {},
  actionLabel: 'View Ride',
  actionLink: `/rides/${FAKE_RIDE_ID}`,
  reactions: [],
};

export const FAKE_REACTION = {
  id: 'reaction-001',
  user_id: FAKE_OTHER_USER_ID,
  emoji: '👍',
  user_name: 'Bob Social',
  user_avatar: 'https://example.com/bob.jpg',
};

export const FAKE_RIDE_STORY = {
  id: 'story-001',
  ride_id: FAKE_RIDE_ID,
  user_id: FAKE_USER_ID,
  photo_url: 'https://example.com/story.jpg',
  caption: 'Great commute today!',
  created_at: '2026-01-15T10:00:00Z',
  expires_at: '2026-01-16T10:00:00Z',
  user: FAKE_PROFILE,
};

export const FAKE_WAVE = {
  id: 'wave-001',
  from_user_id: FAKE_OTHER_USER_ID,
  to_user_id: FAKE_USER_ID,
  created_at: '2026-01-15T10:00:00Z',
  from_user: FAKE_OTHER_PROFILE,
};

// ---------------------------------------------------------------------------
// Notification fixtures
// ---------------------------------------------------------------------------
export const FAKE_NOTIFICATION = {
  id: FAKE_NOTIFICATION_ID,
  user_id: FAKE_USER_ID,
  type: 'FRIEND_REQUEST' as const,
  data: { sender_name: 'Bob Social' },
  created_at: '2026-01-15T10:00:00Z',
  read_at: null,
};

export const FAKE_READ_NOTIFICATION = {
  ...FAKE_NOTIFICATION,
  id: 'notif-002',
  type: 'NEW_MESSAGE' as const,
  data: { sender_name: 'Charlie', conversation_id: 'conv-001', preview: 'Hey!' },
  read_at: '2026-01-15T11:00:00Z',
};

// ---------------------------------------------------------------------------
// Ride match fixtures
// ---------------------------------------------------------------------------
export const FAKE_RIDE_MATCH = {
  ride_id: FAKE_RIDE_ID,
  driver_id: FAKE_OTHER_USER_ID,
  driver_name: 'Bob Social',
  driver_avatar: 'https://example.com/bob.jpg',
  origin: 'Downtown',
  destination: 'Airport',
  departure_time: '2026-01-16T08:00:00Z',
  seats_available: 3,
  match_score: 0.85,
  is_friend: true,
  shared_group: 'Campus Commuters',
};

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

let _counter = 0;
function uid() { return `${++_counter}-${Math.random().toString(36).substr(2, 6)}`; }

export function makeProfile(overrides: Record<string, any> = {}) {
  const id = overrides.id ?? `user-${uid()}`;
  return { ...FAKE_PROFILE, id, ...overrides };
}

export function makeFriendship(overrides: Record<string, any> = {}) {
  return {
    ...FAKE_FRIENDSHIP,
    id: `friendship-${uid()}`,
    ...overrides,
  };
}

export function makeFriendRequest(overrides: Record<string, any> = {}) {
  return {
    ...FAKE_FRIEND_REQUEST,
    id: `request-${uid()}`,
    ...overrides,
  };
}

export function makeGroup(overrides: Record<string, any> = {}) {
  return {
    ...FAKE_GROUP,
    id: `group-${uid()}`,
    ...overrides,
  };
}

export function makeGroupInvite(overrides: Record<string, any> = {}) {
  return {
    ...FAKE_GROUP_INVITE,
    id: `invite-${uid()}`,
    ...overrides,
  };
}

export function makeActivity(overrides: Record<string, any> = {}) {
  return {
    ...FAKE_ACTIVITY,
    id: `activity-${uid()}`,
    ...overrides,
  };
}

export function makeNotification(overrides: Record<string, any> = {}) {
  return {
    ...FAKE_NOTIFICATION,
    id: `notif-${uid()}`,
    ...overrides,
  };
}

export function makeRideMatch(overrides: Record<string, any> = {}) {
  return {
    ...FAKE_RIDE_MATCH,
    ride_id: `ride-${uid()}`,
    ...overrides,
  };
}

export function makeWave(overrides: Record<string, any> = {}) {
  return {
    ...FAKE_WAVE,
    id: `wave-${uid()}`,
    ...overrides,
  };
}

export function makeRideStory(overrides: Record<string, any> = {}) {
  return {
    ...FAKE_RIDE_STORY,
    id: `story-${uid()}`,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Supabase mock builder (chainable query)
// ---------------------------------------------------------------------------

/** Build a chainable Supabase query mock that resolves to the given data */
export function buildChain(result: { data: any; error: any; count?: number }) {
  const mock: Record<string, any> = {};

  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'is', 'in', 'or', 'not',
    'order', 'limit', 'range', 'single', 'maybeSingle',
    'filter', 'match', 'textSearch', 'contains', 'containedBy',
    'overlaps', 'ilike', 'like', 'onConflict',
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

/** Build a mock Supabase channel */
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
