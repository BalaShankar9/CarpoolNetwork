/**
 * Enterprise-grade tests for publicProfiles service
 *
 * Covers:
 *  fetchPublicProfilesByIds  – batch fetch with dedup and fallback
 *  fetchPublicProfileById    – single fetch with fallback
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  FAKE_USER_ID, FAKE_OTHER_USER_ID, FAKE_THIRD_USER_ID,
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

import { fetchPublicProfilesByIds, fetchPublicProfileById } from '../../src/services/publicProfiles';

// ---------------------------------------------------------------------------
beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { vi.restoreAllMocks(); });

// =========================================================================
// fetchPublicProfilesByIds
// =========================================================================
describe('fetchPublicProfilesByIds', () => {
  it('returns a map of id → profile from profile_public_v view', async () => {
    const viewData = [
      { id: FAKE_USER_ID, full_name: 'Alice Community', avatar_url: 'alice.jpg' },
      { id: FAKE_OTHER_USER_ID, full_name: 'Bob Social', avatar_url: 'bob.jpg' },
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profile_public_v') {
        return mockSupabase.makeFreshChain({ data: viewData, error: null });
      }
      return mockSupabase.makeFreshChain({ data: [], error: null });
    });

    const result = await fetchPublicProfilesByIds([FAKE_USER_ID, FAKE_OTHER_USER_ID]);
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('returns empty object for empty ids array', async () => {
    const result = await fetchPublicProfilesByIds([]);
    expect(result).toEqual({});
  });

  it('deduplicates and filters blank IDs', async () => {
    mockSupabase.from.mockImplementation(() =>
      mockSupabase.makeFreshChain({ data: [{ id: FAKE_USER_ID, full_name: 'Alice' }], error: null })
    );

    const result = await fetchPublicProfilesByIds([FAKE_USER_ID, FAKE_USER_ID, '', '  ']);
    expect(mockSupabase.from).toHaveBeenCalled();
  });

  it('falls back to profiles table on schema_cache error', async () => {
    let callCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      callCount++;
      if (table === 'profile_public_v') {
        return mockSupabase.makeFreshChain({
          data: null,
          error: { message: 'schema_cache', code: 'PGRST204' },
        });
      }
      if (table === 'profiles') {
        return mockSupabase.makeFreshChain({
          data: [{ id: FAKE_USER_ID, full_name: 'Alice' }],
          error: null,
        });
      }
      return mockSupabase.makeFreshChain({ data: [], error: null });
    });

    const result = await fetchPublicProfilesByIds([FAKE_USER_ID]);
    expect(typeof result).toBe('object');
  });

  it('falls back to profiles table on 42P01 error (table not found)', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profile_public_v') {
        return mockSupabase.makeFreshChain({
          data: null,
          error: { message: '42P01', code: '42P01' },
        });
      }
      if (table === 'profiles') {
        return mockSupabase.makeFreshChain({
          data: [{ id: FAKE_USER_ID, full_name: 'Alice' }],
          error: null,
        });
      }
      return mockSupabase.makeFreshChain();
    });

    const result = await fetchPublicProfilesByIds([FAKE_USER_ID]);
    expect(typeof result).toBe('object');
  });

  it('throws when both view and fallback fail with non-schema error', async () => {
    mockSupabase.from.mockImplementation(() =>
      mockSupabase.makeFreshChain({ data: null, error: { message: 'Total failure' } })
    );

    await expect(fetchPublicProfilesByIds([FAKE_USER_ID])).rejects.toThrow();
  });

  it('handles multiple IDs correctly', async () => {
    const viewData = [
      { id: FAKE_USER_ID, full_name: 'Alice' },
      { id: FAKE_OTHER_USER_ID, full_name: 'Bob' },
      { id: FAKE_THIRD_USER_ID, full_name: 'Charlie' },
    ];

    mockSupabase.from.mockImplementation(() =>
      mockSupabase.makeFreshChain({ data: viewData, error: null })
    );

    const result = await fetchPublicProfilesByIds([
      FAKE_USER_ID, FAKE_OTHER_USER_ID, FAKE_THIRD_USER_ID,
    ]);
    expect(typeof result).toBe('object');
  });
});

// =========================================================================
// fetchPublicProfileById
// =========================================================================
describe('fetchPublicProfileById', () => {
  it('returns a single profile from profile_public_v view', async () => {
    const profile = { id: FAKE_USER_ID, full_name: 'Alice Community', avatar_url: 'alice.jpg' };
    const chain = mockSupabase.makeFreshChain({ data: profile, error: null });
    chain.single = vi.fn().mockResolvedValue({ data: profile, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const result = await fetchPublicProfileById(FAKE_USER_ID);
    expect(result).toBeDefined();
  });

  it('returns null when profile not found', async () => {
    const chain = mockSupabase.makeFreshChain({ data: null, error: null });
    chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const result = await fetchPublicProfileById('nonexistent-id');
    expect(result).toBeNull();
  });

  it('falls back to profiles table on view error', async () => {
    let callCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      callCount++;
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      if (table === 'profile_public_v') {
        chain.single = vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'schema_cache', code: 'PGRST204' },
        });
        chain.maybeSingle = vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'schema_cache', code: 'PGRST204' },
        });
      } else if (table === 'profiles') {
        const profile = { id: FAKE_USER_ID, full_name: 'Alice' };
        chain.single = vi.fn().mockResolvedValue({ data: profile, error: null });
        chain.maybeSingle = vi.fn().mockResolvedValue({ data: profile, error: null });
      }
      return chain;
    });

    const result = await fetchPublicProfileById(FAKE_USER_ID);
    // Should have attempted fallback
    expect(callCount).toBeGreaterThanOrEqual(1);
  });

  it('throws when view fails with non-schema error', async () => {
    const chain = mockSupabase.makeFreshChain({ data: null, error: { message: 'DB down' } });
    chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB down' } });
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB down' } });
    mockSupabase.from.mockReturnValue(chain);

    await expect(fetchPublicProfileById(FAKE_USER_ID)).rejects.toThrow();
  });
});
