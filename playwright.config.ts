import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    // Mobile viewport — iPhone 14 / target Android
    viewport: { width: 390, height: 844 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Pixel 5'] },
    },
    // Run all browsers in dev — CI only uses chromium
    ...(process.env.CI
      ? []
      : [
          { name: 'firefox', use: { ...devices['Galaxy S9+'] } },
          { name: 'webkit', use: { ...devices['iPhone 13'] } },
        ]),
  ],
});
