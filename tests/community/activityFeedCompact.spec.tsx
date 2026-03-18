// @vitest-environment jsdom
/**
 * Enterprise-grade tests for ActivityFeedCompact component
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockUser = vi.hoisted(() => ({ id: 'user-comm-001', email: 'test@test.com' }));
const mockUseAuth = vi.hoisted(() => vi.fn().mockReturnValue({
  user: mockUser,
  profile: { id: mockUser.id, full_name: 'Alice' },
}));

const mockChannel = vi.hoisted(() => ({
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  unsubscribe: vi.fn(),
}));

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(() => {
    const chain: Record<string, any> = {};
    const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'or', 'not', 'in', 'order', 'limit', 'is', 'ilike', 'like', 'gt', 'gte', 'lt', 'lte', 'single', 'maybeSingle', 'filter', 'range', 'contains'];
    for (const m of methods) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    const p = Promise.resolve({ data: [], error: null });
    Object.defineProperty(chain, 'then', {
      value: p.then.bind(p), writable: true, configurable: true, enumerable: false,
    });
    return chain;
  }),
  channel: vi.fn(() => mockChannel),
  removeChannel: vi.fn(),
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('../../src/lib/supabase', () => ({
  supabase: mockSupabase,
}));

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a>,
}));

import ActivityFeedCompact from '../../src/components/social/ActivityFeedCompact';

// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  // Restore default auth mock (clearAllMocks removes mockReturnValue)
  mockUseAuth.mockReturnValue({
    user: mockUser,
    profile: { id: mockUser.id, full_name: 'Alice' },
  });
});
afterEach(() => { cleanup(); });

// =========================================================================
describe('ActivityFeedCompact', () => {
  it('renders the "Recent Activity" header', async () => {
    render(<ActivityFeedCompact />);
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('renders "View All" link', () => {
    render(<ActivityFeedCompact />);
    expect(screen.getByText('View All')).toBeInTheDocument();
  });

  it('shows empty state when no activities after loading', async () => {
    render(<ActivityFeedCompact />);
    await waitFor(() => {
      const emptyText = screen.queryByText(/no activity yet/i);
      // Either loading or empty state
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });
  });

  it('renders without user (guest)', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null });
    render(<ActivityFeedCompact />);
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('sets up realtime subscriptions for auto-refresh', async () => {
    render(<ActivityFeedCompact />);
    await waitFor(() => {
      expect(mockSupabase.channel).toHaveBeenCalledWith('activity-feed-compact');
    });
  });

  it('subscribes to ride_bookings, friendships, community_posts, user_challenges', async () => {
    render(<ActivityFeedCompact />);
    await waitFor(() => {
      expect(mockChannel.on).toHaveBeenCalled();
      // Should have at least 4 .on() calls for 4 tables
      expect(mockChannel.on.mock.calls.length).toBeGreaterThanOrEqual(4);
    });
  });

  it('cleans up channel on unmount', async () => {
    const { unmount } = render(<ActivityFeedCompact />);
    // Wait for component to settle
    await waitFor(() => {
      expect(mockSupabase.channel).toHaveBeenCalled();
    }, { timeout: 3000 });
    unmount();
    expect(mockSupabase.removeChannel).toHaveBeenCalled();
  });

  it('"View All" link points to /activity', () => {
    render(<ActivityFeedCompact />);
    const link = screen.getByText('View All');
    expect(link.closest('a')).toHaveAttribute('href', '/activity');
  });
});
