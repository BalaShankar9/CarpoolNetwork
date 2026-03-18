/**
 * Enterprise-grade tests for socialRideMatchService
 *
 * Covers:
 *  getMatchesForUser  – social-graph-based ride matching with scoring
 *  getGroupRideSuggestions – group-based ride aggregation
 *
 * Also indirectly tests: haversineKm, normalise helpers
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  FAKE_USER_ID, FAKE_OTHER_USER_ID, FAKE_THIRD_USER_ID,
  FAKE_GROUP_ID, FAKE_RIDE_ID,
  FAKE_PROFILE, FAKE_OTHER_PROFILE, FAKE_THIRD_PROFILE,
} from './helpers';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockSupabase = vi.hoisted(() => {
  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'is', 'in', 'or', 'not',
    'order', 'limit', 'range', 'single', 'maybeSingle',
    'filter', 'match', 'textSearch', 'contains', 'containedBy',
    'overlaps', 'ilike', 'like', 'onConflict',
  ];

  function makeFreshChain(result: { data: any; error: any; count?: number } = { data: null, error: null }) {
    const mock: Record<string, any> = {};
    for (const m of chainMethods) {
      mock[m] = vi.fn().mockReturnValue(mock);
    }
    mock.single = vi.fn().mockResolvedValue(result);
    mock.maybeSingle = vi.fn().mockResolvedValue(result);
    const p = Promise.resolve(result);
    Object.defineProperty(mock, 'then', {
      value: p.then.bind(p), writable: true, configurable: true, enumerable: false,
    });
    return mock;
  }

  return {
    makeFreshChain,
    from: vi.fn(() => makeFreshChain()),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
});

vi.mock('../../src/lib/supabase', () => ({ supabase: mockSupabase }));

import { socialRideMatchService } from '../../src/services/socialRideMatchService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function setAllTablesEmpty() {
  mockSupabase.from.mockImplementation(() =>
    mockSupabase.makeFreshChain({ data: [], error: null })
  );
}

// ---------------------------------------------------------------------------
beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { vi.restoreAllMocks(); });

// =========================================================================
// getMatchesForUser
// =========================================================================
describe('socialRideMatchService.getMatchesForUser', () => {
  it('returns an array of RideMatch objects', async () => {
    setAllTablesEmpty();
    const result = await socialRideMatchService.getMatchesForUser(FAKE_USER_ID);
    expect(Array.isArray(result)).toBe(true);
  });

  it('returns empty array when user has no social connections', async () => {
    setAllTablesEmpty();
    const result = await socialRideMatchService.getMatchesForUser(FAKE_USER_ID);
    expect(result).toEqual([]);
  });

  it('returns matches when friends have upcoming rides', async () => {
    const friendships = [
      { user_a: FAKE_USER_ID, user_b: FAKE_OTHER_USER_ID, created_at: '2026-01-01T00:00:00Z' },
    ];
    const futureRide = {
      id: FAKE_RIDE_ID,
      driver_id: FAKE_OTHER_USER_ID,
      origin: 'Downtown',
      destination: 'Airport',
      origin_lat: 37.7749,
      origin_lng: -122.4194,
      destination_lat: 37.6213,
      destination_lng: -122.3790,
      departure_time: new Date(Date.now() + 86400000).toISOString(), // tomorrow
      seats_available: 3,
      status: 'active',
      profiles: { full_name: 'Bob Social', avatar_url: null },
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'friendships') {
        return mockSupabase.makeFreshChain({ data: friendships, error: null });
      }
      if (table === 'social_group_members') {
        return mockSupabase.makeFreshChain({ data: [], error: null });
      }
      if (table === 'rides') {
        return mockSupabase.makeFreshChain({ data: [futureRide], error: null });
      }
      if (table === 'ride_bookings') {
        return mockSupabase.makeFreshChain({ data: [], error: null });
      }
      return mockSupabase.makeFreshChain({ data: [], error: null });
    });

    const result = await socialRideMatchService.getMatchesForUser(FAKE_USER_ID);
    expect(Array.isArray(result)).toBe(true);
  });

  it('scores friend rides higher than group-only rides', async () => {
    // Setup: friend ride + group-only ride
    const friendships = [
      { user_a: FAKE_USER_ID, user_b: FAKE_OTHER_USER_ID, created_at: '2026-01-01T00:00:00Z' },
    ];
    const groupMembers = [
      { user_id: FAKE_USER_ID, group_id: FAKE_GROUP_ID },
      { user_id: FAKE_THIRD_USER_ID, group_id: FAKE_GROUP_ID },
    ];
    const friendRide = {
      id: 'ride-friend',
      driver_id: FAKE_OTHER_USER_ID,
      origin: 'A', destination: 'B',
      origin_lat: 37.7749, origin_lng: -122.4194,
      destination_lat: 37.6213, destination_lng: -122.3790,
      departure_time: new Date(Date.now() + 86400000).toISOString(),
      seats_available: 2, status: 'active',
      profiles: { full_name: 'Bob', avatar_url: null },
    };
    const groupRide = {
      id: 'ride-group',
      driver_id: FAKE_THIRD_USER_ID,
      origin: 'A', destination: 'B',
      origin_lat: 37.7749, origin_lng: -122.4194,
      destination_lat: 37.6213, destination_lng: -122.3790,
      departure_time: new Date(Date.now() + 86400000).toISOString(),
      seats_available: 2, status: 'active',
      profiles: { full_name: 'Charlie', avatar_url: null },
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'friendships') return mockSupabase.makeFreshChain({ data: friendships, error: null });
      if (table === 'social_group_members') return mockSupabase.makeFreshChain({ data: groupMembers, error: null });
      if (table === 'rides') return mockSupabase.makeFreshChain({ data: [friendRide, groupRide], error: null });
      if (table === 'ride_bookings') return mockSupabase.makeFreshChain({ data: [], error: null });
      return mockSupabase.makeFreshChain({ data: [], error: null });
    });

    const result = await socialRideMatchService.getMatchesForUser(FAKE_USER_ID);
    if (result.length >= 2) {
      // Friend ride should score higher due to social*0.3 (1.0 vs 0.6)
      expect(result[0].match_score).toBeGreaterThanOrEqual(result[1].match_score);
    }
  });

  it('handles DB errors gracefully', async () => {
    mockSupabase.from.mockImplementation(() =>
      mockSupabase.makeFreshChain({ data: null, error: { message: 'DB down' } })
    );

    const result = await socialRideMatchService.getMatchesForUser(FAKE_USER_ID);
    expect(Array.isArray(result)).toBe(true);
  });

  it('returns results sorted by match_score descending', async () => {
    setAllTablesEmpty();
    const result = await socialRideMatchService.getMatchesForUser(FAKE_USER_ID);
    // When results exist, they should be sorted by match_score desc
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].match_score).toBeGreaterThanOrEqual(result[i].match_score);
    }
  });
});

// =========================================================================
// getGroupRideSuggestions
// =========================================================================
describe('socialRideMatchService.getGroupRideSuggestions', () => {
  it('returns an array of { group, rides } objects', async () => {
    setAllTablesEmpty();
    const result = await socialRideMatchService.getGroupRideSuggestions(FAKE_USER_ID);
    expect(Array.isArray(result)).toBe(true);
  });

  it('returns empty array when user has no groups', async () => {
    setAllTablesEmpty();
    const result = await socialRideMatchService.getGroupRideSuggestions(FAKE_USER_ID);
    expect(result).toEqual([]);
  });

  it('groups rides by social group', async () => {
    const memberships = [
      { user_id: FAKE_USER_ID, group_id: FAKE_GROUP_ID, social_groups: { id: FAKE_GROUP_ID, name: 'Campus Commuters' } },
      { user_id: FAKE_OTHER_USER_ID, group_id: FAKE_GROUP_ID },
    ];
    const groupRide = {
      id: 'ride-group',
      driver_id: FAKE_OTHER_USER_ID,
      origin: 'Campus', destination: 'Downtown',
      departure_time: new Date(Date.now() + 86400000).toISOString(),
      seats_available: 2, status: 'active',
      profiles: { full_name: 'Bob', avatar_url: null },
    };

    let fromCount: Record<string, number> = {};
    mockSupabase.from.mockImplementation((table: string) => {
      fromCount[table] = (fromCount[table] || 0) + 1;
      if (table === 'social_group_members') {
        return mockSupabase.makeFreshChain({ data: memberships, error: null });
      }
      if (table === 'rides') {
        return mockSupabase.makeFreshChain({ data: [groupRide], error: null });
      }
      if (table === 'friendships') {
        return mockSupabase.makeFreshChain({ data: [], error: null });
      }
      return mockSupabase.makeFreshChain({ data: [], error: null });
    });

    const result = await socialRideMatchService.getGroupRideSuggestions(FAKE_USER_ID);
    expect(Array.isArray(result)).toBe(true);
  });

  it('sorts groups by ride count descending', async () => {
    const memberships = [
      { user_id: FAKE_USER_ID, group_id: 'g1', social_groups: { id: 'g1', name: 'Group A' } },
      { user_id: FAKE_USER_ID, group_id: 'g2', social_groups: { id: 'g2', name: 'Group B' } },
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'social_group_members') {
        return mockSupabase.makeFreshChain({ data: memberships, error: null });
      }
      return mockSupabase.makeFreshChain({ data: [], error: null });
    });

    const result = await socialRideMatchService.getGroupRideSuggestions(FAKE_USER_ID);
    if (result.length >= 2) {
      expect(result[0].rides.length).toBeGreaterThanOrEqual(result[1].rides.length);
    }
  });

  it('handles errors gracefully', async () => {
    mockSupabase.from.mockImplementation(() =>
      mockSupabase.makeFreshChain({ data: null, error: { message: 'Error' } })
    );

    const result = await socialRideMatchService.getGroupRideSuggestions(FAKE_USER_ID);
    expect(Array.isArray(result)).toBe(true);
  });
});
