import { test as setup, expect } from '@playwright/test';
import path from 'path';

export const AUTH_FILE = path.join(__dirname, '../.auth/session.json');

const BASE_URL = process.env.BASE_URL ?? 'https://185.193.66.252:2083';
const USERNAME  = process.env.USERNAME  ?? 'testinguser';
const PASSWORD  = process.env.PASSWORD  ?? 'testingpassword';

setup('authenticate', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);
  await page.getByRole('textbox', { name: 'Username' }).fill(USERNAME);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/.*dashboard/);

  await page.context().storageState({ path: AUTH_FILE });
});
