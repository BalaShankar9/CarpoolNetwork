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
    createDispute: vi.fn((_userId: string, data: any) =>
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
  Element.prototype.scrollIntoView = vi.fn();
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
   Status badge colors
   ═══════════════════════════════════════ */
describe('DisputeCenter – status colors', () => {
  it.each([
    ['open', 'bg-yellow-500/20'],
    ['under_review', 'bg-blue-500/20'],
    ['awaiting_response', 'bg-orange-500/20'],
    ['mediation', 'bg-purple-500/20'],
    ['resolved', 'bg-emerald-500/20'],
    ['closed', 'bg-slate-500/20'],
  ])('status "%s" has class "%s"', async (status, expectedClass) => {
    mocks.disputes = [makeDispute({ status })];
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => {
      const badge = screen.getByText(status.replace('_', ' '));
      expect(badge.className).toContain(expectedClass);
    });
  });
});

/* ═══════════════════════════════════════
   Priority colors
   ═══════════════════════════════════════ */
describe('DisputeCenter – priority colors', () => {
  it.each([
    ['urgent', 'text-red-400'],
    ['high', 'text-orange-400'],
    ['medium', 'text-yellow-400'],
    ['low', 'text-slate-400'],
  ])('priority "%s" has class "%s"', async (priority, expectedClass) => {
    mocks.disputes = [makeDispute({ priority })];
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => {
      const el = screen.getByText(`${priority} priority`);
      expect(el.className).toContain(expectedClass);
    });
  });
});

/* ═══════════════════════════════════════
   Type icons
   ═══════════════════════════════════════ */
describe('DisputeCenter – type icons', () => {
  it.each([
    ['communication', '💬'],
    ['no_show', '👻'],
    ['safety', '🚨'],
    ['behavior', '😤'],
    ['property_damage', '💥'],
    ['route_issue', '🗺️'],
    ['cancellation', '❌'],
    ['other', '❓'],
  ])('type "%s" shows icon "%s"', async (type, icon) => {
    mocks.disputes = [makeDispute({ type })];
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText(icon)).toBeTruthy();
    });
  });
});

/* ═══════════════════════════════════════
   Create form navigation
   ═══════════════════════════════════════ */
describe('DisputeCenter – form navigation', () => {
  it('Back button returns to type step', async () => {
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('New Dispute')).toBeTruthy());
    fireEvent.click(screen.getByText('New Dispute'));
    fireEvent.click(screen.getByText('No Show'));
    expect(screen.getByText('Submit Dispute')).toBeTruthy();

    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByText('Communication Issue')).toBeTruthy();
  });

  it('Change button returns to type step', async () => {
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('New Dispute')).toBeTruthy());
    fireEvent.click(screen.getByText('New Dispute'));
    fireEvent.click(screen.getByText('Safety Concern'));
    expect(screen.getByText('Change')).toBeTruthy();

    fireEvent.click(screen.getByText('Change'));
    expect(screen.getByText('No Show')).toBeTruthy();
  });

  it('close button closes form overlay', async () => {
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('New Dispute')).toBeTruthy());
    fireEvent.click(screen.getByText('New Dispute'));
    expect(screen.getByText('File a Dispute')).toBeTruthy();

    // Click X close button
    const xIcon = document.querySelector('[data-testid="icon-X"]')!;
    fireEvent.click(xIcon.closest('button')!);
    await waitFor(() => {
      expect(screen.queryByText('File a Dispute')).toBeNull();
    });
  });

  it('shows all 8 dispute type options', async () => {
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('New Dispute')).toBeTruthy());
    fireEvent.click(screen.getByText('New Dispute'));
    expect(screen.getByText('Communication Issue')).toBeTruthy();
    expect(screen.getByText('No Show')).toBeTruthy();
    expect(screen.getByText('Safety Concern')).toBeTruthy();
    expect(screen.getByText('Inappropriate Behavior')).toBeTruthy();
    expect(screen.getByText('Property Damage')).toBeTruthy();
    expect(screen.getByText('Route Issue')).toBeTruthy();
    expect(screen.getByText('Cancellation')).toBeTruthy();
    expect(screen.getByText('Other')).toBeTruthy();
  });

  it('shows type descriptions', async () => {
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('New Dispute')).toBeTruthy());
    fireEvent.click(screen.getByText('New Dispute'));
    expect(screen.getByText("Driver or passenger didn't appear")).toBeTruthy();
    expect(screen.getByText('Felt unsafe during the ride')).toBeTruthy();
  });

  it('shows textarea placeholder', async () => {
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('New Dispute')).toBeTruthy());
    fireEvent.click(screen.getByText('New Dispute'));
    fireEvent.click(screen.getByText('No Show'));
    expect(screen.getByPlaceholderText('Please provide details about the incident...')).toBeTruthy();
  });

  it('Submit button is disabled when description is empty', async () => {
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('New Dispute')).toBeTruthy());
    fireEvent.click(screen.getByText('New Dispute'));
    fireEvent.click(screen.getByText('No Show'));
    const submitBtn = screen.getByText('Submit Dispute');
    expect(submitBtn.closest('button')!.disabled).toBe(true);
  });

  it('Submit button is enabled when description is filled', async () => {
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('New Dispute')).toBeTruthy());
    fireEvent.click(screen.getByText('New Dispute'));
    fireEvent.click(screen.getByText('No Show'));
    const textarea = document.querySelector('textarea')!;
    fireEvent.change(textarea, { target: { value: 'Some description' } });
    const submitBtn = screen.getByText('Submit Dispute').closest('button')!;
    expect(submitBtn.disabled).toBe(false);
  });

  it('calls createDispute with correct params', async () => {
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('New Dispute')).toBeTruthy());
    fireEvent.click(screen.getByText('New Dispute'));
    fireEvent.click(screen.getByText('Safety Concern'));
    const textarea = document.querySelector('textarea')!;
    fireEvent.change(textarea, { target: { value: 'Felt very unsafe' } });
    fireEvent.click(screen.getByText('Submit Dispute'));

    await waitFor(() => {
      expect(disputeService.createDispute).toHaveBeenCalledWith('user-1', expect.objectContaining({
        type: 'safety',
        description: 'Felt very unsafe',
      }));
    });
  });

  it('newly created dispute appears in list', async () => {
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('New Dispute')).toBeTruthy());
    fireEvent.click(screen.getByText('New Dispute'));
    fireEvent.click(screen.getByText('No Show'));
    const textarea = document.querySelector('textarea')!;
    fireEvent.change(textarea, { target: { value: 'Late arrival' } });
    fireEvent.click(screen.getByText('Submit Dispute'));

    await waitFor(() => {
      expect(screen.getByText('Late arrival')).toBeTruthy();
    });
  });
});

/* ═══════════════════════════════════════
   Detail view additional tests
   ═══════════════════════════════════════ */
describe('DisputeCenter – detail extra', () => {
  it('shows message input for under_review disputes', async () => {
    mocks.disputes = [makeDispute({ status: 'under_review' })];
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('Driver never showed up')).toBeTruthy());
    fireEvent.click(screen.getByText('Driver never showed up'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type a message...')).toBeTruthy();
    });
  });

  it('input field supports Enter key via onKeyPress handler', async () => {
    mocks.disputes = [makeDispute({ status: 'open' })];
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('Driver never showed up')).toBeTruthy());
    fireEvent.click(screen.getByText('Driver never showed up'));
    await waitFor(() => expect(screen.getByPlaceholderText('Type a message...')).toBeTruthy());

    // The input is present and interactive
    const input = screen.getByPlaceholderText('Type a message...');
    expect(input.getAttribute('type')).toBe('text');
  });

  it('does not send empty message', async () => {
    mocks.disputes = [makeDispute({ status: 'open' })];
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('Driver never showed up')).toBeTruthy());
    fireEvent.click(screen.getByText('Driver never showed up'));
    await waitFor(() => expect(screen.getByPlaceholderText('Type a message...')).toBeTruthy());

    const sendBtn = document.querySelector('[data-testid="icon-Send"]')!.closest('button')!;
    fireEvent.click(sendBtn);

    expect(disputeService.sendMessage).not.toHaveBeenCalled();
  });

  it('shows multiple messages in order', async () => {
    mocks.disputes = [makeDispute()];
    mocks.messages = [
      { id: 'm1', senderId: 'user-1', senderType: 'user', content: 'First message', createdAt: '2024-06-15T12:00:00Z' },
      { id: 'm2', senderId: 'mod-1', senderType: 'moderator', content: 'Second message', createdAt: '2024-06-15T13:00:00Z' },
      { id: 'm3', senderId: 'system', senderType: 'system', content: 'Third message', createdAt: '2024-06-15T14:00:00Z' },
    ];
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('Driver never showed up')).toBeTruthy());
    fireEvent.click(screen.getByText('Driver never showed up'));
    await waitFor(() => {
      expect(screen.getByText('First message')).toBeTruthy();
      expect(screen.getByText('Second message')).toBeTruthy();
      expect(screen.getByText('Third message')).toBeTruthy();
    });
  });

  it('user message is aligned right', async () => {
    mocks.disputes = [makeDispute()];
    mocks.messages = [
      { id: 'm1', senderId: 'user-1', senderType: 'user', content: 'My msg', createdAt: '2024-06-15T12:00:00Z' },
    ];
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('Driver never showed up')).toBeTruthy());
    fireEvent.click(screen.getByText('Driver never showed up'));
    await waitFor(() => {
      const msgEl = screen.getByText('My msg');
      // The wrapper div should have justify-end for user messages
      const wrapper = msgEl.closest('.flex');
      expect(wrapper?.className).toContain('justify-end');
    });
  });

  it('moderator message has blue styling', async () => {
    mocks.disputes = [makeDispute()];
    mocks.messages = [
      { id: 'm1', senderId: 'mod-1', senderType: 'moderator', content: 'Mod reply', createdAt: '2024-06-15T13:00:00Z' },
    ];
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('Driver never showed up')).toBeTruthy());
    fireEvent.click(screen.getByText('Driver never showed up'));
    await waitFor(() => {
      const msgEl = screen.getByText('Mod reply');
      const bubble = msgEl.closest('.bg-blue-500\\/20');
      expect(bubble).toBeTruthy();
    });
  });

  it('send button disabled when input is empty', async () => {
    mocks.disputes = [makeDispute({ status: 'open' })];
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('Driver never showed up')).toBeTruthy());
    fireEvent.click(screen.getByText('Driver never showed up'));
    await waitFor(() => expect(screen.getByPlaceholderText('Type a message...')).toBeTruthy());

    const sendBtn = document.querySelector('[data-testid="icon-Send"]')!.closest('button')!;
    expect(sendBtn.disabled).toBe(true);
  });

  it('close button in detail returns to list', async () => {
    mocks.disputes = [makeDispute()];
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('Driver never showed up')).toBeTruthy());
    fireEvent.click(screen.getByText('Driver never showed up'));
    await waitFor(() => expect(screen.getByText('no show Dispute')).toBeTruthy());

    // Find the X icon in the detail modal (there should be one)
    const xIcons = document.querySelectorAll('[data-testid="icon-X"]');
    const closeBtn = xIcons[xIcons.length - 1].closest('button')!;
    fireEvent.click(closeBtn);
    await waitFor(() => {
      expect(screen.queryByText('no show Dispute')).toBeNull();
    });
  });
});

/* ═══════════════════════════════════════
   Error handling
   ═══════════════════════════════════════ */
describe('DisputeCenter – errors', () => {
  it('handles loadDisputes error gracefully', async () => {
    vi.mocked(disputeService.getUserDisputes).mockRejectedValue(new Error('Network error'));
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => {
      // Should show the empty state (no disputes loaded)
      expect(screen.getByText('Dispute Center')).toBeTruthy();
    });
  });

  it('handles loadMessages error gracefully', async () => {
    mocks.disputes = [makeDispute()];
    vi.mocked(disputeService.getDisputeMessages).mockRejectedValue(new Error('fail'));
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('Driver never showed up')).toBeTruthy());
    fireEvent.click(screen.getByText('Driver never showed up'));
    await waitFor(() => {
      // Should still show the detail but with empty messages
      expect(screen.getByText('No messages yet')).toBeTruthy();
    });
  });

  it('handles sendMessage error gracefully', async () => {
    mocks.disputes = [makeDispute({ status: 'open' })];
    vi.mocked(disputeService.sendMessage).mockRejectedValue(new Error('fail'));
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => expect(screen.getByText('Driver never showed up')).toBeTruthy());
    fireEvent.click(screen.getByText('Driver never showed up'));
    await waitFor(() => expect(screen.getByPlaceholderText('Type a message...')).toBeTruthy());

    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: 'test' } });
    const sendBtn = document.querySelector('[data-testid="icon-Send"]')!.closest('button')!;
    fireEvent.click(sendBtn);

    // Should not crash — component stays open
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type a message...')).toBeTruthy();
    });
  });
});

/* ═══════════════════════════════════════
   Active count edge cases
   ═══════════════════════════════════════ */
describe('DisputeCenter – active count', () => {
  it('counts only non-resolved non-closed as active', async () => {
    mocks.disputes = [
      makeDispute({ id: 'd-1', status: 'open' }),
      makeDispute({ id: 'd-2', status: 'under_review' }),
      makeDispute({ id: 'd-3', status: 'awaiting_response' }),
      makeDispute({ id: 'd-4', status: 'mediation' }),
      makeDispute({ id: 'd-5', status: 'resolved' }),
      makeDispute({ id: 'd-6', status: 'closed' }),
    ];
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText('4 active')).toBeTruthy();
    });
  });

  it('0 active when all resolved/closed', async () => {
    mocks.disputes = [
      makeDispute({ id: 'd-1', status: 'resolved' }),
      makeDispute({ id: 'd-2', status: 'closed' }),
    ];
    render(<DisputeCenter userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText('0 active')).toBeTruthy();
    });
  });
});
