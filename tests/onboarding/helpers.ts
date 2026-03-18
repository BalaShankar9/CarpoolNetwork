import { vi } from 'vitest';

/* ------------------------------------------------------------------ */
/*  Fake IDs & user                                                    */
/* ------------------------------------------------------------------ */
export const FAKE_USER_ID = 'user-onb-001';
export const FAKE_USER = { id: FAKE_USER_ID, email: 'onboard@test.com' };

/* ------------------------------------------------------------------ */
/*  Fake profile data (returned by supabase select)                    */
/* ------------------------------------------------------------------ */
export const FAKE_PROFILE = {
  full_name: 'Test Driver',
  phone_e164: '+447700900000',
  city: 'London',
  bio: 'I love carpooling',
};

/* ------------------------------------------------------------------ */
/*  Fake country for PhoneVerificationStep                             */
/* ------------------------------------------------------------------ */
export const FAKE_DEFAULT_COUNTRY = {
  code: 'GB',
  name: 'United Kingdom',
  dialCode: '+44',
  flag: '🇬🇧',
};

export const FAKE_COUNTRIES = [
  FAKE_DEFAULT_COUNTRY,
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸' },
];

/* ------------------------------------------------------------------ */
/*  buildMockChain — reusable Supabase chain builder                   */
/* ------------------------------------------------------------------ */
export function buildMockChain(resolvedData: any = null, error: any = null) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: resolvedData, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data: resolvedData, error }),
    then: undefined as any,
  };
  // Make the chain itself thenable for await without .single()
  chain.then = (resolve: any) =>
    resolve({ data: Array.isArray(resolvedData) ? resolvedData : [resolvedData].filter(Boolean), error });
  return chain;
}
