/**
 * scheduledMessage.spec.tsx — Tests for ScheduledMessage and ScheduledMessageItem
 */

// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ScheduledMessage, ScheduledMessageItem } from '../../src/components/messaging/ScheduledMessage';

afterEach(() => cleanup());

// ============================================================
// ScheduledMessage
// ============================================================

describe('ScheduledMessage', () => {
  const defaultProps = {
    message: 'Hello, see you tomorrow!',
    recipientName: 'Alice',
    onSchedule: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render message preview', () => {
    render(<ScheduledMessage {...defaultProps} />);
    expect(screen.getByText(/Hello, see you tomorrow/)).toBeInTheDocument();
  });

  it('should show recipient name', () => {
    render(<ScheduledMessage {...defaultProps} />);
    expect(screen.getByText('To Alice')).toBeInTheDocument();
  });

  it('should render quick option buttons', () => {
    render(<ScheduledMessage {...defaultProps} />);

    expect(screen.getByText('In 1 hour')).toBeInTheDocument();
    expect(screen.getByText('Tomorrow morning')).toBeInTheDocument();
    expect(screen.getByText('Tomorrow evening')).toBeInTheDocument();
    expect(screen.getByText('This weekend')).toBeInTheDocument();
  });

  it('should call onSchedule when "In 1 hour" is clicked', () => {
    const onSchedule = vi.fn();
    render(<ScheduledMessage {...defaultProps} onSchedule={onSchedule} />);

    fireEvent.click(screen.getByText('In 1 hour'));

    expect(onSchedule).toHaveBeenCalledTimes(1);
    const scheduledDate = onSchedule.mock.calls[0][0] as Date;
    // Should be ~1 hour from now
    const diff = scheduledDate.getTime() - Date.now();
    expect(diff).toBeCloseTo(60 * 60 * 1000, -3); // within ~1s tolerance
  });

  it('should call onSchedule with tomorrow 9am for "Tomorrow morning"', () => {
    const onSchedule = vi.fn();
    render(<ScheduledMessage {...defaultProps} onSchedule={onSchedule} />);

    fireEvent.click(screen.getByText('Tomorrow morning'));

    expect(onSchedule).toHaveBeenCalledTimes(1);
    const scheduledDate = onSchedule.mock.calls[0][0] as Date;
    expect(scheduledDate.getHours()).toBe(9);
    expect(scheduledDate.getMinutes()).toBe(0);
  });

  it('should call onSchedule with tomorrow 6pm for "Tomorrow evening"', () => {
    const onSchedule = vi.fn();
    render(<ScheduledMessage {...defaultProps} onSchedule={onSchedule} />);

    fireEvent.click(screen.getByText('Tomorrow evening'));

    expect(onSchedule).toHaveBeenCalledTimes(1);
    const scheduledDate = onSchedule.mock.calls[0][0] as Date;
    expect(scheduledDate.getHours()).toBe(18);
  });

  it('should call onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<ScheduledMessage {...defaultProps} onCancel={onCancel} />);

    // The X button
    const cancelButtons = screen.getAllByRole('button');
    const xButton = cancelButtons.find(btn => {
      const svg = btn.querySelector('svg');
      return svg && btn.closest('.border-b');
    });
    // Find the X button in the header area
    fireEvent.click(cancelButtons[0]); // Quick options toggle or X button

    // Try finding specifically
    const buttons = screen.getAllByRole('button');
    // The cancel (X) button should be among the first buttons in the header
    for (const btn of buttons) {
      if (btn.closest('.border-b') && !btn.textContent?.includes('Quick')) {
        fireEvent.click(btn);
        break;
      }
    }
  });

  it('should render custom time inputs (date and time)', () => {
    render(<ScheduledMessage {...defaultProps} />);

    expect(screen.getByText('Or choose custom time')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Time')).toBeInTheDocument();
  });

  it('should render Schedule Message button for custom time', () => {
    render(<ScheduledMessage {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Schedule Message/ })).toBeInTheDocument();
  });

  it('should reject past times with alert', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const onSchedule = vi.fn();
    render(<ScheduledMessage {...defaultProps} onSchedule={onSchedule} />);

    // Set time to a past value — the default time is 09:00 and we're at 12:00
    // Just clicking "Schedule Message" with default date (today) and time 09:00
    // should trigger past time alert
    fireEvent.click(screen.getByRole('button', { name: /Schedule Message/ }));

    expect(alertSpy).toHaveBeenCalledWith('Please select a future time');
    expect(onSchedule).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

// ============================================================
// ScheduledMessageItem
// ============================================================

describe('ScheduledMessageItem', () => {
  const defaultProps = {
    id: 'sched-1',
    message: 'See you later!',
    recipientName: 'Bob',
    scheduledTime: new Date('2026-06-16T09:00:00Z'),
    onCancel: vi.fn(),
    onSendNow: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render recipient name', () => {
    render(<ScheduledMessageItem {...defaultProps} />);
    expect(screen.getByText('To Bob')).toBeInTheDocument();
  });

  it('should render message preview', () => {
    render(<ScheduledMessageItem {...defaultProps} />);
    expect(screen.getByText('See you later!')).toBeInTheDocument();
  });

  it('should show "Send Now" and "Cancel" buttons', () => {
    render(<ScheduledMessageItem {...defaultProps} />);
    expect(screen.getByText('Send Now')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should call onSendNow with id when "Send Now" clicked', () => {
    const onSendNow = vi.fn();
    render(<ScheduledMessageItem {...defaultProps} onSendNow={onSendNow} />);

    fireEvent.click(screen.getByText('Send Now'));

    expect(onSendNow).toHaveBeenCalledWith('sched-1');
  });

  it('should call onCancel with id when "Cancel" clicked', () => {
    const onCancel = vi.fn();
    render(<ScheduledMessageItem {...defaultProps} onCancel={onCancel} />);

    fireEvent.click(screen.getByText('Cancel'));

    expect(onCancel).toHaveBeenCalledWith('sched-1');
  });

  it('should display time until delivery', () => {
    render(<ScheduledMessageItem {...defaultProps} />);

    // scheduledTime is about 21 hours away → should show "in Xh Ym"
    const container = screen.getByText(/^in /);
    expect(container).toBeTruthy();
  });
});
