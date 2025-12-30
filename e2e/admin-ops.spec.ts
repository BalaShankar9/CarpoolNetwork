import { test, expect, TEST_USERS, isE2EConfigured } from './fixtures';

test.skip(!isE2EConfigured, 'E2E env not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

test.describe('Admin Ops', () => {
  test('loads bulk operations and analytics pages', async ({ page, auth }) => {
    await auth.login(TEST_USERS.admin);

    await page.goto('/admin/bulk-operations');
    await expect(page.locator('text=Bulk Operations')).toBeVisible({ timeout: 15000 });

    await page.goto('/admin/analytics');
    await expect(page.locator('text=Advanced Analytics')).toBeVisible({ timeout: 15000 });
    const metricCards = page.locator('[role="button"]');
    await expect(metricCards.first()).toBeVisible({ timeout: 10000 });
  });
});
