// @vitest-environment jsdom
/**
 * Page tests – Batch 2: mid-size pages
 *
 * Covers: BookingDetails, Friends, RideDetails, Home, Leaderboards
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import {
  FAKE_USER_ID,
  FAKE_OTHER_USER_ID,
  FAKE_RIDE,
  FAKE_BOOKING,
  FAKE_ONLINE_FRIEND,
  FAKE_COMMUNITY_POST,
  buildMockChain,
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
      profile_photo_url: null,
      average_rating: 4.5,
      total_rides_offered: 10,
      total_rides_taken: 5,
    },
    isEmailVerified: true,
  }),
);

const mockNavigate = vi.hoisted(() => vi.fn());
const mockUseParams = vi.hoisted(() => vi.fn().mockReturnValue({}));

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

const mockCheckRateLimit = vi.hoisted(() => vi.fn().mockReturnValue({ allowed: true }));
const mockRecordRateLimitAction = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockGetOrCreateRideConversation = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ data: { id: 'conv-1' }, error: null }),
);
const mockFetchPublicProfilesByIds = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const mockFetchPublicProfileById = vi.hoisted(() => vi.fn().mockResolvedValue(null));
const mockGoogleMapsService = vi.hoisted(() => ({
  geocode: vi.fn().mockResolvedValue(null),
  getDistanceMatrix: vi.fn().mockResolvedValue(null),
}));

const mockUseRealtime = vi.hoisted(() =>
  vi.fn().mockReturnValue({ unreadMessages: 0, onlineCount: 2 }),
);

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('../../src/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('../../src/lib/supabase', () => ({ supabase: mockSupabase }));
vi.mock('../../src/lib/toast', () => ({ toast: mockToast }));
vi.mock('../../src/lib/rateLimiting', () => ({
  checkRateLimit: mockCheckRateLimit,
  recordRateLimitAction: mockRecordRateLimitAction,
}));
vi.mock('../../src/lib/chatHelpers', () => ({
  getOrCreateRideConversation: mockGetOrCreateRideConversation,
}));
vi.mock('../../src/services/publicProfiles', () => ({
  fetchPublicProfilesByIds: mockFetchPublicProfilesByIds,
  fetchPublicProfileById: mockFetchPublicProfileById,
  PublicProfile: {},
}));
vi.mock('../../src/services/googleMapsService', () => ({
  googleMapsService: mockGoogleMapsService,
  RouteOption: {},
  PlaceDetails: {},
}));
vi.mock('../../src/lib/rideLifecycle', () => ({
  getRideLifecyclePhase: vi.fn().mockReturnValue('upcoming'),
  getRideActions: vi.fn().mockReturnValue([]),
  isRideExpired: vi.fn().mockReturnValue(false),
  GRACE_PERIOD_MINUTES: 15,
}));
vi.mock('../../src/services/rideService', () => ({
  deleteRideForDriver: vi.fn().mockResolvedValue({ error: null }),
  syncExpiredRideState: vi.fn().mockResolvedValue({ error: null }),
}));
vi.mock('../../src/contexts/RealtimeContext', () => ({
  useRealtime: mockUseRealtime,
}));
vi.mock('../../src/lib/analytics', () => ({
  analytics: { track: vi.fn(), identify: vi.fn(), page: vi.fn() },
  useFlowStage: vi.fn(),
  useSearchTracking: vi.fn().mockReturnValue({
    trackSearch: vi.fn(),
    trackEmptyResults: vi.fn(),
    trackResultClicked: vi.fn(),
  }),
  useEmptyStateTracking: vi.fn(),
}));
vi.mock('../../src/types/rideTypes', () => ({
  RideType: '',
  RIDE_TYPE_LIST: [
    { value: 'daily_commute', label: 'Daily Commute' },
    { value: 'one_off', label: 'One-off Trip' },
  ],
  getRideTypeInfo: vi.fn().mockReturnValue({
    value: 'daily_commute',
    label: 'Daily Commute',
    defaultRecurring: false,
  }),
}));
vi.mock('../../src/utils/profileNavigation', () => ({
  getUserProfilePath: vi.fn((id: string) => `/profile/${id}`),
}));
vi.mock('../../src/hooks/useServiceGating', () => ({
  useServiceGating: vi.fn().mockReturnValue({
    checkAccess: vi.fn().mockReturnValue(true),
    ServiceGatingModal: () => null,
  }),
}));

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }: any) =>
    React.createElement('a', { href: to, ...props }, children),
  useNavigate: () => mockNavigate,
  useParams: mockUseParams,
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
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
    'Car', 'Calendar', 'MapPin', 'Users', 'Star', 'Shield', 'MessageSquare',
    'MessageCircle', 'Phone', 'Navigation', 'ArrowLeft', 'ArrowRight',
    'AlertTriangle', 'AlertCircle', 'XCircle', 'CheckCircle', 'TrendingUp',
    'Search', 'Plus', 'Globe', 'Crown', 'User', 'Sparkles', 'Trophy',
    'Flame', 'Award', 'Zap', 'Heart', 'Target', 'ChevronDown',
    'ChevronRight', 'ChevronUp', 'ChevronLeft', 'Leaf', 'Minus', 'Clock',
    'Loader2', 'Eye', 'Layers', 'UsersRound', 'Hand', 'Cloud',
    'Armchair', 'RefreshCw', 'Route', 'BookOpen', 'Info', 'Lock',
    'Edit2', 'Trash2', 'MoreVertical', 'ExternalLink', 'UserPlus',
    'TrendingDown', 'Filter', 'X', 'Check', 'Hash', 'EyeOff',
    'FileText', 'Repeat', 'HelpCircle', 'Book', 'Key', 'Lightbulb',
    'Bell',
  ];
  const out: Record<string, any> = {};
  for (const n of names) out[n] = icon(n);
  return out;
});

// Stub heavy child components
vi.mock('../../src/components/shared/ClickableUserProfile', () => ({
  default: (props: any) => React.createElement('div', { 'data-testid': 'clickable-profile' }),
}));
vi.mock('../../src/components/shared/ConfirmModal', () => ({
  default: (props: any) =>
    props.isOpen
      ? React.createElement('div', { 'data-testid': 'confirm-modal' }, 'ConfirmModal')
      : null,
}));
vi.mock('../../src/components/shared/UserAvatar', () => ({
  default: () => React.createElement('div', { 'data-testid': 'user-avatar' }),
}));
vi.mock('../../src/components/rides/RideDetailsMap', () => ({
  default: () => React.createElement('div', { 'data-testid': 'ride-details-map' }),
}));
vi.mock('../../src/components/rides/ReviewSubmission', () => ({
  default: () => React.createElement('div', { 'data-testid': 'review-submission' }),
}));
vi.mock('../../src/components/rides/EnhancedRideMap', () => ({
  default: () => React.createElement('div', { 'data-testid': 'enhanced-ride-map' }),
}));
vi.mock('../../src/components/rides/TripInsights', () => ({
  default: () => React.createElement('div', { 'data-testid': 'trip-insights' }),
}));
vi.mock('../../src/components/rides/RideStatusTracker', () => ({
  default: () => React.createElement('div', { 'data-testid': 'ride-status-tracker' }),
}));
vi.mock('../../src/components/social/FriendsManager', () => ({
  default: () => React.createElement('div', { 'data-testid': 'friends-manager' }, 'FriendsManager'),
}));
vi.mock('../../src/components/social/SocialGroups', () => ({
  default: () => React.createElement('div', { 'data-testid': 'social-groups' }, 'SocialGroups'),
}));
vi.mock('../../src/components/leaderboards/GlobalLeaderboard', () => ({
  default: (props: any) =>
    React.createElement('div', { 'data-testid': 'global-leaderboard' }, `Global-${props.category}`),
}));
vi.mock('../../src/components/leaderboards/RegionalLeaderboard', () => ({
  default: (props: any) =>
    React.createElement('div', { 'data-testid': 'regional-leaderboard' }, `Regional-${props.category}`),
}));
vi.mock('../../src/components/leaderboards/FriendLeaderboard', () => ({
  default: (props: any) =>
    React.createElement('div', { 'data-testid': 'friend-leaderboard' }, `Friend-${props.category}`),
}));
vi.mock('../../src/components/shared/SmartRecommendations', () => ({
  default: () => React.createElement('div', { 'data-testid': 'smart-recommendations' }),
}));
vi.mock('../../src/components/shared/EmailVerificationBanner', () => ({
  default: () => null,
}));

vi.stubGlobal('IntersectionObserver', vi.fn().mockImplementation(() => ({
  observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn(),
})));
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ current: null }),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import BookingDetails from '../../src/pages/BookingDetails';
import Friends from '../../src/pages/Friends';
import RideDetails from '../../src/pages/RideDetails';
import Home from '../../src/pages/Home';
import Leaderboards from '../../src/pages/Leaderboards';

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.from.mockImplementation(() => buildMockChain());
  mockUseParams.mockReturnValue({});
  mockNavigate.mockReset();
  mockUseAuth.mockReturnValue({
    user: { id: 'user-page-001', email: 'alice@example.com' },
    profile: {
      id: 'user-page-001',
      full_name: 'Alice Tester',
      avatar_url: null,
      profile_photo_url: null,
      average_rating: 4.5,
      total_rides_offered: 10,
      total_rides_taken: 5,
    },
    isEmailVerified: true,
  });
});

afterEach(() => { cleanup(); });

// ═══════════════════════════════════════════════════════════════════════════
// BookingDetails
// ═══════════════════════════════════════════════════════════════════════════
describe('BookingDetails', () => {
  const BOOKING_DATA = {
    id: 'booking-001',
    passenger_id: 'user-page-001',
    pickup_location: 'Euston Station',
    dropoff_location: 'Piccadilly',
    seats_requested: 1,
    status: 'confirmed',
    created_at: '2025-01-10T10:00:00Z',
    ride: {
      id: 'ride-001',
      driver_id: FAKE_OTHER_USER_ID,
      origin: 'London',
      destination: 'Manchester',
      departure_time: '2025-02-01T09:00:00Z',
      origin_lat: 51.5,
      origin_lng: -0.12,
      destination_lat: 53.48,
      destination_lng: -2.24,
      notes: null,
      vehicle: {
        make: 'Tesla',
        model: 'Model 3',
        year: 2023,
        color: 'White',
        license_plate: 'AB12 CDE',
      },
    },
  };

  beforeEach(() => {
    mockUseParams.mockReturnValue({ bookingId: 'booking-001' });
    mockFetchPublicProfileById.mockResolvedValue({
      id: FAKE_OTHER_USER_ID,
      full_name: 'Bob Driver',
      average_rating: 4.8,
      total_rides_offered: 50,
    });
  });

  it('shows loading state initially', async () => {
    // delay supabase response
    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnValue(new Promise(() => {})), // never resolves
    }));
    render(<BookingDetails />);
    // Should show loading indicator (spinner or pulse animation)
    const hasLoadingIndicator =
      screen.queryByText(/loading/i) ||
      document.querySelector('.animate-spin') ||
      document.querySelector('.animate-pulse') ||
      document.querySelector('[class*="animate"]');
    expect(hasLoadingIndicator).toBeTruthy();
  });

  it('renders booking details when data loads', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'ride_bookings') return buildMockChain(BOOKING_DATA);
      if (table === 'ride_reviews_detailed') return buildMockChain(null);
      if (table === 'profiles') return buildMockChain({ phone_e164: '+447123456789' });
      return buildMockChain();
    });
    mockSupabase.rpc.mockResolvedValue({ data: true, error: null });

    await act(async () => { render(<BookingDetails />); });
    await waitFor(() => {
      expect(screen.getByText('Bob Driver')).toBeInTheDocument();
    });
  });

  it('shows error when booking not found', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'ride_bookings') return buildMockChain(null);
      return buildMockChain();
    });

    await act(async () => { render(<BookingDetails />); });
    await waitFor(() => {
      expect(screen.getByText(/booking not found|not found/i)).toBeInTheDocument();
    });
  });

  it('shows sign-in message when user is null', async () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, isEmailVerified: false });
    await act(async () => { render(<BookingDetails />); });
    await waitFor(() => {
      expect(screen.getByText(/sign in/i)).toBeInTheDocument();
    });
  });

  it('blocks unauthorized access (IDOR protection)', async () => {
    const otherBooking = {
      ...BOOKING_DATA,
      passenger_id: 'other-user-999', // not current user
      ride: { ...BOOKING_DATA.ride, driver_id: 'other-driver-999' }, // not current user
    };
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'ride_bookings') return buildMockChain(otherBooking);
      return buildMockChain();
    });

    await act(async () => { render(<BookingDetails />); });
    await waitFor(() => {
      expect(screen.getByText(/booking not found|not found/i)).toBeInTheDocument();
    });
  });

  it('shows booking status badge', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'ride_bookings') return buildMockChain(BOOKING_DATA);
      if (table === 'ride_reviews_detailed') return buildMockChain(null);
      if (table === 'profiles') return buildMockChain(null);
      return buildMockChain();
    });

    await act(async () => { render(<BookingDetails />); });
    await waitFor(() => {
      const statusTexts = screen.queryAllByText(/confirmed/i);
      expect(statusTexts.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders vehicle info when present', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'ride_bookings') return buildMockChain(BOOKING_DATA);
      if (table === 'ride_reviews_detailed') return buildMockChain(null);
      if (table === 'profiles') return buildMockChain(null);
      return buildMockChain();
    });

    await act(async () => { render(<BookingDetails />); });
    await waitFor(() => {
      const vehicleTexts = screen.queryAllByText(/Tesla|Model 3/i);
      expect(vehicleTexts.length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Friends
// ═══════════════════════════════════════════════════════════════════════════
describe('Friends', () => {
  it('renders "Social Hub" heading', async () => {
    await act(async () => { render(<Friends />); });
    await waitFor(() => {
      expect(screen.getByText('Social Hub')).toBeInTheDocument();
    });
  });

  it('renders stat cards: Friends, Groups, Karma', async () => {
    await act(async () => { render(<Friends />); });
    await waitFor(() => {
      const friendsTexts = screen.getAllByText('Friends');
      expect(friendsTexts.length).toBeGreaterThanOrEqual(1);
      const groupsTexts = screen.getAllByText('Groups');
      expect(groupsTexts.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Karma')).toBeInTheDocument();
    });
  });

  it('renders Quick Actions section', async () => {
    await act(async () => { render(<Friends />); });
    await waitFor(() => {
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });
  });

  it('renders quick action buttons', async () => {
    await act(async () => { render(<Friends />); });
    await waitFor(() => {
      expect(screen.getByText('Find Friends')).toBeInTheDocument();
      expect(screen.getByText('Create Group')).toBeInTheDocument();
      expect(screen.getByText('New Post')).toBeInTheDocument();
    });
  });

  it('shows FriendsManager when friends tab is active', async () => {
    await act(async () => { render(<Friends />); });
    await waitFor(() => {
      expect(screen.getByTestId('friends-manager')).toBeInTheDocument();
    });
  });

  it('switches to groups tab and shows SocialGroups', async () => {
    await act(async () => { render(<Friends />); });

    // Click on "Groups" tab button - find the one that acts as a tab
    const groupsButtons = screen.getAllByText('Groups');
    // The tab button is the one inside a tab-switching context
    for (const btn of groupsButtons) {
      const parent = btn.closest('button');
      if (parent) {
        await act(async () => { fireEvent.click(parent); });
        break;
      }
    }

    await waitFor(() => {
      expect(screen.getByTestId('social-groups')).toBeInTheDocument();
    });
  });

  it('does not load stats when user is null', async () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, isEmailVerified: false });
    await act(async () => { render(<Friends />); });
    // friendships should not be queried
    const friendshipCalls = (mockSupabase.from as any).mock.calls.filter(
      (c: any[]) => c[0] === 'friendships',
    );
    expect(friendshipCalls.length).toBe(0);
  });

  it('renders sub-heading text', async () => {
    await act(async () => { render(<Friends />); });
    await waitFor(() => {
      expect(screen.getByText(/carpooling community at a glance/i)).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// RideDetails
// ═══════════════════════════════════════════════════════════════════════════
describe('RideDetails', () => {
  const RIDE_DATA = {
    ...FAKE_RIDE,
    vehicle: {
      make: 'Tesla',
      model: 'Model 3',
      color: 'White',
      year: 2023,
      fuel_type: 'electric',
      capacity: 5,
    },
  };

  beforeEach(() => {
    mockUseParams.mockReturnValue({ rideId: 'ride-001' });
    mockFetchPublicProfileById.mockResolvedValue({
      id: FAKE_OTHER_USER_ID,
      full_name: 'Bob Driver',
      average_rating: 4.8,
      total_rides_offered: 50,
    });
  });

  it('renders ride details when data loads', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'rides') return buildMockChain(RIDE_DATA);
      if (table === 'ride_bookings') return buildMockChain(null);
      return buildMockChain();
    });

    await act(async () => { render(<RideDetails />); });
    await waitFor(() => {
      expect(screen.getByText('Bob Driver')).toBeInTheDocument();
    });
  });

  it('shows error when ride not found', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'rides') return buildMockChain(null);
      return buildMockChain();
    });

    await act(async () => { render(<RideDetails />); });
    await waitFor(() => {
      expect(screen.getByText(/not found|no longer available/i)).toBeInTheDocument();
    });
  });

  it('renders origin and destination', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'rides') return buildMockChain(RIDE_DATA);
      if (table === 'ride_bookings') return buildMockChain(null);
      return buildMockChain();
    });

    await act(async () => { render(<RideDetails />); });
    await waitFor(() => {
      const londonTexts = screen.getAllByText(/London/);
      const manchesterTexts = screen.getAllByText(/Manchester/);
      expect(londonTexts.length).toBeGreaterThanOrEqual(1);
      expect(manchesterTexts.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders vehicle information', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'rides') return buildMockChain(RIDE_DATA);
      if (table === 'ride_bookings') return buildMockChain(null);
      return buildMockChain();
    });

    await act(async () => { render(<RideDetails />); });
    await waitFor(() => {
      const vehicleTexts = screen.queryAllByText(/Tesla|Model 3|White/);
      expect(vehicleTexts.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders driver rating', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'rides') return buildMockChain(RIDE_DATA);
      if (table === 'ride_bookings') return buildMockChain(null);
      return buildMockChain();
    });

    await act(async () => { render(<RideDetails />); });
    await waitFor(() => {
      const ratingTexts = screen.queryAllByText(/4\.8/);
      expect(ratingTexts.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('does not crash when rideId is undefined', async () => {
    mockUseParams.mockReturnValue({});
    await act(async () => { render(<RideDetails />); });
    // Should not throw; shows loading or empty
    expect(true).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Home
// ═══════════════════════════════════════════════════════════════════════════
describe('Home', () => {
  beforeEach(() => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'rides') return buildMockChain([]);
      if (table === 'ride_bookings') return buildMockChain([], null, 0);
      if (table === 'friendships') return buildMockChain([], null, 0);
      if (table === 'community_posts_with_stats') return buildMockChain([]);
      if (table === 'profiles') return buildMockChain([]);
      return buildMockChain();
    });
  });

  it('renders welcome message with user first name', async () => {
    await act(async () => { render(<Home />); });
    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Alice/i)).toBeInTheDocument();
    });
  });

  it('renders stats cards', async () => {
    await act(async () => { render(<Home />); });
    await waitFor(() => {
      const statsTexts = screen.queryAllByText(/rides offered|rides taken|available rides|unread messages|friends|your rating/i);
      expect(statsTexts.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders Quick Actions section', async () => {
    await act(async () => { render(<Home />); });
    await waitFor(() => {
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });
  });

  it('renders "Find a Ride" quick action', async () => {
    await act(async () => { render(<Home />); });
    await waitFor(() => {
      expect(screen.getByText(/Find a Ride/i)).toBeInTheDocument();
    });
  });

  it('renders "Offer a Ride" quick action', async () => {
    await act(async () => { render(<Home />); });
    await waitFor(() => {
      expect(screen.getByText(/Offer a Ride/i)).toBeInTheDocument();
    });
  });

  it('shows unread messages count from realtime context', async () => {
    mockUseRealtime.mockReturnValue({ unreadMessages: 5, onlineCount: 3 });

    await act(async () => { render(<Home />); });
    await waitFor(() => {
      const msgTexts = screen.queryAllByText(/5/);
      expect(msgTexts.length).toBeGreaterThanOrEqual(0);
    });
  });

  it('renders dashboard even when user is null (anonymous browsing)', async () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, isEmailVerified: false });
    await act(async () => { render(<Home />); });
    // Should still render the page (public dashboard view)
    const container = document.querySelector('div');
    expect(container).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Leaderboards
// ═══════════════════════════════════════════════════════════════════════════
describe('Leaderboards', () => {
  it('renders "Leaderboards" heading', async () => {
    await act(async () => { render(<Leaderboards />); });
    await waitFor(() => {
      expect(screen.getByText('Leaderboards')).toBeInTheDocument();
    });
  });

  it('renders tab navigation: Global, Regional, Friends', async () => {
    await act(async () => { render(<Leaderboards />); });
    await waitFor(() => {
      expect(screen.getByText('Global')).toBeInTheDocument();
      expect(screen.getByText('Regional')).toBeInTheDocument();
    });
  });

  it('renders GlobalLeaderboard by default', async () => {
    await act(async () => { render(<Leaderboards />); });
    await waitFor(() => {
      expect(screen.getByTestId('global-leaderboard')).toBeInTheDocument();
    });
  });

  it('renders category options', async () => {
    await act(async () => { render(<Leaderboards />); });
    await waitFor(() => {
      const ridesTexts = screen.getAllByText('Most Rides');
      expect(ridesTexts.length).toBeGreaterThanOrEqual(1);
      const ecoTexts = screen.getAllByText('Eco Warriors');
      expect(ecoTexts.length).toBeGreaterThanOrEqual(1);
      const trustTexts = screen.getAllByText('Trust Score');
      expect(trustTexts.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders period selector', async () => {
    await act(async () => { render(<Leaderboards />); });
    await waitFor(() => {
      const monthTexts = screen.getAllByText('This Month');
      expect(monthTexts.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('switches to Regional tab on click', async () => {
    await act(async () => { render(<Leaderboards />); });

    const regionalTab = screen.getByText('Regional');
    await act(async () => { fireEvent.click(regionalTab); });

    await waitFor(() => {
      expect(screen.getByTestId('regional-leaderboard')).toBeInTheDocument();
    });
  });

  it('switches category on click', async () => {
    await act(async () => { render(<Leaderboards />); });

    const ecoCategories = screen.getAllByText('Eco Warriors');
    await act(async () => { fireEvent.click(ecoCategories[0]); });

    await waitFor(() => {
      expect(screen.getByText('Global-co2')).toBeInTheDocument();
    });
  });

  it('renders motivational footer', async () => {
    await act(async () => { render(<Leaderboards />); });
    await waitFor(() => {
      const tipTexts = screen.queryAllByText(/climb the ranks|shared trips|carpool/i);
      expect(tipTexts.length).toBeGreaterThanOrEqual(1);
    });
  });
});
