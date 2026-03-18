/**
 * messagingUtils.spec.ts — Enterprise-grade tests for src/services/messagingUtils.ts
 *
 * Covers: safeRpc, safeRpcWithRetry, safeRealtimeSubscribe, unsubscribeAll,
 * updatePresenceBestEffort, flushPresenceUpdates, markReadDebounced,
 * runMessagingDiagnostics, formatDiagnosticsReport.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the supabase client BEFORE importing the module under test.
// vi.hoisted runs before vi.mock hoisting so the references are available.
// ---------------------------------------------------------------------------
const { mockRpc, mockFrom, mockChannel, mockRemoveChannel } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
  mockChannel: vi.fn(),
  mockRemoveChannel: vi.fn(),
}));

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    rpc: mockRpc,
    from: mockFrom,
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  },
}));

import {
  safeRpc,
  safeRpcWithRetry,
  safeRealtimeSubscribe,
  unsubscribeAll,
  updatePresenceBestEffort,
  flushPresenceUpdates,
  markReadDebounced,
  runMessagingDiagnostics,
  formatDiagnosticsReport,
  type SafeRpcResult,
  type MessagingDiagnostics,
} from '../../src/services/messagingUtils';

// ============================================================
// Setup / Teardown
// ============================================================

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(async () => {
  // Clean module-level state
  flushPresenceUpdates();
  await unsubscribeAll().catch(() => {});
  vi.useRealTimers();
});

// ============================================================
// safeRpc
// ============================================================

describe('safeRpc', () => {
  it('should return success with data on successful RPC call', async () => {
    mockRpc.mockResolvedValue({ data: { rows: [1, 2, 3] }, error: null });

    const result = await safeRpc<{ rows: number[] }>('get_data');

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ rows: [1, 2, 3] });
    expect(result.error).toBeNull();
    expect(mockRpc).toHaveBeenCalledWith('get_data', {}, expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it('should pass params to the RPC call', async () => {
    mockRpc.mockResolvedValue({ data: 'ok', error: null });

    await safeRpc('my_func', { p_id: 'abc', p_count: 5 });

    expect(mockRpc).toHaveBeenCalledWith(
      'my_func',
      { p_id: 'abc', p_count: 5 },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('should classify PGRST202 as a schema error', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: 'PGRST202', message: 'Could not find the function' },
    });

    const result = await safeRpc('missing_func');

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.error!.isSchemaError).toBe(true);
    expect(result.error!.isNetworkError).toBe(false);
    expect(result.error!.code).toBe('PGRST202');
  });

  it('should classify 42883 (function not found) as a schema error', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: '42883', message: 'function does not exist' },
    });

    const result = await safeRpc('nonexistent_func');

    expect(result.success).toBe(false);
    expect(result.error!.isSchemaError).toBe(true);
    expect(result.error!.code).toBe('42883');
  });

  it('should classify error with "does not exist" message as schema error', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: 'UNKNOWN', message: 'column last_seen_at does not exist' },
    });

    const result = await safeRpc('test_func');

    expect(result.error!.isSchemaError).toBe(true);
  });

  it('should classify error with "schema" in message as schema error', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: 'UNKNOWN', message: 'schema cache issue' },
    });

    const result = await safeRpc('test_func');

    expect(result.error!.isSchemaError).toBe(true);
  });

  it('should classify error with "Could not find" in message as schema error', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: '42P01', message: 'Could not find the table' },
    });

    const result = await safeRpc('test_func');

    expect(result.error!.isSchemaError).toBe(true);
  });

  it('should handle non-schema RPC errors', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: '22P02', message: 'invalid input syntax' },
    });

    const result = await safeRpc('test_func');

    expect(result.success).toBe(false);
    expect(result.error!.isSchemaError).toBe(false);
    expect(result.error!.isNetworkError).toBe(false);
    expect(result.error!.code).toBe('22P02');
  });

  it('should include hint when present in error', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: 'PGRST202', message: 'Not found', hint: 'Reload schema cache' },
    });

    const result = await safeRpc('test_func');

    expect(result.error!.hint).toBe('Reload schema cache');
  });

  it('should classify AbortError (timeout) as network error with TIMEOUT code', async () => {
    const abortError = new DOMException('The operation was aborted', 'AbortError');
    mockRpc.mockRejectedValue(abortError);

    const result = await safeRpc('slow_func', {}, { timeout: 100 });

    expect(result.success).toBe(false);
    expect(result.error!.isNetworkError).toBe(true);
    expect(result.error!.isSchemaError).toBe(false);
    expect(result.error!.code).toBe('TIMEOUT');
    expect(result.error!.message).toContain('timed out');
  });

  it('should classify fetch failure as network error', async () => {
    mockRpc.mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await safeRpc('test_func');

    expect(result.success).toBe(false);
    expect(result.error!.isNetworkError).toBe(true);
    expect(result.error!.code).toBe('NETWORK_ERROR');
  });

  it('should classify generic network errors as network error', async () => {
    mockRpc.mockRejectedValue(new Error('network timeout'));

    const result = await safeRpc('test_func');

    expect(result.success).toBe(false);
    expect(result.error!.isNetworkError).toBe(true);
    expect(result.error!.code).toBe('NETWORK_ERROR');
  });

  it('should handle errors without a message', async () => {
    mockRpc.mockRejectedValue(new Error());

    const result = await safeRpc('test_func');

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('should use default timeout of 10000ms', async () => {
    let capturedSignal: AbortSignal | null = null;
    mockRpc.mockImplementation((_fn: string, _params: any, opts: any) => {
      capturedSignal = opts?.signal;
      return Promise.resolve({ data: 'ok', error: null });
    });

    await safeRpc('test_func');

    expect(capturedSignal).toBeTruthy();
    expect(capturedSignal!.aborted).toBe(false);
  });

  it('should respect custom timeout option', async () => {
    // Make the RPC hang forever; the AbortController should abort after 50ms
    mockRpc.mockImplementation((_fn: string, _params: any, opts: any) => {
      return new Promise((_resolve, reject) => {
        opts.signal.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted', 'AbortError'));
        });
      });
    });

    const resultPromise = safeRpc('slow_func', {}, { timeout: 50 });
    vi.advanceTimersByTime(60);

    const result = await resultPromise;

    expect(result.success).toBe(false);
    expect(result.error!.code).toBe('TIMEOUT');
  });

  it('should return null data on RPC error', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: 'PGRST202', message: 'Not found' },
    });

    const result = await safeRpc('test_func');

    expect(result.data).toBeNull();
  });
});

// ============================================================
// safeRpcWithRetry
// ============================================================

describe('safeRpcWithRetry', () => {
  it('should return success on first attempt without retrying', async () => {
    mockRpc.mockResolvedValue({ data: { id: 1 }, error: null });

    const result = await safeRpcWithRetry('my_func');

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 1 });
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });

  it('should not retry schema errors (PGRST202)', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: 'PGRST202', message: 'Not found in schema cache' },
    });

    const result = await safeRpcWithRetry('test_func', {}, { maxRetries: 3 });

    expect(result.success).toBe(false);
    expect(result.error!.isSchemaError).toBe(true);
    expect(mockRpc).toHaveBeenCalledTimes(1); // No retries
  });

  it('should not retry schema errors (42883)', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: '42883', message: 'function does not exist' },
    });

    const result = await safeRpcWithRetry('test_func', {}, { maxRetries: 2 });

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(result.error!.isSchemaError).toBe(true);
  });

  it('should retry network errors and succeed on retry', async () => {
    const networkError = new TypeError('Failed to fetch');
    mockRpc
      .mockRejectedValueOnce(networkError)
      .mockResolvedValue({ data: { ok: true }, error: null });

    const resultPromise = safeRpcWithRetry('test_func', {}, { maxRetries: 2, retryDelayMs: 100 });

    // First call fails, wait for retry delay
    await vi.advanceTimersByTimeAsync(200);

    const result = await resultPromise;

    expect(result.success).toBe(true);
    expect(mockRpc).toHaveBeenCalledTimes(2);
  });

  it('should exhaust retries and return last error', async () => {
    const networkError = new TypeError('Failed to fetch');
    mockRpc.mockRejectedValue(networkError);

    const resultPromise = safeRpcWithRetry('test_func', {}, { maxRetries: 2, retryDelayMs: 100 });

    // Wait for all retries (0ms, 100ms, 200ms)
    await vi.advanceTimersByTimeAsync(500);

    const result = await resultPromise;

    expect(result.success).toBe(false);
    expect(result.error!.isNetworkError).toBe(true);
    expect(mockRpc).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('should use linear backoff (retryDelayMs * (attempt + 1))', async () => {
    const networkError = new TypeError('Failed to fetch');
    mockRpc
      .mockRejectedValueOnce(networkError) // attempt 0
      .mockRejectedValueOnce(networkError) // attempt 1
      .mockResolvedValue({ data: 'ok', error: null }); // attempt 2

    const resultPromise = safeRpcWithRetry('test_func', {}, { maxRetries: 2, retryDelayMs: 100 });

    // After attempt 0 fails: delay = 100 * (0+1) = 100ms
    await vi.advanceTimersByTimeAsync(110);
    expect(mockRpc).toHaveBeenCalledTimes(2);

    // After attempt 1 fails: delay = 100 * (1+1) = 200ms
    await vi.advanceTimersByTimeAsync(210);
    expect(mockRpc).toHaveBeenCalledTimes(3);

    const result = await resultPromise;
    expect(result.success).toBe(true);
  });

  it('should use defaults when no options provided', async () => {
    const networkError = new TypeError('Failed to fetch');
    mockRpc.mockRejectedValue(networkError);

    const resultPromise = safeRpcWithRetry('test_func');

    // Default: maxRetries=2, retryDelayMs=1000
    // attempt 0 → fail → wait 1000ms → attempt 1 → fail → wait 2000ms → attempt 2 → fail
    await vi.advanceTimersByTimeAsync(5000);

    const result = await resultPromise;

    expect(result.success).toBe(false);
    expect(mockRpc).toHaveBeenCalledTimes(3);
  });

  it('should not retry non-network, non-schema errors', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'unique_violation' },
    });

    const result = await safeRpcWithRetry('test_func', {}, { maxRetries: 3 });

    expect(result.success).toBe(false);
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });

  it('should pass timeout option through to safeRpc', async () => {
    mockRpc.mockResolvedValue({ data: 'ok', error: null });

    await safeRpcWithRetry('test_func', {}, { timeout: 5000 });

    expect(mockRpc).toHaveBeenCalledWith(
      'test_func',
      {},
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});

// ============================================================
// safeRealtimeSubscribe
// ============================================================

describe('safeRealtimeSubscribe', () => {
  let subscribeCb: Function | null = null;
  let mockChannelInstance: Record<string, any>;

  beforeEach(() => {
    subscribeCb = null;
    mockChannelInstance = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockImplementation((cb?: Function) => {
        // Only update subscribeCb if a new callback is provided;
        // retry calls .subscribe() without args and should reuse the old cb.
        if (cb) subscribeCb = cb;
        return mockChannelInstance;
      }),
      unsubscribe: vi.fn(),
    };
    mockChannel.mockReturnValue(mockChannelInstance);
    mockRemoveChannel.mockResolvedValue(undefined);
  });

  it('should create a channel with the correct name', () => {
    safeRealtimeSubscribe('chat:conv-001', {
      table: 'messages',
      event: 'INSERT',
      onPayload: vi.fn(),
    });

    expect(mockChannel).toHaveBeenCalledWith('chat:conv-001');
  });

  it('should configure postgres_changes listener on the channel', () => {
    const onPayload = vi.fn();

    safeRealtimeSubscribe('chat:conv-001', {
      table: 'messages',
      event: 'INSERT',
      filter: 'conversation_id=eq.conv-001',
      onPayload,
    });

    expect(mockChannelInstance.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: 'conversation_id=eq.conv-001',
      }),
      expect.any(Function),
    );
  });

  it('should call subscribe on the channel', () => {
    safeRealtimeSubscribe('chat:conv-001', {
      table: 'messages',
      event: '*',
      onPayload: vi.fn(),
    });

    expect(mockChannelInstance.subscribe).toHaveBeenCalled();
  });

  it('should invoke onConnect callback when SUBSCRIBED status received', () => {
    const onConnect = vi.fn();

    safeRealtimeSubscribe('chat:conv-001', {
      table: 'messages',
      event: '*',
      onPayload: vi.fn(),
      onConnect,
    });

    // Simulate SUBSCRIBED status
    if (subscribeCb) subscribeCb('SUBSCRIBED');

    expect(onConnect).toHaveBeenCalledTimes(1);
  });

  it('should invoke onDisconnect callback on CLOSED status', () => {
    const onDisconnect = vi.fn();

    safeRealtimeSubscribe('chat:disconnect-test', {
      table: 'messages',
      event: '*',
      onPayload: vi.fn(),
      onDisconnect,
      retryAttempts: 0,
    });

    if (subscribeCb) subscribeCb('CLOSED');

    expect(onDisconnect).toHaveBeenCalledTimes(1);
  });

  it('should invoke onDisconnect on CHANNEL_ERROR and attempt reconnect', () => {
    const onDisconnect = vi.fn();

    safeRealtimeSubscribe('chat:error-test', {
      table: 'messages',
      event: '*',
      onPayload: vi.fn(),
      onDisconnect,
      retryAttempts: 2,
      retryDelayMs: 100,
    });

    // First call to subscribe was during creation, reset to track reconnect
    mockChannelInstance.subscribe.mockClear();
    if (subscribeCb) subscribeCb('CHANNEL_ERROR');

    expect(onDisconnect).toHaveBeenCalledTimes(1);

    // Advance timer to trigger reconnection
    vi.advanceTimersByTime(200);

    expect(mockChannelInstance.subscribe).toHaveBeenCalledTimes(1);
  });

  it('should call onError after exhausting retry attempts', () => {
    const onError = vi.fn();

    safeRealtimeSubscribe('chat:max-retry-test', {
      table: 'messages',
      event: '*',
      onPayload: vi.fn(),
      onError,
      retryAttempts: 1,
      retryDelayMs: 50,
    });

    // First disconnect
    if (subscribeCb) subscribeCb('CHANNEL_ERROR');
    vi.advanceTimersByTime(60); // retry 1

    // Second disconnect — exhausted
    if (subscribeCb) subscribeCb('CHANNEL_ERROR');
    vi.advanceTimersByTime(200);

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should clean up existing subscription with same channel name', async () => {
    const firstUnsub = vi.fn().mockResolvedValue(undefined);
    // First subscription
    const sub1 = safeRealtimeSubscribe('chat:dedup', {
      table: 'messages',
      event: '*',
      onPayload: vi.fn(),
    });
    // Patch the unsubscribe for tracking
    sub1.unsubscribe = firstUnsub;

    // Second subscription with same name should clean up first
    safeRealtimeSubscribe('chat:dedup', {
      table: 'messages',
      event: '*',
      onPayload: vi.fn(),
    });

    // The existing subscription should have been unsubscribed
    expect(firstUnsub).toHaveBeenCalled();
  });

  it('should return a subscription with isConnected and unsubscribe', () => {
    const sub = safeRealtimeSubscribe('chat:test', {
      table: 'messages',
      event: '*',
      onPayload: vi.fn(),
    });

    expect(typeof sub.isConnected).toBe('function');
    expect(typeof sub.unsubscribe).toBe('function');
    expect(sub.channel).toBeDefined();
  });

  it('should report isConnected=true after SUBSCRIBED', () => {
    const sub = safeRealtimeSubscribe('chat:connected', {
      table: 'messages',
      event: '*',
      onPayload: vi.fn(),
    });

    if (subscribeCb) subscribeCb('SUBSCRIBED');

    expect(sub.isConnected()).toBe(true);
  });

  it('should report isConnected=false after unsubscribe', async () => {
    const sub = safeRealtimeSubscribe('chat:unsub', {
      table: 'messages',
      event: '*',
      onPayload: vi.fn(),
    });

    if (subscribeCb) subscribeCb('SUBSCRIBED');
    expect(sub.isConnected()).toBe(true);

    await sub.unsubscribe();
    expect(sub.isConnected()).toBe(false);
  });

  it('should use default schema "public" when not specified', () => {
    safeRealtimeSubscribe('chat:schema-test', {
      table: 'messages',
      event: 'INSERT',
      onPayload: vi.fn(),
    });

    expect(mockChannelInstance.on).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ schema: 'public' }),
      expect.any(Function),
    );
  });

  it('should swallow errors in payload handler without crashing', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const errorPayload = vi.fn().mockImplementation(() => {
      throw new Error('handler boom');
    });

    safeRealtimeSubscribe('chat:error-handler', {
      table: 'messages',
      event: '*',
      onPayload: errorPayload,
    });

    // Get the payload handler passed to .on() and call it
    const onCall = mockChannelInstance.on.mock.calls[0];
    const payloadHandler = onCall[2]; // third argument
    expect(() => payloadHandler({ new: { id: 1 } })).not.toThrow();

    consoleSpy.mockRestore();
  });
});

// ============================================================
// unsubscribeAll
// ============================================================

describe('unsubscribeAll', () => {
  beforeEach(() => {
    const mockChannelInstance = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockImplementation(function (this: any, cb?: Function) {
        if (cb) cb('SUBSCRIBED');
        return this;
      }),
    };
    mockChannel.mockReturnValue(mockChannelInstance);
    mockRemoveChannel.mockResolvedValue(undefined);
  });

  it('should unsubscribe all active subscriptions', async () => {
    safeRealtimeSubscribe('ch-1', { table: 't', event: '*', onPayload: vi.fn() });
    safeRealtimeSubscribe('ch-2', { table: 't', event: '*', onPayload: vi.fn() });

    await unsubscribeAll();

    expect(mockRemoveChannel).toHaveBeenCalledTimes(2);
  });

  it('should be safe to call when no subscriptions exist', async () => {
    await expect(unsubscribeAll()).resolves.not.toThrow();
  });
});

// ============================================================
// updatePresenceBestEffort
// ============================================================

describe('updatePresenceBestEffort', () => {
  let queryMock: Record<string, any>;

  beforeEach(() => {
    queryMock = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    // Make the last .eq() resolve (thenable)
    const resolvedPromise = Promise.resolve({ data: null, error: null });
    Object.defineProperty(queryMock, 'then', {
      value: resolvedPromise.then.bind(resolvedPromise),
      writable: true,
      configurable: true,
      enumerable: false,
    });
    mockFrom.mockReturnValue(queryMock);
  });

  it('should debounce presence updates (5s)', () => {
    updatePresenceBestEffort('conv-1', 'user-1');

    expect(mockFrom).not.toHaveBeenCalled();

    vi.advanceTimersByTime(5000);

    expect(mockFrom).toHaveBeenCalledWith('conversation_members');
    expect(queryMock.update).toHaveBeenCalledWith(
      expect.objectContaining({ last_seen_at: expect.any(String) }),
    );
  });

  it('should call eq with conversation_id and user_id', () => {
    updatePresenceBestEffort('conv-123', 'user-456');

    vi.advanceTimersByTime(5000);

    expect(queryMock.eq).toHaveBeenCalledWith('conversation_id', 'conv-123');
    expect(queryMock.eq).toHaveBeenCalledWith('user_id', 'user-456');
  });

  it('should coalesce rapid calls for same key', () => {
    updatePresenceBestEffort('conv-1', 'user-1');
    vi.advanceTimersByTime(2000);
    updatePresenceBestEffort('conv-1', 'user-1');
    vi.advanceTimersByTime(2000);
    updatePresenceBestEffort('conv-1', 'user-1');
    vi.advanceTimersByTime(5000);

    // Only the last call should have fired
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it('should handle different keys independently', () => {
    updatePresenceBestEffort('conv-1', 'user-1');
    updatePresenceBestEffort('conv-2', 'user-1');

    vi.advanceTimersByTime(5000);

    expect(mockFrom).toHaveBeenCalledTimes(2);
  });

  it('should silently swallow errors', () => {
    queryMock.eq = vi.fn().mockReturnThis();
    const rejectedPromise = Promise.reject(new Error('DB down'));
    Object.defineProperty(queryMock, 'then', {
      value: rejectedPromise.then.bind(rejectedPromise),
      writable: true,
      configurable: true,
      enumerable: false,
    });
    rejectedPromise.catch(() => {}); // prevent unhandled

    // Should not throw
    updatePresenceBestEffort('conv-1', 'user-1');
    vi.advanceTimersByTime(5000);
  });
});

// ============================================================
// flushPresenceUpdates
// ============================================================

describe('flushPresenceUpdates', () => {
  it('should clear all pending presence updates', () => {
    updatePresenceBestEffort('conv-1', 'user-1');
    updatePresenceBestEffort('conv-2', 'user-2');

    flushPresenceUpdates();

    // Now advance timers — no updates should fire
    vi.advanceTimersByTime(10000);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('should be safe to call when no updates pending', () => {
    expect(() => flushPresenceUpdates()).not.toThrow();
  });
});

// ============================================================
// markReadDebounced
// ============================================================

describe('markReadDebounced', () => {
  it('should debounce read receipt updates (2s)', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null, success: true });

    markReadDebounced('conv-1', 'msg-1', '2026-01-15T10:00:00Z');

    expect(mockRpc).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2000);

    expect(mockRpc).toHaveBeenCalledWith(
      'mark_conversation_read',
      expect.objectContaining({
        p_conversation_id: 'conv-1',
        p_last_read_message_id: 'msg-1',
        p_last_read_at: '2026-01-15T10:00:00Z',
      }),
      expect.anything(),
    );
  });

  it('should coalesce rapid reads for same conversation', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    markReadDebounced('conv-1', 'msg-1', '2026-01-15T10:00:00Z');
    markReadDebounced('conv-1', 'msg-2', '2026-01-15T10:01:00Z');
    markReadDebounced('conv-1', 'msg-3', '2026-01-15T10:02:00Z');

    await vi.advanceTimersByTimeAsync(2500);

    // Only the last one should have been sent
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith(
      'mark_conversation_read',
      expect.objectContaining({
        p_last_read_message_id: 'msg-3',
        p_last_read_at: '2026-01-15T10:02:00Z',
      }),
      expect.anything(),
    );
  });

  it('should handle different conversations independently', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    markReadDebounced('conv-1', 'msg-1', '2026-01-15T10:00:00Z');
    markReadDebounced('conv-2', 'msg-2', '2026-01-15T10:01:00Z');

    await vi.advanceTimersByTimeAsync(2500);

    expect(mockRpc).toHaveBeenCalledTimes(2);
  });

  it('should call onComplete with true on success', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const onComplete = vi.fn();

    markReadDebounced('conv-1', 'msg-1', '2026-01-15T10:00:00Z', onComplete);

    await vi.advanceTimersByTimeAsync(2500);

    expect(onComplete).toHaveBeenCalledWith(true);
  });

  it('should call onComplete with false on RPC failure', async () => {
    mockRpc.mockRejectedValue(new Error('network fail'));
    const onComplete = vi.fn();

    markReadDebounced('conv-1', 'msg-1', '2026-01-15T10:00:00Z', onComplete);

    await vi.advanceTimersByTimeAsync(2500);

    expect(onComplete).toHaveBeenCalledWith(false);
  });
});

// ============================================================
// runMessagingDiagnostics
// ============================================================

describe('runMessagingDiagnostics', () => {
  it('should return healthy diagnostics when all checks pass', async () => {
    // Schema check succeeds
    mockRpc
      .mockResolvedValueOnce({
        data: {
          conversation_members_last_seen_at: true,
          conversation_settings_table: true,
          message_reads_table: true,
          conversations_last_message_at: true,
          schema_healthy: true,
        },
        error: null,
      })
      // RPC availability check succeeds
      .mockResolvedValueOnce({ data: [], error: null });

    const diag = await runMessagingDiagnostics();

    expect(diag.schemaHealthy).toBe(true);
    expect(diag.conversationMembersLastSeenAt).toBe(true);
    expect(diag.conversationSettingsTable).toBe(true);
    expect(diag.messageReadsTable).toBe(true);
    expect(diag.conversationsLastMessageAt).toBe(true);
    expect(diag.rpcAvailable).toBe(true);
    expect(diag.lastError).toBeNull();
    expect(diag.checkedAt).toBeTruthy();
  });

  it('should report schema unhealthy when schema check fails', async () => {
    mockRpc
      .mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST202', message: 'Function not found' },
      })
      .mockResolvedValueOnce({ data: [], error: null });

    const diag = await runMessagingDiagnostics();

    expect(diag.schemaHealthy).toBe(false);
    expect(diag.lastError).toContain('Schema check failed');
  });

  it('should detect RPC unavailability from schema error', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: null, error: null }) // schema check
      .mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST202', message: 'Not found in schema cache' },
      }); // RPC check

    const diag = await runMessagingDiagnostics();

    expect(diag.rpcAvailable).toBe(false);
    expect(diag.lastError).toContain('RPC unavailable');
  });

  it('should handle exceptions in diagnostics gracefully', async () => {
    mockRpc.mockRejectedValue(new Error('Connection refused'));

    const diag = await runMessagingDiagnostics();

    expect(diag.schemaHealthy).toBe(false);
    expect(diag.lastError).toBeTruthy();
  });

  it('should include checkedAt timestamp', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    const before = new Date().toISOString();
    const diag = await runMessagingDiagnostics();
    const after = new Date().toISOString();

    expect(diag.checkedAt).toBeTruthy();
    expect(diag.checkedAt >= before).toBe(true);
    expect(diag.checkedAt <= after).toBe(true);
  });
});

// ============================================================
// formatDiagnosticsReport
// ============================================================

describe('formatDiagnosticsReport', () => {
  it('should format healthy report with all checks passing', () => {
    const diag: MessagingDiagnostics = {
      schemaHealthy: true,
      conversationMembersLastSeenAt: true,
      conversationSettingsTable: true,
      messageReadsTable: true,
      conversationsLastMessageAt: true,
      rpcAvailable: true,
      realtimeConnected: true,
      lastError: null,
      checkedAt: '2026-01-15T12:00:00Z',
    };

    const report = formatDiagnosticsReport(diag);

    expect(report).toContain('✅ Healthy');
    expect(report).toContain('RPC: ✅ Available');
    expect(report).toContain('✅ Connected');
    expect(report).not.toContain('Action Required');
    expect(report).not.toContain('Last Error');
  });

  it('should format unhealthy report with action required', () => {
    const diag: MessagingDiagnostics = {
      schemaHealthy: false,
      conversationMembersLastSeenAt: true,
      conversationSettingsTable: false,
      messageReadsTable: false,
      conversationsLastMessageAt: true,
      rpcAvailable: false,
      realtimeConnected: false,
      lastError: 'PGRST202 error',
      checkedAt: '2026-01-15T12:00:00Z',
    };

    const report = formatDiagnosticsReport(diag);

    expect(report).toContain('❌ Incomplete');
    expect(report).toContain('RPC: ❌ Unavailable');
    expect(report).toContain('⚠️ Disconnected');
    expect(report).toContain('Action Required');
    expect(report).toContain('migration');
    expect(report).toContain('Last Error');
    expect(report).toContain('PGRST202');
  });

  it('should include each schema column status', () => {
    const diag: MessagingDiagnostics = {
      schemaHealthy: false,
      conversationMembersLastSeenAt: true,
      conversationSettingsTable: false,
      messageReadsTable: true,
      conversationsLastMessageAt: false,
      rpcAvailable: true,
      realtimeConnected: true,
      lastError: null,
      checkedAt: '2026-01-15T12:00:00Z',
    };

    const report = formatDiagnosticsReport(diag);

    expect(report).toContain('conversation_members.last_seen_at: ✅');
    expect(report).toContain('conversation_settings table: ❌');
    expect(report).toContain('message_reads table: ✅');
    expect(report).toContain('conversations.last_message_at: ❌');
  });

  it('should include the checkedAt timestamp', () => {
    const diag: MessagingDiagnostics = {
      schemaHealthy: true,
      conversationMembersLastSeenAt: true,
      conversationSettingsTable: true,
      messageReadsTable: true,
      conversationsLastMessageAt: true,
      rpcAvailable: true,
      realtimeConnected: true,
      lastError: null,
      checkedAt: '2026-06-01T08:30:00Z',
    };

    const report = formatDiagnosticsReport(diag);

    expect(report).toContain('2026-06-01T08:30:00Z');
  });

  it('should omit Action Required section for healthy schema', () => {
    const diag: MessagingDiagnostics = {
      schemaHealthy: true,
      conversationMembersLastSeenAt: true,
      conversationSettingsTable: true,
      messageReadsTable: true,
      conversationsLastMessageAt: true,
      rpcAvailable: true,
      realtimeConnected: true,
      lastError: null,
      checkedAt: '2026-01-15T12:00:00Z',
    };

    const report = formatDiagnosticsReport(diag);

    expect(report).not.toContain('Action Required');
    expect(report).not.toContain('migration');
  });
});
