/**
 * Maps raw Supabase auth error messages to user-friendly messages.
 * Prevents leaking internal details (e.g. whether an email exists).
 */

const ERROR_MAP: Record<string, string> = {
  'Invalid login credentials': 'Incorrect email or password. Please try again.',
  'Email not confirmed': 'Please check your email and confirm your account before signing in.',
  'invalid claim: missing sub claim': 'Your session has expired. Please sign in again.',
  'User already registered': 'An account with this email already exists. Try signing in instead.',
  'Password should be at least 6 characters': 'Password must be at least 6 characters long.',
  'Signups not allowed for this instance': 'New registrations are temporarily disabled. Please try again later.',
  'Email rate limit exceeded': 'Too many attempts. Please wait a few minutes before trying again.',
  'For security purposes, you can only request this after': 'Please wait a moment before trying again.',
  'Token has expired or is invalid': 'This link has expired. Please request a new one.',
  'New password should be different from the old password': 'Your new password must be different from your current password.',
  'Auth session missing': 'Your session has expired. Please sign in again.',
  'User not found': 'Incorrect email or password. Please try again.',
  'Invalid otp': 'The code you entered is incorrect. Please check and try again.',
  'OTP has expired': 'This code has expired. Please request a new one.',
};

export function mapAuthError(rawMessage: string): string {
  // Direct match
  if (ERROR_MAP[rawMessage]) return ERROR_MAP[rawMessage];

  // Partial match (some Supabase errors include extra context)
  for (const [key, friendly] of Object.entries(ERROR_MAP)) {
    if (rawMessage.toLowerCase().includes(key.toLowerCase())) {
      return friendly;
    }
  }

  // Rate limit messages from Supabase
  if (rawMessage.toLowerCase().includes('rate limit') || rawMessage.toLowerCase().includes('too many requests')) {
    return 'Too many attempts. Please wait a few minutes before trying again.';
  }

  // Network errors
  if (rawMessage.toLowerCase().includes('fetch') || rawMessage.toLowerCase().includes('network')) {
    return 'Unable to connect. Please check your internet connection and try again.';
  }

  // Fallback — don't leak raw error details
  return 'Something went wrong. Please try again.';
}
