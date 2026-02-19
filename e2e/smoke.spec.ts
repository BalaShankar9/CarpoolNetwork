import { test, expect, TEST_USERS, isE2EConfigured } from './fixtures';

test.skip(!isE2EConfigured, 'E2E env not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

test.describe('Smoke', () => {
  test('driver core routes render', async ({ page, auth }) => {
    test.setTimeout(5 * 60 * 1000);
    await auth.login(TEST_USERS.driver);

    const routes: Array<{ path: string; selector: string }> = [
      { path: '/', selector: 'h1:has-text("Welcome")' },
      { path: '/find-rides', selector: 'h1:has-text("Find a Ride")' },
      { path: '/post-ride', selector: 'h1:has-text("Post a Ride")' },
      { path: '/request-ride', selector: 'h1:has-text("Request a Ride")' },
      { path: '/my-rides', selector: 'h1:has-text("My Rides")' },
      { path: '/messages', selector: 'h2:has-text("Messages")' },
      { path: '/profile', selector: 'h1:has-text("Bala")' },
      { path: '/settings', selector: 'h1:has-text("Settings")' },
      { path: '/analytics', selector: 'h1:has-text("Analytics")' },
      { path: '/leaderboards', selector: 'h1:has-text("Leaderboard")' },
      { path: '/challenges', selector: 'h1:has-text("Challenge")' },
      { path: '/admin', selector: 'h1:has-text("Admin")' },
    ];

    for (const route of routes) {
      await page.goto(route.path);
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator(route.selector)).toBeVisible({ timeout: 15000 });
    }
  });

  test('passenger core routes render', async ({ page, auth }) => {
    test.setTimeout(5 * 60 * 1000);
    await auth.login(TEST_USERS.passenger);

    const routes: Array<{ path: string; selector: string }> = [
      { path: '/', selector: 'h1:has-text("Welcome")' },
      { path: '/find-rides', selector: 'h1:has-text("Find a Ride")' },
      { path: '/my-rides', selector: 'h1:has-text("My Rides")' },
      { path: '/messages', selector: 'h2:has-text("Messages")' },
      { path: '/profile', selector: 'h1:has-text("Bala")' },
      { path: '/settings', selector: 'h1:has-text("Settings")' },
      { path: '/leaderboards', selector: 'h1:has-text("Leaderboard")' },
      { path: '/challenges', selector: 'h1:has-text("Challenge")' },
    ];

    for (const route of routes) {
      await page.goto(route.path);
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator(route.selector)).toBeVisible({ timeout: 15000 });
    }
  });
});
