import { test, expect } from '@playwright/test';

test('create domain', async ({ page }) => {
  await page.goto('/domains');
  await expect(page).toHaveURL(/domains/);

  await page.getByText('Add Domain', { exact: true }).first().click();

  await page.locator('#domain').fill('example.test.rs');
  await page.locator('#username').fill('testinguser');
  await page.getByRole('listitem').filter({ hasText: 'testinguser' }).click();

  await page.getByRole('button', { name: 'Add Domain' }).click();

  // Verify the domain was added
  await expect(page.getByRole('link', { name: 'example.test.rs' })).toBeVisible();
});
