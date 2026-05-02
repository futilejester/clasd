import { test, expect } from '@playwright/test';
import { login, uniqueSuffix } from './_helpers';

test.describe('Segments', () => {
  /**
   * Note: segments are a Pro-tier feature. On the Free plan, creation
   * should fail with the upgrade message. On Pro, full flow works.
   *
   * We test the structural side (page renders, builder is interactive)
   * which works regardless of plan, and the conditional behaviour at
   * submit time.
   */
  test('segments list renders, new segment page has rule builder', async ({
    page,
  }) => {
    await login(page);
    await page.goto('/segments');
    await expect(
      page.getByRole('heading', { name: 'Segments' })
    ).toBeVisible();

    // Go to new
    await page.getByRole('link', { name: /new segment/i }).first().click();
    await page.waitForURL(/\/segments\/new/);

    // Builder elements present
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByLabel(/target/i)).toBeVisible();
    // The combinator pill (All / Any)
    await expect(page.getByRole('button', { name: /^all$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^any$/i })).toBeVisible();
    // Add condition button
    await expect(
      page.getByRole('button', { name: /add condition/i })
    ).toBeVisible();
  });

  test('add condition then preview updates', async ({ page }) => {
    await login(page);
    await page.goto('/segments/new');

    await page.getByLabel(/name/i).fill(`Test segment ${uniqueSuffix()}`);

    // Add a condition
    await page.getByRole('button', { name: /add condition/i }).click();

    // The condition row should now appear with field/op/value selects
    // Default first field is the first STUDENT_FIELD entry — values render
    // depending on that field, but at minimum the field selector is there
    await expect(page.locator('select').first()).toBeVisible();

    // Preview section should evaluate (count rendered)
    await expect(
      page.getByText(/student/i).filter({ hasText: /match/i }).first()
    ).toBeVisible({ timeout: 3000 });
  });
});
