/**
 * Shared test helpers for Social module widget / shared-component tests.
 *
 * Re-exports community helpers and adds widget-specific fixtures and factories.
 */
import { vi } from 'vitest';

// Re-export common community helpers
export {
  FAKE_USER_ID,
  FAKE_OTHER_USER_ID,
  FAKE_THIRD_USER_ID,
  FAKE_GROUP_ID,
  FAKE_FRIENDSHIP_ID,
  FAKE_REQUEST_ID,
  FAKE_RIDE_ID,
  FAKE_INVITE_ID,
  FAKE_PROFILE,
  FAKE_OTHER_PROFILE,
  FAKE_THIRD_PROFILE,
  FAKE_FRIENDSHIP,
  FAKE_FRIEND_REQUEST,
  FAKE_GROUP,
  FAKE_GROUP_INVITE,
  FAKE_GROUP_MEMBER,
  FAKE_ACTIVITY,
  FAKE_RIDE_MATCH,
  FAKE_WAVE,
  FAKE_RIDE_STORY,
  makeProfile,
  makeFriendship,
  makeFriendRequest,
  makeGroup,
  makeGroupInvite,
  makeActivity,
  makeRideMatch,
  makeWave,
  makeRideStory,
  buildChain,
  makeChannelMock,
  makeSupabaseMock,
} from '../community/helpers';

// ---------------------------------------------------------------------------
// Widget-specific fixtures
// ---------------------------------------------------------------------------

/** Story for StoryCarousel shared component */
export const FAKE_STORY = {
  id: 'story-w-001',
  userId: 'user-comm-002',
  userName: 'Bob Social',
  userAvatar: 'https://example.com/bob.jpg',
  photoUrl: 'https://example.com/photo.jpg',
  caption: 'Great ride today!',
  createdAt: '2026-01-15T10:00:00Z',
  isViewed: false,
};

export const FAKE_STORY_VIEWED = {
  ...FAKE_STORY,
  id: 'story-w-002',
  userId: 'user-comm-003',
  userName: 'Charlie Groups',
  userAvatar: undefined,
  photoUrl: '',
  caption: 'Morning commute',
  isViewed: true,
};

/** Reaction fixtures for ReactionBar */
export const FAKE_REACTIONS = [
  {
    emoji: 'celebrate',
    count: 3,
    hasReacted: false,
    users: [
      { name: 'Alice Community', avatar: 'https://example.com/alice.jpg' },
      { name: 'Bob Social' },
      { name: 'Charlie Groups' },
    ],
  },
  {
    emoji: 'love',
    count: 1,
    hasReacted: true,
    users: [{ name: 'Alice Community' }],
  },
];

/** QuickAction fixtures */
export const FAKE_ACTIONS = [
  { icon: '🚗', label: 'View Ride', onClick: vi.fn(), color: '' },
  { icon: '💬', label: 'Message', onClick: vi.fn(), color: '' },
  { icon: '👋', label: 'Wave', onClick: vi.fn(), color: '' },
];

/** Leaderboard entry fixtures */
export const FAKE_LEADERBOARD_ENTRIES = [
  {
    user_id: 'user-lb-1',
    rank: 1,
    score: 1500,
    profile: { full_name: 'Top Scorer', avatar_url: null, profile_photo_url: null },
  },
  {
    user_id: 'user-lb-2',
    rank: 2,
    score: 1200,
    profile: { full_name: 'Runner Up', avatar_url: 'https://example.com/ru.jpg', profile_photo_url: null },
  },
  {
    user_id: 'user-lb-3',
    rank: 3,
    score: 900,
    profile: { full_name: 'Bronze Star', avatar_url: null, profile_photo_url: null },
  },
];

/** Community post fixture */
export const FAKE_COMMUNITY_POST = {
  id: 'post-001',
  title: 'How to reduce commute costs',
  body: 'Here are some tips for saving money on your daily commute by sharing rides with others.',
  category: 'General',
  author_id: 'user-comm-002',
  author_name: 'Bob Social',
  author_avatar_url: null,
  score: 12,
  comment_count: 3,
  created_at: new Date(Date.now() - 3600_000).toISOString(), // 1 hour ago
  is_pinned: false,
};

/** Challenge fixture for ChallengesWidget */
export const FAKE_CHALLENGE_ROW = {
  id: 'challenge-w-001',
  title: 'Weekly Warrior',
  description: 'Complete 5 rides this week',
  challenge_type: 'rides',
  target_value: 5,
  reward_type: 'badge',
  reward_value: 'Weekly Warrior Badge',
  badge_icon: '🏆',
  start_date: new Date(Date.now() - 3 * 86400_000).toISOString(),
  end_date: new Date(Date.now() + 4 * 86400_000).toISOString(),
  is_active: true,
  is_seasonal: false,
  season_theme: null,
};

export const FAKE_USER_CHALLENGE = {
  challenge_id: 'challenge-w-001',
  progress: 3,
  completed: false,
  completed_at: null,
  reward_claimed: false,
};

/** Friend with presence fixture for FriendsWidget */
export const FAKE_FRIEND_WITH_PRESENCE = {
  id: 'user-comm-002',
  full_name: 'Bob Social',
  avatar_url: 'https://example.com/bob.jpg',
  profile_photo_url: null,
  presence: 'online' as const,
  last_seen_at: new Date().toISOString(),
  friendship_id: 'friendship-001',
};

/** Stats data fixture for StatsWidget */
export const FAKE_STATS_DATA = {
  rides: { current: 12, previous: 8 },
  co2: { current: 27.6, previous: 18.4 },
  friends: { current: 5, previous: 3 },
  challenges: { current: 3, previous: 1 },
  streak: 7,
};

// ---------------------------------------------------------------------------
// Factory helpers for generating multiple items
// ---------------------------------------------------------------------------

let _wc = 0;
function wuid() { return `w-${++_wc}-${Math.random().toString(36).substr(2, 4)}`; }

export function makeStory(overrides: Record<string, any> = {}) {
  return { ...FAKE_STORY, id: `story-${wuid()}`, ...overrides };
}

export function makeCommunityPost(overrides: Record<string, any> = {}) {
  return { ...FAKE_COMMUNITY_POST, id: `post-${wuid()}`, ...overrides };
}

export function makeLeaderboardEntry(overrides: Record<string, any> = {}) {
  return { ...FAKE_LEADERBOARD_ENTRIES[0], user_id: `user-${wuid()}`, ...overrides };
}

export function makeChallengeRow(overrides: Record<string, any> = {}) {
  return { ...FAKE_CHALLENGE_ROW, id: `challenge-${wuid()}`, ...overrides };
}

export function makeFriendWithPresence(overrides: Record<string, any> = {}) {
  return { ...FAKE_FRIEND_WITH_PRESENCE, id: `user-${wuid()}`, ...overrides };
}
