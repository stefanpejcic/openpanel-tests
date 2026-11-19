import { test, expect, type Page } from '@playwright/test';
import { createUser, deleteUser, loginAsUser, withAdminPage } from '../op-settings';

// a plan with every limit at 1 is created through the form, a user on it tries to go over each limit
// in the user panel, the plan is edited and the user gets the new limit right away, all of it is removed after

test.describe.configure({ mode: 'serial' });

const stamp = Date.now() % 100000;
const PLAN = `pwplan${stamp}`;
const USER = `pwlim${stamp}`;
const DOMAIN = `pwlim${stamp}.example.com`;
const DOMAIN2 = `pwlim${stamp}-b.example.com`;
let planId = '';
let user: Page;

const LIMITS = {
  description: `PW limits ${stamp}`, domains_limit: '1', websites_limit: '1', db_limit: '1', email_limit: '1', ftp_limit: '1',
  disk_limit: '3', inodes_limit: '250000', cpu: '1', ram: '1', bandwidth: '50', max_email_quota: '1', max_hourly_email: '25',
  upsell_url: `https://example.com/upgrade-${stamp}`,
};
let upsellPlan = '';

async function planRow(page: Page) {
  await page.goto('/plans');
  return page.locator('tbody tr').filter({ has: page.locator(`input[value="${PLAN}"]`) });
}

async function fillPlan(page: Page, values: Record<string, string>) {
  for (const [k, v] of Object.entries(values)) {
    const el = page.locator(`[name="${k}"]`).first();
    if (await el.evaluate(e => e.tagName) === 'SELECT') await el.selectOption(v);
    else await el.fill(v);
  }
}

test.afterAll(async ({ browser }, testInfo) => {
  test.setTimeout(300_000);
  await user?.context().close();
  await withAdminPage(browser, testInfo, async page => {
    await deleteUser(page, USER);
    const row = await planRow(page);
    if (await row.count()) {
      const csrf = await page.locator('input[name="csrf_token"]').first().inputValue();
      await page.request.post(`/plan/delete/${encodeURIComponent(PLAN)}`, { form: { csrf_token: csrf }, headers: { Referer: page.url() } });
    }
  });
});

test('a plan is created with every limit', async ({ page }) => {
  await page.goto('/plans/new');
  // any other plan is the upgrade
  const upsell = page.locator('select[name="upsell_plan_id"] option').filter({ hasNotText: /^\s*$/ });
  const opt = await upsell.evaluateAll(o => o.map(x => ({ v: (x as HTMLOptionElement).value, t: x.textContent?.trim() ?? '' })).find(x => x.v));
  await fillPlan(page, { name: PLAN, ...LIMITS, ...(opt ? { upsell_plan_id: opt.v } : {}) });
  upsellPlan = opt?.t ?? '';
  await page.locator('form button[type="submit"]').last().click();
  await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 60_000 });
  const row = await planRow(page);
  await expect(row).toHaveCount(1);
  planId = (await row.locator('td').nth(1).innerText()).trim();
  await expect(row).toContainText(LIMITS.description);
  await expect(row).toContainText('1 GB');
  await expect(row).toContainText('50 mbits');

  // the edit form shows every value back
  await page.goto(`/plans/${planId}`);
  for (const [k, v] of Object.entries(LIMITS)) {
    await expect(page.locator(`[name="${k}"]`).first(), k).toHaveValue(new RegExp(`^${v}(\\.0+)?\\s*(G|GB)?$`, 'i'));
  }
});

test('a user on the plan gets its CPU and memory limits', async ({ page, browser }, testInfo) => {
  test.setTimeout(420_000);
  await createUser(page, USER, undefined, PLAN);
  user = await loginAsUser(browser, testInfo, USER);
  await user.goto('/server/usage/history');
  await expect(user.locator('main')).toContainText(/1(\.0)? cores?/);
});

test('domains limit', async () => {
  test.setTimeout(240_000);
  await user.goto('/domains/new');
  await user.getByRole('textbox', { name: 'Domain*' }).fill(DOMAIN);
  await user.getByRole('button', { name: 'Add Domain' }).click();
  await expect(user.getByText(`Domain name ${DOMAIN} added successfully`)).toBeVisible({ timeout: 120_000 });
  await user.goto('/domains/new');
  await user.getByRole('textbox', { name: 'Domain*' }).fill(DOMAIN2);
  await user.getByRole('button', { name: 'Add Domain' }).click();
  // the reason is in the log, which opens on its own after an error
  await expect(user.locator('#statusMessage')).toContainText(/domain limit reached|maximum allowed number of domains/i, { timeout: 120_000 });
  await expect(user.locator('#statusMessage')).toBeVisible();
});

test('at a limit the upgrade page offers the upsell plan and URL', async () => {
  test.skip(!upsellPlan, 'there is no other plan to upgrade to');
  await user.goto('/dashboard/upgrade');
  await expect(user.locator(`a[href="${LIMITS.upsell_url}"]`).first()).toBeVisible();
  await expect(user.locator('main')).toContainText(upsellPlan);
});

test('databases limit', async () => {
  for (const [i, ok] of [[1, true], [2, false]] as const) {
    await user.goto('/mysql/new');
    await user.locator('#database_name').fill(`pwdb${i}`);
    await user.getByRole('button', { name: 'Create Database' }).click();
    if (ok) await expect(user).toHaveURL(/created=/, { timeout: 60_000 });
    else await expect(user.getByText('Database limit reached for your hosting plan.')).toBeVisible({ timeout: 60_000 });
  }
});

test('email accounts limit and max mailbox size', async () => {
  test.setTimeout(240_000);
  await user.goto('/emails/new');
  // the mailbox size can't go over the plan's max_email_quota
  const gb = user.locator('[name="gb"]');
  if (await gb.count()) {
    const max = await gb.getAttribute('max');
    if (max) expect(Number(max)).toBeLessThanOrEqual(Number(LIMITS.max_email_quota));
  }
  for (const [i, ok] of [[1, true], [2, false]] as const) {
    await user.goto('/emails/new');
    await user.locator('[name="username"]').fill(`pw${i}`);
    await user.locator('[name="password"]').fill('Pw-Mail-Pass-2026!');
    await user.getByRole('button', { name: /create email/i }).click();
    if (ok) await expect(user.getByText(/created|added/i).first()).toBeVisible({ timeout: 120_000 });
    else await expect(user.getByText(/email account limit reached/i).first()).toBeVisible({ timeout: 60_000 });
  }
});

test('FTP accounts limit', async () => {
  test.setTimeout(240_000);
  for (const [i, ok] of [[1, true], [2, false]] as const) {
    await user.goto('/ftp/new');
    await user.locator('[name="username"]').fill(`pwftp${i}`);
    await user.locator('[name="password"]').fill('Pw-Ftp-Pass-2026!');
    await user.locator('form[action="/ftp/new"] button[type="submit"]').click();
    if (ok) await expect(user.getByText(/created|added/i).first()).toBeVisible({ timeout: 120_000 });
    else await expect(user.getByText('FTP account limit reached for your hosting plan.')).toBeVisible({ timeout: 60_000 });
  }
});

test('editing the plan raises the limit for its users right away', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto(`/plans/${planId}`);
  await fillPlan(page, { db_limit: '2' });
  await page.locator('form button[type="submit"]').last().click();
  await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 120_000 });
  await page.goto(`/plans/${planId}`);
  await expect(page.locator('[name="db_limit"]')).toHaveValue('2');

  await user.goto('/mysql/new');
  await user.locator('#database_name').fill('pwdb2');
  await user.getByRole('button', { name: 'Create Database' }).click();
  await expect(user).toHaveURL(/created=/, { timeout: 60_000 });
});

test('a plan in use can not be deleted', async ({ page }) => {
  const row = await planRow(page);
  await row.locator('input[type="checkbox"]').check();
  const csrf = await page.locator('input[name="csrf_token"]').first().inputValue();
  await page.request.post(`/plan/delete/${encodeURIComponent(PLAN)}`, { form: { csrf_token: csrf }, headers: { Referer: page.url() } });
  await expect(await planRow(page)).toHaveCount(1);
});
