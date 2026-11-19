import { test, expect, type Page } from '@playwright/test';
import { openUserPanel } from '../op-settings';

// a quota set on Services > FTP for a user's FTP account is what that user sees on their FTP page

const stamp = Date.now() % 100000;
const FTP = `pwq${stamp}`;

test('an FTP quota set by the admin shows for the user', async ({ page, browser }, testInfo) => {
  test.setTimeout(300_000);
  const user = await openUserPanel(browser, testInfo);
  let full = '';
  try {
    await user.goto('/ftp/new');
    test.skip(await user.locator('[name="domain"] option').count() === 0, 'the user has no domain for FTP');
    await user.locator('[name="username"]').fill(FTP);
    await user.locator('[name="password"]').fill('Pw-Ftp-Pass-2026!');
    await user.locator('form[action="/ftp/new"] button[type="submit"]').click();
    await expect(user).toHaveURL(/created=/, { timeout: 120_000 });
    // the created page already lists the account
    await user.waitForLoadState();
    full = (await user.locator(`text=/${FTP}@[^\\s]+/`).first().innerText()).trim().split(/\s/)[0];

    // the admin list is cached, refresh it first
    await page.goto('/services/ftp');
    const csrf = await page.locator('input[name="csrf_token"]').first().inputValue();
    await page.request.post('/services/ftp/refresh', { form: { csrf_token: csrf }, headers: { Referer: page.url() } });
    await page.goto('/services/ftp');
    const form = page.locator(`form[action="/services/ftp/quota"]:has(input[name="user"][value="${full}"])`);
    await expect(form).toHaveCount(1, { timeout: 30_000 });
    // the quota field opens from the row's Set quota button
    await page.locator('tr', { has: page.locator(`input[name="user"][value="${full}"]`) }).getByRole('button', { name: 'Set quota' }).click();
    await form.locator('input[name="quota"]').fill('123');
    await form.locator('input[name="quota"]').press('Enter');
    await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 60_000 });

    await user.goto('/ftp');
    await expect(user.locator('main')).toContainText(/123(\.0)?\s*MB/);
  } finally {
    if (full) {
      await user.goto('/ftp');
      const csrf = await user.locator('input[name="csrf_token"]').first().inputValue();
      await user.request.post('/ftp/delete', { form: { csrf_token: csrf, username: full }, headers: { Referer: user.url() } });
    }
    await user.context().close();
  }
});
