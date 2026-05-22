import { test, expect, type Page } from '@playwright/test';
import { totp } from 'otplib';

let totpSecret: string;

function generateCode(): string {
  return totp.generate(totpSecret);
}

// ENABLE
test('precondition: 2FA is disabled', async ({ page }) => {
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

  
  await page.goto(`/account/2fa`);
  await expect(page.locator('#twofa_code')).toBeVisible();

  // Enter the TOTP code to complete login and reach the settings page
  await page.fill('#twofa_code', generateCode());
  await page.click('button[type="submit"]');

  await page.goto(`/account/2fa`);
  await expect(page.locator('text=enabled')).toBeVisible();
  await expect(page.locator('text=disabled')).not.toBeVisible();
});

// ── 5. Login with a valid TOTP code ──────────────────────────────────────
test('login succeeds with correct 2FA code', async ({ page }) => {

  await page.goto(`/account/2fa`);
  // test logins!
  await expect(page.locator('#twofa_code')).toBeVisible();

  await page.fill('#twofa_code', generateCode());
  await page.click('button[type="submit"]');

  // Confirm we landed on an authenticated page (no login form visible)
  await expect(page.locator('#username')).not.toBeVisible();
  await expect(page.locator('#twofa_code')).not.toBeVisible();
});

// ── 6. Login fails with a wrong TOTP code ────────────────────────────────
test('login fails with incorrect 2FA code', async ({ page }) => {
  await page.goto(`/account/2fa`);
  // test logins!

  await expect(page.locator('#twofa_code')).toBeVisible();

  // Deliberately enter a bad code
  await page.fill('#twofa_code', '000000');
  await page.click('button[type="submit"]');

  // The red error block should appear
  await expect(page.locator('.bg-red-50, .bg-red-500\\/10')).toBeVisible();
  // Still on the login / 2FA page
  await expect(page.locator('#twofa_code')).toBeVisible();
});

// ── 7. (Cleanup) Disable 2FA so the suite can be re-run ──────────────────
test('disable 2FA after tests', async ({ page }) => {
  // Full authenticated login
  await page.fill('#twofa_code', generateCode());
  await page.click('button[type="submit"]');

  await page.goto(`/account/2fa`);
  await page.click('button:has-text("Click to disable 2FA")');

  await expect(page.locator('text=disabled')).toBeVisible();
});
