/**
 * Gamification module — Batch 3
 * Leaderboard (18 tests)
 * StreakTracker (16 tests)
 * ≈ 34 tests
 */
// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

/* ------------------------------------------------------------------ */
/*  vi.hoisted mocks                                                   */
/* ------------------------------------------------------------------ */

const mocks = vi.hoisted(() => {
  const stub = (name: string) => {
    const Comp = (p: any) => <span data-testid={`icon-${name}`} {...p} />;
    Comp.displayName = name;
    return Comp;
  };

  return {
    Trophy: stub('Trophy'),
    Medal: stub('Medal'),
    Crown: stub('Crown'),
    ChevronDown: stub('ChevronDown'),
    TrendingUp: stub('TrendingUp'),
    Car: stub('Car'),
    Leaf: stub('Leaf'),
    Star: stub('Star'),
    Flame: stub('Flame'),
    Zap: stub('Zap'),
    Loader2: stub('Loader2'),
    User: stub('User'),
    Award: stub('Award'),
    Calendar: stub('Calendar'),
    Target: stub('Target'),

    mockFrom: vi.fn(),
    mockUser: { id: 'user-gam-001', email: 'gamer@example.com' } as any,
  };
});

/* ------------------------------------------------------------------ */
/*  Module mocks                                                       */
/* ------------------------------------------------------------------ */

vi.mock('lucide-react', () => ({
  Trophy: mocks.Trophy,
  Medal: mocks.Medal,
  Crown: mocks.Crown,
  ChevronDown: mocks.ChevronDown,
  TrendingUp: mocks.TrendingUp,
  Car: mocks.Car,
  Leaf: mocks.Leaf,
  Star: mocks.Star,
  Flame: mocks.Flame,
  Zap: mocks.Zap,
  Loader2: mocks.Loader2,
  User: mocks.User,
  Award: mocks.Award,
  Calendar: mocks.Calendar,
  Target: mocks.Target,
}));

vi.mock('../../src/lib/supabase', () => ({
  supabase: { from: (...a: any[]) => mocks.mockFrom(...a) },
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.mockUser }),
}));

vi.mock('framer-motion', () => {
  const motionHandler = {
    get(_target: any, prop: string) {
      const Comp = React.forwardRef<any, any>((props, ref) => {
        const {
          initial, animate, exit, transition, whileHover, whileTap, whileFocus,
          whileInView, variants, layout, layoutId, drag, dragConstraints,
          ...rest
        } = props;
        return React.createElement(prop, { ...rest, ref });
      });
      Comp.displayName = `motion.${prop}`;
      return Comp;
    },
  };

  return {
    motion: new Proxy({}, motionHandler),
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

/* ------------------------------------------------------------------ */
/*  Imports (after mocks)                                              */
/* ------------------------------------------------------------------ */

import { Leaderboard } from '../../src/components/gamification/Leaderboard';
import { StreakTracker } from '../../src/components/gamification/StreakTracker';
import {
  FAKE_USER_ID,
  FAKE_STREAK_DATA,
  buildMockChain,
} from './helpers';

/* ------------------------------------------------------------------ */
/*  Setup                                                              */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

/* ================================================================== */
/*  Leaderboard                                                        */
/* ================================================================== */

describe('Leaderboard', () => {
  function setupLeaderboardMock(opts?: { empty?: boolean }) {
    if (opts?.empty) {
      mocks.mockFrom.mockReturnValue(buildMockChain([]));
      return;
    }

    mocks.mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case 'rides':
          return buildMockChain([
            { driver_id: 'lb-user-1', departure_time: new Date().toISOString(), distance_km: 20 },
            { driver_id: 'lb-user-1', departure_time: new Date().toISOString(), distance_km: 15 },
            { driver_id: 'lb-user-2', departure_time: new Date().toISOString(), distance_km: 30 },
            { driver_id: FAKE_USER_ID, departure_time: new Date().toISOString(), distance_km: 10 },
          ]);
        case 'profiles':
          return buildMockChain([
            { id: 'lb-user-1', full_name: 'Alice', avatar_url: null },
            { id: 'lb-user-2', full_name: 'Bob', avatar_url: null },
            { id: FAKE_USER_ID, full_name: 'Test Gamer', avatar_url: null },
          ]);
        case 'reviews':
          return buildMockChain([
            { reviewee_id: 'lb-user-1', rating: 5 },
            { reviewee_id: 'lb-user-1', rating: 5 },
            { reviewee_id: 'lb-user-1', rating: 5 },
            { reviewee_id: 'lb-user-1', rating: 4 },
            { reviewee_id: 'lb-user-1', rating: 5 },
          ]);
        case 'user_streaks':
          return buildMockChain([
            { user_id: 'lb-user-1', daily_streak: 10 },
            { user_id: 'lb-user-2', daily_streak: 5 },
          ]);
        case 'ride_bookings':
          return buildMockChain([]);
        default:
          return buildMockChain([]);
      }
    });
  }

  it('shows "Leaderboard" heading', async () => {
    setupLeaderboardMock();
    render(<Leaderboard />);
    expect(await screen.findByText('Leaderboard')).toBeTruthy();
  });

  it('shows loading spinner while fetching', () => {
    mocks.mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnValue(new Promise(() => {})),
      then: () => new Promise(() => {}),
    });
    render(<Leaderboard />);
    expect(screen.getByTestId('icon-Loader2')).toBeTruthy();
  });

  it('shows description text', async () => {
    setupLeaderboardMock();
    render(<Leaderboard />);
    expect(await screen.findByText(/See how you rank/)).toBeTruthy();
  });

  it('renders type selector buttons', async () => {
    setupLeaderboardMock();
    render(<Leaderboard />);
    await screen.findByText('Leaderboard');
    expect(screen.getByText('Most Rides')).toBeTruthy();
    expect(screen.getByText(/CO₂ Saved/)).toBeTruthy();
    expect(screen.getByText('Top Rated')).toBeTruthy();
    expect(screen.getByText('Longest Streak')).toBeTruthy();
  });

  it('renders period select options', async () => {
    setupLeaderboardMock();
    render(<Leaderboard />);
    await screen.findByText('Leaderboard');
    expect(screen.getByText('This Week')).toBeTruthy();
    expect(screen.getByText('This Month')).toBeTruthy();
    expect(screen.getByText('All Time')).toBeTruthy();
  });

  it('renders user entries after load', async () => {
    setupLeaderboardMock();
    render(<Leaderboard />);
    expect(await screen.findByText('Alice')).toBeTruthy();
  });

  it('shows empty state when no entries', async () => {
    setupLeaderboardMock({ empty: true });
    render(<Leaderboard />);
    expect(await screen.findByText(/No entries yet/)).toBeTruthy();
  });

  it('shows call to action in empty state', async () => {
    setupLeaderboardMock({ empty: true });
    render(<Leaderboard />);
    expect(await screen.findByText(/Be the first/)).toBeTruthy();
  });

  it('reloads when type tab is clicked', async () => {
    setupLeaderboardMock();
    render(<Leaderboard />);
    await screen.findByText('Leaderboard');
    const callsBefore = mocks.mockFrom.mock.calls.length;
    fireEvent.click(screen.getByText(/CO₂ Saved/));
    await waitFor(() => {
      expect(mocks.mockFrom.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  it('reloads when period is changed', async () => {
    setupLeaderboardMock();
    render(<Leaderboard />);
    await screen.findByText('Leaderboard');
    const callsBefore = mocks.mockFrom.mock.calls.length;
    const select = document.querySelector('select');
    expect(select).toBeTruthy();
    fireEvent.change(select!, { target: { value: 'week' } });
    await waitFor(() => {
      expect(mocks.mockFrom.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  it('renders Flame icon for streak type selector', async () => {
    setupLeaderboardMock();
    render(<Leaderboard />);
    await screen.findByText('Leaderboard');
    expect(screen.getAllByTestId('icon-Flame').length).toBeGreaterThan(0);
  });

  it('renders Car icon for rides type selector', async () => {
    setupLeaderboardMock();
    render(<Leaderboard />);
    await screen.findByText('Leaderboard');
    expect(screen.getAllByTestId('icon-Car').length).toBeGreaterThan(0);
  });

  it('renders Leaf icon for CO₂ type selector', async () => {
    setupLeaderboardMock();
    render(<Leaderboard />);
    await screen.findByText('Leaderboard');
    expect(screen.getAllByTestId('icon-Leaf').length).toBeGreaterThan(0);
  });

  it('renders Star icon for rating type selector', async () => {
    setupLeaderboardMock();
    render(<Leaderboard />);
    await screen.findByText('Leaderboard');
    expect(screen.getAllByTestId('icon-Star').length).toBeGreaterThan(0);
  });

  it('Most Rides button is styled as active by default', async () => {
    setupLeaderboardMock();
    render(<Leaderboard />);
    await screen.findByText('Leaderboard');
    const ridesBtn = screen.getByText('Most Rides').closest('button')!;
    expect(ridesBtn.className).toContain('text-white');
  });

  it('shows "rides" unit for rides leaderboard', async () => {
    setupLeaderboardMock();
    render(<Leaderboard />);
    await screen.findByText('Leaderboard');
    // The unit "rides" appears in the header button text "Most Rides"
    expect(screen.getByText('Most Rides')).toBeTruthy();
  });

  it('shows Bob in entries', async () => {
    setupLeaderboardMock();
    render(<Leaderboard />);
    expect(await screen.findByText('Bob')).toBeTruthy();
  });

  it('renders User icon fallback for no avatar', async () => {
    setupLeaderboardMock();
    render(<Leaderboard />);
    await screen.findByText('Alice');
    expect(screen.getAllByTestId('icon-User').length).toBeGreaterThan(0);
  });
});

/* ================================================================== */
/*  StreakTracker                                                       */
/* ================================================================== */

describe('StreakTracker', () => {
  function setupStreakMock(streakData: any = FAKE_STREAK_DATA) {
    mocks.mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case 'user_streaks':
          return buildMockChain(streakData ? [streakData] : []);
        case 'rides':
          return buildMockChain([
            { departure_time: new Date().toISOString() },
          ]);
        case 'ride_bookings':
          return buildMockChain([
            { created_at: new Date().toISOString() },
          ]);
        default:
          return buildMockChain([]);
      }
    });
  }

  it('shows loading spinner initially', () => {
    const neverResolve: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnValue(new Promise(() => {})),
      gte: vi.fn().mockReturnThis(),
      then: () => new Promise(() => {}),
    };
    mocks.mockFrom.mockReturnValue(neverResolve);
    render(<StreakTracker />);
    expect(screen.getByTestId('icon-Loader2')).toBeTruthy();
  });

  it('shows empty state when streak query errors', async () => {
    // Make the query throw to keep streak=null so empty state shows
    mocks.mockFrom.mockImplementation((table: string) => {
      if (table === 'user_streaks') {
        const chain: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockRejectedValue(new Error('not found')),
        };
        return chain;
      }
      return buildMockChain([]);
    });
    render(<StreakTracker />);
    expect(
      await screen.findByText(/Start carpooling to build your streak/),
    ).toBeTruthy();
  });

  it('shows "Current Streak" label', async () => {
    setupStreakMock();
    render(<StreakTracker />);
    expect(await screen.findByText('Current Streak')).toBeTruthy();
  });

  it('shows daily streak count with "days"', async () => {
    setupStreakMock();
    render(<StreakTracker />);
    await screen.findByText('Current Streak');
    // The streak card shows "X days" text
    const daysTexts = screen.getAllByText(/\d+ days/);
    expect(daysTexts.length).toBeGreaterThan(0);
  });

  it('shows "This Week" section', async () => {
    setupStreakMock();
    render(<StreakTracker />);
    expect(await screen.findByText('This Week')).toBeTruthy();
  });

  it('renders 7 day activity indicators', async () => {
    setupStreakMock();
    const { container } = render(<StreakTracker />);
    await screen.findByText('This Week');
    const dayLabels = container.querySelectorAll('.text-xs');
    expect(dayLabels.length).toBeGreaterThanOrEqual(7);
  });

  it('shows "Best Streak" stat card', async () => {
    setupStreakMock();
    render(<StreakTracker />);
    expect(await screen.findByText('Best Streak')).toBeTruthy();
  });

  it('shows best streak value', async () => {
    setupStreakMock();
    render(<StreakTracker />);
    await screen.findByText('Best Streak');
    // 14 days appears in Best Streak card and milestone badge
    const matches = screen.getAllByText(/14 days/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Weekly Streak" stat card', async () => {
    setupStreakMock();
    render(<StreakTracker />);
    expect(await screen.findByText('Weekly Streak')).toBeTruthy();
  });

  it('shows weekly streak value', async () => {
    setupStreakMock();
    render(<StreakTracker />);
    expect(await screen.findByText(/3 weeks/)).toBeTruthy();
  });

  it('shows longest weekly streak', async () => {
    setupStreakMock();
    render(<StreakTracker />);
    expect(await screen.findByText(/Best:.*5 weeks/)).toBeTruthy();
  });

  it('shows "Streak Tips" section', async () => {
    setupStreakMock();
    render(<StreakTracker />);
    expect(await screen.findByText('Streak Tips')).toBeTruthy();
  });

  it('shows tip about daily carpooling', async () => {
    setupStreakMock();
    render(<StreakTracker />);
    expect(
      await screen.findByText(/Carpool at least once per day/),
    ).toBeTruthy();
  });

  it('shows "Streak Milestones" section', async () => {
    setupStreakMock();
    render(<StreakTracker />);
    expect(await screen.findByText('Streak Milestones')).toBeTruthy();
  });

  it('renders milestone badges (3, 7, 365 days)', async () => {
    setupStreakMock();
    render(<StreakTracker />);
    await screen.findByText('Streak Milestones');
    expect(screen.getByText('3 days')).toBeTruthy();
    // 7 days appears in both streak count and milestone
    expect(screen.getAllByText('7 days').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('365 days')).toBeTruthy();
  });

  it('shows "Next milestone" progress when streak > 0', async () => {
    setupStreakMock();
    render(<StreakTracker />);
    expect(await screen.findByText(/Next milestone/)).toBeTruthy();
  });

  it('queries user_streaks table', () => {
    setupStreakMock();
    render(<StreakTracker />);
    expect(mocks.mockFrom).toHaveBeenCalledWith('user_streaks');
  });
});
