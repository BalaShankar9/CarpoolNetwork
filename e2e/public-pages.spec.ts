import { test, expect, isE2EConfigured } from './fixtures';

test.skip(!isE2EConfigured, 'E2E env not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

const PUBLIC_ROUTES: Array<{ path: string; heading?: RegExp }> = [
  { path: '/how-it-works' },
  { path: '/safety-info' },
  { path: '/communities' },
  { path: '/cities/london' },
  { path: '/about' },
  { path: '/contact' },
  { path: '/faq' },
  { path: '/terms' },
  { path: '/privacy' },
];

test.describe('Public pages', () => {
  test('marketing and policy pages render without crashing', async ({ page }) => {
    test.setTimeout(3 * 60 * 1000);

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      // Ignore common noisy errors that don't indicate a broken UI.
      if (text.includes('ResizeObserver loop')) return;
      consoleErrors.push(text);
    });

    for (const route of PUBLIC_ROUTES) {
      await page.goto(route.path);
      await page.waitForLoadState('domcontentloaded');

      await expect(page.locator('main, body')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('text=404')).toHaveCount(0);
      await expect(page.locator('text=Not Found')).toHaveCount(0);
      await expect(page.locator('text=Something went wrong')).toHaveCount(0);

      const h1 = page.locator('h1').first();
      await expect(h1).toBeVisible({ timeout: 15000 });

      if (route.heading) {
        await expect(h1).toHaveText(route.heading);
      }
    }

    expect(consoleErrors, `Console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
  });
});

