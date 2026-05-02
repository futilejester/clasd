import { type Page, type BrowserContext, expect } from '@playwright/test';

/**
 * Test credentials. Default to a known test account; override via env vars
 * when running locally.
 *
 * Set up the test account once:
 *  1. Sign up at /signup with this email + password
 *  2. Tests will log in with these credentials before each test
 */
export const TEST_EMAIL =
  process.env.PLAYWRIGHT_TEST_EMAIL ?? 'playwright@clasd.test';
export const TEST_PASSWORD =
  process.env.PLAYWRIGHT_TEST_PASSWORD ?? 'playwright-test-pw-123';

/**
 * Generate a unique-ish ID for test artifacts so parallel runs don't collide
 * and we can identify what each test created.
 */
export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

/**
 * Sign in via the login form. Asserts dashboard is reached.
 */
export async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(TEST_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /log in|sign in/i }).click();
  await page.waitForURL(/\/dashboard/);
}

/**
 * Make sure the user is signed out — useful for marketing/auth tests.
 */
export async function logout(context: BrowserContext) {
  await context.clearCookies();
}

/**
 * Wait for a toast to appear with text matching `pattern`. Useful for
 * confirming server actions succeeded.
 */
export async function expectToast(page: Page, pattern: RegExp | string) {
  await expect(
    page.locator('[data-sonner-toast]', { hasText: pattern }).first()
  ).toBeVisible({ timeout: 5000 });
}
