import { test, expect } from '@playwright/test';

test('logout', async ({ page }) => {
  // LOGOUT
  await page.locator('#user-btn-info').click();
  await page.getByRole('link', { name: 'Sign out' }).click();

  await expect(page).toHaveURL(/.*login/);
});
