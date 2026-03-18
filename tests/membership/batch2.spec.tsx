// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

/* ── hoisted mocks ── */
const mocks = vi.hoisted(() => ({
  useAuthReturn: { user: null as any, loading: false, signOut: vi.fn() },
  getUserMembership: vi.fn(),
  cancelSubscription: vi.fn(),
  reactivateSubscription: vi.fn(),
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => mocks.useAuthReturn,
}));

vi.mock('../../src/services/membershipService', () => ({
  membershipService: {
    getUserMembership: mocks.getUserMembership,
    cancelSubscription: mocks.cancelSubscription,
    reactivateSubscription: mocks.reactivateSubscription,
  },
  MEMBERSHIP_PLANS: [
    {
      id: 'free', tier: 'free', name: 'Free', description: 'Essential features',
      priceMonthly: 0, priceYearly: 0, currency: 'GBP', features: [],
    },
    {
      id: 'plus', tier: 'plus', name: 'Plus', description: 'Enhanced features',
      priceMonthly: 4.99, priceYearly: 49.99, currency: 'GBP', popular: true, features: [],
    },
    {
      id: 'pro', tier: 'pro', name: 'Pro', description: 'Maximum features',
      priceMonthly: 9.99, priceYearly: 99.99, currency: 'GBP', features: [],
    },
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
    CreditCard: stub('CreditCard'),
    Calendar: stub('Calendar'),
    Clock: stub('Clock'),
    AlertCircle: stub('AlertCircle'),
    CheckCircle: stub('CheckCircle'),
    XCircle: stub('XCircle'),
    RefreshCw: stub('RefreshCw'),
    ChevronRight: stub('ChevronRight'),
    Shield: stub('Shield'),
    Download: stub('Download'),
    ExternalLink: stub('ExternalLink'),
  };
});

import { SubscriptionManager } from '../../src/components/membership/SubscriptionManager';

afterEach(cleanup);

const FAKE_USER = { id: 'user-1' };

const makeMembership = (overrides: Record<string, any> = {}) => ({
  id: 'mem-1',
  userId: 'user-1',
  tier: 'plus' as const,
  status: 'active' as const,
  billingCycle: 'monthly' as const,
  currentPeriodStart: new Date('2025-02-01'),
  currentPeriodEnd: new Date('2027-04-01'),
  cancelAtPeriodEnd: false,
  trialEnd: undefined,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-02-01'),
  ...overrides,
});

/* ══════════════════════════════════════════════
   SubscriptionManager component
   ══════════════════════════════════════════════ */
describe('SubscriptionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuthReturn.user = null;
    mocks.getUserMembership.mockResolvedValue(null);
    mocks.cancelSubscription.mockResolvedValue(true);
    mocks.reactivateSubscription.mockResolvedValue(true);
  });

  /* ── loading state ── */
  it('shows loading skeleton', () => {
    mocks.useAuthReturn.user = FAKE_USER;
    mocks.getUserMembership.mockReturnValue(new Promise(() => {}));

    const { container } = render(<SubscriptionManager />);
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  /* ── free plan (no membership) ── */
  it('shows Free plan when no membership', async () => {
    mocks.useAuthReturn.user = FAKE_USER;

    render(<SubscriptionManager />);
    await waitFor(() => expect(screen.getAllByText(/Free Plan/).length).toBeGreaterThan(0));
  });

  it('shows Upgrade Plan button for free tier', async () => {
    mocks.useAuthReturn.user = FAKE_USER;
    const onUpgrade = vi.fn();

    render(<SubscriptionManager onUpgrade={onUpgrade} />);
    await waitFor(() => expect(screen.getByText('Upgrade Plan')).toBeTruthy());

    fireEvent.click(screen.getByText('Upgrade Plan'));
    expect(onUpgrade).toHaveBeenCalled();
  });

  /* ── active plus membership ── */
  describe('active plus membership', () => {
    beforeEach(() => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.getUserMembership.mockResolvedValue(makeMembership());
    });

    it('shows Plus Plan header', async () => {
      render(<SubscriptionManager />);
      await waitFor(() => expect(screen.getByText('Plus Plan')).toBeTruthy());
      expect(screen.getByText('Enhanced features')).toBeTruthy();
    });

    it('shows Active status badge', async () => {
      render(<SubscriptionManager />);
      await waitFor(() => expect(screen.getByText('Active')).toBeTruthy());
    });

    it('shows billing info cards', async () => {
      render(<SubscriptionManager />);
      await waitFor(() => expect(screen.getByText('Billing Cycle')).toBeTruthy());
      expect(screen.getByText('monthly')).toBeTruthy();
      expect(screen.getByText('Next Billing')).toBeTruthy();
      expect(screen.getByText('Days Remaining')).toBeTruthy();
    });

    it('shows Upgrade to Pro button', async () => {
      const onUpgrade = vi.fn();
      render(<SubscriptionManager onUpgrade={onUpgrade} />);
      await waitFor(() => expect(screen.getByText('Upgrade to Pro')).toBeTruthy());

      fireEvent.click(screen.getByText('Upgrade to Pro'));
      expect(onUpgrade).toHaveBeenCalled();
    });

    it('shows Manage Payment button', async () => {
      const onManagePayment = vi.fn();
      render(<SubscriptionManager onManagePayment={onManagePayment} />);
      await waitFor(() => expect(screen.getByText('Manage Payment')).toBeTruthy());

      fireEvent.click(screen.getByText('Manage Payment'));
      expect(onManagePayment).toHaveBeenCalled();
    });

    it('shows Cancel Subscription button', async () => {
      render(<SubscriptionManager />);
      await waitFor(() => expect(screen.getByText('Cancel Subscription')).toBeTruthy());
    });
  });

  /* ── cancel subscription ── */
  describe('cancel subscription', () => {
    it('cancels after confirmation', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.getUserMembership.mockResolvedValue(makeMembership());
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<SubscriptionManager />);
      await waitFor(() => expect(screen.getByText('Cancel Subscription')).toBeTruthy());

      fireEvent.click(screen.getByText('Cancel Subscription'));

      await waitFor(() =>
        expect(mocks.cancelSubscription).toHaveBeenCalledWith('user-1', true)
      );
    });

    it('does not cancel when confirm is dismissed', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.getUserMembership.mockResolvedValue(makeMembership());
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<SubscriptionManager />);
      await waitFor(() => expect(screen.getByText('Cancel Subscription')).toBeTruthy());

      fireEvent.click(screen.getByText('Cancel Subscription'));

      expect(mocks.cancelSubscription).not.toHaveBeenCalled();
    });
  });

  /* ── cancelling state (cancelAtPeriodEnd) ── */
  describe('cancelling state', () => {
    it('shows cancellation warning', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.getUserMembership.mockResolvedValue(
        makeMembership({ cancelAtPeriodEnd: true })
      );

      render(<SubscriptionManager />);
      await waitFor(() => expect(screen.getByText('Subscription Cancelling')).toBeTruthy());
      expect(screen.getByText(/Your subscription will end on/)).toBeTruthy();
      expect(screen.getByText('Reactivate Subscription')).toBeTruthy();
    });

    it('shows Access Until instead of Next Billing', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.getUserMembership.mockResolvedValue(
        makeMembership({ cancelAtPeriodEnd: true })
      );

      render(<SubscriptionManager />);
      await waitFor(() => expect(screen.getByText('Access Until')).toBeTruthy());
    });

    it('hides Cancel Subscription and Manage Payment when cancelling', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.getUserMembership.mockResolvedValue(
        makeMembership({ cancelAtPeriodEnd: true })
      );

      render(<SubscriptionManager />);
      await waitFor(() => expect(screen.getByText('Subscription Cancelling')).toBeTruthy());
      expect(screen.queryByText('Cancel Subscription')).toBeNull();
      expect(screen.queryByText('Manage Payment')).toBeNull();
    });

    it('reactivates subscription', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.getUserMembership.mockResolvedValue(
        makeMembership({ cancelAtPeriodEnd: true })
      );

      render(<SubscriptionManager />);
      await waitFor(() => expect(screen.getByText('Reactivate Subscription')).toBeTruthy());

      fireEvent.click(screen.getByText('Reactivate Subscription'));

      await waitFor(() =>
        expect(mocks.reactivateSubscription).toHaveBeenCalledWith('user-1')
      );
    });
  });

  /* ── trial status ── */
  it('shows trial warning for trialing status', async () => {
    mocks.useAuthReturn.user = FAKE_USER;
    mocks.getUserMembership.mockResolvedValue(
      makeMembership({
        status: 'trialing',
        trialEnd: new Date('2025-03-15'),
      })
    );

    render(<SubscriptionManager />);
    await waitFor(() => expect(screen.getByText('Trial Period')).toBeTruthy());
    expect(screen.getByText(/Your trial ends on/)).toBeTruthy();
    expect(screen.getByText(/Add a payment method/)).toBeTruthy();
  });

  it('shows Trial status badge', async () => {
    mocks.useAuthReturn.user = FAKE_USER;
    mocks.getUserMembership.mockResolvedValue(
      makeMembership({ status: 'trialing' })
    );

    render(<SubscriptionManager />);
    await waitFor(() => expect(screen.getByText('Trial')).toBeTruthy());
  });

  /* ── past due status ── */
  it('shows payment failed warning for past_due status', async () => {
    mocks.useAuthReturn.user = FAKE_USER;
    mocks.getUserMembership.mockResolvedValue(
      makeMembership({ status: 'past_due' })
    );

    render(<SubscriptionManager />);
    await waitFor(() => expect(screen.getByText('Payment Failed')).toBeTruthy());
    expect(screen.getByText(/We couldn't process your last payment/)).toBeTruthy();
  });

  it('shows Past Due status badge', async () => {
    mocks.useAuthReturn.user = FAKE_USER;
    mocks.getUserMembership.mockResolvedValue(
      makeMembership({ status: 'past_due' })
    );

    render(<SubscriptionManager />);
    await waitFor(() => expect(screen.getByText('Past Due')).toBeTruthy());
  });

  /* ── pro tier ── */
  it('does not show upgrade button for pro tier', async () => {
    mocks.useAuthReturn.user = FAKE_USER;
    mocks.getUserMembership.mockResolvedValue(
      makeMembership({ tier: 'pro' })
    );

    render(<SubscriptionManager />);
    await waitFor(() => expect(screen.getByText('Pro Plan')).toBeTruthy());
    expect(screen.queryByText('Upgrade to Pro')).toBeNull();
    expect(screen.queryByText('Upgrade Plan')).toBeNull();
  });

  /* ── quick links ── */
  it('shows quick links', async () => {
    mocks.useAuthReturn.user = FAKE_USER;

    render(<SubscriptionManager />);
    await waitFor(() => expect(screen.getByText('Download Invoices')).toBeTruthy());
    expect(screen.getByText('Get PDF copies of your invoices')).toBeTruthy();
    expect(screen.getByText('Billing History')).toBeTruthy();
    expect(screen.getByText('View all past transactions')).toBeTruthy();
  });

  /* ── FAQ ── */
  it('shows FAQ section', async () => {
    mocks.useAuthReturn.user = FAKE_USER;

    render(<SubscriptionManager />);
    await waitFor(() => expect(screen.getByText('Frequently Asked Questions')).toBeTruthy());
    expect(screen.getByText('Can I cancel anytime?')).toBeTruthy();
    expect(screen.getByText('What happens to my data if I downgrade?')).toBeTruthy();
    expect(screen.getByText('Can I switch plans?')).toBeTruthy();
  });

  /* ── expired / cancelled status badges ── */
  it('shows Cancelled badge for cancelled status', async () => {
    mocks.useAuthReturn.user = FAKE_USER;
    mocks.getUserMembership.mockResolvedValue(
      makeMembership({ status: 'cancelled' })
    );

    render(<SubscriptionManager />);
    await waitFor(() => expect(screen.getByText('Cancelled')).toBeTruthy());
  });

  it('shows Expired badge for expired status', async () => {
    mocks.useAuthReturn.user = FAKE_USER;
    mocks.getUserMembership.mockResolvedValue(
      makeMembership({ status: 'expired' })
    );

    render(<SubscriptionManager />);
    await waitFor(() => expect(screen.getByText('Expired')).toBeTruthy());
  });
});
