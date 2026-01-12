import { test, expect, Page } from '@playwright/test';
import { TEST_USERS } from './fixtures';

test.describe('Profile Tabs', () => {
  test.beforeEach(async ({ page }) => {
    // Login as driver
    await page.goto('/signin');
    await page.fill('input[type="email"]', TEST_USERS.driver.email);
    await page.fill('input[type="password"]', TEST_USERS.driver.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 10000 });
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
  });

  test('should render profile page with tab navigation', async ({ page }) => {
    // Check that tabs are visible
    const overviewTab = page.locator('button:has-text("Overview")');
    const vehiclesTab = page.locator('button:has-text("Vehicles")');
    const safetyTab = page.locator('button:has-text("Safety")');
    const privacyTab = page.locator('button:has-text("Privacy")');
    const statsTab = page.locator('button:has-text("Stats")');
    const socialTab = page.locator('button:has-text("Social")');

    await expect(overviewTab).toBeVisible();
    await expect(vehiclesTab).toBeVisible();
    await expect(safetyTab).toBeVisible();
    await expect(privacyTab).toBeVisible();
    await expect(statsTab).toBeVisible();
    await expect(socialTab).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    // Start on overview tab (default)
    const overviewTab = page.locator('button:has-text("Overview")');
    await expect(overviewTab).toHaveClass(/bg-blue-600/);

    // Click vehicles tab
    await page.click('button:has-text("Vehicles")');
    await page.waitForTimeout(500);
    
    const vehiclesTab = page.locator('button:has-text("Vehicles")');
    await expect(vehiclesTab).toHaveClass(/bg-blue-600/);
    
    // Check URL parameter
    await expect(page).toHaveURL(/tab=vehicles/);

    // Click privacy tab
    await page.click('button:has-text("Privacy")');
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/tab=privacy/);

    // Click back to overview
    await page.click('button:has-text("Overview")');
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/tab=overview/);
  });

  test('should persist tab selection in URL', async ({ page }) => {
    // Navigate to vehicles tab
    await page.goto('/profile?tab=vehicles');
    await page.waitForLoadState('networkidle');

    const vehiclesTab = page.locator('button:has-text("Vehicles")');
    await expect(vehiclesTab).toHaveClass(/bg-blue-600/);
  });

  test('should show overview content by default', async ({ page }) => {
    // Check for overview-specific content
    const quickActions = page.locator('text="Quick Actions"');
    const editProfileBtn = page.locator('button:has-text("Edit Profile")').first();
    
    await expect(quickActions).toBeVisible();
    await expect(editProfileBtn).toBeVisible();
  });

  test('should not have infinite scroll (all content should be contained)', async ({ page }) => {
    // Measure initial height
    const initialHeight = await page.evaluate(() => document.body.scrollHeight);
    
    // Switch through all tabs and measure
    const tabs = ['vehicles', 'safety', 'privacy', 'stats', 'social'];
    
    for (const tab of tabs) {
      await page.click(`button:has-text("${tab.charAt(0).toUpperCase() + tab.slice(1)}")`);
      await page.waitForTimeout(300);
      
      const height = await page.evaluate(() => document.body.scrollHeight);
      
      // Height should be reasonable (less than 10x viewport)
      const viewportHeight = await page.evaluate(() => window.innerHeight);
      expect(height).toBeLessThan(viewportHeight * 10);
    }
  });

  test('should display avatar and edit button in header', async ({ page }) => {
    // Check avatar is visible
    const avatar = page.locator('img[alt*="name"], div[class*="avatar"], div[class*="rounded-full"]').first();
    await expect(avatar).toBeVisible();

    // Check edit button is visible
    const editButton = page.locator('button[title="Edit Profile"], button:has(svg):near(:text("Edit"))').first();
    await expect(editButton).toBeVisible();
  });

  test('should open edit modal when clicking edit button', async ({ page }) => {
    const editButton = page.locator('button[title="Edit Profile"], button:has-text("Edit Profile")').first();
    await editButton.click();
    await page.waitForTimeout(500);

    // Check modal is visible
    const modal = page.locator('div:has-text("Edit Profile")').filter({ has: page.locator('input[type="text"]') });
    await expect(modal).toBeVisible();

    // Check form fields
    await expect(page.locator('input[value*=""]').first()).toBeVisible();
    
    // Close modal
    const closeButton = page.locator('button:has(svg):near(:text("Edit Profile"))').last();
    if (await closeButton.isVisible({ timeout: 1000 })) {
      await closeButton.click();
    } else {
      await page.keyboard.press('Escape');
    }
  });

  test('tabs should be horizontally scrollable on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // Check that tabs container has overflow
    const tabsContainer = page.locator('div.overflow-x-auto').first();
    await expect(tabsContainer).toBeVisible();

    // Verify we can see at least the first few tabs
    const overviewTab = page.locator('button:has-text("Overview")');
    await expect(overviewTab).toBeVisible();
  });

  test('should show vehicle manager in vehicles tab', async ({ page }) => {
    await page.click('button:has-text("Vehicles")');
    await page.waitForTimeout(500);

    // Check for vehicle-related content
    const vehicleContent = page.locator('text=/vehicle|add vehicle/i').first();
    await expect(vehicleContent).toBeVisible({ timeout: 5000 });
  });

  test('should show preferences in privacy tab', async ({ page }) => {
    await page.click('button:has-text("Privacy")');
    await page.waitForTimeout(500);

    // Check for preference toggles
    const preferencesHeader = page.locator('text=/preference|privacy/i').first();
    await expect(preferencesHeader).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Profile Performance', () => {
  test('should load profile page quickly', async ({ page }) => {
    await page.goto('/signin');
    await page.fill('input[type="email"]', TEST_USERS.driver.email);
    await page.fill('input[type="password"]', TEST_USERS.driver.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 10000 });

    const startTime = Date.now();
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });
});
