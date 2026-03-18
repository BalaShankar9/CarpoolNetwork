// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

/* ── hoisted mocks ── */
const mocks = vi.hoisted(() => ({
  calculateYearlySavings: vi.fn(),
}));

vi.mock('../../src/services/membershipService', () => ({
  membershipService: {
    calculateYearlySavings: mocks.calculateYearlySavings,
  },
  MEMBERSHIP_PLANS: [
    {
      id: 'free',
      tier: 'free',
      name: 'Free',
      description: 'Essential features',
      priceMonthly: 0,
      priceYearly: 0,
      currency: 'GBP',
      features: [
        { name: 'Find rides', included: true },
        { name: 'Priority matching', included: false },
      ],
    },
    {
      id: 'plus',
      tier: 'plus',
      name: 'Plus',
      description: 'Enhanced features',
      priceMonthly: 4.99,
      priceYearly: 49.99,
      currency: 'GBP',
      popular: true,
      features: [
        { name: 'Find rides', included: true },
        { name: 'Priority matching', included: true },
        { name: 'Saved routes', included: true, limit: 5 },
      ],
    },
    {
      id: 'pro',
      tier: 'pro',
      name: 'Pro',
      description: 'Maximum features',
      priceMonthly: 9.99,
      priceYearly: 99.99,
      currency: 'GBP',
      features: [
        { name: 'Everything in Plus', included: true },
        { name: 'Unlimited routes', included: true, limit: 'unlimited' },
      ],
    },
  ],
  MEMBERSHIP_BENEFITS: [
    { key: 'rides', name: 'Monthly rides', freeTier: 'Unlimited', plusTier: 'Unlimited', proTier: 'Unlimited' },
    { key: 'ads', name: 'Ad-free', freeTier: false, plusTier: true, proTier: true },
    { key: 'saved_routes', name: 'Saved routes', freeTier: 2, plusTier: 5, proTier: 'Unlimited' },
  ],
}));

// framer-motion mock
vi.mock('framer-motion', () => {
  const handler: ProxyHandler<object> = {
    get(_t, prop) {
      return React.forwardRef((p: any, ref: any) => {
        const { initial, animate, exit, variants, whileHover, whileTap, transition, ...rest } = p;
        return React.createElement(typeof prop === 'string' ? prop : 'div', { ...rest, ref });
      });
    },
  };
  return {
    motion: new Proxy({}, handler),
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

vi.mock('lucide-react', () => {
  const stub = (name: string) => (p: any) => <span data-testid={`icon-${name}`} {...p} />;
  return {
    Crown: stub('Crown'),
    Check: stub('Check'),
    X: stub('X'),
    Sparkles: stub('Sparkles'),
    Star: stub('Star'),
    Zap: stub('Zap'),
    Calendar: stub('Calendar'),
    Shield: stub('Shield'),
    Headphones: stub('Headphones'),
    TrendingUp: stub('TrendingUp'),
    Gift: stub('Gift'),
  };
});

import { PremiumPlans } from '../../src/components/membership/PremiumPlans';

afterEach(cleanup);

/* ══════════════════════════════════════════════
   PremiumPlans component
   ══════════════════════════════════════════════ */
describe('PremiumPlans', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.calculateYearlySavings.mockReturnValue({ amount: 9.89, percentage: 17 });
  });

  /* ── header ── */
  it('renders header with title and description', () => {
    render(<PremiumPlans />);
    expect(screen.getByText('Premium Membership')).toBeTruthy();
    expect(screen.getByText('Choose Your Plan')).toBeTruthy();
    expect(screen.getByText(/Unlock premium features/)).toBeTruthy();
  });

  /* ── billing toggle ── */
  it('defaults to yearly billing', () => {
    render(<PremiumPlans />);
    const yearlyBtn = screen.getByText('Yearly').closest('button')!;
    expect(yearlyBtn.className).toContain('bg-white');
    expect(screen.getByText('Save 17%')).toBeTruthy();
  });

  it('switches to monthly billing', () => {
    render(<PremiumPlans />);
    fireEvent.click(screen.getByText('Monthly'));
    // Monthly prices should show
    expect(screen.getByText('£4.99')).toBeTruthy();
    expect(screen.getByText('£9.99')).toBeTruthy();
  });

  it('shows yearly prices by default', () => {
    render(<PremiumPlans />);
    expect(screen.getByText('£49.99')).toBeTruthy();
    expect(screen.getByText('£99.99')).toBeTruthy();
  });

  it('shows yearly savings for paid plans', () => {
    render(<PremiumPlans />);
    // savings shown for yearly billing on paid plans
    const savingsTexts = screen.getAllByText(/Save £9.89\/year/);
    expect(savingsTexts.length).toBeGreaterThan(0);
  });

  /* ── plan cards ── */
  it('renders all three plan cards', () => {
    render(<PremiumPlans />);
    expect(screen.getAllByText('Free').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Plus').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pro').length).toBeGreaterThan(0);
  });

  it('shows plan descriptions', () => {
    render(<PremiumPlans />);
    expect(screen.getByText('Essential features')).toBeTruthy();
    expect(screen.getByText('Enhanced features')).toBeTruthy();
    expect(screen.getByText('Maximum features')).toBeTruthy();
  });

  it('shows MOST POPULAR badge on popular plan', () => {
    render(<PremiumPlans />);
    expect(screen.getByText('MOST POPULAR')).toBeTruthy();
  });

  it('shows feature lists with included/excluded icons', () => {
    render(<PremiumPlans />);
    // Free plan has "Find rides" included, "Priority matching" excluded
    expect(screen.getAllByText('Find rides').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Priority matching').length).toBeGreaterThan(0);
  });

  it('shows feature limits', () => {
    render(<PremiumPlans />);
    expect(screen.getByText('(5)')).toBeTruthy();
  });

  /* ── current plan badge ── */
  it('shows CURRENT PLAN badge for current tier', () => {
    render(<PremiumPlans currentTier="plus" />);
    expect(screen.getByText('CURRENT PLAN')).toBeTruthy();
  });

  it('shows Current Plan disabled button for current tier', () => {
    render(<PremiumPlans currentTier="plus" />);
    const currentBtn = screen.getByText('Current Plan');
    expect((currentBtn as HTMLButtonElement).disabled).toBe(true);
  });

  /* ── upgrade buttons ── */
  it('shows upgrade buttons for higher tiers', () => {
    render(<PremiumPlans currentTier="free" />);
    expect(screen.getByText('Upgrade to Plus')).toBeTruthy();
    expect(screen.getByText('Upgrade to Pro')).toBeTruthy();
  });

  it('shows Free Forever for free plan when on higher tier', () => {
    render(<PremiumPlans currentTier="plus" />);
    expect(screen.getAllByText('Free Forever').length).toBeGreaterThan(0);
  });

  it('calls onSubscribe when upgrade button clicked', async () => {
    const onSubscribe = vi.fn().mockResolvedValue(undefined);
    render(<PremiumPlans currentTier="free" onSubscribe={onSubscribe} />);

    fireEvent.click(screen.getByText('Upgrade to Plus'));
    await waitFor(() =>
      expect(onSubscribe).toHaveBeenCalledWith('plus', 'yearly')
    );
  });

  it('passes monthly billing cycle when monthly selected', async () => {
    const onSubscribe = vi.fn().mockResolvedValue(undefined);
    render(<PremiumPlans currentTier="free" onSubscribe={onSubscribe} />);

    fireEvent.click(screen.getByText('Monthly'));
    fireEvent.click(screen.getByText('Upgrade to Plus'));

    await waitFor(() =>
      expect(onSubscribe).toHaveBeenCalledWith('plus', 'monthly')
    );
  });

  /* ── free trial ── */
  it('shows trial button when onStartTrial provided', () => {
    const onStartTrial = vi.fn();
    render(<PremiumPlans currentTier="free" onStartTrial={onStartTrial} />);

    const trialButtons = screen.getAllByText('Start 7-day free trial');
    expect(trialButtons.length).toBeGreaterThan(0);
  });

  it('does not show trial button when onStartTrial not provided', () => {
    render(<PremiumPlans currentTier="free" />);
    expect(screen.queryByText('Start 7-day free trial')).toBeNull();
  });

  it('calls onStartTrial when trial button clicked', async () => {
    const onStartTrial = vi.fn().mockResolvedValue(undefined);
    render(<PremiumPlans currentTier="free" onStartTrial={onStartTrial} />);

    const trialButtons = screen.getAllByText('Start 7-day free trial');
    fireEvent.click(trialButtons[0]);

    await waitFor(() => expect(onStartTrial).toHaveBeenCalled());
  });

  /* ── comparison table ── */
  it('renders comparison table', () => {
    render(<PremiumPlans />);
    expect(screen.getByText('Compare All Features')).toBeTruthy();
    expect(screen.getByText('Monthly rides')).toBeTruthy();
    expect(screen.getByText('Ad-free')).toBeTruthy();
    expect(screen.getAllByText('Saved routes').length).toBeGreaterThan(0);
  });

  it('shows benefit values in table', () => {
    render(<PremiumPlans />);
    // "Unlimited" appears multiple times in the table
    expect(screen.getAllByText('Unlimited').length).toBeGreaterThan(0);
    // Numeric values
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
  });

  /* ── trust badges ── */
  it('shows trust badges', () => {
    render(<PremiumPlans />);
    expect(screen.getByText('Secure payments')).toBeTruthy();
    expect(screen.getByText('Cancel anytime')).toBeTruthy();
    expect(screen.getByText('24/7 support')).toBeTruthy();
    expect(screen.getByText('30-day money back')).toBeTruthy();
  });

  /* ── plus user viewing pro ── */
  it('shows only Upgrade to Pro for plus user', () => {
    render(<PremiumPlans currentTier="plus" />);
    expect(screen.getByText('Upgrade to Pro')).toBeTruthy();
    expect(screen.queryByText('Upgrade to Plus')).toBeNull();
  });

  /* ── pro user sees no upgrade buttons ── */
  it('shows no upgrade buttons for pro user', () => {
    render(<PremiumPlans currentTier="pro" />);
    expect(screen.queryByText('Upgrade to Plus')).toBeNull();
    expect(screen.queryByText('Upgrade to Pro')).toBeNull();
    expect(screen.getByText('CURRENT PLAN')).toBeTruthy();
  });
});
