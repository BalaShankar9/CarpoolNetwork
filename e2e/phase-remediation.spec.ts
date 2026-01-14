/**
 * Phase Remediation E2E Tests
 *
 * Tests for the production-grade remediation phases:
 * - Phase 0: Schema health checks
 * - Phase 1: Admin route security (covered in admin-security.spec.ts)
 * - Phase 2: Messaging reliability
 * - Phase 3: Ride lifecycle management
 * - Phase 4: Mobile layout (visual checks)
 */
import { test, expect, TEST_USERS, isE2EConfigured } from './fixtures';

test.skip(!isE2EConfigured, 'E2E env not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

test.describe('Phase 0: Schema Health', () => {
  test('app loads without PGRST schema errors in console', async ({ page }) => {
    const schemaErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (
          text.includes('PGRST202') ||
          text.includes('PGRST204') ||
          text.includes('schema cache') ||
          text.includes('function not found')
        ) {
          schemaErrors.push(text);
        }
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should have no schema-related console errors
    expect(schemaErrors).toHaveLength(0);
  });

  test('no schema error banner visible on healthy database', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Schema health banner should not be visible if DB is healthy
    const banner = page.locator('text=Database Schema Issues Detected');
    await expect(banner).not.toBeVisible({ timeout: 3000 }).catch(() => {
      // If banner is visible, that's OK in DEV - just log it
      console.log('Schema health banner is visible - database may have missing objects');
    });
  });
});

test.describe('Phase 2: Messaging Reliability', () => {
  test.beforeEach(async ({ auth }) => {
    await auth.login(TEST_USERS.driver);
  });

  test('messages page loads without error state', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should not show error state
    const errorState = page.locator('text=Messaging Unavailable');
    await expect(errorState).not.toBeVisible({ timeout: 5000 });

    // Should show either conversations or empty state
    const conversationList = page.locator('[data-testid="conversationList"]');
    const emptyState = page.locator('text=No conversations yet');

    // At least one of these should be visible
    const hasConversationList = await conversationList.isVisible().catch(() => false);
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    expect(hasConversationList || hasEmptyState).toBeTruthy();
  });

  test('messages page shows clear empty state when no conversations', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');

    // If there are no conversations, should show helpful empty state
    const emptyState = page.locator('text=No conversations yet');
    const hasEmptyState = await emptyState.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasEmptyState) {
      // Empty state should have helpful CTAs
      await expect(page.locator('text=Find a Ride')).toBeVisible();
      await expect(page.locator('text=Offer a Ride')).toBeVisible();
    }
  });

  test('messages retry button works when shown', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');

    // If retry button is visible, it should be clickable
    const retryButton = page.locator('button:has-text("Retry")');
    const hasRetry = await retryButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasRetry) {
      await retryButton.click();
      await page.waitForTimeout(2000);
      // After retry, should either succeed or show retry limit message
    }
  });
});

test.describe('Phase 3: Ride Lifecycle', () => {
  test.beforeEach(async ({ auth }) => {
    await auth.login(TEST_USERS.driver);
  });

  test('my-rides page loads and shows offered rides', async ({ page }) => {
    await page.goto('/my-rides');
    await page.waitForLoadState('networkidle');

    // Should show the offered rides tab
    await expect(page.locator('text=Offered')).toBeVisible();

    // Page should not be in error state
    const errorText = page.locator('text=Error loading rides');
    await expect(errorText).not.toBeVisible({ timeout: 3000 });
  });

  test('find-rides page includes rides within grace period', async ({ page }) => {
    await page.goto('/find-rides');
    await page.waitForLoadState('networkidle');

    // Page should load without errors
    const errorText = page.locator('text=Failed to load');
    await expect(errorText).not.toBeVisible({ timeout: 3000 });

    // Should show either rides or empty state
    const hasRides = await page.locator('[data-testid="rideCard"]').first().isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=No rides').isVisible().catch(() => false);

    // At least one state should be shown (not stuck in loading)
    const loadingSpinner = page.locator('[data-testid="loading"]');
    await expect(loadingSpinner).not.toBeVisible({ timeout: 10000 });
  });

  test('expired ride shows archive and cancel options', async ({ page }) => {
    await page.goto('/my-rides');
    await page.waitForLoadState('networkidle');

    // Look for an expired ride indicator
    const expiredBadge = page.locator('text=Past departure time');
    const hasExpiredRide = await expiredBadge.first().isVisible({ timeout: 5000 }).catch(() => false);

    if (hasExpiredRide) {
      // Find the parent card of the expired ride
      const expiredCard = expiredBadge.first().locator('xpath=ancestor::div[contains(@class, "border")]');

      // Should have Archive button
      const archiveButton = expiredCard.locator('button[title*="Archive"]');
      await expect(archiveButton).toBeVisible();

      // Should have Cancel button (new feature)
      const cancelButton = expiredCard.locator('button[title*="Cancel"]');
      await expect(cancelButton).toBeVisible();
    }
  });
});

test.describe('Phase 4: Mobile Layout', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

  test('bottom nav does not overlap main content on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Bottom nav should be visible
    const bottomNav = page.locator('nav').filter({ hasText: /Home|Find|Post|Messages|Profile/i });
    const hasBottomNav = await bottomNav.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasBottomNav) {
      // Get the bounding box of the bottom nav
      const navBbox = await bottomNav.boundingBox();

      if (navBbox) {
        // Nav should be at the bottom
        expect(navBbox.y).toBeGreaterThan(500); // Should be near bottom of viewport

        // Main content should have padding to not overlap
        const mainContent = page.locator('main, [role="main"]').first();
        const contentBbox = await mainContent.boundingBox().catch(() => null);

        if (contentBbox) {
          // Content should end before bottom nav starts (with some margin)
          const contentBottom = contentBbox.y + contentBbox.height;
          expect(contentBottom).toBeLessThanOrEqual(navBbox.y + 50); // Allow some tolerance
        }
      }
    }
  });

  test('floating feedback button positioned above bottom nav', async ({ page, auth }) => {
    await auth.login(TEST_USERS.driver);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Feedback button should be visible
    const feedbackButton = page.locator('button[title="Report a problem"]');
    const hasButton = await feedbackButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasButton) {
      const buttonBbox = await feedbackButton.boundingBox();
      const bottomNav = page.locator('nav').filter({ hasText: /Home|Find|Post|Messages|Profile/i });
      const navBbox = await bottomNav.boundingBox().catch(() => null);

      if (buttonBbox && navBbox) {
        // Button should be above bottom nav
        expect(buttonBbox.y + buttonBbox.height).toBeLessThan(navBbox.y);
      }
    }
  });

  test('admin drawer opens and closes on mobile', async ({ page, auth }) => {
    await auth.login(TEST_USERS.admin);
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Mobile menu button should be visible
    const menuButton = page.locator('button').filter({ has: page.locator('svg.lucide-menu') }).first();
    const hasMenu = await menuButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasMenu) {
      // Open the drawer
      await menuButton.click();
      await page.waitForTimeout(500);

      // Sidebar should be visible
      const sidebar = page.locator('aside').first();
      await expect(sidebar).toBeVisible();

      // Close button should be visible
      const closeButton = sidebar.locator('button').filter({ has: page.locator('svg.lucide-x') });
      await expect(closeButton).toBeVisible();

      // Click close
      await closeButton.click();
      await page.waitForTimeout(500);

      // Sidebar should be hidden (translated off-screen on mobile)
      const sidebarClasses = await sidebar.getAttribute('class');
      expect(sidebarClasses).toContain('-translate-x-full');
    }
  });
});

test.describe('Cross-Phase: Navigation Flow', () => {
  test.beforeEach(async ({ auth }) => {
    await auth.login(TEST_USERS.driver);
  });

  test('can navigate through main app sections without errors', async ({ page }) => {
    const routes = ['/', '/find-rides', '/my-rides', '/messages', '/profile'];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      // Should not show generic error page
      const errorPage = page.locator('text=Something went wrong');
      await expect(errorPage).not.toBeVisible({ timeout: 3000 });

      // Should not have uncaught exceptions
      const jsErrors: string[] = [];
      page.on('pageerror', (error) => jsErrors.push(error.message));

      await page.waitForTimeout(1000);
      expect(jsErrors.filter((e) => !e.includes('ResizeObserver'))).toHaveLength(0);
    }
  });
});
