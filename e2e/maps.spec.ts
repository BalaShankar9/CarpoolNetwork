import { test, expect, TEST_USERS, isE2EConfigured } from './fixtures';

test.skip(!isE2EConfigured, 'E2E env not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

test.describe('Maps & Insights', () => {
  test('loads Google Maps for autocomplete', async ({ page, auth }) => {
    await auth.login(TEST_USERS.driver);
    await page.goto('/find-rides');

    const originInput = page
      .locator('#search-origin-input, input[placeholder*="From"], input[placeholder*="pickup"]')
      .first();
    await expect(originInput).toBeVisible({ timeout: 10000 });
    await originInput.fill('London');
    await page.waitForTimeout(500);

    await page.waitForFunction(
      () => Boolean((window as any).google && (window as any).google.maps && (window as any).google.maps.places),
      null,
      { timeout: 15000 }
    );

    const mapsReady = await page.evaluate(() => Boolean((window as any).google?.maps?.places));
    expect(mapsReady).toBeTruthy();

    await page.keyboard.press('Escape').catch(() => {});
  });

  test('renders trip insights on ride details', async ({ page, auth, rides }) => {
    test.setTimeout(5 * 60 * 1000);
    await auth.login(TEST_USERS.driver);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    await rides.postRide({
      origin: 'London',
      destination: 'Manchester',
      date: dateStr,
      time: '09:00',
      seats: 2,
      price: 20,
    });

    await page.goto('/my-rides');
    await page.waitForLoadState('networkidle');

    const viewButton = page.locator('button[title="View Details"], a[href*="/rides/"]').first();
    if (await viewButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await viewButton.click();
    }

    await page.waitForURL(/\/rides\//, { timeout: 15000 });
    await expect(page.locator('text=Route Information & Live Map')).toBeVisible({ timeout: 10000 });
    await page.waitForFunction(
      () => Boolean((window as any).google && (window as any).google.maps),
      null,
      { timeout: 15000 }
    );

    await expect(page.locator('text=Trip Insights & Route Options')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('h4:has-text("Weather")')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('h4:has-text("Air Quality")')).toBeVisible({ timeout: 20000 });
  });
});
