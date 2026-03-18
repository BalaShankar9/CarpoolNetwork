/**
 * Shared fixtures, factories, and mock builders for Gamification module tests.
 */
import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const FAKE_USER_ID = 'user-gam-001';
export const FAKE_OTHER_USER_ID = 'user-gam-002';

export const FAKE_USER = { id: FAKE_USER_ID, email: 'gamer@example.com' };
export const FAKE_PROFILE = {
  id: FAKE_USER_ID,
  full_name: 'Test Gamer',
  avatar_url: null,
  trust_score: 85,
};

// ---------------------------------------------------------------------------
// Achievement fixtures (matching achievementService definitions)
// ---------------------------------------------------------------------------

export const FAKE_ACHIEVEMENT_BRONZE = {
  id: 'first_ride',
  name: 'First Ride',
  description: 'Complete your first ride',
  icon: 'car',
  category: 'rides' as const,
  tier: 'bronze' as const,
  requirement: 1,
};

export const FAKE_ACHIEVEMENT_SILVER = {
  id: 'road_warrior',
  name: 'Road Warrior',
  description: 'Complete 10 rides as a driver',
  icon: 'shield',
  category: 'rides' as const,
  tier: 'silver' as const,
  requirement: 10,
};

export const FAKE_ACHIEVEMENT_GOLD = {
  id: 'half_century',
  name: 'Half Century',
  description: 'Complete 50 total rides',
  icon: 'award',
  category: 'rides' as const,
  tier: 'gold' as const,
  requirement: 50,
};

export const FAKE_ACHIEVEMENT_PLATINUM = {
  id: 'century_club',
  name: 'Century Club',
  description: 'Complete 100 total rides',
  icon: 'trophy',
  category: 'milestone' as const,
  tier: 'platinum' as const,
  requirement: 100,
};

export const FAKE_ACHIEVEMENT_SOCIAL = {
  id: 'first_review',
  name: 'First Review',
  description: 'Leave your first review',
  icon: 'message-square',
  category: 'social' as const,
  tier: 'bronze' as const,
  requirement: 1,
};

export const FAKE_ACHIEVEMENT_SAFETY = {
  id: 'fully_verified',
  name: 'Fully Verified',
  description: 'Complete all verification steps',
  icon: 'check-circle',
  category: 'safety' as const,
  tier: 'silver' as const,
  requirement: 5,
};

export const ALL_FAKE_ACHIEVEMENTS = [
  FAKE_ACHIEVEMENT_BRONZE,
  FAKE_ACHIEVEMENT_SILVER,
  FAKE_ACHIEVEMENT_GOLD,
  FAKE_ACHIEVEMENT_PLATINUM,
  FAKE_ACHIEVEMENT_SOCIAL,
  FAKE_ACHIEVEMENT_SAFETY,
];

// ---------------------------------------------------------------------------
// Unlocked achievements
// ---------------------------------------------------------------------------

export const FAKE_UNLOCKED_ACHIEVEMENT = {
  ...FAKE_ACHIEVEMENT_BRONZE,
  unlockedAt: '2024-06-15T10:00:00Z',
};

export const FAKE_UNLOCKED_ACHIEVEMENT_2 = {
  ...FAKE_ACHIEVEMENT_SOCIAL,
  unlockedAt: '2024-06-20T14:00:00Z',
};

// ---------------------------------------------------------------------------
// User stats
// ---------------------------------------------------------------------------

export const FAKE_USER_STATS = {
  ridesAsDriver: 15,
  ridesAsPassenger: 10,
  totalRides: 25,
  fiveStarRatings: 8,
  reviewsGiven: 5,
  uniquePassengers: 12,
  uniqueDrivers: 6,
  co2Saved: 57.5,
  accountAgeDays: 120,
  verificationLevel: 3,
  friendsCount: 8,
};

// ---------------------------------------------------------------------------
// Streak data
// ---------------------------------------------------------------------------

export const FAKE_STREAK_DATA = {
  daily_streak: 7,
  longest_daily_streak: 14,
  weekly_streak: 3,
  longest_weekly_streak: 5,
  last_daily_activity: new Date().toISOString().split('T')[0] + 'T10:00:00Z',
  user_id: FAKE_USER_ID,
};

export const FAKE_STREAK_DATA_INACTIVE = {
  daily_streak: 0,
  longest_daily_streak: 5,
  weekly_streak: 0,
  longest_weekly_streak: 2,
  last_daily_activity: '2024-01-01T10:00:00Z',
  user_id: FAKE_USER_ID,
};

// ---------------------------------------------------------------------------
// Leaderboard entries
// ---------------------------------------------------------------------------

export const FAKE_LEADERBOARD_ENTRIES = [
  { rank: 1, userId: 'lb-user-1', name: 'Alice', avatar: null, value: 50, isCurrentUser: false },
  { rank: 2, userId: 'lb-user-2', name: 'Bob', avatar: null, value: 40, isCurrentUser: false },
  { rank: 3, userId: 'lb-user-3', name: 'Charlie', avatar: null, value: 30, isCurrentUser: false },
  { rank: 4, userId: FAKE_USER_ID, name: 'Test Gamer', avatar: null, value: 25, isCurrentUser: true },
  { rank: 5, userId: 'lb-user-5', name: 'Eve', avatar: null, value: 20, isCurrentUser: false },
];

// ---------------------------------------------------------------------------
// Tier colors (matching achievementService)
// ---------------------------------------------------------------------------

export const TIER_COLORS = {
  bronze: 'from-amber-600 to-amber-700',
  silver: 'from-gray-400 to-gray-500',
  gold: 'from-yellow-400 to-amber-500',
  platinum: 'from-purple-400 to-indigo-500',
};

export const TIER_BG_COLORS = {
  bronze: 'bg-amber-100 border-amber-300',
  silver: 'bg-gray-100 border-gray-300',
  gold: 'bg-yellow-100 border-yellow-300',
  platinum: 'bg-purple-100 border-purple-300',
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

export function makeAchievement(overrides: Record<string, any> = {}) {
  return { ...FAKE_ACHIEVEMENT_BRONZE, ...overrides };
}

export function makeUnlockedAchievement(overrides: Record<string, any> = {}) {
  return { ...FAKE_UNLOCKED_ACHIEVEMENT, ...overrides };
}

export function makeUserStats(overrides: Record<string, any> = {}) {
  return { ...FAKE_USER_STATS, ...overrides };
}

export function makeLeaderboardEntry(overrides: Record<string, any> = {}) {
  return {
    rank: 1,
    userId: 'lb-user-new',
    name: 'New User',
    avatar: null,
    value: 10,
    isCurrentUser: false,
    ...overrides,
  };
}
