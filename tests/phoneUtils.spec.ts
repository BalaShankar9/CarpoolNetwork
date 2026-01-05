import { describe, expect, it } from 'vitest';
import { normalizePhoneNumber } from '../src/utils/phone';

describe('normalizePhoneNumber', () => {
  it('accepts an already formatted E.164 number', () => {
    const result = normalizePhoneNumber('+447700900000');
    expect(result.isValid).toBe(true);
    expect(result.e164).toBe('+447700900000');
  });

  it('combines a country code with a local number', () => {
    const result = normalizePhoneNumber('07700900000', '+44');
    expect(result.isValid).toBe(true);
    expect(result.e164).toBe('+447700900000');
  });

  it('rejects invalid numbers', () => {
    const result = normalizePhoneNumber('123');
    expect(result.isValid).toBe(false);
    expect(result.e164).toBeNull();
  });
});
