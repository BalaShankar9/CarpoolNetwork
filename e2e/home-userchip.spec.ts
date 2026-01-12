import { test, expect } from '@playwright/test';
import { TEST_USERS } from './fixtures';

test.describe('Home Page UserChip', () => {
  test.beforeEach(async ({ page }) => {
    // Login as driver
    await page.goto('/signin');
    await page.fill('input[type="email"]', TEST_USERS.driver.email);
    await page.fill('input[type="password"]', TEST_USERS.driver.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 10000 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display clickable avatar with user name', async ({ page }) => {
    // Check welcome message is visible
    const welcomeText = page.locator('text=/Welcome back/i');
    await expect(welcomeText).toBeVisible({ timeout: 5000 });

    // Check avatar is visible and clickable
    const avatarButton = page.locator('button[aria-label="Go to profile"], button:has(div[class*="rounded-full"])').first();
    await expect(avatarButton).toBeVisible();

    // Verify it's actually a button (clickable)
    const isButton = await avatarButton.evaluate(el => el.tagName.toLowerCase() === 'button');
    expect(isButton).toBeTruthy();
  });

  test('should show avatar image or initials', async ({ page }) => {
    // Check for either an image or initials fallback
    const avatarContainer = page.locator('div[class*="rounded-full"]').first();
    await expect(avatarContainer).toBeVisible();

    // Should have either an img tag or text content (initials)
    const hasImage = await page.locator('img[alt*="name"], img[alt*="Profile"]').first().isVisible({ timeout: 2000 }).catch(() => false);
    const hasInitials = await avatarContainer.textContent();

    expect(hasImage || (hasInitials && hasInitials.length > 0)).toBeTruthy();
  });

  test('should navigate to profile page when avatar is clicked', async ({ page }) => {
    const avatarButton = page.locator('button[aria-label="Go to profile"]').first();
    
    // Click the avatar
    await avatarButton.click();
    await page.waitForTimeout(1000);

    // Should navigate to profile page
    await expect(page).toHaveURL(/\/profile/);
    
    // Should see profile content
    const profileContent = page.locator('text=/Edit Profile|Overview|Vehicles/i').first();
    await expect(profileContent).toBeVisible({ timeout: 5000 });
  });

  test('should show first name in welcome message', async ({ page }) => {
    // Welcome message should contain a name (not "undefined" or "null")
    const welcomeText = await page.locator('text=/Welcome back/i').textContent();
    
    expect(welcomeText).toBeTruthy();
    expect(welcomeText).not.toContain('undefined');
    expect(welcomeText).not.toContain('null');
    expect(welcomeText?.length).toBeGreaterThan('Welcome back, '.length);
  });

  test('should handle missing profile photo gracefully', async ({ page }) => {
    // Even without a profile photo, should show initials
    const avatarContainer = page.locator('div[class*="rounded-full"]').first();
    await expect(avatarContainer).toBeVisible();

    // Should always have some content (either image or text)
    const isEmpty = await avatarContainer.evaluate(el => {
      return el.children.length === 0 && el.textContent?.trim().length === 0;
    });
    
    expect(isEmpty).toBeFalsy();
  });

  test('should have hover effect on avatar', async ({ page }) => {
    const avatarButton = page.locator('button[aria-label="Go to profile"]').first();
    
    // Get initial opacity/state
    const initialOpacity = await avatarButton.evaluate(el => 
      window.getComputedStyle(el).opacity
    );

    // Hover over the avatar
    await avatarButton.hover();
    await page.waitForTimeout(300);

    // Check for visual feedback (hover class or style change)
    const hasHoverClass = await avatarButton.evaluate(el => 
      el.classList.contains('hover:opacity-80') || 
      el.classList.toString().includes('hover') ||
      el.classList.toString().includes('group')
    );

    expect(hasHoverClass).toBeTruthy();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Avatar should still be visible and clickable
    const avatarButton = page.locator('button[aria-label="Go to profile"]').first();
    await expect(avatarButton).toBeVisible();

    // Welcome text should be visible
    const welcomeText = page.locator('text=/Welcome back/i');
    await expect(welcomeText).toBeVisible();

    // Should still be able to click
    await avatarButton.click();
    await expect(page).toHaveURL(/\/profile/);
  });

  test('should show avatar on dashboard stats section', async ({ page }) => {
    // The avatar should be near the top, above stats
    const avatar = page.locator('button[aria-label="Go to profile"]').first();
    const statsSection = page.locator('text=/Rides Offered|Rides Taken/i').first();

    await expect(avatar).toBeVisible();
    await expect(statsSection).toBeVisible();

    // Avatar should be above stats (lower Y position)
    const avatarBox = await avatar.boundingBox();
    const statsBox = await statsSection.boundingBox();

    expect(avatarBox).toBeTruthy();
    expect(statsBox).toBeTruthy();
    expect(avatarBox!.y).toBeLessThan(statsBox!.y);
  });
});

test.describe('Home Page Avatar Fallbacks', () => {
  test('should handle profile loading gracefully', async ({ page }) => {
    await page.goto('/signin');
    await page.fill('input[type="email"]', TEST_USERS.driver.email);
    await page.fill('input[type="password"]', TEST_USERS.driver.password);
    await page.click('button[type="submit"]');
    
    // Navigate quickly to home before profile fully loads
    await page.goto('/');
    
    // Should show something immediately (loading state or initials)
    const avatarContainer = page.locator('div[class*="rounded-full"]').first();
    await expect(avatarContainer).toBeVisible({ timeout: 3000 });
    
    // Should not crash or show error
    const errorMessage = page.locator('text=/error|failed/i');
    const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasError).toBeFalsy();
  });

  test('should use consistent avatar URL logic', async ({ page }) => {
    await page.goto('/signin');
    await page.fill('input[type="email"]', TEST_USERS.driver.email);
    await page.fill('input[type="password"]', TEST_USERS.driver.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 10000 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // If avatar image exists, check it has a valid src
    const avatarImg = page.locator('img[alt*="name"], img[alt*="Profile"]').first();
    const hasImg = await avatarImg.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (hasImg) {
      const src = await avatarImg.getAttribute('src');
      expect(src).toBeTruthy();
      expect(src).not.toBe('');
      expect(src).not.toContain('undefined');
      expect(src).not.toContain('null');
    }
  });
});
