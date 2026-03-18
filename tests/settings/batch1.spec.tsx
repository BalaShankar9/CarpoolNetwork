/**
 * Settings module — Batch 1
 * AccountSettings (16 tests)
 * AppearanceSettings (12 tests)
 * ≈ 28 tests
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
    // AccountSettings icons
    User: stub('User'),
    Mail: stub('Mail'),
    Phone: stub('Phone'),
    Calendar: stub('Calendar'),
    MapPin: stub('MapPin'),
    Globe: stub('Globe'),
    Edit2: stub('Edit2'),
    Save: stub('Save'),
    X: stub('X'),
    CheckCircle: stub('CheckCircle'),
    AlertCircle: stub('AlertCircle'),
    // AppearanceSettings icons
    Sun: stub('Sun'),
    Moon: stub('Moon'),
    Monitor: stub('Monitor'),
    Type: stub('Type'),
    Ruler: stub('Ruler'),
    Thermometer: stub('Thermometer'),
    Clock: stub('Clock'),
    Map: stub('Map'),

    mockFrom: vi.fn(),
    mockProfile: null as any,
  };
});

/* ------------------------------------------------------------------ */
/*  Module mocks                                                       */
/* ------------------------------------------------------------------ */

vi.mock('lucide-react', () => ({
  User: mocks.User,
  Mail: mocks.Mail,
  Phone: mocks.Phone,
  Calendar: mocks.Calendar,
  MapPin: mocks.MapPin,
  Globe: mocks.Globe,
  Edit2: mocks.Edit2,
  Save: mocks.Save,
  X: mocks.X,
  CheckCircle: mocks.CheckCircle,
  AlertCircle: mocks.AlertCircle,
  Sun: mocks.Sun,
  Moon: mocks.Moon,
  Monitor: mocks.Monitor,
  Type: mocks.Type,
  Ruler: mocks.Ruler,
  Thermometer: mocks.Thermometer,
  Clock: mocks.Clock,
  Map: mocks.Map,
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

import AccountSettings from '../../src/components/settings/AccountSettings';
import AppearanceSettings from '../../src/components/settings/AppearanceSettings';
import {
  FAKE_PROFILE,
  FAKE_EMPTY_PROFILE,
  FAKE_APPEARANCE_PREFS,
  buildMockChain,
} from './helpers';

/* ------------------------------------------------------------------ */
/*  Setup / Teardown                                                   */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mockProfile = { ...FAKE_PROFILE };
  mocks.mockFrom.mockReturnValue(buildMockChain([FAKE_APPEARANCE_PREFS]));

  // matchMedia stub (used by AppearanceSettings for auto theme)
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(cleanup);

/* ================================================================== */
/*  AccountSettings                                                    */
/* ================================================================== */

describe('AccountSettings', () => {
  it('renders Personal Information heading', () => {
    render(<AccountSettings />);
    expect(screen.getByText('Personal Information')).toBeTruthy();
  });

  it('shows full name from profile', () => {
    render(<AccountSettings />);
    expect(screen.getByText('Jane Settings')).toBeTruthy();
  });

  it('shows email address from profile', () => {
    render(<AccountSettings />);
    expect(screen.getByText('jane@settings.test')).toBeTruthy();
  });

  it('shows phone number from profile', () => {
    render(<AccountSettings />);
    expect(screen.getByText('+447123456789')).toBeTruthy();
  });

  it('shows Account Information section', () => {
    render(<AccountSettings />);
    expect(screen.getByText('Account Information')).toBeTruthy();
    expect(screen.getByText('Account ID')).toBeTruthy();
  });

  it('shows Member Since label', () => {
    render(<AccountSettings />);
    expect(screen.getByText('Member Since')).toBeTruthy();
  });

  it('shows Email Verified as Yes when verified', () => {
    render(<AccountSettings />);
    expect(screen.getByText('Email Verified')).toBeTruthy();
    expect(screen.getByText('Yes')).toBeTruthy();
  });

  it('shows Email Verified as No when not verified', () => {
    mocks.mockProfile = { ...FAKE_PROFILE, email_verified: false };
    render(<AccountSettings />);
    expect(screen.getByText('No')).toBeTruthy();
  });

  it('shows profile completion percentage', () => {
    render(<AccountSettings />);
    expect(screen.getByText('85%')).toBeTruthy();
  });

  it('shows Edit button in view mode', () => {
    render(<AccountSettings />);
    expect(screen.getByText('Edit')).toBeTruthy();
  });

  it('clicking Edit shows Cancel and Save buttons', () => {
    render(<AccountSettings />);
    fireEvent.click(screen.getByText('Edit'));
    expect(screen.getByText('Cancel')).toBeTruthy();
    expect(screen.getByText('Save')).toBeTruthy();
  });

  it('clicking Cancel returns to view mode', () => {
    render(<AccountSettings />);
    fireEvent.click(screen.getByText('Edit'));
    expect(screen.queryByText('Edit')).toBeNull();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.getByText('Edit')).toBeTruthy();
  });

  it('shows "Not set" for empty profile fields', () => {
    mocks.mockProfile = { ...FAKE_EMPTY_PROFILE };
    render(<AccountSettings />);
    const notSetItems = screen.getAllByText('Not set');
    expect(notSetItems.length).toBeGreaterThanOrEqual(5);
  });

  it('shows email cannot be changed note', () => {
    render(<AccountSettings />);
    expect(screen.getByText(/Email cannot be changed here/)).toBeTruthy();
  });

  it('validates empty full name on save', async () => {
    render(<AccountSettings />);
    fireEvent.click(screen.getByText('Edit'));

    const nameInput = screen.getByDisplayValue('Jane Settings');
    fireEvent.change(nameInput, { target: { value: '' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Full name is required.')).toBeTruthy();
    });
  });

  it('successful save shows success message', async () => {
    render(<AccountSettings />);
    fireEvent.click(screen.getByText('Edit'));
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Account settings updated successfully')).toBeTruthy();
    });
  });

  it('failed save shows error message', async () => {
    mocks.mockFrom.mockReturnValue(buildMockChain([], { message: 'Database error' }));
    render(<AccountSettings />);
    fireEvent.click(screen.getByText('Edit'));
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Database error')).toBeTruthy();
    });
  });
});

/* ================================================================== */
/*  AppearanceSettings                                                 */
/* ================================================================== */

describe('AppearanceSettings', () => {
  it('shows loading spinner when profile is not available', () => {
    mocks.mockProfile = null;
    const { container } = render(<AppearanceSettings />);
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('renders Theme section after data loads', async () => {
    await act(async () => { render(<AppearanceSettings />); });
    expect(screen.getByText('Theme')).toBeTruthy();
  });

  it('shows Light, Dark, Auto theme buttons', async () => {
    await act(async () => { render(<AppearanceSettings />); });
    expect(screen.getByText('Light')).toBeTruthy();
    expect(screen.getByText('Dark')).toBeTruthy();
    expect(screen.getByText('Auto')).toBeTruthy();
  });

  it('renders Display section', async () => {
    await act(async () => { render(<AppearanceSettings />); });
    expect(screen.getByText('Display')).toBeTruthy();
  });

  it('shows font size options', async () => {
    await act(async () => { render(<AppearanceSettings />); });
    expect(screen.getByText('small')).toBeTruthy();
    expect(screen.getByText('medium')).toBeTruthy();
    expect(screen.getByText('large')).toBeTruthy();
  });

  it('shows distance unit options', async () => {
    await act(async () => { render(<AppearanceSettings />); });
    expect(screen.getByText('Kilometers (km)')).toBeTruthy();
    expect(screen.getByText('Miles (mi)')).toBeTruthy();
  });

  it('shows temperature unit options', async () => {
    await act(async () => { render(<AppearanceSettings />); });
    expect(screen.getByText(/Celsius/)).toBeTruthy();
    expect(screen.getByText(/Fahrenheit/)).toBeTruthy();
  });

  it('shows time format options', async () => {
    await act(async () => { render(<AppearanceSettings />); });
    expect(screen.getByText(/12-hour/)).toBeTruthy();
    expect(screen.getByText(/24-hour/)).toBeTruthy();
  });

  it('shows date format options', async () => {
    await act(async () => { render(<AppearanceSettings />); });
    expect(screen.getByText('DD/MM/YYYY')).toBeTruthy();
    expect(screen.getByText('MM/DD/YYYY')).toBeTruthy();
    expect(screen.getByText('YYYY/MM/DD')).toBeTruthy();
  });

  it('renders Map Style section', async () => {
    await act(async () => { render(<AppearanceSettings />); });
    expect(screen.getByText('Map Style')).toBeTruthy();
    expect(screen.getByText('standard')).toBeTruthy();
    expect(screen.getByText('satellite')).toBeTruthy();
    expect(screen.getByText('terrain')).toBeTruthy();
  });

  it('renders Reduce Motion toggle', async () => {
    await act(async () => { render(<AppearanceSettings />); });
    expect(screen.getByRole('switch', { name: 'Reduce Motion' })).toBeTruthy();
  });

  it('renders High Contrast toggle', async () => {
    await act(async () => { render(<AppearanceSettings />); });
    expect(screen.getByRole('switch', { name: 'High Contrast' })).toBeTruthy();
  });
});
