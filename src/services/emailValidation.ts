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
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error validating email:', error);
    return {
      valid: false,
      error: 'Failed to validate email. Please try again.',
    };
  }
}
