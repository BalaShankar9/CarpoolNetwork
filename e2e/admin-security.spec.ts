/**
 * Admin Security E2E Tests
 * Phase 1 Exit Criteria: Non-admin always blocked from admin
 * 
 * Tests:
 * 1. Non-admin cannot access /admin directly
 * 2. Non-admin redirected to /unauthorized 
 * 3. Admin nav not visible to non-admin users
 * 4. Admin can access admin routes
 */
import { test, expect, TEST_USERS, isE2EConfigured } from './fixtures';

test.skip(!isE2EConfigured, 'E2E env not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

test.describe('Admin Security Guards', () => {
  test.describe('Non-Admin User Restrictions', () => {
    test.beforeEach(async ({ auth }) => {
      // Log in as a regular (non-admin) user - using passenger account
      await auth.login(TEST_USERS.passenger);
    });

    test('non-admin cannot access /admin - redirects to /unauthorized', async ({ page }) => {
      // Try to navigate directly to admin dashboard
      await page.goto('/admin');
      
      // Should be redirected to /unauthorized
      await expect(page).toHaveURL(/unauthorized/, { timeout: 10000 });
    });

    test('non-admin cannot access /admin/users', async ({ page }) => {
      await page.goto('/admin/users');
      await expect(page).toHaveURL(/unauthorized/, { timeout: 10000 });
    });

    test('non-admin cannot access /admin/diagnostics', async ({ page }) => {
      await page.goto('/admin/diagnostics');
      await expect(page).toHaveURL(/unauthorized/, { timeout: 10000 });
    });

    test('non-admin cannot access /admin/feedback', async ({ page }) => {
      await page.goto('/admin/feedback');
      await expect(page).toHaveURL(/unauthorized/, { timeout: 10000 });
    });

    test('non-admin cannot access /admin/bugs', async ({ page }) => {
      await page.goto('/admin/bugs');
      await expect(page).toHaveURL(/unauthorized/, { timeout: 10000 });
    });

    test('non-admin cannot access /admin/safety', async ({ page }) => {
      await page.goto('/admin/safety');
      await expect(page).toHaveURL(/unauthorized/, { timeout: 10000 });
    });

    test('non-admin cannot access /admin/analytics', async ({ page }) => {
      await page.goto('/admin/analytics');
      await expect(page).toHaveURL(/unauthorized/, { timeout: 10000 });
    });

    test('non-admin cannot access /admin/bulk-operations', async ({ page }) => {
      await page.goto('/admin/bulk-operations');
      await expect(page).toHaveURL(/unauthorized/, { timeout: 10000 });
    });

    test('admin nav links NOT visible to non-admin', async ({ page }) => {
      // Navigate to home page
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Admin section should NOT be visible in sidebar
      await expect(page.locator('text=Admin').first()).not.toBeVisible({ timeout: 5000 });
      
      // Admin nav items should NOT be visible
      await expect(page.locator('a[href="/admin"]')).not.toBeVisible();
      await expect(page.locator('a[href="/admin/diagnostics"]')).not.toBeVisible();
      await expect(page.locator('a[href="/admin/users"]')).not.toBeVisible();
    });
  });

  test.describe('Admin User Access', () => {
    test.beforeEach(async ({ auth }) => {
      // Log in as admin user
      await auth.login(TEST_USERS.admin);
    });

    test('admin can access /admin dashboard', async ({ page }) => {
      await page.goto('/admin');
      
      // Should NOT redirect - should stay on admin page
      await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });
      
      // Should see admin dashboard content
      await expect(page.locator('text=Admin Dashboard')).toBeVisible({ timeout: 10000 });
    });

    test('admin can access /admin/users', async ({ page }) => {
      await page.goto('/admin/users');
      await expect(page).toHaveURL(/\/admin\/users/, { timeout: 10000 });
      await expect(page.locator('text=User Management')).toBeVisible({ timeout: 10000 });
    });

    test('admin can access /admin/diagnostics', async ({ page }) => {
      await page.goto('/admin/diagnostics');
      await expect(page).toHaveURL(/\/admin\/diagnostics/, { timeout: 10000 });
      await expect(page.locator('text=System Diagnostics')).toBeVisible({ timeout: 10000 });
    });

    test('admin nav links ARE visible to admin', async ({ page }) => {
      // Navigate to home page
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Admin section should be visible in sidebar (desktop)
      await expect(page.locator('text=Admin').first()).toBeVisible({ timeout: 10000 });
      
      // Admin nav items should be visible
      await expect(page.locator('a[href="/admin"]')).toBeVisible();
    });
  });

  test.describe('Unauthenticated User Restrictions', () => {
    test('unauthenticated user redirects to signin when accessing /admin', async ({ page }) => {
      // Make sure we're logged out
      await page.goto('/signin');
      
      // Try to access admin directly
      await page.goto('/admin');
      
      // Should redirect to signin
      await expect(page).toHaveURL(/signin/, { timeout: 10000 });
    });
  });

  test.describe('URL Manipulation Protection', () => {
    test.beforeEach(async ({ auth }) => {
      await auth.login(TEST_USERS.passenger);
    });

    test('cannot bypass admin check via query params', async ({ page }) => {
      await page.goto('/admin?bypass=true');
      await expect(page).toHaveURL(/unauthorized/, { timeout: 10000 });
    });

    test('cannot access nested admin routes', async ({ page }) => {
      await page.goto('/admin/safety/report/fake-id');
      await expect(page).toHaveURL(/unauthorized/, { timeout: 10000 });
    });

    test('cannot access admin notification templates', async ({ page }) => {
      await page.goto('/admin/notifications/templates');
      await expect(page).toHaveURL(/unauthorized/, { timeout: 10000 });
    });
  });
});
