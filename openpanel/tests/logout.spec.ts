import { test, expect } from '@playwright/test';

test('logout', async ({ page }) => {
  // LOGOUT
  await page.getByRole('button', { name: 'User settings' }).click();
  await page.getByRole('link', { name: 'Sign out' }).click();

  await expect(page).toHaveURL(/.*login/);
});
