/**
 * emailValidation.spec.ts — Tests for email validation edge function client
 *
 * Tests: valid email, invalid email, service unavailable, network error,
 * response parsing.
 */
// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateEmail } from '../../src/services/emailValidation';

const originalFetch = globalThis.fetch;

describe('validateEmail', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns valid:true for deliverable email', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ valid: true }),
    });

    const result = await validateEmail('good@example.com');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('returns valid:false with error for undeliverable email', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ valid: false, error: 'Mailbox does not exist' }),
    });

    const result = await validateEmail('bad@invalid.test');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Mailbox does not exist');
  });

  it('returns service-unavailable message for non-200 response', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const result = await validateEmail('test@example.com');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/service unavailable/i);
  });

  it('returns network error message for fetch failure', async () => {
    (globalThis.fetch as any).mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await validateEmail('test@example.com');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/failed to validate/i);
  });

  it('sends correct headers with request', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ valid: true }),
    });

    await validateEmail('test@example.com');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/validate-email'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ email: 'test@example.com' }),
      }),
    );
  });

  it('coerces falsy valid field to false', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ valid: null }),
    });

    const result = await validateEmail('test@example.com');
    expect(result.valid).toBe(false);
  });
});
