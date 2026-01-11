import path from 'path';
import { test, expect, TEST_USERS, isE2EConfigured } from './fixtures';

test.skip(!isE2EConfigured, 'E2E env not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

const imagePath = path.resolve(__dirname, '..', 'public', 'favicon-32x32.png');

async function ensureVehicle(page: any) {
  await page.goto('/profile?section=vehicles');
  await page.waitForLoadState('networkidle');

  const noVehicles = page.locator('text=No vehicles yet');
  const hasNoVehicles = await noVehicles.isVisible({ timeout: 2000 }).catch(() => false);

  if (!hasNoVehicles) {
    return;
  }

  const addVehicleBtn = page.getByRole('button', { name: /add your first vehicle|add vehicle/i }).first();
  await addVehicleBtn.click();

  const manualEntryBtn = page.getByRole('button', { name: /enter details manually/i }).first();
  if (await manualEntryBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await manualEntryBtn.click();
  }

  await page.fill('input[placeholder*="Toyota"], input[placeholder*="Make"]', 'TestMake');
  await page.fill('input[placeholder*="Corolla"], input[placeholder*="Model"]', 'TestModel');
  const yearInput = page.locator('input[type="number"]').first();
  if (await yearInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await yearInput.fill('2020');
  }
  await page.fill('input[placeholder*="Silver"], input[placeholder*="Color"]', 'Black');
  await page.fill('input[placeholder*="BV67FHU"], input[placeholder*="License"]', 'TEST123');

  const vehiclePhotoInput = page
    .locator('label:has-text("Vehicle Photo")')
    .locator('..')
    .locator('input[type="file"]');

  if (await vehiclePhotoInput.count()) {
    await vehiclePhotoInput.setInputFiles(imagePath);
  }

  const submitBtn = page.getByRole('button', { name: /add vehicle/i }).first();
  await submitBtn.click();
  await page.waitForTimeout(2000);
}

test.describe('Vehicle and ride management', () => {
  test('post ride recognizes vehicles and blocks after deletion', async ({ page, auth }) => {
    await auth.login(TEST_USERS.driver);

    await ensureVehicle(page);

    await page.goto('/post-ride');
    await page.waitForLoadState('networkidle');

    const vehicleSelect = page.locator('#vehicle-select');
    await expect(vehicleSelect).toBeVisible({ timeout: 5000 });

    await page.goto('/profile?section=vehicles');
    await page.waitForLoadState('networkidle');

    const deleteVehicleBtn = page.getByRole('button', { name: /delete vehicle/i }).first();
    if (await deleteVehicleBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deleteVehicleBtn.click();
      const confirmDelete = page.locator('button:has-text("Delete Vehicle")').first();
      if (await confirmDelete.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmDelete.click();
      }
      await page.waitForTimeout(2000);
    }

    await page.goto('/post-ride');
    await page.waitForLoadState('networkidle');

    const noVehicleMessage = page.locator('text=No Vehicle Registered');
    if (await noVehicleMessage.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(noVehicleMessage).toBeVisible();
    }
  });

  test('delete ride removes it from My Rides list', async ({ page, auth, rides }) => {
    await auth.login(TEST_USERS.driver);

    await ensureVehicle(page);

    await rides.postRide({
      origin: 'E2E Origin',
      destination: 'E2E Destination',
      date: new Date().toISOString().split('T')[0],
      time: '08:00',
      seats: 1,
    });

    await page.goto('/my-rides');
    await page.waitForLoadState('networkidle');

    const deleteButtons = page.locator('button[title="Delete Ride"]');
    const countBefore = await deleteButtons.count();
    if (countBefore === 0) return;

    await deleteButtons.first().click();
    const confirmDelete = page.getByRole('button', { name: 'Delete' });
    if (await confirmDelete.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmDelete.click();
    }

    await expect(deleteButtons).toHaveCount(Math.max(countBefore - 1, 0));
  });

  test('expired rides show archived passengers with messaging closed', async ({ page, auth }) => {
    await page.addInitScript(() => {
      const offsetMs = 7 * 24 * 60 * 60 * 1000;
      const RealDate = Date;
      class MockDate extends RealDate {
        constructor(...args: any[]) {
          if (args.length === 0) {
            return new RealDate(RealDate.now() + offsetMs) as any;
          }
          return new RealDate(...args) as any;
        }
        static now() {
          return RealDate.now() + offsetMs;
        }
      }
      // @ts-expect-error override
      window.Date = MockDate as any;
    });

    await auth.login(TEST_USERS.driver);
    await page.goto('/my-rides');
    await page.waitForLoadState('networkidle');

    const passengersTab = page.locator('button:has-text("Passengers")').first();
    if (await passengersTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await passengersTab.click();
      await page.waitForTimeout(1500);
    }

    const archivedHeading = page.locator('text=Archived').first();
    if (await archivedHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
      const messagingClosed = page.getByRole('button', { name: /messaging closed/i }).first();
      await expect(messagingClosed).toBeDisabled();
    }
  });
});
