import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

const usePreview = process.env.E2E_USE_PREVIEW === 'true';
const webServerCommand = usePreview ? 'npm run preview -- --port 5173 --strictPort' : 'npm run dev';
const reuseExistingServer = !process.env.CI && !usePreview;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: webServerCommand,
    url: 'http://localhost:5173',
    reuseExistingServer,
    timeout: 120000,
  },
});
