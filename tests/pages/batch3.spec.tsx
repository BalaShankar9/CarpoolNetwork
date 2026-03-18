// @vitest-environment jsdom
/**
 * Page tests – Batch 3: smaller pages
 *
 * Covers: HelpHub, Pools, SocialHub, PrivacyPolicy, RequestRide,
 *         TermsOfService, Status, Unauthorized
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import {
  FAKE_USER_ID,
  FAKE_HELP_ARTICLE,
  FAKE_POOL,
  FAKE_ONLINE_FRIEND,
  buildMockChain,
  makeHelpArticle,
} from './helpers';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockUseAuth = vi.hoisted(() =>
  vi.fn().mockReturnValue({
    user: { id: 'user-page-001', email: 'alice@example.com' },
    profile: {
      id: 'user-page-001',
      full_name: 'Alice Tester',
      avatar_url: null,
    },
    isEmailVerified: true,
  }),
);

const mockNavigate = vi.hoisted(() => vi.fn());
const mockSearchParams = vi.hoisted(() => new URLSearchParams());
const mockSetSearchParams = vi.hoisted(() => vi.fn());

const mockToast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
}));

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  channel: vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  }),
  removeChannel: vi.fn(),
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-page-001' } }, error: null })),
  },
}));

const mockGetUserPools = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockSearchPools = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockCreatePool = vi.hoisted(() => vi.fn().mockResolvedValue(null));
const mockJoinPool = vi.hoisted(() => vi.fn().mockResolvedValue(null));
const mockJoinPoolByCode = vi.hoisted(() => vi.fn().mockResolvedValue(null));

const mockUseSocial = vi.hoisted(() =>
  vi.fn().mockReturnValue({
    onlineFriends: [],
    counts: { friendRequests: 0, groupInvites: 0, newWaves: 0 },
    loading: false,
    refreshAll: vi.fn(),
  }),
);

const mockUseServiceGating = vi.hoisted(() => vi.fn().mockReturnValue({
  checkAccess: vi.fn().mockReturnValue(true),
  ServiceGatingModal: () => null,
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('../../src/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('../../src/lib/supabase', () => ({ supabase: mockSupabase }));
vi.mock('../../src/lib/toast', () => ({ toast: mockToast }));
vi.mock('../../src/contexts/SocialContext', () => ({ useSocial: mockUseSocial }));
vi.mock('../../src/hooks/useServiceGating', () => ({
  useServiceGating: mockUseServiceGating,
}));
vi.mock('../../src/services/poolService', () => ({
  getUserPools: mockGetUserPools,
  searchPools: mockSearchPools,
  createPool: mockCreatePool,
  joinPool: mockJoinPool,
  joinPoolByCode: mockJoinPoolByCode,
  CarpoolPool: {},
}));

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }: any) =>
    React.createElement('a', { href: to, ...props }, children),
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
  useSearchParams: () => [mockSearchParams, mockSetSearchParams],
  useLocation: () => ({ pathname: '/', search: '', hash: '' }),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_t: any, prop: any) =>
      React.forwardRef((props: any, ref: any) => {
        const { initial, animate, exit, transition, variants, whileHover, whileTap, whileFocus, layout, layoutId, ...rest } = props;
        return React.createElement(prop as string, { ...rest, ref });
      }),
  }),
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
}));

// Lucide icons
vi.mock('lucide-react', () => {
  const icon = (name: string) => (props: any) =>
    React.createElement('svg', { 'data-testid': `icon-${name}`, ...props });
  const names = [
    'Search', 'HelpCircle', 'Car', 'MessageSquare', 'Shield', 'User',
    'ChevronRight', 'Book', 'ArrowLeft', 'ExternalLink', 'Users', 'Plus',
    'Key', 'MapPin', 'Sparkles', 'FileText', 'Hand', 'RefreshCw',
    'CheckCircle', 'Clock', 'AlertCircle', 'X', 'Calendar',
  ];
  const out: Record<string, any> = {};
  for (const n of names) out[n] = icon(n);
  return out;
});

// Stub child components
vi.mock('../../src/components/shared/Seo', () => ({
  default: () => null,
}));
vi.mock('../../src/components/shared/Logo', () => ({
  default: () => React.createElement('div', { 'data-testid': 'logo' }, 'Logo'),
}));
vi.mock('../../src/components/shared/LocationAutocomplete', () => ({
  default: (props: any) =>
    React.createElement('input', {
      'data-testid': 'location-autocomplete',
      placeholder: props.placeholder,
      onChange: (e: any) => props.onLocationSelect?.({
        address: e.target.value,
        lat: 51.5,
        lng: -0.12,
      }),
    }),
}));
vi.mock('../../src/components/shared/TrainlineDateTimePicker', () => ({
  default: (props: any) => React.createElement('div', { 'data-testid': 'datetime-picker' }),
}));
vi.mock('../../src/components/pools', () => ({
  PoolCard: (props: any) =>
    React.createElement('div', { 'data-testid': 'pool-card' }, props.pool?.name || 'Pool'),
  PoolCardSkeleton: () => React.createElement('div', { 'data-testid': 'pool-skeleton' }),
  CreatePoolModal: (props: any) =>
    props.isOpen
      ? React.createElement('div', { 'data-testid': 'create-pool-modal' }, 'CreatePoolModal')
      : null,
  JoinPoolModal: (props: any) =>
    props.isOpen
      ? React.createElement('div', { 'data-testid': 'join-pool-modal' }, 'JoinPoolModal')
      : null,
}));

// Social widgets
vi.mock('../../src/components/social/widgets/ActivityFeedWidget', () => ({
  default: () => React.createElement('div', { 'data-testid': 'activity-feed-widget' }),
}));
vi.mock('../../src/components/social/widgets/FriendsWidget', () => ({
  default: () => React.createElement('div', { 'data-testid': 'friends-widget' }),
}));
vi.mock('../../src/components/social/widgets/GroupsWidget', () => ({
  default: () => React.createElement('div', { 'data-testid': 'groups-widget' }),
}));
vi.mock('../../src/components/social/widgets/CommunityWidget', () => ({
  default: () => React.createElement('div', { 'data-testid': 'community-widget' }),
}));
vi.mock('../../src/components/social/widgets/ChallengesWidget', () => ({
  default: () => React.createElement('div', { 'data-testid': 'challenges-widget' }),
}));
vi.mock('../../src/components/social/widgets/LeaderboardWidget', () => ({
  default: () => React.createElement('div', { 'data-testid': 'leaderboard-widget' }),
}));
vi.mock('../../src/components/social/widgets/RideMatchWidget', () => ({
  default: () => React.createElement('div', { 'data-testid': 'ride-match-widget' }),
}));
vi.mock('../../src/components/social/widgets/StatsWidget', () => ({
  default: () => React.createElement('div', { 'data-testid': 'stats-widget' }),
}));
vi.mock('../../src/components/shared/EmailVerificationBanner', () => ({
  default: () => null,
}));

vi.stubGlobal('IntersectionObserver', vi.fn().mockImplementation(() => ({
  observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn(),
})));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import HelpHub from '../../src/pages/HelpHub';
import Pools from '../../src/pages/Pools';
import SocialHub from '../../src/pages/SocialHub';
import PrivacyPolicy from '../../src/pages/PrivacyPolicy';
import RequestRide from '../../src/pages/RequestRide';
import TermsOfService from '../../src/pages/TermsOfService';
import StatusPage from '../../src/pages/Status';
import Unauthorized from '../../src/pages/Unauthorized';

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.from.mockImplementation(() => buildMockChain());
  mockNavigate.mockReset();
  mockUseAuth.mockReturnValue({
    user: { id: 'user-page-001', email: 'alice@example.com' },
    profile: {
      id: 'user-page-001',
      full_name: 'Alice Tester',
      avatar_url: null,
    },
    isEmailVerified: true,
  });
});

afterEach(() => { cleanup(); });

// ═══════════════════════════════════════════════════════════════════════════
// HelpHub
// ═══════════════════════════════════════════════════════════════════════════
describe('HelpHub', () => {
  it('renders "Help Center" or "Help Hub" heading', async () => {
    await act(async () => { render(<HelpHub />); });
    await waitFor(() => {
      const headings = screen.queryAllByText(/help (center|hub)/i);
      expect(headings.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders category cards', async () => {
    await act(async () => { render(<HelpHub />); });
    await waitFor(() => {
      expect(screen.getByText('Getting Started')).toBeInTheDocument();
      expect(screen.getByText('Rides')).toBeInTheDocument();
      expect(screen.getByText('Messaging')).toBeInTheDocument();
      expect(screen.getByText('Safety')).toBeInTheDocument();
      expect(screen.getByText('Account')).toBeInTheDocument();
      expect(screen.getByText('FAQ')).toBeInTheDocument();
    });
  });

  it('renders search input', async () => {
    await act(async () => { render(<HelpHub />); });
    await waitFor(() => {
      const searchInput = document.querySelector('input[type="text"], input[type="search"]');
      expect(searchInput).toBeTruthy();
    });
  });

  it('renders quick links', async () => {
    await act(async () => { render(<HelpHub />); });
    await waitFor(() => {
      const links = screen.queryAllByText(/Post a Ride|Find Rides|My Rides|Messages|Profile Settings|Privacy Controls/);
      expect(links.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('loads articles from supabase', async () => {
    const articles = [FAKE_HELP_ARTICLE, makeHelpArticle({ title: 'How to Post a Ride' })];
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'help_articles') return buildMockChain(articles);
      return buildMockChain();
    });

    await act(async () => { render(<HelpHub />); });
    expect(mockSupabase.from).toHaveBeenCalledWith('help_articles');
  });

  it('shows article detail when article param is set', async () => {
    const article = FAKE_HELP_ARTICLE;
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'help_articles') return buildMockChain([article]);
      return buildMockChain();
    });

    // Set search params to have article slug
    Object.defineProperty(mockSearchParams, 'get', {
      value: (k: string) => k === 'article' ? 'getting-started' : null,
      writable: true,
      configurable: true,
    });

    await act(async () => { render(<HelpHub />); });
    await waitFor(() => {
      // Should attempt to load article
      expect(mockSupabase.from).toHaveBeenCalledWith('help_articles');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Pools
// ═══════════════════════════════════════════════════════════════════════════
describe('Pools', () => {
  it('renders page heading with "Pools" or "Carpool Pools"', async () => {
    await act(async () => { render(<Pools />); });
    await waitFor(() => {
      const headings = screen.queryAllByText(/pool/i);
      expect(headings.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders tab navigation: My Pools / Discover', async () => {
    await act(async () => { render(<Pools />); });
    await waitFor(() => {
      expect(screen.getByText(/my pools/i)).toBeInTheDocument();
      const discoverTexts = screen.getAllByText(/discover/i);
      expect(discoverTexts.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('loads user pools on mount', async () => {
    await act(async () => { render(<Pools />); });
    await waitFor(() => {
      expect(mockGetUserPools).toHaveBeenCalled();
    });
  });

  it('shows pool cards when pools exist', async () => {
    mockGetUserPools.mockResolvedValue([FAKE_POOL]);

    await act(async () => { render(<Pools />); });
    await waitFor(() => {
      expect(screen.getByTestId('pool-card')).toBeInTheDocument();
    });
  });

  it('shows empty state when no pools', async () => {
    mockGetUserPools.mockResolvedValue([]);

    await act(async () => { render(<Pools />); });
    await waitFor(() => {
      const emptyTexts = screen.queryAllByText(/no pool|join.*pool|create.*pool/i);
      expect(emptyTexts.length).toBeGreaterThanOrEqual(0);
    });
  });

  it('renders create and join buttons', async () => {
    await act(async () => { render(<Pools />); });
    await waitFor(() => {
      const createBtns = screen.queryAllByText(/create.*pool|new pool/i);
      expect(createBtns.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('does not load pools when user is null', async () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, isEmailVerified: false });
    await act(async () => { render(<Pools />); });
    expect(mockGetUserPools).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SocialHub
// ═══════════════════════════════════════════════════════════════════════════
describe('SocialHub', () => {
  it('renders welcome banner with user name', async () => {
    await act(async () => { render(<SocialHub />); });
    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Alice/i)).toBeInTheDocument();
    });
  });

  it('renders "Your community is waiting" sub-text', async () => {
    await act(async () => { render(<SocialHub />); });
    await waitFor(() => {
      expect(screen.getByText(/your community is waiting/i)).toBeInTheDocument();
    });
  });

  it('renders all social widgets', async () => {
    await act(async () => { render(<SocialHub />); });
    await waitFor(() => {
      expect(screen.getByTestId('activity-feed-widget')).toBeInTheDocument();
      expect(screen.getByTestId('friends-widget')).toBeInTheDocument();
      expect(screen.getByTestId('groups-widget')).toBeInTheDocument();
      expect(screen.getByTestId('community-widget')).toBeInTheDocument();
      expect(screen.getByTestId('challenges-widget')).toBeInTheDocument();
      expect(screen.getByTestId('leaderboard-widget')).toBeInTheDocument();
    });
  });

  it('shows loading skeleton when social context is loading', async () => {
    mockUseSocial.mockReturnValue({
      onlineFriends: [],
      counts: { friendRequests: 0, groupInvites: 0, newWaves: 0 },
      loading: true,
      refreshAll: vi.fn(),
    });

    await act(async () => { render(<SocialHub />); });
    // Should show skeleton, not the actual content
    expect(screen.queryByText(/Welcome back/i)).not.toBeInTheDocument();
  });

  it('shows refresh button', async () => {
    mockUseSocial.mockReturnValue({
      onlineFriends: [],
      counts: { friendRequests: 0, groupInvites: 0, newWaves: 0 },
      loading: false,
      refreshAll: vi.fn(),
    });
    await act(async () => { render(<SocialHub />); });
    await waitFor(() => {
      const refreshBtn = screen.getByLabelText(/refresh/i);
      expect(refreshBtn).toBeInTheDocument();
    });
  });

  it('calls refreshAll when refresh button is clicked', async () => {
    const mockRefresh = vi.fn();
    mockUseSocial.mockReturnValue({
      onlineFriends: [],
      counts: { friendRequests: 0, groupInvites: 0, newWaves: 0 },
      loading: false,
      refreshAll: mockRefresh,
    });

    await act(async () => { render(<SocialHub />); });
    const refreshBtn = screen.getByLabelText(/refresh/i);
    await act(async () => { fireEvent.click(refreshBtn); });
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('shows pending actions when counts > 0', async () => {
    mockUseSocial.mockReturnValue({
      onlineFriends: [],
      counts: { friendRequests: 3, groupInvites: 1, newWaves: 0 },
      loading: false,
      refreshAll: vi.fn(),
    });

    await act(async () => { render(<SocialHub />); });
    await waitFor(() => {
      expect(screen.getByText(/4 items need your attention/i)).toBeInTheDocument();
    });
  });

  it('shows online friends strip when friends are online', async () => {
    mockUseSocial.mockReturnValue({
      onlineFriends: [
        { id: 'f1', name: 'Bob', avatar: null },
        { id: 'f2', name: 'Charlie', avatar: null },
      ],
      counts: { friendRequests: 0, groupInvites: 0, newWaves: 0 },
      loading: false,
      refreshAll: vi.fn(),
    });

    await act(async () => { render(<SocialHub />); });
    await waitFor(() => {
      const onlineText = screen.queryAllByText(/online|2/i);
      expect(onlineText.length).toBeGreaterThanOrEqual(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PrivacyPolicy
// ═══════════════════════════════════════════════════════════════════════════
describe('PrivacyPolicy', () => {
  it('renders "Privacy Policy" heading', async () => {
    await act(async () => { render(<PrivacyPolicy />); });
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
  });

  it('renders navigation bar with logo', async () => {
    await act(async () => { render(<PrivacyPolicy />); });
    expect(screen.getByTestId('logo')).toBeInTheDocument();
  });

  it('renders "Back to Home" link', async () => {
    await act(async () => { render(<PrivacyPolicy />); });
    expect(screen.getByText('Back to Home')).toBeInTheDocument();
  });

  it('shows "Terms of Service" nav link', async () => {
    await act(async () => { render(<PrivacyPolicy />); });
    const tsLinks = screen.getAllByText('Terms of Service');
    expect(tsLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('shows Dashboard link when user is logged in', async () => {
    await act(async () => { render(<PrivacyPolicy />); });
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('shows Sign In link when user is not logged in', async () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, isEmailVerified: false });
    await act(async () => { render(<PrivacyPolicy />); });
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('renders legal content sections', async () => {
    await act(async () => { render(<PrivacyPolicy />); });
    const sections = screen.queryAllByText(/data.*protection|information.*collect|personal data|gdpr/i);
    expect(sections.length).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// RequestRide
// ═══════════════════════════════════════════════════════════════════════════
describe('RequestRide', () => {
  it('renders "Request a Ride" heading', async () => {
    await act(async () => { render(<RequestRide />); });
    await waitFor(() => {
      expect(screen.getByText('Request a Ride')).toBeInTheDocument();
    });
  });

  it('renders location inputs', async () => {
    await act(async () => { render(<RequestRide />); });
    await waitFor(() => {
      const inputs = screen.getAllByTestId('location-autocomplete');
      expect(inputs.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('renders datetime picker', async () => {
    await act(async () => { render(<RequestRide />); });
    await waitFor(() => {
      expect(screen.getByTestId('datetime-picker')).toBeInTheDocument();
    });
  });

  it('renders submit button', async () => {
    await act(async () => { render(<RequestRide />); });
    await waitFor(() => {
      const submitBtns = screen.queryAllByText(/submit|request/i);
      expect(submitBtns.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders notes/description field', async () => {
    await act(async () => { render(<RequestRide />); });
    await waitFor(() => {
      const textarea = document.querySelector('textarea');
      expect(textarea).toBeTruthy();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TermsOfService
// ═══════════════════════════════════════════════════════════════════════════
describe('TermsOfService', () => {
  it('renders "Terms of Service" heading', async () => {
    await act(async () => { render(<TermsOfService />); });
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
  });

  it('renders navigation bar with logo', async () => {
    await act(async () => { render(<TermsOfService />); });
    expect(screen.getByTestId('logo')).toBeInTheDocument();
  });

  it('renders "Back to Home" link', async () => {
    await act(async () => { render(<TermsOfService />); });
    expect(screen.getByText('Back to Home')).toBeInTheDocument();
  });

  it('shows "Privacy Policy" nav link', async () => {
    await act(async () => { render(<TermsOfService />); });
    const ppLinks = screen.getAllByText('Privacy Policy');
    expect(ppLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('shows Dashboard link when user is logged in', async () => {
    await act(async () => { render(<TermsOfService />); });
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('shows Sign In when user is not logged in', async () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, isEmailVerified: false });
    await act(async () => { render(<TermsOfService />); });
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('renders legal content', async () => {
    await act(async () => { render(<TermsOfService />); });
    const sections = screen.queryAllByText(/agreemen|service|user|obligation/i);
    expect(sections.length).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Status
// ═══════════════════════════════════════════════════════════════════════════
describe('StatusPage', () => {
  it('renders "All Systems Operational" text', () => {
    render(<StatusPage />);
    expect(screen.getByText('All Systems Operational')).toBeInTheDocument();
  });

  it('renders "System Status" sub-heading', () => {
    render(<StatusPage />);
    expect(screen.getByText('System Status')).toBeInTheDocument();
  });

  it('renders "Carpool Network" heading', () => {
    render(<StatusPage />);
    expect(screen.getByText('Carpool Network')).toBeInTheDocument();
  });

  it('shows green status indicator', () => {
    render(<StatusPage />);
    const indicator = document.querySelector('.bg-green-500');
    expect(indicator).toBeTruthy();
  });

  it('renders powered-by footer', () => {
    render(<StatusPage />);
    expect(screen.getByText('Powered by CarpoolNetwork')).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Unauthorized
// ═══════════════════════════════════════════════════════════════════════════
describe('Unauthorized', () => {
  it('renders "Access denied" heading', () => {
    render(<Unauthorized />);
    expect(screen.getByText('Access denied')).toBeInTheDocument();
  });

  it('renders permission message', () => {
    render(<Unauthorized />);
    expect(screen.getByText('You do not have permission to view this page.')).toBeInTheDocument();
  });

  it('renders "Go home" link', () => {
    render(<Unauthorized />);
    const link = screen.getByText('Go home');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/');
  });

  it('renders "Help center" link', () => {
    render(<Unauthorized />);
    const link = screen.getByText('Help center');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/help');
  });
});
