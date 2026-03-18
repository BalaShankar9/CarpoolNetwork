// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

import {
  FAKE_USER,
  FAKE_PROFILE,
  FAKE_OFFERED_RIDES,
  FAKE_BOOKED_RIDES,
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
    Calendar: stub('Calendar'),
    Star: stub('Star'),
    Settings: stub('Settings'),
    MapPin: stub('MapPin'),
    Users: stub('Users'),
  };
});

import Dashboard from '../../src/components/dashboard/Dashboard';

afterEach(cleanup);

/* ══════════════════════════════════════════════
   Dashboard component
   ══════════════════════════════════════════════ */
describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuthReturn.user = null;
    mocks.useAuthReturn.profile = null;
  });

  /* ── no-user state ── */
  it('shows sign-in prompt when no user', () => {
    render(<Dashboard />);
    expect(screen.getByText('Please sign in to view your dashboard')).toBeTruthy();
  });

  /* ── loading state ── */
  it('shows loading spinner while fetching', async () => {
    mocks.useAuthReturn.user = FAKE_USER;
    mocks.useAuthReturn.profile = FAKE_PROFILE;

    // chain that never resolves quickly — loading renders first frame
    const pendingChain = buildMockChain([], null);
    mocks.fromFn.mockReturnValue(pendingChain);

    const { container } = render(<Dashboard />);
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  /* ── stat cards ── */
  describe('stat cards', () => {
    beforeEach(async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.useAuthReturn.profile = FAKE_PROFILE;

      const chain = buildMockChain(FAKE_OFFERED_RIDES, null);
      mocks.fromFn.mockReturnValue(chain);

      render(<Dashboard />);
      await waitFor(() =>
        expect(screen.getByText('My Dashboard')).toBeTruthy()
      );
    });

    it('renders page title and subtitle', () => {
      expect(screen.getByText('My Dashboard')).toBeTruthy();
      expect(screen.getByText('Manage your rides and profile')).toBeTruthy();
    });

    it('shows rides offered count', () => {
      expect(screen.getByText('Rides Offered')).toBeTruthy();
      expect(screen.getByText('25')).toBeTruthy();
    });

    it('shows rides taken count', () => {
      expect(screen.getByText('Rides Taken')).toBeTruthy();
      expect(screen.getByText('8')).toBeTruthy();
    });

    it('shows average rating', () => {
      expect(screen.getByText('Average Rating')).toBeTruthy();
      expect(screen.getByText('4.7')).toBeTruthy();
    });

    it('shows member since date', () => {
      expect(screen.getByText('Member Since')).toBeTruthy();
      // Jun 2023
      expect(screen.getByText(/Jun 2023/)).toBeTruthy();
    });
  });

  /* ── offered rides tab ── */
  describe('offered rides tab', () => {
    it('shows offered rides list', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.useAuthReturn.profile = FAKE_PROFILE;

      const chain = buildMockChain(FAKE_OFFERED_RIDES, null);
      mocks.fromFn.mockReturnValue(chain);

      render(<Dashboard />);
      await waitFor(() => expect(screen.getByText('Downtown')).toBeTruthy());

      // ride 1
      expect(screen.getByText('Downtown')).toBeTruthy();
      expect(screen.getByText('Airport')).toBeTruthy();
      expect(screen.getByText('active')).toBeTruthy();
      expect(screen.getByText('Recurring')).toBeTruthy();
      expect(screen.getByText('2/4 available')).toBeTruthy();

      // ride 2
      expect(screen.getByText('North Side')).toBeTruthy();
      expect(screen.getByText('Campus')).toBeTruthy();
      expect(screen.getByText('completed')).toBeTruthy();
    });

    it('shows empty state when no offered rides', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.useAuthReturn.profile = FAKE_PROFILE;

      const chain = buildMockChain([], null);
      mocks.fromFn.mockReturnValue(chain);

      render(<Dashboard />);
      await waitFor(() =>
        expect(screen.getByText("You haven't offered any rides yet")).toBeTruthy()
      );
      expect(screen.getByText('Post your first ride')).toBeTruthy();
      expect(screen.getByText('Post your first ride').closest('a')?.getAttribute('href'))
        .toBe('/post-ride');
    });

    it('navigates to settings when settings button clicked', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.useAuthReturn.profile = FAKE_PROFILE;

      const chain = buildMockChain(FAKE_OFFERED_RIDES, null);
      mocks.fromFn.mockReturnValue(chain);

      render(<Dashboard />);
      await waitFor(() => expect(screen.getByText('Downtown')).toBeTruthy());

      const settingsButtons = screen.getAllByLabelText('Settings');
      fireEvent.click(settingsButtons[0]);
      expect(mocks.navigate).toHaveBeenCalledWith('/settings');
    });
  });

  /* ── booked rides tab ── */
  describe('booked rides tab', () => {
    it('shows booked rides after switching tabs', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.useAuthReturn.profile = FAKE_PROFILE;

      // first call = offered, then switch → booked
      const offeredChain = buildMockChain(FAKE_OFFERED_RIDES, null);
      const bookedChain = buildMockChain(FAKE_BOOKED_RIDES, null);

      let callCount = 0;
      mocks.fromFn.mockImplementation(() => {
        callCount++;
        // First calls are "offered" tab, later calls after tab switch are "booked"
        return callCount <= 1 ? offeredChain : bookedChain;
      });

      render(<Dashboard />);
      await waitFor(() => expect(screen.getByText('Downtown')).toBeTruthy());

      // switch tab
      fireEvent.click(screen.getByText('My Bookings'));
      await waitFor(() => expect(screen.getByText('Mall')).toBeTruthy());

      expect(screen.getByText('confirmed')).toBeTruthy();
      expect(screen.getByText('1 seat')).toBeTruthy();
      expect(screen.getByText('pending')).toBeTruthy();
      expect(screen.getByText('2 seats')).toBeTruthy();
    });

    it('shows empty bookings state', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.useAuthReturn.profile = FAKE_PROFILE;

      const offeredChain = buildMockChain(FAKE_OFFERED_RIDES, null);
      const emptyChain = buildMockChain([], null);

      let callCount = 0;
      mocks.fromFn.mockImplementation(() => {
        callCount++;
        return callCount <= 1 ? offeredChain : emptyChain;
      });

      render(<Dashboard />);
      await waitFor(() => expect(screen.getByText('Downtown')).toBeTruthy());

      fireEvent.click(screen.getByText('My Bookings'));
      await waitFor(() =>
        expect(screen.getByText("You haven't booked any rides yet")).toBeTruthy()
      );

      expect(screen.getByText('Find a ride')).toBeTruthy();
      expect(screen.getByText('Find a ride').closest('a')?.getAttribute('href'))
        .toBe('/find-rides');
    });

    it('navigates to booking details', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.useAuthReturn.profile = FAKE_PROFILE;

      const offeredChain = buildMockChain(FAKE_OFFERED_RIDES, null);
      const bookedChain = buildMockChain(FAKE_BOOKED_RIDES, null);

      let callCount = 0;
      mocks.fromFn.mockImplementation(() => {
        callCount++;
        return callCount <= 1 ? offeredChain : bookedChain;
      });

      render(<Dashboard />);
      await waitFor(() => expect(screen.getByText('Downtown')).toBeTruthy());

      fireEvent.click(screen.getByText('My Bookings'));
      await waitFor(() => expect(screen.getByText('Mall')).toBeTruthy());

      const viewButtons = screen.getAllByText('View Details');
      fireEvent.click(viewButtons[0]);
      expect(mocks.navigate).toHaveBeenCalledWith('/bookings/booking-1');
    });
  });

  /* ── tabs ── */
  describe('tab switching', () => {
    it('defaults to offered tab', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.useAuthReturn.profile = FAKE_PROFILE;

      const chain = buildMockChain([], null);
      mocks.fromFn.mockReturnValue(chain);

      render(<Dashboard />);
      await waitFor(() => expect(screen.getByText("Rides I'm Offering")).toBeTruthy());

      const offeredTab = screen.getByText("Rides I'm Offering");
      expect(offeredTab.className).toContain('text-blue-600');
    });

    it('highlights active tab on switch', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.useAuthReturn.profile = FAKE_PROFILE;

      const chain = buildMockChain([], null);
      mocks.fromFn.mockReturnValue(chain);

      render(<Dashboard />);
      await waitFor(() => expect(screen.getByText("Rides I'm Offering")).toBeTruthy());

      const bookedTab = screen.getByText('My Bookings');
      fireEvent.click(bookedTab);

      await waitFor(() =>
        expect(bookedTab.className).toContain('text-blue-600')
      );
    });
  });

  /* ── error handling ── */
  it('handles supabase errors gracefully', async () => {
    mocks.useAuthReturn.user = FAKE_USER;
    mocks.useAuthReturn.profile = FAKE_PROFILE;

    const errChain = buildMockChain(null, { message: 'fail' });
    mocks.fromFn.mockReturnValue(errChain);

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<Dashboard />);

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith('Error loading dashboard data:', expect.anything())
    );
    spy.mockRestore();
  });
});
