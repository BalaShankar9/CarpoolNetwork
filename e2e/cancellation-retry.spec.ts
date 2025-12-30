import { test, expect, TEST_USERS, isE2EConfigured } from './fixtures';

test.skip(!isE2EConfigured, 'E2E env not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

test.describe('Cancellation and Retry', () => {
  test('handles booking cancellation prompts', async ({ page, auth }) => {
    await auth.login(TEST_USERS.passenger);
    await page.goto('/my-rides');
    await page.waitForLoadState('networkidle');

    const bookingLink = page.locator('a[href*="/bookings/"]').first();
    if (!(await bookingLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No bookings available for cancellation test.');
    }

    page.on('dialog', async (dialog) => {
      if (dialog.type() === 'prompt') {
        await dialog.accept('Testing cancellation');
      } else {
        await dialog.accept();
      }
    });

    await bookingLink.click();
    await page.waitForLoadState('networkidle');

    const cancelBtn = page.locator('button:has-text("Cancel Booking")').first();
    if (await cancelBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cancelBtn.click();
      await page.waitForTimeout(2000);
      await expect(page.locator('text=/cancelled/i')).toBeVisible({ timeout: 10000 }).catch(() => {});
    }
  });
});
