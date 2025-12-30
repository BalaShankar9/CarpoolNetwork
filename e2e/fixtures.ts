import fs from 'fs';
import path from 'path';
import { test as base, expect, Page } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  fullName: string;
}

export const TEST_USERS = {
  driver: {
    email: process.env.E2E_DRIVER_EMAIL || 'e2e-driver@test.carpoolnetwork.co.uk',
    password: process.env.E2E_DRIVER_PASSWORD || 'TestDriver123!',
    fullName: 'E2E Test Driver',
  },
  passenger: {
    email: process.env.E2E_PASSENGER_EMAIL || 'e2e-passenger@test.carpoolnetwork.co.uk',
    password: process.env.E2E_PASSENGER_PASSWORD || 'TestPassenger123!',
    fullName: 'E2E Test Passenger',
  },
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@carpoolnetwork.co.uk',
    password: process.env.E2E_ADMIN_PASSWORD || 'AdminTest123!',
    fullName: 'Admin User',
  },
};

export class AuthHelper {
  constructor(private page: Page) {}

  async login(user: TestUser) {
    await this.page.goto('/signin');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.fill('input#identifier', user.email);
    await this.page.fill('input#password', user.password);
    await this.page.click('button[type="submit"]');
    await this.page.waitForURL('/', { timeout: 15000 });
    await expect(this.page.locator('text=Welcome')).toBeVisible({ timeout: 10000 });
  }

  async logout() {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('text=Sign Out');
    await this.page.waitForURL('/signin', { timeout: 10000 });
  }

  async signup(user: TestUser, expectBetaBlock = false) {
    await this.page.goto('/signup');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.fill('input#fullName', user.fullName);
    await this.page.fill('input#email', user.email);
    await this.page.fill('input#phone', '+447700900000');
    await this.page.fill('input#password', user.password);
    await this.page.fill('input#confirmPassword', user.password);

    const submitBtn = this.page.locator('button[type="submit"]');

    if (expectBetaBlock) {
      try {
        await expect(submitBtn).toBeEnabled({ timeout: 5000 });
      } catch {
        await expect(this.page.locator('p.text-red-600')).toBeVisible({ timeout: 10000 });
        return;
      }
    }

    await expect(submitBtn).toBeEnabled({ timeout: 15000 });
    await submitBtn.click();

    if (expectBetaBlock) {
      await expect(this.page.locator('[role="alert"], p.text-red-600')).toBeVisible({ timeout: 10000 });
    } else {
      await this.page.waitForURL('/', { timeout: 15000 });
    }
  }
}

export class RideHelper {
  constructor(private page: Page) {}

  private async resolveAutocomplete() {
    const suggestion = this.page.locator('.pac-container .pac-item, [data-testid="suggestion-item"]').first();
    if (await suggestion.isVisible({ timeout: 2000 }).catch(() => false)) {
      await suggestion.click();
      await this.page.waitForTimeout(200);
      return;
    }
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.waitForTimeout(100);
  }

  async postRide(options: {
    origin: string;
    destination: string;
    date?: string;
    time?: string;
    seats?: number;
    price?: number;
  }) {
    await this.page.goto('/post-ride');
    await this.page.waitForLoadState('networkidle');

    await this.page.fill('#origin-input, [data-testid="origin-input"], input[placeholder*="pickup"], input[placeholder*="Starting"], input[placeholder*="starting"]', options.origin);
    await this.page.waitForTimeout(500);
    await this.resolveAutocomplete();

    await this.page.fill('#destination-input, [data-testid="destination-input"], input[placeholder*="drop-off"], input[placeholder*="Destination"], input[placeholder*="destination"]', options.destination);
    await this.page.waitForTimeout(500);
    await this.resolveAutocomplete();

    if (options.date) {
      const dateInput = this.page.locator('input[type="date"]').first();
      if (await dateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dateInput.fill(options.date);
      } else {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

        if (options.date === today) {
          const todayButton = this.page.locator('button:has-text("Today")').first();
          if (await todayButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await todayButton.click();
          }
        } else if (options.date === tomorrow) {
          const tomorrowButton = this.page.locator('button:has-text("Tomorrow")').first();
          if (await tomorrowButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await tomorrowButton.click();
          }
        } else {
          const customButton = this.page.locator('button:has-text("Custom")').first();
          if (await customButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await customButton.click();
            const customDateInput = this.page.locator('input[type="date"]').first();
            if (await customDateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
              await customDateInput.fill(options.date);
            }
          }
        }
      }
    }
    if (options.time) {
      const timeSelect = this.page
        .locator('label:has-text("Departure Time")')
        .locator('..')
        .locator('select')
        .first();
      if (await timeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await timeSelect.selectOption({ value: options.time });
      }
    }
    if (options.seats) {
      const seatsSelect = this.page
        .locator('label:has-text("Available Seats")')
        .locator('..')
        .locator('select')
        .first();
      if (await seatsSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await seatsSelect.selectOption({ value: options.seats.toString() });
      } else {
        const seatsInput = this.page.locator('input[name="seats"], [data-testid="seats-input"]').first();
        if (await seatsInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await seatsInput.fill(options.seats.toString());
        }
      }
    }
    if (options.price) {
      const priceInput = this.page.locator('input[name="price"], [data-testid="price-input"]').first();
      if (await priceInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await priceInput.fill(options.price.toString());
      }
    }

    await this.page.click('button[type="submit"]');
    await this.page.waitForURL(/\/rides\/|\/my-rides/, { timeout: 15000 });
  }

  async findRide(from: string, to: string) {
    await this.page.goto('/find-rides');
    await this.page.waitForLoadState('networkidle');

    const fromInput = this.page.locator('#search-origin-input, input[placeholder*="From"], input[placeholder*="pickup"]').first();
    await fromInput.fill(from);
    await this.page.waitForTimeout(300);
    await this.resolveAutocomplete();

    const toInput = this.page.locator('#search-destination-input, input[placeholder*="To"], input[placeholder*="destination"]').first();
    await toInput.fill(to);
    await this.page.waitForTimeout(300);
    await this.resolveAutocomplete();

    const searchBtn = this.page.locator('button:has-text("Search"), button[type="submit"]').first();
    if (await searchBtn.isVisible()) {
      await searchBtn.click();
    }

    await this.page.waitForTimeout(2000);
  }
}

export class BookingHelper {
  constructor(private page: Page) {}

  async requestBooking(rideId: string) {
    await this.page.goto(`/rides/${rideId}`);
    await this.page.waitForLoadState('networkidle');

    const bookBtn = this.page.locator('button:has-text("Book"), button:has-text("Request")').first();
    await expect(bookBtn).toBeVisible({ timeout: 10000 });
    await bookBtn.click();

    await this.page.waitForTimeout(2000);
  }

  async confirmBooking(bookingId: string) {
    await this.page.goto(`/bookings/${bookingId}`);
    await this.page.waitForLoadState('networkidle');

    const confirmBtn = this.page.locator('button:has-text("Confirm"), button:has-text("Accept")').first();
    if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await confirmBtn.click();
      await this.page.waitForTimeout(2000);
    }
  }

  async cancelBooking(bookingId: string) {
    await this.page.goto(`/bookings/${bookingId}`);
    await this.page.waitForLoadState('networkidle');

    const cancelBtn = this.page.locator('button:has-text("Cancel")').first();
    if (await cancelBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cancelBtn.click();

      const confirmCancel = this.page.locator('button:has-text("Yes"), button:has-text("Confirm")');
      if (await confirmCancel.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmCancel.click();
      }

      await this.page.waitForTimeout(2000);
    }
  }
}

export class MessagingHelper {
  constructor(private page: Page) {}

  async sendMessage(recipientId: string, message: string) {
    await this.page.goto('/messages');
    await this.page.waitForLoadState('networkidle');

    const conversationItem = this.page.locator(`[data-conversation-id="${recipientId}"], [data-testid="conversation-item"]`).first();
    if (await conversationItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await conversationItem.click();
    }

    const messageInput = this.page.locator('input[placeholder*="message"], textarea[placeholder*="message"]').first();
    await messageInput.fill(message);

    const sendBtn = this.page.locator('button[type="submit"], button:has-text("Send")').first();
    await sendBtn.click();

    await this.page.waitForTimeout(1000);
  }

  async checkMessageReceived(message: string) {
    await this.page.goto('/messages');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);

    const messageText = this.page.locator(`text=${message}`);
    return await messageText.isVisible({ timeout: 5000 }).catch(() => false);
  }
}

type TestFixtures = {
  auth: AuthHelper;
  rides: RideHelper;
  bookings: BookingHelper;
  messaging: MessagingHelper;
};

export const test = base.extend<TestFixtures>({
  auth: async ({ page }, applyFixture) => {
    await applyFixture(new AuthHelper(page));
  },
  rides: async ({ page }, applyFixture) => {
    await applyFixture(new RideHelper(page));
  },
  bookings: async ({ page }, applyFixture) => {
    await applyFixture(new BookingHelper(page));
  },
  messaging: async ({ page }, applyFixture) => {
    await applyFixture(new MessagingHelper(page));
  },
});

const envFilePath = path.resolve(process.cwd(), '.env');
const envFileContents = fs.existsSync(envFilePath) ? fs.readFileSync(envFilePath, 'utf8') : '';
const envSupabaseUrl = process.env.VITE_SUPABASE_URL || '';
const envSupabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const hasSupabaseEnvVars = Boolean(envSupabaseUrl && envSupabaseKey);
const hasSupabaseEnvFile =
  /VITE_SUPABASE_URL=.+/i.test(envFileContents) && /VITE_SUPABASE_ANON_KEY=.+/i.test(envFileContents);
const hasPlaceholderEnv =
  envSupabaseUrl.includes('your-project-ref.supabase.co') ||
  envSupabaseKey.includes('your-anon-key-here') ||
  envFileContents.includes('your-project-ref.supabase.co') ||
  envFileContents.includes('your-anon-key-here');
export const isE2EConfigured = (hasSupabaseEnvVars || hasSupabaseEnvFile) && !hasPlaceholderEnv;

export { expect };
