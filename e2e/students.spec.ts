import { test, expect } from '@playwright/test';
import { login, uniqueSuffix } from './_helpers';

test.describe('Students', () => {
  test('create student, dedup on duplicate email', async ({ page }) => {
    await login(page);

    const suffix = uniqueSuffix();
    const email = `student-${suffix}@test.local`;

    // Create
    await page.goto('/students');
    await page.getByRole('link', { name: /add student/i }).first().click();
    await page.waitForURL(/\/students\/new/);

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^name$/i).fill('Test Student');
    await page.getByRole('button', { name: /^add student$/i }).click();

    await expect(
      page.getByRole('heading', { name: 'Test Student' })
    ).toBeVisible();

    // Try again with same email — should redirect to existing record
    await page.goto('/students/new');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^name$/i).fill('Updated Name');
    await page.getByRole('button', { name: /^add student$/i }).click();

    await expect(
      page.getByRole('heading', { name: 'Updated Name' })
    ).toBeVisible();

    // Only one row in the list with that email
    await page.goto('/students');
    const rows = page.getByText(email);
    await expect(rows).toHaveCount(1);
  });

  test('student detail page shows activity timeline', async ({ page }) => {
    await login(page);

    const suffix = uniqueSuffix();
    const email = `timeline-${suffix}@test.local`;

    await page.goto('/students/new');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^name$/i).fill('Timeline Test');
    await page.getByRole('button', { name: /^add student$/i }).click();

    await expect(
      page.getByRole('heading', { name: /activity/i })
    ).toBeVisible();
    await expect(
      page.getByText(/added to your audience/i)
    ).toBeVisible();
  });
});
