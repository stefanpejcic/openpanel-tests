import { test, expect, type Page } from '@playwright/test';
import { createUser, deleteUser, loginAsUser, withAdminPage } from '../op-settings';

// a feature set decides which pages a user can open: a set without FTP is put on a plan,
// a user on it is refused /ftp, FTP is switched on in the set and the same user gets it right away

test.describe.configure({ mode: 'serial' });

const stamp = Date.now() % 100000;
const SET = `pwfs${stamp}`;
const PLAN = `pwfsplan${stamp}`;
const USER = `pwfsu${stamp}`;
let user: Page;

const row = (page: Page, feature: string) => page.locator('tbody tr').filter({ has: page.locator(`input[name="${feature}"]`) });

async function setFeatures(page: Page, on: (name: string) => boolean) {
  await page.goto(`/features/${SET}`);
  const names = await page.locator('tbody tr input[type="checkbox"][hidden]').evaluateAll(i => i.map(x => (x as HTMLInputElement).name));
  for (const n of names) {
    const toggle = row(page, n).locator('button[type="button"]').first();
    if ((await toggle.getAttribute('aria-checked') === 'true') !== on(n)) await toggle.click();
  }
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('features updated successfully')).toBeVisible();
}

async function status(path: string) {
  return (await user.request.get(path, { maxRedirects: 0 })).status();
}

test.afterAll(async ({ browser }, testInfo) => {
  test.setTimeout(300_000);
  await user?.context().close();
  await withAdminPage(browser, testInfo, async page => {
    await deleteUser(page, USER);
    await page.goto('/plans');
    const csrf = await page.locator('input[name="csrf_token"]').first().inputValue();
    await page.request.post(`/plan/delete/${encodeURIComponent(PLAN)}`, { form: { csrf_token: csrf }, headers: { Referer: page.url() } });
    await page.goto(`/features/${SET}`);
    const del = page.locator('form:has(input[name="action"][value="delete"]) button[type="submit"]');
    if (await del.count()) {
      await del.first().click();
      const ok = page.getByRole('alertdialog').getByRole('button', { name: /delete/i });
      if (await ok.isVisible().catch(() => false)) await ok.click();
    }
  });
});

test('a user on a set without FTP can not open it', async ({ page, browser }, testInfo) => {
  test.setTimeout(480_000);
  await page.goto('/features/');
  await page.getByRole('textbox').fill(SET);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByText('feature set created successfully')).toBeVisible();
  await setFeatures(page, n => n !== 'ftp');
  await expect(row(page, 'ftp').locator('button[type="button"]').first()).toHaveAttribute('aria-checked', 'false');

  await page.goto('/plans/new');
  await page.locator('[name="name"]').fill(PLAN);
  await page.locator('[name="description"]').fill(`feature set ${SET}`);
  // every limit is required on the form
  const limits = { domains_limit: '10', websites_limit: '10', db_limit: '10', email_limit: '10', ftp_limit: '10', disk_limit: '5',
    inodes_limit: '500000', cpu: '1', ram: '1', bandwidth: '100', max_email_quota: '1', max_hourly_email: '100' };
  for (const [k, v] of Object.entries(limits)) await page.locator(`[name="${k}"]`).fill(v);
  await page.locator('select[name="feature_set"]').selectOption(SET);
  await page.locator('form button[type="submit"]').last().click();
  await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 60_000 });

  await createUser(page, USER, undefined, PLAN);
  user = await loginAsUser(browser, testInfo, USER);
  expect(await status('/ftp')).toBe(403);
  expect(await status('/mysql')).toBe(200);
});

test('switching FTP on in the set opens it for the user right away', async ({ page }) => {
  await setFeatures(page, () => true);
  await expect.poll(() => status('/ftp')).toBe(200);
});
