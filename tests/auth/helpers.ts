/**
 * Shared test helpers for Auth module tests.
 *
 * Provides a mock AuthContext wrapper, fake users/profiles,
 * and a Supabase mock factory.
 */
import React, { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Fake data
// ---------------------------------------------------------------------------
export const FAKE_USER = {
  id: 'user-001',
  email: 'test@example.com',
  phone: '+447700900000',
  email_confirmed_at: '2025-01-01T00:00:00Z',
  phone_confirmed_at: null,
  app_metadata: {},
  user_metadata: { full_name: 'Test User' },
  aud: 'authenticated',
  created_at: '2025-01-01T00:00:00Z',
} as any;

export const FAKE_USER_UNVERIFIED = {
  ...FAKE_USER,
  id: 'user-unverified',
  email_confirmed_at: null,
  phone_confirmed_at: null,
};

export const FAKE_PROFILE = {
  id: 'user-001',
  email: 'test@example.com',
  full_name: 'Test User',
  avatar_url: 'https://example.com/avatar.jpg',
  profile_photo_url: null,
  phone_e164: '+447700900000',
  phone_verified: true,
  country: 'United Kingdom',
  city: 'London',
  nationality: 'British',
  date_of_birth: '1990-01-15',
  gender: 'female',
  is_admin: false,
  admin_role: null,
  average_rating: 4.5,
  bio: 'Test bio',
  created_at: '2025-01-01T00:00:00Z',
};

export const FAKE_ADMIN_PROFILE = {
  ...FAKE_PROFILE,
  id: 'admin-001',
  is_admin: true,
  admin_role: 'super_admin',
};

export const FAKE_INCOMPLETE_PROFILE = {
  ...FAKE_PROFILE,
  phone_e164: null,
  phone_verified: false,
  avatar_url: null,
};

// ---------------------------------------------------------------------------
// Default AuthContext value factory
// ---------------------------------------------------------------------------
export function makeAuthValue(overrides: Record<string, any> = {}) {
  return {
    user: null,
    profile: null,
    session: null,
    loading: false,
    isEmailVerified: false,
    isAdmin: false,
    isProfileComplete: false,
    profileMissingFields: ['full_name', 'avatar', 'phone', 'phone_verified', 'country', 'city', 'nationality', 'date_of_birth', 'gender'],
    adminRole: null,
    permissions: [],
    hasPermission: vi.fn(() => false),
    hasRole: vi.fn(() => false),
    signUp: vi.fn(async () => ({ error: null, requiresEmailConfirmation: true })),
    signIn: vi.fn(async () => ({ error: null })),
    signInWithGoogle: vi.fn(async () => ({ error: null })),
    signInWithGitHub: vi.fn(async () => ({ error: null })),
    signInWithOTP: vi.fn(async () => ({ error: null })),
    verifyOTP: vi.fn(async () => ({ error: null })),
    signOut: vi.fn(async () => ({ error: null })),
    resetPassword: vi.fn(async () => ({ error: null })),
    updateProfile: vi.fn(async () => ({ error: null })),
    resendVerificationEmail: vi.fn(async () => ({ error: null })),
    refreshProfile: vi.fn(async () => {}),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Supabase mock factory
// ---------------------------------------------------------------------------
export function makeSupabaseMock(overrides: Record<string, any> = {}) {
  return {
    auth: {
      signInWithPassword: vi.fn(async () => ({ data: {}, error: null })),
      signUp: vi.fn(async () => ({ data: { user: FAKE_USER, session: null }, error: null })),
      signInWithOtp: vi.fn(async () => ({ error: null })),
      verifyOtp: vi.fn(async () => ({ error: null })),
      signInWithOAuth: vi.fn(async () => ({ error: null })),
      signOut: vi.fn(async () => ({ error: null })),
      resetPasswordForEmail: vi.fn(async () => ({ error: null })),
      updateUser: vi.fn(async () => ({ data: {}, error: null })),
      resend: vi.fn(async () => ({ error: null })),
      getSession: vi.fn(async () => ({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      ...overrides,
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      single: vi.fn(async () => ({ data: FAKE_PROFILE, error: null })),
    })),
    rpc: vi.fn(async () => ({ data: true, error: null })),
    realtime: { setAuth: vi.fn() },
  };
}

// ---------------------------------------------------------------------------
// Render wrapper with MemoryRouter + AuthContext
// ---------------------------------------------------------------------------

// We use a mock AuthContext since AuthProvider requires real Supabase.
// Components import `useAuth` from '../../contexts/AuthContext'.
// In tests, we mock that module.
export function createRouterWrapper(initialRoute = '/') {
  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(
      MemoryRouter,
      { initialEntries: [initialRoute] },
      children,
    );
  };
}
