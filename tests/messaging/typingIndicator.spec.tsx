/**
 * typingIndicator.spec.ts — Tests for TypingIndicator component and useTypingIndicator hook
 */

// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { TypingIndicator, useTypingIndicator } from '../../src/components/messaging/TypingIndicator';

afterEach(() => cleanup());

// ============================================================
// TypingIndicator Component
// ============================================================

describe('TypingIndicator component', () => {
  it('should render three bouncing dots', () => {
    const { container } = render(<TypingIndicator />);
    const dots = container.querySelectorAll('.animate-bounce');
    expect(dots).toHaveLength(3);
  });

  it('should show user name with "is typing..." text', () => {
    render(<TypingIndicator userName="Alice" />);
    expect(screen.getByText('Alice is typing...')).toBeInTheDocument();
  });

  it('should not show name text when userName not provided', () => {
    const { container } = render(<TypingIndicator />);
    expect(container.textContent).not.toContain('is typing');
  });

  it('should apply custom dot color', () => {
    const { container } = render(<TypingIndicator dotColor="bg-blue-500" />);
    const dots = container.querySelectorAll('.bg-blue-500');
    expect(dots).toHaveLength(3);
  });

  it('should use default gray dot color', () => {
    const { container } = render(<TypingIndicator />);
    const dots = container.querySelectorAll('.bg-gray-400');
    expect(dots).toHaveLength(3);
  });

  it('should apply staggered animation delays to dots', () => {
    const { container } = render(<TypingIndicator />);
    const dots = container.querySelectorAll('.animate-bounce');
    const delays = Array.from(dots).map(d => (d as HTMLElement).style.animationDelay);
    expect(delays).toEqual(['0ms', '150ms', '300ms']);
  });
});

// ============================================================
// useTypingIndicator Hook
// ============================================================

describe('useTypingIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should return empty typingUsers initially', () => {
    const { result } = renderHook(() =>
      useTypingIndicator({ channelId: 'ch-1', userId: 'user-1' }),
    );

    expect(result.current.typingUsers).toEqual([]);
  });

  it('should provide sendTyping, handleTypingEvent, clearTyping functions', () => {
    const { result } = renderHook(() =>
      useTypingIndicator({ channelId: 'ch-1', userId: 'user-1' }),
    );

    expect(typeof result.current.sendTyping).toBe('function');
    expect(typeof result.current.handleTypingEvent).toBe('function');
    expect(typeof result.current.clearTyping).toBe('function');
  });

  it('should add typing user on handleTypingEvent', () => {
    const { result } = renderHook(() =>
      useTypingIndicator({ channelId: 'ch-1', userId: 'user-1' }),
    );

    act(() => {
      result.current.handleTypingEvent({ userId: 'user-2', userName: 'Bob' });
    });

    expect(result.current.typingUsers).toHaveLength(1);
    expect(result.current.typingUsers[0].userId).toBe('user-2');
    expect(result.current.typingUsers[0].userName).toBe('Bob');
  });

  it('should ignore own typing events', () => {
    const { result } = renderHook(() =>
      useTypingIndicator({ channelId: 'ch-1', userId: 'user-1' }),
    );

    act(() => {
      result.current.handleTypingEvent({ userId: 'user-1' });
    });

    expect(result.current.typingUsers).toHaveLength(0);
  });

  it('should filter out own userId from typingUsers return', () => {
    const { result } = renderHook(() =>
      useTypingIndicator({ channelId: 'ch-1', userId: 'user-1' }),
    );

    // Even if somehow added, own user should be filtered
    act(() => {
      result.current.handleTypingEvent({ userId: 'user-2' });
    });

    const filtered = result.current.typingUsers;
    expect(filtered.every(u => u.userId !== 'user-1')).toBe(true);
  });

  it('should update existing typing user timestamp', () => {
    const { result } = renderHook(() =>
      useTypingIndicator({ channelId: 'ch-1', userId: 'user-1' }),
    );

    act(() => {
      result.current.handleTypingEvent({ userId: 'user-2', userName: 'Bob' });
    });

    const firstTimestamp = result.current.typingUsers[0].timestamp;

    // Advance time slightly
    vi.advanceTimersByTime(100);

    act(() => {
      result.current.handleTypingEvent({ userId: 'user-2', userName: 'Bob' });
    });

    // Should still have one user but with updated timestamp
    expect(result.current.typingUsers).toHaveLength(1);
    expect(result.current.typingUsers[0].timestamp).toBeGreaterThan(firstTimestamp);
  });

  it('should clear typing for specific user', () => {
    const { result } = renderHook(() =>
      useTypingIndicator({ channelId: 'ch-1', userId: 'user-1' }),
    );

    act(() => {
      result.current.handleTypingEvent({ userId: 'user-2' });
      result.current.handleTypingEvent({ userId: 'user-3' });
    });

    expect(result.current.typingUsers).toHaveLength(2);

    act(() => {
      result.current.clearTyping('user-2');
    });

    expect(result.current.typingUsers).toHaveLength(1);
    expect(result.current.typingUsers[0].userId).toBe('user-3');
  });

  it('should remove stale typing indicators after debounceMs + 1000', () => {
    const { result } = renderHook(() =>
      useTypingIndicator({ channelId: 'ch-1', userId: 'user-1', debounceMs: 3000 }),
    );

    act(() => {
      result.current.handleTypingEvent({ userId: 'user-2' });
    });

    expect(result.current.typingUsers).toHaveLength(1);

    // Advance past debounceMs + 1000 (4000ms) and trigger cleanup interval (1s)
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.typingUsers).toHaveLength(0);
  });

  it('should debounce sendTyping calls', async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    const { result } = renderHook(() =>
      useTypingIndicator({ channelId: 'ch-1', userId: 'user-1', debounceMs: 3000 }),
    );

    await act(async () => {
      await result.current.sendTyping();
    });

    // First call should go through
    expect(consoleSpy).toHaveBeenCalledTimes(1);

    // Second call within debounce should be suppressed
    consoleSpy.mockClear();
    await act(async () => {
      await result.current.sendTyping();
    });

    expect(consoleSpy).not.toHaveBeenCalled();

    // After debounce period, should allow again
    act(() => {
      vi.advanceTimersByTime(3100);
    });

    consoleSpy.mockClear();
    await act(async () => {
      await result.current.sendTyping();
    });

    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple simultaneous typing users', () => {
    const { result } = renderHook(() =>
      useTypingIndicator({ channelId: 'ch-1', userId: 'user-1' }),
    );

    act(() => {
      result.current.handleTypingEvent({ userId: 'user-2', userName: 'Bob' });
      result.current.handleTypingEvent({ userId: 'user-3', userName: 'Carol' });
      result.current.handleTypingEvent({ userId: 'user-4', userName: 'Dave' });
    });

    expect(result.current.typingUsers).toHaveLength(3);
  });

  it('should clean up interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    const { unmount } = renderHook(() =>
      useTypingIndicator({ channelId: 'ch-1', userId: 'user-1' }),
    );

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
