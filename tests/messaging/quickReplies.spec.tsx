/**
 * quickReplies.spec.tsx — Tests for QuickReplies and SmartSuggestions components
 */

// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { QuickReplies, SmartSuggestions } from '../../src/components/messaging/QuickReplies';

afterEach(() => cleanup());

// ============================================================
// QuickReplies
// ============================================================

describe('QuickReplies', () => {
  it('should render general replies by default', () => {
    render(<QuickReplies onSelect={vi.fn()} />);

    expect(screen.getByText('Hi! 👋')).toBeInTheDocument();
    expect(screen.getByText('Thanks!')).toBeInTheDocument();
    expect(screen.getByText('Sounds good!')).toBeInTheDocument();
    expect(screen.getByText('Let me check and get back to you')).toBeInTheDocument();
  });

  it('should render booking-context replies', () => {
    render(<QuickReplies onSelect={vi.fn()} context="booking" />);

    expect(screen.getByText("I'm on my way!")).toBeInTheDocument();
    expect(screen.getByText('Running a few minutes late')).toBeInTheDocument();
    expect(screen.getByText("I'm at the pickup point")).toBeInTheDocument();
    expect(screen.getByText('Thank you!')).toBeInTheDocument();
  });

  it('should render ride-context replies', () => {
    render(<QuickReplies onSelect={vi.fn()} context="ride" />);

    expect(screen.getByText('Is this ride still available?')).toBeInTheDocument();
    expect(screen.getByText('Can you pick me up at a different location?')).toBeInTheDocument();
    expect(screen.getByText('What time will you arrive?')).toBeInTheDocument();
    expect(screen.getByText("I'd like to book this ride")).toBeInTheDocument();
  });

  it('should call onSelect with reply text when clicked', () => {
    const onSelect = vi.fn();
    render(<QuickReplies onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Hi! 👋'));

    expect(onSelect).toHaveBeenCalledWith('Hi! 👋');
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('should disable buttons when disabled=true', () => {
    render(<QuickReplies onSelect={vi.fn()} disabled />);

    const buttons = screen.getAllByRole('button');
    buttons.forEach(btn => {
      expect(btn).toBeDisabled();
    });
  });

  it('should not call onSelect when disabled', () => {
    const onSelect = vi.fn();
    render(<QuickReplies onSelect={onSelect} disabled />);

    fireEvent.click(screen.getByText('Hi! 👋'));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('should render 4 buttons per context', () => {
    const { container } = render(<QuickReplies onSelect={vi.fn()} context="general" />);
    expect(container.querySelectorAll('button')).toHaveLength(4);
  });
});

// ============================================================
// SmartSuggestions
// ============================================================

describe('SmartSuggestions', () => {
  it('should return null when no lastMessage provided', () => {
    const { container } = render(<SmartSuggestions onSelect={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('should return null for unrecognized messages', () => {
    const { container } = render(
      <SmartSuggestions lastMessage="The weather is nice today" onSelect={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('should suggest availability responses for "available"', () => {
    render(<SmartSuggestions lastMessage="Is this available?" onSelect={vi.fn()} />);

    expect(screen.getByText('Yes, still available!')).toBeInTheDocument();
    expect(screen.getByText("Sorry, it's been booked")).toBeInTheDocument();
  });

  it('should suggest availability responses for "still free"', () => {
    render(<SmartSuggestions lastMessage="Is this still free?" onSelect={vi.fn()} />);

    expect(screen.getByText('Yes, still available!')).toBeInTheDocument();
  });

  it('should suggest location responses for "where" + "meet"', () => {
    render(<SmartSuggestions lastMessage="Where should we meet?" onSelect={vi.fn()} />);

    expect(screen.getByText("I'll send you my location")).toBeInTheDocument();
    expect(screen.getByText("Let's meet at the main entrance")).toBeInTheDocument();
  });

  it('should suggest location responses for "where" + "pickup"', () => {
    render(<SmartSuggestions lastMessage="Where is the pickup?" onSelect={vi.fn()} />);

    expect(screen.getByText("I'll send you my location")).toBeInTheDocument();
  });

  it('should suggest time responses for "what time"', () => {
    render(<SmartSuggestions lastMessage="What time will you arrive?" onSelect={vi.fn()} />);

    expect(screen.getByText("I'll be there in 5 minutes")).toBeInTheDocument();
    expect(screen.getByText('Around 10 minutes')).toBeInTheDocument();
  });

  it('should suggest time responses for "when"', () => {
    render(<SmartSuggestions lastMessage="When are you coming?" onSelect={vi.fn()} />);

    expect(screen.getByText("I'll be there in 5 minutes")).toBeInTheDocument();
  });

  it('should suggest gratitude responses for "thank"', () => {
    render(<SmartSuggestions lastMessage="Thank you so much!" onSelect={vi.fn()} />);

    expect(screen.getByText("You're welcome!")).toBeInTheDocument();
    expect(screen.getByText('No problem!')).toBeInTheDocument();
    expect(screen.getByText('Happy to help!')).toBeInTheDocument();
  });

  it('should suggest responses for "running late"', () => {
    render(<SmartSuggestions lastMessage="I'm running late sorry" onSelect={vi.fn()} />);

    expect(screen.getByText('No worries, take your time')).toBeInTheDocument();
    expect(screen.getByText('How long will you be?')).toBeInTheDocument();
  });

  it('should suggest responses for "delayed"', () => {
    render(<SmartSuggestions lastMessage="Traffic is delayed" onSelect={vi.fn()} />);

    expect(screen.getByText('No worries, take your time')).toBeInTheDocument();
  });

  it('should suggest responses for "can i"', () => {
    render(<SmartSuggestions lastMessage="Can I bring a friend?" onSelect={vi.fn()} />);

    expect(screen.getByText('Sure, no problem!')).toBeInTheDocument();
    expect(screen.getByText('Let me check...')).toBeInTheDocument();
  });

  it('should suggest responses for "is it ok"', () => {
    render(<SmartSuggestions lastMessage="Is it ok to bring luggage?" onSelect={vi.fn()} />);

    expect(screen.getByText('Sure, no problem!')).toBeInTheDocument();
  });

  it('should call onSelect with suggestion text when clicked', () => {
    const onSelect = vi.fn();
    render(<SmartSuggestions lastMessage="Thanks!" onSelect={onSelect} />);

    fireEvent.click(screen.getByText("You're welcome!"));

    expect(onSelect).toHaveBeenCalledWith("You're welcome!");
  });

  it('should be case-insensitive', () => {
    render(<SmartSuggestions lastMessage="THANK YOU!" onSelect={vi.fn()} />);

    expect(screen.getByText("You're welcome!")).toBeInTheDocument();
  });
});
