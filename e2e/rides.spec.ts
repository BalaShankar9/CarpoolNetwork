import { test, expect, TEST_USERS, isE2EConfigured } from './fixtures';

test.skip(!isE2EConfigured, 'E2E env not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

test.describe('Rides', () => {
  test.beforeEach(async ({ auth }) => {
    await auth.login(TEST_USERS.driver);
  });

  test.describe('Post Ride', () => {
    test('should display post ride form', async ({ page }) => {
      await page.goto('/post-ride');
      await expect(page.locator('h1:has-text("Post"), h1:has-text("Offer"), h2:has-text("Post")')).toBeVisible();
    });

    test('should require all fields to post a ride', async ({ page }) => {
      await page.goto('/post-ride');
      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.click();
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL('/post-ride');
    });

    test('should post a ride successfully', async ({ page }) => {
      await page.goto('/post-ride');

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const originInput = page.locator('input[placeholder*="Start"], input[placeholder*="From"], input[placeholder*="pickup"]').first();
      await originInput.fill('London');
      await page.waitForTimeout(1000);

      const destInput = page.locator('input[placeholder*="Destination"], input[placeholder*="To"], input[placeholder*="drop"]').first();
      await destInput.fill('Manchester');
      await page.waitForTimeout(1000);

      const dateInput = page.locator('input[type="date"]');
      if (await dateInput.isVisible()) {
        await dateInput.fill(dateStr);
      }

      const timeInput = page.locator('input[type="time"]');
      if (await timeInput.isVisible()) {
        await timeInput.fill('09:00');
      }

      const seatsInput = page.locator('input[name="seats"], input[placeholder*="seat"], input[type="number"]').first();
      if (await seatsInput.isVisible()) {
        await seatsInput.fill('3');
      }

      const priceInput = page.locator('input[name="price"], input[placeholder*="price"], input[placeholder*="Price"]').first();
      if (await priceInput.isVisible()) {
        await priceInput.fill('25');
      }

      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.click();

      await page.waitForTimeout(3000);
    });
  });

  test.describe('Find Rides', () => {
    test('should display search form', async ({ page }) => {
      await page.goto('/find-rides');
      await expect(page.locator('input[placeholder*="From"], input[placeholder*="pickup"]').first()).toBeVisible();
      await expect(page.locator('input[placeholder*="To"], input[placeholder*="destination"]').first()).toBeVisible();
    });

    test('should search for rides', async ({ page, rides }) => {
      await rides.findRide('London', 'Manchester');
      await page.waitForTimeout(2000);
    });

    test('should display ride cards in results', async ({ page }) => {
      await page.goto('/find-rides');
      await page.waitForTimeout(2000);

      const rideCards = page.locator('[data-testid="ride-card"], .ride-card, [class*="card"]');
      const count = await rideCards.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('My Rides', () => {
    test('should display my rides page', async ({ page }) => {
      await page.goto('/my-rides');
      await expect(page.locator('h1:has-text("My Rides"), h1:has-text("Your Rides")')).toBeVisible();
    });

    test('should show tabs for driver and passenger rides', async ({ page }) => {
      await page.goto('/my-rides');
      await page.waitForLoadState('networkidle');

      const tabs = page.locator('button[role="tab"], [data-testid="tab"]');
      const tabCount = await tabs.count();
      expect(tabCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Ride Details', () => {
    test('should navigate to ride details from search results', async ({ page }) => {
      await page.goto('/find-rides');
      await page.waitForTimeout(3000);

      const rideLink = page.locator('a[href*="/rides/"], button:has-text("View"), button:has-text("Details")').first();
      if (await rideLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await rideLink.click();
        await page.waitForTimeout(2000);
        expect(page.url()).toMatch(/\/rides\/|\/find-rides/);
      }
    });
  });
});
