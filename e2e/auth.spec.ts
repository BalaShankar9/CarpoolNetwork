import { test, expect, TEST_USERS, isE2EConfigured } from './fixtures';

test.skip(!isE2EConfigured, 'E2E env not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

test.describe('Authentication', () => {
  test.describe('Login', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/signin');
      await expect(page.locator('h1:has-text("Welcome Back")')).toBeVisible();
      await expect(page.locator('input#identifier')).toBeVisible();
      await expect(page.locator('input#password')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/signin');
      await page.fill('input#identifier', 'invalid@example.com');
      await page.fill('input#password', 'wrongpassword');
      await page.click('button[type="submit"]');
      await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 });
    });

    test('should login with valid credentials', async ({ page, auth }) => {
      await auth.login(TEST_USERS.driver);
      await expect(page).toHaveURL('/');
      await expect(page.locator('text=Welcome')).toBeVisible();
    });

    test('should redirect authenticated users away from login', async ({ page, auth }) => {
      await auth.login(TEST_USERS.driver);
      await page.goto('/signin');
      await expect(page).toHaveURL('/');
    });
  });

  test.describe('Signup', () => {
    test('should display signup form with beta badge when beta mode is enabled', async ({ page }) => {
      await page.goto('/signup');
      await expect(page.locator('h1:has-text("Create Account")')).toBeVisible();
      await expect(page.locator('input#fullName')).toBeVisible();
      await expect(page.locator('input#email')).toBeVisible();
      await expect(page.locator('input#password')).toBeVisible();
    });

    test('should block non-allowlisted email in beta mode', async ({ auth }) => {
      const randomEmail = `test-${Date.now()}@notallowed.com`;
      await auth.signup(
        {
          email: randomEmail,
          password: 'TestPass123!',
          fullName: 'Test User',
        },
        true
      );
    });

    test('should show password validation error', async ({ page }) => {
      await page.goto('/signup');
      await page.fill('input#fullName', 'Test User');
      await page.fill('input#email', 'test@example.com');
      await page.fill('input#password', '123');
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Password must be at least 6 characters')).toBeVisible();
    });
  });

  test.describe('Logout', () => {
    test('should logout successfully', async ({ page, auth }) => {
      await auth.login(TEST_USERS.driver);
      await expect(page).toHaveURL('/');

      const userMenuBtn = page.locator('button:has([class*="rounded-full"]), [data-testid="user-menu"]').first();
      await userMenuBtn.click();

      const signOutBtn = page.locator('button:has-text("Sign Out"), a:has-text("Sign Out")').first();
      await signOutBtn.click();

      await expect(page).toHaveURL('/signin', { timeout: 10000 });
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing protected route while logged out', async ({ page }) => {
      await page.goto('/find-rides');
      await expect(page).toHaveURL('/signin');
    });

    test('should allow access to protected route when logged in', async ({ page, auth }) => {
      await auth.login(TEST_USERS.driver);
      await page.goto('/find-rides');
      await expect(page).toHaveURL('/find-rides');
    });
  });
});
