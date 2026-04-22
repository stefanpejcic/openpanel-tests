import { test, expect } from '@playwright/test';

test('login as user', async ({ page }) => {
  await page.goto('https://185.193.66.252:2083/login');
  await page.getByRole('textbox', { name: 'Username' }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill('testinguser');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('testingpassword');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).toHaveURL(/dashboard);

});
