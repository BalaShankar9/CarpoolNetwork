import { test, expect, TEST_USERS, isE2EConfigured } from './fixtures';

test.skip(!isE2EConfigured, 'E2E env not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

type RouteCheck = {
  label: string;
  path: string;
};

const publicRoutes: RouteCheck[] = [
  { label: 'Sign In', path: '/signin' },
  { label: 'Sign Up', path: '/signup' },
  { label: 'Forgot Password', path: '/forgot-password' },
  { label: 'Verify OTP', path: '/verify-otp' },
  { label: 'Verify Email', path: '/verify-email' },
  { label: 'Reset Password', path: '/reset-password' },
  { label: 'Terms', path: '/terms' },
  { label: 'Privacy', path: '/privacy' },
];

const protectedRoutes: RouteCheck[] = [
  { label: 'Home', path: '/' },
  { label: 'Find Rides', path: '/find-rides' },
  { label: 'Post Ride', path: '/post-ride' },
  { label: 'Request Ride', path: '/request-ride' },
  { label: 'My Rides', path: '/my-rides' },
  { label: 'Messages', path: '/messages' },
  { label: 'Profile', path: '/profile' },
  { label: 'Settings', path: '/settings' },
  { label: 'Preferences', path: '/preferences' },
  { label: 'Analytics', path: '/analytics' },
  { label: 'Leaderboards', path: '/leaderboards' },
  { label: 'Challenges', path: '/challenges' },
  { label: 'Admin Dashboard', path: '/admin' },
  { label: 'Admin Users', path: '/admin/users' },
  { label: 'Admin Diagnostics', path: '/admin/diagnostics' },
  { label: 'Admin Beta', path: '/admin/beta' },
  { label: 'Admin Feedback', path: '/admin/feedback' },
  { label: 'Admin Bugs', path: '/admin/bugs' },
  { label: 'Admin Verifications', path: '/admin/verifications' },
  { label: 'Admin Safety', path: '/admin/safety' },
  { label: 'Admin Safety Dashboard', path: '/admin/safety/dashboard' },
  { label: 'Admin Analytics', path: '/admin/analytics' },
  { label: 'Admin Activity', path: '/admin/activity' },
  { label: 'Admin Bulk Ops', path: '/admin/bulk-operations' },
  { label: 'Admin Performance', path: '/admin/performance' },
];

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

const waitForAppIdle = async (page: import('@playwright/test').Page) => {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);
};

const auditLayout = async (page: import('@playwright/test').Page, label: string, path: string) => {
  const issues: string[] = [];
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];

  const onConsole = (msg: import('@playwright/test').ConsoleMessage) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  };

  const onPageError = (error: Error) => {
    consoleErrors.push(error.message);
  };

  const onRequestFailed = (request: import('@playwright/test').Request) => {
    const failure = request.failure();
    if (failure) {
      failedRequests.push(`${request.url()} -> ${failure.errorText}`);
    }
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('requestfailed', onRequestFailed);

  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
  await waitForAppIdle(page);

  if (response && !response.ok()) {
    issues.push(`${label}: HTTP ${response.status()} for ${path}`);
  }

  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(root.scrollWidth, body.scrollWidth);
    const clientWidth = Math.max(root.clientWidth, body.clientWidth);
    return scrollWidth > clientWidth + 2;
  });

  if (overflow) {
    const offenders = await page.evaluate(() => {
      const maxItems = 5;
      const vw = window.innerWidth;
      const elements = Array.from(document.querySelectorAll('*')) as HTMLElement[];
      const results: string[] = [];
      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        if (rect.right > vw + 2 || rect.left < -2) {
          const id = el.id ? `#${el.id}` : '';
          const className = el.className && typeof el.className === 'string' ? `.${el.className.split(' ').filter(Boolean).slice(0, 3).join('.')}` : '';
          results.push(`${el.tagName.toLowerCase()}${id}${className}`);
          if (results.length >= maxItems) break;
        }
      }
      return results;
    });
    issues.push(`${label}: horizontal overflow detected on ${path}${offenders.length ? ` -> ${offenders.join(', ')}` : ''}`);
  }

  if (consoleErrors.length > 0) {
    const filtered = consoleErrors.filter((message) => {
      if (/ResizeObserver loop limit exceeded/i.test(message)) return false;
      if (/Failed to fetch/i.test(message)) return false;
      return true;
    });
    if (filtered.length > 0) {
      issues.push(`${label}: console errors on ${path} -> ${filtered.join(' | ')}`);
    }
  }

  page.off('console', onConsole);
  page.off('pageerror', onPageError);
  page.off('requestfailed', onRequestFailed);

  const filteredFailedRequests = failedRequests.filter((message) => {
    return !/net::ERR_ABORTED/i.test(message) && !/net::ERR_BLOCKED_BY_CLIENT/i.test(message);
  });
  if (filteredFailedRequests.length > 0) {
    issues.push(`${label}: failed network requests on ${path} -> ${filteredFailedRequests.join(' | ')}`);
  }

  return issues;
};

const auditRoutes = async (page: import('@playwright/test').Page, routes: RouteCheck[]) => {
  const allIssues: string[] = [];
  for (const route of routes) {
    const routeIssues = await auditLayout(page, route.label, route.path);
    allIssues.push(...routeIssues);
  }
  expect(allIssues, allIssues.join('\n')).toEqual([]);
};

for (const viewport of viewports) {
  test.describe(`UI audit (${viewport.name})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('public routes layout', async ({ page }) => {
      test.setTimeout(5 * 60 * 1000);
      await auditRoutes(page, publicRoutes);
    });

    test('protected routes layout', async ({ page, auth }) => {
      test.setTimeout(10 * 60 * 1000);
      await auth.login(TEST_USERS.driver);
      await auditRoutes(page, protectedRoutes);
    });

    test('dynamic routes layout', async ({ page, auth }) => {
      test.setTimeout(5 * 60 * 1000);
      await auth.login(TEST_USERS.driver);
      const issues: string[] = [];

      await page.goto('/find-rides');
      await waitForAppIdle(page);

      const rideLink = page.locator('a[href*="/rides/"], button:has-text("View"), button:has-text("Details")').first();
      if (await rideLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await rideLink.click();
        await waitForAppIdle(page);
        issues.push(...await auditLayout(page, 'Ride Details', page.url()));
      }

      await page.goto('/my-rides');
      await waitForAppIdle(page);
      const bookingLink = page.locator('a[href*="/bookings/"]').first();
      if (await bookingLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await bookingLink.click();
        await waitForAppIdle(page);
        issues.push(...await auditLayout(page, 'Booking Details', page.url()));
      }
      expect(issues, issues.join('\n')).toEqual([]);
    });
  });
}
