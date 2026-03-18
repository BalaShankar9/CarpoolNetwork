/**
 * Gamification module — Batch 2
 * AchievementCenter (16 tests)
 * AchievementsBadges (18 tests)
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
    Star: stub('Star'),
    Medal: stub('Medal'),
    Award: stub('Award'),
    Crown: stub('Crown'),
    Flame: stub('Flame'),
    Target: stub('Target'),
    Users: stub('Users'),
    Leaf: stub('Leaf'),
    Shield: stub('Shield'),
    Calendar: stub('Calendar'),
    ChevronRight: stub('ChevronRight'),
    Lock: stub('Lock'),
    Sparkles: stub('Sparkles'),
    TrendingUp: stub('TrendingUp'),
    Zap: stub('Zap'),
    Loader2: stub('Loader2'),
    Heart: stub('Heart'),

    ACHIEVEMENTS: [] as any[],
    TIER_COLORS: {
      bronze: 'from-amber-600 to-amber-700',
      silver: 'from-gray-400 to-gray-500',
      gold: 'from-yellow-400 to-amber-500',
      platinum: 'from-purple-400 to-indigo-500',
    },
    TIER_BG_COLORS: {
      bronze: 'bg-amber-100 border-amber-300',
      silver: 'bg-gray-100 border-gray-300',
      gold: 'bg-yellow-100 border-yellow-300',
      platinum: 'bg-purple-100 border-purple-300',
    },
    getUserAchievements: vi.fn(),
    getUserStats: vi.fn(),
    calculateProgress: vi.fn(),

    mockFrom: vi.fn(),

    mockUser: { id: 'user-gam-001', email: 'gamer@example.com' } as any,
    mockProfile: {
      id: 'user-gam-001',
      full_name: 'Test Gamer',
      avatar_url: null,
      trust_score: 85,
    } as any,
  };
});

/* ------------------------------------------------------------------ */
/*  Module mocks                                                       */
/* ------------------------------------------------------------------ */

vi.mock('lucide-react', () => ({
  Trophy: mocks.Trophy,
  Star: mocks.Star,
  Medal: mocks.Medal,
  Award: mocks.Award,
  Crown: mocks.Crown,
  Flame: mocks.Flame,
  Target: mocks.Target,
  Users: mocks.Users,
  Leaf: mocks.Leaf,
  Shield: mocks.Shield,
  Calendar: mocks.Calendar,
  ChevronRight: mocks.ChevronRight,
  Lock: mocks.Lock,
  Sparkles: mocks.Sparkles,
  TrendingUp: mocks.TrendingUp,
  Zap: mocks.Zap,
  Loader2: mocks.Loader2,
  Heart: mocks.Heart,
}));

vi.mock('../../src/services/achievementService', () => ({
  ACHIEVEMENTS: mocks.ACHIEVEMENTS,
  TIER_COLORS: mocks.TIER_COLORS,
  TIER_BG_COLORS: mocks.TIER_BG_COLORS,
  getUserAchievements: mocks.getUserAchievements,
  getUserStats: mocks.getUserStats,
  calculateProgress: mocks.calculateProgress,
}));

vi.mock('../../src/lib/supabase', () => ({
  supabase: { from: (...a: any[]) => mocks.mockFrom(...a) },
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.mockUser, profile: mocks.mockProfile }),
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

import { AchievementCenter } from '../../src/components/gamification/AchievementCenter';
import AchievementsBadges from '../../src/components/gamification/AchievementsBadges';
import {
  ALL_FAKE_ACHIEVEMENTS,
  FAKE_ACHIEVEMENT_BRONZE,
  FAKE_ACHIEVEMENT_SILVER,
  FAKE_ACHIEVEMENT_GOLD,
  FAKE_ACHIEVEMENT_SOCIAL,
  FAKE_ACHIEVEMENT_SAFETY,
  FAKE_UNLOCKED_ACHIEVEMENT,
  FAKE_UNLOCKED_ACHIEVEMENT_2,
  FAKE_USER_STATS,
  FAKE_USER_ID,
  buildMockChain,
} from './helpers';

/* ------------------------------------------------------------------ */
/*  Setup                                                              */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  vi.clearAllMocks();

  mocks.ACHIEVEMENTS.length = 0;
  ALL_FAKE_ACHIEVEMENTS.forEach((a) => mocks.ACHIEVEMENTS.push(a));
});

afterEach(cleanup);

/* ================================================================== */
/*  AchievementCenter                                                  */
/* ================================================================== */

describe('AchievementCenter', () => {
  function setupAchievementCenter(
    unlocked = [FAKE_UNLOCKED_ACHIEVEMENT],
    stats = FAKE_USER_STATS,
  ) {
    mocks.getUserAchievements.mockResolvedValue(unlocked);
    mocks.getUserStats.mockResolvedValue(stats);
    mocks.calculateProgress.mockReturnValue(50);
  }

  it('shows loading spinner initially', () => {
    mocks.getUserAchievements.mockReturnValue(new Promise(() => {}));
    mocks.getUserStats.mockReturnValue(new Promise(() => {}));
    render(<AchievementCenter />);
    expect(screen.getByTestId('icon-Loader2')).toBeTruthy();
  });

  it('shows "Achievements" title after load', async () => {
    setupAchievementCenter();
    render(<AchievementCenter />);
    expect(await screen.findByText('Achievements')).toBeTruthy();
  });

  it('renders all achievements in grid', async () => {
    setupAchievementCenter();
    render(<AchievementCenter />);
    await screen.findByText('Achievements');
    expect(screen.getByText('First Ride')).toBeTruthy();
    expect(screen.getByText('Road Warrior')).toBeTruthy();
    expect(screen.getByText('Half Century')).toBeTruthy();
  });

  it('marks unlocked achievements with sparkle icon', async () => {
    setupAchievementCenter([FAKE_UNLOCKED_ACHIEVEMENT]);
    render(<AchievementCenter />);
    await screen.findByText('Achievements');
    expect(screen.getByTestId('icon-Sparkles')).toBeTruthy();
  });

  it('shows Lock icon for locked achievements', async () => {
    setupAchievementCenter([]);
    render(<AchievementCenter />);
    await screen.findByText('Achievements');
    const locks = screen.getAllByTestId('icon-Lock');
    expect(locks.length).toBeGreaterThan(0);
  });

  it('shows progress bar for locked achievements', async () => {
    setupAchievementCenter([]);
    mocks.calculateProgress.mockReturnValue(30);
    render(<AchievementCenter />);
    await screen.findByText('Achievements');
    expect(screen.getAllByText('Progress').length).toBeGreaterThan(0);
  });

  it('shows tier badge on each achievement', async () => {
    setupAchievementCenter();
    render(<AchievementCenter />);
    await screen.findByText('Achievements');
    expect(screen.getAllByText('bronze').length).toBeGreaterThan(0);
  });

  it('opens detail modal on achievement click', async () => {
    setupAchievementCenter();
    render(<AchievementCenter />);
    fireEvent.click(await screen.findByText('First Ride'));
    const names = screen.getAllByText('First Ride');
    expect(names.length).toBeGreaterThanOrEqual(2);
  });

  it('detail modal shows Close button', async () => {
    setupAchievementCenter();
    render(<AchievementCenter />);
    fireEvent.click(await screen.findByText('First Ride'));
    expect(screen.getByText('Close')).toBeTruthy();
  });

  it('closes modal on Close button click', async () => {
    setupAchievementCenter();
    render(<AchievementCenter />);
    fireEvent.click(await screen.findByText('First Ride'));
    expect(screen.getByText('Close')).toBeTruthy();
    fireEvent.click(screen.getByText('Close'));
    await waitFor(() => {
      expect(screen.getAllByText('First Ride').length).toBe(1);
    });
  });

  it('modal shows "Achievement Unlocked!" for unlocked ones', async () => {
    setupAchievementCenter([FAKE_UNLOCKED_ACHIEVEMENT]);
    render(<AchievementCenter />);
    fireEvent.click(await screen.findByText('First Ride'));
    expect(screen.getByText('Achievement Unlocked!')).toBeTruthy();
  });

  it('modal shows progress for locked achievements', async () => {
    setupAchievementCenter([]);
    mocks.calculateProgress.mockReturnValue(40);
    render(<AchievementCenter />);
    fireEvent.click(await screen.findByText('Road Warrior'));
    expect(screen.getByText(/away from unlocking/)).toBeTruthy();
  });

  it('does not crash when user is null', async () => {
    mocks.mockUser = null;
    mocks.getUserAchievements.mockReturnValue(new Promise(() => {}));
    mocks.getUserStats.mockReturnValue(new Promise(() => {}));
    render(<AchievementCenter />);
    expect(screen.getByTestId('icon-Loader2')).toBeTruthy();
    mocks.mockUser = { id: 'user-gam-001', email: 'gamer@example.com' };
  });

  it('shows description for each achievement', async () => {
    setupAchievementCenter();
    render(<AchievementCenter />);
    await screen.findByText('Achievements');
    expect(screen.getByText('Complete your first ride')).toBeTruthy();
  });

  it('renders unlocked date for unlocked achievements in modal', async () => {
    setupAchievementCenter([FAKE_UNLOCKED_ACHIEVEMENT]);
    render(<AchievementCenter />);
    fireEvent.click(await screen.findByText('First Ride'));
    // Should show date
    expect(screen.getByText(/You earned this on/)).toBeTruthy();
  });

  it('shows achievement names and descriptions', async () => {
    setupAchievementCenter();
    render(<AchievementCenter />);
    await screen.findByText('Achievements');
    expect(screen.getByText('Fully Verified')).toBeTruthy();
    expect(screen.getByText('Complete all verification steps')).toBeTruthy();
  });
});

/* ================================================================== */
/*  AchievementsBadges                                                 */
/* ================================================================== */

describe('AchievementsBadges', () => {
  function setupBadgesMock(overrides?: {
    rides?: any[];
    bookings?: any[];
    friendships?: any[];
    reviews?: any[];
  }) {
    const ridesData = overrides?.rides ?? [{ driver_id: FAKE_USER_ID }];
    const bookingsData = overrides?.bookings ?? [{ passenger_id: FAKE_USER_ID }];
    const friendshipsData = overrides?.friendships ?? [];
    const reviewsData = overrides?.reviews ?? [{ rating: 5 }];

    mocks.mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case 'rides':
          return buildMockChain(ridesData);
        case 'ride_bookings':
          return buildMockChain(bookingsData);
        case 'friendships':
          return buildMockChain(friendshipsData);
        case 'reviews':
          return buildMockChain(reviewsData);
        default:
          return buildMockChain([]);
      }
    });
  }

  it('shows loading spinner initially', () => {
    const neverResolve: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      then: () => new Promise(() => {}),
    };
    mocks.mockFrom.mockReturnValue(neverResolve);
    render(<AchievementsBadges />);
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('shows "Achievements & Badges" heading after load', async () => {
    setupBadgesMock();
    render(<AchievementsBadges />);
    expect(await screen.findByText('Achievements & Badges')).toBeTruthy();
  });

  it('shows unlocked count text', async () => {
    setupBadgesMock();
    render(<AchievementsBadges />);
    await screen.findByText('Achievements & Badges');
    expect(screen.getByText(/of.*unlocked/i)).toBeTruthy();
  });

  it('shows "Completed" percentage', async () => {
    setupBadgesMock();
    render(<AchievementsBadges />);
    await screen.findByText('Achievements & Badges');
    expect(screen.getByText('Completed')).toBeTruthy();
  });

  it('renders All / Unlocked / Locked filter buttons', async () => {
    setupBadgesMock();
    render(<AchievementsBadges />);
    await screen.findByText('Achievements & Badges');
    expect(screen.getByText(/^All \(/)).toBeTruthy();
    expect(screen.getByText(/^Unlocked \(/)).toBeTruthy();
    expect(screen.getByText(/^Locked \(/)).toBeTruthy();
  });

  it('clicking Unlocked filter activates it', async () => {
    setupBadgesMock();
    render(<AchievementsBadges />);
    await screen.findByText('Achievements & Badges');
    const btn = screen.getByText(/^Unlocked \(/).closest('button')!;
    fireEvent.click(btn);
    expect(btn.className).toContain('bg-blue-600');
  });

  it('clicking Locked filter activates it', async () => {
    setupBadgesMock();
    render(<AchievementsBadges />);
    await screen.findByText('Achievements & Badges');
    const btn = screen.getByText(/^Locked \(/).closest('button')!;
    fireEvent.click(btn);
    expect(btn.className).toContain('bg-blue-600');
  });

  it('All filter is active by default', async () => {
    setupBadgesMock();
    render(<AchievementsBadges />);
    await screen.findByText('Achievements & Badges');
    const allBtn = screen.getByText(/^All \(/).closest('button')!;
    expect(allBtn.className).toContain('bg-blue-600');
  });

  it('switches active filter style', async () => {
    setupBadgesMock();
    render(<AchievementsBadges />);
    await screen.findByText('Achievements & Badges');
    const lockedBtn = screen.getByText(/^Locked \(/).closest('button')!;
    fireEvent.click(lockedBtn);
    const allBtn = screen.getByText(/^All \(/).closest('button')!;
    expect(allBtn.className).not.toContain('bg-blue-600');
    expect(lockedBtn.className).toContain('bg-blue-600');
  });

  it('shows tier badges (BRONZE / SILVER / etc.)', async () => {
    setupBadgesMock();
    render(<AchievementsBadges />);
    await screen.findByText('Achievements & Badges');
    expect(screen.getAllByText(/BRONZE|SILVER|GOLD|PLATINUM/).length).toBeGreaterThan(0);
  });

  it('renders trophy icon in header', async () => {
    setupBadgesMock();
    render(<AchievementsBadges />);
    await screen.findByText('Achievements & Badges');
    expect(screen.getAllByTestId('icon-Trophy').length).toBeGreaterThan(0);
  });

  it('queries rides and ride_bookings tables', async () => {
    setupBadgesMock();
    render(<AchievementsBadges />);
    await screen.findByText('Achievements & Badges');
    const tables = mocks.mockFrom.mock.calls.map((c: any) => c[0]);
    expect(tables).toContain('rides');
    expect(tables).toContain('ride_bookings');
  });

  it('queries friendships table', async () => {
    setupBadgesMock();
    render(<AchievementsBadges />);
    await screen.findByText('Achievements & Badges');
    const tables = mocks.mockFrom.mock.calls.map((c: any) => c[0]);
    expect(tables).toContain('friendships');
  });

  it('queries reviews table', async () => {
    setupBadgesMock();
    render(<AchievementsBadges />);
    await screen.findByText('Achievements & Badges');
    const tables = mocks.mockFrom.mock.calls.map((c: any) => c[0]);
    expect(tables).toContain('reviews');
  });

  it('shows percentage number', async () => {
    setupBadgesMock();
    render(<AchievementsBadges />);
    await screen.findByText('Achievements & Badges');
    // The completion percentage section
    expect(screen.getByText('Completed')).toBeTruthy();
    // There should be a percentage value near it
    const pctEls = screen.getAllByText(/%/);
    expect(pctEls.length).toBeGreaterThan(0);
  });

  it('handles empty rides data', async () => {
    setupBadgesMock({ rides: [], bookings: [], friendships: [], reviews: [] });
    render(<AchievementsBadges />);
    expect(await screen.findByText('Achievements & Badges')).toBeTruthy();
  });

  it('renders achievement card descriptions', async () => {
    setupBadgesMock();
    render(<AchievementsBadges />);
    await screen.findByText('Achievements & Badges');
    // Should show at least some description from the locally defined achievements
    const cards = document.querySelectorAll('.text-sm.text-gray-600');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('shows empty state when filter finds no matches', async () => {
    // Give data that unlocks some achievements, then filter to unlocked
    setupBadgesMock({ rides: [], bookings: [], friendships: [], reviews: [] });
    render(<AchievementsBadges />);
    await screen.findByText('Achievements & Badges');
    // Click "Unlocked" — with 0 rides etc, nothing should be unlocked
    fireEvent.click(screen.getByText(/^Unlocked \(/));
    const emptyMsg = screen.queryByText('No achievements found');
    // If 0 unlocked, should show empty
    expect(emptyMsg).toBeTruthy();
  });
});
