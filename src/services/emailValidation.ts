const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface EmailValidationResult {
  valid: boolean;
  error?: string;
  message?: string;
}

export async function validateEmail(email: string): Promise<EmailValidationResult> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      return { valid: false, error: 'Email validation service unavailable. Please try again.' };
    }
    const data = await response.json();
    return { valid: !!data.valid, error: data.error };
  } catch (error) {
    console.error('Error validating email:', error);
    return {
      valid: false,
      error: 'Failed to validate email. Please try again.',
    };
  }
}
