// @vitest-environment jsdom
/**
 * Preferences Module — Batch 1
 *
 * Covers the simpler controlled / pure-render components:
 *   • ChatPreferences        (3 exports)  — 10 tests
 *   • MusicPreferences       (2 exports)  —  8 tests
 *   • PreferenceMatchIndicator (2 exports) — 14 tests
 *
 * Total: 32 tests
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks — must be hoisted
// ---------------------------------------------------------------------------

const mockIconStub = vi.hoisted(() => {
  const stub = (name: string) => {
    const Icon = (props: any) => <span data-testid={`icon-${name}`} {...props} />;
    Icon.displayName = name;
    return Icon;
  };
  return stub;
});

vi.mock('lucide-react', () => ({
  MessageSquare: mockIconStub('MessageSquare'),
  Volume2: mockIconStub('Volume2'),
  VolumeX: mockIconStub('VolumeX'),
  Mic: mockIconStub('Mic'),
  Music: mockIconStub('Music'),
  Radio: mockIconStub('Radio'),
  Headphones: mockIconStub('Headphones'),
  CheckCircle: mockIconStub('CheckCircle'),
  XCircle: mockIconStub('XCircle'),
  AlertCircle: mockIconStub('AlertCircle'),
  Cigarette: mockIconStub('Cigarette'),
  Dog: mockIconStub('Dog'),
  Baby: mockIconStub('Baby'),
  Snowflake: mockIconStub('Snowflake'),
  Briefcase: mockIconStub('Briefcase'),
  Clock: mockIconStub('Clock'),
  Sparkles: mockIconStub('Sparkles'),
}));

// ---------------------------------------------------------------------------
// Imports under test
// ---------------------------------------------------------------------------

import {
  ChatPreferences,
  ChatPreferenceBadge,
  ConversationCompatibility,
} from '../../src/components/preferences/ChatPreferences';

import {
  MusicPreferences,
  MusicPreferenceBadge,
} from '../../src/components/preferences/MusicPreferences';

import {
  PreferenceMatchIndicator,
  PreferenceMatchBadge,
} from '../../src/components/preferences/PreferenceMatchIndicator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

afterEach(cleanup);

// =========================================================================
// ChatPreferences
// =========================================================================
describe('ChatPreferences', () => {
  it('renders all conversation options', () => {
    const onChange = vi.fn();
    render(<ChatPreferences value="some" onChange={onChange} />);

    expect(screen.getByText('Chatty')).toBeTruthy();
    expect(screen.getByText('Balanced')).toBeTruthy();
    expect(screen.getByText('Quiet')).toBeTruthy();
  });

  it('highlights the selected option', () => {
    render(<ChatPreferences value="chatty" onChange={vi.fn()} />);
    const btn = screen.getByText('Chatty').closest('button');
    expect(btn?.className).toMatch(/blue|ring|selected|border-blue/);
  });

  it('calls onChange when an option is clicked', () => {
    const onChange = vi.fn();
    render(<ChatPreferences value="some" onChange={onChange} />);
    fireEvent.click(screen.getByText('Quiet'));
    expect(onChange).toHaveBeenCalledWith('quiet');
  });

  it('disables all buttons when disabled prop is true', () => {
    render(<ChatPreferences value="some" onChange={vi.fn()} disabled />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn).toHaveProperty('disabled', true);
    });
  });
});

// =========================================================================
// ChatPreferenceBadge
// =========================================================================
describe('ChatPreferenceBadge', () => {
  it('renders chatty badge', () => {
    render(<ChatPreferenceBadge preference="chatty" />);
    expect(screen.getByText('Chatty')).toBeTruthy();
  });

  it('renders moderate badge for "some"', () => {
    render(<ChatPreferenceBadge preference="some" />);
    expect(screen.getByText('Moderate')).toBeTruthy();
  });

  it('renders quiet badge', () => {
    render(<ChatPreferenceBadge preference="quiet" />);
    expect(screen.getByText('Quiet')).toBeTruthy();
  });
});

// =========================================================================
// ConversationCompatibility
// =========================================================================
describe('ConversationCompatibility', () => {
  it('shows "Perfect match!" for matching preferences', () => {
    render(<ConversationCompatibility userPreference="chatty" otherPreference="chatty" />);
    expect(screen.getByText('Perfect match!')).toBeTruthy();
  });

  it('shows "Compatible" for adjacent preferences', () => {
    render(<ConversationCompatibility userPreference="chatty" otherPreference="some" />);
    expect(screen.getByText('Compatible')).toBeTruthy();
  });

  it('shows "Different styles" for opposite preferences', () => {
    render(<ConversationCompatibility userPreference="chatty" otherPreference="quiet" />);
    expect(screen.getByText('Different styles')).toBeTruthy();
  });
});

// =========================================================================
// MusicPreferences
// =========================================================================
describe('MusicPreferences', () => {
  it('renders all music options', () => {
    render(<MusicPreferences value="any" onChange={vi.fn()} />);
    expect(screen.getByText('Any Music')).toBeTruthy();
    expect(screen.getByText('Quiet Ride')).toBeTruthy();
    expect(screen.getByText("Driver's Choice")).toBeTruthy();
    expect(screen.getByText("Passenger's Choice")).toBeTruthy();
  });

  it('highlights selected option', () => {
    render(<MusicPreferences value="quiet" onChange={vi.fn()} />);
    const btn = screen.getByText('Quiet Ride').closest('button');
    expect(btn?.className).toMatch(/purple|ring|selected|border-purple/);
  });

  it('calls onChange on selection', () => {
    const onChange = vi.fn();
    render(<MusicPreferences value="any" onChange={onChange} />);
    fireEvent.click(screen.getByText('Quiet Ride'));
    expect(onChange).toHaveBeenCalledWith('quiet');
  });

  it('disables buttons when disabled', () => {
    render(<MusicPreferences value="any" onChange={vi.fn()} disabled />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn).toHaveProperty('disabled', true);
    });
  });
});

// =========================================================================
// MusicPreferenceBadge
// =========================================================================
describe('MusicPreferenceBadge', () => {
  it('renders "Any Music" badge', () => {
    render(<MusicPreferenceBadge preference="any" />);
    expect(screen.getByText('Any Music')).toBeTruthy();
  });

  it('renders "Quiet" badge', () => {
    render(<MusicPreferenceBadge preference="quiet" />);
    expect(screen.getByText('Quiet')).toBeTruthy();
  });

  it('renders "Driver\'s Pick" badge', () => {
    render(<MusicPreferenceBadge preference="my_choice" />);
    expect(screen.getByText("Driver's Pick")).toBeTruthy();
  });

  it('renders "Your Pick" badge for passenger_choice', () => {
    render(<MusicPreferenceBadge preference="passenger_choice" />);
    expect(screen.getByText('Your Pick')).toBeTruthy();
  });
});

// =========================================================================
// PreferenceMatchIndicator
// =========================================================================
describe('PreferenceMatchIndicator', () => {
  const userPrefs = {
    user_id: 'u-001',
    music_preference: 'any' as const,
    conversation_preference: 'some' as const,
    smoking_allowed: false,
    pets_allowed: true,
    children_friendly: true,
    ac_preference: 'no_preference' as const,
    max_detour_minutes: 10,
    luggage_space: 'medium' as const,
  };

  const matchingPrefs = { ...userPrefs, user_id: 'u-002' };

  const mismatchedPrefs = {
    user_id: 'u-003',
    music_preference: 'quiet' as const,
    conversation_preference: 'quiet' as const,
    smoking_allowed: true,
    pets_allowed: false,
    children_friendly: false,
    ac_preference: 'on' as const,
    max_detour_minutes: 5,
    luggage_space: 'small' as const,
  };

  it('shows high match score for identical preferences', () => {
    render(
      <PreferenceMatchIndicator
        userPreferences={userPrefs}
        ridePreferences={matchingPrefs}
      />
    );
    const text = document.body.textContent || '';
    expect(text).toMatch(/100|great|excellent|perfect/i);
  });

  it('shows lower score for mismatched preferences', () => {
    render(
      <PreferenceMatchIndicator
        userPreferences={userPrefs}
        ridePreferences={mismatchedPrefs}
      />
    );
    const text = document.body.textContent || '';
    expect(text).not.toMatch(/100%/);
  });

  it('renders without crashing when showDetails is true', () => {
    render(
      <PreferenceMatchIndicator
        userPreferences={userPrefs}
        ridePreferences={matchingPrefs}
        showDetails={true}
      />
    );
    expect(document.body.textContent!.length).toBeGreaterThan(0);
  });

  it('renders compactly without details when showDetails is false', () => {
    const { container } = render(
      <PreferenceMatchIndicator
        userPreferences={userPrefs}
        ridePreferences={matchingPrefs}
        showDetails={false}
      />
    );
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  it('shows music match status in details', () => {
    render(
      <PreferenceMatchIndicator
        userPreferences={userPrefs}
        ridePreferences={mismatchedPrefs}
        showDetails={true}
      />
    );
    const text = document.body.textContent || '';
    expect(text.toLowerCase()).toMatch(/music/);
  });

  it('shows smoking mismatch when values differ', () => {
    render(
      <PreferenceMatchIndicator
        userPreferences={userPrefs}
        ridePreferences={{ ...matchingPrefs, smoking_allowed: true }}
        showDetails={true}
      />
    );
    const text = document.body.textContent || '';
    expect(text.toLowerCase()).toMatch(/smok/);
  });

  it('shows pets mismatch when user wants pets but ride says no', () => {
    render(
      <PreferenceMatchIndicator
        userPreferences={userPrefs}
        ridePreferences={{ ...matchingPrefs, pets_allowed: false }}
        showDetails={true}
      />
    );
    const text = document.body.textContent || '';
    expect(text.toLowerCase()).toMatch(/pet/);
  });

  it('shows AC status in details when preferences differ', () => {
    render(
      <PreferenceMatchIndicator
        userPreferences={{ ...userPrefs, ac_preference: 'on' as const }}
        ridePreferences={{ ...matchingPrefs, ac_preference: 'off' as const }}
        showDetails={true}
      />
    );
    const text = document.body.textContent || '';
    expect(text.toLowerCase()).toMatch(/ac/);
  });
});

// =========================================================================
// PreferenceMatchBadge
// =========================================================================
describe('PreferenceMatchBadge', () => {
  it('renders green badge for high score (≥80)', () => {
    const { container } = render(<PreferenceMatchBadge score={95} />);
    const html = container.innerHTML;
    expect(html).toMatch(/green/i);
  });

  it('renders blue badge for good score (60-79)', () => {
    const { container } = render(<PreferenceMatchBadge score={60} />);
    const html = container.innerHTML;
    expect(html).toMatch(/blue/i);
  });

  it('renders amber badge for OK score (40-59)', () => {
    const { container } = render(<PreferenceMatchBadge score={45} />);
    const html = container.innerHTML;
    expect(html).toMatch(/amber/i);
  });

  it('renders red badge for low score (<40)', () => {
    const { container } = render(<PreferenceMatchBadge score={20} />);
    const html = container.innerHTML;
    expect(html).toMatch(/red/i);
  });

  it('shows the score value', () => {
    render(<PreferenceMatchBadge score={75} />);
    expect(screen.getByText(/75/)).toBeTruthy();
  });

  it('handles zero score', () => {
    const { container } = render(<PreferenceMatchBadge score={0} />);
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  it('handles 100 score', () => {
    render(<PreferenceMatchBadge score={100} />);
    expect(screen.getByText(/100/)).toBeTruthy();
  });
});
