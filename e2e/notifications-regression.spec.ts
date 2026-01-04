import { createClient } from '@supabase/supabase-js';
import { expect, test, TEST_USERS, AuthHelper } from './fixtures';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

test.describe('Notifications regression', () => {
  test.beforeEach(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
      test.skip('Supabase environment variables are not configured');
    }
  });

  test('unread count updates and mark-as-read/mark-all-read work', async ({ page }) => {
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
    const authHelper = new AuthHelper(page);

    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_USERS.passenger.email,
      password: TEST_USERS.passenger.password,
    });
    if (signInError || !authData.user) {
      test.skip('Unable to sign in seed user for notifications');
    }

    const userId = authData.user!.id;

    const supportsReadAt = async () => {
      const { error } = await supabase.from('notifications').select('read_at').limit(1);
      return !error;
    };

    if (await supportsReadAt()) {
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null);
    } else {
      await supabase
        .from('notifications')
        .update({ is_read: true } as any)
        .eq('user_id', userId)
        .eq('is_read', false as any);
    }

    const uniqueMessage = `E2E Notification ${Date.now()}`;
    const uniqueMessage2 = `${uniqueMessage}-second`;

    const seedPayload = await supportsReadAt()
      ? [
          { user_id: userId, type: 'SYSTEM', data: { message: uniqueMessage }, read_at: null },
          { user_id: userId, type: 'SYSTEM', data: { message: uniqueMessage2 }, read_at: null },
        ]
      : [
          {
            user_id: userId,
            type: 'system',
            title: 'Notification',
            message: uniqueMessage,
            data: { message: uniqueMessage },
            is_read: false,
          } as any,
          {
            user_id: userId,
            type: 'system',
            title: 'Notification',
            message: uniqueMessage2,
            data: { message: uniqueMessage2 },
            is_read: false,
          } as any,
        ];

    const { error: insertError } = await supabase.from('notifications').insert(seedPayload as any);
    if (insertError) {
      test.skip(`Failed to seed notification: ${insertError.message}`);
    }

    await authHelper.login(TEST_USERS.passenger);

    const badge = page.locator('[data-testid="notification-badge"]').first();
    await expect(badge).toBeVisible({ timeout: 10000 });
    const beforeCount = parseInt((await badge.innerText()).replace('+', ''), 10) || 0;
    expect(beforeCount).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Notifications' }).first().click();

    const notificationItem = page.locator('[data-testid="notification-item"]', { hasText: uniqueMessage }).first();
    await expect(notificationItem).toBeVisible({ timeout: 10000 });

    await notificationItem.locator('[data-testid="panel-mark-read-button"], [data-testid="mark-read-button"]').first().click();
    await expect(badge).toBeVisible({ timeout: 5000 });
    const afterCount = parseInt((await badge.innerText()).replace('+', ''), 10) || 0;
    expect(afterCount).toBeLessThan(beforeCount);
    expect(afterCount).toBeGreaterThanOrEqual(1);

    await page.getByTestId('panel-mark-all-read').click();
    await expect(page.locator('[data-testid="notification-badge"]')).toBeHidden({ timeout: 5000 });
  });
});
