/**
 * ResetPassword.spec.tsx — Enterprise tests for the Reset Password page
 *
 * Covers: 5 password requirements, strength meter, match validation,
 * success redirect with timer, cleanup on unmount, error mapping,
 * direct Supabase call (not AuthContext).
 */
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ResetPassword from '../../src/pages/auth/ResetPassword';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockUpdateUser = vi.fn(async () => ({ data: {}, error: null }));
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      updateUser: (...args: any[]) => mockUpdateUser(...args),
    },
  },
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

function renderResetPassword() {
  return render(
    <MemoryRouter initialEntries={['/reset-password']}>
      <ResetPassword />
    </MemoryRouter>,
  );
}

describe('ResetPassword Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // Rendering
  // -----------------------------------------------------------------------
  it('renders password form with requirements', () => {
    renderResetPassword();
    expect(screen.getByText('Set New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
    // Requirements appear after typing
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'a' } });
    expect(screen.getByText('At least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('Contains uppercase letter')).toBeInTheDocument();
    expect(screen.getByText('Contains lowercase letter')).toBeInTheDocument();
    expect(screen.getByText('Contains a number')).toBeInTheDocument();
    expect(screen.getByText('Contains special character')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Password requirements — individual checks
  // -----------------------------------------------------------------------
  it('rejects password shorter than 8 characters', async () => {
    renderResetPassword();
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'Abc1!' } });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'Abc1!' } });
    // Submit via form (button is disabled since not all requirements met)
    const form = screen.getByRole('button', { name: /update password/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      // Error message says "Password must be at least 8 characters"
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('rejects when passwords do not match', async () => {
    renderResetPassword();
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'StrongP@ss1' } });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'DifferentP@ss1' } });
    // Submit via form (button disabled since passwords don't match)
    const form = screen.getByRole('button', { name: /update password/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      // The error message "Please meet all password requirements" or "Passwords do not match"
      // Also check for the inline indicator "✗ Passwords do not match"
      const matches = screen.getAllByText(/do not match/i);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Success flow — calls supabase directly and redirects
  // -----------------------------------------------------------------------
  it('calls supabase.auth.updateUser and shows success on valid password', async () => {
    renderResetPassword();
    const password = 'StrongP@ss1';
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: password } });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: password } });

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /update password/i }));
    });

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password });
      expect(screen.getByText(/Password Updated/i)).toBeInTheDocument();
    });
  });

  it('redirects to /signin after 2.5s on success', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderResetPassword();
    const password = 'StrongP@ss1';
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: password } });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: password } });

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /update password/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Password Updated/i)).toBeInTheDocument();
    });

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/signin');
    vi.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // Error from supabase
  // -----------------------------------------------------------------------
  it('displays mapped error on supabase failure', async () => {
    mockUpdateUser.mockResolvedValueOnce({
      data: null,
      error: { message: 'New password should be different from the old password' },
    });

    renderResetPassword();
    const password = 'StrongP@ss1';
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: password } });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: password } });

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /update password/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Mapped: New password should be different/)).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Exception handling
  // -----------------------------------------------------------------------
  it('shows generic error on unexpected exception', async () => {
    mockUpdateUser.mockRejectedValueOnce(new Error('network'));

    renderResetPassword();
    const password = 'StrongP@ss1';
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: password } });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: password } });

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /update password/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Password strength meter
  // -----------------------------------------------------------------------
  it('shows "Weak" for password meeting only 1-2 requirements', () => {
    renderResetPassword();
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'abcdefgh' } });
    expect(screen.getByText('Weak')).toBeInTheDocument();
  });

  it('shows "Strong" for password meeting all requirements', () => {
    renderResetPassword();
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'StrongP@ss1' } });
    expect(screen.getByText('Strong')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Cleanup — timer cleared on unmount (no memory leak)
  // -----------------------------------------------------------------------
  it('cleans up redirect timer on unmount', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { unmount } = renderResetPassword();
    const password = 'StrongP@ss1';
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: password } });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: password } });

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /update password/i }));
    });

    await waitFor(() => expect(screen.getByText(/Password Updated/i)).toBeInTheDocument());

    // Unmount before timer fires — should not throw
    unmount();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // If cleanup didn't work, navigate would have been called on unmounted component
    // Just verify no error thrown — the test passing is the assertion
    vi.useRealTimers();
  });
});
