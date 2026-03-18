/**
 * Gamification module — Batch 1
 * AchievementCelebration (11 tests)
 * useAchievementCheck hook (4 tests)
 * AchievementShowcase (9 tests)
 * AchievementBadge (4 tests)
 * AchievementProgress (4 tests)
 * ≈ 32 tests
 */
// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';

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
    Award: stub('Award'),
    X: stub('X'),
    Star: stub('Star'),
    Trophy: stub('Trophy'),
    Shield: stub('Shield'),
    Leaf: stub('Leaf'),
    Users: stub('Users'),
    CheckCircle: stub('CheckCircle'),
    Lock: stub('Lock'),
    ChevronRight: stub('ChevronRight'),
    Zap: stub('Zap'),
    Crown: stub('Crown'),

    getAchievementById: vi.fn(),
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
    ACHIEVEMENTS: [] as any[],
    getUserAchievements: vi.fn(),
    getUserStats: vi.fn(),
    calculateProgress: vi.fn(),
    checkAllAchievements: vi.fn(),

    mockFrom: vi.fn(),
    mockUser: { id: 'user-gam-001', email: 'gamer@example.com' } as any,
    mockNavigate: vi.fn(),
  };
});

/* ------------------------------------------------------------------ */
/*  Module mocks                                                       */
/* ------------------------------------------------------------------ */

vi.mock('lucide-react', () => ({
  Award: mocks.Award,
  X: mocks.X,
  Star: mocks.Star,
  Trophy: mocks.Trophy,
  Shield: mocks.Shield,
  Leaf: mocks.Leaf,
  Users: mocks.Users,
  CheckCircle: mocks.CheckCircle,
  Lock: mocks.Lock,
  ChevronRight: mocks.ChevronRight,
  Zap: mocks.Zap,
  Crown: mocks.Crown,
}));

vi.mock('../../src/services/achievementService', () => ({
  getAchievementById: mocks.getAchievementById,
  TIER_COLORS: mocks.TIER_COLORS,
  TIER_BG_COLORS: mocks.TIER_BG_COLORS,
  ACHIEVEMENTS: mocks.ACHIEVEMENTS,
  getUserAchievements: mocks.getUserAchievements,
  getUserStats: mocks.getUserStats,
  calculateProgress: mocks.calculateProgress,
  checkAllAchievements: mocks.checkAllAchievements,
}));

vi.mock('../../src/lib/supabase', () => ({
  supabase: { from: (...a: any[]) => mocks.mockFrom(...a) },
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.mockUser }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.mockNavigate,
}));

/* ------------------------------------------------------------------ */
/*  Imports (after mocks)                                              */
/* ------------------------------------------------------------------ */

import AchievementCelebration, {
  useAchievementCheck,
} from '../../src/components/gamification/AchievementCelebration';
import AchievementShowcase, {
  AchievementBadge,
  AchievementProgress,
} from '../../src/components/gamification/AchievementShowcase';
import {
  FAKE_ACHIEVEMENT_BRONZE,
  FAKE_ACHIEVEMENT_SILVER,
  FAKE_ACHIEVEMENT_GOLD,
  FAKE_ACHIEVEMENT_PLATINUM,
  FAKE_ACHIEVEMENT_SOCIAL,
  FAKE_ACHIEVEMENT_SAFETY,
  ALL_FAKE_ACHIEVEMENTS,
  FAKE_UNLOCKED_ACHIEVEMENT,
  FAKE_USER_ID,
  buildMockChain,
} from './helpers';

/* ------------------------------------------------------------------ */
/*  Showcase-specific chain that includes .order()                     */
/* ------------------------------------------------------------------ */

function buildShowcaseChain(data: any[] = []) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnValue({
      then(resolve: (v: any) => void) {
        resolve({ data, error: null });
        return { then: (r: any) => r({ data, error: null }) };
      },
    }),
    then(resolve: (v: any) => void) {
      resolve({ data, error: null });
      return chain;
    },
  };
  return chain;
}

/* ------------------------------------------------------------------ */
/*  Setup                                                              */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.clearAllMocks();

  mocks.ACHIEVEMENTS.length = 0;
  ALL_FAKE_ACHIEVEMENTS.forEach((a) => mocks.ACHIEVEMENTS.push(a));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/* ================================================================== */
/*  AchievementCelebration                                             */
/* ================================================================== */

describe('AchievementCelebration', () => {
  const onClose = vi.fn();

  function renderCelebration(achievementId = 'first_ride') {
    mocks.getAchievementById.mockReturnValue(FAKE_ACHIEVEMENT_BRONZE);
    return render(
      <AchievementCelebration achievementId={achievementId} onClose={onClose} />,
    );
  }

  it('renders nothing when achievement not found', () => {
    mocks.getAchievementById.mockReturnValue(undefined);
    const { container } = render(
      <AchievementCelebration achievementId="nonexistent" onClose={onClose} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows "Achievement Unlocked!" banner', () => {
    renderCelebration();
    expect(screen.getByText('Achievement Unlocked!')).toBeTruthy();
  });

  it('displays achievement name and description', () => {
    renderCelebration();
    expect(screen.getByText('First Ride')).toBeTruthy();
    expect(screen.getByText('Complete your first ride')).toBeTruthy();
  });

  it('displays category badge', () => {
    renderCelebration();
    expect(screen.getByText('rides')).toBeTruthy();
  });

  it('displays tier badge', () => {
    renderCelebration();
    expect(screen.getByText('bronze')).toBeTruthy();
  });

  it('renders correct tier stars for bronze (1 star)', () => {
    renderCelebration();
    const stars = screen.getAllByTestId('icon-Star');
    expect(stars.length).toBe(1);
  });

  it('renders correct tier stars for gold (3 stars)', () => {
    mocks.getAchievementById.mockReturnValue(FAKE_ACHIEVEMENT_GOLD);
    render(<AchievementCelebration achievementId="half_century" onClose={onClose} />);
    const stars = screen.getAllByTestId('icon-Star');
    expect(stars.length).toBe(3);
  });

  it('renders correct tier stars for platinum (4 stars)', () => {
    mocks.getAchievementById.mockReturnValue(FAKE_ACHIEVEMENT_PLATINUM);
    render(<AchievementCelebration achievementId="century_club" onClose={onClose} />);
    const stars = screen.getAllByTestId('icon-Star');
    expect(stars.length).toBe(4);
  });

  it('shows "Continue" close button', () => {
    renderCelebration();
    expect(screen.getByText('Continue')).toBeTruthy();
  });

  it('calls onClose when Continue is clicked', () => {
    renderCelebration();
    fireEvent.click(screen.getByText('Continue'));
    vi.advanceTimersByTime(500);
    expect(onClose).toHaveBeenCalled();
  });

  it('auto-closes after 5 seconds', () => {
    renderCelebration();
    expect(onClose).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5500);
    expect(onClose).toHaveBeenCalled();
  });
});

/* ================================================================== */
/*  useAchievementCheck hook                                           */
/* ================================================================== */

describe('useAchievementCheck', () => {
  it('starts with newAchievement as null', () => {
    const { result } = renderHook(() => useAchievementCheck());
    expect(result.current.newAchievement).toBeNull();
  });

  it('sets newAchievement after checkAchievements finds new ones', async () => {
    mocks.checkAllAchievements.mockResolvedValue(['first_ride']);
    const { result } = renderHook(() => useAchievementCheck());

    await act(async () => {
      await result.current.checkAchievements(FAKE_USER_ID);
    });

    expect(result.current.newAchievement).toBe('first_ride');
  });

  it('does not set newAchievement when none unlocked', async () => {
    mocks.checkAllAchievements.mockResolvedValue([]);
    const { result } = renderHook(() => useAchievementCheck());

    await act(async () => {
      await result.current.checkAchievements(FAKE_USER_ID);
    });

    expect(result.current.newAchievement).toBeNull();
  });

  it('clearNewAchievement resets to null', async () => {
    mocks.checkAllAchievements.mockResolvedValue(['first_ride']);
    const { result } = renderHook(() => useAchievementCheck());

    await act(async () => {
      await result.current.checkAchievements(FAKE_USER_ID);
    });
    expect(result.current.newAchievement).toBe('first_ride');

    act(() => {
      result.current.clearNewAchievement();
    });
    expect(result.current.newAchievement).toBeNull();
  });
});

/* ================================================================== */
/*  AchievementShowcase                                                */
/* ================================================================== */

describe('AchievementShowcase', () => {
  function setupShowcaseMock(achievementIds: string[]) {
    const dbRows = achievementIds.map((id) => ({
      achievement_id: id,
      unlocked_at: '2024-06-15T10:00:00Z',
    }));
    mocks.mockFrom.mockReturnValue(buildShowcaseChain(dbRows));
  }

  it('shows loading state initially (spinner)', () => {
    mocks.mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnValue(new Promise(() => {})),
    });
    const { container } = render(<AchievementShowcase userId={FAKE_USER_ID} />);
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('shows empty state for own profile', async () => {
    setupShowcaseMock([]);
    render(<AchievementShowcase userId={FAKE_USER_ID} isOwnProfile={true} />);
    expect(
      await screen.findByText(/No achievements unlocked yet/),
    ).toBeTruthy();
  });

  it('shows empty state for other profile', async () => {
    setupShowcaseMock([]);
    render(<AchievementShowcase userId={FAKE_USER_ID} isOwnProfile={false} />);
    expect(
      await screen.findByText(/hasn't unlocked any achievements/),
    ).toBeTruthy();
  });

  it('renders achievement names for unlocked achievements', async () => {
    setupShowcaseMock(['first_ride', 'first_review']);
    render(<AchievementShowcase userId={FAKE_USER_ID} />);
    expect(await screen.findByText('First Ride')).toBeTruthy();
    expect(screen.getByText('First Review')).toBeTruthy();
  });

  it('respects maxDisplay prop showing +N more', async () => {
    setupShowcaseMock(['first_ride', 'first_review', 'road_warrior']);
    render(<AchievementShowcase userId={FAKE_USER_ID} maxDisplay={2} />);
    await screen.findByText('First Ride');
    expect(screen.getByText('+1')).toBeTruthy();
  });

  it('shows "View all" link for own profile', async () => {
    setupShowcaseMock(['first_ride']);
    render(<AchievementShowcase userId={FAKE_USER_ID} isOwnProfile={true} />);
    expect(await screen.findByText('View all')).toBeTruthy();
  });

  it('hides "View all" for other profiles', async () => {
    setupShowcaseMock(['first_ride']);
    render(<AchievementShowcase userId={FAKE_USER_ID} isOwnProfile={false} />);
    await screen.findByText('First Ride');
    expect(screen.queryByText('View all')).toBeNull();
  });

  it('navigates on "View all" click', async () => {
    setupShowcaseMock(['first_ride']);
    render(<AchievementShowcase userId={FAKE_USER_ID} isOwnProfile={true} />);
    fireEvent.click(await screen.findByText('View all'));
    expect(mocks.mockNavigate).toHaveBeenCalled();
  });

  it('queries user_achievements table', () => {
    setupShowcaseMock([]);
    render(<AchievementShowcase userId={FAKE_USER_ID} />);
    expect(mocks.mockFrom).toHaveBeenCalledWith('user_achievements');
  });
});

/* ================================================================== */
/*  AchievementBadge                                                   */
/* ================================================================== */

describe('AchievementBadge', () => {
  const fakeUserAchievement = {
    ...FAKE_ACHIEVEMENT_BRONZE,
    progress: 1,
    unlocked: true,
    unlockedAt: '2024-06-15T10:00:00Z',
  };

  it('renders with title attribute for the name', () => {
    const { container } = render(
      <AchievementBadge achievement={fakeUserAchievement as any} />,
    );
    expect(container.querySelector('[title="First Ride"]')).toBeTruthy();
  });

  it('uses gold gradient for gold tier', () => {
    const goldAch = { ...fakeUserAchievement, ...FAKE_ACHIEVEMENT_GOLD };
    const { container } = render(
      <AchievementBadge achievement={goldAch as any} />,
    );
    expect(container.innerHTML).toContain('yellow');
  });

  it('renders sm size by default (w-8)', () => {
    const { container } = render(
      <AchievementBadge achievement={fakeUserAchievement as any} />,
    );
    expect(container.innerHTML).toContain('w-8');
  });

  it('renders md size when specified (w-10)', () => {
    const { container } = render(
      <AchievementBadge achievement={fakeUserAchievement as any} size="md" />,
    );
    expect(container.innerHTML).toContain('w-10');
  });
});

/* ================================================================== */
/*  AchievementProgress                                                */
/* ================================================================== */

describe('AchievementProgress', () => {
  it('renders name', () => {
    render(<AchievementProgress name="First Ride" progress={5} requirement={10} icon="car" />);
    expect(screen.getByText('First Ride')).toBeTruthy();
  });

  it('shows progress fraction text', () => {
    render(<AchievementProgress name="First Ride" progress={5} requirement={10} icon="car" />);
    expect(screen.getByText('5/10')).toBeTruthy();
  });

  it('renders a progress bar with correct width', () => {
    const { container } = render(
      <AchievementProgress name="Test" progress={5} requirement={10} icon="car" />,
    );
    const bar = container.querySelector('[style*="width"]');
    expect(bar).toBeTruthy();
    expect(bar?.getAttribute('style')).toContain('50%');
  });

  it('handles 0 progress', () => {
    render(<AchievementProgress name="First Ride" progress={0} requirement={10} icon="car" />);
    expect(screen.getByText('First Ride')).toBeTruthy();
    expect(screen.getByText('0/10')).toBeTruthy();
  });
});
