import { test, expect } from '@playwright/test';
import { login } from './_helpers';

test.describe('Dashboard', () => {
  test('shows subscriber counts, campaign stats, recent activity', async ({
    page,
  }) => {
    await login(page);
    await page.goto('/dashboard');

    await expect(
      page.getByRole('heading', { name: /(morning|afternoon|evening)/i })
    ).toBeVisible();

    // Stat cards — use .first() because some labels appear in multiple
    // places (e.g. "Campaigns sent" stat card label vs draft sub-count)
    await expect(
      page.getByText(/subscribed students/i).first()
    ).toBeVisible();
    await expect(
      page.getByText(/active classes/i).first()
    ).toBeVisible();
    await expect(
      page.getByText(/upcoming sessions/i).first()
    ).toBeVisible();
    await expect(
      page.getByText(/campaigns sent/i).first()
    ).toBeVisible();
  });
});

test.describe('Settings', () => {
  test('shows account, plan, usage, danger zone', async ({ page }) => {
    await login(page);
    await page.goto('/settings');

    await expect(
      page.getByRole('heading', { name: 'Settings' })
    ).toBeVisible();
    await expect(page.getByText(/account/i).first()).toBeVisible();
    await expect(page.getByText(/plan/i).first()).toBeVisible();
    await expect(page.getByText(/this month.s usage/i)).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /danger zone/i })
    ).toBeVisible();
  });

  test('danger zone hides delete button until expanded', async ({ page }) => {
    await login(page);
    await page.goto('/settings');

    await expect(
      page.getByRole('button', { name: /^delete account$/i })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /permanently delete/i })
    ).not.toBeVisible();

    await page.getByRole('button', { name: /^delete account$/i }).click();
    await expect(
      page.getByRole('button', { name: /permanently delete/i })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /permanently delete/i })
    ).toBeDisabled();

    await page.getByRole('button', { name: /^cancel$/i }).click();
    await expect(
      page.getByRole('button', { name: /permanently delete/i })
    ).not.toBeVisible();
  });
});
