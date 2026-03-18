// @vitest-environment jsdom
/**
 * Enterprise-grade tests for FriendsManager component
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const mockProfile = vi.hoisted(() => ({
  id: 'user-comm-001',
  full_name: 'Alice',
  email: 'alice@test.com',
}));

const mockUseAuth = vi.hoisted(() => vi.fn());
const mockNavigate = vi.hoisted(() => vi.fn());
const mockToast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

const mockChannel = vi.hoisted(() => ({
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  unsubscribe: vi.fn(),
}));

const mockSupabase = vi.hoisted(() => {
  const makeFreshChain = (result: any) => {
    const chain: Record<string, any> = {};
    const methods = [
      'select', 'insert', 'update', 'delete', 'eq', 'neq', 'or', 'not',
      'in', 'order', 'limit', 'is', 'ilike', 'like', 'gt', 'gte', 'lt',
      'lte', 'single', 'maybeSingle', 'filter', 'range', 'contains',
    ];
    for (const m of methods) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    const p = Promise.resolve(result);
    Object.defineProperty(chain, 'then', {
      value: p.then.bind(p),
      writable: true,
      configurable: true,
      enumerable: false,
    });
    return chain;
  };

  return {
    from: vi.fn(() => makeFreshChain({ data: [], error: null })),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
    makeFreshChain,
  };
});

// ---------------------------------------------------------------------------
vi.mock('../../src/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('../../src/lib/supabase', () => ({ supabase: mockSupabase }));
vi.mock('../../src/lib/toast', () => ({ toast: mockToast }));
vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a>,
  useNavigate: () => mockNavigate,
}));
vi.mock('../../src/components/shared/ClickableUserProfile', () => ({
  default: ({ user, children, additionalInfo }: any) => (
    <div data-testid="clickable-profile">
      {user?.full_name && <span>{user.full_name}</span>}
      {additionalInfo}
      {children}
    </div>
  ),
}));

import FriendsManager from '../../src/components/social/FriendsManager';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Default empty data: everything resolves to empty arrays */
function setupEmptyData() {
  mockSupabase.from.mockImplementation(() =>
    mockSupabase.makeFreshChain({ data: [], error: null })
  );
  mockSupabase.rpc.mockResolvedValue({ data: [], error: null });
}

/**
 * Set up supabase.from to return different data per table.
 * friend_requests is called twice (received + sent) but since .eq() is a no-op,
 * both calls return the same array — the component filters by from_user_id / to_user_id.
 */
function setupData(opts: {
  friendships?: any[];
  profiles?: any[];
  friendRequests?: any[];
  blocks?: any[];
}) {
  const { friendships = [], profiles = [], friendRequests = [], blocks = [] } = opts;
  mockSupabase.from.mockImplementation((table: string) => {
    switch (table) {
      case 'friendships':
        return mockSupabase.makeFreshChain({ data: friendships, error: null });
      case 'profiles':
        return mockSupabase.makeFreshChain({ data: profiles, error: null });
      case 'friend_requests':
        return mockSupabase.makeFreshChain({ data: friendRequests, error: null });
      case 'blocks':
        return mockSupabase.makeFreshChain({ data: blocks, error: null });
      default:
        return mockSupabase.makeFreshChain({ data: [], error: null });
    }
  });
}

/** Wait for loading to finish (component settles) */
async function waitForLoaded() {
  await waitFor(() => {
    // Once loading is done the heading appears
    expect(screen.getByText('Friends & Connections')).toBeInTheDocument();
  });
}

// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: { id: mockProfile.id, email: mockProfile.email },
    profile: mockProfile,
  });
  mockChannel.on.mockReturnThis();
  mockChannel.subscribe.mockReturnThis();
  mockSupabase.channel.mockReturnValue(mockChannel);
  setupEmptyData();
});
afterEach(() => { cleanup(); });

// =========================================================================
describe('FriendsManager', () => {

  // --- Rendering ---
  describe('Rendering', () => {
    it('renders the "Friends & Connections" heading', async () => {
      render(<FriendsManager />);
      await waitForLoaded();
    });

    it('shows loading skeleton before data loads', () => {
      // Never-resolving from() keeps loading=true
      mockSupabase.from.mockImplementation(() => {
        const chain: Record<string, any> = {};
        const methods = ['select','insert','update','delete','eq','neq','or','not','in','order','limit','is','ilike','single','maybeSingle','filter','range','contains'];
        for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain);
        const p = new Promise(() => {});
        Object.defineProperty(chain, 'then', { value: p.then.bind(p), writable: true, configurable: true, enumerable: false });
        return chain;
      });
      const { container } = render(<FriendsManager />);
      expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    });

    it('shows empty state when no friends exist', async () => {
      render(<FriendsManager />);
      await waitFor(() => {
        expect(screen.getByText('Your carpool circle awaits!')).toBeInTheDocument();
      });
    });

    it('renders "Find Friends" button in empty state', async () => {
      render(<FriendsManager />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /find friends/i })).toBeInTheDocument();
      });
    });

    it('renders stat cards with Friends/Pending/Sent labels', async () => {
      render(<FriendsManager />);
      await waitForLoaded();
      // 'Friends' appears in both stat card and tab — use getAllByText
      expect(screen.getAllByText('Friends').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Sent')).toBeInTheDocument();
    });
  });

  // --- Tab navigation ---
  describe('Tab navigation', () => {
    it('clicking Requests tab shows requests content', async () => {
      render(<FriendsManager />);
      await waitForLoaded();
      fireEvent.click(screen.getByText(/requests/i));
      await waitFor(() => {
        expect(screen.getByText('No pending requests')).toBeInTheDocument();
      });
    });

    it('clicking Add Friends tab shows search input', async () => {
      render(<FriendsManager />);
      await waitForLoaded();
      // Find the tab with "Add" text
      const addTab = screen.getAllByText(/add/i).find(el => el.closest('button'));
      if (addTab) fireEvent.click(addTab);
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search by name...')).toBeInTheDocument();
      });
    });

    it('clicking Blocked tab shows blocked content', async () => {
      render(<FriendsManager />);
      await waitForLoaded();
      fireEvent.click(screen.getByText(/blocked/i));
      await waitFor(() => {
        const content = screen.queryByText('No blocked users') || screen.queryByText(/blocked/i);
        expect(content).toBeInTheDocument();
      });
    });
  });

  // --- Realtime ---
  describe('Realtime', () => {
    it('sets up realtime channel "friends" with 4 subscriptions', async () => {
      render(<FriendsManager />);
      await waitFor(() => {
        expect(mockSupabase.channel).toHaveBeenCalledWith('friends');
      });
      expect(mockChannel.on).toHaveBeenCalledTimes(4);
      expect(mockChannel.subscribe).toHaveBeenCalledTimes(1);
    });

    it('cleans up channel on unmount', async () => {
      const { unmount } = render(<FriendsManager />);
      await waitFor(() => {
        expect(mockSupabase.channel).toHaveBeenCalled();
      });
      unmount();
      expect(mockSupabase.removeChannel).toHaveBeenCalled();
    });
  });

  // --- Data loading ---
  describe('Data loading', () => {
    it('queries friendships table', async () => {
      render(<FriendsManager />);
      await waitForLoaded();
      expect(mockSupabase.from).toHaveBeenCalledWith('friendships');
    });

    it('queries friend_requests table', async () => {
      render(<FriendsManager />);
      await waitForLoaded();
      expect(mockSupabase.from).toHaveBeenCalledWith('friend_requests');
    });

    it('calls get_blocked_users RPC', async () => {
      render(<FriendsManager />);
      await waitForLoaded();
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_blocked_users');
    });

    it('falls back to blocks table when get_blocked_users RPC fails', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'RPC fail' } });
      render(<FriendsManager />);
      await waitForLoaded();
      expect(mockSupabase.from).toHaveBeenCalledWith('blocks');
    });

    it('renders friend cards with names', async () => {
      setupData({
        friendships: [
          { id: 'fs-1', user_a: mockProfile.id, user_b: 'f1', created_at: '2026-01-01' },
        ],
        profiles: [
          { id: 'f1', full_name: 'Bob Builder', avatar_url: null, profile_photo_url: null, bio: '', average_rating: 4.5, trust_score: 80, profile_verified: true, total_rides_offered: 5, total_rides_taken: 3 },
        ],
      });
      render(<FriendsManager />);
      await waitFor(() => {
        // Component renders 2 ClickableUserProfile per friend (avatar + name)
        const matches = screen.getAllByText('Bob Builder');
        expect(matches.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('handles friendships query error gracefully', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'friendships') {
          return mockSupabase.makeFreshChain({ data: null, error: { message: 'DB down' } });
        }
        return mockSupabase.makeFreshChain({ data: [], error: null });
      });
      render(<FriendsManager />);
      await waitForLoaded();
      // Should not crash
    });
  });

  // --- Guest mode ---
  describe('Guest mode', () => {
    it('handles null profile without crashing', () => {
      mockUseAuth.mockReturnValue({ user: null, profile: null });
      const { container } = render(<FriendsManager />);
      // Doesn't crash; shows loading or some state
      expect(container).toBeInTheDocument();
    });
  });

  // --- Blocked users ---
  describe('Blocked users', () => {
    it('shows blocked users when RPC returns data', async () => {
      mockSupabase.rpc.mockImplementation((fn: string) => {
        if (fn === 'get_blocked_users') {
          return Promise.resolve({
            data: [
              { block_id: 'b1', blocked_id: 'bu1', full_name: 'Jack Jerk', avatar_url: null, blocked_at: '2026-01-15' },
            ],
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      render(<FriendsManager />);
      await waitForLoaded();
      fireEvent.click(screen.getByText(/blocked/i));
      await waitFor(() => {
        expect(screen.getByText('Jack Jerk')).toBeInTheDocument();
      });
    });

    it('shows "No blocked users" when list is empty', async () => {
      render(<FriendsManager />);
      await waitForLoaded();
      fireEvent.click(screen.getByText(/blocked/i));
      await waitFor(() => {
        expect(screen.getByText('No blocked users')).toBeInTheDocument();
      });
    });
  });

  // --- Search ---
  describe('Search', () => {
    it('search input appears on Add tab', async () => {
      render(<FriendsManager />);
      await waitForLoaded();
      const addTab = screen.getAllByText(/add/i).find(el => el.closest('button'));
      if (addTab) fireEvent.click(addTab);
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search by name...')).toBeInTheDocument();
      });
    });

    it('shows "People you may know" on Add tab with empty search', async () => {
      render(<FriendsManager />);
      await waitForLoaded();
      const addTab = screen.getAllByText(/add/i).find(el => el.closest('button'));
      if (addTab) fireEvent.click(addTab);
      await waitFor(() => {
        expect(screen.getByText('People you may know')).toBeInTheDocument();
      });
    });
  });
});
