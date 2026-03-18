/**
 * Vitest global setup for jsdom-based tests.
 *
 * Provides:
 *  - @testing-library/jest-dom matchers
 *  - Global Supabase mock
 *  - AuthContext test wrapper helpers
 *  - Common test utilities
 */
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Stub window.matchMedia (jsdom doesn't implement it)
// ---------------------------------------------------------------------------
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ---------------------------------------------------------------------------
// Stub scrollTo (used by react-router on navigate)
// ---------------------------------------------------------------------------
window.scrollTo = vi.fn() as any;

// ---------------------------------------------------------------------------
// Stub import.meta.env defaults
// ---------------------------------------------------------------------------
(import.meta as any).env = {
  ...(import.meta as any).env,
  VITE_SUPABASE_URL: 'https://test.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'test-anon-key',
  VITE_BETA_MODE: 'false',
  VITE_AUTH_ALLOW_OTP_SIGNUPS: 'true',
  VITE_SKIP_EMAIL_VERIFICATION: 'false',
  DEV: false,
  PROD: true,
};
