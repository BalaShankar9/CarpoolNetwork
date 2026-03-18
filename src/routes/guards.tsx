/**
 * Route Guards
 *
 * Authentication and authorization wrappers for route protection.
 * Extracted from App.tsx for maintainability.
 */

import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// ---------------------------------------------------------------------------
// Shared loading screen (kept lightweight — no external deps)
// ---------------------------------------------------------------------------

export const LoadingScreen = () => (
  <div className="min-h-screen bg-white flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// PublicRoute — redirects authenticated users away from auth pages
// ---------------------------------------------------------------------------

export function PublicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;

  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// ProtectedRoute — requires auth + email verification
// ---------------------------------------------------------------------------

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, isEmailVerified } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/signin" state={{ from: location }} replace />;
  if (!isEmailVerified) return <Navigate to="/verify-email" replace />;

  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// RequireProfileComplete — requires auth + email + completed profile
// ---------------------------------------------------------------------------

export function RequireProfileComplete({ children }: { children: ReactNode }) {
  const { user, loading, isEmailVerified, isProfileComplete } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/signin" replace />;
  if (!isEmailVerified) return <Navigate to="/verify-email" replace />;
  if (!isProfileComplete) return <Navigate to="/onboarding/profile" state={{ from: location.pathname }} replace />;

  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// AdminRoute — requires auth + email + profile loaded + admin role
// ---------------------------------------------------------------------------

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, profile, loading, isEmailVerified, isAdmin, adminRole } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/signin" replace />;
  if (!isEmailVerified) return <Navigate to="/verify-email" replace />;

  // Wait for profile to load before checking admin status
  if (!profile) return <LoadingScreen />;

  const hasAdminAccess = profile.is_admin === true || adminRole !== null;

  if (!hasAdminAccess) {
    console.warn('[AdminRoute] Access denied for user:', user.id, 'isAdmin:', isAdmin, 'adminRole:', adminRole);
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
