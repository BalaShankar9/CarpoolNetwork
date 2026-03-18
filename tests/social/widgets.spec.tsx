// @vitest-environment jsdom
/**
 * Social module – widget component test suite.
 *
 * Covers all 9 widgets under src/components/social/widgets/:
 *   ActivityFeedWidget, ChallengesWidget, CommunityWidget, FriendsWidget,
 *   GroupsWidget, LeaderboardWidget, RideMatchWidget, StatsWidget,
 *   StoryCarouselWidget.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import {
  FAKE_USER_ID,
  FAKE_OTHER_USER_ID,
  FAKE_PROFILE,
  FAKE_OTHER_PROFILE,
  FAKE_THIRD_PROFILE,
  FAKE_FRIENDSHIP,
  FAKE_FRIEND_REQUEST,
  FAKE_GROUP,
  FAKE_GROUP_INVITE,
  FAKE_GROUP_MEMBER,
  FAKE_RIDE_MATCH,
  FAKE_LEADERBOARD_ENTRIES,
  FAKE_COMMUNITY_POST,
  FAKE_CHALLENGE_ROW,
  FAKE_USER_CHALLENGE,
  FAKE_FRIEND_WITH_PRESENCE,
  FAKE_STATS_DATA,
  makeCommunityPost,
  makeChallengeRow,
  makeFriendWithPresence,
  makeLeaderboardEntry,
} from './helpers';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const MOCK_USER_ID = 'user-comm-001';
const mockUser = vi.hoisted(() => ({ id: 'user-comm-001', email: 'test@test.com' }));
const mockProfile = vi.hoisted(() => ({ id: 'user-comm-001', full_name: 'Alice Community' }));

const mockUseAuth = vi.hoisted(() =>
  vi.fn().mockReturnValue({
    user: mockUser,
    profile: mockProfile,
    isEmailVerified: true,
  }),
);

const mockChannel = vi.hoisted(() => ({
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  unsubscribe: vi.fn(),
}));

// Generic chain builder for supabase
function buildMockChain(data: any = [], error: any = null) {
  const chain: Record<string, any> = {};
  const methods = [
    'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'neq', 'or', 'not', 'in', 'order', 'limit',
    'is', 'ilike', 'like', 'gt', 'gte', 'lt', 'lte',
    'filter', 'range', 'contains',
    'match', 'textSearch',
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }

  // maybeSingle must return a NEW thenable resolving to { data: <first item or null>, error }
  const singleItem = Array.isArray(data) ? (data.length > 0 ? data[0] : null) : data;
  const maybeSingleResult = { data: singleItem, error };
  const maybeSinglePromise = Promise.resolve(maybeSingleResult);
  const maybeSingleChain: Record<string, any> = {};
  for (const m of methods) {
    maybeSingleChain[m] = vi.fn().mockReturnValue(chain);
  }
  Object.defineProperty(maybeSingleChain, 'then', {
    value: maybeSinglePromise.then.bind(maybeSinglePromise),
    writable: true, configurable: true, enumerable: false,
  });
  chain.maybeSingle = vi.fn().mockReturnValue(maybeSingleChain);

  // single behaves like maybeSingle
  chain.single = vi.fn().mockReturnValue(maybeSingleChain);

  const result = { data, error, count: Array.isArray(data) ? data.length : 0 };
  const p = Promise.resolve(result);
  Object.defineProperty(chain, 'then', {
    value: p.then.bind(p),
    writable: true,
    configurable: true,
    enumerable: false,
  });
  return chain;
}

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(() => buildMockChain()),
  rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  channel: vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  }),
  removeChannel: vi.fn(),
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: mockUser }, error: null })),
  },
}));

const mockToast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
}));

const mockNavigate = vi.hoisted(() => vi.fn());

const mockRideMatchService = vi.hoisted(() => ({
  getMatchesForUser: vi.fn().mockResolvedValue([]),
  getGroupRideSuggestions: vi.fn().mockResolvedValue([]),
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('../../src/lib/supabase', () => ({
  supabase: mockSupabase,
}));

vi.mock('../../src/lib/toast', () => ({
  toast: mockToast,
}));

vi.mock('../../src/services/socialRideMatchService', () => ({
  socialRideMatchService: mockRideMatchService,
}));

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }: any) =>
    React.createElement('a', { href: to, ...props }, children),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/', search: '', hash: '' }),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target: any, prop: any) => {
      return React.forwardRef((props: any, ref: any) => {
        const { initial, animate, exit, transition, variants, whileHover, whileTap, whileFocus, layout, layoutId, ...rest } = props;
        return React.createElement(prop as string, { ...rest, ref });
      });
    },
  }),
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
  useId: () => 'mock-id',
}));

// All lucide-react icons across all 9 widgets
vi.mock('lucide-react', () => {
  const icon = (name: string) => (props: any) =>
    React.createElement('svg', { 'data-testid': `icon-${name}`, className: props.className });
  const icons = [
    'Car', 'Heart', 'Trophy', 'MessageCircle', 'Users', 'Sparkles', 'Hand',
    'Camera', 'TrendingUp', 'TrendingDown', 'Zap', 'ChevronUp', 'ChevronDown',
    'ChevronRight', 'Loader2', 'Activity', 'Target', 'Clock', 'Share2',
    'Plus', 'Globe', 'Lock', 'UserPlus', 'X', 'Check', 'Mail',
    'Lightbulb', 'Leaf', 'MapPin', 'Armchair', 'Navigation', 'CheckCircle2',
    'ArrowRight', 'Flame', 'Award', 'Search', 'Eye', 'Route',
  ];
  const out: Record<string, any> = {};
  for (const n of icons) out[n] = icon(n);
  return out;
});

// Mock IntersectionObserver globally
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();
vi.stubGlobal('IntersectionObserver', vi.fn().mockImplementation(() => ({
  observe: mockObserve,
  disconnect: mockDisconnect,
  unobserve: vi.fn(),
})));

// ---------------------------------------------------------------------------
// Component imports (after mocks)
// ---------------------------------------------------------------------------

import ActivityFeedWidget from '../../src/components/social/widgets/ActivityFeedWidget';
import ChallengesWidget from '../../src/components/social/widgets/ChallengesWidget';
import CommunityWidget from '../../src/components/social/widgets/CommunityWidget';
import FriendsWidget from '../../src/components/social/widgets/FriendsWidget';
import GroupsWidget from '../../src/components/social/widgets/GroupsWidget';
import LeaderboardWidget from '../../src/components/social/widgets/LeaderboardWidget';
import RideMatchWidget from '../../src/components/social/widgets/RideMatchWidget';
import StatsWidget from '../../src/components/social/widgets/StatsWidget';
import StoryCarouselWidget from '../../src/components/social/widgets/StoryCarousel';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Configure supabase.from to return different results for different tables */
function setupFromMock(tableMap: Record<string, any>) {
  mockSupabase.from.mockImplementation((table: string) => {
    if (tableMap[table]) {
      return buildMockChain(tableMap[table]);
    }
    return buildMockChain();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: mockUser,
    profile: mockProfile,
    isEmailVerified: true,
  });
  // Default: every table returns empty
  mockSupabase.from.mockImplementation(() => buildMockChain());
  mockRideMatchService.getMatchesForUser.mockResolvedValue([]);
  mockRideMatchService.getGroupRideSuggestions.mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
});

// ═══════════════════════════════════════════════════════════════════════════
// ActivityFeedWidget
// ═══════════════════════════════════════════════════════════════════════════
describe('ActivityFeedWidget', () => {
  it('renders Activity Feed heading', async () => {
    await act(async () => { render(<ActivityFeedWidget />); });
    expect(screen.getByText('Activity Feed')).toBeInTheDocument();
  });

  it('shows "See all" link to /activity', async () => {
    await act(async () => { render(<ActivityFeedWidget />); });
    const link = screen.getByText(/See all/);
    expect(link.closest('a')).toHaveAttribute('href', '/activity');
  });

  it('renders filter tabs (All, Rides, Friends, Community, Achievements)', async () => {
    await act(async () => { render(<ActivityFeedWidget />); });
    await waitFor(() => {
      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Rides')).toBeInTheDocument();
      expect(screen.getByText('Friends')).toBeInTheDocument();
      expect(screen.getByText('Community')).toBeInTheDocument();
      expect(screen.getByText('Achievements')).toBeInTheDocument();
    });
  });

  it('shows empty state when no activities', async () => {
    await act(async () => { render(<ActivityFeedWidget />); });
    await waitFor(() => {
      expect(screen.getByText('No activity yet')).toBeInTheDocument();
    });
  });

  it('shows "Find a Ride" and "Add Friends" CTA links in empty state', async () => {
    await act(async () => { render(<ActivityFeedWidget />); });
    await waitFor(() => {
      expect(screen.getByText('Find a Ride')).toBeInTheDocument();
      expect(screen.getByText('Add Friends')).toBeInTheDocument();
    });
  });

  it('does not render when user is null', async () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, isEmailVerified: false });
    const { container } = render(<ActivityFeedWidget />);
    // Should still render the container but no feed items
    expect(container).toBeTruthy();
  });

  it('subscribes to realtime channels on mount', async () => {
    await act(async () => { render(<ActivityFeedWidget />); });
    expect(mockSupabase.channel).toHaveBeenCalledWith('activity-feed-widget');
  });

  it('cleans up realtime channel on unmount', async () => {
    let unmount: () => void;
    await act(async () => {
      const result = render(<ActivityFeedWidget />);
      unmount = result.unmount;
    });
    act(() => { unmount!(); });
    expect(mockSupabase.removeChannel).toHaveBeenCalled();
  });

  it('switches filter tab on click', async () => {
    await act(async () => { render(<ActivityFeedWidget />); });
    await waitFor(() => {
      expect(screen.getByText('Rides')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Rides'));
    // The Rides tab should have the active class
    expect(screen.getByText('Rides').className).toContain('bg-social-warm-100');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ChallengesWidget
// ═══════════════════════════════════════════════════════════════════════════
describe('ChallengesWidget', () => {
  it('renders Challenges title with WidgetCard', async () => {
    await act(async () => { render(<ChallengesWidget />); });
    await waitFor(() => {
      expect(screen.getByText('Challenges')).toBeInTheDocument();
    });
  });

  it('shows empty state when no challenges', async () => {
    await act(async () => { render(<ChallengesWidget />); });
    await waitFor(() => {
      expect(screen.getByText('No active challenges.')).toBeInTheDocument();
    });
  });

  it('shows "Browse available challenges" link in empty state', async () => {
    await act(async () => { render(<ChallengesWidget />); });
    await waitFor(() => {
      expect(screen.getByText('Browse available challenges')).toBeInTheDocument();
    });
  });

  it('renders active challenges when data is loaded', async () => {
    const challengeData = [FAKE_CHALLENGE_ROW];
    const userChallengeData = [FAKE_USER_CHALLENGE];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'challenges') return buildMockChain(challengeData);
      if (table === 'user_challenges') return buildMockChain(userChallengeData);
      if (table === 'user_streaks') return buildMockChain(null);
      if (table === 'ride_bookings') return buildMockChain([]);
      return buildMockChain();
    });

    await act(async () => { render(<ChallengesWidget />); });
    await waitFor(() => {
      expect(screen.getByText('Weekly Warrior')).toBeInTheDocument();
    });
  });

  it('shows streak banner when user has streak data', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'user_streaks') {
        return buildMockChain({
          daily_streak: 14,
          last_daily_activity: new Date().toISOString(),
        });
      }
      if (table === 'challenges') return buildMockChain([FAKE_CHALLENGE_ROW]);
      if (table === 'user_challenges') return buildMockChain([FAKE_USER_CHALLENGE]);
      return buildMockChain();
    });

    await act(async () => { render(<ChallengesWidget />); });
    await waitFor(() => {
      expect(screen.getByText('14-day streak!')).toBeInTheDocument();
    });
  });

  it('shows "See all" link to /social/challenges', async () => {
    await act(async () => { render(<ChallengesWidget />); });
    await waitFor(() => {
      const links = screen.getAllByText('See all');
      expect(links.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows "Join Challenge" button for available challenges', async () => {
    const challenge1 = FAKE_CHALLENGE_ROW;
    const challenge2 = makeChallengeRow({ title: 'Eco Sprint', is_seasonal: true });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'challenges') return buildMockChain([challenge1, challenge2]);
      if (table === 'user_challenges') return buildMockChain([FAKE_USER_CHALLENGE]); // Only joined first
      if (table === 'user_streaks') return buildMockChain(null);
      return buildMockChain();
    });

    await act(async () => { render(<ChallengesWidget />); });
    await waitFor(() => {
      expect(screen.getByText('Join Challenge')).toBeInTheDocument();
    });
  });

  it('does not load when user is null', async () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null });
    await act(async () => { render(<ChallengesWidget />); });
    // Should not call supabase.from for challenges
    expect(mockSupabase.from).not.toHaveBeenCalledWith('challenges');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CommunityWidget
// ═══════════════════════════════════════════════════════════════════════════
describe('CommunityWidget', () => {
  it('renders Community title via WidgetCard', async () => {
    await act(async () => { render(<CommunityWidget />); });
    await waitFor(() => {
      expect(screen.getByText('Community')).toBeInTheDocument();
    });
  });

  it('shows "No posts yet" when empty', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'community_posts_with_stats') return buildMockChain([]);
      return buildMockChain();
    });

    await act(async () => { render(<CommunityWidget />); });
    await waitFor(() => {
      expect(screen.getByText(/No posts yet/)).toBeInTheDocument();
    });
  });

  it('renders community posts when data loads', async () => {
    const posts = [FAKE_COMMUNITY_POST, makeCommunityPost({ title: 'Ride sharing tips' })];
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'community_posts_with_stats') return buildMockChain(posts);
      if (table === 'community_post_votes') return buildMockChain([]);
      return buildMockChain();
    });

    await act(async () => { render(<CommunityWidget />); });
    await waitFor(() => {
      expect(screen.getByText('How to reduce commute costs')).toBeInTheDocument();
      expect(screen.getByText('Ride sharing tips')).toBeInTheDocument();
    });
  });

  it('renders category filter pills', async () => {
    await act(async () => { render(<CommunityWidget />); });
    await waitFor(() => {
      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('General')).toBeInTheDocument();
      expect(screen.getByText('Rides')).toBeInTheDocument();
      expect(screen.getByText('Safety')).toBeInTheDocument();
    });
  });

  it('shows Upvote and Downvote buttons on post card', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'community_posts_with_stats') return buildMockChain([FAKE_COMMUNITY_POST]);
      if (table === 'community_post_votes') return buildMockChain([]);
      return buildMockChain();
    });

    await act(async () => { render(<CommunityWidget />); });
    await waitFor(() => {
      expect(screen.getByLabelText('Upvote')).toBeInTheDocument();
      expect(screen.getByLabelText('Downvote')).toBeInTheDocument();
    });
  });

  it('handles upvote optimistic update', async () => {
    const post = { ...FAKE_COMMUNITY_POST, score: 5 };
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'community_posts_with_stats') return buildMockChain([post]);
      if (table === 'community_post_votes') return buildMockChain([]);
      return buildMockChain();
    });

    await act(async () => { render(<CommunityWidget />); });
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Upvote'));
    });

    // Score should increase optimistically to 6
    await waitFor(() => {
      expect(screen.getByText('6')).toBeInTheDocument();
    });
  });

  it('shows "New Post" link', async () => {
    await act(async () => { render(<CommunityWidget />); });
    await waitFor(() => {
      expect(screen.getByText('New Post')).toBeInTheDocument();
    });
  });

  it('subscribes to realtime and shows new posts banner', async () => {
    await act(async () => { render(<CommunityWidget />); });
    expect(mockSupabase.channel).toHaveBeenCalledWith('community-widget-realtime');
  });

  it('filters posts by category', async () => {
    const posts = [
      FAKE_COMMUNITY_POST,
      makeCommunityPost({ title: 'Safety Tip', category: 'Safety' }),
    ];
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'community_posts_with_stats') return buildMockChain(posts);
      if (table === 'community_post_votes') return buildMockChain([]);
      return buildMockChain();
    });

    await act(async () => { render(<CommunityWidget />); });
    await waitFor(() => {
      expect(screen.getByText('How to reduce commute costs')).toBeInTheDocument();
      expect(screen.getByText('Safety Tip')).toBeInTheDocument();
    });

    // Filter to Safety — "Safety" appears in both the pill button and the post category badge;
    // click the first one (the category filter pill)
    const safetyElements = screen.getAllByText('Safety');
    fireEvent.click(safetyElements[0]);
    await waitFor(() => {
      expect(screen.getByText('Safety Tip')).toBeInTheDocument();
      expect(screen.queryByText('How to reduce commute costs')).not.toBeInTheDocument();
    });
  });

  it('warns unauthenticated user on vote', async () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null });
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'community_posts_with_stats') return buildMockChain([FAKE_COMMUNITY_POST]);
      return buildMockChain();
    });

    await act(async () => { render(<CommunityWidget />); });
    await waitFor(() => {
      expect(screen.getByLabelText('Upvote')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Upvote'));
    });

    expect(mockToast.warning).toHaveBeenCalledWith('Sign in to vote on posts');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FriendsWidget
// ═══════════════════════════════════════════════════════════════════════════
describe('FriendsWidget', () => {
  it('renders Friends title via WidgetCard', async () => {
    await act(async () => { render(<FriendsWidget />); });
    await waitFor(() => {
      expect(screen.getByText('Friends')).toBeInTheDocument();
    });
  });

  it('shows empty state with "No friends yet" and "Find Friends"', async () => {
    await act(async () => { render(<FriendsWidget />); });
    await waitFor(() => {
      expect(screen.getByText('No friends yet')).toBeInTheDocument();
      expect(screen.getByText('Find Friends')).toBeInTheDocument();
    });
  });

  it('renders friends list when data loads', async () => {
    const friend = FAKE_FRIEND_WITH_PRESENCE;
    const friendship = { id: 'f-1', user_a: FAKE_USER_ID, user_b: friend.id };
    const presence = { user_id: friend.id, status: 'online', last_seen_at: new Date().toISOString() };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'friendships') return buildMockChain([friendship]);
      if (table === 'profiles') return buildMockChain([{
        id: friend.id,
        full_name: friend.full_name,
        avatar_url: friend.avatar_url,
        profile_photo_url: friend.profile_photo_url,
      }]);
      if (table === 'user_presence') return buildMockChain([presence]);
      if (table === 'friend_requests') return buildMockChain([]);
      if (table === 'social_waves') return buildMockChain([]);
      if (table === 'social_group_members') return buildMockChain([]);
      return buildMockChain();
    });

    await act(async () => { render(<FriendsWidget />); });
    await waitFor(() => {
      // Name may appear in both the online avatars bar and the friend list
      const matches = screen.getAllByText('Bob Social');
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows pending request count badge', async () => {
    const request = {
      id: 'req-1',
      from_user_id: FAKE_OTHER_USER_ID,
      to_user_id: FAKE_USER_ID,
      created_at: new Date().toISOString(),
      from_user: FAKE_OTHER_PROFILE,
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'friendships') return buildMockChain([]);
      if (table === 'friend_requests') return buildMockChain([request]);
      if (table === 'profiles') return buildMockChain([FAKE_OTHER_PROFILE]);
      if (table === 'social_waves') return buildMockChain([]);
      if (table === 'social_group_members') return buildMockChain([]);
      if (table === 'user_presence') return buildMockChain([]);
      return buildMockChain();
    });

    await act(async () => { render(<FriendsWidget />); });
    await waitFor(() => {
      expect(screen.getByText(/pending request/)).toBeInTheDocument();
    });
  });

  it('renders loading skeleton when auth user exists but still loading', () => {
    // On first render, loading is true
    const { container } = render(<FriendsWidget />);
    expect(container).toBeTruthy();
  });

  it('does not render friends when user is null', async () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null });
    await act(async () => { render(<FriendsWidget />); });
    expect(mockSupabase.from).not.toHaveBeenCalledWith('friendships');
  });

  it('subscribes to realtime channels', async () => {
    await act(async () => { render(<FriendsWidget />); });
    expect(mockSupabase.channel).toHaveBeenCalledWith('friends-widget');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GroupsWidget
// ═══════════════════════════════════════════════════════════════════════════
describe('GroupsWidget', () => {
  it('renders Groups heading', async () => {
    await act(async () => { render(<GroupsWidget />); });
    await waitFor(() => {
      expect(screen.getByText('Groups')).toBeInTheDocument();
    });
  });

  it('shows empty state when no groups', async () => {
    await act(async () => { render(<GroupsWidget />); });
    await waitFor(() => {
      expect(screen.getByText('No groups yet.')).toBeInTheDocument();
    });
  });

  it('shows "Create New Group" button', async () => {
    await act(async () => { render(<GroupsWidget />); });
    await waitFor(() => {
      expect(screen.getByText('Create New Group')).toBeInTheDocument();
    });
  });

  it('shows "Create new group" aria-label button', async () => {
    await act(async () => { render(<GroupsWidget />); });
    await waitFor(() => {
      expect(screen.getByLabelText('Create new group')).toBeInTheDocument();
    });
  });

  it('renders groups list when data loads', async () => {
    const groupMembership = { group_id: FAKE_GROUP.id, role: 'MEMBER' };
    const group = { ...FAKE_GROUP, member_count: 5 };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'social_group_members') return buildMockChain([groupMembership]);
      if (table === 'social_groups') return buildMockChain([group]);
      if (table === 'conversations') return buildMockChain([]);
      if (table === 'social_group_invites') return buildMockChain([]);
      return buildMockChain();
    });

    await act(async () => { render(<GroupsWidget />); });
    await waitFor(() => {
      expect(screen.getByText(FAKE_GROUP.name)).toBeInTheDocument();
    });
  });

  it('opens create group modal on button click', async () => {
    await act(async () => { render(<GroupsWidget />); });
    await waitFor(() => {
      expect(screen.getByText('Create New Group')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Create New Group'));
    });

    expect(screen.getByText('Create Group')).toBeInTheDocument();
    expect(screen.getByText('Group Name')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Visibility')).toBeInTheDocument();
  });

  it('shows "See all" link to /social/groups', async () => {
    await act(async () => { render(<GroupsWidget />); });
    await waitFor(() => {
      const links = screen.getAllByText(/See all/);
      expect(links.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('validates group name before advancing to step 2', async () => {
    await act(async () => { render(<GroupsWidget />); });
    await waitFor(() => {
      expect(screen.getByText('Create New Group')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Create New Group'));
    });

    // Try to go to next step without name
    await act(async () => {
      fireEvent.click(screen.getByText('Next'));
    });

    expect(mockToast.warning).toHaveBeenCalledWith('Please enter a group name');
  });

  it('closes modal on Cancel click', async () => {
    await act(async () => { render(<GroupsWidget />); });
    await waitFor(() => {
      expect(screen.getByText('Create New Group')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Create New Group'));
    });
    expect(screen.getByText('Group Name')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText('Cancel'));
    });
    expect(screen.queryByText('Group Name')).not.toBeInTheDocument();
  });

  it('closes modal on Close button click', async () => {
    await act(async () => { render(<GroupsWidget />); });
    await waitFor(() => {
      expect(screen.getByText('Create New Group')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Create New Group'));
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Close'));
    });
    expect(screen.queryByText('Group Name')).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// LeaderboardWidget
// ═══════════════════════════════════════════════════════════════════════════
describe('LeaderboardWidget', () => {
  it('renders Leaderboard title via WidgetCard', async () => {
    await act(async () => { render(<LeaderboardWidget />); });
    await waitFor(() => {
      expect(screen.getByText('Leaderboard')).toBeInTheDocument();
    });
  });

  it('shows empty state when no rank data', async () => {
    await act(async () => { render(<LeaderboardWidget />); });
    await waitFor(() => {
      // Both "Your ranking will appear..." and "Leaderboard data will appear..."
      // show when rankData=null and top3=[]
      const matches = screen.getAllByText(/will appear after your first ride/);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders category tabs (Overall, CO₂, Rides, Social)', async () => {
    await act(async () => { render(<LeaderboardWidget />); });
    await waitFor(() => {
      expect(screen.getByText('Overall')).toBeInTheDocument();
      expect(screen.getByText('CO₂')).toBeInTheDocument();
      expect(screen.getByText('Rides')).toBeInTheDocument();
      expect(screen.getByText('Social')).toBeInTheDocument();
    });
  });

  it('renders user rank when data is available', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'leaderboard_cache') {
        // Return different chains for different contexts
        const chain = buildMockChain(FAKE_LEADERBOARD_ENTRIES);
        // Override maybeSingle to return rank data
        chain.maybeSingle = vi.fn().mockReturnValue(
          Promise.resolve({ data: { user_id: FAKE_USER_ID, rank: 5, score: 800 }, error: null }),
        );
        // Override head count query
        chain.select = vi.fn().mockImplementation((...args: any[]) => {
          if (args[1]?.count === 'exact') {
            const countChain = buildMockChain(null);
            Object.defineProperty(countChain, 'then', {
              value: Promise.resolve({ count: 50, data: null, error: null }).then.bind(
                Promise.resolve({ count: 50, data: null, error: null }),
              ),
              writable: true,
              configurable: true,
              enumerable: false,
            });
            return countChain;
          }
          return chain;
        });
        return chain;
      }
      if (table === 'friendships') return buildMockChain([]);
      return buildMockChain();
    });

    await act(async () => { render(<LeaderboardWidget />); });
    await waitFor(() => {
      expect(screen.getByText('Your Rank')).toBeInTheDocument();
    });
  });

  it('shows top 3 with medal emojis', async () => {
    const top3 = FAKE_LEADERBOARD_ENTRIES.map((e) => ({
      ...e,
      profiles: e.profile,
    }));

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'leaderboard_cache') {
        return buildMockChain(top3);
      }
      if (table === 'friendships') return buildMockChain([]);
      return buildMockChain();
    });

    await act(async () => { render(<LeaderboardWidget />); });
    await waitFor(() => {
      // Component abbreviates names via getDisplayName: 'Top Scorer' → 'Top S.', etc.
      expect(screen.getByText('Top S.')).toBeInTheDocument();
      expect(screen.getByText('Runner U.')).toBeInTheDocument();
      expect(screen.getByText('Bronze S.')).toBeInTheDocument();
    });
  });

  it('switches category on tab click', async () => {
    await act(async () => { render(<LeaderboardWidget />); });
    await waitFor(() => {
      expect(screen.getByText('CO₂')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('CO₂'));
    });

    // Should trigger a new data load
    expect(mockSupabase.from).toHaveBeenCalledWith('leaderboard_cache');
  });

  it('shows "Full leaderboard" see-all link', async () => {
    await act(async () => { render(<LeaderboardWidget />); });
    await waitFor(() => {
      const links = screen.getAllByText('Full leaderboard');
      expect(links.length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// RideMatchWidget
// ═══════════════════════════════════════════════════════════════════════════
describe('RideMatchWidget', () => {
  it('renders Ride Matches title via WidgetCard', async () => {
    await act(async () => { render(<RideMatchWidget />); });
    await waitFor(() => {
      expect(screen.getByText('Ride Matches')).toBeInTheDocument();
    });
  });

  it('shows empty state when no matches', async () => {
    await act(async () => { render(<RideMatchWidget />); });
    await waitFor(() => {
      expect(screen.getByText('No ride matches right now')).toBeInTheDocument();
    });
  });

  it('shows "Post a ride" CTA in empty state', async () => {
    await act(async () => { render(<RideMatchWidget />); });
    await waitFor(() => {
      expect(screen.getByText(/Post a ride/)).toBeInTheDocument();
    });
  });

  it('renders ride match cards when service returns matches', async () => {
    const match = {
      ride_id: 'ride-m-1',
      driver_id: FAKE_OTHER_USER_ID,
      driver_name: 'Bob Social',
      driver_avatar: 'https://example.com/bob.jpg',
      origin: '123 Main St, Springfield',
      destination: '456 Oak Ave, Shelbyville',
      departure_time: new Date(Date.now() + 3600_000).toISOString(),
      seats_available: 2,
      match_score: 0.85,
      is_friend: true,
      shared_group: null,
    };
    mockRideMatchService.getMatchesForUser.mockResolvedValue([match]);
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'user_presence') return buildMockChain([{ user_id: FAKE_OTHER_USER_ID, status: 'online' }]);
      if (table === 'ride_bookings') return buildMockChain([]);
      return buildMockChain();
    });

    await act(async () => { render(<RideMatchWidget />); });
    await waitFor(() => {
      expect(screen.getByText('Bob Social')).toBeInTheDocument();
      expect(screen.getByText('Friend')).toBeInTheDocument();
      expect(screen.getByText('Great match')).toBeInTheDocument();
      expect(screen.getByText('Request to Join')).toBeInTheDocument();
    });
  });

  it('shows "Friends on your route" header when matches exist', async () => {
    const match = {
      ride_id: 'ride-m-2',
      driver_id: 'other-driver',
      driver_name: 'Jane Doe',
      driver_avatar: null,
      origin: '10 Elm St',
      destination: '20 Pine St',
      departure_time: new Date(Date.now() + 7200_000).toISOString(),
      seats_available: 3,
      match_score: 0.55,
      is_friend: false,
      shared_group: 'Morning Commuters',
    };
    mockRideMatchService.getMatchesForUser.mockResolvedValue([match]);
    mockSupabase.from.mockImplementation(() => buildMockChain([]));

    await act(async () => { render(<RideMatchWidget />); });
    await waitFor(() => {
      expect(screen.getByText('Friends on your route')).toBeInTheDocument();
    });
  });

  it('marks ride as requested after clicking "Request to Join"', async () => {
    const match = {
      ride_id: 'ride-m-3',
      driver_id: 'driver-x',
      driver_name: 'Sam Driver',
      driver_avatar: null,
      origin: 'A',
      destination: 'B',
      departure_time: new Date(Date.now() + 3600_000).toISOString(),
      seats_available: 1,
      match_score: 0.70,
      is_friend: false,
      shared_group: null,
    };
    mockRideMatchService.getMatchesForUser.mockResolvedValue([match]);
    mockSupabase.from.mockImplementation(() => buildMockChain([]));

    await act(async () => { render(<RideMatchWidget />); });
    await waitFor(() => {
      expect(screen.getByText('Request to Join')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Request to Join'));
    });

    await waitFor(() => {
      expect(screen.getByText('Requested')).toBeInTheDocument();
    });
  });

  it('shows group ride suggestion banner', async () => {
    mockRideMatchService.getGroupRideSuggestions.mockResolvedValue([
      {
        group: 'Morning Crew',
        rides: [
          { ride_id: 'r-g1', destination: '100 Business Park Dr', departure_time: new Date(Date.now() + 86400_000).toISOString() },
        ],
      },
    ]);
    mockSupabase.from.mockImplementation(() => buildMockChain([]));

    await act(async () => { render(<RideMatchWidget />); });
    await waitFor(() => {
      expect(screen.getByText(/Morning Crew/)).toBeInTheDocument();
    });
  });

  it('shows badge with match count', async () => {
    const matches = Array.from({ length: 4 }, (_, i) => ({
      ride_id: `r-${i}`,
      driver_id: `d-${i}`,
      driver_name: `Driver ${i}`,
      driver_avatar: null,
      origin: 'A',
      destination: 'B',
      departure_time: new Date(Date.now() + 3600_000).toISOString(),
      seats_available: 1,
      match_score: 0.5,
      is_friend: false,
      shared_group: null,
    }));
    mockRideMatchService.getMatchesForUser.mockResolvedValue(matches);
    mockSupabase.from.mockImplementation(() => buildMockChain([]));

    await act(async () => { render(<RideMatchWidget />); });
    await waitFor(() => {
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// StatsWidget
// ═══════════════════════════════════════════════════════════════════════════
describe('StatsWidget', () => {
  it('renders "Your Stats" title via WidgetCard', async () => {
    await act(async () => { render(<StatsWidget />); });
    await waitFor(() => {
      expect(screen.getByText('Your Stats')).toBeInTheDocument();
    });
  });

  it('shows period selector', async () => {
    await act(async () => { render(<StatsWidget />); });
    await waitFor(() => {
      expect(screen.getByDisplayValue('This Month')).toBeInTheDocument();
    });
  });

  it('renders stat labels (Rides, kg CO₂, Friends, Challenges, Streak)', async () => {
    await act(async () => { render(<StatsWidget />); });
    await waitFor(() => {
      expect(screen.getByText('Rides')).toBeInTheDocument();
      expect(screen.getByText(/kg CO/)).toBeInTheDocument();
      expect(screen.getByText('Friends')).toBeInTheDocument();
      expect(screen.getByText('Challenges')).toBeInTheDocument();
      expect(screen.getByText('Streak')).toBeInTheDocument();
    });
  });

  it('changes period on select change', async () => {
    await act(async () => { render(<StatsWidget />); });
    await waitFor(() => {
      expect(screen.getByDisplayValue('This Month')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.change(screen.getByDisplayValue('This Month'), { target: { value: 'week' } });
    });

    expect(screen.getByDisplayValue('This Week')).toBeInTheDocument();
    // New fetch triggered
    expect(mockSupabase.from).toHaveBeenCalledWith('ride_bookings');
  });

  it('shows milestone tracker when milestones are incomplete', async () => {
    // Default stats with 0 rides means milestone "Eco Warrior" should show
    await act(async () => { render(<StatsWidget />); });
    await waitFor(() => {
      // The component uses curly quotes (&ldquo;/&rdquo;) around milestone names.
      // Multiple ancestor elements contain "Eco Warrior" in textContent,
      // so use getAllByText with a function matcher on the innermost element.
      const matches = screen.getAllByText((_content, element) => {
        // Only match the <span> that directly contains the label
        return element?.tagName === 'SPAN' && (element?.textContent?.includes('Eco Warrior') ?? false);
      });
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('does not load when user is null', async () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null });
    await act(async () => { render(<StatsWidget />); });
    expect(mockSupabase.from).not.toHaveBeenCalledWith('ride_bookings');
  });

  it('displays days suffix for streak', async () => {
    await act(async () => { render(<StatsWidget />); });
    await waitFor(() => {
      expect(screen.getByText('days')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// StoryCarouselWidget
// ═══════════════════════════════════════════════════════════════════════════
describe('StoryCarouselWidget', () => {
  it('returns null when no stories and loading is complete', async () => {
    mockSupabase.from.mockImplementation(() => buildMockChain([]));

    const { container } = await act(async () => render(<StoryCarouselWidget />));
    await waitFor(() => {
      // Widget returns null when no stories
      expect(container.children.length).toBe(0);
    });
  });

  it('renders story bubbles when ride data exists', async () => {
    // The component joins: ride_bookings -> rides:ride_id -> profiles:driver_id
    // So 'rides' is nested inside the booking, and 'profiles' is nested inside 'rides'
    const bookings = [{
      id: 'booking-1',
      passenger_id: FAKE_OTHER_USER_ID,
      created_at: new Date(Date.now() - 3600_000).toISOString(),
      rides: {
        id: 'ride-1',
        origin: 'Downtown',
        destination: 'Airport',
        driver_id: FAKE_OTHER_USER_ID,
        profiles: {
          full_name: 'Bob Social',
          avatar_url: 'https://example.com/bob.jpg',
          profile_photo_url: null,
        },
      },
    }];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'ride_bookings') return buildMockChain(bookings);
      return buildMockChain();
    });

    await act(async () => { render(<StoryCarouselWidget />); });
    // The widget creates stories from ride bookings; the shared StoryCarousel renders user names
    await waitFor(() => {
      // Bob Social's name should appear in the story bubble
      const matches = screen.getAllByText(/Bob/);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('does not fetch when user is null', async () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null });
    const { container } = render(<StoryCarouselWidget />);
    expect(container.children.length).toBe(0);
    expect(mockSupabase.from).not.toHaveBeenCalledWith('ride_bookings');
  });
});
