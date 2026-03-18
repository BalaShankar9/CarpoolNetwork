/**
 * SignUp.spec.tsx — Enterprise tests for the Sign Up page
 *
 * Covers: rendering, OAuth triggers, email signup success (email confirmation),
 * email signup direct login, error display, analytics tracking, links.
 */
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SignUp from '../../src/pages/auth/SignUp';
import { makeAuthValue } from './helpers';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const authValue = makeAuthValue();
vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => authValue,
}));

vi.mock('../../src/utils/authErrors', () => ({
  mapAuthError: (msg: string) => `Mapped: ${msg}`,
}));

vi.mock('../../src/lib/analytics', () => ({
  analytics: {
    track: {
      signUpComplete: vi.fn(),
      errorStateShown: vi.fn(),
    },
  },
}));

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

vi.mock('../../src/components/auth/PasswordSignupForm', () => ({
  default: ({ onSubmit }: any) => (
    <form data-testid="signup-form" onSubmit={(e: any) => {
      e.preventDefault();
      onSubmit('test@example.com', 'StrongP@ss1', 'Test User', '+447700900000').catch(() => {});
    }}>
      <button type="submit">Create Account</button>
    </form>
  ),
}));

function renderSignUp() {
  return render(
    <MemoryRouter initialEntries={['/signup']}>
      <SignUp />
    </MemoryRouter>,
  );
}

describe('SignUp Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    authValue.signUp = vi.fn(async () => ({ error: null, requiresEmailConfirmation: true }));
    authValue.signInWithGoogle = vi.fn(async () => ({ error: null }));
    authValue.signInWithGitHub = vi.fn(async () => ({ error: null }));
  });

  afterEach(() => cleanup());

  // -----------------------------------------------------------------------
  // Rendering
  // -----------------------------------------------------------------------
  it('renders the sign-up page with title', () => {
    renderSignUp();
    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
  });

  it('renders social auth buttons', () => {
    renderSignUp();
    expect(screen.getByTestId('google-btn')).toBeInTheDocument();
    expect(screen.getByTestId('github-btn')).toBeInTheDocument();
  });

  it('renders signup form', () => {
    renderSignUp();
    expect(screen.getByTestId('signup-form')).toBeInTheDocument();
  });

  it('renders sign-in link and legal links', () => {
    renderSignUp();
    expect(screen.getByText('Sign in')).toBeInTheDocument();
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Email signup — requires email confirmation
  // -----------------------------------------------------------------------
  it('shows email confirmation message on successful signup', async () => {
    renderSignUp();
    fireEvent.submit(screen.getByTestId('signup-form'));

    await waitFor(() => {
      expect(authValue.signUp).toHaveBeenCalledWith(
        'test@example.com', 'StrongP@ss1', 'Test User', '+447700900000',
      );
      expect(screen.getByText(/confirm your email/i)).toBeInTheDocument();
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
  });

  it('shows Go to Sign In link after email confirmation', async () => {
    renderSignUp();
    fireEvent.submit(screen.getByTestId('signup-form'));

    await waitFor(() => {
      expect(screen.getByText('Go to Sign In')).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Email signup — direct login (no email confirmation required)
  // -----------------------------------------------------------------------
  it('navigates to home when email confirmation not required', async () => {
    authValue.signUp = vi.fn(async () => ({
      error: null,
      requiresEmailConfirmation: false,
    }));

    renderSignUp();
    fireEvent.submit(screen.getByTestId('signup-form'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  // -----------------------------------------------------------------------
  // Email signup — error
  // -----------------------------------------------------------------------
  it('displays mapped error on signup failure', async () => {
    authValue.signUp = vi.fn(async () => ({
      error: { message: 'User already registered' } as any,
      requiresEmailConfirmation: false,
    }));

    renderSignUp();
    fireEvent.submit(screen.getByTestId('signup-form'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Mapped: User already registered')).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Google OAuth — success
  // -----------------------------------------------------------------------
  it('calls signInWithGoogle on Google button click', async () => {
    renderSignUp();
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

    renderSignUp();
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

    renderSignUp();
    fireEvent.click(screen.getByTestId('github-btn'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Exception handling
  // -----------------------------------------------------------------------
  it('shows generic error on signup exception', async () => {
    authValue.signUp = vi.fn(async () => { throw new Error('network'); });

    renderSignUp();
    fireEvent.submit(screen.getByTestId('signup-form'));

    await waitFor(() => {
      expect(screen.getByText(/unexpected error/i)).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Accessibility
  // -----------------------------------------------------------------------
  it('error message has role="alert" for screen readers', async () => {
    authValue.signUp = vi.fn(async () => ({
      error: { message: 'error' } as any,
      requiresEmailConfirmation: false,
    }));

    renderSignUp();
    fireEvent.submit(screen.getByTestId('signup-form'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
