import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://185.193.66.252:2087/login');
  // openpanel link
  await page.getByRole('link', { name: 'Switch to OpenPanel' }).click();
  await expect(page).toHaveURL('https://185.193.66.252:2083/login');
  // login
  await page.goto('https://185.193.66.252:2087/login');
  await page.getByRole('textbox', { name: 'Username' }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill('stefan');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('stefan');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/.*dashboard/);

});
