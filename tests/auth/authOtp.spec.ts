/**
 * authOtp.spec.ts — Tests for OTP utility functions
 *
 * Tests: getAllowOtpSignups env logic, getOtpErrorMessage categorization.
 */
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to control import.meta.env — use dynamic imports with env stubs
describe('authOtp utilities', () => {
  // -----------------------------------------------------------------------
  // getOtpErrorMessage (pure function — can test directly)
  // -----------------------------------------------------------------------
  describe('getOtpErrorMessage', () => {
    let getOtpErrorMessage: typeof import('../../src/utils/authOtp').getOtpErrorMessage;

    beforeEach(async () => {
      const mod = await import('../../src/utils/authOtp');
      getOtpErrorMessage = mod.getOtpErrorMessage;
    });

    it('returns null for null/undefined error', () => {
      expect(getOtpErrorMessage(null, true)).toBeNull();
      expect(getOtpErrorMessage(undefined, true)).toBeNull();
    });

    // Signup-disabled detection
    it('detects "signups not allowed for otp" message', () => {
      const err = { message: 'Signups not allowed for otp' };
      const result = getOtpErrorMessage(err, true);
      expect(result).toMatch(/signups are currently disabled/i);
    });

    it('detects "signups not allowed" partial match', () => {
      const err = { message: 'Signups not allowed' };
      expect(getOtpErrorMessage(err, true)).toMatch(/signups are currently disabled/i);
    });

    it('detects signup_disabled code', () => {
      const err = { code: 'signup_disabled', message: 'unknown' };
      expect(getOtpErrorMessage(err, true)).toMatch(/signups are currently disabled/i);
    });

    it('detects 403 status code', () => {
      const err = { status: 403, message: 'Forbidden' };
      expect(getOtpErrorMessage(err, true)).toMatch(/signups are currently disabled/i);
    });

    // Rate-limit detection
    it('detects rate limit errors', () => {
      const err = { message: 'Rate limit exceeded for this endpoint' };
      expect(getOtpErrorMessage(err, true)).toMatch(/too many attempts/i);
    });

    // Provider not configured (only when signups allowed)
    it('detects provider-not-configured when signups allowed', () => {
      const err = { message: 'Phone provider is not enabled for this project' };
      expect(getOtpErrorMessage(err, true)).toMatch(/OTP is not configured/i);
    });

    it('does NOT show config hint when signups are NOT allowed', () => {
      const err = { message: 'Phone provider is not enabled for this project' };
      // When allowOtpSignups is false, this specific branch is skipped
      expect(getOtpErrorMessage(err, false)).toBeNull();
    });

    // Error type handling
    it('handles Error instances', () => {
      expect(getOtpErrorMessage(new Error('Signups not allowed'), true)).toMatch(/disabled/i);
    });

    it('handles plain strings', () => {
      expect(getOtpErrorMessage('rate limit exceeded', true)).toMatch(/too many attempts/i);
    });

    // Unknown errors → null (caller handles)
    it('returns null for unrecognized errors', () => {
      expect(getOtpErrorMessage({ message: 'Something unexpected' }, true)).toBeNull();
    });
  });
});
