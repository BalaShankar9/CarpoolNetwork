// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { makeRewardPoints, makeReward, makeRedemption } from './helpers';

/* ─── hoisted mocks ─── */
const mocks = vi.hoisted(() => ({
  user: { id: 'user-1', email: 'test@test.com' } as any,
  getRewardPoints: vi.fn(),
  getAvailableRewards: vi.fn(),
  getRedemptionHistory: vi.fn(),
  redeemReward: vi.fn(),
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock('../../src/services/carbonRewardsService', () => ({
  carbonRewardsService: {
    getRewardPoints: mocks.getRewardPoints,
    getAvailableRewards: mocks.getAvailableRewards,
    getRedemptionHistory: mocks.getRedemptionHistory,
    redeemReward: mocks.redeemReward,
  },
  CO2_EMISSIONS_PER_KM: { car: 0.21, van: 0.27, electric: 0.05, hybrid: 0.12 },
  TIER_THRESHOLDS: {
    bronze: { min: 0, max: 999, name: 'Bronze', color: '#CD7F32' },
    silver: { min: 1000, max: 4999, name: 'Silver', color: '#C0C0C0' },
    gold: { min: 5000, max: 14999, name: 'Gold', color: '#FFD700' },
    platinum: { min: 15000, max: 49999, name: 'Platinum', color: '#E5E4E2' },
    diamond: { min: 50000, max: Infinity, name: 'Diamond', color: '#B9F2FF' },
  },
  REWARDS_CATALOG: [],
}));

vi.mock('framer-motion', () => {
  const React = require('react');
  const handler: ProxyHandler<object> = {
    get(_t: object, prop: string | symbol) {
      return React.forwardRef((p: any, ref: any) => {
        const { initial, animate, exit, variants, whileHover, whileTap, transition, layout, ...rest } = p;
        return React.createElement(typeof prop === 'string' ? prop : 'div', { ...rest, ref });
      });
    },
  };
  return {
    motion: new Proxy({}, handler),
    AnimatePresence: ({ children }: any) => children,
  };
});

vi.mock('lucide-react', () => {
  const React = require('react');
  const s = (n: string) => (props: any) => React.createElement('span', { 'data-testid': `icon-${n}`, ...props });
  return {
    Leaf: s('Leaf'), TreePine: s('TreePine'), TrendingUp: s('TrendingUp'),
    Award: s('Award'), Car: s('Car'), Users: s('Users'), MapPin: s('MapPin'),
    BarChart3: s('BarChart3'), Calendar: s('Calendar'), ChevronRight: s('ChevronRight'),
    Info: s('Info'), Share2: s('Share2'), Gift: s('Gift'), Star: s('Star'),
    Zap: s('Zap'), Crown: s('Crown'), Trophy: s('Trophy'), Coffee: s('Coffee'),
    Ticket: s('Ticket'), Fuel: s('Fuel'), BadgeCheck: s('BadgeCheck'),
    Sparkles: s('Sparkles'), Check: s('Check'), Clock: s('Clock'),
    AlertCircle: s('AlertCircle'), Copy: s('Copy'), ExternalLink: s('ExternalLink'),
  };
});

import { RewardsShop } from '../../src/components/rewards/RewardsShop';

function defaultMocks(overrides?: { points?: any; rewards?: any[]; redemptions?: any[] }) {
  const points = overrides?.points ?? makeRewardPoints();
  const rewards = overrides?.rewards ?? [
    makeReward({ id: 'r1', name: 'Free Coffee', category: 'voucher', pointsCost: 500, featured: true, partnerName: 'Costa Coffee', value: 3.50, currency: 'GBP' }),
    makeReward({ id: 'r2', name: '10% Off Ride', category: 'discount', pointsCost: 300, value: 10, featured: false, currency: undefined }),
    makeReward({ id: 'r3', name: 'Plant a Tree', category: 'donation', pointsCost: 1000, featured: true, partnerName: 'One Tree Planted', value: undefined, currency: undefined }),
    makeReward({ id: 'r4', name: 'Eco Badge', category: 'badge', pointsCost: 200, value: undefined, currency: undefined }),
    makeReward({ id: 'r5', name: 'Premium Week', category: 'feature', pointsCost: 5000, value: undefined, currency: undefined }),
  ];
  const redemptions = overrides?.redemptions ?? [];
  mocks.getRewardPoints.mockResolvedValue(points);
  mocks.getAvailableRewards.mockReturnValue(rewards);
  mocks.getRedemptionHistory.mockResolvedValue(redemptions);
  return { points, rewards, redemptions };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.id = 'user-1';
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
});
afterEach(cleanup);

async function renderLoaded(props: any = {}, overrides?: Parameters<typeof defaultMocks>[0]) {
  const data = defaultMocks(overrides);
  const result = render(<RewardsShop {...props} />);
  await waitFor(() => expect(screen.queryByText('Your Points')).toBeTruthy());
  return { ...result, ...data };
}

describe('RewardsShop', () => {
  /* ═══════ Loading ═══════ */
  it('shows loading skeleton while data loads', () => {
    mocks.getRewardPoints.mockReturnValue(new Promise(() => {}));
    mocks.getRedemptionHistory.mockReturnValue(new Promise(() => {}));
    render(<RewardsShop />);
    expect(document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('calls getRewardPoints and getRedemptionHistory on mount', async () => {
    await renderLoaded();
    expect(mocks.getRewardPoints).toHaveBeenCalledWith('user-1');
    expect(mocks.getRedemptionHistory).toHaveBeenCalledWith('user-1');
  });

  it('does not load data when user id is missing', () => {
    mocks.user.id = undefined;
    defaultMocks();
    render(<RewardsShop />);
    expect(mocks.getRewardPoints).not.toHaveBeenCalled();
  });

  /* ═══════ Points & Tier card ═══════ */
  it('shows current points', async () => {
    await renderLoaded({}, { points: makeRewardPoints({ currentPoints: 2500 }) });
    expect(screen.getByText('2,500')).toBeTruthy();
  });

  it('shows lifetime points', async () => {
    await renderLoaded({}, { points: makeRewardPoints({ lifetimePoints: 5200 }) });
    expect(screen.getByText('5,200 lifetime points')).toBeTruthy();
  });

  it('shows Your Points label', async () => {
    await renderLoaded();
    expect(screen.getByText('Your Points')).toBeTruthy();
  });

  it('shows tier name', async () => {
    await renderLoaded({}, { points: makeRewardPoints({ tier: 'gold' }) });
    expect(screen.getByText('Gold')).toBeTruthy();
  });

  it('shows points needed to next tier', async () => {
    await renderLoaded({}, {
      points: makeRewardPoints({ tier: 'gold', lifetimePoints: 5200, nextTierPoints: 15000 }),
    });
    expect(screen.getByText('9800 pts to next')).toBeTruthy();
  });

  it('hides pts-to-next for diamond tier', async () => {
    await renderLoaded({}, {
      points: makeRewardPoints({ tier: 'diamond', lifetimePoints: 60000, nextTierPoints: 60000 }),
    });
    expect(screen.queryByText(/pts to next/)).toBeFalsy();
  });

  it('shows My Rewards button', async () => {
    await renderLoaded();
    expect(screen.getByText('My Rewards')).toBeTruthy();
  });

  /* ═══════ Redemption history ═══════ */
  it('toggles redemption history on My Rewards click', async () => {
    const red1 = makeRedemption({ reward: makeReward({ name: 'Free Coffee' }), code: 'COFFEE-123' });
    await renderLoaded({}, { redemptions: [red1] });
    fireEvent.click(screen.getByText('My Rewards'));
    await waitFor(() => expect(screen.getByText('My Redeemed Rewards')).toBeTruthy());
    expect(screen.getAllByText('Free Coffee').length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty redemption state', async () => {
    await renderLoaded({}, { redemptions: [] });
    fireEvent.click(screen.getByText('My Rewards'));
    await waitFor(() => expect(screen.getByText('No rewards redeemed yet')).toBeTruthy());
  });

  it('shows redemption code', async () => {
    await renderLoaded({}, { redemptions: [makeRedemption({ code: 'XYZ-999' })] });
    fireEvent.click(screen.getByText('My Rewards'));
    await waitFor(() => expect(screen.getByText('XYZ-999')).toBeTruthy());
  });

  it('copies code to clipboard on click', async () => {
    await renderLoaded({}, { redemptions: [makeRedemption({ code: 'XYZ-999' })] });
    fireEvent.click(screen.getByText('My Rewards'));
    await waitFor(() => expect(screen.getByText('XYZ-999')).toBeTruthy());
    fireEvent.click(screen.getByText('XYZ-999'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('XYZ-999');
  });

  it('shows Copied after clicking code', async () => {
    await renderLoaded({}, { redemptions: [makeRedemption({ code: 'XYZ-999' })] });
    fireEvent.click(screen.getByText('My Rewards'));
    await waitFor(() => expect(screen.getByText('XYZ-999')).toBeTruthy());
    fireEvent.click(screen.getByText('XYZ-999'));
    expect(screen.getByText('Copied')).toBeTruthy();
  });

  it('shows expiry for unexpired redemptions', async () => {
    const red = makeRedemption({ expiresAt: new Date('2026-06-15') });
    await renderLoaded({}, { redemptions: [red] });
    fireEvent.click(screen.getByText('My Rewards'));
    await waitFor(() => expect(screen.getByText(/Expires/)).toBeTruthy());
  });

  /* ═══════ Category filter ═══════ */
  it('renders all category buttons', async () => {
    await renderLoaded();
    for (const cat of ['all', 'voucher', 'discount', 'donation', 'badge', 'feature']) {
      expect(screen.getAllByText(cat).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('highlights selected category', async () => {
    await renderLoaded();
    expect(screen.getByText('all').closest('button')!.className).toContain('bg-violet-100');
  });

  it('switches category on click', async () => {
    await renderLoaded();
    // Find the filter button specifically (the one in the filter bar)
    const filterBtns = screen.getAllByText('voucher');
    const filterBtn = filterBtns.find(el => el.closest('button')?.className.includes('rounded-xl'))!;
    fireEvent.click(filterBtn.closest('button')!);
    await waitFor(() => {
      const updated = screen.getAllByText('voucher').find(el => el.closest('button')?.className.includes('bg-violet-100'));
      expect(updated).toBeTruthy();
    });
  });

  it('filters rewards by category', async () => {
    await renderLoaded();
    // badge category filter button - find by the filter bar area
    const badgeBtns = screen.getAllByText('badge');
    const filterBtn = badgeBtns.find(el => el.closest('button')?.className.includes('rounded-xl'))!;
    fireEvent.click(filterBtn.closest('button')!);
    await waitFor(() => {
      expect(screen.getByText('Eco Badge')).toBeTruthy();
      expect(screen.queryByText('Free Coffee')).toBeFalsy();
    });
  });

  /* ═══════ Rewards grid ═══════ */
  it('renders all rewards', async () => {
    await renderLoaded();
    expect(screen.getByText('Free Coffee')).toBeTruthy();
    expect(screen.getByText('10% Off Ride')).toBeTruthy();
    expect(screen.getByText('Plant a Tree')).toBeTruthy();
    expect(screen.getByText('Eco Badge')).toBeTruthy();
    expect(screen.getByText('Premium Week')).toBeTruthy();
  });

  it('shows FEATURED badge', async () => {
    await renderLoaded();
    expect(screen.getAllByText('FEATURED').length).toBeGreaterThanOrEqual(1);
  });

  it('shows partner names', async () => {
    await renderLoaded();
    expect(screen.getByText('Costa Coffee')).toBeTruthy();
    expect(screen.getByText('One Tree Planted')).toBeTruthy();
  });

  it('shows Redeem for affordable rewards', async () => {
    await renderLoaded({}, { points: makeRewardPoints({ currentPoints: 2500 }) });
    expect(screen.getAllByText('Redeem').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Need more pts for unaffordable', async () => {
    await renderLoaded({}, { points: makeRewardPoints({ currentPoints: 100 }) });
    expect(screen.getAllByText('Need more pts').length).toBeGreaterThanOrEqual(1);
  });

  it('shows points cost', async () => {
    await renderLoaded();
    expect(screen.getByText('500')).toBeTruthy();
    expect(screen.getByText('300')).toBeTruthy();
  });

  it('shows reward description', async () => {
    await renderLoaded();
    expect(screen.getAllByText('A test reward').length).toBeGreaterThanOrEqual(1);
  });

  it('shows category label on cards', async () => {
    await renderLoaded();
    expect(screen.getAllByText('voucher').length).toBeGreaterThanOrEqual(2);
  });

  /* ═══════ Redeem action ═══════ */
  it('calls redeemReward on Redeem click', async () => {
    mocks.redeemReward.mockResolvedValue({ id: 'result-1' });
    await renderLoaded({ onRedeemSuccess: vi.fn() }, { points: makeRewardPoints({ currentPoints: 2500 }) });
    fireEvent.click(screen.getAllByText('Redeem')[0]);
    await waitFor(() => expect(mocks.redeemReward).toHaveBeenCalled());
  });

  it('calls onRedeemSuccess after redemption', async () => {
    mocks.redeemReward.mockResolvedValue({ id: 'result-1' });
    let callCount = 0;
    mocks.getRewardPoints.mockImplementation(async () => {
      callCount++;
      return makeRewardPoints({ currentPoints: callCount === 1 ? 2500 : 2000 });
    });
    mocks.getRedemptionHistory.mockResolvedValue([]);
    mocks.getAvailableRewards.mockReturnValue([
      makeReward({ id: 'r1', name: 'Free Coffee', pointsCost: 500, featured: true }),
    ]);
    const onSuccess = vi.fn();
    render(<RewardsShop onRedeemSuccess={onSuccess} />);
    await waitFor(() => expect(screen.queryByText('Your Points')).toBeTruthy());
    fireEvent.click(screen.getAllByText('Redeem')[0]);
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  /* ═══════ Empty state ═══════ */
  it('shows empty state when no rewards', async () => {
    await renderLoaded({}, { rewards: [] });
    expect(screen.getByText('No rewards in this category')).toBeTruthy();
    expect(screen.getByText('Check back later for new rewards!')).toBeTruthy();
  });

  /* ═══════ How points work ═══════ */
  it('shows How Points Work section', async () => {
    await renderLoaded();
    expect(screen.getByText('How Points Work')).toBeTruthy();
  });

  it('lists point earning rules', async () => {
    await renderLoaded();
    expect(screen.getByText(/Earn 10 points for every 1kg of CO₂/)).toBeTruthy();
    expect(screen.getByText(/Get 50 bonus points for each completed ride/)).toBeTruthy();
    expect(screen.getByText(/Level up your tier for exclusive perks/)).toBeTruthy();
    expect(screen.getByText(/Redeem for real rewards from our partners/)).toBeTruthy();
  });

  /* ═══════ Value display ═══════ */
  it('shows £ value for vouchers', async () => {
    await renderLoaded();
    expect(screen.getByText(/£3.5/)).toBeTruthy();
  });

  it('shows discount with off suffix', async () => {
    await renderLoaded();
    expect(screen.getAllByText(/off/).length).toBeGreaterThanOrEqual(1);
  });
});
