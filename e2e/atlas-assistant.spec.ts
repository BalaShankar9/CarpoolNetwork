import { test, expect, TEST_USERS, isE2EConfigured } from './fixtures';

test.skip(!isE2EConfigured, 'E2E env not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

test.describe('Atlas assistant', () => {
  test('can open, chat (mocked), and navigate via actions', async ({ page, auth }) => {
    test.setTimeout(3 * 60 * 1000);
    await auth.login(TEST_USERS.passenger);

    await page.route('**/.netlify/functions/ai-router', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: 'Sure — taking you to Find Rides.',
          actions: [{ type: 'NAVIGATE', params: { path: '/find-rides' } }],
        }),
      });
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await page.getByLabel(/Open Atlas/i).click();
    await expect(page.getByRole('heading', { name: /Atlas/i })).toBeVisible({ timeout: 15000 });

    const input = page.locator('input[placeholder^="Ask "]').first();
    await expect(input).toBeVisible({ timeout: 15000 });
    await input.fill('Take me to find rides');
    await input.press('Enter');

    await expect(page.locator('text=Sure — taking you to Find Rides.')).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/\/find-rides/, { timeout: 15000 });

    // Widget typically closes on navigation; ensure page content rendered.
    await expect(page.locator('h1:has-text("Find a Ride")')).toBeVisible({ timeout: 15000 });
  });
});
