/**
 * messageStatus.spec.tsx — Tests for ReadReceipt, OnlineStatus, MessageReactions, ReactionPicker
 */

// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import {
  ReadReceipt,
  TypingIndicator,
  OnlineStatus,
  MessageReactions,
  ReactionPicker,
} from '../../src/components/messaging/MessageStatus';

afterEach(() => cleanup());

// ============================================================
// ReadReceipt
// ============================================================

describe('ReadReceipt', () => {
  it('should render "Sending..." title for sending status', () => {
    render(<ReadReceipt status="sending" />);
    expect(screen.getByTitle('Sending...')).toBeInTheDocument();
  });

  it('should render "Sent" title for sent status', () => {
    render(<ReadReceipt status="sent" />);
    expect(screen.getByTitle('Sent')).toBeInTheDocument();
  });

  it('should render "Delivered" title for delivered status', () => {
    render(<ReadReceipt status="delivered" />);
    expect(screen.getByTitle('Delivered')).toBeInTheDocument();
  });

  it('should render "Read" title for read status', () => {
    render(<ReadReceipt status="read" />);
    expect(screen.getByTitle('Read')).toBeInTheDocument();
  });

  it('should render "Failed to send" title for failed status', () => {
    render(<ReadReceipt status="failed" />);
    expect(screen.getByTitle('Failed to send')).toBeInTheDocument();
  });

  it('should display formatted time when timestamp provided', () => {
    const ts = new Date('2026-01-15T14:30:00Z');
    render(<ReadReceipt status="sent" timestamp={ts} />);

    // The formatted time should appear — format is HH:MM
    const timeText = ts.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    expect(screen.getByText(timeText)).toBeInTheDocument();
  });

  it('should not display time when no timestamp', () => {
    const { container } = render(<ReadReceipt status="sent" />);

    // Only the icon span, no time text
    const spans = container.querySelectorAll('span');
    // One span is the icon wrapper
    const textSpans = Array.from(spans).filter(s => s.className.includes('text-xs'));
    expect(textSpans).toHaveLength(0);
  });

  it('should apply custom className', () => {
    const { container } = render(<ReadReceipt status="sent" className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

// ============================================================
// TypingIndicator (from MessageStatus.tsx)
// ============================================================

describe('TypingIndicator (MessageStatus)', () => {
  it('should render three bouncing dots', () => {
    const { container } = render(<TypingIndicator />);
    // framer-motion divs for the dots
    const dots = container.querySelectorAll('.bg-slate-400');
    expect(dots.length).toBeGreaterThanOrEqual(3);
  });

  it('should show user name when provided', () => {
    render(<TypingIndicator userName="Alice" />);
    expect(screen.getByText('Alice is typing')).toBeInTheDocument();
  });

  it('should not show name when not provided', () => {
    const { container } = render(<TypingIndicator />);
    expect(container.textContent).not.toContain('is typing');
  });

  it('should render avatar when provided', () => {
    render(<TypingIndicator userName="Alice" userAvatar="https://example.com/alice.jpg" />);
    const img = screen.getByAltText('Alice');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/alice.jpg');
  });
});

// ============================================================
// OnlineStatus
// ============================================================

describe('OnlineStatus', () => {
  it('should show green dot when online', () => {
    const { container } = render(<OnlineStatus isOnline={true} />);
    const dot = container.querySelector('.bg-emerald-400');
    expect(dot).toBeTruthy();
  });

  it('should show gray dot when offline', () => {
    const { container } = render(<OnlineStatus isOnline={false} />);
    const dot = container.querySelector('.bg-slate-500');
    expect(dot).toBeTruthy();
  });

  it('should show "Last seen" text for offline users with lastSeen', () => {
    const lastSeen = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
    render(<OnlineStatus isOnline={false} lastSeen={lastSeen} />);

    expect(screen.getByText(/Last seen/)).toBeInTheDocument();
  });

  it('should not show "Last seen" for online users', () => {
    render(<OnlineStatus isOnline={true} lastSeen={new Date()} />);

    expect(screen.queryByText(/Last seen/)).not.toBeInTheDocument();
  });

  it('should format "Just now" for very recent last seen', () => {
    const lastSeen = new Date(Date.now() - 10 * 1000); // 10 seconds ago
    render(<OnlineStatus isOnline={false} lastSeen={lastSeen} />);

    expect(screen.getByText(/Just now/)).toBeInTheDocument();
  });

  it('should format minutes for recent last seen', () => {
    const lastSeen = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago
    render(<OnlineStatus isOnline={false} lastSeen={lastSeen} />);

    expect(screen.getByText(/15m ago/)).toBeInTheDocument();
  });

  it('should format hours for older last seen', () => {
    const lastSeen = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago
    render(<OnlineStatus isOnline={false} lastSeen={lastSeen} />);

    expect(screen.getByText(/3h ago/)).toBeInTheDocument();
  });

  it('should format days for much older last seen', () => {
    const lastSeen = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    render(<OnlineStatus isOnline={false} lastSeen={lastSeen} />);

    expect(screen.getByText(/2d ago/)).toBeInTheDocument();
  });

  it('should apply small size class by default', () => {
    const { container } = render(<OnlineStatus isOnline={true} />);
    const dot = container.querySelector('.w-2');
    expect(dot).toBeTruthy();
  });

  it('should apply medium size class', () => {
    const { container } = render(<OnlineStatus isOnline={true} size="md" />);
    const dot = container.querySelector('.w-2\\.5');
    expect(dot).toBeTruthy();
  });

  it('should apply large size class', () => {
    const { container } = render(<OnlineStatus isOnline={true} size="lg" />);
    const dot = container.querySelector('.w-3');
    expect(dot).toBeTruthy();
  });
});

// ============================================================
// MessageReactions
// ============================================================

describe('MessageReactions', () => {
  const reactions = [
    { emoji: '👍', users: ['user-1', 'user-2'], count: 2 },
    { emoji: '❤️', users: ['user-2'], count: 1 },
  ];

  it('should render all reaction emojis', () => {
    render(
      <MessageReactions
        reactions={reactions}
        currentUserId="user-1"
        onReact={vi.fn()}
        onRemoveReaction={vi.fn()}
      />,
    );

    expect(screen.getByText('👍')).toBeInTheDocument();
    expect(screen.getByText('❤️')).toBeInTheDocument();
  });

  it('should show reaction counts', () => {
    render(
      <MessageReactions
        reactions={reactions}
        currentUserId="user-1"
        onReact={vi.fn()}
        onRemoveReaction={vi.fn()}
      />,
    );

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should call onRemoveReaction when current user has reacted', () => {
    const onRemoveReaction = vi.fn();
    render(
      <MessageReactions
        reactions={reactions}
        currentUserId="user-1"
        onReact={vi.fn()}
        onRemoveReaction={onRemoveReaction}
      />,
    );

    // user-1 has reacted with 👍
    fireEvent.click(screen.getByText('👍'));

    expect(onRemoveReaction).toHaveBeenCalledWith('👍');
  });

  it('should call onReact when current user has not reacted', () => {
    const onReact = vi.fn();
    render(
      <MessageReactions
        reactions={reactions}
        currentUserId="user-1"
        onReact={onReact}
        onRemoveReaction={vi.fn()}
      />,
    );

    // user-1 has NOT reacted with ❤️
    fireEvent.click(screen.getByText('❤️'));

    expect(onReact).toHaveBeenCalledWith('❤️');
  });

  it('should render empty when no reactions', () => {
    const { container } = render(
      <MessageReactions
        reactions={[]}
        currentUserId="user-1"
        onReact={vi.fn()}
        onRemoveReaction={vi.fn()}
      />,
    );

    expect(container.querySelectorAll('button')).toHaveLength(0);
  });
});

// ============================================================
// ReactionPicker
// ============================================================

describe('ReactionPicker', () => {
  it('should render common reaction emojis', () => {
    render(<ReactionPicker onSelect={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByText('👍')).toBeInTheDocument();
    expect(screen.getByText('❤️')).toBeInTheDocument();
    expect(screen.getByText('😂')).toBeInTheDocument();
    expect(screen.getByText('🚗')).toBeInTheDocument();
  });

  it('should call onSelect and onClose when emoji clicked', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(<ReactionPicker onSelect={onSelect} onClose={onClose} />);

    fireEvent.click(screen.getByText('🔥'));

    expect(onSelect).toHaveBeenCalledWith('🔥');
    expect(onClose).toHaveBeenCalled();
  });

  it('should render 16 common reactions', () => {
    const { container } = render(<ReactionPicker onSelect={vi.fn()} onClose={vi.fn()} />);
    const buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(16);
  });
});
