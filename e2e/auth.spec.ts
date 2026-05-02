import { test, expect } from '@playwright/test';
import { login, logout, TEST_EMAIL, TEST_PASSWORD } from './_helpers';

test.describe('Marketing + auth', () => {
  test('homepage shows marketing content for logged-out users', async ({
    page,
    context,
  }) => {
    await logout(context);
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /Class communications/i })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /try free/i }).first()
    ).toBeVisible();
    // The marketing page has "Log in" links in both the header AND the
    // footer — strict mode rejects the ambiguous match. Take the first.
    await expect(
      page.getByRole('link', { name: /log in/i }).first()
    ).toBeVisible();
  });

  test('logged-in users get redirected to dashboard from homepage', async ({
    page,
  }) => {
    await login(page);
    await page.goto('/');
    await page.waitForURL(/\/dashboard/);
    await expect(
      page.getByRole('heading', { name: /(morning|afternoon|evening)/i })
    ).toBeVisible();
  });

  test('login page rejects invalid credentials', async ({
    page,
    context,
  }) => {
    await logout(context);
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('not-a-user@example.com');
    await page.getByLabel(/password/i).fill('wrong-password');
    await page.getByRole('button', { name: /log in|sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('login + session persistence across page reload', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard');
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole('heading', { name: /(morning|afternoon|evening)/i })
    ).toBeVisible();
  });

  test('protected routes redirect logged-out users to login', async ({
    page,
    context,
  }) => {
    await logout(context);
    await page.goto('/dashboard');
    await page.waitForURL(/\/login/);
  });
});
