import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for Clasd e2e tests.
 *
 * Tests run against a live dev server (npm run dev). They assume:
 *  - Supabase is set up with the migrations applied
 *  - A test user exists with credentials in PLAYWRIGHT_TEST_EMAIL / PLAYWRIGHT_TEST_PASSWORD
 *
 * If PLAYWRIGHT_TEST_EMAIL is not set, tests use defaults that you'll need
 * to register first. See e2e/README.md.
 *
 * Chromium-only — covers ~99% of users and runs ~3x faster than multi-browser.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // tests share a single user account → run sequentially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  timeout: 30_000,

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
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

  // Don't auto-start the dev server — we want to control it manually so the
  // dev session and test run share state.
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
