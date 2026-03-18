/**
 * Onboarding module — Batch 2
 * VehicleStep             (12 tests)
 * PhoneVerificationStep   (15 tests)
 * ≈ 27 tests
 */
// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { FAKE_USER, FAKE_DEFAULT_COUNTRY, FAKE_COUNTRIES, buildMockChain } from './helpers';

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
    // VehicleStep icons
    Car: stub('Car'),
    ArrowRight: stub('ArrowRight'),
    SkipForward: stub('SkipForward'),
    // PhoneVerificationStep icons
    Phone: stub('Phone'),
    ChevronDown: stub('ChevronDown'),
    Loader2: stub('Loader2'),
    Search: stub('Search'),
    CheckCircle: stub('CheckCircle'),
    XCircle: stub('XCircle'),

    // Supabase
    mockFrom: vi.fn(),
    mockAuth: {
      updateUser: vi.fn(),
      verifyOtp: vi.fn(),
    },

    // Auth
    mockUser: null as any,

    // Toast
    mockToastError: vi.fn(),

    // Phone normalization
    mockNormalizePhone: vi.fn(),
  };
});

/* ------------------------------------------------------------------ */
/*  Module mocks                                                       */
/* ------------------------------------------------------------------ */

vi.mock('lucide-react', () => ({
  Car: mocks.Car,
  ArrowRight: mocks.ArrowRight,
  SkipForward: mocks.SkipForward,
  Phone: mocks.Phone,
  ChevronDown: mocks.ChevronDown,
  Loader2: mocks.Loader2,
  Search: mocks.Search,
  CheckCircle: mocks.CheckCircle,
  XCircle: mocks.XCircle,
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

vi.mock('../../src/data/countryCodes', () => ({
  countryCodes: [
    { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
    { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸' },
  ],
  defaultCountry: { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
}));

vi.mock('../../src/utils/phone', () => ({
  normalizePhoneNumber: (...a: any[]) => mocks.mockNormalizePhone(...a),
}));

/* ------------------------------------------------------------------ */
/*  Imports AFTER mocks                                                */
/* ------------------------------------------------------------------ */

import VehicleStep from '../../src/components/onboarding/VehicleStep';
import PhoneVerificationStep from '../../src/components/onboarding/PhoneVerificationStep';

afterEach(cleanup);

/* ================================================================== */
/*  VehicleStep                                                        */
/* ================================================================== */

describe('VehicleStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockUser = { ...FAKE_USER };
    mocks.mockFrom.mockReturnValue(buildMockChain(null, null));
  });

  it('renders "Add Your Vehicle" heading', () => {
    render(<VehicleStep onNext={vi.fn()} onSkipStep={vi.fn()} />);
    expect(screen.getByText('Add Your Vehicle')).toBeTruthy();
  });

  it('renders subtitle about optional vehicle', () => {
    render(<VehicleStep onNext={vi.fn()} onSkipStep={vi.fn()} />);
    expect(screen.getByText(/optional.*add your vehicle to offer rides/i)).toBeTruthy();
  });

  it('shows Make input', () => {
    render(<VehicleStep onNext={vi.fn()} onSkipStep={vi.fn()} />);
    expect(screen.getByPlaceholderText('Toyota')).toBeTruthy();
  });

  it('shows Model input', () => {
    render(<VehicleStep onNext={vi.fn()} onSkipStep={vi.fn()} />);
    expect(screen.getByPlaceholderText('Corolla')).toBeTruthy();
  });

  it('shows Color input', () => {
    render(<VehicleStep onNext={vi.fn()} onSkipStep={vi.fn()} />);
    expect(screen.getByPlaceholderText('Silver')).toBeTruthy();
  });

  it('shows Available Seats select with options', () => {
    render(<VehicleStep onNext={vi.fn()} onSkipStep={vi.fn()} />);
    expect(screen.getByText('Available Seats')).toBeTruthy();
    expect(screen.getByText('4 seats')).toBeTruthy();
  });

  it('shows info note about adding details later', () => {
    render(<VehicleStep onNext={vi.fn()} onSkipStep={vi.fn()} />);
    expect(screen.getByText(/add more details and upload registration documents later/i)).toBeTruthy();
  });

  it('renders "Skip for Now" button', () => {
    render(<VehicleStep onNext={vi.fn()} onSkipStep={vi.fn()} />);
    expect(screen.getByText('Skip for Now')).toBeTruthy();
  });

  it('renders "Add Vehicle" button', () => {
    render(<VehicleStep onNext={vi.fn()} onSkipStep={vi.fn()} />);
    expect(screen.getByText('Add Vehicle')).toBeTruthy();
  });

  it('calls onSkipStep when "Skip for Now" is clicked', () => {
    const spy = vi.fn();
    render(<VehicleStep onNext={vi.fn()} onSkipStep={spy} />);
    fireEvent.click(screen.getByText('Skip for Now'));
    expect(spy).toHaveBeenCalledOnce();
  });

  it('calls onNext on successful form submit', async () => {
    const spy = vi.fn();
    render(<VehicleStep onNext={spy} onSkipStep={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Toyota'), { target: { value: 'Honda' } });
    fireEvent.change(screen.getByPlaceholderText('Corolla'), { target: { value: 'Civic' } });

    fireEvent.submit(screen.getByText('Add Vehicle').closest('form')!);
    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });
  });

  it('shows toast on submit error', async () => {
    mocks.mockFrom.mockReturnValue(buildMockChain(null, { message: 'Insert failed' }));
    render(<VehicleStep onNext={vi.fn()} onSkipStep={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Toyota'), { target: { value: 'Honda' } });
    fireEvent.change(screen.getByPlaceholderText('Corolla'), { target: { value: 'Civic' } });

    fireEvent.submit(screen.getByText('Add Vehicle').closest('form')!);
    await waitFor(() => {
      expect(mocks.mockToastError).toHaveBeenCalled();
    });
  });
});

/* ================================================================== */
/*  PhoneVerificationStep                                              */
/* ================================================================== */

describe('PhoneVerificationStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockUser = { ...FAKE_USER };
    // Default: valid phone normalization
    mocks.mockNormalizePhone.mockReturnValue({
      e164: '+447700900000',
      isValid: true,
      error: undefined,
    });
    mocks.mockAuth.updateUser.mockResolvedValue({ error: null });
    mocks.mockAuth.verifyOtp.mockResolvedValue({ error: null });
  });

  it('renders "Phone Number" label', () => {
    render(<PhoneVerificationStep onVerified={vi.fn()} />);
    expect(screen.getByText('Phone Number')).toBeTruthy();
  });

  it('shows country selector with default flag', () => {
    render(<PhoneVerificationStep onVerified={vi.fn()} />);
    expect(screen.getByTestId('onboarding-phone-country')).toBeTruthy();
    expect(screen.getByText('🇬🇧')).toBeTruthy();
    expect(screen.getByText('+44')).toBeTruthy();
  });

  it('shows phone input field', () => {
    render(<PhoneVerificationStep onVerified={vi.fn()} />);
    expect(screen.getByTestId('onboarding-phone-input')).toBeTruthy();
  });

  it('shows "Send Verification Code" button', () => {
    render(<PhoneVerificationStep onVerified={vi.fn()} />);
    expect(screen.getByText('Send Verification Code')).toBeTruthy();
  });

  it('shows helper text about verification code', () => {
    render(<PhoneVerificationStep onVerified={vi.fn()} />);
    expect(screen.getByText(/send a verification code to this number/i)).toBeTruthy();
  });

  it('opens country dropdown when country button clicked', () => {
    render(<PhoneVerificationStep onVerified={vi.fn()} />);
    fireEvent.click(screen.getByTestId('onboarding-phone-country'));
    expect(screen.getByPlaceholderText('Search country...')).toBeTruthy();
  });

  it('shows countries in dropdown', () => {
    render(<PhoneVerificationStep onVerified={vi.fn()} />);
    fireEvent.click(screen.getByTestId('onboarding-phone-country'));
    expect(screen.getByText('United Kingdom')).toBeTruthy();
    expect(screen.getByText('United States')).toBeTruthy();
  });

  it('allows typing phone number', () => {
    render(<PhoneVerificationStep onVerified={vi.fn()} />);
    const input = screen.getByTestId('onboarding-phone-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '7700900000' } });
    expect(input.value).toBe('7700900000');
  });

  it('shows OTP inputs after sending code', async () => {
    render(<PhoneVerificationStep onVerified={vi.fn()} />);
    const input = screen.getByTestId('onboarding-phone-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '7700900000' } });

    fireEvent.click(screen.getByTestId('onboarding-phone-send'));
    await waitFor(() => {
      expect(screen.getByText('Enter verification code')).toBeTruthy();
    });
  });

  it('shows 6 OTP input fields', async () => {
    render(<PhoneVerificationStep onVerified={vi.fn()} />);
    fireEvent.change(screen.getByTestId('onboarding-phone-input'), { target: { value: '7700900000' } });
    fireEvent.click(screen.getByTestId('onboarding-phone-send'));

    await waitFor(() => {
      for (let i = 0; i < 6; i++) {
        expect(screen.getByTestId(`onboarding-phone-otp-${i}`)).toBeTruthy();
      }
    });
  });

  it('shows "Change number" and "Resend code" links in OTP view', async () => {
    render(<PhoneVerificationStep onVerified={vi.fn()} />);
    fireEvent.change(screen.getByTestId('onboarding-phone-input'), { target: { value: '7700900000' } });
    fireEvent.click(screen.getByTestId('onboarding-phone-send'));

    await waitFor(() => {
      expect(screen.getByText('Change number')).toBeTruthy();
      // After sending, cooldown is 60s
      expect(screen.getByText(/Resend in \d+s/)).toBeTruthy();
    });
  });

  it('calls onVerified after successful OTP verification', async () => {
    const spy = vi.fn();
    render(<PhoneVerificationStep onVerified={spy} />);
    fireEvent.change(screen.getByTestId('onboarding-phone-input'), { target: { value: '7700900000' } });
    fireEvent.click(screen.getByTestId('onboarding-phone-send'));

    await waitFor(() => screen.getByTestId('onboarding-phone-otp-0'));

    // Enter OTP digits
    for (let i = 0; i < 6; i++) {
      fireEvent.change(screen.getByTestId(`onboarding-phone-otp-${i}`), { target: { value: String(i + 1) } });
    }

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith('+447700900000');
    });
  });

  it('shows verified state after successful verification', async () => {
    render(<PhoneVerificationStep onVerified={vi.fn()} />);
    fireEvent.change(screen.getByTestId('onboarding-phone-input'), { target: { value: '7700900000' } });
    fireEvent.click(screen.getByTestId('onboarding-phone-send'));

    await waitFor(() => screen.getByTestId('onboarding-phone-otp-0'));

    for (let i = 0; i < 6; i++) {
      fireEvent.change(screen.getByTestId(`onboarding-phone-otp-${i}`), { target: { value: String(i + 1) } });
    }

    await waitFor(() => {
      expect(screen.getByText('Phone number verified successfully')).toBeTruthy();
    });
  });

  it('shows error on failed OTP', async () => {
    mocks.mockAuth.verifyOtp.mockResolvedValue({ error: { message: 'Invalid code' } });

    render(<PhoneVerificationStep onVerified={vi.fn()} />);
    fireEvent.change(screen.getByTestId('onboarding-phone-input'), { target: { value: '7700900000' } });
    fireEvent.click(screen.getByTestId('onboarding-phone-send'));

    await waitFor(() => screen.getByTestId('onboarding-phone-otp-0'));

    for (let i = 0; i < 6; i++) {
      fireEvent.change(screen.getByTestId(`onboarding-phone-otp-${i}`), { target: { value: '1' } });
    }

    await waitFor(() => {
      expect(screen.getByText(/invalid verification code/i)).toBeTruthy();
    });
  });

  it('disables inputs when disabled prop is true', () => {
    render(<PhoneVerificationStep onVerified={vi.fn()} disabled={true} />);
    const input = screen.getByTestId('onboarding-phone-input') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});
