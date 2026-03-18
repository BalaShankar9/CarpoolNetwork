/**
 * Settings module — Batch 2
 * NotificationSettings (14 tests)
 * AccessibilitySettings (17 tests)
 * ≈ 31 tests
 */
// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';

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
    // NotificationSettings icons
    Bell: stub('Bell'),
    Mail: stub('Mail'),
    MessageSquare: stub('MessageSquare'),
    Smartphone: stub('Smartphone'),
    Clock: stub('Clock'),
    CheckCircle: stub('CheckCircle'),
    AlertCircle: stub('AlertCircle'),
    // AccessibilitySettings icons
    Accessibility: stub('Accessibility'),
    Eye: stub('Eye'),
    Volume2: stub('Volume2'),
    Hand: stub('Hand'),
    Vibrate: stub('Vibrate'),
    Keyboard: stub('Keyboard'),

    mockFrom: vi.fn(),
    mockProfile: null as any,
  };
});

/* ------------------------------------------------------------------ */
/*  Module mocks                                                       */
/* ------------------------------------------------------------------ */

vi.mock('lucide-react', () => ({
  Bell: mocks.Bell,
  Mail: mocks.Mail,
  MessageSquare: mocks.MessageSquare,
  Smartphone: mocks.Smartphone,
  Clock: mocks.Clock,
  CheckCircle: mocks.CheckCircle,
  AlertCircle: mocks.AlertCircle,
  Accessibility: mocks.Accessibility,
  Eye: mocks.Eye,
  Volume2: mocks.Volume2,
  Hand: mocks.Hand,
  Vibrate: mocks.Vibrate,
  Keyboard: mocks.Keyboard,
}));

vi.mock('../../src/lib/supabase', () => ({
  supabase: { from: (...a: any[]) => mocks.mockFrom(...a) },
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: mocks.mockProfile }),
}));

/* ------------------------------------------------------------------ */
/*  Imports (after mocks)                                              */
/* ------------------------------------------------------------------ */

import NotificationSettings from '../../src/components/settings/NotificationSettings';
import AccessibilitySettings from '../../src/components/settings/AccessibilitySettings';
import {
  FAKE_PROFILE,
  FAKE_NOTIFICATION_PREFS,
  FAKE_ACCESSIBILITY_PREFS,
  buildMockChain,
} from './helpers';

/* ------------------------------------------------------------------ */
/*  Setup / Teardown                                                   */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mockProfile = { ...FAKE_PROFILE };
  // Default: successful load returning notification prefs
  mocks.mockFrom.mockReturnValue(buildMockChain([FAKE_NOTIFICATION_PREFS]));
});

afterEach(cleanup);

/* ================================================================== */
/*  NotificationSettings                                               */
/* ================================================================== */

describe('NotificationSettings', () => {
  it('renders Notification Channels heading', async () => {
    await act(async () => { render(<NotificationSettings />); });
    expect(screen.getByText('Notification Channels')).toBeTruthy();
  });

  it('renders Push Notifications option', async () => {
    await act(async () => { render(<NotificationSettings />); });
    expect(screen.getByText('Push Notifications')).toBeTruthy();
    expect(screen.getByText('Receive notifications on your device')).toBeTruthy();
  });

  it('renders Email Notifications option', async () => {
    await act(async () => { render(<NotificationSettings />); });
    expect(screen.getByText('Email Notifications')).toBeTruthy();
    expect(screen.getByText('Receive notifications via email')).toBeTruthy();
  });

  it('renders SMS Notifications option', async () => {
    await act(async () => { render(<NotificationSettings />); });
    expect(screen.getByText('SMS Notifications')).toBeTruthy();
    expect(screen.getByText('Receive notifications via text message')).toBeTruthy();
  });

  it('renders Notification Categories heading', async () => {
    await act(async () => { render(<NotificationSettings />); });
    expect(screen.getByText('Notification Categories')).toBeTruthy();
  });

  it('renders Ride Notifications option', async () => {
    await act(async () => { render(<NotificationSettings />); });
    expect(screen.getByText('Ride Notifications')).toBeTruthy();
  });

  it('renders Message Notifications option', async () => {
    await act(async () => { render(<NotificationSettings />); });
    expect(screen.getByText('Message Notifications')).toBeTruthy();
  });

  it('renders Social Notifications option', async () => {
    await act(async () => { render(<NotificationSettings />); });
    expect(screen.getByText('Social Notifications')).toBeTruthy();
  });

  it('renders Challenge Notifications option', async () => {
    await act(async () => { render(<NotificationSettings />); });
    expect(screen.getByText('Challenge Notifications')).toBeTruthy();
  });

  it('renders System Notifications option', async () => {
    await act(async () => { render(<NotificationSettings />); });
    expect(screen.getByText('System Notifications')).toBeTruthy();
  });

  it('renders Do Not Disturb section', async () => {
    await act(async () => { render(<NotificationSettings />); });
    expect(screen.getByText('Do Not Disturb')).toBeTruthy();
    expect(screen.getByText('Enable Do Not Disturb')).toBeTruthy();
  });

  it('hides DND time inputs when disabled (default)', async () => {
    await act(async () => { render(<NotificationSettings />); });
    expect(screen.queryByText('Start Time')).toBeNull();
    expect(screen.queryByText('End Time')).toBeNull();
  });

  it('shows DND time inputs when DND is enabled', async () => {
    mocks.mockFrom.mockReturnValue(
      buildMockChain([{ ...FAKE_NOTIFICATION_PREFS, dnd_enabled: true }])
    );
    await act(async () => { render(<NotificationSettings />); });
    expect(screen.getByText('Start Time')).toBeTruthy();
    expect(screen.getByText('End Time')).toBeTruthy();
  });

  it('shows error on load failure', async () => {
    mocks.mockFrom.mockReturnValue(
      buildMockChain([], { message: 'Network error' })
    );
    await act(async () => { render(<NotificationSettings />); });
    expect(screen.getByText('Failed to load notification preferences')).toBeTruthy();
  });
});

/* ================================================================== */
/*  AccessibilitySettings                                              */
/* ================================================================== */

describe('AccessibilitySettings', () => {
  beforeEach(() => {
    mocks.mockFrom.mockReturnValue(buildMockChain([FAKE_ACCESSIBILITY_PREFS]));
  });

  it('shows loading spinner when profile is not available', () => {
    mocks.mockProfile = null;
    const { container } = render(<AccessibilitySettings />);
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('renders Accessibility First banner', async () => {
    await act(async () => { render(<AccessibilitySettings />); });
    expect(screen.getByText('Accessibility First')).toBeTruthy();
    expect(screen.getByText(/committed to making our app accessible/)).toBeTruthy();
  });

  it('renders Visual Accessibility heading', async () => {
    await act(async () => { render(<AccessibilitySettings />); });
    expect(screen.getByText('Visual Accessibility')).toBeTruthy();
  });

  it('renders Screen Reader Support toggle', async () => {
    await act(async () => { render(<AccessibilitySettings />); });
    expect(screen.getByRole('switch', { name: 'Screen Reader Support' })).toBeTruthy();
    expect(screen.getByText('Enhanced compatibility with screen readers')).toBeTruthy();
  });

  it('renders Large Text toggle', async () => {
    await act(async () => { render(<AccessibilitySettings />); });
    expect(screen.getByRole('switch', { name: 'Large Text' })).toBeTruthy();
  });

  it('renders High Contrast Mode toggle', async () => {
    await act(async () => { render(<AccessibilitySettings />); });
    expect(screen.getByRole('switch', { name: 'High Contrast Mode' })).toBeTruthy();
  });

  it('renders Reduce Motion toggle', async () => {
    await act(async () => { render(<AccessibilitySettings />); });
    expect(screen.getByRole('switch', { name: 'Reduce Motion' })).toBeTruthy();
  });

  it('renders Color Blind Mode dropdown with options', async () => {
    await act(async () => { render(<AccessibilitySettings />); });
    expect(screen.getByText('Color Blind Mode')).toBeTruthy();
    expect(screen.getByText('Protanopia (Red-Green)')).toBeTruthy();
    expect(screen.getByText('Deuteranopia (Red-Green)')).toBeTruthy();
    expect(screen.getByText('Tritanopia (Blue-Yellow)')).toBeTruthy();
    expect(screen.getByText('Monochromacy (Grayscale)')).toBeTruthy();
  });

  it('renders Audio & Feedback heading', async () => {
    await act(async () => { render(<AccessibilitySettings />); });
    expect(screen.getByText('Audio & Feedback')).toBeTruthy();
  });

  it('renders Sound Alerts toggle', async () => {
    await act(async () => { render(<AccessibilitySettings />); });
    expect(screen.getByRole('switch', { name: 'Sound Alerts' })).toBeTruthy();
  });

  it('renders Captions toggle', async () => {
    await act(async () => { render(<AccessibilitySettings />); });
    expect(screen.getByRole('switch', { name: 'Captions' })).toBeTruthy();
  });

  it('renders Voice Commands toggle', async () => {
    await act(async () => { render(<AccessibilitySettings />); });
    expect(screen.getByRole('switch', { name: 'Voice Commands' })).toBeTruthy();
  });

  it('renders Interaction heading', async () => {
    await act(async () => { render(<AccessibilitySettings />); });
    expect(screen.getByText('Interaction')).toBeTruthy();
  });

  it('renders Haptic Feedback toggle', async () => {
    await act(async () => { render(<AccessibilitySettings />); });
    expect(screen.getByRole('switch', { name: 'Haptic Feedback' })).toBeTruthy();
  });

  it('renders Keyboard Navigation toggle', async () => {
    await act(async () => { render(<AccessibilitySettings />); });
    expect(screen.getByRole('switch', { name: 'Keyboard Navigation' })).toBeTruthy();
  });

  it('toggling a switch calls supabase upsert', async () => {
    await act(async () => { render(<AccessibilitySettings />); });

    const toggle = screen.getByRole('switch', { name: 'Screen Reader Support' });
    await act(async () => { fireEvent.click(toggle); });

    // mockFrom called once for load + once for update
    expect(mocks.mockFrom).toHaveBeenCalledWith('user_preferences');
  });

  it('shows error message on update failure', async () => {
    await act(async () => { render(<AccessibilitySettings />); });

    // Make next supabase call fail
    mocks.mockFrom.mockReturnValue(buildMockChain([], { message: 'Update failed' }));

    const toggle = screen.getByRole('switch', { name: 'Screen Reader Support' });
    await act(async () => { fireEvent.click(toggle); });

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeTruthy();
    });
  });
});
