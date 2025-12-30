import { test, expect, TEST_USERS, isE2EConfigured } from './fixtures';

test.skip(!isE2EConfigured, 'E2E env not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

test.describe('Network Resilience', () => {
  test('shows offline banner when network drops', async ({ page, auth }) => {
    await auth.login(TEST_USERS.passenger);
    await expect(page.locator('text=Welcome')).toBeVisible({ timeout: 10000 });
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await expect(page.locator('text=You\'re offline')).toBeVisible({ timeout: 10000 });

    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(page.locator('text=You\'re offline')).toBeHidden({ timeout: 10000 });
  });
});
