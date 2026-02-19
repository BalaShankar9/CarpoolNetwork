import fs from 'fs';
import path from 'path';
import { test, expect, TEST_USERS, isE2EConfigured } from './fixtures';

test.skip(!isE2EConfigured, 'E2E env not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

function extractAppRoutes(): string[] {
  const appPath = path.resolve(process.cwd(), 'src', 'App.tsx');
  const src = fs.readFileSync(appPath, 'utf8');

  const routes = new Set<string>();
  const re = /<Route\s+path="([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(src))) {
    routes.add(match[1]);
  }

  return [...routes].sort();
}

function isDynamicRoute(route: string): boolean {
  return route.includes('/:') || route.includes(':');
}

async function expectRouteNotCrashed(page: any) {
  await expect(page.locator('text=Something went wrong')).toHaveCount(0);
  await expect(page.locator('text=404')).toHaveCount(0);
  await expect(page.locator('text=Not Found')).toHaveCount(0);
  await expect(page.locator('main, body')).toBeVisible({ timeout: 15000 });
}

const GUEST_ROUTES = [
  '/',
  '/how-it-works',
  '/safety-info',
  '/communities',
  '/about',
  '/contact',
  '/faq',
  '/terms',
  '/privacy',
  '/signin',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-otp',
  '/verify-email',
];

const USER_ROUTES = [
  '/',
  '/find-rides',
  '/post-ride',
  '/request-ride',
  '/my-rides',
  '/messages',
  '/friends',
  '/community',
  '/help',
  '/profile',
  '/settings',
  '/analytics',
  '/leaderboards',
  '/challenges',
  '/notifications',
  '/favorites',
  '/pools',
  '/preferences',
  '/security',
];

const ADMIN_ROUTES = [
  '/admin',
  '/admin/activity',
  '/admin/admins',
  '/admin/analytics',
  '/admin/analytics/geo',
  '/admin/analytics/ops',
  '/admin/analytics/rides',
  '/admin/analytics/summary',
  '/admin/analytics/users',
  '/admin/audit',
  '/admin/beta',
  '/admin/bookings',
  '/admin/bugs',
  '/admin/bulk-operations',
  '/admin/community',
  '/admin/community/warnings',
  '/admin/diagnostics',
  '/admin/feedback',
  '/admin/health',
  '/admin/messages',
  '/admin/messages/muted',
  '/admin/notifications',
  '/admin/notifications/announcements',
  '/admin/notifications/templates',
  '/admin/performance',
  '/admin/rides',
  '/admin/safety',
  '/admin/safety/dashboard',
  '/admin/settings',
  '/admin/users',
  '/admin/verifications',
];

const IGNORED_DYNAMIC_ROUTES = [
  '/bookings/:bookingId',
  '/rides/:rideId',
  '/community/:postId',
  '/cities/:city',
  '/user/:userId',
  '/social/groups/:groupId',
  '/admin/bookings/:bookingId',
  '/admin/community/:postId',
  '/admin/messages/:id',
  '/admin/rides/:rideId',
  '/admin/safety/report/:reportId',
  '/admin/users/:userId',
];

test.describe('Role-based route crawl', () => {
  test('cross-check: every App route is covered by an allowlist (or is dynamic)', async () => {
    const appRoutes = extractAppRoutes();
    const covered = new Set([...GUEST_ROUTES, ...USER_ROUTES, ...ADMIN_ROUTES, ...IGNORED_DYNAMIC_ROUTES]);

    const missing = appRoutes.filter((r) => {
      if (isDynamicRoute(r)) return !covered.has(r);
      return !covered.has(r);
    });

    expect(missing, `Uncovered routes in src/App.tsx:\n${missing.join('\n')}`).toEqual([]);
  });

  test('guest: public/auth routes load; protected routes redirect to /signin', async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);

    for (const route of GUEST_ROUTES) {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');
      await expectRouteNotCrashed(page);
    }

    // Representative protected route redirect checks
    await page.goto('/find-rides');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/signin/, { timeout: 15000 });

    await page.goto('/messages');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/signin/, { timeout: 15000 });
  });

  test('passenger: core routes load; admin routes blocked', async ({ page, auth }) => {
    test.setTimeout(7 * 60 * 1000);
    await auth.login(TEST_USERS.passenger);

    for (const route of USER_ROUTES) {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');
      await expectRouteNotCrashed(page);
    }

    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/unauthorized/, { timeout: 15000 });
  });

  test('driver: core routes load; admin routes blocked', async ({ page, auth }) => {
    test.setTimeout(7 * 60 * 1000);
    await auth.login(TEST_USERS.driver);

    for (const route of USER_ROUTES) {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');
      await expectRouteNotCrashed(page);
    }

    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/unauthorized/, { timeout: 15000 });
  });

  test('admin: admin routes load', async ({ page, auth }) => {
    test.setTimeout(10 * 60 * 1000);
    await auth.login(TEST_USERS.admin);

    for (const route of ADMIN_ROUTES) {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');
      await expectRouteNotCrashed(page);
    }
  });
});

