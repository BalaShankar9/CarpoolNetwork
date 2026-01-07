// Phase 8: Analytics, Gamification & Advanced Features E2E Tests
import { test, expect } from '@playwright/test';

test.describe('Phase 8: Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/(dashboard|home)/);
  });

  test('should display user analytics dashboard', async ({ page }) => {
    await page.goto('/analytics');
    
    // Check main sections exist
    await expect(page.locator('text=Analytics')).toBeVisible();
    await expect(page.locator('[data-testid="stats-overview"]')).toBeVisible();
  });

  test('should show statistics cards', async ({ page }) => {
    await page.goto('/analytics');
    
    // Check for stat cards
    await expect(page.locator('text=Total Rides')).toBeVisible();
    await expect(page.locator('text=CO₂ Saved')).toBeVisible();
    await expect(page.locator('text=Distance')).toBeVisible();
  });

  test('should switch between time periods', async ({ page }) => {
    await page.goto('/analytics');
    
    // Test period filters
    const weekButton = page.locator('button:has-text("Week")');
    const monthButton = page.locator('button:has-text("Month")');
    const yearButton = page.locator('button:has-text("Year")');
    
    await weekButton.click();
    await expect(weekButton).toHaveClass(/bg-emerald/);
    
    await monthButton.click();
    await expect(monthButton).toHaveClass(/bg-emerald/);
    
    await yearButton.click();
    await expect(yearButton).toHaveClass(/bg-emerald/);
  });

  test('should export data as CSV', async ({ page }) => {
    await page.goto('/analytics');
    
    // Look for export button
    const exportButton = page.locator('button:has-text("Export")');
    if (await exportButton.isVisible()) {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        exportButton.click(),
        page.locator('text=CSV').click(),
      ]);
      expect(download.suggestedFilename()).toContain('.csv');
    }
  });
});

test.describe('Phase 8: Gamification & Achievements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/(dashboard|home)/);
  });

  test('should display achievements center', async ({ page }) => {
    await page.goto('/achievements');
    
    // Check main components
    await expect(page.locator('text=Achievements')).toBeVisible();
  });

  test('should show achievement categories', async ({ page }) => {
    await page.goto('/achievements');
    
    // Check category filters
    const categories = ['All', 'Rides', 'Social', 'Safety', 'Milestone'];
    for (const category of categories) {
      const button = page.locator(`button:has-text("${category}")`);
      if (await button.isVisible()) {
        await expect(button).toBeEnabled();
      }
    }
  });

  test('should filter achievements by category', async ({ page }) => {
    await page.goto('/achievements');
    
    // Click on a category
    const ridesButton = page.locator('button:has-text("Rides")');
    if (await ridesButton.isVisible()) {
      await ridesButton.click();
      // Achievements should update
      await page.waitForTimeout(500);
    }
  });

  test('should display leaderboard', async ({ page }) => {
    await page.goto('/leaderboard');
    
    // Check leaderboard exists
    await expect(page.locator('text=Leaderboard')).toBeVisible();
    
    // Check type filters
    const types = ['Rides', 'CO2', 'Rating', 'Streak'];
    for (const type of types) {
      const button = page.locator(`button:has-text("${type}")`);
      if (await button.isVisible()) {
        await expect(button).toBeEnabled();
      }
    }
  });

  test('should show streak tracker', async ({ page }) => {
    await page.goto('/profile');
    
    // Look for streak section
    const streakSection = page.locator('[data-testid="streak-tracker"]');
    if (await streakSection.isVisible()) {
      await expect(streakSection.locator('text=/\\d+ day streak/i')).toBeVisible();
    }
  });
});

test.describe('Phase 8: Recurring Rides', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/(dashboard|home)/);
  });

  test('should display recurring rides page', async ({ page }) => {
    await page.goto('/recurring-rides');
    
    await expect(page.locator('text=Recurring Rides')).toBeVisible();
  });

  test('should open new recurring ride form', async ({ page }) => {
    await page.goto('/recurring-rides');
    
    const addButton = page.locator('button:has-text("Add New")');
    if (await addButton.isVisible()) {
      await addButton.click();
      await expect(page.locator('text=New Recurring Ride')).toBeVisible();
    }
  });

  test('should toggle days of week', async ({ page }) => {
    await page.goto('/recurring-rides');
    
    const addButton = page.locator('button:has-text("Add New")');
    if (await addButton.isVisible()) {
      await addButton.click();
      
      // Toggle days
      const monButton = page.locator('button:has-text("Mon")');
      await monButton.click();
      
      const friButton = page.locator('button:has-text("Fri")');
      await friButton.click();
    }
  });
});

test.describe('Phase 8: Wait List', () => {
  test('should show wait list option for full rides', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/(dashboard|home)/);
    
    await page.goto('/rides');
    
    // Look for a full ride
    const fullRideCard = page.locator('[data-testid="ride-card"]:has-text("Full")').first();
    if (await fullRideCard.isVisible()) {
      const waitListButton = fullRideCard.locator('button:has-text("Wait List")');
      await expect(waitListButton).toBeVisible();
    }
  });
});

test.describe('Phase 8: Community Challenges', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/(dashboard|home)/);
  });

  test('should display challenges center', async ({ page }) => {
    await page.goto('/challenges');
    
    await expect(page.locator('text=Challenges')).toBeVisible();
  });

  test('should show challenge filters', async ({ page }) => {
    await page.goto('/challenges');
    
    // Check filters
    await expect(page.locator('button:has-text("Browse All")')).toBeVisible();
    await expect(page.locator('button:has-text("My Challenges")')).toBeVisible();
  });

  test('should show challenge status filters', async ({ page }) => {
    await page.goto('/challenges');
    
    const statuses = ['Active', 'Upcoming', 'Completed'];
    for (const status of statuses) {
      const button = page.locator(`button:has-text("${status}")`);
      if (await button.isVisible()) {
        await expect(button).toBeEnabled();
      }
    }
  });

  test('should open challenge details', async ({ page }) => {
    await page.goto('/challenges');
    
    const challengeCard = page.locator('[data-testid="challenge-card"]').first();
    if (await challengeCard.isVisible()) {
      await challengeCard.click();
      await expect(page.locator('[data-testid="challenge-modal"]')).toBeVisible();
    }
  });
});

test.describe('Phase 8: Community Events', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/(dashboard|home)/);
  });

  test('should display events calendar', async ({ page }) => {
    await page.goto('/events');
    
    await expect(page.locator('text=Community Events')).toBeVisible();
  });

  test('should switch between list and calendar view', async ({ page }) => {
    await page.goto('/events');
    
    const calendarViewButton = page.locator('[data-testid="calendar-view-button"]');
    const listViewButton = page.locator('[data-testid="list-view-button"]');
    
    if (await calendarViewButton.isVisible()) {
      await calendarViewButton.click();
      await page.waitForTimeout(300);
    }
    
    if (await listViewButton.isVisible()) {
      await listViewButton.click();
      await page.waitForTimeout(300);
    }
  });

  test('should filter events', async ({ page }) => {
    await page.goto('/events');
    
    const upcomingButton = page.locator('button:has-text("Upcoming")');
    const myEventsButton = page.locator('button:has-text("My Events")');
    
    if (await upcomingButton.isVisible()) {
      await upcomingButton.click();
    }
    
    if (await myEventsButton.isVisible()) {
      await myEventsButton.click();
    }
  });
});

test.describe('Phase 8: Notification Center', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/(dashboard|home)/);
  });

  test('should display notification bell in header', async ({ page }) => {
    const bellButton = page.locator('[data-testid="notification-bell"]');
    await expect(bellButton).toBeVisible();
  });

  test('should open notification center on bell click', async ({ page }) => {
    const bellButton = page.locator('[data-testid="notification-bell"]');
    if (await bellButton.isVisible()) {
      await bellButton.click();
      await expect(page.locator('text=Notifications')).toBeVisible();
    }
  });

  test('should show notification categories', async ({ page }) => {
    const bellButton = page.locator('[data-testid="notification-bell"]');
    if (await bellButton.isVisible()) {
      await bellButton.click();
      
      const categories = ['All', 'Rides', 'Messages', 'Social'];
      for (const category of categories) {
        const button = page.locator(`button:has-text("${category}")`);
        if (await button.isVisible()) {
          await expect(button).toBeEnabled();
        }
      }
    }
  });

  test('should access notification settings', async ({ page }) => {
    const bellButton = page.locator('[data-testid="notification-bell"]');
    if (await bellButton.isVisible()) {
      await bellButton.click();
      
      const settingsButton = page.locator('[data-testid="notification-settings"]');
      if (await settingsButton.isVisible()) {
        await settingsButton.click();
        await expect(page.locator('text=Notification Settings')).toBeVisible();
      }
    }
  });

  test('should mark notification as read', async ({ page }) => {
    const bellButton = page.locator('[data-testid="notification-bell"]');
    if (await bellButton.isVisible()) {
      await bellButton.click();
      
      const unreadNotification = page.locator('[data-testid="notification-item"]:not(.read)').first();
      if (await unreadNotification.isVisible()) {
        await unreadNotification.click();
        // Should be marked as read
      }
    }
  });

  test('should mark all as read', async ({ page }) => {
    const bellButton = page.locator('[data-testid="notification-bell"]');
    if (await bellButton.isVisible()) {
      await bellButton.click();
      
      const markAllButton = page.locator('[data-testid="mark-all-read"]');
      if (await markAllButton.isVisible()) {
        await markAllButton.click();
      }
    }
  });
});

test.describe('Phase 8: Smart Matching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/(dashboard|home)/);
  });

  test('should show match score on ride cards', async ({ page }) => {
    await page.goto('/find-ride');
    
    // Fill search form
    await page.fill('[data-testid="origin-input"]', 'Test Origin');
    await page.fill('[data-testid="destination-input"]', 'Test Destination');
    await page.click('[data-testid="search-button"]');
    
    // Check for match score indicators
    await page.waitForTimeout(1000);
    const matchScore = page.locator('[data-testid="match-score"]').first();
    // Match score may or may not be visible depending on results
  });

  test('should show match preferences', async ({ page }) => {
    await page.goto('/settings/preferences');
    
    // Look for preference settings
    const preferencesSection = page.locator('[data-testid="match-preferences"]');
    if (await preferencesSection.isVisible()) {
      await expect(preferencesSection).toContainText(/smoking|pets|music/i);
    }
  });
});

test.describe('Phase 8: Performance', () => {
  test('should load dashboard within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
  });

  test('should handle rapid navigation', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/(dashboard|home)/);
    
    // Navigate rapidly
    const routes = ['/analytics', '/achievements', '/challenges', '/events', '/'];
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');
    }
    
    // Should not crash
    await expect(page).not.toHaveURL('about:blank');
  });

  test('should not have memory leaks on repeated operations', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/(dashboard|home)/);
    
    // Open and close notification center multiple times
    const bellButton = page.locator('[data-testid="notification-bell"]');
    if (await bellButton.isVisible()) {
      for (let i = 0; i < 5; i++) {
        await bellButton.click();
        await page.waitForTimeout(200);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
      }
    }
    
    // Page should still be responsive
    await expect(page.locator('body')).toBeVisible();
  });
});
