import { expect, type Browser, type Page, type TestInfo } from '@playwright/test';

// helpers for specs that change a setting in OpenAdmin and check what it does in the user panel

export const PANEL_USER = 'testinguser';
const FORM = 'form#changePanelSettings';

export type Snapshot = [string, string][];

// every field the form would post, including the yes/no hiddens alpine fills in
export async function snapshotOpenpanelSettings(page: Page): Promise<Snapshot> {
  await page.goto('/settings/open-panel');
  return page.evaluate(sel => {
    const form = document.querySelector(sel) as HTMLFormElement;
    return [...new FormData(form).entries()]
      .filter(([k, v]) => typeof v === 'string' && k !== 'csrf_token' && !k.includes('wp_profile'))
      .map(([k, v]) => [k, v as string] as [string, string]);
  }, FORM);
}

// posts a snapshot back as-is, used to put the server back the way the spec found it
export async function restoreOpenpanelSettings(page: Page, snap: Snapshot) {
  await page.goto('/settings/open-panel');
  const status = await page.evaluate(async entries => {
    const body = new URLSearchParams(entries);
    body.set('csrf_token', (document.querySelector('input[name=csrf_token]') as HTMLInputElement).value);
    const r = await fetch('/settings/open-panel', { method: 'POST', body });
    return r.status;
  }, snap);
  expect(status, 'restoring the OpenPanel settings').toBe(200);
}

// sets fields through the real inputs, booleans are the yes/no switches
export async function setOpenpanelFields(page: Page, values: Record<string, string | boolean>) {
  for (const [name, value] of Object.entries(values)) {
    if (typeof value === 'boolean') {
      await page.locator(`#${name}_switch`).setChecked(value, { force: true });
      continue;
    }
    // the form is never closed in the template, so its fields belong to it without being inside it in the DOM
    const el = page.locator(`[name="${name}"]:not([type="hidden"])`).first();
    const tag = await el.evaluate(e => e.tagName);
    if (tag === 'SELECT') await el.selectOption(value);
    else await el.fill(value);
  }
}

export async function saveOpenpanelSettings(page: Page) {
  await page.locator('#tour-save-openpanel-btn').click();
  await expect(page.getByText('Configuration saved successfully.')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/^Error[: ]/)).toHaveCount(0);
}

// opens the settings page, changes the fields and saves
export async function changeOpenpanelSettings(page: Page, values: Record<string, string | boolean>) {
  await page.goto('/settings/open-panel');
  await setOpenpanelFields(page, values);
  await saveOpenpanelSettings(page);
}

// the user panel reads openpanel.config once at start, so changes need a restart
export async function restartOpenPanel(page: Page) {
  await page.goto('/settings/open-panel');
  const status = await page.evaluate(async () => {
    const csrf = (document.querySelector('input[name=csrf_token]') as HTMLInputElement).value;
    const r = await fetch('/service/restart/openpanel', { method: 'POST', body: new URLSearchParams({ csrf_token: csrf }), redirect: 'manual' });
    return r.type === 'opaqueredirect' ? 303 : r.status;
  });
  expect(status, 'restart OpenPanel').toBeLessThan(400);
}

// a tab logged into the user panel as PANEL_USER through the admin's Login as user link
export async function openUserPanel(browser: Browser, testInfo: TestInfo): Promise<Page> {
  const context = await browser.newContext(testInfo.project.use as any);
  const page = await context.newPage();
  await expect(async () => {
    await page.goto(`/login/token/${PANEL_USER}`);
    await expect(page).toHaveURL(/:2083\/(dashboard|onboarding)/, { timeout: 15_000 });
  }).toPass({ timeout: 180_000 });
  return page;
}

export function userPanelOrigin(page: Page): string {
  return new URL(page.url()).origin;
}

// a logged out tab on the user panel, for the login page checks
export async function openUserPanelLoggedOut(browser: Browser, origin: string): Promise<Page> {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  await expect(async () => {
    const r = await page.goto(`${origin}/login`);
    expect(r?.status()).toBe(200);
  }).toPass({ timeout: 120_000 });
  return page;
}

export async function withAdminPage<T>(browser: Browser, testInfo: TestInfo, fn: (page: Page) => Promise<T>): Promise<T> {
  const context = await browser.newContext(testInfo.project.use as any);
  try {
    return await fn(await context.newPage());
  } finally {
    await context.close();
  }
}

export async function userExists(page: Page, username: string): Promise<boolean> {
  const r = await page.goto(`/users/${username}`);
  return !!r && r.status() < 400 && page.url().includes(`/users/${username}`);
}

// same as the OpenPanel snapshot but for any settings form
export async function snapshotForm(page: Page, path: string, form = 'main form[method="POST" i], main form[method="post"]'): Promise<Snapshot> {
  await page.goto(path);
  return page.locator(form).first().evaluate(f => [...new FormData(f as HTMLFormElement).entries()]
    .filter(([k, v]) => typeof v === 'string' && k !== 'csrf_token')
    .map(([k, v]) => [k, v as string] as [string, string]));
}

export async function restoreForm(page: Page, path: string, snap: Snapshot) {
  await page.goto(path);
  const status = await page.evaluate(async ([p, entries]) => {
    const body = new URLSearchParams(entries as [string, string][]);
    body.set('csrf_token', (document.querySelector('input[name=csrf_token]') as HTMLInputElement).value);
    return (await fetch(p as string, { method: 'POST', body })).status;
  }, [path, snap] as const);
  expect(status, `restoring ${path}`).toBe(200);
}

// a throwaway account for checks that only apply to new users
export async function createUser(page: Page, username: string, password = 'Pw-Test-Pass-2026!', plan?: string) {
  await page.goto('/user/new');
  if (plan) await page.locator(`input[name="plan_name"][value="${plan}"]`).check({ force: true });
  await page.fill('[name="admin_username"]', username);
  await page.fill('[name="admin_password"]', password);
  await page.fill('[name="admin_email"]', `${username}@example.com`);
  await page.click('#CreateUserButton');
  await expect(page.getByText('user created successfully')).toBeVisible({ timeout: 240_000 });
}

export async function deleteUser(page: Page, username: string) {
  const res = await page.request.get(`/users/${username}`, { maxRedirects: 0 });
  if (res.status() !== 200) return;
  await page.goto(`/users/${username}#delete`);
  await page.locator('[x-model="confirmationText"]:visible').fill(username);
  await page.getByRole('button', { name: /delete account permanently/i }).click();
  await expect(page.getByText(`User '${username}' deleted successfully`, { exact: false })).toBeVisible({ timeout: 120_000 });
}

export async function loginAsUser(browser: Browser, testInfo: TestInfo, username: string): Promise<Page> {
  const context = await browser.newContext(testInfo.project.use as any);
  const page = await context.newPage();
  await expect(async () => {
    await page.goto(`/login/token/${username}`);
    await expect(page).toHaveURL(/:\d+\/(dashboard|onboarding)/, { timeout: 15_000 });
  }).toPass({ timeout: 180_000 });
  return page;
}
