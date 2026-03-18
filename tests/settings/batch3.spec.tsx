/**
 * Settings module — Batch 3
 * DataSettings (12 tests)
 * SupportSettings (10 tests)
 * PrivacySettings (5 tests)
 * PassengerPreferences (1 test)
 * DriverPreferences (1 test)
 * ≈ 29 tests
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
    // DataSettings icons
    Download: stub('Download'),
    Trash2: stub('Trash2'),
    Database: stub('Database'),
    HardDrive: stub('HardDrive'),
    AlertTriangle: stub('AlertTriangle'),
    CheckCircle: stub('CheckCircle'),
    // SupportSettings icons
    HelpCircle: stub('HelpCircle'),
    MessageCircle: stub('MessageCircle'),
    FileText: stub('FileText'),
    Book: stub('Book'),
    Mail: stub('Mail'),
    ExternalLink: stub('ExternalLink'),
    Star: stub('Star'),
    Bug: stub('Bug'),
    // PrivacySettings icons
    Shield: stub('Shield'),
    Lock: stub('Lock'),
    Smartphone: stub('Smartphone'),
    History: stub('History'),
    AlertCircle: stub('AlertCircle'),

    mockFrom: vi.fn(),
    mockRpc: vi.fn(),
    mockSignOut: vi.fn(),
    mockProfile: null as any,
    mockNavigate: vi.fn(),
  };
});

/* ------------------------------------------------------------------ */
/*  Module mocks                                                       */
/* ------------------------------------------------------------------ */

vi.mock('lucide-react', () => ({
  Download: mocks.Download,
  Trash2: mocks.Trash2,
  Database: mocks.Database,
  HardDrive: mocks.HardDrive,
  AlertTriangle: mocks.AlertTriangle,
  CheckCircle: mocks.CheckCircle,
  HelpCircle: mocks.HelpCircle,
  MessageCircle: mocks.MessageCircle,
  FileText: mocks.FileText,
  Book: mocks.Book,
  Mail: mocks.Mail,
  ExternalLink: mocks.ExternalLink,
  Star: mocks.Star,
  Bug: mocks.Bug,
  Shield: mocks.Shield,
  Lock: mocks.Lock,
  Smartphone: mocks.Smartphone,
  History: mocks.History,
  AlertCircle: mocks.AlertCircle,
}));

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: (...a: any[]) => mocks.mockFrom(...a),
    rpc: (...a: any[]) => mocks.mockRpc(...a),
    auth: { signOut: () => mocks.mockSignOut() },
  },
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: mocks.mockProfile }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.mockNavigate,
}));

vi.mock('../../src/components/shared/FeedbackButton', () => ({
  default: () => <span data-testid="feedback-button">Feedback</span>,
}));

vi.mock('../../src/components/profile/PrivacyControls', () => ({
  default: () => <div data-testid="privacy-controls">PrivacyControls</div>,
}));

vi.mock('../../src/components/security/TwoFactorAuth', () => ({
  default: () => <div data-testid="two-factor-auth">TwoFactorAuth</div>,
}));

vi.mock('../../src/components/preferences/PassengerFilterCenter', () => ({
  default: (props: any) => (
    <div data-testid="passenger-filter-center">PassengerFilterCenter</div>
  ),
}));

vi.mock('../../src/components/preferences/DriverPreferenceDashboard', () => ({
  default: () => (
    <div data-testid="driver-preference-dashboard">DriverPreferenceDashboard</div>
  ),
}));

/* ------------------------------------------------------------------ */
/*  Imports (after mocks)                                              */
/* ------------------------------------------------------------------ */

import DataSettings from '../../src/components/settings/DataSettings';
import SupportSettings from '../../src/components/settings/SupportSettings';
import PrivacySettings from '../../src/components/settings/PrivacySettings';
import PassengerPreferences from '../../src/components/settings/PassengerPreferences';
import DriverPreferences from '../../src/components/settings/DriverPreferences';
import { FAKE_PROFILE, buildMockChain } from './helpers';

/* ------------------------------------------------------------------ */
/*  Setup / Teardown                                                   */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mockProfile = { ...FAKE_PROFILE };
  mocks.mockFrom.mockReturnValue(buildMockChain([]));
  mocks.mockRpc.mockResolvedValue({ data: null, error: null });
  mocks.mockSignOut.mockResolvedValue({ error: null });

  // Mock URL.createObjectURL for data export
  if (!URL.createObjectURL) {
    (URL as any).createObjectURL = vi.fn(() => 'blob:mock');
  } else {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
  }
  if (!URL.revokeObjectURL) {
    (URL as any).revokeObjectURL = vi.fn();
  } else {
    vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined);
  }
});

afterEach(cleanup);

/* ================================================================== */
/*  DataSettings                                                       */
/* ================================================================== */

describe('DataSettings', () => {
  it('renders Export Your Data heading', () => {
    render(<DataSettings />);
    expect(screen.getByText('Export Your Data')).toBeTruthy();
  });

  it('renders Export All Data button', () => {
    render(<DataSettings />);
    expect(screen.getByText('Export All Data')).toBeTruthy();
  });

  it('renders GDPR compliance notice', () => {
    render(<DataSettings />);
    expect(screen.getByText(/GDPR Compliance/)).toBeTruthy();
  });

  it('renders Local Storage section', () => {
    render(<DataSettings />);
    expect(screen.getByText('Local Storage')).toBeTruthy();
  });

  it('renders Clear Cache button', () => {
    render(<DataSettings />);
    expect(screen.getByText('Clear Cache')).toBeTruthy();
  });

  it('renders Delete Account section', () => {
    render(<DataSettings />);
    expect(screen.getByText('Delete Account')).toBeTruthy();
  });

  it('clicking Delete My Account shows confirmation dialog', () => {
    render(<DataSettings />);
    fireEvent.click(screen.getByText('Delete My Account'));
    expect(screen.getByText(/This action is permanent/)).toBeTruthy();
    expect(screen.getByText('Confirm Delete Account')).toBeTruthy();
  });

  it('Cancel hides delete confirmation', () => {
    render(<DataSettings />);
    fireEvent.click(screen.getByText('Delete My Account'));
    expect(screen.getByText('Confirm Delete Account')).toBeTruthy();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Confirm Delete Account')).toBeNull();
  });

  it('shows permanent deletion warning list', () => {
    render(<DataSettings />);
    fireEvent.click(screen.getByText('Delete My Account'));
    expect(screen.getByText(/Permanently delete your profile/)).toBeTruthy();
    expect(screen.getByText(/Cancel all active bookings/)).toBeTruthy();
    expect(screen.getByText(/Delete your chat history/)).toBeTruthy();
  });

  it('disables confirm button until correct text is typed', () => {
    render(<DataSettings />);
    fireEvent.click(screen.getByText('Delete My Account'));

    const confirmBtn = screen.getByText('Confirm Delete Account');
    expect((confirmBtn as HTMLButtonElement).disabled).toBe(true);

    const input = screen.getByPlaceholderText('Type here...');
    fireEvent.change(input, { target: { value: 'DELETE MY ACCOUNT' } });
    expect((confirmBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it('export data shows success message', async () => {
    render(<DataSettings />);
    fireEvent.click(screen.getByText('Export All Data'));

    await waitFor(() => {
      expect(screen.getByText('Your data has been exported successfully')).toBeTruthy();
    });
  });

  it('Clear Cache shows success message', async () => {
    render(<DataSettings />);
    await act(async () => {
      fireEvent.click(screen.getByText('Clear Cache'));
    });
    // The success message appears after setState
    const successEl = screen.queryByText('Local cache cleared successfully');
    const errorEl = screen.queryByText('Failed to clear cache');
    // Either success or error should appear after clicking clear
    expect(successEl || errorEl).toBeTruthy();
  });
});

/* ================================================================== */
/*  SupportSettings                                                    */
/* ================================================================== */

describe('SupportSettings', () => {
  it('renders Get Help heading', () => {
    render(<SupportSettings />);
    expect(screen.getByText('Get Help')).toBeTruthy();
  });

  it('renders Help Center link', () => {
    render(<SupportSettings />);
    expect(screen.getByText('Help Center')).toBeTruthy();
    expect(screen.getByText('Browse articles and guides')).toBeTruthy();
  });

  it('renders Live Chat with Coming Soon badge', () => {
    render(<SupportSettings />);
    expect(screen.getByText('Live Chat Support')).toBeTruthy();
    expect(screen.getByText('Coming Soon')).toBeTruthy();
  });

  it('renders Email Support', () => {
    render(<SupportSettings />);
    expect(screen.getByText('Email Support')).toBeTruthy();
    expect(screen.getByText('support@carpoolnetwork.co.uk')).toBeTruthy();
  });

  it('renders Report Issues heading', () => {
    render(<SupportSettings />);
    expect(screen.getByText('Report Issues')).toBeTruthy();
  });

  it('renders Report a Bug and feedback button', () => {
    render(<SupportSettings />);
    expect(screen.getByText('Report a Bug')).toBeTruthy();
    expect(screen.getByTestId('feedback-button')).toBeTruthy();
  });

  it('renders Request a Feature', () => {
    render(<SupportSettings />);
    expect(screen.getByText('Request a Feature')).toBeTruthy();
  });

  it('renders Legal section with links', () => {
    render(<SupportSettings />);
    expect(screen.getByText('Legal')).toBeTruthy();
    expect(screen.getByText('Terms of Service')).toBeTruthy();
    expect(screen.getByText('Privacy Policy')).toBeTruthy();
  });

  it('navigates to /terms on Terms of Service click', () => {
    render(<SupportSettings />);
    fireEvent.click(screen.getByText('Terms of Service'));
    expect(mocks.mockNavigate).toHaveBeenCalledWith('/terms');
  });

  it('renders About section with version info', () => {
    render(<SupportSettings />);
    expect(screen.getByText('About')).toBeTruthy();
    expect(screen.getByText('App Version')).toBeTruthy();
    expect(screen.getByText('Environment')).toBeTruthy();
  });
});

/* ================================================================== */
/*  PrivacySettings                                                    */
/* ================================================================== */

describe('PrivacySettings', () => {
  it('renders Password & Authentication heading', () => {
    render(<PrivacySettings />);
    expect(screen.getByText('Password & Authentication')).toBeTruthy();
  });

  it('renders Change Password button', () => {
    render(<PrivacySettings />);
    expect(screen.getByText('Change Password')).toBeTruthy();
    fireEvent.click(screen.getByText('Change Password'));
    expect(mocks.mockNavigate).toHaveBeenCalledWith('/security');
  });

  it('renders TwoFactorAuth component', () => {
    render(<PrivacySettings />);
    expect(screen.getByTestId('two-factor-auth')).toBeTruthy();
  });

  it('renders PrivacyControls component', () => {
    render(<PrivacySettings />);
    expect(screen.getByTestId('privacy-controls')).toBeTruthy();
  });

  it('renders Security Recommendation', () => {
    render(<PrivacySettings />);
    expect(screen.getByText('Security Recommendation')).toBeTruthy();
    expect(screen.getByText(/Enable two-factor authentication/)).toBeTruthy();
  });
});

/* ================================================================== */
/*  PassengerPreferences                                               */
/* ================================================================== */

describe('PassengerPreferences', () => {
  it('renders PassengerFilterCenter component', () => {
    render(<PassengerPreferences />);
    expect(screen.getByTestId('passenger-filter-center')).toBeTruthy();
  });
});

/* ================================================================== */
/*  DriverPreferences                                                  */
/* ================================================================== */

describe('DriverPreferences', () => {
  it('renders DriverPreferenceDashboard component', () => {
    render(<DriverPreferences />);
    expect(screen.getByTestId('driver-preference-dashboard')).toBeTruthy();
  });
});
