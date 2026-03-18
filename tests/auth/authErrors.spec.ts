/**
 * authErrors.spec.ts — Enterprise-grade tests for error mapping utility
 *
 * Tests: direct match, partial match, rate-limit detection, network errors,
 * fallback safety, empty/null input, XSS prevention, case insensitivity.
 */
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { mapAuthError } from '../../src/utils/authErrors';

describe('mapAuthError', () => {
  // -----------------------------------------------------------------------
  // Direct matches — every entry in ERROR_MAP
  // -----------------------------------------------------------------------
  describe('direct matches', () => {
    const directCases: [string, RegExp][] = [
      ['Invalid login credentials', /incorrect email or password/i],
      ['Email not confirmed', /confirm your account/i],
      ['invalid claim: missing sub claim', /session has expired/i],
      ['User already registered', /already exists/i],
      ['Password should be at least 6 characters', /at least 8/i],
      ['Password should be at least 8 characters', /at least 8/i],
      ['Password is too weak', /stronger password/i],
      ['Signups not allowed for this instance', /temporarily disabled/i],
      ['Email rate limit exceeded', /too many attempts/i],
      ['For security purposes, you can only request this after', /wait a moment/i],
      ['Token has expired or is invalid', /link has expired/i],
      ['New password should be different from the old password', /different from your current/i],
      ['Auth session missing', /session has expired/i],
      ['User not found', /incorrect email or password/i],
      ['Invalid otp', /code you entered is incorrect/i],
      ['OTP has expired', /code has expired/i],
      ['Unable to verify beta access. Please try again.', /verify beta access/i],
      ['This email is not on the beta allowlist.', /not on the beta allowlist/i],
      ['User creation failed', /creation failed/i],
      ['access_denied', /declined the sign-in/i],
    ];

    it.each(directCases)(
      'maps "%s" to a user-friendly message',
      (raw, expected) => {
        expect(mapAuthError(raw)).toMatch(expected);
      },
    );
  });

  // -----------------------------------------------------------------------
  // Partial / substring matches
  // -----------------------------------------------------------------------
  describe('partial matches (case-insensitive)', () => {
    it('matches when raw message contains extra context', () => {
      const msg = 'Error: Invalid login credentials — check your details';
      expect(mapAuthError(msg)).toMatch(/incorrect email or password/i);
    });

    it('matches with different casing', () => {
      expect(mapAuthError('EMAIL NOT CONFIRMED')).toMatch(/confirm your account/i);
    });

    it('matches embedded OTP error', () => {
      expect(mapAuthError('auth: Invalid otp provided by user')).toMatch(/code you entered is incorrect/i);
    });
  });

  // -----------------------------------------------------------------------
  // Rate-limit detection
  // -----------------------------------------------------------------------
  describe('rate-limit detection', () => {
    it('detects "rate limit" keyword', () => {
      expect(mapAuthError('rate limit hit on endpoint')).toMatch(/too many attempts/i);
    });

    it('detects "too many requests"', () => {
      expect(mapAuthError('429 Too Many Requests')).toMatch(/too many attempts/i);
    });
  });

  // -----------------------------------------------------------------------
  // Network-error detection
  // -----------------------------------------------------------------------
  describe('network-error detection', () => {
    it('detects fetch errors', () => {
      expect(mapAuthError('TypeError: Failed to fetch')).toMatch(/check your internet/i);
    });

    it('detects network keyword', () => {
      expect(mapAuthError('Network Error')).toMatch(/check your internet/i);
    });
  });

  // -----------------------------------------------------------------------
  // Fallback — raw messages NEVER leak
  // -----------------------------------------------------------------------
  describe('fallback safety', () => {
    it('returns generic message for unknown errors', () => {
      expect(mapAuthError('pgsql: relation "users" does not exist')).toBe(
        'Something went wrong. Please try again.',
      );
    });

    it('returns generic message for SQL injection attempts', () => {
      expect(mapAuthError("'; DROP TABLE users; --")).toBe(
        'Something went wrong. Please try again.',
      );
    });

    it('never exposes raw server stack traces', () => {
      const raw = 'Error at /auth/v1/token line 42: bcrypt comparison failed';
      const friendly = mapAuthError(raw);
      expect(friendly).not.toContain('bcrypt');
      expect(friendly).not.toContain('line 42');
    });
  });

  // -----------------------------------------------------------------------
  // Empty / null / undefined input
  // -----------------------------------------------------------------------
  describe('edge cases', () => {
    it('handles empty string', () => {
      expect(mapAuthError('')).toBe('Something went wrong. Please try again.');
    });

    it('handles null coerced to string', () => {
      expect(mapAuthError(null as any)).toBe('Something went wrong. Please try again.');
    });

    it('handles undefined coerced to string', () => {
      expect(mapAuthError(undefined as any)).toBe('Something went wrong. Please try again.');
    });
  });

  // -----------------------------------------------------------------------
  // No HTML/script in output (XSS safety)
  // -----------------------------------------------------------------------
  describe('XSS safety', () => {
    it('output contains no HTML tags even for crafted input', () => {
      const xss = '<script>alert("xss")</script>Invalid login credentials';
      const result = mapAuthError(xss);
      expect(result).not.toContain('<script>');
      // Should still match the partial "Invalid login credentials"
      expect(result).toMatch(/incorrect email or password/i);
    });
  });
});
