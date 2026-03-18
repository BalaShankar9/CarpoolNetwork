/**
 * Enterprise-grade tests for AchievementService
 * Covers: ACHIEVEMENTS const, getUserStats, checkAllAchievements, getUserAchievements,
 * getAchievementById, getAchievementsByCategory, calculateProgress
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
const mockSupabase = vi.hoisted(() => {
  const makeFreshChain = (result: any) => {
    const chain: Record<string, any> = {};
    const methods = [
      'select', 'insert', 'update', 'delete', 'eq', 'neq', 'or', 'not',
      'in', 'order', 'limit', 'is', 'ilike', 'gt', 'gte', 'lt', 'lte',
      'single', 'maybeSingle', 'filter', 'range', 'contains',
    ];
    for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain);
    const p = Promise.resolve(result);
    Object.defineProperty(chain, 'then', {
      value: p.then.bind(p), writable: true, configurable: true, enumerable: false,
    });
    return chain;
  };
  return {
    from: vi.fn(() => makeFreshChain({ data: null, error: null, count: 0 })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    makeFreshChain,
  };
});

vi.mock('../../src/lib/supabase', () => ({ supabase: mockSupabase }));

import {
  ACHIEVEMENTS,
  TIER_COLORS,
  TIER_BG_COLORS,
  getUserStats,
  checkAllAchievements,
  getUserAchievements,
  getAchievementById,
  getAchievementsByCategory,
  calculateProgress,
} from '../../src/services/achievementService';
import type { Achievement, UserStats } from '../../src/services/achievementService';

// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.from.mockImplementation(() =>
    mockSupabase.makeFreshChain({ data: null, error: null, count: 0 })
  );
});

const makeStats = (overrides: Partial<UserStats> = {}): UserStats => ({
  ridesAsDriver: 0,
  ridesAsPassenger: 0,
  totalRides: 0,
  fiveStarRatings: 0,
  reviewsGiven: 0,
  uniquePassengers: 0,
  uniqueDrivers: 0,
  co2Saved: 0,
  accountAgeDays: 0,
  verificationLevel: 0,
  friendsCount: 0,
  ...overrides,
});

// =========================================================================
describe('AchievementService', () => {

  // --- ACHIEVEMENTS constant ---
  describe('ACHIEVEMENTS constant', () => {
    it('has at least 10 achievements defined', () => {
      expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(10);
    });

    it('every achievement has required fields', () => {
      for (const a of ACHIEVEMENTS) {
        expect(a.id).toBeTruthy();
        expect(a.name).toBeTruthy();
        expect(a.description).toBeTruthy();
        expect(a.icon).toBeTruthy();
        expect(['rides', 'social', 'safety', 'milestone']).toContain(a.category);
        expect(['bronze', 'silver', 'gold', 'platinum']).toContain(a.tier);
      }
    });

    it('has no duplicate IDs', () => {
      const ids = ACHIEVEMENTS.map(a => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('every achievement has a checkFn', () => {
      for (const a of ACHIEVEMENTS) {
        expect(typeof a.checkFn).toBe('function');
      }
    });

    it('includes expected achievements', () => {
      const ids = ACHIEVEMENTS.map(a => a.id);
      expect(ids).toContain('first_ride');
      expect(ids).toContain('road_warrior');
      expect(ids).toContain('eco_warrior');
      expect(ids).toContain('fully_verified');
    });
  });

  // --- Tier constants ---
  describe('Tier constants', () => {
    it('TIER_COLORS has all tiers', () => {
      expect(TIER_COLORS).toHaveProperty('bronze');
      expect(TIER_COLORS).toHaveProperty('silver');
      expect(TIER_COLORS).toHaveProperty('gold');
      expect(TIER_COLORS).toHaveProperty('platinum');
    });

    it('TIER_BG_COLORS has all tiers', () => {
      expect(TIER_BG_COLORS).toHaveProperty('bronze');
      expect(TIER_BG_COLORS).toHaveProperty('silver');
      expect(TIER_BG_COLORS).toHaveProperty('gold');
      expect(TIER_BG_COLORS).toHaveProperty('platinum');
    });
  });

  // --- checkFn logic ---
  describe('Achievement checkFn logic', () => {
    it('first_ride: unlocks at 1 total ride', () => {
      const a = ACHIEVEMENTS.find(a => a.id === 'first_ride')!;
      expect(a.checkFn!(makeStats({ totalRides: 0 }))).toBe(false);
      expect(a.checkFn!(makeStats({ totalRides: 1 }))).toBe(true);
    });

    it('getting_started: unlocks at 5 total rides', () => {
      const a = ACHIEVEMENTS.find(a => a.id === 'getting_started')!;
      expect(a.checkFn!(makeStats({ totalRides: 4 }))).toBe(false);
      expect(a.checkFn!(makeStats({ totalRides: 5 }))).toBe(true);
    });

    it('road_warrior: unlocks at 10 driver rides', () => {
      const a = ACHIEVEMENTS.find(a => a.id === 'road_warrior')!;
      expect(a.checkFn!(makeStats({ ridesAsDriver: 9 }))).toBe(false);
      expect(a.checkFn!(makeStats({ ridesAsDriver: 10 }))).toBe(true);
    });

    it('frequent_rider: unlocks at 25 passenger rides', () => {
      const a = ACHIEVEMENTS.find(a => a.id === 'frequent_rider')!;
      expect(a.checkFn!(makeStats({ ridesAsPassenger: 24 }))).toBe(false);
      expect(a.checkFn!(makeStats({ ridesAsPassenger: 25 }))).toBe(true);
    });

    it('half_century: unlocks at 50 total rides', () => {
      const a = ACHIEVEMENTS.find(a => a.id === 'half_century')!;
      expect(a.checkFn!(makeStats({ totalRides: 49 }))).toBe(false);
      expect(a.checkFn!(makeStats({ totalRides: 50 }))).toBe(true);
    });

    it('century_club: unlocks at 100 total rides', () => {
      const a = ACHIEVEMENTS.find(a => a.id === 'century_club')!;
      expect(a.checkFn!(makeStats({ totalRides: 99 }))).toBe(false);
      expect(a.checkFn!(makeStats({ totalRides: 100 }))).toBe(true);
    });

    it('first_review: unlocks at 1 review given', () => {
      const a = ACHIEVEMENTS.find(a => a.id === 'first_review')!;
      expect(a.checkFn!(makeStats({ reviewsGiven: 0 }))).toBe(false);
      expect(a.checkFn!(makeStats({ reviewsGiven: 1 }))).toBe(true);
    });

    it('five_star: unlocks at 10 five-star ratings', () => {
      const a = ACHIEVEMENTS.find(a => a.id === 'five_star')!;
      expect(a.checkFn!(makeStats({ fiveStarRatings: 9 }))).toBe(false);
      expect(a.checkFn!(makeStats({ fiveStarRatings: 10 }))).toBe(true);
    });

    it('networker: unlocks at 20 unique users combined', () => {
      const a = ACHIEVEMENTS.find(a => a.id === 'networker')!;
      expect(a.checkFn!(makeStats({ uniquePassengers: 10, uniqueDrivers: 9 }))).toBe(false);
      expect(a.checkFn!(makeStats({ uniquePassengers: 10, uniqueDrivers: 10 }))).toBe(true);
    });

    it('eco_warrior: unlocks at 100kg CO2 saved', () => {
      const a = ACHIEVEMENTS.find(a => a.id === 'eco_warrior')!;
      expect(a.checkFn!(makeStats({ co2Saved: 99 }))).toBe(false);
      expect(a.checkFn!(makeStats({ co2Saved: 100 }))).toBe(true);
    });

    it('veteran: unlocks at 365 account age days', () => {
      const a = ACHIEVEMENTS.find(a => a.id === 'veteran')!;
      expect(a.checkFn!(makeStats({ accountAgeDays: 364 }))).toBe(false);
      expect(a.checkFn!(makeStats({ accountAgeDays: 365 }))).toBe(true);
    });

    it('fully_verified: unlocks at verification level 5', () => {
      const a = ACHIEVEMENTS.find(a => a.id === 'fully_verified')!;
      expect(a.checkFn!(makeStats({ verificationLevel: 4 }))).toBe(false);
      expect(a.checkFn!(makeStats({ verificationLevel: 5 }))).toBe(true);
    });
  });

  // --- getAchievementById ---
  describe('getAchievementById', () => {
    it('returns achievement for valid ID', () => {
      const a = getAchievementById('first_ride');
      expect(a).toBeDefined();
      expect(a!.name).toBe('First Ride');
    });

    it('returns undefined for unknown ID', () => {
      expect(getAchievementById('nonexistent')).toBeUndefined();
    });
  });

  // --- getAchievementsByCategory ---
  describe('getAchievementsByCategory', () => {
    it('returns only rides category achievements', () => {
      const rides = getAchievementsByCategory('rides');
      expect(rides.length).toBeGreaterThan(0);
      for (const a of rides) {
        expect(a.category).toBe('rides');
      }
    });

    it('returns only social category achievements', () => {
      const social = getAchievementsByCategory('social');
      expect(social.length).toBeGreaterThan(0);
      for (const a of social) {
        expect(a.category).toBe('social');
      }
    });

    it('returns only safety category achievements', () => {
      const safety = getAchievementsByCategory('safety');
      expect(safety.length).toBeGreaterThan(0);
      for (const a of safety) {
        expect(a.category).toBe('safety');
      }
    });

    it('returns only milestone category achievements', () => {
      const milestones = getAchievementsByCategory('milestone');
      expect(milestones.length).toBeGreaterThan(0);
      for (const a of milestones) {
        expect(a.category).toBe('milestone');
      }
    });
  });

  // --- calculateProgress ---
  describe('calculateProgress', () => {
    it('returns 0 for no progress', () => {
      const a = ACHIEVEMENTS.find(a => a.id === 'first_ride')!;
      expect(calculateProgress(a, makeStats())).toBe(0);
    });

    it('returns 100 when requirement met', () => {
      const a = ACHIEVEMENTS.find(a => a.id === 'first_ride')!;
      expect(calculateProgress(a, makeStats({ totalRides: 1 }))).toBe(100);
    });

    it('caps at 100 even when exceeding requirement', () => {
      const a = ACHIEVEMENTS.find(a => a.id === 'first_ride')!;
      expect(calculateProgress(a, makeStats({ totalRides: 999 }))).toBe(100);
    });

    it('calculates partial progress correctly', () => {
      const a = ACHIEVEMENTS.find(a => a.id === 'half_century')!; // requirement: 50
      expect(calculateProgress(a, makeStats({ totalRides: 25 }))).toBe(50);
    });

    it('calculates road_warrior progress (ridesAsDriver)', () => {
      const a = ACHIEVEMENTS.find(a => a.id === 'road_warrior')!; // requirement: 10
      expect(calculateProgress(a, makeStats({ ridesAsDriver: 5 }))).toBe(50);
    });

    it('calculates frequent_rider progress (ridesAsPassenger)', () => {
      const a = ACHIEVEMENTS.find(a => a.id === 'frequent_rider')!; // requirement: 25
      expect(calculateProgress(a, makeStats({ ridesAsPassenger: 5 }))).toBe(20);
    });

    it('calculates five_star progress', () => {
      const a = ACHIEVEMENTS.find(a => a.id === 'five_star')!; // requirement: 10
      expect(calculateProgress(a, makeStats({ fiveStarRatings: 7 }))).toBe(70);
    });

    it('calculates networker progress (unique users)', () => {
      const a = ACHIEVEMENTS.find(a => a.id === 'networker')!; // requirement: 20
      expect(calculateProgress(a, makeStats({ uniquePassengers: 5, uniqueDrivers: 5 }))).toBe(50);
    });

    it('calculates eco_warrior progress (co2Saved)', () => {
      const a = ACHIEVEMENTS.find(a => a.id === 'eco_warrior')!; // requirement: 100
      expect(calculateProgress(a, makeStats({ co2Saved: 50 }))).toBe(50);
    });

    it('calculates veteran progress (accountAgeDays)', () => {
      const a = ACHIEVEMENTS.find(a => a.id === 'veteran')!; // requirement: 365
      expect(calculateProgress(a, makeStats({ accountAgeDays: 183 }))).toBe(50);
    });

    it('calculates fully_verified progress', () => {
      const a = ACHIEVEMENTS.find(a => a.id === 'fully_verified')!; // requirement: 5
      expect(calculateProgress(a, makeStats({ verificationLevel: 3 }))).toBe(60);
    });
  });

  // --- getUserStats (async with Supabase) ---
  describe('getUserStats', () => {
    it('aggregates counts from multiple tables', async () => {
      // getUserStats calls Promise.all with 8 queries including inline nested
      // queries (data?.map), so we return arrays where needed.
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return mockSupabase.makeFreshChain({
            data: { created_at: '2025-01-01T00:00:00Z', email_verified: true, phone_verified: true, face_verified: false, license_verified: false, insurance_verified: false },
            error: null,
            count: 0,
          });
        }
        if (table === 'rides') {
          // Used in nested query: .from('rides').select('id')...  → data must be array
          return mockSupabase.makeFreshChain({ data: [], error: null, count: 3 });
        }
        // ride_bookings, reviews, friendships → return arrays
        return mockSupabase.makeFreshChain({ data: [], error: null, count: 2 });
      });

      const stats = await getUserStats('u1');
      expect(stats).toHaveProperty('totalRides');
      expect(stats).toHaveProperty('co2Saved');
      expect(stats).toHaveProperty('accountAgeDays');
      expect(stats).toHaveProperty('verificationLevel');
      expect(stats.verificationLevel).toBe(2); // email + phone
    });
  });

  // --- checkAllAchievements ---
  describe('checkAllAchievements', () => {
    it('returns newly unlocked achievement IDs', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'user_achievements') {
          return mockSupabase.makeFreshChain({ data: [], error: null });
        }
        if (table === 'notifications') {
          return mockSupabase.makeFreshChain({ data: null, error: null });
        }
        if (table === 'profiles') {
          return mockSupabase.makeFreshChain({
            data: { created_at: '2025-01-01', email_verified: false, phone_verified: false, face_verified: false, license_verified: false, insurance_verified: false },
            error: null, count: 0,
          });
        }
        if (table === 'rides') {
          return mockSupabase.makeFreshChain({ data: [], error: null, count: 1 });
        }
        // ride_bookings, reviews, friendships
        return mockSupabase.makeFreshChain({ data: [], error: null, count: 1 });
      });

      const unlocked = await checkAllAchievements('u1');
      // totalRides = ridesAsDriver(1) + ridesAsPassenger(1) = 2 → first_ride(1) & getting_started requires 5
      expect(unlocked).toContain('first_ride');
    });

    it('does not re-unlock existing achievements', async () => {
      let uaCallCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'user_achievements') {
          uaCallCount++;
          if (uaCallCount === 1) {
            return mockSupabase.makeFreshChain({ data: [{ achievement_id: 'first_ride' }], error: null });
          }
          return mockSupabase.makeFreshChain({ data: null, error: null });
        }
        if (table === 'notifications') {
          return mockSupabase.makeFreshChain({ data: null, error: null });
        }
        if (table === 'profiles') {
          return mockSupabase.makeFreshChain({
            data: { created_at: '2025-01-01', email_verified: false, phone_verified: false, face_verified: false, license_verified: false, insurance_verified: false },
            error: null, count: 0,
          });
        }
        if (table === 'rides') {
          return mockSupabase.makeFreshChain({ data: [], error: null, count: 1 });
        }
        return mockSupabase.makeFreshChain({ data: [], error: null, count: 1 });
      });

      const unlocked = await checkAllAchievements('u1');
      expect(unlocked).not.toContain('first_ride');
    });
  });

  // --- getUserAchievements ---
  describe('getUserAchievements', () => {
    it('maps achievement data with unlocked_at', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({
          data: [
            { achievement_id: 'first_ride', unlocked_at: '2026-01-15T00:00:00Z' },
            { achievement_id: 'first_review', unlocked_at: '2026-02-01T00:00:00Z' },
          ],
          error: null,
        })
      );

      const achievements = await getUserAchievements('u1');
      expect(achievements).toHaveLength(2);
      expect(achievements[0].name).toBe('First Ride');
      expect(achievements[0].unlockedAt).toBe('2026-01-15T00:00:00Z');
    });

    it('filters out unknown achievement IDs', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({
          data: [
            { achievement_id: 'nonexistent', unlocked_at: '2026-01-15T00:00:00Z' },
            { achievement_id: 'first_ride', unlocked_at: '2026-01-15T00:00:00Z' },
          ],
          error: null,
        })
      );

      const achievements = await getUserAchievements('u1');
      expect(achievements).toHaveLength(1);
      expect(achievements[0].id).toBe('first_ride');
    });

    it('returns empty array when no achievements', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: [], error: null })
      );

      const achievements = await getUserAchievements('u1');
      expect(achievements).toEqual([]);
    });
  });
});
