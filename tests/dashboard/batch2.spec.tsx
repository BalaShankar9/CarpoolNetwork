// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

import {
  FAKE_USER,
  FAKE_PROFILE,
  FAKE_RIDES_RAW,
  FAKE_REVIEWS,
  FAKE_BOOKINGS_RAW,
  FAKE_UPCOMING_RIDES,
  FAKE_PENDING_BOOKINGS,
  FAKE_PENDING_MATCHES,
  buildMockChain,
} from './helpers';

/* ── hoisted mocks ── */
const mocks = vi.hoisted(() => {
  const navigate = vi.fn();
  return {
    navigate,
    fromFn: vi.fn(),
    useAuthReturn: {
      user: null as any,
      profile: null as any,
      loading: false,
      signOut: vi.fn(),
    },
  };
});

vi.mock('../../src/lib/supabase', () => ({
  supabase: { from: mocks.fromFn },
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => mocks.useAuthReturn,
}));

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...rest }: any) => <a href={to} {...rest}>{children}</a>,
  useNavigate: () => mocks.navigate,
}));

vi.mock('lucide-react', () => {
  const stub = (name: string) => (p: any) => <span data-testid={`icon-${name}`} {...p} />;
  return {
    Car: stub('Car'),
    Users: stub('Users'),
    Star: stub('Star'),
    Calendar: stub('Calendar'),
    Clock: stub('Clock'),
    MapPin: stub('MapPin'),
    Target: stub('Target'),
    Award: stub('Award'),
    Leaf: stub('Leaf'),
    ChevronRight: stub('ChevronRight'),
    AlertCircle: stub('AlertCircle'),
    CheckCircle2: stub('CheckCircle2'),
  };
});

// MatchScoreBadge stub
vi.mock('../../src/components/rides/MatchScoreDisplay', () => ({
  MatchScoreBadge: ({ score }: { score: number }) => (
    <span data-testid="match-score">{score}%</span>
  ),
}));

// ClickableUserProfile stub
vi.mock('../../src/components/shared/ClickableUserProfile', () => ({
  __esModule: true,
  default: ({ user }: any) => <span data-testid="clickable-user">{user.full_name}</span>,
}));

import DriverDashboard from '../../src/components/dashboard/DriverDashboard';

afterEach(cleanup);

/* ══════════════════════════════════════════════
   Helper: set up full data mock sequence
   The component makes several sequential supabase calls:
   1. Promise.all: rides → from('rides'), reviews → from('ride_reviews_detailed')
   2. bookings → from('ride_bookings')
   3. upcoming → from('rides')
   4. pending bookings → from('ride_bookings')
   5. matches → from('trip_requests_matches')
   ══════════════════════════════════════════════ */
function setupFullDataMock(overrides: {
  rides?: any;
  reviews?: any;
  bookings?: any;
  upcoming?: any;
  pending?: any;
  matches?: any;
} = {}) {
  const callSequence: any[] = [];
  const defaultData = {
    rides: overrides.rides ?? FAKE_RIDES_RAW,
    reviews: overrides.reviews ?? FAKE_REVIEWS,
    bookings: overrides.bookings ?? FAKE_BOOKINGS_RAW,
    upcoming: overrides.upcoming ?? FAKE_UPCOMING_RIDES,
    pending: overrides.pending ?? FAKE_PENDING_BOOKINGS,
    matches: overrides.matches ?? FAKE_PENDING_MATCHES,
  };

  mocks.fromFn.mockImplementation((table: string) => {
    callSequence.push(table);

    switch (table) {
      case 'rides': {
        // Could be stats call or upcoming call
        const isUpcomingCall = callSequence.filter(t => t === 'rides').length > 1;
        return buildMockChain(isUpcomingCall ? defaultData.upcoming : defaultData.rides, null);
      }
      case 'ride_reviews_detailed':
        return buildMockChain(defaultData.reviews, null);
      case 'ride_bookings': {
        const bookingCalls = callSequence.filter(t => t === 'ride_bookings').length;
        // First call is for stats, second is for pending bookings, third+ is for approve/reject
        if (bookingCalls <= 1) return buildMockChain(defaultData.bookings, null);
        return buildMockChain(defaultData.pending, null);
      }
      case 'trip_requests_matches':
        return buildMockChain(defaultData.matches, null);
      default:
        return buildMockChain([], null);
    }
  });

  return callSequence;
}

/* ══════════════════════════════════════════════
   DriverDashboard component
   ══════════════════════════════════════════════ */
describe('DriverDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuthReturn.user = null;
    mocks.useAuthReturn.profile = null;
  });

  /* ── loading state ── */
  it('shows loading spinner initially', () => {
    mocks.useAuthReturn.user = FAKE_USER;
    mocks.useAuthReturn.profile = FAKE_PROFILE;

    // Never-resolving chain
    const chain = buildMockChain([], null);
    mocks.fromFn.mockReturnValue(chain);

    const { container } = render(<DriverDashboard />);
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  /* ── header ── */
  it('renders header and Post New Ride button', async () => {
    mocks.useAuthReturn.user = FAKE_USER;
    mocks.useAuthReturn.profile = FAKE_PROFILE;
    setupFullDataMock();

    render(<DriverDashboard />);
    await waitFor(() => expect(screen.getByText('Driver Dashboard')).toBeTruthy());

    expect(screen.getByText('Manage your rides and bookings')).toBeTruthy();
    expect(screen.getByText('Post New Ride')).toBeTruthy();
  });

  it('navigates to post-ride on button click', async () => {
    mocks.useAuthReturn.user = FAKE_USER;
    mocks.useAuthReturn.profile = FAKE_PROFILE;
    setupFullDataMock();

    render(<DriverDashboard />);
    await waitFor(() => expect(screen.getByText('Post New Ride')).toBeTruthy());

    fireEvent.click(screen.getByText('Post New Ride'));
    expect(mocks.navigate).toHaveBeenCalledWith('/post-ride');
  });

  /* ── stat cards ── */
  describe('stat cards', () => {
    beforeEach(async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.useAuthReturn.profile = FAKE_PROFILE;
      setupFullDataMock();
    });

    it('shows total rides count', async () => {
      render(<DriverDashboard />);
      await waitFor(() => expect(screen.getByText('Total Rides')).toBeTruthy());
      // 2 completed rides
      expect(screen.getByText('2')).toBeTruthy();
    });

    it('shows passengers count', async () => {
      render(<DriverDashboard />);
      await waitFor(() => expect(screen.getByText('Passengers')).toBeTruthy());
      // 2 completed bookings: 2+1 = 3 passengers
      expect(screen.getByText('3')).toBeTruthy();
    });

    it('shows average rating', async () => {
      render(<DriverDashboard />);
      await waitFor(() => expect(screen.getByText('Avg Rating')).toBeTruthy());
      // (5+4+4.5)/3 = 4.5
      expect(screen.getByText('4.5')).toBeTruthy();
    });

    it('shows CO2 saved', async () => {
      render(<DriverDashboard />);
      await waitFor(() => expect(screen.getByText(/CO₂ Saved/)).toBeTruthy());
      // total distance = 30+20+15 = 65; co2 = 65*0.12 = 7.8 → "8"
      expect(screen.getByText('8')).toBeTruthy();
    });
  });

  /* ── pending actions alert ── */
  it('shows pending actions alert when there are pending bookings/matches', async () => {
    mocks.useAuthReturn.user = FAKE_USER;
    mocks.useAuthReturn.profile = FAKE_PROFILE;
    setupFullDataMock();

    render(<DriverDashboard />);
    await waitFor(() => expect(screen.getByText('Actions Required')).toBeTruthy());
    expect(screen.getByText(/1 pending booking\(s\) and 1 potential match\(es\)/)).toBeTruthy();
  });

  it('hides pending actions alert when none pending', async () => {
    mocks.useAuthReturn.user = FAKE_USER;
    mocks.useAuthReturn.profile = FAKE_PROFILE;
    setupFullDataMock({ pending: [], matches: [] });

    render(<DriverDashboard />);
    await waitFor(() => expect(screen.getByText('Driver Dashboard')).toBeTruthy());
    expect(screen.queryByText('Actions Required')).toBeNull();
  });

  /* ── overview tab — pending bookings ── */
  describe('overview tab - pending bookings', () => {
    it('shows pending bookings section', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.useAuthReturn.profile = FAKE_PROFILE;
      setupFullDataMock();

      render(<DriverDashboard />);
      await waitFor(() => expect(screen.getByText('Pending Bookings')).toBeTruthy());

      expect(screen.getAllByText('Alice Rider').length).toBeGreaterThan(0);
      expect(screen.getByText(/1 seat\(s\) • Train Station/)).toBeTruthy();
    });

    it('shows empty pending bookings state', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.useAuthReturn.profile = FAKE_PROFILE;
      setupFullDataMock({ pending: [] });

      render(<DriverDashboard />);
      await waitFor(() => expect(screen.getByText('No pending bookings')).toBeTruthy());
    });

    it('approve booking calls supabase update', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.useAuthReturn.profile = FAKE_PROFILE;
      setupFullDataMock();

      render(<DriverDashboard />);
      await waitFor(() => expect(screen.getByText('Approve')).toBeTruthy());

      fireEvent.click(screen.getByText('Approve'));
      await waitFor(() =>
        expect(mocks.fromFn).toHaveBeenCalledWith('ride_bookings')
      );
    });

    it('reject booking calls supabase update', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.useAuthReturn.profile = FAKE_PROFILE;
      setupFullDataMock();

      render(<DriverDashboard />);
      await waitFor(() => expect(screen.getByText('Reject')).toBeTruthy());

      fireEvent.click(screen.getByText('Reject'));
      await waitFor(() =>
        expect(mocks.fromFn).toHaveBeenCalledWith('ride_bookings')
      );
    });
  });

  /* ── overview tab — upcoming rides ── */
  describe('overview tab - upcoming rides', () => {
    it('shows upcoming rides section', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.useAuthReturn.profile = FAKE_PROFILE;
      setupFullDataMock();

      render(<DriverDashboard />);
      await waitFor(() => {
        const headings = screen.getAllByText('Upcoming Rides');
        expect(headings.length).toBeGreaterThan(0);
      });

      expect(screen.getByText(/City Center → Beach/)).toBeTruthy();
    });

    it('shows empty upcoming rides state', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.useAuthReturn.profile = FAKE_PROFILE;
      setupFullDataMock({ upcoming: [] });

      render(<DriverDashboard />);
      await waitFor(() => expect(screen.getByText('No upcoming rides')).toBeTruthy());
    });

    it('navigates to ride details on click', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.useAuthReturn.profile = FAKE_PROFILE;
      setupFullDataMock();

      render(<DriverDashboard />);
      await waitFor(() => expect(screen.getByText(/City Center → Beach/)).toBeTruthy());

      fireEvent.click(screen.getByText(/City Center → Beach/));
      expect(mocks.navigate).toHaveBeenCalledWith('/rides/ur1');
    });
  });

  /* ── rides tab ── */
  describe('rides tab', () => {
    it('shows full upcoming rides list', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.useAuthReturn.profile = FAKE_PROFILE;
      setupFullDataMock();

      render(<DriverDashboard />);
      await waitFor(() => expect(screen.getByText('Driver Dashboard')).toBeTruthy());

      // Click rides tab
      const ridesTab = screen.getByText(/Upcoming Rides \(1\)/);
      fireEvent.click(ridesTab);

      await waitFor(() => {
        // In rides tab the item shows booked count
        expect(screen.getByText(/1\/3 booked/)).toBeTruthy();
      });
    });

    it('shows empty rides tab state', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.useAuthReturn.profile = FAKE_PROFILE;
      setupFullDataMock({ upcoming: [] });

      render(<DriverDashboard />);
      await waitFor(() => expect(screen.getByText('Driver Dashboard')).toBeTruthy());

      const ridesTab = screen.getByText(/Upcoming Rides \(0\)/);
      fireEvent.click(ridesTab);

      await waitFor(() =>
        expect(screen.getByText('No Upcoming Rides')).toBeTruthy()
      );
      expect(screen.getByText('Post a ride to start accepting passengers')).toBeTruthy();
    });

    it('navigates to post-ride from empty rides tab', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.useAuthReturn.profile = FAKE_PROFILE;
      setupFullDataMock({ upcoming: [] });

      render(<DriverDashboard />);
      await waitFor(() => expect(screen.getByText('Driver Dashboard')).toBeTruthy());

      fireEvent.click(screen.getByText(/Upcoming Rides \(0\)/));
      await waitFor(() => expect(screen.getByText('Post a Ride')).toBeTruthy());

      fireEvent.click(screen.getByText('Post a Ride'));
      expect(mocks.navigate).toHaveBeenCalledWith('/post-ride');
    });
  });

  /* ── matches tab ── */
  describe('matches tab', () => {
    it('shows matches list with scores', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.useAuthReturn.profile = FAKE_PROFILE;
      setupFullDataMock();

      render(<DriverDashboard />);
      await waitFor(() => expect(screen.getByText('Driver Dashboard')).toBeTruthy());

      const matchesTab = screen.getByText(/Matches \(1\)/);
      fireEvent.click(matchesTab);

      await waitFor(() => expect(screen.getByText('Bob Commuter')).toBeTruthy());
      expect(screen.getByText('92%')).toBeTruthy();
      expect(screen.getByText(/Park Ave → Beach/)).toBeTruthy();
      expect(screen.getByText('View Match')).toBeTruthy();
    });

    it('shows empty matches state', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.useAuthReturn.profile = FAKE_PROFILE;
      setupFullDataMock({ matches: [] });

      render(<DriverDashboard />);
      await waitFor(() => expect(screen.getByText('Driver Dashboard')).toBeTruthy());

      fireEvent.click(screen.getByText(/Matches \(0\)/));

      await waitFor(() =>
        expect(screen.getByText('No Potential Matches')).toBeTruthy()
      );
      expect(screen.getByText(/When passengers request rides that match your routes/)).toBeTruthy();
    });

    it('navigates to ride match on View Match click', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.useAuthReturn.profile = FAKE_PROFILE;
      setupFullDataMock();

      render(<DriverDashboard />);
      await waitFor(() => expect(screen.getByText('Driver Dashboard')).toBeTruthy());

      fireEvent.click(screen.getByText(/Matches \(1\)/));
      await waitFor(() => expect(screen.getByText('View Match')).toBeTruthy());

      fireEvent.click(screen.getByText('View Match'));
      expect(mocks.navigate).toHaveBeenCalledWith('/rides/ur1?match=pm1');
    });
  });

  /* ── tabs highlight ── */
  describe('tab highlighting', () => {
    it('defaults to overview tab', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.useAuthReturn.profile = FAKE_PROFILE;
      setupFullDataMock();

      render(<DriverDashboard />);
      await waitFor(() => expect(screen.getByText('Overview')).toBeTruthy());
      expect(screen.getByText('Overview').className).toContain('border-blue-600');
    });

    it('highlights rides tab when selected', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.useAuthReturn.profile = FAKE_PROFILE;
      setupFullDataMock();

      render(<DriverDashboard />);
      await waitFor(() => expect(screen.getByText('Driver Dashboard')).toBeTruthy());

      const ridesTab = screen.getByText(/Upcoming Rides \(1\)/);
      fireEvent.click(ridesTab);

      await waitFor(() =>
        expect(ridesTab.className).toContain('border-blue-600')
      );
    });
  });

  /* ── error handling ── */
  it('handles API errors gracefully', async () => {
    mocks.useAuthReturn.user = FAKE_USER;
    mocks.useAuthReturn.profile = FAKE_PROFILE;

    mocks.fromFn.mockImplementation(() => {
      throw new Error('network');
    });

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<DriverDashboard />);

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith('Error loading dashboard:', expect.anything())
    );
    spy.mockRestore();
  });
});
