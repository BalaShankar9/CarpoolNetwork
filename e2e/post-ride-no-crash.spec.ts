import { expect, test, TEST_USERS } from './fixtures';

test.describe('Post Ride stability', () => {
  test('does not crash ErrorBoundary when posting a ride', async ({ page, auth }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    await auth.login(TEST_USERS.driver);

    await page.goto('/post-ride');
    await page.waitForLoadState('networkidle');

    // Fill origin/destination using plain inputs (fallback works even if Maps fails)
    await page.fill('#origin-input, [data-testid="origin-input"], input[placeholder*="pickup"]', 'London Bridge');
    await page.fill('#destination-input, [data-testid="destination-input"], input[placeholder*="Destination"]', 'Oxford Street');

    // Ensure a time is selected (component sets a default, but guard against empty)
    const timeSelect = page.locator('select').filter({ hasText: '' }).first();
    if (await timeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      const currentValue = await timeSelect.inputValue();
      if (!currentValue) {
        await timeSelect.selectOption({ index: 1 });
      }
    }

    // Submit
    await page.getByRole('button', { name: /Post Ride/i }).click();

    // Expect either success toast/state or inline validation, but no crash screen
    await expect(page.locator('text=Something Went Wrong')).toBeHidden({ timeout: 10000 });

    // If error message is shown, it should be the inline validation (not crash)
    const inlineError = page.locator('text=Failed to post ride').or(page.locator('text=Please add a vehicle'));
    if (await inlineError.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(inlineError).toBeVisible();
    } else {
      // Otherwise, expect navigation or success banner
      await expect(page.locator('text=Ride posted successfully').or(page.locator('text=Redirecting to your rides'))).toBeVisible({ timeout: 10000 });
    }

    expect(pageErrors, 'No uncaught errors should hit the ErrorBoundary').toHaveLength(0);
  });
});
