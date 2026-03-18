// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { makeCarbonStats } from './helpers';

/* ─── hoisted mocks ─── */
const mocks = vi.hoisted(() => ({
  user: { id: 'user-1', email: 'test@test.com' } as any,
  getCarbonStats: vi.fn(),
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock('../../src/services/carbonRewardsService', () => ({
  carbonRewardsService: {
    getCarbonStats: mocks.getCarbonStats,
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

import { CarbonDashboard } from '../../src/components/rewards/CarbonDashboard';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.id = 'user-1';
});
afterEach(cleanup);

async function renderLoaded(props: any = {}, statsOverrides?: any) {
  const stats = makeCarbonStats(statsOverrides);
  mocks.getCarbonStats.mockResolvedValue(stats);
  const result = render(<CarbonDashboard {...props} />);
  await waitFor(() => {
    expect(screen.queryByText('CO₂ emissions prevented')).toBeTruthy();
  });
  return { ...result, stats };
}

describe('CarbonDashboard', () => {
  /* ═══════ Loading ═══════ */
  it('shows loading skeleton while data loads', () => {
    mocks.getCarbonStats.mockReturnValue(new Promise(() => {}));
    render(<CarbonDashboard />);
    expect(document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('calls getCarbonStats on mount with user id', async () => {
    mocks.getCarbonStats.mockResolvedValue(makeCarbonStats());
    render(<CarbonDashboard />);
    await waitFor(() => expect(mocks.getCarbonStats).toHaveBeenCalledWith('user-1'));
  });

  it('does not call getCarbonStats when user id is missing', () => {
    mocks.user.id = undefined;
    render(<CarbonDashboard />);
    expect(mocks.getCarbonStats).not.toHaveBeenCalled();
  });

  /* ═══════ Hero card ═══════ */
  it('renders total CO₂ saved', async () => {
    await renderLoaded({}, { totalCO2Saved: 150.5 });
    expect(screen.getByText('150.5 kg')).toBeTruthy();
  });

  it('shows CO₂ emissions prevented label', async () => {
    await renderLoaded();
    expect(screen.getByText('CO₂ emissions prevented')).toBeTruthy();
  });

  it('renders trees equivalent stat', async () => {
    await renderLoaded({}, { treesEquivalent: 7 });
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('Trees equivalent')).toBeTruthy();
  });

  it('renders rides shared stat', async () => {
    await renderLoaded({}, { ridesShared: 42 });
    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getByText('Rides shared')).toBeTruthy();
  });

  it('renders km shared stat', async () => {
    await renderLoaded({}, { totalDistanceShared: 820 });
    expect(screen.getByText('820')).toBeTruthy();
    expect(screen.getByText('Km shared')).toBeTruthy();
  });

  it('shows Your Environmental Impact label', async () => {
    await renderLoaded();
    expect(screen.getByText('Your Environmental Impact')).toBeTruthy();
  });

  /* ═══════ Impact comparison ═══════ */
  it('shows car trips avoided (ridesShared*0.8)', async () => {
    await renderLoaded({}, { ridesShared: 42 });
    expect(screen.getByText('34')).toBeTruthy();
    expect(screen.getByText('Solo car trips avoided')).toBeTruthy();
  });

  it('shows fuel saved in litres', async () => {
    await renderLoaded({}, { totalCO2Saved: 150.5 });
    expect(screen.getByText('65.2L')).toBeTruthy();
    expect(screen.getByText('Fuel not burned')).toBeTruthy();
  });

  it('shows estimated money saved', async () => {
    await renderLoaded({}, { totalCO2Saved: 150.5 });
    expect(screen.getByText('£95')).toBeTruthy();
    expect(screen.getByText('Estimated savings')).toBeTruthy();
  });

  it('shows Your Impact Equals heading', async () => {
    await renderLoaded();
    expect(screen.getByText('Your Impact Equals...')).toBeTruthy();
  });

  /* ═══════ Monthly progress ═══════ */
  it('shows monthly average CO₂ saved', async () => {
    await renderLoaded({}, { monthlyAverage: 12.5 });
    expect(screen.getByText('12.5 kg')).toBeTruthy();
    expect(screen.getByText('CO₂ saved per month')).toBeTruthy();
  });

  it('shows Monthly Average heading', async () => {
    await renderLoaded();
    expect(screen.getByText('Monthly Average')).toBeTruthy();
  });

  it('renders period filter buttons', async () => {
    await renderLoaded();
    expect(screen.getByText('30d')).toBeTruthy();
    expect(screen.getByText('1y')).toBeTruthy();
    expect(screen.getByText('All')).toBeTruthy();
  });

  it('switches selected period on click', async () => {
    await renderLoaded();
    fireEvent.click(screen.getByText('30d'));
    await waitFor(() => {
      expect(screen.getByText('30d').className).toContain('bg-white');
    });
  });

  it('shows trend indicator', async () => {
    await renderLoaded();
    expect(screen.getByText('+12%')).toBeTruthy();
    expect(screen.getByText('vs last month')).toBeTruthy();
  });

  /* ═══════ Eco tips ═══════ */
  it('shows Did You Know heading', async () => {
    await renderLoaded();
    expect(screen.getByText('Did You Know?')).toBeTruthy();
  });

  it('displays CO₂ per km fact', async () => {
    await renderLoaded();
    expect(screen.getByText('0.21 kg')).toBeTruthy();
  });

  it('shows traffic congestion fact', async () => {
    await renderLoaded();
    expect(screen.getByText('30%')).toBeTruthy();
  });

  it('shows trees absorption fact', async () => {
    await renderLoaded();
    expect(screen.getByText('22 trees')).toBeTruthy();
  });

  /* ═══════ Community ═══════ */
  it('shows Community Impact heading', async () => {
    await renderLoaded();
    expect(screen.getByText('Community Impact')).toBeTruthy();
  });

  it('shows Coming Soon badge', async () => {
    await renderLoaded();
    expect(screen.getByText('Coming Soon')).toBeTruthy();
  });

  it('shows leaderboard prompt', async () => {
    await renderLoaded();
    expect(screen.getByText('Join the leaderboard')).toBeTruthy();
    expect(screen.getByText('Complete more rides to rank up')).toBeTruthy();
  });

  /* ═══════ Share button ═══════ */
  it('renders share button when onShareStats provided', async () => {
    await renderLoaded({ onShareStats: vi.fn() });
    expect(document.querySelector('[data-testid="icon-Share2"]')).toBeTruthy();
  });

  it('calls onShareStats on share click', async () => {
    const onShare = vi.fn();
    await renderLoaded({ onShareStats: onShare });
    const btn = document.querySelector('[data-testid="icon-Share2"]')!.closest('button')!;
    fireEvent.click(btn);
    expect(onShare).toHaveBeenCalledOnce();
  });

  it('hides share button when onShareStats not provided', async () => {
    await renderLoaded();
    const shareBtn = Array.from(document.querySelectorAll('button')).find(b =>
      b.querySelector('[data-testid="icon-Share2"]')
    );
    expect(shareBtn).toBeFalsy();
  });

  /* ═══════ Zero stats ═══════ */
  it('handles zero stats gracefully', async () => {
    await renderLoaded({}, {
      totalCO2Saved: 0, totalDistanceShared: 0, ridesShared: 0,
      treesEquivalent: 0, monthlyAverage: 0,
    });
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('£0')).toBeTruthy();
  });
});
