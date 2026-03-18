/**
 * VerifyEmail.spec.tsx — Enterprise tests for the Verify Email page
 *
 * Covers: redirect when no user, redirect when verified, resend success/error,
 * sign out, loading states, page content display.
 */
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import VerifyEmail from '../../src/pages/auth/VerifyEmail';
import { makeAuthValue, FAKE_USER, FAKE_USER_UNVERIFIED } from './helpers';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const authState = { value: makeAuthValue() };

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => authState.value,
}));

vi.mock('../../src/components/shared/Logo', () => ({
  default: () => <div data-testid="logo">Logo</div>,
}));

function renderVerifyEmail(initialRoute = '/verify-email') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/signin" element={<div data-testid="signin-page">Sign In</div>} />
        <Route path="/" element={<div data-testid="home-page">Home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('VerifyEmail Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    authState.value = makeAuthValue();
  });

  afterEach(() => cleanup());

  // -----------------------------------------------------------------------
  // Redirects
  // -----------------------------------------------------------------------
  it('redirects to /signin when no user', () => {
    authState.value = makeAuthValue({ user: null });
    renderVerifyEmail();
    expect(screen.getByTestId('signin-page')).toBeInTheDocument();
  });

  it('redirects to / when email is already verified', () => {
    authState.value = makeAuthValue({ user: FAKE_USER, isEmailVerified: true });
    renderVerifyEmail();
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Normal render — unverified user
  // -----------------------------------------------------------------------
  it('displays verification UI for unverified user', () => {
    authState.value = makeAuthValue({
      user: FAKE_USER_UNVERIFIED,
      isEmailVerified: false,
    });
    renderVerifyEmail();

    expect(screen.getByText('Verify Your Email')).toBeInTheDocument();
    expect(screen.getByText(FAKE_USER_UNVERIFIED.email)).toBeInTheDocument();
    expect(screen.getByText(/Resend Verification Email/i)).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Resend — success
  // -----------------------------------------------------------------------
  it('shows success message after resending email', async () => {
    authState.value = makeAuthValue({
      user: FAKE_USER_UNVERIFIED,
      isEmailVerified: false,
      resendVerificationEmail: vi.fn(async () => ({ error: null })),
    });

    renderVerifyEmail();
    fireEvent.click(screen.getByText(/Resend Verification Email/i));

    await waitFor(() => {
      expect(screen.getByText(/Verification email sent/i)).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Resend — error
  // -----------------------------------------------------------------------
  it('shows error message when resend fails', async () => {
    authState.value = makeAuthValue({
      user: FAKE_USER_UNVERIFIED,
      isEmailVerified: false,
      resendVerificationEmail: vi.fn(async () => ({
        error: { message: 'Rate limit' } as any,
      })),
    });

    renderVerifyEmail();
    fireEvent.click(screen.getByText(/Resend Verification Email/i));

    await waitFor(() => {
      expect(screen.getByText(/Failed to resend/i)).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Resend — exception
  // -----------------------------------------------------------------------
  it('shows generic error on resend exception', async () => {
    authState.value = makeAuthValue({
      user: FAKE_USER_UNVERIFIED,
      isEmailVerified: false,
      resendVerificationEmail: vi.fn(async () => { throw new Error('network'); }),
    });

    renderVerifyEmail();
    fireEvent.click(screen.getByText(/Resend Verification Email/i));

    await waitFor(() => {
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Sign out
  // -----------------------------------------------------------------------
  it('calls signOut when Sign Out button clicked', async () => {
    const signOutFn = vi.fn(async () => ({ error: null }));
    authState.value = makeAuthValue({
      user: FAKE_USER_UNVERIFIED,
      isEmailVerified: false,
      signOut: signOutFn,
    });

    renderVerifyEmail();
    fireEvent.click(screen.getByText('Sign Out'));

    await waitFor(() => {
      expect(signOutFn).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Loading state on resend button
  // -----------------------------------------------------------------------
  it('shows "Sending..." text during resend', async () => {
    let resolveResend: any;
    const resendPromise = new Promise((res) => { resolveResend = res; });

    authState.value = makeAuthValue({
      user: FAKE_USER_UNVERIFIED,
      isEmailVerified: false,
      resendVerificationEmail: vi.fn(() => resendPromise),
    });

    renderVerifyEmail();
    fireEvent.click(screen.getByText(/Resend Verification Email/i));

    expect(screen.getByText('Sending...')).toBeInTheDocument();

    resolveResend({ error: null });
    await waitFor(() => {
      expect(screen.queryByText('Sending...')).not.toBeInTheDocument();
    });
  });
});
