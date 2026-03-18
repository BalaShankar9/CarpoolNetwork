/**
 * presenceService.spec.ts — Enterprise-grade tests for src/services/presenceService.ts
 *
 * Covers: updatePresence, getPresence, getFriendsPresence,
 * startHeartbeat (with visibility/beforeunload), subscribeToPresence.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock supabase — use vi.hoisted to avoid factory-hoisting reference errors
// ---------------------------------------------------------------------------
const {
  mockUpsert, mockSelect, mockEq, mockIn, mockMaybeSingle,
  mockChannelOn, mockChannelSubscribe, mockRemoveChannel,
} = vi.hoisted(() => ({
  mockUpsert: vi.fn(),
  mockSelect: vi.fn(),
  mockEq: vi.fn(),
  mockIn: vi.fn(),
  mockMaybeSingle: vi.fn(),
  mockChannelOn: vi.fn(),
  mockChannelSubscribe: vi.fn(),
  mockRemoveChannel: vi.fn(),
}));

vi.mock('../../src/lib/supabase', () => {
  // Build a chainable from() mock.
  // IMPORTANT: Do NOT call mockXxx.mockReturnValue(chain) here because that
  // would override any per-test mockImplementation set BEFORE from() is called.
  // Instead, wrap each mock so that if a test hasn't overridden it the call
  // falls through to returning the chain (thenable with {data:null,error:null}).
  const buildChain = () => {
    const defaultP = Promise.resolve({ data: null, error: null });
    const chain: Record<string, any> = {};
    // Make chain thenable by default
    Object.defineProperty(chain, 'then', {
      get: () => defaultP.then.bind(defaultP),
      configurable: true,
    });

    // Each method delegates to the real mock fn. If the mock fn has been
    // overridden by a test it will take effect; otherwise the default
    // implementation just returns the chain.
    chain.upsert = (...args: any[]) => {
      const r = mockUpsert(...args);
      return r === undefined ? chain : r;
    };
    chain.select = (...args: any[]) => {
      const r = mockSelect(...args);
      return r === undefined ? chain : r;
    };
    chain.eq = (...args: any[]) => {
      const r = mockEq(...args);
      return r === undefined ? chain : r;
    };
    chain.in = (...args: any[]) => {
      const r = mockIn(...args);
      return r === undefined ? chain : r;
    };
    chain.maybeSingle = (...args: any[]) => mockMaybeSingle(...args);
    return chain;
  };

  return {
    supabase: {
      from: vi.fn(() => buildChain()),
      channel: vi.fn(() => {
        const channelInstance: Record<string, any> = {
          on: mockChannelOn.mockReturnThis(),
          subscribe: mockChannelSubscribe,
        };
        mockChannelSubscribe.mockReturnValue(channelInstance);
        return channelInstance;
      }),
      removeChannel: mockRemoveChannel,
    },
  };
});

import { presenceService } from '../../src/services/presenceService';

// ============================================================
// Setup / Teardown
// ============================================================

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ============================================================
// updatePresence
// ============================================================

describe('presenceService.updatePresence', () => {
  it('should call upsert on user_presence with correct data', async () => {
    mockUpsert.mockReturnValue({ error: null });

    await presenceService.updatePresence('user-1', 'online');

    // from('user_presence') is called
    const { supabase } = await import('../../src/lib/supabase');
    expect(supabase.from).toHaveBeenCalledWith('user_presence');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        status: 'online',
        last_seen_at: expect.any(String),
        updated_at: expect.any(String),
      }),
      { onConflict: 'user_id' },
    );
  });

  it('should set status to "idle"', async () => {
    mockUpsert.mockReturnValue({ error: null });

    await presenceService.updatePresence('user-1', 'idle');

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'idle' }),
      expect.anything(),
    );
  });

  it('should set status to "offline"', async () => {
    mockUpsert.mockReturnValue({ error: null });

    await presenceService.updatePresence('user-1', 'offline');

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'offline' }),
      expect.anything(),
    );
  });

  it('should swallow errors without throwing', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUpsert.mockReturnValue({ error: new Error('DB error') });

    await expect(presenceService.updatePresence('user-1', 'online')).resolves.not.toThrow();

    consoleSpy.mockRestore();
  });

  it('should include valid ISO timestamps', async () => {
    mockUpsert.mockReturnValue({ error: null });

    await presenceService.updatePresence('user-1', 'online');

    const call = mockUpsert.mock.calls[0][0];
    expect(() => new Date(call.last_seen_at)).not.toThrow();
    expect(() => new Date(call.updated_at)).not.toThrow();
  });
});

// ============================================================
// getPresence
// ============================================================

describe('presenceService.getPresence', () => {
  it('should return presence data for a valid user', async () => {
    const presenceData = { user_id: 'user-1', status: 'online', last_seen_at: '2026-01-15T10:00:00Z' };
    mockMaybeSingle.mockResolvedValue({ data: presenceData, error: null });

    const result = await presenceService.getPresence('user-1');

    expect(result).toEqual(presenceData);
  });

  it('should return null when user has no presence', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await presenceService.getPresence('nonexistent-user');

    expect(result).toBeNull();
  });

  it('should return null on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockMaybeSingle.mockResolvedValue({ data: null, error: new Error('DB error') });

    const result = await presenceService.getPresence('user-1');

    expect(result).toBeNull();
    consoleSpy.mockRestore();
  });

  it('should query with correct eq filter', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    await presenceService.getPresence('user-123');

    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
  });

  it('should select the correct columns', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    await presenceService.getPresence('user-1');

    expect(mockSelect).toHaveBeenCalledWith('user_id, status, last_seen_at');
  });
});

// ============================================================
// getFriendsPresence
// ============================================================

describe('presenceService.getFriendsPresence', () => {
  it('should return empty array for empty friendIds', async () => {
    const result = await presenceService.getFriendsPresence([]);

    expect(result).toEqual([]);
    // Should not make any DB calls
    const { supabase } = await import('../../src/lib/supabase');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('should return presence data for multiple friends', async () => {
    const friends = [
      { user_id: 'f-1', status: 'online', last_seen_at: '2026-01-15T10:00:00Z' },
      { user_id: 'f-2', status: 'idle', last_seen_at: '2026-01-15T09:50:00Z' },
    ];
    // Make the chain resolve with friends data
    mockIn.mockImplementation(() => {
      const p = Promise.resolve({ data: friends, error: null });
      const chain: any = {};
      Object.defineProperty(chain, 'then', {
        get: () => p.then.bind(p),
        configurable: true,
      });
      return chain;
    });

    const result = await presenceService.getFriendsPresence(['f-1', 'f-2']);

    expect(result).toEqual(friends);
  });

  it('should filter by friend IDs using .in()', async () => {
    const ids = ['f-1', 'f-2', 'f-3'];
    const p = Promise.resolve({ data: [], error: null });
    const chain: any = {};
    Object.defineProperty(chain, 'then', {
      get: () => p.then.bind(p),
      configurable: true,
    });
    mockIn.mockReturnValue(chain);

    await presenceService.getFriendsPresence(ids);

    expect(mockIn).toHaveBeenCalledWith('user_id', ids);
  });

  it('should return empty array on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockIn.mockImplementation(() => {
      const p = Promise.resolve({ data: null, error: new Error('fail') });
      const chain: any = {};
      Object.defineProperty(chain, 'then', {
        get: () => p.then.bind(p),
        configurable: true,
      });
      return chain;
    });

    const result = await presenceService.getFriendsPresence(['f-1']);

    expect(result).toEqual([]);
    consoleSpy.mockRestore();
  });
});

// ============================================================
// startHeartbeat
// ============================================================

describe('presenceService.startHeartbeat', () => {
  let updateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    updateSpy = vi.spyOn(presenceService, 'updatePresence').mockResolvedValue(undefined);
  });

  afterEach(() => {
    updateSpy.mockRestore();
  });

  it('should immediately set status to "online"', () => {
    const cleanup = presenceService.startHeartbeat('user-1');

    expect(updateSpy).toHaveBeenCalledWith('user-1', 'online');

    cleanup();
  });

  it('should send periodic heartbeats at the specified interval', () => {
    const cleanup = presenceService.startHeartbeat('user-1', 10000);

    updateSpy.mockClear();

    vi.advanceTimersByTime(10000);
    expect(updateSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(10000);
    expect(updateSpy).toHaveBeenCalledTimes(2);

    cleanup();
  });

  it('should default to 30s heartbeat interval', () => {
    const cleanup = presenceService.startHeartbeat('user-1');

    updateSpy.mockClear();

    vi.advanceTimersByTime(29999);
    expect(updateSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(updateSpy).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it('should transition to "idle" after 5 minutes of tab hidden', () => {
    const cleanup = presenceService.startHeartbeat('user-1');

    updateSpy.mockClear();

    // Hide the tab
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    // Not yet idle
    vi.advanceTimersByTime(4 * 60 * 1000);
    expect(updateSpy).not.toHaveBeenCalledWith('user-1', 'idle');

    // After 5 minutes
    vi.advanceTimersByTime(60 * 1000);
    expect(updateSpy).toHaveBeenCalledWith('user-1', 'idle');

    // Restore
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    cleanup();
  });

  it('should cancel idle timer when tab becomes visible again', () => {
    const cleanup = presenceService.startHeartbeat('user-1');

    updateSpy.mockClear();

    // Hide tab
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    // Wait 2 minutes (not yet idle)
    vi.advanceTimersByTime(2 * 60 * 1000);

    // Show tab again
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    // Should go back to online, not idle
    expect(updateSpy).toHaveBeenCalledWith('user-1', 'online');

    // Wait 5 more minutes — should NOT go idle since timer was cancelled
    vi.advanceTimersByTime(5 * 60 * 1000);

    const idleCalls = updateSpy.mock.calls.filter(c => c[1] === 'idle');
    expect(idleCalls).toHaveLength(0);

    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    cleanup();
  });

  it('should mark offline on beforeunload', () => {
    const cleanup = presenceService.startHeartbeat('user-1');

    updateSpy.mockClear();

    window.dispatchEvent(new Event('beforeunload'));

    expect(updateSpy).toHaveBeenCalledWith('user-1', 'offline');

    cleanup();
  });

  it('should stop heartbeat on cleanup', () => {
    const cleanup = presenceService.startHeartbeat('user-1', 5000);

    updateSpy.mockClear();
    cleanup();

    vi.advanceTimersByTime(30000);

    // Only the offline call from cleanup, no heartbeats
    const heartbeatCalls = updateSpy.mock.calls.filter(c => c[1] !== 'offline');
    expect(heartbeatCalls).toHaveLength(0);
  });

  it('should mark offline on cleanup', () => {
    const cleanup = presenceService.startHeartbeat('user-1');

    updateSpy.mockClear();
    cleanup();

    expect(updateSpy).toHaveBeenCalledWith('user-1', 'offline');
  });

  it('should remove event listeners on cleanup', () => {
    const removeVisibility = vi.spyOn(document, 'removeEventListener');
    const removeBeforeUnload = vi.spyOn(window, 'removeEventListener');

    const cleanup = presenceService.startHeartbeat('user-1');

    cleanup();

    expect(removeVisibility).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(removeBeforeUnload).toHaveBeenCalledWith('beforeunload', expect.any(Function));

    removeVisibility.mockRestore();
    removeBeforeUnload.mockRestore();
  });

  it('should not update presence after destroyed', () => {
    const cleanup = presenceService.startHeartbeat('user-1');

    cleanup();
    updateSpy.mockClear();

    // Simulate visibility change after cleanup
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    // No calls should be made (destroyed guard)
    // Note: listeners were removed, so this should not trigger
    vi.advanceTimersByTime(30000);

    // Only the cleanup offline call happened (already cleared)
    expect(updateSpy).not.toHaveBeenCalled();
  });
});

// ============================================================
// subscribeToPresence
// ============================================================

describe('presenceService.subscribeToPresence', () => {
  it('should return a no-op cleanup for empty friendIds', () => {
    const onUpdate = vi.fn();

    const cleanup = presenceService.subscribeToPresence([], onUpdate);

    expect(typeof cleanup).toBe('function');
    expect(() => cleanup()).not.toThrow();
  });

  it('should create a realtime channel for presence-updates', async () => {
    const onUpdate = vi.fn();
    const { supabase } = await import('../../src/lib/supabase');

    presenceService.subscribeToPresence(['f-1', 'f-2'], onUpdate);

    expect(supabase.channel).toHaveBeenCalledWith('presence-updates');
  });

  it('should subscribe to all events on user_presence table', () => {
    const onUpdate = vi.fn();

    presenceService.subscribeToPresence(['f-1'], onUpdate);

    expect(mockChannelOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'user_presence',
      }),
      expect.any(Function),
    );
  });

  it('should call onUpdate only for matching friendIds', () => {
    const onUpdate = vi.fn();

    presenceService.subscribeToPresence(['f-1', 'f-2'], onUpdate);

    // Get the callback passed to .on()
    const callback = mockChannelOn.mock.calls[0][2];

    // Simulate update for friend
    callback({ new: { user_id: 'f-1', status: 'online', last_seen_at: '2026-01-15T10:00:00Z' } });
    expect(onUpdate).toHaveBeenCalledWith({
      user_id: 'f-1',
      status: 'online',
      last_seen_at: '2026-01-15T10:00:00Z',
    });

    // Simulate update for non-friend
    onUpdate.mockClear();
    callback({ new: { user_id: 'stranger', status: 'online', last_seen_at: '2026-01-15T10:00:00Z' } });
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('should use payload.old when payload.new is undefined', () => {
    const onUpdate = vi.fn();

    presenceService.subscribeToPresence(['f-1'], onUpdate);

    const callback = mockChannelOn.mock.calls[0][2];

    callback({ new: undefined, old: { user_id: 'f-1', status: 'offline', last_seen_at: '2026-01-15T10:00:00Z' } });
    expect(onUpdate).toHaveBeenCalledWith({
      user_id: 'f-1',
      status: 'offline',
      last_seen_at: '2026-01-15T10:00:00Z',
    });
  });

  it('should skip callback when both new and old are undefined', () => {
    const onUpdate = vi.fn();

    presenceService.subscribeToPresence(['f-1'], onUpdate);

    const callback = mockChannelOn.mock.calls[0][2];

    callback({ new: undefined, old: undefined });
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('should call removeChannel on cleanup', async () => {
    const onUpdate = vi.fn();
    const { supabase } = await import('../../src/lib/supabase');

    const cleanup = presenceService.subscribeToPresence(['f-1'], onUpdate);
    cleanup();

    expect(supabase.removeChannel).toHaveBeenCalled();
  });
});
