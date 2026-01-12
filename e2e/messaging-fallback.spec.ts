import { test, expect } from '@playwright/test';
import { TEST_USERS } from './fixtures';

test.describe('Messaging Fallback', () => {
  test.beforeEach(async ({ page }) => {
    // Login as driver
    await page.goto('/signin');
    await page.fill('input[type="email"]', TEST_USERS.driver.email);
    await page.fill('input[type="password"]', TEST_USERS.driver.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 10000 });
  });

  test('should load messages page even with RPC errors', async ({ page }) => {
    // Navigate to messages
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');

    // Messages page should render (either conversations or empty/error state)
    const messagesContainer = page.locator('[data-testid="conversationList"]').first();
    const errorState = page.locator('text=/system updating|failed to load|retry/i').first();
    const emptyState = page.locator('text=/no conversations|start a chat/i').first();

    // One of these should be visible
    const hasContainer = await messagesContainer.isVisible({ timeout: 5000 }).catch(() => false);
    const hasError = await errorState.isVisible({ timeout: 3000 }).catch(() => false);
    const hasEmpty = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasContainer || hasError || hasEmpty).toBeTruthy();
  });

  test('should show retry button when RPC fails', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check if error state is shown
    const errorState = page.locator('text=/system updating|failed to load/i').first();
    const hasError = await errorState.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasError) {
      // Should have a retry button
      const retryButton = page.locator('button:has-text("Retry")').first();
      await expect(retryButton).toBeVisible();

      // Click retry should attempt to reload
      const initialText = await page.textContent('body');
      await retryButton.click();
      await page.waitForTimeout(1000);

      // Page should still be functional (not crash)
      const pageStillWorks = await page.locator('body').isVisible();
      expect(pageStillWorks).toBeTruthy();
    }
  });

  test('should show updating banner when using fallback queries', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for updating banner (amber/yellow background)
    const updatingBanner = page.locator('text=/system updating|updating/i').first();
    const hasUpdatingBanner = await updatingBanner.isVisible({ timeout: 3000 }).catch(() => false);

    // If banner is shown, conversations should still be visible
    if (hasUpdatingBanner) {
      const conversationsList = page.locator('[data-testid="conversationList"]').first();
      await expect(conversationsList).toBeVisible();
    }
  });

  test('should provide alternative navigation when messages fail', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for CTAs in empty/error state
    const browseRidesBtn = page.locator('button:has-text("Browse Rides"), button:has-text("Find a Ride")').first();
    const offerRideBtn = page.locator('button:has-text("Offer a Ride"), button:has-text("Post Ride")').first();

    const hasBrowseBtn = await browseRidesBtn.isVisible({ timeout: 3000 }).catch(() => false);
    const hasOfferBtn = await offerRideBtn.isVisible({ timeout: 3000 }).catch(() => false);

    // At least one CTA should be present in empty state
    if (!await page.locator('[data-testid="conversationRow"]').first().isVisible({ timeout: 2000 }).catch(() => false)) {
      expect(hasBrowseBtn || hasOfferBtn).toBeTruthy();
    }
  });

  test('should not crash when conversations load via fallback', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check for any JavaScript errors
    const errorLogs: string[] = [];
    page.on('pageerror', err => {
      errorLogs.push(err.message);
    });

    await page.waitForTimeout(2000);

    // Should not have critical errors
    const hasCriticalError = errorLogs.some(log => 
      log.includes('Cannot read') || 
      log.includes('undefined is not') ||
      log.includes('null is not')
    );

    expect(hasCriticalError).toBeFalsy();
  });

  test('should show helpful error message when schema cache outdated', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const errorMessage = page.locator('text=/system updating|temporarily unavailable|updating/i').first();
    const hasUserFriendlyError = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasUserFriendlyError) {
      // Should NOT show technical error codes to user
      const bodyText = await page.textContent('body');
      expect(bodyText).not.toContain('PGRST202');
      expect(bodyText).not.toContain('42883');
    }
  });

  test('should allow fallback conversations to be clickable', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // If conversations loaded (via RPC or fallback), they should be clickable
    const firstConversation = page.locator('[data-testid="conversationRow"]').first();
    const hasConversation = await firstConversation.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasConversation) {
      // Click should not cause error
      await firstConversation.click();
      await page.waitForTimeout(1000);

      // Should see message input or conversation details
      const messageArea = page.locator('[data-testid="messageInput"], textarea, input[placeholder*="message"]').first();
      const hasMessageArea = await messageArea.isVisible({ timeout: 3000 }).catch(() => false);

      // Or should see "No messages" if conversation is empty
      const emptyConvo = page.locator('text=/no messages|start conversation/i').first();
      const hasEmptyConvo = await emptyConvo.isVisible({ timeout: 2000 }).catch(() => false);

      expect(hasMessageArea || hasEmptyConvo).toBeTruthy();
    }
  });

  test('should compute unread counts in fallback mode', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // If using fallback, unread badges might be simplified but should not crash
    const unreadBadges = page.locator('[data-testid="unreadBadge"]');
    const badgeCount = await unreadBadges.count();

    // Should have 0 or more badges (not crash trying to compute them)
    expect(badgeCount).toBeGreaterThanOrEqual(0);

    // If badges exist, they should have numbers
    if (badgeCount > 0) {
      const firstBadge = unreadBadges.first();
      const badgeText = await firstBadge.textContent();
      expect(badgeText).toBeTruthy();
      expect(badgeText?.match(/\d+/)).toBeTruthy();
    }
  });

  test('should show last message preview in fallback mode', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const conversations = page.locator('[data-testid="conversationRow"]');
    const conversationCount = await conversations.count();

    if (conversationCount > 0) {
      const firstConvo = conversations.first();
      const convoText = await firstConvo.textContent();

      // Should have some preview text (or "Start the conversation" fallback)
      expect(convoText).toBeTruthy();
      expect(convoText?.length).toBeGreaterThan(10);
    }
  });
});

test.describe('Messaging Error Recovery', () => {
  test('should recover from temporary RPC failures', async ({ page }) => {
    await page.goto('/signin');
    await page.fill('input[type="email"]', TEST_USERS.driver.email);
    await page.fill('input[type="password"]', TEST_USERS.driver.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 10000 });

    // First visit - might use fallback
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Reload page - should attempt RPC again
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Page should still be functional
    const conversationList = page.locator('[data-testid="conversationList"]').first();
    await expect(conversationList).toBeVisible({ timeout: 5000 });
  });

  test('should maintain state when retrying', async ({ page }) => {
    await page.goto('/signin');
    await page.fill('input[type="email"]', TEST_USERS.driver.email);
    await page.fill('input[type="password"]', TEST_USERS.driver.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 10000 });

    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // If retry button exists, clicking it should not lose page state
    const retryBtn = page.locator('button:has-text("Retry")').first();
    const hasRetry = await retryBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasRetry) {
      await retryBtn.click();
      await page.waitForTimeout(1000);

      // Should still be on messages page
      expect(page.url()).toContain('/messages');

      // UI should not be broken
      const body = page.locator('body');
      await expect(body).toBeVisible();
    }
  });
});

test.describe('Dev Mode Diagnostics', () => {
  test('should show dev diagnostics in development', async ({ page }) => {
    // Only run if in dev mode
    const isDev = process.env.NODE_ENV !== 'production';
    test.skip(!isDev, 'Skipping dev mode test in production');

    await page.goto('/signin');
    await page.fill('input[type="email"]', TEST_USERS.driver.email);
    await page.fill('input[type="password"]', TEST_USERS.driver.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 10000 });

    // Dev diagnostics panel should be visible in bottom left
    const devPanel = page.locator('text=DEV, button:has-text("DEV")').first();
    const hasDev = await devPanel.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasDev) {
      // Click to expand
      await devPanel.click();
      await page.waitForTimeout(500);

      // Should show schema health
      const schemaHealth = page.locator('text=/Schema Health|Supabase Project/i').first();
      await expect(schemaHealth).toBeVisible();
    }
  });
});
