import { test, expect, TEST_USERS, isE2EConfigured } from './fixtures';

test.skip(!isE2EConfigured, 'E2E env not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

test.describe('Community Forum', () => {
  test('loads community feed', async ({ page, auth }) => {
    await auth.login(TEST_USERS.passenger);
    await page.goto('/community');
    await expect(page.locator('text=Community Hub')).toBeVisible({ timeout: 15000 });
  });

  test('creates a post and opens details', async ({ page, auth }) => {
    await auth.login(TEST_USERS.passenger);
    await page.goto('/community');
    await page.waitForLoadState('networkidle');

    const forumTab = page.locator("button:has-text('Forum')");
    if (await forumTab.isVisible().catch(() => false)) {
      await forumTab.click();
    }

    const title = `E2E Community Post ${Date.now()}`;
    const body = 'This is an automated community post for end-to-end testing.';

    await page.getByRole('button', { name: 'New Post' }).click();
    await page.getByPlaceholder('Title').fill(title);
    await page.getByPlaceholder('Share the details with the community').fill(body);
    await page.getByRole('button', { name: 'Post', exact: true }).click();

    await expect(page.locator(`text=${title}`)).toBeVisible({ timeout: 15000 });

    const postLink = page.locator('a', { hasText: title }).first();
    if (await postLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await postLink.click();
      await expect(page).toHaveURL(/\/community\//);
      await expect(page.getByRole('heading', { name: 'Comments' })).toBeVisible({ timeout: 10000 });
    }
  });
});
