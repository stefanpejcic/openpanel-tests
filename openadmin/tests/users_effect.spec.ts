import { test, expect, type Browser, type Page } from '@playwright/test';
import { createUser, deleteUser, loginAsUser } from '../op-settings';

// what the admin changes on a user is checked by that user logging into OpenPanel:
// password, email, plan, language, suspend/unsuspend, rename and delete, on a throwaway account

test.describe.configure({ mode: 'serial' });

const stamp = Date.now() % 100000;
let username = `pwusr${stamp}`;
const RENAMED = `pwren${stamp}`;
const PASS1 = 'Pw-Test-Pass-2026!';
const PASS2 = `Pw-New-Pass-${stamp}!`;
let origin = '';

async function edit(page: Page, fields: Record<string, string>) {
  await page.goto(`/users/${username}`);
  const csrf = await page.locator('input[name="csrf_token"]').first().inputValue();
  const r = await page.request.post(`/user/edit/${username}`, { form: { csrf_token: csrf, ...fields }, headers: { Referer: page.url() } });
  expect(r.status()).toBeLessThan(400);
}

// a plain login on the user panel login form, true when it lands on the dashboard
async function panelLogin(browser: Browser, user: string, pass: string): Promise<{ ok: boolean; text: string }> {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const p = await ctx.newPage();
  await p.goto(`${origin}/login`);
  await p.locator('input[name="username"]').fill(user);
  await p.locator('input[name="password"]').fill(pass);
  await p.locator('input[name="password"]').press('Enter');
  await p.waitForLoadState();
  const ok = /\/(dashboard|onboarding)/.test(p.url());
  const text = await p.locator('body').innerText();
  await ctx.close();
  return { ok, text };
}

test.afterAll(async ({ browser }, testInfo) => {
  test.setTimeout(240_000);
  const ctx = await browser.newContext(testInfo.project.use as any);
  const page = await ctx.newPage();
  for (const u of [username, `pwusr${stamp}`, RENAMED]) await deleteUser(page, u);
  await ctx.close();
});

test('a new user can log in with the password set at creation', async ({ page, browser }, testInfo) => {
  test.setTimeout(300_000);
  await createUser(page, username, PASS1);
  const u = await loginAsUser(browser, testInfo, username);
  origin = new URL(u.url()).origin;
  await u.context().close();
  expect((await panelLogin(browser, username, PASS1)).ok).toBe(true);
});

test('a password changed by the admin replaces the old one', async ({ page, browser }) => {
  await edit(page, { new_password: PASS2 });
  await expect.poll(async () => (await panelLogin(browser, username, PASS2)).ok, { timeout: 60_000 }).toBe(true);
  expect((await panelLogin(browser, username, PASS1)).ok).toBe(false);
});

test('an email changed by the admin is the one on the account page', async ({ page, browser }, testInfo) => {
  const email = `pwnew${stamp}@example.com`;
  await edit(page, { new_email: email });
  const u = await loginAsUser(browser, testInfo, username);
  await u.goto('/account');
  await expect(u.locator('input#email')).toHaveValue(email);
  await u.context().close();
});

test('a plan changed by the admin is the one the user is on', async ({ page, browser }, testInfo) => {
  await page.goto('/plans');
  const rows = page.locator('tbody tr');
  test.skip(await rows.count() < 2, 'needs a second plan');
  const id = (await rows.nth(1).locator('td').nth(1).innerText()).trim();
  const name = (await rows.nth(1).locator('td').nth(2).innerText()).trim();
  await edit(page, { plan_id: id });
  await page.goto(`/users/${username}`);
  await expect(page.locator('main')).toContainText(name);
  const u = await loginAsUser(browser, testInfo, username);
  await u.goto('/server/info');
  await expect(u.locator('main')).toContainText(name);
  await u.context().close();
});

test('a language set by the admin is the one the user panel uses', async ({ page, browser }, testInfo) => {
  await page.goto(`/users/${username}`);
  const csrf = await page.locator('input[name="csrf_token"]').first().inputValue();
  const r = await page.request.post(`/users/${username}/account-setting/locale`, { form: { csrf_token: csrf, value: 'de' }, headers: { Referer: page.url() } });
  test.skip(r.status() >= 400, 'German is not installed');
  const u = await loginAsUser(browser, testInfo, username);
  await u.goto('/dashboard');
  await expect(u.locator('html')).toHaveAttribute('lang', /^de/);
  await u.context().close();
  await page.request.post(`/users/${username}/account-setting/locale`, { form: { csrf_token: csrf, value: 'en' }, headers: { Referer: page.url() } });
});

test('a suspended user can not log in and an unsuspended one can', async ({ page, browser }) => {
  test.setTimeout(240_000);
  const act = async (a: string) => {
    await page.goto(`/users/${username}`);
    const csrf = await page.locator('input[name="csrf_token"]').first().inputValue();
    expect((await page.request.post(`/user/${a}/${username}`, { form: { csrf_token: csrf }, headers: { Referer: page.url() } })).status()).toBeLessThan(400);
  };
  await act('suspend');
  try {
    await expect.poll(async () => (await panelLogin(browser, username, PASS2)).text, { timeout: 120_000 }).toMatch(/suspended/i);
  } finally {
    await act('unsuspend');
  }
  await expect.poll(async () => (await panelLogin(browser, username, PASS2)).ok, { timeout: 120_000 }).toBe(true);
});

test('a renamed user logs in with the new username only', async ({ page, browser }) => {
  test.setTimeout(240_000);
  await edit(page, { new_username: RENAMED });
  username = RENAMED;
  await expect.poll(async () => (await panelLogin(browser, RENAMED, PASS2)).ok, { timeout: 120_000 }).toBe(true);
  expect((await panelLogin(browser, `pwusr${stamp}`, PASS2)).ok).toBe(false);
});

test('a deleted user can not log in', async ({ page, browser }) => {
  test.setTimeout(240_000);
  await deleteUser(page, username);
  expect((await panelLogin(browser, username, PASS2)).ok).toBe(false);
});
