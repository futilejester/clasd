import { test, expect } from '@playwright/test';
import { login, uniqueSuffix } from './_helpers';

test.describe('Campaigns', () => {
  test('create draft campaign with template, edit, and delete', async ({
    page,
  }) => {
    await login(page);

    const suffix = uniqueSuffix();
    const name = `Test Campaign ${suffix}`;

    // New
    await page.goto('/campaigns');
    await page.getByRole('link', { name: /new campaign/i }).first().click();
    await page.waitForURL(/\/campaigns\/new/);

    // Pick the "Class reminder" template
    await page
      .getByRole('button', { name: /class reminder/i })
      .first()
      .click();
    await page.getByLabel(/campaign name/i).fill(name);
    await page.getByRole('button', { name: /continue to editor/i }).click();

    // Lands on editor — title shows
    await expect(
      page.getByRole('heading', { name: name }).first()
    ).toBeVisible();

    // Subject pre-filled from template
    const subject = page.getByLabel(/^subject$/i);
    await expect(subject).not.toBeEmpty();

    // Edit subject
    await subject.fill(`${name} — edited subject`);

    // Wait for autosave to complete
    await expect(page.getByText(/saved/i).first()).toBeVisible({
      timeout: 5000,
    });

    // Preview mode toggle
    await page.getByRole('button', { name: /preview/i }).click();
    await expect(page.getByText(/preview subject/i)).toBeVisible();
    await page.getByRole('button', { name: /edit/i }).click();

    // Delete via the danger zone
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /delete draft/i }).click();
    await page.waitForURL(/\/campaigns/);
    await expect(page.getByText(name)).toHaveCount(0);
  });
});
