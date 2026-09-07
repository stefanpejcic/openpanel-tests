import { test, expect } from '@playwright/test';

test('edit services page loads with JSON editor and Go back link', async ({ page }) => {
  await page.goto('/services/edit');
  await expect(page).toHaveURL(/services\/edit/);

  await expect(page.getByRole('heading', { name: 'Edit Services' })).toBeVisible();
  await expect(page.locator('a[href="/services"]', { hasText: 'Go back' })).toBeVisible();

  const textarea = page.locator('textarea[name="data"]');
  await expect(textarea).toBeVisible();
  const content = await textarea.inputValue();
  expect(() => JSON.parse(content)).not.toThrow();

  console.log('edit services page loaded with valid JSON in the editor');
});

test('invalid JSON is rejected client-side without submitting', async ({ page }) => {
  await page.goto('/services/edit');

  const textarea = page.locator('textarea[name="data"]');
  const original = await textarea.inputValue();

  await textarea.fill('{not valid json');
  await page.getByRole('button', { name: 'Save' }).click();

  // form submission is prevented entirely (no redirect), so the page and
  // the broken content both remain exactly as left
  await expect(page).toHaveURL(/services\/edit/);
  await expect(textarea).toHaveValue('{not valid json');

  await textarea.fill(original);
  console.log('invalid JSON was rejected client-side, form never submitted');
});

test('saving the same (unchanged) JSON round-trips successfully', async ({ page }) => {
  await page.goto('/services/edit');

  const textarea = page.locator('textarea[name="data"]');
  const original = await textarea.inputValue();
  const parsedOriginal = JSON.parse(original);

  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).toHaveURL(/services\/edit/);
  await expect(page.getByRole('alert')).toContainText(/Config file updated successfully/);

  const reloaded = JSON.parse(await textarea.inputValue());
  expect(reloaded).toEqual(parsedOriginal);

  console.log('saved unchanged services.json content round-tripped successfully');
});
