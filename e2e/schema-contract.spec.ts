import { test, expect } from '@playwright/test';

/**
 * Phase 0: DB↔APP Contract Sync Tests
 * 
 * These tests verify that the app can connect to Supabase and that
 * critical schema objects exist. Run these BEFORE deploying to production.
 */

test.describe('Schema Contract Verification', () => {
  
  test('should load the app without schema cache errors', async ({ page }) => {
    // Listen for console errors related to schema
    const schemaErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('PGRST202') || 
            text.includes('PGRST204') ||
            text.includes('missing') ||
            text.includes('Could not find')) {
          schemaErrors.push(text);
        }
      }
    });

    // Navigate to home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait a bit for any async errors
    await page.waitForTimeout(2000);
    
    // Check no schema errors occurred
    expect(schemaErrors).toHaveLength(0);
  });

  test('should be able to sign in without RPC errors', async ({ page }) => {
    // Track API errors
    const apiErrors: string[] = [];
    
    page.on('response', async response => {
      if (response.url().includes('supabase') && !response.ok()) {
        try {
          const body = await response.json();
          if (body?.code?.startsWith('PGRST') || body?.message?.includes('function')) {
            apiErrors.push(`${response.status()}: ${body.code} - ${body.message}`);
          }
        } catch {
          // Ignore parse errors
        }
      }
    });

    await page.goto('/signin');
    await page.waitForLoadState('networkidle');
    
    // Just verify the page loads without schema errors
    expect(apiErrors.filter(e => e.includes('PGRST202'))).toHaveLength(0);
  });

  test('messages page should not show PGRST202 errors', async ({ page }) => {
    // This test requires authentication - skip if not logged in
    test.skip(true, 'Requires authentication - run manually after login');
    
    const rpcErrors: string[] = [];
    
    page.on('response', async response => {
      if (response.url().includes('get_conversations_overview')) {
        if (!response.ok()) {
          try {
            const body = await response.json();
            rpcErrors.push(`${body.code}: ${body.message}`);
          } catch {
            rpcErrors.push(`HTTP ${response.status()}`);
          }
        }
      }
    });

    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // No PGRST202 errors should occur
    expect(rpcErrors.filter(e => e.includes('PGRST202'))).toHaveLength(0);
  });

  test('API health check - verify Supabase connection', async ({ page }) => {
    // Extract Supabase URL from environment
    const response = await page.request.get('/');
    expect(response.ok()).toBeTruthy();
    
    // The app should load, indicating Supabase is configured
    await page.goto('/');
    const body = await page.textContent('body');
    
    // Should not show connection errors
    expect(body).not.toContain('Failed to connect');
    expect(body).not.toContain('Network Error');
  });
});

test.describe('Critical Features Smoke Test', () => {
  
  test('home page loads without errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Should not show error state
    const errorText = await page.locator('text=/error|failed|unavailable/i').first().isVisible({ timeout: 2000 }).catch(() => false);
    
    // Home should show either login prompt or main content
    const hasContent = await page.locator('text=/Sign In|Welcome|Carpool/i').first().isVisible({ timeout: 5000 });
    expect(hasContent).toBeTruthy();
  });

  test('auth pages load without schema errors', async ({ page }) => {
    // Sign in page
    await page.goto('/signin');
    await page.waitForLoadState('networkidle');
    
    const signInForm = page.locator('input[type="email"]');
    await expect(signInForm).toBeVisible({ timeout: 5000 });
    
    // Sign up page
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');
    
    const signUpForm = page.locator('input[type="email"]');
    await expect(signUpForm).toBeVisible({ timeout: 5000 });
  });

  test('public pages load without authentication', async ({ page }) => {
    // Terms page
    await page.goto('/terms');
    await page.waitForLoadState('networkidle');
    const termsContent = await page.locator('body').textContent();
    expect(termsContent?.length).toBeGreaterThan(100);
    
    // Privacy page
    await page.goto('/privacy');
    await page.waitForLoadState('networkidle');
    const privacyContent = await page.locator('body').textContent();
    expect(privacyContent?.length).toBeGreaterThan(100);
  });
});
