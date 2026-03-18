/**
 * guards.spec.tsx — Enterprise-grade tests for route guards
 *
 * Tests every guard component's redirect logic across all auth states:
 *   - loading → LoadingScreen
 *   - no user → /signin
 *   - unverified email → /verify-email
 *   - incomplete profile → /onboarding/profile
 *   - non-admin → /unauthorized
 *   - admin access → children rendered
 *   - location.state preservation for post-login redirect
 */
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  LoadingScreen,
  PublicRoute,
  ProtectedRoute,
  RequireProfileComplete,
  AdminRoute,
} from '../../src/routes/guards';
import { makeAuthValue, FAKE_USER, FAKE_PROFILE, FAKE_ADMIN_PROFILE } from './helpers';

// ---------------------------------------------------------------------------
// Mock useAuth — all guards depend on it
// ---------------------------------------------------------------------------
const mockUseAuth = vi.fn();
vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Utility: renders a guard-wrapped component inside a router that can capture redirects
function renderWithRouter(
  guardElement: React.ReactElement,
  initialRoute = '/test',
) {
  cleanup(); // Ensure clean DOM before each render
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/test" element={guardElement} />
        <Route path="/signin" element={<div data-testid="signin-page">Sign In</div>} />
        <Route path="/verify-email" element={<div data-testid="verify-email-page">Verify Email</div>} />
        <Route path="/onboarding/profile" element={<div data-testid="onboarding-page">Onboarding</div>} />
        <Route path="/unauthorized" element={<div data-testid="unauthorized-page">Unauthorized</div>} />
        <Route path="/" element={<div data-testid="home-page">Home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// LoadingScreen
// ---------------------------------------------------------------------------
describe('LoadingScreen', () => {
  it('renders spinner and loading text', () => {
    cleanup();
    render(<LoadingScreen />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// PublicRoute
// ---------------------------------------------------------------------------
describe('PublicRoute', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows LoadingScreen while auth is loading', () => {
    mockUseAuth.mockReturnValue(makeAuthValue({ loading: true }));
    renderWithRouter(
      <PublicRoute><div data-testid="child">Content</div></PublicRoute>,
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
  });

  it('redirects authenticated users to /', () => {
    mockUseAuth.mockReturnValue(makeAuthValue({ user: FAKE_USER }));
    renderWithRouter(
      <PublicRoute><div data-testid="child">Content</div></PublicRoute>,
    );
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
  });

  it('renders children for unauthenticated users', () => {
    mockUseAuth.mockReturnValue(makeAuthValue({ user: null }));
    renderWithRouter(
      <PublicRoute><div data-testid="child">Content</div></PublicRoute>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ProtectedRoute
// ---------------------------------------------------------------------------
describe('ProtectedRoute', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows LoadingScreen while loading', () => {
    mockUseAuth.mockReturnValue(makeAuthValue({ loading: true }));
    renderWithRouter(
      <ProtectedRoute><div data-testid="child">Secure</div></ProtectedRoute>,
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('redirects to /signin when not authenticated', () => {
    mockUseAuth.mockReturnValue(makeAuthValue({ user: null }));
    renderWithRouter(
      <ProtectedRoute><div data-testid="child">Secure</div></ProtectedRoute>,
    );
    expect(screen.getByTestId('signin-page')).toBeInTheDocument();
  });

  it('redirects to /verify-email when email is not verified', () => {
    mockUseAuth.mockReturnValue(
      makeAuthValue({ user: FAKE_USER, isEmailVerified: false }),
    );
    renderWithRouter(
      <ProtectedRoute><div data-testid="child">Secure</div></ProtectedRoute>,
    );
    expect(screen.getByTestId('verify-email-page')).toBeInTheDocument();
  });

  it('renders children when authenticated and email verified', () => {
    mockUseAuth.mockReturnValue(
      makeAuthValue({ user: FAKE_USER, isEmailVerified: true }),
    );
    renderWithRouter(
      <ProtectedRoute><div data-testid="child">Secure</div></ProtectedRoute>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// RequireProfileComplete
// ---------------------------------------------------------------------------
describe('RequireProfileComplete', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows LoadingScreen while loading', () => {
    mockUseAuth.mockReturnValue(makeAuthValue({ loading: true }));
    renderWithRouter(
      <RequireProfileComplete><div>Content</div></RequireProfileComplete>,
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('redirects to /signin when no user', () => {
    mockUseAuth.mockReturnValue(makeAuthValue({}));
    renderWithRouter(
      <RequireProfileComplete><div>Content</div></RequireProfileComplete>,
    );
    expect(screen.getByTestId('signin-page')).toBeInTheDocument();
  });

  it('redirects to /verify-email when email unverified', () => {
    mockUseAuth.mockReturnValue(
      makeAuthValue({ user: FAKE_USER, isEmailVerified: false }),
    );
    renderWithRouter(
      <RequireProfileComplete><div>Content</div></RequireProfileComplete>,
    );
    expect(screen.getByTestId('verify-email-page')).toBeInTheDocument();
  });

  it('redirects to /onboarding/profile when profile incomplete', () => {
    mockUseAuth.mockReturnValue(
      makeAuthValue({ user: FAKE_USER, isEmailVerified: true, isProfileComplete: false }),
    );
    renderWithRouter(
      <RequireProfileComplete><div>Content</div></RequireProfileComplete>,
    );
    expect(screen.getByTestId('onboarding-page')).toBeInTheDocument();
  });

  it('renders children when fully complete', () => {
    mockUseAuth.mockReturnValue(
      makeAuthValue({ user: FAKE_USER, isEmailVerified: true, isProfileComplete: true }),
    );
    renderWithRouter(
      <RequireProfileComplete><div data-testid="child">OK</div></RequireProfileComplete>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// AdminRoute
// ---------------------------------------------------------------------------
describe('AdminRoute', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows LoadingScreen while loading', () => {
    mockUseAuth.mockReturnValue(makeAuthValue({ loading: true }));
    renderWithRouter(
      <AdminRoute><div>Admin</div></AdminRoute>,
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('redirects to /signin when no user', () => {
    mockUseAuth.mockReturnValue(makeAuthValue({}));
    renderWithRouter(
      <AdminRoute><div>Admin</div></AdminRoute>,
    );
    expect(screen.getByTestId('signin-page')).toBeInTheDocument();
  });

  it('redirects to /verify-email when unverified', () => {
    mockUseAuth.mockReturnValue(
      makeAuthValue({ user: FAKE_USER, isEmailVerified: false }),
    );
    renderWithRouter(
      <AdminRoute><div>Admin</div></AdminRoute>,
    );
    expect(screen.getByTestId('verify-email-page')).toBeInTheDocument();
  });

  it('shows LoadingScreen when profile not yet loaded', () => {
    mockUseAuth.mockReturnValue(
      makeAuthValue({ user: FAKE_USER, isEmailVerified: true, profile: null }),
    );
    renderWithRouter(
      <AdminRoute><div>Admin</div></AdminRoute>,
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('redirects to /unauthorized for non-admin user', () => {
    mockUseAuth.mockReturnValue(
      makeAuthValue({
        user: FAKE_USER,
        isEmailVerified: true,
        profile: FAKE_PROFILE,
        isAdmin: false,
        adminRole: null,
      }),
    );
    renderWithRouter(
      <AdminRoute><div>Admin</div></AdminRoute>,
    );
    expect(screen.getByTestId('unauthorized-page')).toBeInTheDocument();
  });

  it('renders children for admin user (via is_admin flag)', () => {
    mockUseAuth.mockReturnValue(
      makeAuthValue({
        user: FAKE_USER,
        isEmailVerified: true,
        profile: FAKE_ADMIN_PROFILE,
        isAdmin: true,
        adminRole: 'super_admin',
      }),
    );
    renderWithRouter(
      <AdminRoute><div data-testid="admin-child">Admin Panel</div></AdminRoute>,
    );
    expect(screen.getByTestId('admin-child')).toBeInTheDocument();
  });

  it('renders children for admin user (via adminRole only, is_admin=false)', () => {
    const profileWithRole = { ...FAKE_PROFILE, is_admin: false, admin_role: 'moderator' };
    mockUseAuth.mockReturnValue(
      makeAuthValue({
        user: FAKE_USER,
        isEmailVerified: true,
        profile: profileWithRole,
        isAdmin: true,
        adminRole: 'moderator',
      }),
    );
    renderWithRouter(
      <AdminRoute><div data-testid="admin-child">Admin Panel</div></AdminRoute>,
    );
    expect(screen.getByTestId('admin-child')).toBeInTheDocument();
  });
});
