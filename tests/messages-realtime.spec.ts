import { test, expect, TEST_USERS, isE2EConfigured, AuthHelper } from '../e2e/fixtures';

test.skip(!isE2EConfigured, 'E2E env not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

test.describe('Messages Realtime', () => {
  test('sent message appears instantly', async ({ page, auth }) => {
    await auth.login(TEST_USERS.driver);
    await page.goto('/messages');

    const conversation = page.locator('[data-testid="conversation-item"]').first();
    await expect(conversation).toBeVisible({ timeout: 10000 });
    await conversation.click();

    const messageInput = page.locator('[data-testid="message-input"]');
    await expect(messageInput).toBeVisible({ timeout: 10000 });

    const messageText = `hello-${Date.now()}`;
    await messageInput.fill(messageText);
    await page.locator('[data-testid="send-message-button"]').click();

    const messageList = page.locator('[data-testid="message-list"]');
    await expect(messageList).toContainText(messageText, { timeout: 2000 });
  });

  test('other user receives without reload', async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    const authA = new AuthHelper(pageA);
    const authB = new AuthHelper(pageB);

    await authA.login(TEST_USERS.driver);
    await authB.login(TEST_USERS.passenger);

    await pageA.goto('/messages');
    await pageB.goto('/messages');

    const conversationA = pageA.locator('[data-testid="conversation-item"]').first();
    await expect(conversationA).toBeVisible({ timeout: 10000 });
    const conversationId = await conversationA.getAttribute('data-conversation-id');
    await conversationA.click();

    const conversationB = conversationId
      ? pageB.locator(`[data-conversation-id="${conversationId}"]`)
      : pageB.locator('[data-testid="conversation-item"]').first();
    await expect(conversationB).toBeVisible({ timeout: 10000 });
    await conversationB.click();

    const messageInput = pageA.locator('[data-testid="message-input"]');
    await expect(messageInput).toBeVisible({ timeout: 10000 });

    const messageText = `hello-${Date.now()}`;
    await messageInput.fill(messageText);
    await pageA.locator('[data-testid="send-message-button"]').click();

    const messageListB = pageB.locator('[data-testid="message-list"]');
    await expect(messageListB).toContainText(messageText, { timeout: 5000 });

    await contextA.close();
    await contextB.close();
  });
});
