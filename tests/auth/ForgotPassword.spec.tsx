/**
 * ForgotPassword.spec.tsx — Enterprise tests for the Forgot Password page
 *
 * Covers: email validation, anti-enumeration (always-success), rate-limit
 * surfacing, phone "coming soon", success UI transition, loading state.
 */
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ForgotPassword from '../../src/pages/auth/ForgotPassword';
import { makeAuthValue } from './helpers';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const authState = { value: makeAuthValue() };

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => authState.value,
}));

vi.mock('../../src/utils/authErrors', () => ({
  mapAuthError: (msg: string) => `Mapped: ${msg}`,
}));

vi.mock('../../src/components/auth/AuthLayout', () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../src/components/auth/AuthCard', () => ({
  default: ({ children, title }: any) => <div><h1>{title}</h1>{children}</div>,
}));

function renderForgotPassword() {
  return render(
    <MemoryRouter initialEntries={['/forgot-password']}>
      <ForgotPassword />
    </MemoryRouter>,
  );
}

function getEmailInput() {
  return screen.getByPlaceholderText(/email/i) || screen.getByLabelText(/email/i);
}

describe('ForgotPassword Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    authState.value = makeAuthValue({
      resetPassword: vi.fn(async () => ({ error: null })),
    });
  });

  afterEach(() => cleanup());

  // -----------------------------------------------------------------------
  // Rendering
  // -----------------------------------------------------------------------
  it('renders the reset password page', () => {
    renderForgotPassword();
    expect(screen.getByText('Reset Password')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Client-side email validation
  // -----------------------------------------------------------------------
  it('shows error for empty email', async () => {
    renderForgotPassword();
    // Submit form directly — button is disabled when email empty, but form submit
    // fires the handler which checks for empty email
    const form = screen.getByRole('button', { name: /send reset link/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/enter your email/i)).toBeInTheDocument();
    });
    expect(authState.value.resetPassword).not.toHaveBeenCalled();
  });

  it('shows error for invalid email format', async () => {
    renderForgotPassword();
    const input = getEmailInput();
    fireEvent.change(input, { target: { value: 'not-an-email' } });
    const form = screen.getByRole('button', { name: /send reset link/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
    expect(authState.value.resetPassword).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Success — normal flow
  // -----------------------------------------------------------------------
  it('shows success UI on valid email submission', async () => {
    renderForgotPassword();
    const input = getEmailInput();
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(authState.value.resetPassword).toHaveBeenCalledWith('test@example.com');
      // Success UI should show
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Anti-enumeration — shows success even for "user not found" error
  // -----------------------------------------------------------------------
  it('shows success even when user not found (anti-enumeration)', async () => {
    authState.value = makeAuthValue({
      resetPassword: vi.fn(async () => ({
        error: { message: 'User not found' } as any,
      })),
    });

    renderForgotPassword();
    const input = getEmailInput();
    fireEvent.change(input, { target: { value: 'nonexistent@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      // Should still show success — NOT an error
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      expect(screen.queryByText(/Mapped:/)).not.toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Rate-limit errors ARE surfaced
  // -----------------------------------------------------------------------
  it('surfaces rate-limit errors to the user', async () => {
    authState.value = makeAuthValue({
      resetPassword: vi.fn(async () => ({
        error: { message: 'Email rate limit exceeded' } as any,
      })),
    });

    renderForgotPassword();
    const input = getEmailInput();
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/Mapped: Email rate limit exceeded/)).toBeInTheDocument();
    });
  });

  it('surfaces network errors to the user', async () => {
    authState.value = makeAuthValue({
      resetPassword: vi.fn(async () => ({
        error: { message: 'Failed to fetch' } as any,
      })),
    });

    renderForgotPassword();
    const input = getEmailInput();
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/Mapped: Failed to fetch/)).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Phone recovery — not yet implemented
  // -----------------------------------------------------------------------
  it('shows "coming soon" for phone recovery', async () => {
    renderForgotPassword();
    // Switch to phone tab
    const phoneTab = screen.getByText('Phone');
    fireEvent.click(phoneTab);
    // Fill in a phone number to enable the button
    const phoneInput = screen.getByPlaceholderText(/7700/);
    fireEvent.change(phoneInput, { target: { value: '+447700900000' } });
    fireEvent.click(screen.getByRole('button', { name: /send verification code/i }));
    await waitFor(() => {
      expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Exception handling
  // -----------------------------------------------------------------------
  it('shows generic error on thrown exception', async () => {
    authState.value = makeAuthValue({
      resetPassword: vi.fn(async () => { throw new Error('unexpected'); }),
    });

    renderForgotPassword();
    const input = getEmailInput();
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });
});
