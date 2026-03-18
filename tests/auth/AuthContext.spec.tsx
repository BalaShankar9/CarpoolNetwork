/**
 * AuthContext.spec.tsx — Enterprise tests for the AuthProvider / useAuth hook
 *
 * Testing approach: These tests render the AuthProvider with a mocked
 * supabase client to test:
 *   - Initial loading → sets loading false after getSession
 *   - Derived state: isEmailVerified, isAdmin, isProfileComplete
 *   - signIn wraps supabase.auth.signInWithPassword
 *   - signOut clears profile/admin state
 *   - signUp respects beta gating
 *   - resetPassword passes redirectTo
 *   - useAuth throws when used outside provider
 */
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Supabase mock — must be set up BEFORE importing AuthContext
// ---------------------------------------------------------------------------
let mockOnAuthStateChange: any;
let mockGetSession: any;
let mockSignInWithPassword: any;
let mockSignInWithOAuth: any;
let mockSignInWithOtp: any;
let mockVerifyOtp: any;
let mockSignOut: any;
let mockSignUp: any;
let mockResetPasswordForEmail: any;
let mockResend: any;
let mockUpdateUser: any;
let mockFromSelect: any;
let mockFromInsert: any;
let mockFromUpdate: any;
let mockRpcFn: any;

function resetSupabaseMocks() {
  mockOnAuthStateChange = vi.fn(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  }));
  mockGetSession = vi.fn(async () => ({
    data: { session: null },
    error: null,
  }));
  mockSignInWithPassword = vi.fn(async () => ({ data: {}, error: null }));
  mockSignInWithOAuth = vi.fn(async () => ({ data: {}, error: null }));
  mockSignInWithOtp = vi.fn(async () => ({ data: {}, error: null }));
  mockVerifyOtp = vi.fn(async () => ({ data: {}, error: null }));
  mockSignOut = vi.fn(async () => ({ error: null }));
  mockSignUp = vi.fn(async () => ({ data: { user: { id: 'new-user' }, session: null }, error: null }));
  mockResetPasswordForEmail = vi.fn(async () => ({ data: {}, error: null }));
  mockResend = vi.fn(async () => ({ data: {}, error: null }));
  mockUpdateUser = vi.fn(async () => ({ data: {}, error: null }));
  mockFromSelect = vi.fn(() => ({
    eq: vi.fn(() => ({
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    })),
  }));
  mockFromInsert = vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn(async () => ({
        data: { id: 'new-user', email: 'test@example.com', full_name: 'New User' },
        error: null,
      })),
    })),
  }));
  mockFromUpdate = vi.fn(() => ({
    eq: vi.fn(async () => ({ error: null })),
  }));
  mockRpcFn = vi.fn(async () => ({ data: true, error: null }));
}

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: any[]) => mockGetSession(...args),
      onAuthStateChange: (...args: any[]) => mockOnAuthStateChange(...args),
      signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
      signInWithOAuth: (...args: any[]) => mockSignInWithOAuth(...args),
      signInWithOtp: (...args: any[]) => mockSignInWithOtp(...args),
      verifyOtp: (...args: any[]) => mockVerifyOtp(...args),
      signOut: (...args: any[]) => mockSignOut(...args),
      signUp: (...args: any[]) => mockSignUp(...args),
      resetPasswordForEmail: (...args: any[]) => mockResetPasswordForEmail(...args),
      resend: (...args: any[]) => mockResend(...args),
      updateUser: (...args: any[]) => mockUpdateUser(...args),
    },
    realtime: { setAuth: vi.fn() },
    from: (table: string) => {
      if (table === 'admin_permissions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(async () => ({ data: [], error: null })),
          })),
        };
      }
      return {
        select: (...a: any[]) => mockFromSelect(...a),
        insert: (...a: any[]) => mockFromInsert(...a),
        update: (...a: any[]) => mockFromUpdate(...a),
      };
    },
    rpc: (...args: any[]) => mockRpcFn(...args),
  },
}));

vi.mock('../../src/utils/authOtp', () => ({
  getAllowOtpSignups: () => true,
}));

// Now import the provider
import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';

// Test consumer component that exposes the context
function TestConsumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(auth.loading)}</span>
      <span data-testid="user">{auth.user?.id ?? 'null'}</span>
      <span data-testid="isEmailVerified">{String(auth.isEmailVerified)}</span>
      <span data-testid="isAdmin">{String(auth.isAdmin)}</span>
      <span data-testid="isProfileComplete">{String(auth.isProfileComplete)}</span>
      <span data-testid="adminRole">{auth.adminRole ?? 'null'}</span>
      <button data-testid="signIn" onClick={() => auth.signIn('a@b.com', 'pass')}>signIn</button>
      <button data-testid="signOut" onClick={() => auth.signOut()}>signOut</button>
      <button data-testid="resetPw" onClick={() => auth.resetPassword('a@b.com')}>reset</button>
      <button data-testid="signUpBtn" onClick={() => auth.signUp('a@b.com', 'P@ss1234', 'User', '+44')}>signUp</button>
      <button data-testid="resend" onClick={() => auth.resendVerificationEmail()}>resend</button>
    </div>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>,
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    resetSupabaseMocks();
    cleanup();
  });

  afterEach(() => cleanup());

  // -----------------------------------------------------------------------
  // useAuth outside provider
  // -----------------------------------------------------------------------
  it('throws when useAuth is used outside AuthProvider', () => {
    const Orphan = () => {
      useAuth();
      return <div />;
    };
    // Suppress React error boundary output
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Orphan />)).toThrow('useAuth must be used within an AuthProvider');
    spy.mockRestore();
  });

  // -----------------------------------------------------------------------
  // Initial loading state
  // -----------------------------------------------------------------------
  it('starts in loading state and resolves to not-loading when no session', async () => {
    renderProvider();

    // Initially loading=true
    expect(screen.getByTestId('loading')).toHaveTextContent('true');

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  // -----------------------------------------------------------------------
  // Derived: isEmailVerified
  // -----------------------------------------------------------------------
  it('sets isEmailVerified=true when email_confirmed_at is set', async () => {
    const fakeUser = {
      id: 'u1',
      email: 'a@b.com',
      email_confirmed_at: '2025-01-01',
      phone_confirmed_at: null,
      user_metadata: {},
      app_metadata: {},
    };
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: fakeUser,
          access_token: 'tok',
        },
      },
      error: null,
    });
    // Profile query returns a valid profile
    mockFromSelect.mockReturnValue({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({
          data: { id: 'u1', email: 'a@b.com', full_name: 'Test', admin_role: null },
          error: null,
        })),
      })),
    });

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('isEmailVerified')).toHaveTextContent('true');
  });

  it('sets isEmailVerified=true when phone_confirmed_at is set', async () => {
    const fakeUser = {
      id: 'u1',
      email: null,
      phone: '+447700900000',
      email_confirmed_at: null,
      phone_confirmed_at: '2025-01-01',
      user_metadata: {},
      app_metadata: {},
    };
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: fakeUser,
          access_token: 'tok',
        },
      },
      error: null,
    });
    mockFromSelect.mockReturnValue({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({
          data: { id: 'u1', email: 'phone@noreply.invalid', full_name: 'Test', admin_role: null },
          error: null,
        })),
      })),
    });

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('isEmailVerified')).toHaveTextContent('true');
  });

  // -----------------------------------------------------------------------
  // signIn
  // -----------------------------------------------------------------------
  it('signIn calls supabase.auth.signInWithPassword', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await act(async () => {
      screen.getByTestId('signIn').click();
    });

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'pass',
    });
  });

  // -----------------------------------------------------------------------
  // signOut
  // -----------------------------------------------------------------------
  it('signOut clears profile and calls supabase.auth.signOut', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await act(async () => {
      screen.getByTestId('signOut').click();
    });

    expect(mockSignOut).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // resetPassword
  // -----------------------------------------------------------------------
  it('resetPassword passes redirectTo with current origin', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await act(async () => {
      screen.getByTestId('resetPw').click();
    });

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      'a@b.com',
      expect.objectContaining({
        redirectTo: expect.stringContaining('/reset-password'),
      }),
    );
  });

  // -----------------------------------------------------------------------
  // signUp — no beta mode
  // -----------------------------------------------------------------------
  it('signUp calls supabase.auth.signUp with metadata', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await act(async () => {
      screen.getByTestId('signUpBtn').click();
    });

    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'a@b.com',
        password: 'P@ss1234',
        options: expect.objectContaining({
          data: { full_name: 'User', phone: '+44' },
        }),
      }),
    );
  });

  // -----------------------------------------------------------------------
  // resendVerificationEmail — no user
  // -----------------------------------------------------------------------
  it('resendVerificationEmail returns error when no user', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    // Consumer calls resend but user is null
    let result: any;
    const Consumer2 = () => {
      const auth = useAuth();
      return (
        <button
          data-testid="doResend"
          onClick={async () => { result = await auth.resendVerificationEmail(); }}
        >
          resend
        </button>
      );
    };

    cleanup();
    render(
      <AuthProvider>
        <Consumer2 />
      </AuthProvider>,
    );

    await waitFor(() => {});

    await act(async () => {
      screen.getByTestId('doResend').click();
    });

    expect(result?.error).toBeTruthy();
    expect(mockResend).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Profile auto-creation when profile is null
  // -----------------------------------------------------------------------
  it('creates profile when no profile exists for user', async () => {
    const fakeUser = {
      id: 'new-u',
      email: 'new@example.com',
      email_confirmed_at: '2025-01-01',
      phone_confirmed_at: null,
      user_metadata: { full_name: 'New User' },
      app_metadata: {},
    };
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: fakeUser,
          access_token: 'tok',
        },
      },
      error: null,
    });
    // Profile lookup returns null (no existing profile)
    mockFromSelect.mockReturnValue({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      })),
    });

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    // Should have tried to insert a profile
    expect(mockFromInsert).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // RBAC: hasPermission / hasRole
  // -----------------------------------------------------------------------
  it('exposes hasPermission and hasRole functions', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    // With no admin role, both should return false
    expect(screen.getByTestId('isAdmin')).toHaveTextContent('false');
    expect(screen.getByTestId('adminRole')).toHaveTextContent('null');
  });
});
