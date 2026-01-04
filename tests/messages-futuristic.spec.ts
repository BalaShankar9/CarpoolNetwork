import fs from 'fs';
import path from 'path';
import { test, expect, TEST_USERS, isE2EConfigured, AuthHelper } from '../e2e/fixtures';

test.skip(!isE2EConfigured, 'E2E env not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

const writeTempImage = (filePath: string) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAn8B9p6dpQAAAABJRU5ErkJggg==';
  fs.writeFileSync(filePath, Buffer.from(pngBase64, 'base64'));
};

test.describe('Futuristic Messaging', () => {
  test('sender sees message instantly (optimistic)', async ({ page, auth }) => {
    await auth.login(TEST_USERS.driver);
    await page.goto('/messages');

    const conversation = page.locator('[data-testid="conversationRow"]').first();
    await expect(conversation).toBeVisible({ timeout: 10000 });
    await conversation.click();

    const messageInput = page.locator('[data-testid="messageInput"]');
    await expect(messageInput).toBeVisible();

    const messageText = `hello-${Date.now()}`;
    await messageInput.fill(messageText);
    await page.locator('[data-testid="sendButton"]').click();

    const messageList = page.locator('[data-testid="messageList"]');
    await expect(messageList).toContainText(messageText, { timeout: 2000 });
  });

  test('realtime delivery to other user', async ({ browser }) => {
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

    const conversationA = pageA.locator('[data-testid="conversationRow"]').first();
    await expect(conversationA).toBeVisible({ timeout: 10000 });
    const conversationId = await conversationA.getAttribute('data-conversation-id');
    await conversationA.click();

    const conversationB = conversationId
      ? pageB.locator(`[data-conversation-id="${conversationId}"]`)
      : pageB.locator('[data-testid="conversationRow"]').first();
    await expect(conversationB).toBeVisible({ timeout: 10000 });
    await conversationB.click();

    const messageText = `hello-${Date.now()}`;
    await pageA.locator('[data-testid="messageInput"]').fill(messageText);
    await pageA.locator('[data-testid="sendButton"]').click();

    const messageListB = pageB.locator('[data-testid="messageList"]');
    await expect(messageListB).toContainText(messageText, { timeout: 5000 });

    await contextA.close();
    await contextB.close();
  });

  test('unread badge increments and clears', async ({ browser }) => {
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

    const conversationA = pageA.locator('[data-testid="conversationRow"]').first();
    await expect(conversationA).toBeVisible({ timeout: 10000 });
    const conversationId = await conversationA.getAttribute('data-conversation-id');
    await conversationA.click();

    const messageText = `unread-${Date.now()}`;
    await pageA.locator('[data-testid="messageInput"]').fill(messageText);
    await pageA.locator('[data-testid="sendButton"]').click();

    const conversationB = conversationId
      ? pageB.locator(`[data-conversation-id="${conversationId}"]`)
      : pageB.locator('[data-testid="conversationRow"]').first();
    await expect(conversationB).toBeVisible({ timeout: 10000 });

    const unreadBadge = conversationB.locator('[data-testid="unreadBadge"]');
    await expect(unreadBadge).toBeVisible({ timeout: 5000 });

    await conversationB.click();
    await expect(unreadBadge).toBeHidden({ timeout: 5000 });

    await contextA.close();
    await contextB.close();
  });

  test('typing indicator appears for recipient', async ({ browser }) => {
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

    const conversationA = pageA.locator('[data-testid="conversationRow"]').first();
    await expect(conversationA).toBeVisible({ timeout: 10000 });
    const conversationId = await conversationA.getAttribute('data-conversation-id');
    await conversationA.click();

    const conversationB = conversationId
      ? pageB.locator(`[data-conversation-id="${conversationId}"]`)
      : pageB.locator('[data-testid="conversationRow"]').first();
    await expect(conversationB).toBeVisible({ timeout: 10000 });
    await conversationB.click();

    await pageA.locator('[data-testid="messageInput"]').type('typing...');
    const typingIndicator = pageB.locator('[data-testid="typingIndicator"]');
    await expect(typingIndicator).toBeVisible({ timeout: 5000 });

    await contextA.close();
    await contextB.close();
  });

  test('reactions appear in realtime', async ({ browser }) => {
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

    const conversationA = pageA.locator('[data-testid="conversationRow"]').first();
    await expect(conversationA).toBeVisible({ timeout: 10000 });
    const conversationId = await conversationA.getAttribute('data-conversation-id');
    await conversationA.click();

    const conversationB = conversationId
      ? pageB.locator(`[data-conversation-id="${conversationId}"]`)
      : pageB.locator('[data-testid="conversationRow"]').first();
    await expect(conversationB).toBeVisible({ timeout: 10000 });
    await conversationB.click();

    const messageText = `react-${Date.now()}`;
    await pageA.locator('[data-testid="messageInput"]').fill(messageText);
    await pageA.locator('[data-testid="sendButton"]').click();

    const reactionButton = pageA.locator('[data-testid="reactionButton"]').last();
    await reactionButton.click();
    await pageA.locator('text=👍').click();

    const messageBubbleB = pageB.locator('[data-testid="messageBubble"]').last();
    await expect(messageBubbleB).toContainText('👍', { timeout: 5000 });

    await contextA.close();
    await contextB.close();
  });

  test('attachment send shows without reload', async ({ page, auth }) => {
    await auth.login(TEST_USERS.driver);
    await page.goto('/messages');

    const conversation = page.locator('[data-testid="conversationRow"]').first();
    await expect(conversation).toBeVisible({ timeout: 10000 });
    await conversation.click();

    const filePath = path.join(process.cwd(), 'e2e', 'fixtures', 'temp-attachment.png');
    writeTempImage(filePath);

    await page.setInputFiles('[data-testid="attachmentButton"] input[type="file"]', filePath);
    await page.locator('[data-testid="sendButton"]').click();

    const messageList = page.locator('[data-testid="messageList"]');
    await expect(messageList.locator('img').last()).toBeVisible({ timeout: 10000 });
  });
});
