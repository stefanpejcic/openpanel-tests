import { test, expect, type Page } from '@playwright/test';
import { totp } from 'otplib';
import * as fs from 'fs';
import * as path from 'path';

const SECRET_FILE = path.join(__dirname, '.totp-secret.tmp');
const USERNAME = process.env.PANEL_USERNAME;
const PASSWORD = process.env.PANEL_PASSWORD;

function saveSecret(secret: string) {
  fs.writeFileSync(SECRET_FILE, secret, 'utf8');
}

function loadSecret(): string {
  if (!fs.existsSync(SECRET_FILE)) {
    throw new Error('TOTP secret file not found. Run the "enable" test first.');
  }
  return fs.readFileSync(SECRET_FILE, 'utf8').trim();
}

function generateCode(): string {
  return totp.generate(loadSecret());
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
  const totpSecret = (await secretEl.textContent())!.trim();
  expect(totpSecret.length).toBeGreaterThan(10);
  console.log('Captured TOTP secret:', totpSecret);
  saveSecret(totpSecret);

  await page.goto(`/account/2fa`);
  const confirmBtn = page.locator('button:has-text("Confirm")');
  const step2Tab = page.locator('#dashboard-styled-tab');
  if (await step2Tab.isVisible()) {
    await step2Tab.click();
  }
  await expect(confirmBtn).toBeVisible();
  await confirmBtn.click();
  await expect(page.locator('text=enabled')).toBeVisible();
});

test('login with incorrect 2FA code', async ({ page }) => {
  await page.goto(`/login`);
  await page.getByRole('textbox', { name: 'Username' }).fill(USERNAME!);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('#twofa_code')).toBeVisible();
  await page.fill('#twofa_code', '000000');
  await page.click('button[type="submit"]');
  await expect(page.locator('.bg-red-50, .bg-red-500\\/10')).toBeVisible();
  await expect(page.locator('#twofa_code')).toBeVisible();
});

test('login with 2FA code', async ({ page }) => {
  await page.goto(`/login`);
  await page.getByRole('textbox', { name: 'Username' }).fill(USERNAME!);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD!);
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

  if (fs.existsSync(SECRET_FILE)) {
    fs.unlinkSync(SECRET_FILE);
  }

  await page.goto(`/login`);
  await page.getByRole('textbox', { name: 'Username' }).fill(USERNAME!);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/.*dashboard/);
});
