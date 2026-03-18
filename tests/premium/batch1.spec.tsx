// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

/* ─── hoisted mocks ─── */
const mocks = vi.hoisted(() => ({
  isPremium: false,
  subscriptionsEnabled: true,
  loading: false,
  isTrialing: false,
  daysRemaining: 0,
}));

vi.mock('../../src/contexts/PremiumContext', () => ({
  usePremium: () => ({
    isPremium: mocks.isPremium,
    subscriptionsEnabled: mocks.subscriptionsEnabled,
    loading: mocks.loading,
    isTrialing: mocks.isTrialing,
    daysRemaining: mocks.daysRemaining,
  }),
}));

vi.mock('../../src/services/subscriptionService', () => ({
  PREMIUM_FEATURES: [
    { title: 'Priority Ride Matching', description: 'Get matched faster', icon: 'zap' },
    { title: 'Advanced Route Optimization', description: 'Smart routing', icon: 'map' },
    { title: 'Detailed Analytics', description: 'Track your savings', icon: 'bar-chart' },
    { title: 'Ad-Free Experience', description: 'No interruptions', icon: 'eye-off' },
    { title: 'Premium Support', description: 'Priority support', icon: 'headphones' },
    { title: 'Exclusive Features', description: 'Early access', icon: 'star' },
  ],
  PREMIUM_PRICE_DISPLAY: '£5',
  TRIAL_DAYS: 90,
}));

vi.mock('lucide-react', () => {
  const React = require('react');
  const s = (n: string) => (props: any) => React.createElement('span', { 'data-testid': `icon-${n}`, ...props });
  return {
    Crown: s('Crown'), Lock: s('Lock'), Sparkles: s('Sparkles'), Check: s('Check'),
  };
});

import PremiumGate, { PremiumBadge, PremiumFeaturesList, PremiumCTACard, PremiumLockIcon } from '../../src/components/premium/PremiumGate';

beforeEach(() => {
  mocks.isPremium = false;
  mocks.subscriptionsEnabled = true;
  mocks.loading = false;
  mocks.isTrialing = false;
  mocks.daysRemaining = 0;
});
afterEach(cleanup);

/* ═══════════════════════════════════════
   PremiumGate – loading
   ═══════════════════════════════════════ */
describe('PremiumGate – loading', () => {
  it('shows spinner when loading', () => {
    mocks.loading = true;
    render(<PremiumGate><p>Secret</p></PremiumGate>);
    expect(document.querySelector('.animate-spin')).toBeTruthy();
    expect(screen.queryByText('Secret')).toBeNull();
  });
});

/* ═══════════════════════════════════════
   PremiumGate – access
   ═══════════════════════════════════════ */
describe('PremiumGate – access', () => {
  it('shows children when premium', () => {
    mocks.isPremium = true;
    render(<PremiumGate><p>Secret Content</p></PremiumGate>);
    expect(screen.getByText('Secret Content')).toBeTruthy();
  });

  it('shows children when subscriptions disabled', () => {
    mocks.subscriptionsEnabled = false;
    mocks.isPremium = false;
    render(<PremiumGate><p>Secret Content</p></PremiumGate>);
    expect(screen.getByText('Secret Content')).toBeTruthy();
  });

  it('shows upgrade prompt when not premium', () => {
    mocks.isPremium = false;
    render(<PremiumGate><p>Secret</p></PremiumGate>);
    expect(screen.getByText('Upgrade to Premium')).toBeTruthy();
  });

  it('shows feature name in upgrade prompt', () => {
    mocks.isPremium = false;
    render(<PremiumGate feature="Advanced Search"><p>x</p></PremiumGate>);
    expect(screen.getByText(/Advanced Search is a premium feature/)).toBeTruthy();
  });

  it('shows trial days in upgrade prompt', () => {
    mocks.isPremium = false;
    render(<PremiumGate><p>x</p></PremiumGate>);
    expect(screen.getByText(/90-day free trial/)).toBeTruthy();
  });

  it('shows Start Free Trial button', () => {
    mocks.isPremium = false;
    render(<PremiumGate><p>x</p></PremiumGate>);
    expect(screen.getByText('Start Free Trial')).toBeTruthy();
  });

  it('shows fallback when provided', () => {
    mocks.isPremium = false;
    render(<PremiumGate fallback={<p>Free version</p>}><p>Premium</p></PremiumGate>);
    expect(screen.getByText('Free version')).toBeTruthy();
    expect(screen.queryByText('Premium')).toBeNull();
  });

  it('shows blurred content when showUpgradePrompt=false', () => {
    mocks.isPremium = false;
    render(<PremiumGate showUpgradePrompt={false}><p>Blurred</p></PremiumGate>);
    expect(screen.getByText('Premium Feature')).toBeTruthy();
    expect(screen.getByText('Blurred')).toBeTruthy(); // Content is there but blurred
  });

  it('shows custom feature name in lock overlay', () => {
    mocks.isPremium = false;
    render(<PremiumGate showUpgradePrompt={false} feature="Analytics"><p>x</p></PremiumGate>);
    expect(screen.getByText('Analytics requires premium')).toBeTruthy();
  });
});

/* ═══════════════════════════════════════
   PremiumBadge
   ═══════════════════════════════════════ */
describe('PremiumBadge', () => {
  it('returns null when not premium', () => {
    mocks.isPremium = false;
    const { container } = render(<PremiumBadge />);
    expect(container.innerHTML).toBe('');
  });

  it('shows Premium text when premium and not trialing', () => {
    mocks.isPremium = true;
    mocks.isTrialing = false;
    render(<PremiumBadge />);
    expect(screen.getByText('Premium')).toBeTruthy();
  });

  it('shows trial info when trialing', () => {
    mocks.isPremium = true;
    mocks.isTrialing = true;
    mocks.daysRemaining = 45;
    render(<PremiumBadge />);
    expect(screen.getByText('Trial (45 days left)')).toBeTruthy();
  });

  it('shows Crown icon', () => {
    mocks.isPremium = true;
    render(<PremiumBadge />);
    expect(document.querySelector('[data-testid="icon-Crown"]')).toBeTruthy();
  });
});

/* ═══════════════════════════════════════
   PremiumFeaturesList
   ═══════════════════════════════════════ */
describe('PremiumFeaturesList', () => {
  it('shows all features in full mode', () => {
    render(<PremiumFeaturesList />);
    expect(screen.getByText('Priority Ride Matching')).toBeTruthy();
    expect(screen.getByText('Advanced Route Optimization')).toBeTruthy();
    expect(screen.getByText('Detailed Analytics')).toBeTruthy();
    expect(screen.getByText('Ad-Free Experience')).toBeTruthy();
    expect(screen.getByText('Premium Support')).toBeTruthy();
    expect(screen.getByText('Exclusive Features')).toBeTruthy();
  });

  it('shows descriptions in full mode', () => {
    render(<PremiumFeaturesList />);
    expect(screen.getByText('Get matched faster')).toBeTruthy();
    expect(screen.getByText('Smart routing')).toBeTruthy();
  });

  it('shows first 4 features in compact mode', () => {
    render(<PremiumFeaturesList compact />);
    expect(screen.getByText('Priority Ride Matching')).toBeTruthy();
    expect(screen.getByText('Ad-Free Experience')).toBeTruthy();
  });

  it('shows +N more in compact mode', () => {
    render(<PremiumFeaturesList compact />);
    expect(screen.getByText('+ 2 more features')).toBeTruthy();
  });
});

/* ═══════════════════════════════════════
   PremiumCTACard
   ═══════════════════════════════════════ */
describe('PremiumCTACard', () => {
  it('shows Carpool Premium title', () => {
    render(<PremiumCTACard />);
    expect(screen.getByText('Carpool Premium')).toBeTruthy();
  });

  it('shows Unlock Premium Features when not trialing', () => {
    mocks.isTrialing = false;
    render(<PremiumCTACard />);
    expect(screen.getByText('Unlock Premium Features')).toBeTruthy();
  });

  it('shows price in description', () => {
    mocks.isTrialing = false;
    render(<PremiumCTACard />);
    expect(screen.getByText(/£5\/month/)).toBeTruthy();
  });

  it('shows Start Trial button when not trialing', () => {
    mocks.isTrialing = false;
    render(<PremiumCTACard />);
    expect(screen.getByText('Start 90-Day Free Trial')).toBeTruthy();
  });

  it('shows trial days remaining when trialing', () => {
    mocks.isTrialing = true;
    mocks.daysRemaining = 30;
    render(<PremiumCTACard />);
    expect(screen.getByText('30 days left in your trial')).toBeTruthy();
  });

  it('shows Upgrade Now button when trialing', () => {
    mocks.isTrialing = true;
    mocks.daysRemaining = 30;
    render(<PremiumCTACard />);
    expect(screen.getByText('Upgrade Now')).toBeTruthy();
  });

  it('shows feature highlights', () => {
    render(<PremiumCTACard />);
    expect(screen.getByText('Priority ride matching')).toBeTruthy();
    expect(screen.getByText('Advanced analytics')).toBeTruthy();
    expect(screen.getByText('Ad-free experience')).toBeTruthy();
  });
});

/* ═══════════════════════════════════════
   PremiumLockIcon
   ═══════════════════════════════════════ */
describe('PremiumLockIcon', () => {
  it('shows Crown icon when not premium', () => {
    mocks.isPremium = false;
    mocks.subscriptionsEnabled = true;
    render(<PremiumLockIcon />);
    expect(document.querySelector('[data-testid="icon-Crown"]')).toBeTruthy();
  });

  it('returns null when premium', () => {
    mocks.isPremium = true;
    const { container } = render(<PremiumLockIcon />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when subscriptions disabled', () => {
    mocks.subscriptionsEnabled = false;
    mocks.isPremium = false;
    const { container } = render(<PremiumLockIcon />);
    expect(container.innerHTML).toBe('');
  });
});
