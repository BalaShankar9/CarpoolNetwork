export type PhoneNormalizationResult = {
  e164: string | null;
  isValid: boolean;
  error?: string;
};

export function normalizePhoneNumber(input: string, countryCode?: string): PhoneNormalizationResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { e164: null, isValid: false, error: 'Phone number is required.' };
  }

  const digits = trimmed.replace(/\D/g, '');
  const countryDigits = (countryCode || '').replace(/\D/g, '');
  let e164 = '';

  if (trimmed.startsWith('+')) {
    e164 = `+${digits}`;
  } else if (countryDigits) {
    const localDigits = digits.replace(/^0+/, '');
    e164 = `+${countryDigits}${localDigits}`;
  }

  if (!e164) {
    return {
      e164: null,
      isValid: false,
      error: 'Include a country code (e.g., +44 7700 900000).',
    };
  }

  if (!/^\+\d{8,15}$/.test(e164)) {
    return {
      e164: null,
      isValid: false,
      error: 'Enter a valid phone number with country code (e.g., +44 7700 900000).',
    };
  }

  return { e164, isValid: true };
}
