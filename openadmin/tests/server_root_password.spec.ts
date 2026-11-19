import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/server/root-password');

  if (await page.getByText('Forbidden', { exact: true }).isVisible().catch(() => false)) {
    test.skip(true, 'only the Super Administrator can open Root password, the test login is a regular admin');
  }
});

test('root password page loads with expected fields', async ({ page }) => {
  const passwordField = page.locator('#password');

  await expect(passwordField).toBeVisible();
  await expect(passwordField).toHaveAttribute('name', 'password');
  await expect(passwordField).toHaveAttribute('minlength', '6');
  await expect(passwordField).toHaveAttribute('maxlength', '30');
  await expect(passwordField).toHaveAttribute('required', '');

  await expect(page.getByRole('button', { name: 'Change Password' })).toBeVisible();
});

test('password field rejects apostrophe via pattern attribute', async ({ page }) => {
  const passwordField = page.locator('#password');
  await expect(passwordField).toHaveAttribute('pattern', "[^']{6,30}");

  console.log('password field pattern correctly excludes apostrophes');
});
