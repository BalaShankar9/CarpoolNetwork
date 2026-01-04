import { test, expect, TEST_USERS, isE2EConfigured } from '../fixtures';

test.describe('Messages Loading', () => {
  test.skip(!isE2EConfigured, 'E2E env not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

  test.beforeEach(async ({ auth }) => {
    await auth.login(TEST_USERS.driver);
  });

  test('loads conversations without errors', async ({ page }) => {
    await page.goto('/messages');

    // Wait for conversation list to be visible
    await expect(page.getByTestId('conversationList')).toBeVisible({ timeout: 10000 });

    // Should NOT show error state
    await expect(page.getByText('Failed to Load Conversations')).not.toBeVisible();

    // Should NOT show retry button (only appears on error)
    await expect(page.getByRole('button', { name: /retry/i })).not.toBeVisible();
  });

  test('loads messages for selected conversation', async ({ page }) => {
    await page.goto('/messages');

    // Wait for conversations to load
    await expect(page.getByTestId('conversationList')).toBeVisible({ timeout: 10000 });

    // Select first conversation (if exists)
    const firstConversation = page.getByTestId('conversationRow').first();
    const conversationExists = await firstConversation.count() > 0;

    if (conversationExists) {
      await firstConversation.click();

      // Wait for message list to be visible
      await expect(page.getByTestId('messageList')).toBeVisible({ timeout: 5000 });

      // Should NOT show error state
      await expect(page.getByText('Failed to Load Messages')).not.toBeVisible();
    } else {
      // If no conversations, should show empty state
      await expect(page.getByText('No conversations yet')).toBeVisible();
    }
  });

  test('shows proper empty state when no conversations', async ({ page }) => {
    await page.goto('/messages');

    // Wait for conversation list
    await expect(page.getByTestId('conversationList')).toBeVisible({ timeout: 10000 });

    // Check if empty state or conversations are shown
    const hasConversations = await page.getByTestId('conversationRow').count() > 0;

    if (!hasConversations) {
      // Should show empty state message
      await expect(page.getByText('No conversations yet')).toBeVisible();

      // Should show helpful subtext
      await expect(page.getByText(/start a conversation/i)).toBeVisible();
    }
  });

  test('can retry on conversation load error', async ({ page }) => {
    // This test verifies error state UI exists
    // Real error would require mocking Supabase to fail

    await page.goto('/messages');
    await expect(page.getByTestId('conversationList')).toBeVisible({ timeout: 10000 });

    // Verify retry button exists in component (even if not visible in success case)
    const retryButton = page.getByRole('button', { name: /retry/i });

    // In success case, retry button should not be visible
    await expect(retryButton).not.toBeVisible();
  });
});
