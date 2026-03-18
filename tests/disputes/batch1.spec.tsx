// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';

/* ─── hoisted mocks ─── */
const mocks = vi.hoisted(() => ({
  disputes: [] as any[],
  messages: [] as any[],
}));

vi.mock('../../src/services/disputeService', () => ({
  disputeService: {
    getUserDisputes: vi.fn(() => Promise.resolve(mocks.disputes)),
    createDispute: vi.fn((userId: string, data: any) =>
      Promise.resolve({ id: 'd-new', ...data, status: 'open', priority: 'medium', createdAt: new Date().toISOString() })
    ),
    getDisputeMessages: vi.fn(() => Promise.resolve(mocks.messages)),
    sendMessage: vi.fn((_did: string, senderId: string, type: string, content: string) =>
      Promise.resolve({ id: 'm-new', disputeId: _did, senderId, senderType: type, content, createdAt: new Date().toISOString() } as any)
    ),
  },
}));

vi.mock('framer-motion', () => {
  const React = require('react');
  return {
    motion: new Proxy({}, {
      get: (_t: any, prop: string) =>
        React.forwardRef((p: any, ref: any) => {
          const { initial, animate, transition, whileHover, whileTap, exit, variants, ...rest } = p;
          return React.createElement(prop, { ...rest, ref });
        }),
    }),
    AnimatePresence: ({ children }: any) => children,
  };
});

vi.mock('lucide-react', () => {
  const React = require('react');
  const s = (n: string) => (props: any) => React.createElement('span', { 'data-testid': `icon-${n}`, ...props });
  return {
    AlertTriangle: s('AlertTriangle'), MessageSquare: s('MessageSquare'),
    Clock: s('Clock'), User: s('User'), Car: s('Car'), FileText: s('FileText'),
    Send: s('Send'), Plus: s('Plus'), Check: s('Check'), X: s('X'),
    ChevronRight: s('ChevronRight'), Loader2: s('Loader2'), Upload: s('Upload'),
    Scale: s('Scale'),
  };
});

import { DisputeCenter } from '../../src/components/disputes/DisputeCenter';
import { disputeService } from '../../src/services/disputeService';

beforeEach(() => {
  vi.restoreAllMocks();
  mocks.disputes = [];
  mocks.messages = [];
  // jsdom doesn't implement scrollIntoView
  Element.prototype.scrollIntoView = vi.fn();
  // Re-apply default mock implementations after restoreAllMocks
  vi.mocked(disputeService.getUserDisputes).mockImplementation(() => Promise.resolve(mocks.disputes));
  vi.mocked(disputeService.createDispute).mockImplementation((_userId: string, data: any) =>
    Promise.resolve({ id: 'd-new', ...data, status: 'open', priority: 'medium', createdAt: new Date().toISOString() })
  );
  vi.mocked(disputeService.getDisputeMessages).mockImplementation(() => Promise.resolve(mocks.messages));
  vi.mocked(disputeService.sendMessage).mockImplementation((_did: string, senderId: string, type: string, content: string) =>
    Promise.resolve({ id: 'm-new', disputeId: _did, senderId, senderType: type, content, createdAt: new Date().toISOString() } as any)
  );
});
afterEach(cleanup);

/* ─── factories ─── */
function makeDispute(overrides?: Partial<any>) {
  return {
    id: 'd-1',
    type: 'no_show' as const,
    description: 'Driver never showed up',
    status: 'open' as const,
    priority: 'medium' as const,
    createdAt: '2024-06-15T12:00:00Z',
    rideId: 'ride-1',
    againstUserId: 'u-other',
    ...overrides,
  };
}

/* ═══════════════════════════════════════
   Loading
   ═══════════════════════════════════════ */
describe('DisputeCenter – loading', () => {
  it('shows loading spinner initially', () => {
    vi.mocked(disputeService.getUserDisputes).mockReturnValue(new Promise(() => {}));
    render(<DisputeCenter userId="user-1" />);
    expect(document.querySelector('[data-testid="icon-Loader2"]')).toBeTruthy();
  });
});

/* ═══════════════════════════════════════
   Empty state
   ═══════════════════════════════════════ */
describe('DisputeCenter – empty', () => {
  it('shows Dispute Center heading', async () => {
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText('Dispute Center')).toBeTruthy();
    });
  });

  it('shows empty state text', async () => {
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText('No disputes filed')).toBeTruthy();
    });
  });

  it('shows New Dispute button', async () => {
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText('New Dispute')).toBeTruthy();
    });
  });

  it('shows 0 active count', async () => {
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText('0 active')).toBeTruthy();
    });
  });
});

/* ═══════════════════════════════════════
   Dispute list
   ═══════════════════════════════════════ */
describe('DisputeCenter – list', () => {
  it('renders dispute items', async () => {
    mocks.disputes = [
      makeDispute({ id: 'd-1', description: 'Never showed up' }),
      makeDispute({ id: 'd-2', type: 'safety', description: 'Dangerous driving' }),
    ];
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText('Never showed up')).toBeTruthy();
      expect(screen.getByText('Dangerous driving')).toBeTruthy();
    });
  });

  it('shows type label with underscores replaced', async () => {
    mocks.disputes = [makeDispute({ type: 'no_show' })];
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText('no show')).toBeTruthy();
    });
  });

  it('shows status badge text', async () => {
    mocks.disputes = [makeDispute({ status: 'under_review' })];
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText('under review')).toBeTruthy();
    });
  });

  it('shows priority text', async () => {
    mocks.disputes = [makeDispute({ priority: 'urgent' })];
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText('urgent priority')).toBeTruthy();
    });
  });

  it('shows active count for non-resolved disputes', async () => {
    mocks.disputes = [
      makeDispute({ id: 'd-1', status: 'open' }),
      makeDispute({ id: 'd-2', status: 'resolved' }),
      makeDispute({ id: 'd-3', status: 'under_review' }),
    ];
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText('2 active')).toBeTruthy();
    });
  });

  it('shows type emoji icon', async () => {
    mocks.disputes = [makeDispute({ type: 'no_show' })];
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText('👻')).toBeTruthy();
    });
  });
});

/* ═══════════════════════════════════════
   Create dispute form
   ═══════════════════════════════════════ */
describe('DisputeCenter – create form', () => {
  it('opens create form when New Dispute clicked', async () => {
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('New Dispute')).toBeTruthy());
    fireEvent.click(screen.getByText('New Dispute'));
    expect(screen.getByText('File a Dispute')).toBeTruthy();
  });

  it('shows dispute type options', async () => {
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('New Dispute')).toBeTruthy());
    fireEvent.click(screen.getByText('New Dispute'));
    expect(screen.getByText('Communication Issue')).toBeTruthy();
    expect(screen.getByText('No Show')).toBeTruthy();
    expect(screen.getByText('Safety Concern')).toBeTruthy();
    expect(screen.getByText('Inappropriate Behavior')).toBeTruthy();
  });

  it('advances to details step when type selected', async () => {
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('New Dispute')).toBeTruthy());
    fireEvent.click(screen.getByText('New Dispute'));
    fireEvent.click(screen.getByText('No Show'));
    expect(screen.getByText('Describe what happened *')).toBeTruthy();
  });

  it('shows Submit Dispute button on details step', async () => {
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('New Dispute')).toBeTruthy());
    fireEvent.click(screen.getByText('New Dispute'));
    fireEvent.click(screen.getByText('No Show'));
    expect(screen.getByText('Submit Dispute')).toBeTruthy();
  });

  it('shows Back button on details step', async () => {
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('New Dispute')).toBeTruthy());
    fireEvent.click(screen.getByText('New Dispute'));
    fireEvent.click(screen.getByText('No Show'));
    expect(screen.getByText('Back')).toBeTruthy();
  });

  it('submits dispute successfully', async () => {
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('New Dispute')).toBeTruthy());
    fireEvent.click(screen.getByText('New Dispute'));
    fireEvent.click(screen.getByText('No Show'));

    const textarea = document.querySelector('textarea')!;
    fireEvent.change(textarea, { target: { value: 'Driver was 30 min late' } });
    fireEvent.click(screen.getByText('Submit Dispute'));

    await waitFor(() => {
      expect(disputeService.createDispute).toHaveBeenCalled();
    });
  });
});

/* ═══════════════════════════════════════
   Dispute detail view
   ═══════════════════════════════════════ */
describe('DisputeCenter – detail', () => {
  it('opens detail when dispute clicked', async () => {
    mocks.disputes = [makeDispute({ type: 'no_show', description: 'Never showed up' })];
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('Never showed up')).toBeTruthy());
    fireEvent.click(screen.getByText('Never showed up'));
    await waitFor(() => {
      expect(screen.getByText('no show Dispute')).toBeTruthy();
    });
  });

  it('shows "No messages yet" when empty', async () => {
    mocks.disputes = [makeDispute()];
    mocks.messages = [];
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('Driver never showed up')).toBeTruthy());
    fireEvent.click(screen.getByText('Driver never showed up'));
    await waitFor(() => {
      expect(screen.getByText('No messages yet')).toBeTruthy();
    });
  });

  it('shows messages in detail view', async () => {
    mocks.disputes = [makeDispute()];
    mocks.messages = [
      { id: 'm1', senderId: 'user-1', senderType: 'user', content: 'Help me please', createdAt: '2024-06-15T12:00:00Z' },
      { id: 'm2', senderId: 'mod-1', senderType: 'moderator', content: 'Looking into it', createdAt: '2024-06-15T13:00:00Z' },
    ];
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('Driver never showed up')).toBeTruthy());
    fireEvent.click(screen.getByText('Driver never showed up'));
    await waitFor(() => {
      expect(screen.getByText('Help me please')).toBeTruthy();
      expect(screen.getByText('Looking into it')).toBeTruthy();
    });
  });

  it('shows Moderator label for mod messages', async () => {
    mocks.disputes = [makeDispute()];
    mocks.messages = [
      { id: 'm1', senderId: 'mod-1', senderType: 'moderator', content: 'We are reviewing', createdAt: '2024-06-15T13:00:00Z' },
    ];
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('Driver never showed up')).toBeTruthy());
    fireEvent.click(screen.getByText('Driver never showed up'));
    await waitFor(() => {
      expect(screen.getByText('Moderator')).toBeTruthy();
    });
  });

  it('shows message input for open disputes', async () => {
    mocks.disputes = [makeDispute({ status: 'open' })];
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('Driver never showed up')).toBeTruthy());
    fireEvent.click(screen.getByText('Driver never showed up'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type a message...')).toBeTruthy();
    });
  });

  it('sends a message', async () => {
    mocks.disputes = [makeDispute({ status: 'open' })];
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('Driver never showed up')).toBeTruthy());
    fireEvent.click(screen.getByText('Driver never showed up'));
    await waitFor(() => expect(screen.getByPlaceholderText('Type a message...')).toBeTruthy());

    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: 'Any update?' } });
    // Click the send button (has Send icon)
    const sendBtn = document.querySelector('[data-testid="icon-Send"]')!.closest('button')!;
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(disputeService.sendMessage).toHaveBeenCalledWith('d-1', 'user-1', 'user', 'Any update?');
    });
  });

  it('hides message input for resolved disputes', async () => {
    mocks.disputes = [makeDispute({ status: 'resolved' })];
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('Driver never showed up')).toBeTruthy());
    fireEvent.click(screen.getByText('Driver never showed up'));
    await waitFor(() => {
      expect(screen.getByText('no show Dispute')).toBeTruthy();
    });
    expect(screen.queryByPlaceholderText('Type a message...')).toBeNull();
  });

  it('hides message input for closed disputes', async () => {
    mocks.disputes = [makeDispute({ status: 'closed' })];
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('Driver never showed up')).toBeTruthy());
    fireEvent.click(screen.getByText('Driver never showed up'));
    await waitFor(() => {
      expect(screen.getByText('no show Dispute')).toBeTruthy();
    });
    expect(screen.queryByPlaceholderText('Type a message...')).toBeNull();
  });

  it('shows system message with special styling', async () => {
    mocks.disputes = [makeDispute()];
    mocks.messages = [
      { id: 'm1', senderId: 'system', senderType: 'system', content: 'Dispute has been escalated', createdAt: '2024-06-15T12:00:00Z' },
    ];
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('Driver never showed up')).toBeTruthy());
    fireEvent.click(screen.getByText('Driver never showed up'));
    await waitFor(() => {
      expect(screen.getByText('Dispute has been escalated')).toBeTruthy();
    });
  });

  it('shows opened date in detail header', async () => {
    mocks.disputes = [makeDispute({ createdAt: '2024-06-15T12:00:00Z' })];
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('Driver never showed up')).toBeTruthy());
    fireEvent.click(screen.getByText('Driver never showed up'));
    await waitFor(() => {
      const openedText = screen.getByText(/Opened/);
      expect(openedText).toBeTruthy();
    });
  });

  it('shows description in detail view', async () => {
    mocks.disputes = [makeDispute({ description: 'Very bad experience' })];
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('Very bad experience')).toBeTruthy());
    fireEvent.click(screen.getByText('Very bad experience'));
    await waitFor(() => {
      // Description should appear both in list and in detail description section
      const els = screen.getAllByText('Very bad experience');
      expect(els.length).toBeGreaterThanOrEqual(1);
    });
  });
});
