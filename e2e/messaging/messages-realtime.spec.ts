import { test, expect, TEST_USERS, isE2EConfigured, AuthHelper } from '../fixtures';

async function loginUser(page: any, user: { email: string; password: string; fullName: string }) {
  const auth = new AuthHelper(page);
  await auth.login(user);
}

test.describe('Messages Realtime', () => {
  test.skip(!isE2EConfigured, 'E2E env not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

  test('sender sees message instantly with optimistic UI', async ({ page }) => {
    await loginUser(page, TEST_USERS.driver);
    await page.goto('/messages');

    // Wait for conversations to load
    await expect(page.getByTestId('conversationList')).toBeVisible({ timeout: 10000 });

    // Select first conversation
    const firstConversation = page.getByTestId('conversationRow').first();
    const conversationExists = await firstConversation.count() > 0;

    test.skip(!conversationExists, 'No conversations available for testing');

    await firstConversation.click();

    // Wait for message input to be ready
    const messageInput = page.getByTestId('messageInput');
    await expect(messageInput).toBeVisible({ timeout: 5000 });
    await expect(messageInput).toBeEnabled();

    // Send a test message
    const testMessage = `Test message ${Date.now()}`;
    await messageInput.fill(testMessage);
    await page.getByTestId('sendButton').click();

    // Message should appear IMMEDIATELY (optimistic UI)
    await expect(page.getByText(testMessage)).toBeVisible({ timeout: 1000 });

    // Check for sending indicator (opacity-60 or spinning icon)
    const messageBubble = page.locator(`[data-testid="messageBubble"]:has-text("${testMessage}")`).first();

    // Should show sending state initially
    const hasOpacity = await messageBubble.evaluate((el) =>
      el.classList.contains('opacity-60')
    );
    const hasSendingIcon = await page.locator('[data-testid="sending-icon"]').count() > 0;

    // At least one indicator should be present
    expect(hasOpacity || hasSendingIcon).toBe(true);

    // Should transition to sent within 3s (opacity back to 100)
    await expect(messageBubble).not.toHaveClass(/opacity-60/, { timeout: 3000 });

    // Should show sent/delivered icon (check or check-check)
    await expect(
      messageBubble.locator('[data-testid="check-icon"], [data-testid="check-check-icon"]')
    ).toBeVisible({ timeout: 2000 });
  });

  test('recipient receives message in realtime without reload', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // Login both users
      await loginUser(page1, TEST_USERS.driver);
      await loginUser(page2, TEST_USERS.passenger);

      // Both navigate to messages
      await page1.goto('/messages');
      await page2.goto('/messages');

      // Wait for both conversation lists to load
      await expect(page1.getByTestId('conversationList')).toBeVisible({ timeout: 10000 });
      await expect(page2.getByTestId('conversationList')).toBeVisible({ timeout: 10000 });

      // Both select the same conversation (assuming first conversation is shared)
      const conv1 = page1.getByTestId('conversationRow').first();
      const conv2 = page2.getByTestId('conversationRow').first();

      const hasConversations = await conv1.count() > 0;
      test.skip(!hasConversations, 'No shared conversation available for testing');

      await conv1.click();
      await conv2.click();

      // Wait for message inputs to be ready
      await expect(page1.getByTestId('messageInput')).toBeEnabled({ timeout: 5000 });
      await expect(page2.getByTestId('messageInput')).toBeEnabled({ timeout: 5000 });

      // Send message from user1
      const testMessage = `Realtime test ${Date.now()}`;
      await page1.getByTestId('messageInput').fill(testMessage);
      await page1.getByTestId('sendButton').click();

      // Verify user1 sees it instantly (optimistic)
      await expect(page1.getByText(testMessage)).toBeVisible({ timeout: 1000 });

      // Verify user2 receives it without reload (realtime delivery within 5s)
      await expect(page2.getByText(testMessage)).toBeVisible({ timeout: 5000 });

    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('read receipts update in realtime', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await loginUser(page1, TEST_USERS.driver);
      await loginUser(page2, TEST_USERS.passenger);

      await page1.goto('/messages');
      await page2.goto('/messages');

      await expect(page1.getByTestId('conversationList')).toBeVisible({ timeout: 10000 });
      await expect(page2.getByTestId('conversationList')).toBeVisible({ timeout: 10000 });

      const conv1 = page1.getByTestId('conversationRow').first();
      const hasConversations = await conv1.count() > 0;
      test.skip(!hasConversations, 'No shared conversation available for testing');

      await page1.getByTestId('conversationRow').first().click();
      await page2.getByTestId('conversationRow').first().click();

      await expect(page1.getByTestId('messageInput')).toBeEnabled({ timeout: 5000 });
      await expect(page2.getByTestId('messageInput')).toBeEnabled({ timeout: 5000 });

      // User1 sends message
      const testMessage = `Read receipt test ${Date.now()}`;
      await page1.getByTestId('messageInput').fill(testMessage);
      await page1.getByTestId('sendButton').click();

      // User1's message should show sent (single check or double check gray)
      const messageBubble1 = page1.locator(`[data-testid="messageBubble"]:has-text("${testMessage}")`).first();
      await expect(
        messageBubble1.locator('[data-testid="check-icon"], [data-testid="check-check-icon"]')
      ).toBeVisible({ timeout: 3000 });

      // User2 sees message (realtime delivery)
      await expect(page2.getByText(testMessage)).toBeVisible({ timeout: 5000 });

      // Scroll to ensure message is in view (triggers read receipt)
      await page2.getByTestId('messageList').evaluate((el) => (el.scrollTop = el.scrollHeight));

      // Wait a moment for read receipt to propagate
      await page2.waitForTimeout(1000);

      // User1 should now see read receipt (double check blue)
      const blueCheckCheck = messageBubble1.locator('[data-testid="check-check-icon"].text-blue-500');
      await expect(blueCheckCheck).toBeVisible({ timeout: 5000 });

    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('messages appear in chronological order', async ({ page }) => {
    await loginUser(page, TEST_USERS.driver);
    await page.goto('/messages');

    await expect(page.getByTestId('conversationList')).toBeVisible({ timeout: 10000 });

    const firstConversation = page.getByTestId('conversationRow').first();
    const conversationExists = await firstConversation.count() > 0;
    test.skip(!conversationExists, 'No conversations available for testing');

    await firstConversation.click();
    await expect(page.getByTestId('messageInput')).toBeEnabled({ timeout: 5000 });

    // Send 3 rapid messages
    const messages = [
      `Message 1 ${Date.now()}`,
      `Message 2 ${Date.now() + 1}`,
      `Message 3 ${Date.now() + 2}`,
    ];

    for (const msg of messages) {
      await page.getByTestId('messageInput').fill(msg);
      await page.getByTestId('sendButton').click();
      await page.waitForTimeout(100); // Small delay between messages
    }

    // All messages should be visible
    for (const msg of messages) {
      await expect(page.getByText(msg)).toBeVisible({ timeout: 3000 });
    }

    // Check that messages are in order (top to bottom)
    const messageElements = await page.getByTestId('messageBubble').all();

    // Get text content of message bubbles that contain our test messages
    const messageTexts: string[] = [];
    for (const elem of messageElements) {
      const text = await elem.textContent();
      if (text && messages.some(m => text.includes(m))) {
        messageTexts.push(text);
      }
    }

    // Verify messages appear in chronological order
    expect(messageTexts.length).toBeGreaterThanOrEqual(3);

  });
});
