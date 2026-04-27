import { test, expect } from '@playwright/test';

test('logout', async ({ page }) => {
  await page.goto('/dashboard');

  // LOGOUT
  await page.locator('#user-btn-info').click();
  await page.getByRole('link', { name: 'Sign out' }).click();

  await expect(page).toHaveURL(/.*login/);
});
