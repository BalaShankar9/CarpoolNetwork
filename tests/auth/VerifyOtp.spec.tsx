/**
 * VerifyOtp.spec.tsx — Enterprise tests for the Verify OTP page
 *
 * Covers: redirect when no state, verify success, verify error, resend,
 * change identifier, phone vs email display.
 */
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import VerifyOtp from '../../src/pages/auth/VerifyOtp';
import { makeAuthValue } from './helpers';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockNavigate = vi.fn();
const mockLocationState: { value: any } = { value: null };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      state: mockLocationState.value,
      pathname: '/verify-otp',
      search: '',
      hash: '',
    }),
  };
});

const authValue = makeAuthValue();
vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => authValue,
}));

vi.mock('../../src/utils/authOtp', () => ({
  getAllowOtpSignups: () => true,
  getOtpErrorMessage: vi.fn(() => null),
}));

vi.mock('../../src/utils/authErrors', () => ({
  mapAuthError: (msg: string) => `Mapped: ${msg}`,
}));

vi.mock('../../src/components/auth/AuthLayout', () => ({
  default: ({ children }: any) => <div data-testid="auth-layout">{children}</div>,
}));

vi.mock('../../src/components/auth/AuthCard', () => ({
  default: ({ children, title, subtitle }: any) => (
    <div data-testid="auth-card"><h1>{title}</h1><p>{subtitle}</p>{children}</div>
  ),
}));

vi.mock('../../src/components/auth/OtpVerifyForm', () => ({
  default: ({ onVerify, onResend, onChangeIdentifier, identifier, identifierType }: any) => (
    <div data-testid="otp-form">
      <span data-testid="identifier">{identifier}</span>
      <span data-testid="type">{identifierType}</span>
      <button data-testid="verify-btn" onClick={() => onVerify('123456')}>Verify</button>
      <button data-testid="resend-btn" onClick={() => onResend()}>Resend</button>
      <button data-testid="change-btn" onClick={() => onChangeIdentifier()}>Change</button>
    </div>
  ),
}));

function renderVerifyOtp() {
  return render(
    <MemoryRouter initialEntries={['/verify-otp']}>
      <Routes>
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/signin" element={<div data-testid="signin-page">Sign In</div>} />
        <Route path="/" element={<div data-testid="home-page">Home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('VerifyOtp Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    authValue.verifyOTP = vi.fn(async () => ({ error: null }));
    authValue.signInWithOTP = vi.fn(async () => ({ error: null }));
    mockLocationState.value = { identifier: 'test@example.com', type: 'email', isSignup: false };
  });

  afterEach(() => cleanup());

  // -----------------------------------------------------------------------
  // Redirect when no state
  // -----------------------------------------------------------------------
  it('redirects to /signin when no location state', () => {
    mockLocationState.value = null;
    renderVerifyOtp();
    expect(screen.getByTestId('signin-page')).toBeInTheDocument();
  });

  it('redirects to /signin when identifier is missing', () => {
    mockLocationState.value = { type: 'email' };
    renderVerifyOtp();
    expect(screen.getByTestId('signin-page')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Normal render — email
  // -----------------------------------------------------------------------
  it('renders verify form with email identifier', () => {
    renderVerifyOtp();
    expect(screen.getByText('Verify Your Code')).toBeInTheDocument();
    expect(screen.getByText(/your email/i)).toBeInTheDocument();
    expect(screen.getByTestId('identifier')).toHaveTextContent('test@example.com');
    expect(screen.getByTestId('type')).toHaveTextContent('email');
  });

  // -----------------------------------------------------------------------
  // Normal render — phone
  // -----------------------------------------------------------------------
  it('renders verify form with phone identifier', () => {
    mockLocationState.value = { identifier: '+447700900000', type: 'phone', isSignup: false };
    renderVerifyOtp();
    expect(screen.getByText(/your phone/i)).toBeInTheDocument();
    expect(screen.getByTestId('identifier')).toHaveTextContent('+447700900000');
    expect(screen.getByTestId('type')).toHaveTextContent('phone');
  });

  // -----------------------------------------------------------------------
  // Verify — success
  // -----------------------------------------------------------------------
  it('navigates to / on successful verification', async () => {
    renderVerifyOtp();
    fireEvent.click(screen.getByTestId('verify-btn'));

    await waitFor(() => {
      expect(authValue.verifyOTP).toHaveBeenCalledWith('test@example.com', '123456', false);
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  // -----------------------------------------------------------------------
  // Verify — error
  // -----------------------------------------------------------------------
  it('displays mapped error on verification failure', async () => {
    authValue.verifyOTP = vi.fn(async () => ({
      error: { message: 'Invalid OTP' } as any,
    }));

    renderVerifyOtp();
    fireEvent.click(screen.getByTestId('verify-btn'));

    await waitFor(() => {
      expect(screen.getByText('Mapped: Invalid OTP')).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Verify — exception
  // -----------------------------------------------------------------------
  it('shows generic error on verify exception', async () => {
    authValue.verifyOTP = vi.fn(async () => { throw new Error('network'); });

    renderVerifyOtp();
    fireEvent.click(screen.getByTestId('verify-btn'));

    await waitFor(() => {
      expect(screen.getByText(/unexpected error/i)).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Resend — success
  // -----------------------------------------------------------------------
  it('calls signInWithOTP on resend', async () => {
    renderVerifyOtp();
    fireEvent.click(screen.getByTestId('resend-btn'));

    await waitFor(() => {
      expect(authValue.signInWithOTP).toHaveBeenCalledWith('test@example.com', false);
    });
  });

  // -----------------------------------------------------------------------
  // Resend — error
  // -----------------------------------------------------------------------
  it('displays error on resend failure', async () => {
    authValue.signInWithOTP = vi.fn(async () => ({
      error: { message: 'Rate limit' } as any,
    }));

    renderVerifyOtp();
    fireEvent.click(screen.getByTestId('resend-btn'));

    await waitFor(() => {
      expect(screen.getByText('Mapped: Rate limit')).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Resend — exception
  // -----------------------------------------------------------------------
  it('shows error on resend exception', async () => {
    authValue.signInWithOTP = vi.fn(async () => { throw new Error('fail'); });

    renderVerifyOtp();
    fireEvent.click(screen.getByTestId('resend-btn'));

    await waitFor(() => {
      expect(screen.getByText(/failed to resend/i)).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Change identifier — navigates back
  // -----------------------------------------------------------------------
  it('navigates to /signin on change identifier (not signup)', () => {
    renderVerifyOtp();
    fireEvent.click(screen.getByTestId('change-btn'));
    expect(mockNavigate).toHaveBeenCalledWith('/signin');
  });

  it('navigates to /signup on change identifier (signup flow)', () => {
    mockLocationState.value = { identifier: 'test@example.com', type: 'email', isSignup: true };
    renderVerifyOtp();
    fireEvent.click(screen.getByTestId('change-btn'));
    expect(mockNavigate).toHaveBeenCalledWith('/signup');
  });

  // -----------------------------------------------------------------------
  // Accessibility
  // -----------------------------------------------------------------------
  it('error message container renders when error is present', async () => {
    authValue.verifyOTP = vi.fn(async () => ({
      error: { message: 'Invalid code' } as any,
    }));

    renderVerifyOtp();
    fireEvent.click(screen.getByTestId('verify-btn'));

    await waitFor(() => {
      expect(screen.getByText('Mapped: Invalid code')).toBeInTheDocument();
    });
  });
});
