/**
 * Moderation module — Batch 2
 * ReportSystem  (18 tests)
 * ReportButton  (5 tests)
 * ≈ 23 tests
 */
// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { FAKE_REPORTER_ID, FAKE_REPORTED_USER_ID } from './helpers';

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
    Flag: stub('Flag'),
    AlertTriangle: stub('AlertTriangle'),
    MessageSquare: stub('MessageSquare'),
    Car: stub('Car'),
    User: stub('User'),
    Shield: stub('Shield'),
    Camera: stub('Camera'),
    Send: stub('Send'),
    X: stub('X'),
    Loader2: stub('Loader2'),
    Check: stub('Check'),

    // Service
    createReport: vi.fn(),
  };
});

/* ------------------------------------------------------------------ */
/*  Module mocks                                                       */
/* ------------------------------------------------------------------ */

vi.mock('lucide-react', () => ({
  Flag: mocks.Flag,
  AlertTriangle: mocks.AlertTriangle,
  MessageSquare: mocks.MessageSquare,
  Car: mocks.Car,
  User: mocks.User,
  Shield: mocks.Shield,
  Camera: mocks.Camera,
  Send: mocks.Send,
  X: mocks.X,
  Loader2: mocks.Loader2,
  Check: mocks.Check,
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

vi.mock('@/services/moderationService', () => ({
  moderationService: {
    createReport: (...a: any[]) => mocks.createReport(...a),
  },
}));

/* ------------------------------------------------------------------ */
/*  Imports AFTER mocks                                                */
/* ------------------------------------------------------------------ */

import { ReportSystem, ReportButton } from '../../src/components/moderation/ReportSystem';

afterEach(cleanup);

const BASE_PROPS = {
  reporterId: FAKE_REPORTER_ID,
  reportedUserId: FAKE_REPORTED_USER_ID,
  contextType: 'user' as const,
  onClose: vi.fn(),
};

function renderReport(overrides: any = {}) {
  return render(<ReportSystem {...BASE_PROPS} {...overrides} />);
}

/* ================================================================== */
/*  ReportSystem                                                       */
/* ================================================================== */

describe('ReportSystem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createReport.mockResolvedValue({ id: 'new-report' });
  });

  /* ---- Header ---- */
  it('renders Report header', () => {
    renderReport();
    expect(screen.getByText('Report')).toBeTruthy();
  });

  it('shows "Select a reason" subtitle on category step', () => {
    renderReport();
    expect(screen.getByText('Select a reason')).toBeTruthy();
  });

  it('shows "What would you like to report?" prompt', () => {
    renderReport();
    expect(screen.getByText('What would you like to report?')).toBeTruthy();
  });

  /* ---- Category step - user context ---- */
  it('shows Harassment category for user context', () => {
    renderReport();
    expect(screen.getByText('Harassment')).toBeTruthy();
    expect(screen.getByText(/threatening, bullying/i)).toBeTruthy();
  });

  it('shows Spam category for user context', () => {
    renderReport();
    expect(screen.getByText('Spam')).toBeTruthy();
  });

  it('shows Fake Profile category for user context', () => {
    renderReport();
    expect(screen.getByText('Fake Profile')).toBeTruthy();
  });

  it('shows Fraud / Scam category for user context', () => {
    renderReport();
    expect(screen.getByText('Fraud / Scam')).toBeTruthy();
  });

  it('shows Safety Concern category for user context', () => {
    renderReport();
    expect(screen.getByText('Safety Concern')).toBeTruthy();
  });

  it('shows Other category for user context', () => {
    renderReport();
    expect(screen.getByText('Other')).toBeTruthy();
  });

  it('does NOT show Dangerous Driving for user context (ride-only)', () => {
    renderReport();
    expect(screen.queryByText('Dangerous Driving')).toBeFalsy();
  });

  it('shows Dangerous Driving for ride context', () => {
    renderReport({ contextType: 'ride' });
    expect(screen.getByText('Dangerous Driving')).toBeTruthy();
  });

  it('shows No Show for ride context', () => {
    renderReport({ contextType: 'ride' });
    expect(screen.getByText('No Show')).toBeTruthy();
  });

  /* ---- Navigate to details step ---- */
  it('navigates to details step when category is selected', () => {
    renderReport();
    fireEvent.click(screen.getByText('Harassment'));
    expect(screen.getByText('Provide details')).toBeTruthy();
  });

  it('shows selected category on details step', () => {
    renderReport();
    fireEvent.click(screen.getByText('Harassment'));
    expect(screen.getByText('Reporting for:')).toBeTruthy();
    expect(screen.getByText('harassment')).toBeTruthy();
  });

  it('shows Change link on details step', () => {
    renderReport();
    fireEvent.click(screen.getByText('Harassment'));
    expect(screen.getByText('Change')).toBeTruthy();
  });

  it('goes back to category step on Change click', () => {
    renderReport();
    fireEvent.click(screen.getByText('Harassment'));
    fireEvent.click(screen.getByText('Change'));
    expect(screen.getByText('Select a reason')).toBeTruthy();
  });

  it('shows description textarea', () => {
    renderReport();
    fireEvent.click(screen.getByText('Harassment'));
    expect(screen.getByPlaceholderText('Provide as much detail as possible...')).toBeTruthy();
  });

  it('shows evidence section', () => {
    renderReport();
    fireEvent.click(screen.getByText('Harassment'));
    expect(screen.getByText('Evidence (optional)')).toBeTruthy();
    expect(screen.getByText('+ Add screenshot or evidence')).toBeTruthy();
  });

  it('shows Back and Submit Report buttons', () => {
    renderReport();
    fireEvent.click(screen.getByText('Harassment'));
    expect(screen.getByText('Back')).toBeTruthy();
    expect(screen.getByText('Submit Report')).toBeTruthy();
  });

  it('Back button returns to category step', () => {
    renderReport();
    fireEvent.click(screen.getByText('Harassment'));
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByText('Select a reason')).toBeTruthy();
  });

  /* ---- Submit ---- */
  it('calls createReport and shows success on submit', async () => {
    renderReport();
    fireEvent.click(screen.getByText('Harassment'));
    fireEvent.change(screen.getByPlaceholderText('Provide as much detail as possible...'), {
      target: { value: 'This user harassed me' },
    });
    fireEvent.click(screen.getByText('Submit Report'));
    await waitFor(() => {
      expect(mocks.createReport).toHaveBeenCalledWith(FAKE_REPORTER_ID, expect.objectContaining({
        category: 'harassment',
        description: 'This user harassed me',
        reportedUserId: FAKE_REPORTED_USER_ID,
      }));
    });
    await waitFor(() => {
      expect(screen.getByText('Report Submitted')).toBeTruthy();
    });
  });

  it('shows success message and Done button after submission', async () => {
    renderReport();
    fireEvent.click(screen.getByText('Harassment'));
    fireEvent.change(screen.getByPlaceholderText('Provide as much detail as possible...'), {
      target: { value: 'Bad behavior' },
    });
    fireEvent.click(screen.getByText('Submit Report'));
    await waitFor(() => {
      expect(screen.getByText('Report Submitted')).toBeTruthy();
      expect(screen.getByText(/thank you for helping keep our community safe/i)).toBeTruthy();
      expect(screen.getByText('Done')).toBeTruthy();
    });
  });

  it('calls onClose when Done is clicked', async () => {
    const closeSpy = vi.fn();
    renderReport({ onClose: closeSpy });
    fireEvent.click(screen.getByText('Harassment'));
    fireEvent.change(screen.getByPlaceholderText('Provide as much detail as possible...'), {
      target: { value: 'Bad behavior' },
    });
    fireEvent.click(screen.getByText('Submit Report'));
    await waitFor(() => screen.getByText('Done'));
    fireEvent.click(screen.getByText('Done'));
    expect(closeSpy).toHaveBeenCalled();
  });
});

/* ================================================================== */
/*  ReportButton                                                       */
/* ================================================================== */

describe('ReportButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createReport.mockResolvedValue({ id: 'new-report' });
  });

  it('renders icon-only button by default', () => {
    render(
      <ReportButton
        reporterId={FAKE_REPORTER_ID}
        reportedUserId={FAKE_REPORTED_USER_ID}
        contextType="user"
      />
    );
    expect(screen.getByTestId('icon-Flag')).toBeTruthy();
    expect(screen.queryByText('Report')).toBeFalsy();
  });

  it('renders text variant with "Report" label', () => {
    render(
      <ReportButton
        reporterId={FAKE_REPORTER_ID}
        reportedUserId={FAKE_REPORTED_USER_ID}
        contextType="user"
        variant="text"
      />
    );
    expect(screen.getByText('Report')).toBeTruthy();
  });

  it('renders full variant with "Report" label', () => {
    render(
      <ReportButton
        reporterId={FAKE_REPORTER_ID}
        reportedUserId={FAKE_REPORTED_USER_ID}
        contextType="user"
        variant="full"
      />
    );
    expect(screen.getByText('Report')).toBeTruthy();
  });

  it('opens ReportSystem modal on click', () => {
    render(
      <ReportButton
        reporterId={FAKE_REPORTER_ID}
        reportedUserId={FAKE_REPORTED_USER_ID}
        contextType="user"
        variant="text"
      />
    );
    fireEvent.click(screen.getByText('Report'));
    expect(screen.getByText('Select a reason')).toBeTruthy();
  });

  it('shows category options when modal is opened', () => {
    render(
      <ReportButton
        reporterId={FAKE_REPORTER_ID}
        reportedUserId={FAKE_REPORTED_USER_ID}
        contextType="user"
        variant="text"
      />
    );
    fireEvent.click(screen.getByText('Report'));
    expect(screen.getByText('Harassment')).toBeTruthy();
    expect(screen.getByText('Spam')).toBeTruthy();
  });
});
