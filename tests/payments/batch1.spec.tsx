/**
 * Payments module — Batch 1
 * PaymentMethods  (22 tests)
 */
// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import {
  FAKE_USER,
  FAKE_METHODS,
  FAKE_METHOD_DEFAULT,
  FAKE_METHOD_SECONDARY,
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
    // lucide icons used by PaymentMethods
    CreditCard: stub('CreditCard'),
    Wallet: stub('Wallet'),
    Plus: stub('Plus'),
    Trash2: stub('Trash2'),
    Check: stub('Check'),
    Star: stub('Star'),
    Loader2: stub('Loader2'),
    Shield: stub('Shield'),
    X: stub('X'),
    AlertCircle: stub('AlertCircle'),

    // paymentService mock fns
    getUserPaymentMethods: vi.fn(),
    setDefaultPaymentMethod: vi.fn(),
    removePaymentMethod: vi.fn(),
    addPaymentMethod: vi.fn(),

    // auth
    mockUser: null as any,
  };
});

/* ------------------------------------------------------------------ */
/*  Module mocks                                                       */
/* ------------------------------------------------------------------ */

vi.mock('lucide-react', () => ({
  CreditCard: mocks.CreditCard,
  Wallet: mocks.Wallet,
  Plus: mocks.Plus,
  Trash2: mocks.Trash2,
  Check: mocks.Check,
  Star: mocks.Star,
  Loader2: mocks.Loader2,
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
  CardElement: (props: any) => <div data-testid="card-element" />,
  useStripe: () => ({ createPaymentMethod: vi.fn() }),
  useElements: () => ({ getElement: vi.fn() }),
}));

/* ------------------------------------------------------------------ */
/*  Import component AFTER mocks                                       */
/* ------------------------------------------------------------------ */

import { PaymentMethods } from '../../src/components/payments/PaymentMethods';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

afterEach(cleanup);

function renderMethods(props: any = {}) {
  return render(<PaymentMethods {...props} />);
}

/* ================================================================== */
/*  PaymentMethods                                                     */
/* ================================================================== */

describe('PaymentMethods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockUser = { ...FAKE_USER };
    mocks.getUserPaymentMethods.mockResolvedValue(FAKE_METHODS);
    mocks.setDefaultPaymentMethod.mockResolvedValue(undefined);
    mocks.removePaymentMethod.mockResolvedValue(true);
  });

  /* ---- Loading ---- */
  it('shows spinner while loading', () => {
    // Never resolves → stays in loading state
    mocks.getUserPaymentMethods.mockReturnValue(new Promise(() => {}));
    renderMethods();
    expect(screen.getByTestId('icon-Loader2')).toBeTruthy();
  });

  /* ---- Empty state ---- */
  it('shows empty state when no methods', async () => {
    mocks.getUserPaymentMethods.mockResolvedValue([]);
    renderMethods();
    await waitFor(() => {
      expect(screen.getByText('No payment methods saved')).toBeTruthy();
    });
  });

  it('shows "Add Your First Card" button in empty state', async () => {
    mocks.getUserPaymentMethods.mockResolvedValue([]);
    renderMethods();
    await waitFor(() => {
      expect(screen.getByText('Add Your First Card')).toBeTruthy();
    });
  });

  /* ---- Rendered list ---- */
  it('renders header with title and saved count', async () => {
    renderMethods();
    await waitFor(() => {
      expect(screen.getByText('Payment Methods')).toBeTruthy();
      expect(screen.getByText('2 saved')).toBeTruthy();
    });
  });

  it('shows "Add Card" button', async () => {
    renderMethods();
    await waitFor(() => {
      expect(screen.getByText('Add Card')).toBeTruthy();
    });
  });

  it('displays card brand names', async () => {
    renderMethods();
    await waitFor(() => {
      expect(screen.getByText('Visa')).toBeTruthy();
      expect(screen.getByText('Mastercard')).toBeTruthy();
    });
  });

  it('displays last 4 digits', async () => {
    renderMethods();
    await waitFor(() => {
      expect(screen.getByText('•••• 4242')).toBeTruthy();
      expect(screen.getByText('•••• 5555')).toBeTruthy();
    });
  });

  it('displays expiry dates', async () => {
    renderMethods();
    await waitFor(() => {
      expect(screen.getByText('Expires 12/2026')).toBeTruthy();
      expect(screen.getByText('Expires 03/2025')).toBeTruthy();
    });
  });

  it('shows Default badge on default method', async () => {
    renderMethods();
    await waitFor(() => {
      expect(screen.getByText('Default')).toBeTruthy();
    });
  });

  it('shows set-default star button on non-default methods', async () => {
    renderMethods();
    await waitFor(() => {
      // Star icon present for the non-default method
      const stars = screen.getAllByTitle('Set as default');
      expect(stars.length).toBe(1);
    });
  });

  it('shows delete buttons for all methods', async () => {
    renderMethods();
    await waitFor(() => {
      const removes = screen.getAllByTitle('Remove');
      expect(removes.length).toBe(2);
    });
  });

  it('shows security note', async () => {
    renderMethods();
    await waitFor(() => {
      expect(
        screen.getByText(/your payment information is securely stored/i)
      ).toBeTruthy();
    });
  });

  /* ---- Set default ---- */
  it('calls setDefaultPaymentMethod when star clicked', async () => {
    renderMethods();
    await waitFor(() => screen.getByTitle('Set as default'));
    fireEvent.click(screen.getByTitle('Set as default'));
    await waitFor(() => {
      expect(mocks.setDefaultPaymentMethod).toHaveBeenCalledWith(
        FAKE_USER.id,
        FAKE_METHOD_SECONDARY.id
      );
    });
  });

  /* ---- Delete ---- */
  it('calls removePaymentMethod when delete clicked', async () => {
    renderMethods();
    await waitFor(() => screen.getAllByTitle('Remove'));
    const removes = screen.getAllByTitle('Remove');
    fireEvent.click(removes[0]);
    await waitFor(() => {
      expect(mocks.removePaymentMethod).toHaveBeenCalledWith(FAKE_METHOD_DEFAULT.id);
    });
  });

  it('removes method from list after successful delete', async () => {
    renderMethods();
    await waitFor(() => screen.getByText('•••• 4242'));
    const removes = screen.getAllByTitle('Remove');
    fireEvent.click(removes[0]);
    await waitFor(() => {
      expect(screen.queryByText('•••• 4242')).toBeFalsy();
    });
  });

  /* ---- Add Card Modal ---- */
  it('opens add card modal on "Add Card" click', async () => {
    renderMethods();
    await waitFor(() => screen.getByText('Add Card'));
    fireEvent.click(screen.getByText('Add Card'));
    await waitFor(() => {
      expect(screen.getByText('Add Payment Card')).toBeTruthy();
    });
  });

  it('modal contains cardholder name input', async () => {
    renderMethods();
    await waitFor(() => screen.getByText('Add Card'));
    fireEvent.click(screen.getByText('Add Card'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('John Smith')).toBeTruthy();
    });
  });

  it('modal contains stripe card element', async () => {
    renderMethods();
    await waitFor(() => screen.getByText('Add Card'));
    fireEvent.click(screen.getByText('Add Card'));
    await waitFor(() => {
      expect(screen.getByTestId('card-element')).toBeTruthy();
    });
  });

  it('modal has Cancel and Add Card buttons', async () => {
    renderMethods();
    await waitFor(() => screen.getByText('Add Card'));
    fireEvent.click(screen.getByText('Add Card'));
    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeTruthy();
      // "Add Card" appears twice: the header button + form button
      expect(screen.getAllByText('Add Card').length).toBeGreaterThanOrEqual(2);
    });
  });

  it('closes modal on Cancel click', async () => {
    renderMethods();
    await waitFor(() => screen.getByText('Add Card'));
    fireEvent.click(screen.getByText('Add Card'));
    await waitFor(() => screen.getByText('Cancel'));
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.queryByText('Add Payment Card')).toBeFalsy();
    });
  });

  /* ---- Selectable mode ---- */
  it('calls onMethodSelected when method clicked in selectable mode', async () => {
    const spy = vi.fn();
    renderMethods({ selectable: true, onMethodSelected: spy });
    await waitFor(() => screen.getByText('Visa'));
    fireEvent.click(screen.getByText('Visa'));
    expect(spy).toHaveBeenCalledWith(FAKE_METHOD_DEFAULT);
  });

  it('shows check icon on selected method', async () => {
    const spy = vi.fn();
    renderMethods({ selectable: true, onMethodSelected: spy });
    await waitFor(() => screen.getByText('Visa'));
    // Default method is auto-selected
    expect(screen.getByTestId('icon-Check')).toBeTruthy();
  });

  /* ---- No user ---- */
  it('shows spinner when no user (never loads)', () => {
    mocks.mockUser = null;
    renderMethods();
    expect(screen.getByTestId('icon-Loader2')).toBeTruthy();
  });
});
