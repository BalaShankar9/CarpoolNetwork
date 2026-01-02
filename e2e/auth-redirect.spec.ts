import { expect, test } from './fixtures';

test('unauthenticated profile redirects to /signin', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/profile');
  await page.waitForURL(/\/signin/, { timeout: 10000 });
  await expect(page).toHaveURL(/\/signin/);
});
