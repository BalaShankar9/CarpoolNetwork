/**
 * Moderation module — Batch 1
 * ModerationQueue  (~24 tests)
 */
// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import {
  FAKE_MOD_ID,
  FAKE_REPORTS,
  FAKE_REPORT_PENDING,
  FAKE_REPORT_RESOLVED,
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
    Shield: stub('Shield'),
    AlertTriangle: stub('AlertTriangle'),
    Clock: stub('Clock'),
    User: stub('User'),
    MessageSquare: stub('MessageSquare'),
    Car: stub('Car'),
    Check: stub('Check'),
    X: stub('X'),
    ChevronRight: stub('ChevronRight'),
    Filter: stub('Filter'),
    Search: stub('Search'),
    Loader2: stub('Loader2'),
    Eye: stub('Eye'),
    Ban: stub('Ban'),
    AlertCircle: stub('AlertCircle'),

    // Service mocks
    getModerationQueue: vi.fn(),
    getModerationStats: vi.fn(),
    updateReportStatus: vi.fn(),
  };
});

/* ------------------------------------------------------------------ */
/*  Module mocks                                                       */
/* ------------------------------------------------------------------ */

vi.mock('lucide-react', () => ({
  Shield: mocks.Shield,
  AlertTriangle: mocks.AlertTriangle,
  Clock: mocks.Clock,
  User: mocks.User,
  MessageSquare: mocks.MessageSquare,
  Car: mocks.Car,
  Check: mocks.Check,
  X: mocks.X,
  ChevronRight: mocks.ChevronRight,
  Filter: mocks.Filter,
  Search: mocks.Search,
  Loader2: mocks.Loader2,
  Eye: mocks.Eye,
  Ban: mocks.Ban,
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

vi.mock('@/services/moderationService', () => ({
  moderationService: {
    getModerationQueue: (...a: any[]) => mocks.getModerationQueue(...a),
    getModerationStats: (...a: any[]) => mocks.getModerationStats(...a),
    updateReportStatus: (...a: any[]) => mocks.updateReportStatus(...a),
  },
}));

/* ------------------------------------------------------------------ */
/*  Import component AFTER mocks                                       */
/* ------------------------------------------------------------------ */

import { ModerationQueue } from '../../src/components/moderation/ModerationQueue';

afterEach(cleanup);

function renderQueue() {
  return render(<ModerationQueue moderatorId={FAKE_MOD_ID} />);
}

/* ================================================================== */
/*  ModerationQueue                                                    */
/* ================================================================== */

describe('ModerationQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getModerationQueue.mockResolvedValue([...FAKE_REPORTS]);
    mocks.getModerationStats.mockResolvedValue({ ...FAKE_STATS });
    mocks.updateReportStatus.mockResolvedValue(undefined);
  });

  /* ---- Loading ---- */
  it('shows spinner while loading', () => {
    mocks.getModerationQueue.mockReturnValue(new Promise(() => {}));
    mocks.getModerationStats.mockReturnValue(new Promise(() => {}));
    renderQueue();
    expect(screen.getByTestId('icon-Loader2')).toBeTruthy();
  });

  /* ---- Header ---- */
  it('renders title and subtitle', async () => {
    renderQueue();
    await waitFor(() => {
      expect(screen.getByText('Moderation Queue')).toBeTruthy();
      expect(screen.getByText('Review and resolve reports')).toBeTruthy();
    });
  });

  /* ---- Stats ---- */
  it('shows pending stat', async () => {
    renderQueue();
    await waitFor(() => {
      expect(screen.getByText('5')).toBeTruthy();
      // "Pending" appears in stats AND filter dropdown option
      expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows escalated stat', async () => {
    renderQueue();
    await waitFor(() => {
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getAllByText('Escalated').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows resolved stat', async () => {
    renderQueue();
    await waitFor(() => {
      expect(screen.getByText('42')).toBeTruthy();
      expect(screen.getByText('Resolved')).toBeTruthy();
    });
  });

  it('shows average resolution time', async () => {
    renderQueue();
    await waitFor(() => {
      expect(screen.getByText('3.5h')).toBeTruthy();
      expect(screen.getByText('Avg Time')).toBeTruthy();
    });
  });

  /* ---- Filters ---- */
  it('renders status filter dropdown', async () => {
    renderQueue();
    await waitFor(() => {
      expect(screen.getByText('All Status')).toBeTruthy();
    });
  });

  it('renders severity filter dropdown', async () => {
    renderQueue();
    await waitFor(() => {
      expect(screen.getByText('All Severity')).toBeTruthy();
    });
  });

  it('renders Clear button', async () => {
    renderQueue();
    await waitFor(() => {
      expect(screen.getByText('Clear')).toBeTruthy();
    });
  });

  /* ---- Empty state ---- */
  it('shows empty state when no reports', async () => {
    mocks.getModerationQueue.mockResolvedValue([]);
    renderQueue();
    await waitFor(() => {
      expect(screen.getByText('No reports to review')).toBeTruthy();
    });
  });

  /* ---- Report list ---- */
  it('shows report category labels', async () => {
    renderQueue();
    await waitFor(() => {
      expect(screen.getByText('harassment')).toBeTruthy();
      expect(screen.getByText('spam')).toBeTruthy();
    });
  });

  it('shows report descriptions', async () => {
    renderQueue();
    await waitFor(() => {
      expect(screen.getByText('This user sent threatening messages')).toBeTruthy();
      expect(screen.getByText('Sending repeated promotional links')).toBeTruthy();
    });
  });

  it('shows report status badges', async () => {
    renderQueue();
    await waitFor(() => {
      // "pending" as status badge
      expect(screen.getAllByText('pending').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('action taken')).toBeTruthy();
    });
  });

  it('shows severity badges', async () => {
    renderQueue();
    await waitFor(() => {
      expect(screen.getByText('high')).toBeTruthy();
      expect(screen.getByText('medium')).toBeTruthy();
    });
  });

  /* ---- Detail modal ---- */
  it('opens detail modal when report is clicked', async () => {
    renderQueue();
    await waitFor(() => screen.getByText('This user sent threatening messages'));
    fireEvent.click(screen.getByText('This user sent threatening messages'));
    await waitFor(() => {
      expect(screen.getByText('Report Details')).toBeTruthy();
    });
  });

  it('detail modal shows description', async () => {
    renderQueue();
    await waitFor(() => screen.getByText('This user sent threatening messages'));
    fireEvent.click(screen.getByText('This user sent threatening messages'));
    await waitFor(() => {
      expect(screen.getByText('Description')).toBeTruthy();
    });
  });

  it('detail modal shows severity', async () => {
    renderQueue();
    await waitFor(() => screen.getByText('This user sent threatening messages'));
    fireEvent.click(screen.getByText('This user sent threatening messages'));
    await waitFor(() => {
      expect(screen.getByText('high severity')).toBeTruthy();
    });
  });

  it('detail modal shows evidence links for pending report', async () => {
    renderQueue();
    await waitFor(() => screen.getByText('This user sent threatening messages'));
    fireEvent.click(screen.getByText('This user sent threatening messages'));
    await waitFor(() => {
      expect(screen.getByText('Evidence')).toBeTruthy();
      expect(screen.getByText('https://evidence.com/screenshot1.png')).toBeTruthy();
    });
  });

  it('detail modal shows Take Action and Dismiss buttons for pending report', async () => {
    renderQueue();
    await waitFor(() => screen.getByText('This user sent threatening messages'));
    fireEvent.click(screen.getByText('This user sent threatening messages'));
    await waitFor(() => {
      // 'Take Action' appears as section label AND button
      expect(screen.getAllByText('Take Action').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('Dismiss')).toBeTruthy();
    });
  });

  it('shows resolution textarea after clicking Take Action', async () => {
    renderQueue();
    await waitFor(() => screen.getByText('This user sent threatening messages'));
    fireEvent.click(screen.getByText('This user sent threatening messages'));
    await waitFor(() => screen.getAllByText('Take Action'));
    // Click the button (last match), not the section label
    const els = screen.getAllByText('Take Action');
    fireEvent.click(els[els.length - 1]);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter action taken...')).toBeTruthy();
    });
  });

  it('shows Confirm Action button after selecting Take Action', async () => {
    renderQueue();
    await waitFor(() => screen.getByText('This user sent threatening messages'));
    fireEvent.click(screen.getByText('This user sent threatening messages'));
    await waitFor(() => screen.getAllByText('Take Action'));
    const els = screen.getAllByText('Take Action');
    fireEvent.click(els[els.length - 1]);
    await waitFor(() => {
      expect(screen.getByText('Confirm Action')).toBeTruthy();
    });
  });

  it('shows Confirm Dismissal button after selecting Dismiss', async () => {
    renderQueue();
    await waitFor(() => screen.getByText('This user sent threatening messages'));
    fireEvent.click(screen.getByText('This user sent threatening messages'));
    await waitFor(() => screen.getByText('Dismiss'));
    fireEvent.click(screen.getByText('Dismiss'));
    await waitFor(() => {
      expect(screen.getByText('Confirm Dismissal')).toBeTruthy();
    });
  });

  it('calls updateReportStatus when confirming action', async () => {
    renderQueue();
    await waitFor(() => screen.getByText('This user sent threatening messages'));
    fireEvent.click(screen.getByText('This user sent threatening messages'));
    await waitFor(() => screen.getAllByText('Take Action'));
    const els = screen.getAllByText('Take Action');
    fireEvent.click(els[els.length - 1]);
    await waitFor(() => screen.getByPlaceholderText('Enter action taken...'));
    fireEvent.change(screen.getByPlaceholderText('Enter action taken...'), {
      target: { value: 'User banned for 7 days' },
    });
    fireEvent.click(screen.getByText('Confirm Action'));
    await waitFor(() => {
      expect(mocks.updateReportStatus).toHaveBeenCalledWith(
        FAKE_REPORT_PENDING.id,
        'action_taken',
        'User banned for 7 days',
        FAKE_MOD_ID,
      );
    });
  });
});
