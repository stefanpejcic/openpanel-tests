import { test, expect, type Page } from '@playwright/test';
import { totp } from 'otplib';

let totpSecret: string;

const USERNAME = process.env.PANEL_USERNAME;
const PASSWORD = process.env.PANEL_PASSWORD;


function generateCode(): string {
  return totp.generate(totpSecret);
}

// ENABLE
test('enable', async ({ page }) => {
  await page.goto(`/account/2fa`);
  await expect(page.locator('#twofa_code')).not.toBeVisible();
  await expect(page.locator('text=disabled')).toBeVisible();

  await page.click('button:has-text("Click to enable 2FA")');
  await page.click('#showLink');

  const secretEl = page.locator('#initiallyhiddencode');
  await expect(secretEl).toBeVisible();
  totpSecret = (await secretEl.textContent())!.trim();
  expect(totpSecret.length).toBeGreaterThan(10); // sanity check

  console.log('Captured TOTP secret:', totpSecret);

  await page.goto(`/account/2fa`);
  const confirmBtn = page.locator('button:has-text("Confirm")');
  const step2Tab   = page.locator('#dashboard-styled-tab');

  if (await step2Tab.isVisible()) {
    await step2Tab.click();
  } else {
    // Session kept state
  }

  await expect(confirmBtn).toBeVisible();
  await confirmBtn.click();
  await expect(page.locator('text=enabled')).toBeVisible();
});


test('login with incorrect 2FA code', async ({ page }) => {
  await page.goto(`/login`);

  await page.getByRole('textbox', { name: 'Username' }).fill(USERNAME);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.locator('#twofa_code')).toBeVisible();
  await page.fill('#twofa_code', '000000');
  await page.click('button[type="submit"]');

  await expect(page.locator('.bg-red-50, .bg-red-500\\/10')).toBeVisible();
  await expect(page.locator('#twofa_code')).toBeVisible();
});


test('login with 2FA code', async ({ page }) => {
  await page.goto(`/login`);

  await page.getByRole('textbox', { name: 'Username' }).fill(USERNAME);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.locator('#twofa_code')).toBeVisible();
  await page.fill('#twofa_code', generateCode());
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/.*dashboard/);
});


test('disable 2FA', async ({ page }) => {
  await page.goto(`/account/2fa`);
  await page.click('button:has-text("Click to disable 2FA")');
  await expect(page.locator('text=disabled').first()).toBeVisible();

  await page.goto(`/login`);

  await page.getByRole('textbox', { name: 'Username' }).fill(USERNAME);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/.*dashboard/);
});
