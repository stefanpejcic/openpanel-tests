import { test, expect, type Browser, type Page } from '@playwright/test';
import crypto from 'crypto';

// 2FA is turned on for a throwaway administrator, logging in then asks for the code, a wrong one is refused
// and the right one gets in, the administrator is deleted after so the suite's own login is never touched

const stamp = Date.now() % 100000;
const ADMIN = `pw2fa${stamp}`;
const PASSWORD = 'Pw-TwoFA-Pass-2026!';

function totp(secret: string, offset = 0): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of secret.replace(/=+$/, '').toUpperCase()) bits += alphabet.indexOf(c).toString(2).padStart(5, '0');
  const key = Buffer.from(bits.match(/.{8}/g)!.map(b => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000) + offset));
  const h = crypto.createHmac('sha1', key).update(counter).digest();
  const o = h[h.length - 1] & 0xf;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}

async function freshLogin(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext({ baseURL: process.env.BASE_URL, ignoreHTTPSErrors: true });
  const p = await ctx.newPage();
  await p.goto('/login');
  await p.getByRole('textbox', { name: 'Username' }).fill(ADMIN);
  await p.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await p.locator('button[type="submit"]', { hasText: 'Sign in' }).first().click();
  return p;
}

test.afterAll(async ({ browser }, testInfo) => {
  const ctx = await browser.newContext(testInfo.project.use as any);
  const page = await ctx.newPage();
  await page.goto('/administrators');
  const csrf = await page.locator('input[name="csrf_token"]').first().inputValue();
  await page.request.post('/administrators', { form: { csrf_token: csrf, action: 'delete', username: ADMIN }, headers: { Referer: page.url() } });
  await ctx.close();
});

test('with 2FA on, logging in needs the authenticator code', async ({ page, browser }) => {
  test.setTimeout(240_000);
  await page.goto('/administrators');
  const create = page.locator('#tour-create-admin-btn');
  test.skip(!(await create.isVisible().catch(() => false)), 'a second administrator needs Enterprise');
  await create.click();
  await page.locator('#username').fill(ADMIN);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.locator(`button.account-menu-btn[data-user="${ADMIN}"]`)).toHaveCount(1, { timeout: 15_000 });

  // turn it on as that administrator
  const admin = await freshLogin(browser);
  await expect(admin).toHaveURL(/dashboard|onboarding|users/);
  await admin.goto('/security/2fa');
  const secret = (await admin.locator('[data-secret]').getAttribute('data-secret'))!;
  expect(secret).toMatch(/^[A-Z2-7]+=*$/);
  const enable = admin.locator('form[action="/security/2fa/enable"]');
  await enable.locator('[name="code"]').fill(totp(secret));
  await enable.locator('button[type="submit"]').click();
  await expect(admin.getByText('Two-factor authentication has been enabled.')).toBeVisible();
  await admin.context().close();

  // a fresh login stops at the code
  const wrong = await freshLogin(browser);
  await expect(wrong).toHaveURL(/\/login\/2fa/);
  await wrong.locator('[name="code"]').fill(totp(secret, 4));
  await wrong.locator('[name="code"]').press('Enter');
  await expect(wrong).not.toHaveURL(/dashboard/);
  await wrong.context().close();

  const right = await freshLogin(browser);
  await expect(right).toHaveURL(/\/login\/2fa/);
  await right.locator('[name="code"]').fill(totp(secret));
  await right.locator('[name="code"]').press('Enter');
  await expect(right).toHaveURL(/dashboard|onboarding|users/);
  await right.context().close();
});
