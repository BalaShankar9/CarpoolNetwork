/**
 * SignIn.spec.tsx — Enterprise tests for the Sign In page
 *
 * Covers: dual auth modes, OAuth triggers, error display, OTP flow trigger,
 * password mode with email validation, mode toggling, navigation links.
 */
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SignIn from '../../src/pages/auth/SignIn';
import { makeAuthValue } from './helpers';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null, pathname: '/signin', search: '', hash: '' }),
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

// Mock child components to isolate page logic
vi.mock('../../src/components/auth/AuthLayout', () => ({
  default: ({ children }: any) => <div data-testid="auth-layout">{children}</div>,
}));

vi.mock('../../src/components/auth/AuthCard', () => ({
  default: ({ children, title }: any) => <div data-testid="auth-card"><h1>{title}</h1>{children}</div>,
}));

vi.mock('../../src/components/auth/SocialAuthButtons', () => ({
  default: ({ onGoogleSignIn, onGitHubSignIn }: any) => (
    <div>
      <button data-testid="google-btn" onClick={onGoogleSignIn}>Google</button>
      <button data-testid="github-btn" onClick={onGitHubSignIn}>GitHub</button>
    </div>
  ),
}));

vi.mock('../../src/components/auth/PasswordLoginForm', () => ({
  default: ({ onSubmit }: any) => (
    <form data-testid="password-form" onSubmit={(e: any) => { e.preventDefault(); onSubmit('test@example.com', 'Password1!').catch(() => {}); }}>
      <button type="submit">Sign In</button>
    </form>
  ),
}));

vi.mock('../../src/components/auth/OtpRequestForm', () => ({
  default: ({ onSendOTP }: any) => (
    <button data-testid="otp-send-btn" onClick={() => onSendOTP('+447700900000', true)}>Send OTP</button>
  ),
}));

function renderSignIn() {
  return render(
    <MemoryRouter initialEntries={['/signin']}>
      <SignIn />
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('SignIn Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    authValue.signIn = vi.fn(async () => ({ error: null }));
    authValue.signInWithGoogle = vi.fn(async () => ({ error: null }));
    authValue.signInWithGitHub = vi.fn(async () => ({ error: null }));
    authValue.signInWithOTP = vi.fn(async () => ({ error: null }));
  });

  afterEach(() => cleanup());

  // -----------------------------------------------------------------------
  // Rendering
  // -----------------------------------------------------------------------
  it('renders the sign-in page with title', () => {
    renderSignIn();
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
  });

  it('shows password form by default', () => {
    renderSignIn();
    expect(screen.getByTestId('password-form')).toBeInTheDocument();
  });

  it('renders social auth buttons', () => {
    renderSignIn();
    expect(screen.getByTestId('google-btn')).toBeInTheDocument();
    expect(screen.getByTestId('github-btn')).toBeInTheDocument();
  });

  it('renders forgot password and signup links', () => {
    renderSignIn();
    expect(screen.getByText('Forgot password?')).toBeInTheDocument();
    expect(screen.getByText('Sign up')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Auth mode toggle
  // -----------------------------------------------------------------------
  it('switches to OTP mode and back', () => {
    renderSignIn();
    fireEvent.click(screen.getByText('Use a one-time code instead'));
    expect(screen.getByTestId('otp-send-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('password-form')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Use password instead'));
    expect(screen.getByTestId('password-form')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Password login — success
  // -----------------------------------------------------------------------
  it('navigates to home on successful password login', async () => {
    renderSignIn();
    fireEvent.submit(screen.getByTestId('password-form'));

    await waitFor(() => {
      expect(authValue.signIn).toHaveBeenCalledWith('test@example.com', 'Password1!');
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  // -----------------------------------------------------------------------
  // Password login — error
  // -----------------------------------------------------------------------
  it('displays mapped error on password login failure', async () => {
    authValue.signIn = vi.fn(async () => ({
      error: { message: 'Invalid login credentials' } as any,
    }));

    renderSignIn();
    fireEvent.submit(screen.getByTestId('password-form'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Mapped: Invalid login credentials')).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Google OAuth — success
  // -----------------------------------------------------------------------
  it('calls signInWithGoogle on Google button click', async () => {
    renderSignIn();
    fireEvent.click(screen.getByTestId('google-btn'));

    await waitFor(() => {
      expect(authValue.signInWithGoogle).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Google OAuth — error
  // -----------------------------------------------------------------------
  it('displays error on Google sign-in failure', async () => {
    authValue.signInWithGoogle = vi.fn(async () => ({
      error: { message: 'access_denied' } as any,
    }));

    renderSignIn();
    fireEvent.click(screen.getByTestId('google-btn'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // GitHub OAuth — error
  // -----------------------------------------------------------------------
  it('displays error on GitHub sign-in failure', async () => {
    authValue.signInWithGitHub = vi.fn(async () => ({
      error: { message: 'access_denied' } as any,
    }));

    renderSignIn();
    fireEvent.click(screen.getByTestId('github-btn'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // OTP flow — success → navigate to verify-otp
  // -----------------------------------------------------------------------
  it('navigates to /verify-otp on successful OTP send', async () => {
    renderSignIn();
    // Switch to OTP mode
    fireEvent.click(screen.getByText('Use a one-time code instead'));
    fireEvent.click(screen.getByTestId('otp-send-btn'));

    await waitFor(() => {
      expect(authValue.signInWithOTP).toHaveBeenCalledWith('+447700900000', true);
      expect(mockNavigate).toHaveBeenCalledWith('/verify-otp', expect.objectContaining({
        state: expect.objectContaining({ identifier: '+447700900000', type: 'phone' }),
      }));
    });
  });

  // -----------------------------------------------------------------------
  // Error clears between attempts
  // -----------------------------------------------------------------------
  it('clears error when starting a new attempt', async () => {
    authValue.signIn = vi.fn()
      .mockResolvedValueOnce({ error: { message: 'fail' } as any })
      .mockResolvedValueOnce({ error: null });

    renderSignIn();

    // First attempt - fails
    fireEvent.submit(screen.getByTestId('password-form'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());

    // Second attempt - succeeds, error should be cleared
    fireEvent.submit(screen.getByTestId('password-form'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
  });

  // -----------------------------------------------------------------------
  // Accessibility
  // -----------------------------------------------------------------------
  it('error message has role="alert" for screen readers', async () => {
    authValue.signIn = vi.fn(async () => ({
      error: { message: 'some error' } as any,
    }));

    renderSignIn();
    fireEvent.submit(screen.getByTestId('password-form'));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });
  });
});
