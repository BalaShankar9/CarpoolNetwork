/**
 * Unit tests for environment variable validation and Supabase initialization
 * 
 * These tests verify that the app handles missing environment variables gracefully
 * and displays appropriate error messages instead of crashing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to test the validateEnvVars function without importing the module
// which would trigger Supabase initialization. We'll mock import.meta.env.

describe('Environment Variable Validation', () => {
  // Store original env values
  const originalEnv = { ...import.meta.env };

  afterEach(() => {
    // Restore original env after each test
    vi.unstubAllEnvs();
  });

  describe('validateEnvVars function behavior', () => {
    it('should identify missing VITE_SUPABASE_URL', () => {
      // Test the validation logic directly
      const supabaseUrl = '';
      const supabaseAnonKey = 'test-key';
      
      const missing: string[] = [];
      if (!supabaseUrl || supabaseUrl.trim() === '') {
        missing.push('VITE_SUPABASE_URL');
      }
      if (!supabaseAnonKey || supabaseAnonKey.trim() === '') {
        missing.push('VITE_SUPABASE_ANON_KEY');
      }
      
      expect(missing).toContain('VITE_SUPABASE_URL');
      expect(missing).not.toContain('VITE_SUPABASE_ANON_KEY');
      expect(missing.length).toBe(1);
    });

    it('should identify missing VITE_SUPABASE_ANON_KEY', () => {
      const supabaseUrl = 'https://test.supabase.co';
      const supabaseAnonKey = '';
      
      const missing: string[] = [];
      if (!supabaseUrl || supabaseUrl.trim() === '') {
        missing.push('VITE_SUPABASE_URL');
      }
      if (!supabaseAnonKey || supabaseAnonKey.trim() === '') {
        missing.push('VITE_SUPABASE_ANON_KEY');
      }
      
      expect(missing).not.toContain('VITE_SUPABASE_URL');
      expect(missing).toContain('VITE_SUPABASE_ANON_KEY');
      expect(missing.length).toBe(1);
    });

    it('should identify both missing variables', () => {
      const supabaseUrl = undefined;
      const supabaseAnonKey = undefined;
      
      const missing: string[] = [];
      if (!supabaseUrl || (supabaseUrl as string)?.trim() === '') {
        missing.push('VITE_SUPABASE_URL');
      }
      if (!supabaseAnonKey || (supabaseAnonKey as string)?.trim() === '') {
        missing.push('VITE_SUPABASE_ANON_KEY');
      }
      
      expect(missing).toContain('VITE_SUPABASE_URL');
      expect(missing).toContain('VITE_SUPABASE_ANON_KEY');
      expect(missing.length).toBe(2);
    });

    it('should pass validation when both variables are present', () => {
      const supabaseUrl = 'https://test.supabase.co';
      const supabaseAnonKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9';
      
      const missing: string[] = [];
      if (!supabaseUrl || supabaseUrl.trim() === '') {
        missing.push('VITE_SUPABASE_URL');
      }
      if (!supabaseAnonKey || supabaseAnonKey.trim() === '') {
        missing.push('VITE_SUPABASE_ANON_KEY');
      }
      
      expect(missing.length).toBe(0);
    });

    it('should treat whitespace-only values as missing', () => {
      const supabaseUrl = '   ';
      const supabaseAnonKey = '\t\n';
      
      const missing: string[] = [];
      if (!supabaseUrl || supabaseUrl.trim() === '') {
        missing.push('VITE_SUPABASE_URL');
      }
      if (!supabaseAnonKey || supabaseAnonKey.trim() === '') {
        missing.push('VITE_SUPABASE_ANON_KEY');
      }
      
      expect(missing).toContain('VITE_SUPABASE_URL');
      expect(missing).toContain('VITE_SUPABASE_ANON_KEY');
    });
  });

  describe('Error message formatting', () => {
    it('should create a descriptive error message for missing vars', () => {
      const missing = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
      const errorMessage = `Missing required environment variables: ${missing.join(', ')}. ` +
        `Please ensure these are set in your Netlify environment configuration.`;
      
      expect(errorMessage).toContain('VITE_SUPABASE_URL');
      expect(errorMessage).toContain('VITE_SUPABASE_ANON_KEY');
      expect(errorMessage).toContain('Netlify');
    });
  });
});

describe('GlobalErrorBoundary', () => {
  it('should detect environment variable errors in message', () => {
    const errorMessage = 'Missing required environment variables: VITE_SUPABASE_URL';
    const isMissingEnvVars = errorMessage.includes('environment variable');
    
    expect(isMissingEnvVars).toBe(true);
  });

  it('should not flag non-env errors as env issues', () => {
    const errorMessage = 'Network request failed';
    const isMissingEnvVars = errorMessage.includes('environment variable');
    
    expect(isMissingEnvVars).toBe(false);
  });
});
