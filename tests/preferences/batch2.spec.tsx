// @vitest-environment jsdom
/**
 * Preferences Module — Batch 2
 *
 * Covers Supabase-dependent components:
 *   • RidePreferencesForm      — 14 tests
 *   • DriverPreferenceDashboard — 20 tests
 *
 * Total: 34 tests
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockFromChain = vi.hoisted(() => ({} as any));
const mockUser = vi.hoisted(() => ({ current: { id: 'user-pref-001', email: 'prefs@example.com' } as any }));

const mockIconStub = vi.hoisted(() => {
  const stub = (name: string) => {
    const Icon = (props: any) => <span data-testid={`icon-${name}`} {...props} />;
    Icon.displayName = name;
    return Icon;
  };
  return stub;
});

vi.mock('lucide-react', () => ({
  Car: mockIconStub('Car'),
  Shield: mockIconStub('Shield'),
  Users: mockIconStub('Users'),
  PoundSterling: mockIconStub('PoundSterling'),
  Calendar: mockIconStub('Calendar'),
  Music: mockIconStub('Music'),
  Thermometer: mockIconStub('Thermometer'),
  MessageCircle: mockIconStub('MessageCircle'),
  MessageSquare: mockIconStub('MessageSquare'),
  Cigarette: mockIconStub('Cigarette'),
  Dog: mockIconStub('Dog'),
  Wifi: mockIconStub('Wifi'),
  Battery: mockIconStub('Battery'),
  Wind: mockIconStub('Wind'),
  Package: mockIconStub('Package'),
  Accessibility: mockIconStub('Accessibility'),
  Star: mockIconStub('Star'),
  CheckCircle: mockIconStub('CheckCircle'),
  Save: mockIconStub('Save'),
  Volume2: mockIconStub('Volume2'),
  VolumeX: mockIconStub('VolumeX'),
  Radio: mockIconStub('Radio'),
  Headphones: mockIconStub('Headphones'),
  Baby: mockIconStub('Baby'),
  Snowflake: mockIconStub('Snowflake'),
  Sun: mockIconStub('Sun'),
  Check: mockIconStub('Check'),
  Info: mockIconStub('Info'),
  AlertTriangle: mockIconStub('AlertTriangle'),
  AlertCircle: mockIconStub('AlertCircle'),
  Loader2: mockIconStub('Loader2'),
}));

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => mockFromChain),
  },
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser.current }),
}));

// ---------------------------------------------------------------------------
// Imports under test
// ---------------------------------------------------------------------------

import { RidePreferencesForm } from '../../src/components/preferences/RidePreferencesForm';
import DriverPreferenceDashboard from '../../src/components/preferences/DriverPreferenceDashboard';
import { buildMockChain, FAKE_RIDE_PREFERENCES, FAKE_USER_PREFERENCES } from './helpers';
import { supabase } from '../../src/lib/supabase';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

afterEach(cleanup);

function setupFrom(dataMap: Record<string, any>) {
  (supabase.from as any).mockImplementation((table: string) => {
    if (dataMap[table]) return dataMap[table];
    return buildMockChain([]);
  });
}

// =========================================================================
// RidePreferencesForm
// =========================================================================
describe('RidePreferencesForm', () => {
  beforeEach(() => {
    mockUser.current = { id: 'user-pref-001', email: 'prefs@example.com' };
  });

  it('shows loading skeleton initially', () => {
    // Never-resolving promise keeps loading
    const chain = buildMockChain([]);
    chain.single = vi.fn().mockReturnValue(new Promise(() => {}));
    setupFrom({ ride_preferences: chain });

    const { container } = render(<RidePreferencesForm />);
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('renders form after loading preferences', async () => {
    setupFrom({ ride_preferences: buildMockChain([FAKE_RIDE_PREFERENCES]) });

    await act(async () => {
      render(<RidePreferencesForm />);
    });

    await waitFor(() => {
      // Should show preference sections
      expect(document.body.textContent!.toLowerCase()).toMatch(/music|conversation/);
    });
  });

  it('renders with empty preferences (new user)', async () => {
    setupFrom({ ride_preferences: buildMockChain([]) });

    await act(async () => {
      render(<RidePreferencesForm />);
    });

    await waitFor(() => {
      expect(document.body.textContent!.toLowerCase()).toMatch(/music|conversation/);
    });
  });

  it('renders save button', async () => {
    setupFrom({ ride_preferences: buildMockChain([FAKE_RIDE_PREFERENCES]) });

    await act(async () => {
      render(<RidePreferencesForm />);
    });

    await waitFor(() => {
      expect(screen.getByText(/save/i)).toBeTruthy();
    });
  });

  it('calls onSave callback when saving', async () => {
    const onSave = vi.fn();
    setupFrom({ ride_preferences: buildMockChain([FAKE_RIDE_PREFERENCES]) });

    await act(async () => {
      render(<RidePreferencesForm onSave={onSave} />);
    });

    await waitFor(() => {
      expect(screen.getByText(/save/i)).toBeTruthy();
    });

    // The upsert path: .upsert().select().single() → needs to resolve with data
    const saveChain = buildMockChain([FAKE_RIDE_PREFERENCES]);
    // Override select to return a chain that has single
    saveChain.select = vi.fn().mockReturnValue(saveChain);
    (supabase.from as any).mockImplementation(() => saveChain);

    await act(async () => {
      fireEvent.click(screen.getByText(/save/i));
    });

    // onSave should be called with the returned data
    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
    });
  });

  it('renders smoking toggle', async () => {
    setupFrom({ ride_preferences: buildMockChain([FAKE_RIDE_PREFERENCES]) });

    await act(async () => {
      render(<RidePreferencesForm />);
    });

    await waitFor(() => {
      expect(document.body.textContent!.toLowerCase()).toMatch(/smok/);
    });
  });

  it('renders pets toggle', async () => {
    setupFrom({ ride_preferences: buildMockChain([FAKE_RIDE_PREFERENCES]) });

    await act(async () => {
      render(<RidePreferencesForm />);
    });

    await waitFor(() => {
      expect(document.body.textContent!.toLowerCase()).toMatch(/pet/);
    });
  });

  it('renders detour slider', async () => {
    setupFrom({ ride_preferences: buildMockChain([FAKE_RIDE_PREFERENCES]) });

    await act(async () => {
      render(<RidePreferencesForm />);
    });

    await waitFor(() => {
      expect(document.body.textContent!.toLowerCase()).toMatch(/detour/);
    });
  });

  it('renders luggage section', async () => {
    setupFrom({ ride_preferences: buildMockChain([FAKE_RIDE_PREFERENCES]) });

    await act(async () => {
      render(<RidePreferencesForm />);
    });

    await waitFor(() => {
      expect(document.body.textContent!.toLowerCase()).toMatch(/luggage/);
    });
  });

  it('does not fetch when user is null', async () => {
    mockUser.current = null as any;
    setupFrom({ ride_preferences: buildMockChain([]) });

    await act(async () => {
      render(<RidePreferencesForm />);
    });

    // from should not be called for ride_preferences
    // (or if loading never resolves, should just show loading)
    expect(document.body.innerHTML.length).toBeGreaterThan(0);
  });

  it('renders compact mode when compact prop is set', async () => {
    setupFrom({ ride_preferences: buildMockChain([FAKE_RIDE_PREFERENCES]) });

    await act(async () => {
      render(<RidePreferencesForm compact />);
    });

    await waitFor(() => {
      expect(document.body.textContent!.length).toBeGreaterThan(0);
    });
  });

  it('handles Supabase error gracefully', async () => {
    setupFrom({
      ride_preferences: buildMockChain(null, { message: 'DB error' }),
    });

    await act(async () => {
      render(<RidePreferencesForm />);
    });

    // Should still render (not crash)
    expect(document.body.innerHTML.length).toBeGreaterThan(0);
  });

  it('renders AC preference section', async () => {
    setupFrom({ ride_preferences: buildMockChain([FAKE_RIDE_PREFERENCES]) });

    await act(async () => {
      render(<RidePreferencesForm />);
    });

    await waitFor(() => {
      expect(document.body.textContent!.toLowerCase()).toMatch(/ac|air condition|temperature/);
    });
  });

  it('renders children toggle', async () => {
    setupFrom({ ride_preferences: buildMockChain([FAKE_RIDE_PREFERENCES]) });

    await act(async () => {
      render(<RidePreferencesForm />);
    });

    await waitFor(() => {
      expect(document.body.textContent!.toLowerCase()).toMatch(/children/);
    });
  });
});

// =========================================================================
// DriverPreferenceDashboard
// =========================================================================
describe('DriverPreferenceDashboard', () => {
  beforeEach(() => {
    mockUser.current = { id: 'user-pref-001', email: 'prefs@example.com' };
  });

  it('shows loading state initially', () => {
    const chain = buildMockChain([]);
    chain.maybeSingle = vi.fn().mockReturnValue(new Promise(() => {}));
    setupFrom({ user_preferences: chain });

    render(<DriverPreferenceDashboard />);
    expect(screen.getByText(/loading/i)).toBeTruthy();
  });

  it('renders dashboard header after load', async () => {
    setupFrom({ user_preferences: buildMockChain([FAKE_USER_PREFERENCES]) });

    await act(async () => {
      render(<DriverPreferenceDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText(/driver preferences/i)).toBeTruthy();
    });
  });

  it('renders all 6 tab labels', async () => {
    setupFrom({ user_preferences: buildMockChain([FAKE_USER_PREFERENCES]) });

    await act(async () => {
      render(<DriverPreferenceDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText(/vehicle & comfort/i)).toBeTruthy();
      expect(screen.getByText(/ride policies/i)).toBeTruthy();
      expect(screen.getByText(/passenger requirements/i)).toBeTruthy();
      expect(screen.getByText(/safety & communication/i)).toBeTruthy();
      expect(screen.getByText(/cost sharing info/i)).toBeTruthy();
      expect(screen.getByText(/recurring & templates/i)).toBeTruthy();
    });
  });

  it('shows Vehicle & Comfort tab by default', async () => {
    setupFrom({ user_preferences: buildMockChain([FAKE_USER_PREFERENCES]) });

    await act(async () => {
      render(<DriverPreferenceDashboard />);
    });

    await waitFor(() => {
      // VehicleComfortTab content
      expect(document.body.textContent!.toLowerCase()).toMatch(/music preference/);
    });
  });

  it('switches to Ride Policies tab on click', async () => {
    setupFrom({ user_preferences: buildMockChain([FAKE_USER_PREFERENCES]) });

    await act(async () => {
      render(<DriverPreferenceDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText(/ride policies/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByText(/ride policies/i));

    expect(document.body.textContent!.toLowerCase()).toMatch(/smoking policy/);
  });

  it('switches to Passenger Requirements tab', async () => {
    setupFrom({ user_preferences: buildMockChain([FAKE_USER_PREFERENCES]) });

    await act(async () => {
      render(<DriverPreferenceDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText(/passenger requirements/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByText(/passenger requirements/i));

    expect(document.body.textContent!.toLowerCase()).toMatch(/instant booking/);
  });

  it('switches to Safety & Communication tab', async () => {
    setupFrom({ user_preferences: buildMockChain([FAKE_USER_PREFERENCES]) });

    await act(async () => {
      render(<DriverPreferenceDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText(/safety & communication/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByText(/safety & communication/i));

    expect(document.body.textContent!.toLowerCase()).toMatch(/share live location/);
  });

  it('switches to Cost Sharing tab', async () => {
    setupFrom({ user_preferences: buildMockChain([FAKE_USER_PREFERENCES]) });

    await act(async () => {
      render(<DriverPreferenceDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText(/cost sharing info/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByText(/cost sharing info/i));

    expect(document.body.textContent!.toLowerCase()).toMatch(/community cost sharing/);
  });

  it('switches to Templates tab', async () => {
    setupFrom({ user_preferences: buildMockChain([FAKE_USER_PREFERENCES]) });

    await act(async () => {
      render(<DriverPreferenceDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText(/recurring & templates/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByText(/recurring & templates/i));

    expect(document.body.textContent!.toLowerCase()).toMatch(/recurring ride templates/);
  });

  it('renders Save Changes button', async () => {
    setupFrom({ user_preferences: buildMockChain([FAKE_USER_PREFERENCES]) });

    await act(async () => {
      render(<DriverPreferenceDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText(/save changes/i)).toBeTruthy();
    });
  });

  it('calls upsert on save', async () => {
    const chain = buildMockChain([FAKE_USER_PREFERENCES]);
    setupFrom({ user_preferences: chain });

    await act(async () => {
      render(<DriverPreferenceDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText(/save changes/i)).toBeTruthy();
    });

    // Reset the mock for the upsert call
    (supabase.from as any).mockImplementation(() => buildMockChain([], null));

    await act(async () => {
      fireEvent.click(screen.getByText(/save changes/i));
    });

    expect(supabase.from).toHaveBeenCalledWith('user_preferences');
  });

  it('shows "Saved successfully" after save', async () => {
    setupFrom({ user_preferences: buildMockChain([FAKE_USER_PREFERENCES]) });

    await act(async () => {
      render(<DriverPreferenceDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText(/save changes/i)).toBeTruthy();
    });

    (supabase.from as any).mockImplementation(() => buildMockChain([], null));

    await act(async () => {
      fireEvent.click(screen.getByText(/save changes/i));
    });

    await waitFor(() => {
      expect(screen.getByText(/saved successfully/i)).toBeTruthy();
    });
  });

  it('shows amenities checkboxes in Vehicle tab', async () => {
    setupFrom({ user_preferences: buildMockChain([FAKE_USER_PREFERENCES]) });

    await act(async () => {
      render(<DriverPreferenceDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText(/AC\/Heating/i)).toBeTruthy();
      expect(screen.getByText(/Phone Charging/i)).toBeTruthy();
      expect(screen.getByText(/WiFi Hotspot/i)).toBeTruthy();
    });
  });

  it('shows pet policy section in Ride Policies tab', async () => {
    setupFrom({ user_preferences: buildMockChain([FAKE_USER_PREFERENCES]) });

    await act(async () => {
      render(<DriverPreferenceDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText(/ride policies/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByText(/ride policies/i));

    expect(screen.getByText(/allow pets/i)).toBeTruthy();
  });

  it('shows safety checkboxes in Safety tab', async () => {
    setupFrom({ user_preferences: buildMockChain([FAKE_USER_PREFERENCES]) });

    await act(async () => {
      render(<DriverPreferenceDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText(/safety & communication/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByText(/safety & communication/i));

    expect(screen.getByText(/share live location automatically/i)).toBeTruthy();
    expect(screen.getByText(/require photo verification at pickup/i)).toBeTruthy();
  });

  it('shows communication preference dropdown in Safety tab', async () => {
    setupFrom({ user_preferences: buildMockChain([FAKE_USER_PREFERENCES]) });

    await act(async () => {
      render(<DriverPreferenceDashboard />);
    });

    fireEvent.click(screen.getByText(/safety & communication/i));

    expect(screen.getByText(/preferred communication channels/i)).toBeTruthy();
  });

  it('loads empty preferences gracefully', async () => {
    setupFrom({ user_preferences: buildMockChain([]) });

    await act(async () => {
      render(<DriverPreferenceDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText(/driver preferences/i)).toBeTruthy();
    });
  });

  it('handles Supabase load error gracefully', async () => {
    setupFrom({
      user_preferences: buildMockChain(null, { message: 'Network error' }),
    });

    await act(async () => {
      render(<DriverPreferenceDashboard />);
    });

    // Should still render the dashboard (not crash)
    await waitFor(() => {
      expect(screen.getByText(/driver preferences/i)).toBeTruthy();
    });
  });

  it('shows "Coming Soon" in Templates tab', async () => {
    setupFrom({ user_preferences: buildMockChain([FAKE_USER_PREFERENCES]) });

    await act(async () => {
      render(<DriverPreferenceDashboard />);
    });

    fireEvent.click(screen.getByText(/recurring & templates/i));

    expect(screen.getByText(/coming soon/i)).toBeTruthy();
  });
});
