import { test, expect } from '@playwright/test';

test('change email', async ({ page }) => {
  await page.goto(`/account`);

  const newEmail = `user_${Date.now()}@testmail.com`;

  const emailInput = page.getByRole('textbox', { name: 'Email address*' });

  await emailInput.fill(newEmail);
  await page.getByRole('button', { name: 'Update' }).click();

  await expect(page.locator('body')).toContainText(/has been changed successfully/i);
  await expect(emailInput).toHaveValue(newEmail);

  console.log(`email changed to: ${newEmail}`);
});

