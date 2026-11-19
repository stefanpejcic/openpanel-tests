import { test, expect, type Browser, type Page } from '@playwright/test';
import { createUser, deleteUser, withAdminPage } from '../op-settings';

// a reseller package with one account and one user package is made, a reseller on it logs in,
// sees only that user package and can't create a second account, all of it is removed after

test.describe.configure({ mode: 'serial', timeout: 180_000 });

const stamp = Date.now() % 100000;
const RPLAN = `pwrp${stamp}`;
const RESELLER = `pwres${stamp}`;
const PASSWORD = 'Pw-Reseller-2026!';
const U1 = `pwru1${stamp}`;
const U2 = `pwru2${stamp}`;
let allowedPlan = '';
let reseller: Page;

async function loginAs(browser: Browser, username: string, password: string): Promise<Page> {
  const context = await browser.newContext({ baseURL: process.env.BASE_URL, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Username' }).fill(username);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.locator('button[type="submit"]', { hasText: 'Sign in' }).first().click();
  await expect(page).toHaveURL(/.*(dashboard|onboarding|users)/);
  return page;
}

async function adminPost(page: Page, path: string, form: Record<string, string>) {
  await page.goto(path);
  const csrf = await page.locator('input[name="csrf_token"]').first().inputValue();
  return page.request.post(path, { form: { csrf_token: csrf, ...form }, headers: { Referer: page.url() } });
}

test.afterAll(async ({ browser }, testInfo) => {
  test.setTimeout(300_000);
  await reseller?.context().close();
  await withAdminPage(browser, testInfo, async page => {
    for (const u of [U1, U2]) await deleteUser(page, u);
    await adminPost(page, '/resellers', { action: 'delete', username: RESELLER });
    await adminPost(page, '/plans/resellers', { action: 'delete', name: RPLAN });
  });
});

test('a reseller package is created with its limits', async ({ page }) => {
  await page.goto('/resellers');
  const enable = page.getByRole('button', { name: 'Enable Resellers' });
  if (await enable.isVisible().catch(() => false)) await enable.click();
  await page.goto('/plans/resellers');
  test.skip(await page.locator('input[name="action"][value="create"]').count() === 0, 'reseller packages need Enterprise');

  // the create form opens from the header button
  await page.locator('button[\\@click="showSection = !showSection"]').first().click();
  const form = page.locator('form:has(input[name="action"][value="create"])');
  await form.locator('[name="name"]').fill(RPLAN);
  await form.locator('[name="description"]').fill(`PW reseller ${stamp}`);
  await form.locator('[name="max_accounts"]').fill('1');
  await form.locator('[name="max_disk_gb"]').fill('20');
  const first = form.locator('[role="group"][aria-labelledby="rp_allowed_label"] label').first();
  allowedPlan = (await first.locator('span.min-w-0 > span').first().innerText()).trim();
  await first.locator('input[type="checkbox"]').check({ force: true });
  await form.locator('button[type="submit"]').click();
  await expect(page.getByRole('alert').filter({ hasNotText: /^Error/ }).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('main')).toContainText(RPLAN);
});

test('a reseller on it only gets its user package', async ({ page, browser }) => {
  test.setTimeout(180_000);
  await page.goto('/resellers');
  await page.locator('#tour-create-reseller-btn').click();
  await page.locator('#username').fill(RESELLER);
  await page.locator('#password').fill(PASSWORD);
  await page.locator('select#reseller_plan').selectOption(RPLAN);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.locator('#exiting_users tbody tr').filter({ hasText: RESELLER })).toBeVisible({ timeout: 30_000 });

  reseller = await loginAs(browser, RESELLER, PASSWORD);
  await reseller.goto('/user/new');
  const plans = await reseller.locator('input[name="plan_name"]').evaluateAll(i => i.map(x => (x as HTMLInputElement).value));
  expect(plans).toEqual([allowedPlan]);
});

test('the account limit stops the second account', async () => {
  test.setTimeout(480_000);
  await createUser(reseller, U1, undefined, allowedPlan);
  await reseller.goto('/user/new');
  await reseller.locator(`input[name="plan_name"][value="${allowedPlan}"]`).check({ force: true });
  await reseller.fill('[name="admin_username"]', U2);
  await reseller.fill('[name="admin_password"]', 'Pw-Test-Pass-2026!');
  await reseller.fill('[name="admin_email"]', `${U2}@example.com`);
  await reseller.click('#CreateUserButton');
  await expect(reseller.getByText(/maximum account limit/i).first()).toBeVisible({ timeout: 120_000 });
});
