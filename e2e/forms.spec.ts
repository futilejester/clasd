import { test, expect } from '@playwright/test';
import { login, uniqueSuffix } from './_helpers';

/**
 * The Free plan limit is 1 active signup form. Tests share a single
 * account and accumulate forms across runs, so creating an active form
 * eventually fails. We work around this by creating the test form in
 * INACTIVE state — we still verify it persists customisation correctly.
 *
 * Public submission is covered in chunk 6's manual test list.
 */
test.describe('Signup forms', () => {
  test('build a form with custom button text and verify customisation persists', async ({
    page,
  }) => {
    await login(page);

    const suffix = uniqueSuffix();
    const formName = `Test Form ${suffix}`;
    const slug = `test-form-${suffix}`;

    await page.goto('/forms/new');

    await page.getByLabel(/form name/i).fill(formName);
    await page.getByLabel(/url slug/i).fill(slug);
    await page.getByLabel(/headline/i).fill('Sign up please');
    await page.getByLabel(/button text/i).fill('Count me in');
    await page.getByLabel(/success title/i).fill('Got it!');

    // Create as inactive to avoid the 1-active-form free-tier limit
    const activeCheckbox = page.getByLabel(/active/i);
    if (await activeCheckbox.isChecked()) {
      await activeCheckbox.uncheck();
    }

    await page.getByRole('button', { name: /^create form$/i }).click();

    await expect(
      page.getByRole('heading', { name: formName })
    ).toBeVisible();

    // Edit to verify customisation persisted
    await page.getByRole('link', { name: /^edit$/i }).first().click();
    await expect(page.getByLabel(/button text/i)).toHaveValue('Count me in');
    await expect(page.getByLabel(/success title/i)).toHaveValue('Got it!');
    await expect(page.getByLabel(/headline/i)).toHaveValue('Sign up please');
  });
});
