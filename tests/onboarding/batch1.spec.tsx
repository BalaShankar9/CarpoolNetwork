/**
 * Onboarding module — Batch 1
 * WelcomeStep       (8 tests)
 * CompletionStep    (9 tests)
 * ProfileStep       (11 tests)
 * PreferencesStep   (10 tests)
 * ≈ 38 tests
 */
// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { FAKE_USER, FAKE_PROFILE, buildMockChain } from './helpers';

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
    // Icons used across all 4 components
    Car: stub('Car'),
    Users: stub('Users'),
    Leaf: stub('Leaf'),
    Shield: stub('Shield'),
    ArrowRight: stub('ArrowRight'),
    Check: stub('Check'),
    Sparkles: stub('Sparkles'),
    TrendingUp: stub('TrendingUp'),
    Award: stub('Award'),
    User: stub('User'),
    MapPin: stub('MapPin'),
    Phone: stub('Phone'),
    Settings: stub('Settings'),
    Music: stub('Music'),
    MessageCircle: stub('MessageCircle'),
    Wind: stub('Wind'),

    // Supabase mock
    mockFrom: vi.fn(),
    mockAuth: { updateUser: vi.fn(), verifyOtp: vi.fn() },

    // Auth context
    mockUser: null as any,

    // Toast
    mockToastError: vi.fn(),
  };
});

/* ------------------------------------------------------------------ */
/*  Module mocks                                                       */
/* ------------------------------------------------------------------ */

vi.mock('lucide-react', () => ({
  Car: mocks.Car,
  Users: mocks.Users,
  Leaf: mocks.Leaf,
  Shield: mocks.Shield,
  ArrowRight: mocks.ArrowRight,
  Check: mocks.Check,
  Sparkles: mocks.Sparkles,
  TrendingUp: mocks.TrendingUp,
  Award: mocks.Award,
  User: mocks.User,
  MapPin: mocks.MapPin,
  Phone: mocks.Phone,
  Settings: mocks.Settings,
  Music: mocks.Music,
  MessageCircle: mocks.MessageCircle,
  Wind: mocks.Wind,
}));

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: (...a: any[]) => mocks.mockFrom(...a),
    auth: mocks.mockAuth,
  },
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.mockUser }),
}));

vi.mock('../../src/lib/toast', () => ({
  toast: { error: (...a: any[]) => mocks.mockToastError(...a), success: vi.fn() },
}));

/* ------------------------------------------------------------------ */
/*  Imports AFTER mocks                                                */
/* ------------------------------------------------------------------ */

import WelcomeStep from '../../src/components/onboarding/WelcomeStep';
import CompletionStep from '../../src/components/onboarding/CompletionStep';
import ProfileStep from '../../src/components/onboarding/ProfileStep';
import PreferencesStep from '../../src/components/onboarding/PreferencesStep';

afterEach(cleanup);

/* ================================================================== */
/*  WelcomeStep                                                        */
/* ================================================================== */

describe('WelcomeStep', () => {
  it('renders welcome title', () => {
    render(<WelcomeStep onNext={vi.fn()} />);
    expect(screen.getByText('Welcome to CarpoolNetwork!')).toBeTruthy();
  });

  it('renders subtitle', () => {
    render(<WelcomeStep onNext={vi.fn()} />);
    expect(screen.getByText(/get you set up in just a few quick steps/i)).toBeTruthy();
  });

  it('shows "Connect with Others" feature card', () => {
    render(<WelcomeStep onNext={vi.fn()} />);
    expect(screen.getByText('Connect with Others')).toBeTruthy();
  });

  it('shows "Save the Planet" feature card', () => {
    render(<WelcomeStep onNext={vi.fn()} />);
    expect(screen.getByText('Save the Planet')).toBeTruthy();
  });

  it('shows "Travel Safely" feature card', () => {
    render(<WelcomeStep onNext={vi.fn()} />);
    expect(screen.getByText('Travel Safely')).toBeTruthy();
  });

  it('shows "Save Money" feature card', () => {
    render(<WelcomeStep onNext={vi.fn()} />);
    expect(screen.getByText('Save Money')).toBeTruthy();
  });

  it('renders "Get Started" button', () => {
    render(<WelcomeStep onNext={vi.fn()} />);
    expect(screen.getByText('Get Started')).toBeTruthy();
  });

  it('calls onNext when "Get Started" is clicked', () => {
    const spy = vi.fn();
    render(<WelcomeStep onNext={spy} />);
    fireEvent.click(screen.getByText('Get Started'));
    expect(spy).toHaveBeenCalledOnce();
  });
});

/* ================================================================== */
/*  CompletionStep                                                     */
/* ================================================================== */

describe('CompletionStep', () => {
  it('renders completion title', () => {
    render(<CompletionStep onFinish={vi.fn()} isLoading={false} />);
    expect(screen.getByText("You're All Set!")).toBeTruthy();
  });

  it('renders welcome message', () => {
    render(<CompletionStep onFinish={vi.fn()} isLoading={false} />);
    expect(screen.getByText('Welcome to the CarpoolNetwork community')).toBeTruthy();
  });

  it('shows "What\'s Next?" section', () => {
    render(<CompletionStep onFinish={vi.fn()} isLoading={false} />);
    expect(screen.getByText("What's Next?")).toBeTruthy();
  });

  it('shows verification suggestion', () => {
    render(<CompletionStep onFinish={vi.fn()} isLoading={false} />);
    expect(screen.getByText('Complete Your Verification')).toBeTruthy();
  });

  it('shows profile photo suggestion', () => {
    render(<CompletionStep onFinish={vi.fn()} isLoading={false} />);
    expect(screen.getByText('Upload Profile Photo')).toBeTruthy();
  });

  it('shows first ride suggestion', () => {
    render(<CompletionStep onFinish={vi.fn()} isLoading={false} />);
    expect(screen.getByText('Find or Post Your First Ride')).toBeTruthy();
  });

  it('shows pro tip', () => {
    render(<CompletionStep onFinish={vi.fn()} isLoading={false} />);
    expect(screen.getByText(/increases your match rate by 78%/)).toBeTruthy();
  });

  it('renders "Start Using CarpoolNetwork" button', () => {
    render(<CompletionStep onFinish={vi.fn()} isLoading={false} />);
    expect(screen.getByText('Start Using CarpoolNetwork')).toBeTruthy();
  });

  it('shows "Finishing..." when isLoading is true', () => {
    render(<CompletionStep onFinish={vi.fn()} isLoading={true} />);
    expect(screen.getByText('Finishing...')).toBeTruthy();
  });

  it('calls onFinish when button is clicked', () => {
    const spy = vi.fn();
    render(<CompletionStep onFinish={spy} isLoading={false} />);
    fireEvent.click(screen.getByText('Start Using CarpoolNetwork'));
    expect(spy).toHaveBeenCalledOnce();
  });

  it('disables button when isLoading', () => {
    render(<CompletionStep onFinish={vi.fn()} isLoading={true} />);
    const btn = screen.getByText('Finishing...').closest('button');
    expect(btn?.disabled).toBe(true);
  });
});

/* ================================================================== */
/*  ProfileStep                                                        */
/* ================================================================== */

describe('ProfileStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockUser = { ...FAKE_USER };
    // loadProfile chain: from('profiles').select(...).eq(...).single()
    mocks.mockFrom.mockReturnValue(buildMockChain(FAKE_PROFILE));
  });

  it('renders "Complete Your Profile" heading', async () => {
    render(<ProfileStep onNext={vi.fn()} />);
    expect(screen.getByText('Complete Your Profile')).toBeTruthy();
  });

  it('renders subtitle', () => {
    render(<ProfileStep onNext={vi.fn()} />);
    expect(screen.getByText('Help others get to know you better')).toBeTruthy();
  });

  it('shows Full Name label and input', () => {
    render(<ProfileStep onNext={vi.fn()} />);
    expect(screen.getByText('Full Name *')).toBeTruthy();
    expect(screen.getByPlaceholderText('Enter your full name')).toBeTruthy();
  });

  it('shows Phone Number label and input', () => {
    render(<ProfileStep onNext={vi.fn()} />);
    expect(screen.getByText('Phone Number *')).toBeTruthy();
    expect(screen.getByPlaceholderText('+44 7XXX XXXXXX')).toBeTruthy();
  });

  it('shows City label and input', () => {
    render(<ProfileStep onNext={vi.fn()} />);
    expect(screen.getByText('City *')).toBeTruthy();
    expect(screen.getByPlaceholderText('London, Manchester, etc.')).toBeTruthy();
  });

  it('shows Bio label and textarea', () => {
    render(<ProfileStep onNext={vi.fn()} />);
    expect(screen.getByText('Bio (Optional)')).toBeTruthy();
    expect(screen.getByPlaceholderText('Tell us a bit about yourself...')).toBeTruthy();
  });

  it('renders Continue button', () => {
    render(<ProfileStep onNext={vi.fn()} />);
    expect(screen.getByText('Continue')).toBeTruthy();
  });

  it('populates form fields from loaded profile', async () => {
    render(<ProfileStep onNext={vi.fn()} />);
    await waitFor(() => {
      expect((screen.getByPlaceholderText('Enter your full name') as HTMLInputElement).value).toBe('Test Driver');
    });
  });

  it('calls supabase update on submit', async () => {
    const updateChain = buildMockChain(null, null);
    // First call = loadProfile select, subsequent = update
    mocks.mockFrom
      .mockReturnValueOnce(buildMockChain(FAKE_PROFILE))
      .mockReturnValue(updateChain);

    const spy = vi.fn();
    render(<ProfileStep onNext={spy} />);
    await waitFor(() => {
      expect((screen.getByPlaceholderText('Enter your full name') as HTMLInputElement).value).toBe('Test Driver');
    });

    fireEvent.submit(screen.getByText('Continue').closest('form')!);
    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });
  });

  it('shows toast on submit error', async () => {
    mocks.mockFrom
      .mockReturnValueOnce(buildMockChain(FAKE_PROFILE))
      .mockReturnValue(buildMockChain(null, { message: 'DB error' }));

    render(<ProfileStep onNext={vi.fn()} />);
    await waitFor(() => {
      expect((screen.getByPlaceholderText('Enter your full name') as HTMLInputElement).value).toBe('Test Driver');
    });

    fireEvent.submit(screen.getByText('Continue').closest('form')!);
    await waitFor(() => {
      expect(mocks.mockToastError).toHaveBeenCalled();
    });
  });

  it('allows typing into form fields', () => {
    mocks.mockFrom.mockReturnValue(buildMockChain(null)); // no existing profile
    render(<ProfileStep onNext={vi.fn()} />);
    const nameInput = screen.getByPlaceholderText('Enter your full name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    expect(nameInput.value).toBe('New Name');
  });
});

/* ================================================================== */
/*  PreferencesStep                                                    */
/* ================================================================== */

describe('PreferencesStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockUser = { ...FAKE_USER };
    mocks.mockFrom.mockReturnValue(buildMockChain(null, null));
  });

  it('renders "Set Your Preferences" heading', () => {
    render(<PreferencesStep onNext={vi.fn()} />);
    expect(screen.getByText('Set Your Preferences')).toBeTruthy();
  });

  it('renders subtitle', () => {
    render(<PreferencesStep onNext={vi.fn()} />);
    expect(screen.getByText('Help us match you with compatible travelers')).toBeTruthy();
  });

  it('shows Smoking Policy options', () => {
    render(<PreferencesStep onNext={vi.fn()} />);
    expect(screen.getByText('No Smoking')).toBeTruthy();
    expect(screen.getByText('Outside Vehicle Only')).toBeTruthy();
    expect(screen.getByText('Smoking Allowed')).toBeTruthy();
  });

  it('defaults to "No Smoking" selected', () => {
    render(<PreferencesStep onNext={vi.fn()} />);
    const noSmokingRadio = screen.getByDisplayValue('no_smoking') as HTMLInputElement;
    expect(noSmokingRadio.checked).toBe(true);
  });

  it('shows Pets Allowed options', () => {
    render(<PreferencesStep onNext={vi.fn()} />);
    expect(screen.getByText('Pets Allowed')).toBeTruthy();
    expect(screen.getByText('Yes')).toBeTruthy();
    // "No" appears as both the pets option and part of "No Smoking" label
    expect(screen.getAllByText('No').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Music Preference select', () => {
    render(<PreferencesStep onNext={vi.fn()} />);
    expect(screen.getByText('No Music')).toBeTruthy();
    expect(screen.getByText('Quiet Background Music')).toBeTruthy();
    expect(screen.getByText('Flexible')).toBeTruthy();
    expect(screen.getByText('Upbeat Music')).toBeTruthy();
  });

  it('shows Conversation Level select', () => {
    render(<PreferencesStep onNext={vi.fn()} />);
    expect(screen.getByText('Prefer Quiet')).toBeTruthy();
    expect(screen.getByText('Moderate Chat')).toBeTruthy();
    expect(screen.getByText('Love to Chat')).toBeTruthy();
  });

  it('renders Continue button', () => {
    render(<PreferencesStep onNext={vi.fn()} />);
    expect(screen.getByText('Continue')).toBeTruthy();
  });

  it('calls onNext on successful submit', async () => {
    const spy = vi.fn();
    render(<PreferencesStep onNext={spy} />);
    fireEvent.submit(screen.getByText('Continue').closest('form')!);
    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });
  });

  it('shows toast on submit error', async () => {
    mocks.mockFrom.mockReturnValue(buildMockChain(null, { message: 'Error' }));
    render(<PreferencesStep onNext={vi.fn()} />);
    fireEvent.submit(screen.getByText('Continue').closest('form')!);
    await waitFor(() => {
      expect(mocks.mockToastError).toHaveBeenCalled();
    });
  });
});
