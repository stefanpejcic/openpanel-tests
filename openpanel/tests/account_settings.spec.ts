import { test, expect } from '@playwright/test';

test('email address', async ({ page }) => {
  await page.goto(`/account`);

  const newEmail = `user_${Date.now()}@testmail.com`;

  const emailInput = page.getByRole('textbox', { name: 'Email address*' });

  await emailInput.fill(newEmail);
  await page.getByRole('button', { name: 'Update' }).click();

  await expect(page.locator('body')).toContainText(/has been changed successfully/i);
  await expect(emailInput).toHaveValue(newEmail);

  console.log(`email changed to: ${newEmail}`);
});



// TODO: username change



test('password', async ({ page }) => {
  await page.goto(`/account`);

  // CHANGE
  await page.getByRole('textbox', { name: 'Password* Confirm Password*' }).fill('novipassword');
  await page.getByRole('textbox', { name: 'Confirm New Password' }).fill('novipassword');
  
  await page.getByRole('button', { name: 'Update' }).click();
  
  await expect(page.locator('body')).toContainText(/has been changed successfully/i);
  await page.goto(`/files`);
  await expect(page).toHaveURL(/.*login/);

  // TEST
  await page.getByRole('textbox', { name: 'Username' }).fill('testinguser');
  await page.getByRole('textbox', { name: 'Password' }).fill('novipassword');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).toHaveURL(/.*dashboard/);
  console.log(`password changed to: ${newEmail} and loigin successfully`);

  // REVERT
  await page.goto(`/account`);

  await page.getByRole('textbox', { name: 'Password* Confirm Password*' }).fill('testingpassword');
  await page.getByRole('textbox', { name: 'Confirm New Password' }).fill('testingpassword');
  
  await page.getByRole('button', { name: 'Update' }).click();
  
  await expect(page.locator('body')).toContainText(/has been changed successfully/i);
});

