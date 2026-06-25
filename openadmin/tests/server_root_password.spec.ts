import { test, expect } from '@playwright/test';

// NOTE: verify-only -- the form has no confirm() dialog and changing the root SSH
// password from a test run would lock the box's real credentials out of sync with
// anything a human operator expects, with no way to read back/revert the old password.

test('root password page loads with expected fields', async ({ page }) => {
  await page.goto('/server/root-password');
  await expect(page).toHaveURL(/server\/root-password/);

  const passwordField = page.locator('#password');
  await expect(passwordField).toBeVisible();
  await expect(passwordField).toHaveAttribute('type', 'password');
  await expect(passwordField).toHaveAttribute('minlength', '6');
  await expect(passwordField).toHaveAttribute('maxlength', '30');
  await expect(passwordField).toHaveAttribute('required', '');
  await expect(page.getByRole('button', { name: 'Change Password' })).toBeVisible();

  console.log('root password page loaded with expected fields, form not submitted');
});

test('password field rejects apostrophe via pattern attribute', async ({ page }) => {
  await page.goto('/server/root-password');

  const passwordField = page.locator('#password');
  await expect(passwordField).toHaveAttribute('pattern', "[^']{6,30}");

  console.log('password field pattern correctly excludes apostrophes');
});
