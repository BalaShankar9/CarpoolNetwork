/**
 * Payments module — Batch 2
 * FuelContributionForm (18 tests)
 * PaymentHistory       (17 tests)
 * ≈ 35 tests
 */
// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import {
  FAKE_USER,
  FAKE_USER_ID,
  FAKE_OTHER_USER_ID,
  FAKE_RIDE_ID,
  FAKE_FUEL_CONTRIBUTION,
  FAKE_METHODS,
  FAKE_PAYMENTS,
  FAKE_PAYMENT_SENT,
  FAKE_PAYMENT_RECEIVED,
  FAKE_PAYMENT_PENDING,
  FAKE_STATS,
} from './helpers';

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
    // FuelContributionForm icons
    Fuel: stub('Fuel'),
    Users: stub('Users'),
    MapPin: stub('MapPin'),
    Calculator: stub('Calculator'),
    Loader2: stub('Loader2'),
    Check: stub('Check'),
    CreditCard: stub('CreditCard'),
    Wallet: stub('Wallet'),
    Split: stub('Split'),
    Info: stub('Info'),
    ChevronRight: stub('ChevronRight'),
    // PaymentHistory icons
    ArrowUpRight: stub('ArrowUpRight'),
    ArrowDownLeft: stub('ArrowDownLeft'),
    Receipt: stub('Receipt'),
    Clock: stub('Clock'),
    CheckCircle: stub('CheckCircle'),
    XCircle: stub('XCircle'),
    RefreshCw: stub('RefreshCw'),
    Filter: stub('Filter'),
    Download: stub('Download'),
    // shared
    Plus: stub('Plus'),
    Trash2: stub('Trash2'),
    Star: stub('Star'),
    Shield: stub('Shield'),
    X: stub('X'),
    AlertCircle: stub('AlertCircle'),

    // paymentService mock fns
    calculateFuelContribution: vi.fn(),
    createPaymentIntent: vi.fn(),
    updatePaymentStatus: vi.fn(),
    getUserPayments: vi.fn(),
    getPaymentStats: vi.fn(),
    getUserPaymentMethods: vi.fn(),
    setDefaultPaymentMethod: vi.fn(),
    removePaymentMethod: vi.fn(),
    addPaymentMethod: vi.fn(),

    mockUser: null as any,
  };
});

/* ------------------------------------------------------------------ */
/*  Module mocks                                                       */
/* ------------------------------------------------------------------ */

vi.mock('lucide-react', () => ({
  Fuel: mocks.Fuel,
  Users: mocks.Users,
  MapPin: mocks.MapPin,
  Calculator: mocks.Calculator,
  Loader2: mocks.Loader2,
  Check: mocks.Check,
  CreditCard: mocks.CreditCard,
  Wallet: mocks.Wallet,
  Split: mocks.Split,
  Info: mocks.Info,
  ChevronRight: mocks.ChevronRight,
  ArrowUpRight: mocks.ArrowUpRight,
  ArrowDownLeft: mocks.ArrowDownLeft,
  Receipt: mocks.Receipt,
  Clock: mocks.Clock,
  CheckCircle: mocks.CheckCircle,
  XCircle: mocks.XCircle,
  RefreshCw: mocks.RefreshCw,
  Filter: mocks.Filter,
  Download: mocks.Download,
  Plus: mocks.Plus,
  Trash2: mocks.Trash2,
  Star: mocks.Star,
  Shield: mocks.Shield,
  X: mocks.X,
  AlertCircle: mocks.AlertCircle,
}));

vi.mock('framer-motion', () => {
  const motion = new Proxy(
    {},
    {
      get: (_t, tag: string) => {
        const Comp = React.forwardRef(({ children, ...rest }: any, ref: any) => {
          const safe = { ...rest };
          [
            'initial', 'animate', 'exit', 'transition', 'variants',
            'whileHover', 'whileTap', 'whileFocus', 'layout',
          ].forEach((k) => delete safe[k]);
          return React.createElement(tag, { ...safe, ref }, children);
        });
        Comp.displayName = `motion.${tag}`;
        return Comp;
      },
    }
  );
  return {
    motion,
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

vi.mock('../../src/services/paymentService', () => ({
  paymentService: {
    calculateFuelContribution: (...a: any[]) => mocks.calculateFuelContribution(...a),
    createPaymentIntent: (...a: any[]) => mocks.createPaymentIntent(...a),
    updatePaymentStatus: (...a: any[]) => mocks.updatePaymentStatus(...a),
    getUserPayments: (...a: any[]) => mocks.getUserPayments(...a),
    getPaymentStats: (...a: any[]) => mocks.getPaymentStats(...a),
    getUserPaymentMethods: (...a: any[]) => mocks.getUserPaymentMethods(...a),
    setDefaultPaymentMethod: (...a: any[]) => mocks.setDefaultPaymentMethod(...a),
    removePaymentMethod: (...a: any[]) => mocks.removePaymentMethod(...a),
    addPaymentMethod: (...a: any[]) => mocks.addPaymentMethod(...a),
  },
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.mockUser }),
}));

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: any) => <div data-testid="stripe-elements">{children}</div>,
  CardElement: () => <div data-testid="card-element" />,
  useStripe: () => ({ createPaymentMethod: vi.fn() }),
  useElements: () => ({ getElement: vi.fn() }),
}));

/* ------------------------------------------------------------------ */
/*  Import components AFTER mocks                                      */
/* ------------------------------------------------------------------ */

import { FuelContributionForm } from '../../src/components/payments/FuelContributionForm';
import { PaymentHistory } from '../../src/components/payments/PaymentHistory';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

afterEach(cleanup);

const FUEL_PROPS = {
  rideId: FAKE_RIDE_ID,
  driverId: FAKE_OTHER_USER_ID,
  distanceKm: 40,
  passengers: 2,
  driverName: 'Alice',
};

function renderFuelForm(overrides: any = {}) {
  return render(<FuelContributionForm {...FUEL_PROPS} {...overrides} />);
}

function renderHistory(props: any = {}) {
  return render(<PaymentHistory {...props} />);
}

/* ================================================================== */
/*  FuelContributionForm                                               */
/* ================================================================== */

describe('FuelContributionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockUser = { ...FAKE_USER };
    // calculateFuelContribution is synchronous - returns a FuelContribution
    mocks.calculateFuelContribution.mockReturnValue({ ...FAKE_FUEL_CONTRIBUTION });
    mocks.createPaymentIntent.mockResolvedValue({
      clientSecret: 'cs_test',
      paymentId: 'pay-new-001',
    });
    mocks.updatePaymentStatus.mockResolvedValue(undefined);
    // PaymentMethods (rendered in payment step) needs these
    mocks.getUserPaymentMethods.mockResolvedValue(FAKE_METHODS);
  });

  /* ---- Header ---- */
  it('renders header with Fuel Contribution title', () => {
    renderFuelForm();
    expect(screen.getByText('Fuel Contribution')).toBeTruthy();
  });

  it("shows driver name in subtitle", () => {
    renderFuelForm();
    expect(screen.getByText("Support Alice's journey")).toBeTruthy();
  });

  /* ---- Calculate step ---- */
  it('calls calculateFuelContribution on mount', () => {
    renderFuelForm();
    expect(mocks.calculateFuelContribution).toHaveBeenCalledWith(40, 2);
  });

  it('shows distance info', () => {
    renderFuelForm();
    expect(screen.getByText('40.0 km')).toBeTruthy();
  });

  it('shows passengers count', () => {
    renderFuelForm();
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('shows fuel price per liter', () => {
    renderFuelForm();
    expect(screen.getByText(/£1\.45/)).toBeTruthy();
  });

  it('shows fuel efficiency', () => {
    renderFuelForm();
    expect(screen.getByText('12 km/L')).toBeTruthy();
  });

  it('shows suggested amount as "Your share"', () => {
    renderFuelForm();
    expect(screen.getByText('Your share')).toBeTruthy();
    // £4.83 appears in share display AND 1x preset button
    expect(screen.getAllByText(/£4\.83/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders 3 preset amount buttons (0.5x, 1x, 1.5x)', () => {
    renderFuelForm();
    // 0.5x = 2.42, 1x = 4.83, 1.5x = 7.25 (approximately)
    expect(screen.getByText(/£2\.4/)).toBeTruthy();
    // £4.83 appears in share display AND 1x preset button
    expect(screen.getAllByText(/£4\.83/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/£7\.2/)).toBeTruthy();
  });

  it('renders custom amount input', () => {
    renderFuelForm();
    expect(screen.getByPlaceholderText('Custom amount')).toBeTruthy();
  });

  it('shows info note about optional contributions', () => {
    renderFuelForm();
    expect(
      screen.getByText(/fuel contributions are optional/i)
    ).toBeTruthy();
  });

  it('shows Skip button', () => {
    renderFuelForm();
    expect(screen.getByText('Skip')).toBeTruthy();
  });

  it('shows Continue button', () => {
    renderFuelForm();
    expect(screen.getByText('Continue')).toBeTruthy();
  });

  it('calls onCancel when Skip clicked', () => {
    const spy = vi.fn();
    renderFuelForm({ onCancel: spy });
    fireEvent.click(screen.getByText('Skip'));
    expect(spy).toHaveBeenCalled();
  });

  /* ---- Navigate to payment step ---- */
  it('navigates to payment step on Continue', async () => {
    renderFuelForm();
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => {
      expect(screen.getByText("You're contributing")).toBeTruthy();
    });
  });

  it('shows amount summary in payment step', async () => {
    renderFuelForm();
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => {
      expect(screen.getByText(/to Alice/)).toBeTruthy();
    });
  });

  it('shows Back button in payment step', async () => {
    renderFuelForm();
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => {
      expect(screen.getByText('Back')).toBeTruthy();
    });
  });

  it('Back button returns to calculate step', async () => {
    renderFuelForm();
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => screen.getByText('Back'));
    fireEvent.click(screen.getByText('Back'));
    await waitFor(() => {
      expect(screen.getByText('Your share')).toBeTruthy();
    });
  });
});

/* ================================================================== */
/*  PaymentHistory                                                     */
/* ================================================================== */

describe('PaymentHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockUser = { ...FAKE_USER };
    mocks.getUserPayments.mockResolvedValue([...FAKE_PAYMENTS]);
    mocks.getPaymentStats.mockResolvedValue({ ...FAKE_STATS });
  });

  /* ---- Loading ---- */
  it('shows spinner while loading', () => {
    mocks.getUserPayments.mockReturnValue(new Promise(() => {}));
    renderHistory();
    expect(screen.getByTestId('icon-Loader2')).toBeTruthy();
  });

  /* ---- Stats cards ---- */
  it('shows Sent stats card', async () => {
    renderHistory();
    await waitFor(() => {
      // 'Sent' appears in stats label AND filter tab
      expect(screen.getAllByText('Sent').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('£12.50')).toBeTruthy();
    });
  });

  it('shows Received stats card', async () => {
    renderHistory();
    await waitFor(() => {
      // 'Received' appears in stats label AND filter tab
      expect(screen.getAllByText('Received').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('£3.25')).toBeTruthy();
    });
  });

  it('shows Pending stats', async () => {
    renderHistory();
    await waitFor(() => {
      expect(screen.getByText('Pending')).toBeTruthy();
      expect(screen.getByText('1')).toBeTruthy();
    });
  });

  it('shows Total stats', async () => {
    renderHistory();
    await waitFor(() => {
      expect(screen.getByText('Total')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
    });
  });

  /* ---- Filter tabs ---- */
  it('renders All / Sent / Received filter tabs', async () => {
    renderHistory();
    await waitFor(() => {
      expect(screen.getByText('All')).toBeTruthy();
      // "Sent" appears twice: in stats label and filter tab
      expect(screen.getAllByText('Sent').length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('Received').length).toBeGreaterThanOrEqual(2);
    });
  });

  /* ---- Payment items ---- */
  it('renders payment type labels', async () => {
    renderHistory();
    await waitFor(() => {
      expect(screen.getByText('Fuel Contribution')).toBeTruthy();
      expect(screen.getByText('Tip')).toBeTruthy();
      expect(screen.getByText('Carbon Offset')).toBeTruthy();
    });
  });

  it('renders payment status badges', async () => {
    renderHistory();
    await waitFor(() => {
      expect(screen.getAllByText('completed').length).toBe(2);
      expect(screen.getByText('pending')).toBeTruthy();
    });
  });

  it('displays payment amounts', async () => {
    renderHistory();
    await waitFor(() => {
      // Sent: -£5.50, Received: +£3.25, Sent: -£7.00
      expect(screen.getByText('-£5.50')).toBeTruthy();
      expect(screen.getByText('+£3.25')).toBeTruthy();
      expect(screen.getByText('-£7.00')).toBeTruthy();
    });
  });

  it('renders date for each payment', async () => {
    renderHistory();
    await waitFor(() => {
      // The en-GB format: "10 Jun 2024" part
      expect(screen.getByText(/10 Jun 2024/)).toBeTruthy();
    });
  });

  it('shows download button', async () => {
    renderHistory();
    await waitFor(() => {
      expect(screen.getByTestId('icon-Download')).toBeTruthy();
    });
  });

  /* ---- Filters ---- */
  it('Sent filter shows only sent payments', async () => {
    renderHistory();
    await waitFor(() => screen.getByText('Fuel Contribution'));
    // Click on 'Sent' filter tab (not the stats label)
    const sentButtons = screen.getAllByText('Sent');
    // The filter tab button should be the last one
    fireEvent.click(sentButtons[sentButtons.length - 1]);
    await waitFor(() => {
      expect(screen.getByText('Fuel Contribution')).toBeTruthy();
      expect(screen.queryByText('Tip')).toBeFalsy();
    });
  });

  it('Received filter shows only received payments', async () => {
    renderHistory();
    await waitFor(() => screen.getByText('Fuel Contribution'));
    const recButtons = screen.getAllByText('Received');
    fireEvent.click(recButtons[recButtons.length - 1]);
    await waitFor(() => {
      expect(screen.getByText('Tip')).toBeTruthy();
      expect(screen.queryByText('Fuel Contribution')).toBeFalsy();
    });
  });

  /* ---- Empty state ---- */
  it('shows empty state when no payments', async () => {
    mocks.getUserPayments.mockResolvedValue([]);
    renderHistory();
    await waitFor(() => {
      expect(screen.getByText('No payments found')).toBeTruthy();
    });
  });

  /* ---- showHeader=false ---- */
  it('hides stats and filters when showHeader=false', async () => {
    renderHistory({ showHeader: false });
    await waitFor(() => {
      expect(screen.getByText('Fuel Contribution')).toBeTruthy();
    });
    expect(screen.queryByText('All')).toBeFalsy();
    // Stats labels hidden
    expect(screen.queryByText('Pending')).toBeFalsy();
  });

  /* ---- limit prop ---- */
  it('limits number of displayed payments', async () => {
    renderHistory({ limit: 1 });
    await waitFor(() => {
      expect(screen.getByText('Fuel Contribution')).toBeTruthy();
    });
    // Only 1 payment should be shown
    expect(screen.queryByText('Tip')).toBeFalsy();
    expect(screen.queryByText('Carbon Offset')).toBeFalsy();
  });

  /* ---- No user ---- */
  it('shows spinner when no user (never loads)', () => {
    mocks.mockUser = null;
    renderHistory();
    expect(screen.getByTestId('icon-Loader2')).toBeTruthy();
  });
});
