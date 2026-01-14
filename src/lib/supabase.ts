import { createClient, SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// Environment Variable Validation
// =============================================================================

export interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  supabaseUrl: string | undefined;
  supabaseAnonKey: string | undefined;
}

/**
 * Validates that required environment variables are present.
 * Returns a result object instead of throwing to allow graceful error handling.
 */
export function validateEnvVars(): EnvValidationResult {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  const missing: string[] = [];
  
  if (!supabaseUrl || supabaseUrl.trim() === '') {
    missing.push('VITE_SUPABASE_URL');
  }
  
  if (!supabaseAnonKey || supabaseAnonKey.trim() === '') {
    missing.push('VITE_SUPABASE_ANON_KEY');
  }
  
  return {
    valid: missing.length === 0,
    missing,
    supabaseUrl,
    supabaseAnonKey,
  };
}

// =============================================================================
// Supabase Client Initialization
// =============================================================================

const envValidation = validateEnvVars();

// Track initialization error for use by GlobalErrorBoundary
export let supabaseInitError: Error | null = null;

// Create a placeholder client or real client based on env validation
let supabaseClient: SupabaseClient;

if (envValidation.valid) {
  supabaseClient = createClient(
    envValidation.supabaseUrl!,
    envValidation.supabaseAnonKey!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );
} else {
  // Store the error for the GlobalErrorBoundary to display
  supabaseInitError = new Error(
    `Missing required environment variables: ${envValidation.missing.join(', ')}. ` +
    `Please ensure these are set in your Netlify environment configuration.`
  );
  
  // Create a mock client that throws on any operation
  // This prevents crashes during import while allowing ErrorBoundary to catch usage
  supabaseClient = new Proxy({} as SupabaseClient, {
    get(_, prop) {
      if (prop === 'then') return undefined; // Prevent Promise-like behavior
      return () => {
        throw supabaseInitError;
      };
    },
  });
}

export const supabase = supabaseClient;

/**
 * Check if Supabase is properly initialized.
 * Use this before making Supabase calls if you need graceful handling.
 */
export function isSupabaseInitialized(): boolean {
  return envValidation.valid;
}
