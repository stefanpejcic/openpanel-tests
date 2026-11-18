import { test, expect, type Page } from '@playwright/test';
import { restartOpenPanel, openUserPanel, withAdminPage, PANEL_USER } from '../op-settings';

// every option on Settings > General is changed through the form and checked where it takes effect,
// the domain and the OpenAdmin port move the panel the runner talks to, so they only run with
// OPENADMIN_TEST_DOMAIN_AND_ADMIN_PORT=1

const stamp = Date.now() % 100000;
const disruptive = process.env.OPENADMIN_TEST_DOMAIN_AND_ADMIN_PORT === '1';

type General = { force_domain: string; '2087_port': string; '2083_port': string; openpanel_proxy: string; dev_mode: boolean };
let original: General;

async function readGeneral(page: Page): Promise<General> {
  await page.goto('/settings/general');
  return {
    force_domain: await page.locator('[name="force_domain"]').inputValue(),
    '2087_port': await page.locator('[name="2087_port"]').inputValue(),
    '2083_port': await page.locator('[name="2083_port"]').inputValue(),
    openpanel_proxy: await page.locator('[name="openpanel_proxy"]').inputValue(),
    dev_mode: (await page.locator('input[name="dev_mode"]').inputValue()) === 'on',
  };
}

async function saveGeneral(page: Page, values: Partial<General>) {
  await page.goto('/settings/general');
  for (const [k, v] of Object.entries(values)) {
    if (k === 'dev_mode') await page.locator('#dev_mode').setChecked(v as boolean, { force: true });
    else await page.locator(`[name="${k}"]`).fill(String(v));
  }
  await page.getByRole('button', { name: /save settings/i }).click();
  await expect(page.getByRole('alert').filter({ hasText: /settings updated|no changes/i }).first()).toBeVisible({ timeout: 60_000 });
}

// any user domain that answers, the /openpanel path redirect is served on all of them
async function userDomain(page: Page): Promise<string | null> {
  await page.goto('/domains');
  const names = await page.locator('tr[data-domain]').evaluateAll(trs => trs.map(tr => tr.getAttribute('data-domain') || ''));
  for (const d of names.filter(Boolean).slice(0, 15)) {
    const r = await page.request.get(`https://${d}/`, { maxRedirects: 0, timeout: 8_000 }).catch(() => null);
    if (r && r.status() < 500) return d;
  }
  return null;
}

test.beforeAll(async ({ browser }, testInfo) => {
  await withAdminPage(browser, testInfo, async page => { original = await readGeneral(page); });
});

test.afterAll(async ({ browser }, testInfo) => {
  test.setTimeout(300_000);
  if (!original) return;
  await withAdminPage(browser, testInfo, async page => {
    const now = await readGeneral(page);
    const back: Partial<General> = {};
    for (const k of ['openpanel_proxy', '2083_port', 'dev_mode'] as const) if (now[k] !== original[k]) (back as any)[k] = original[k];
    if (Object.keys(back).length) {
      await saveGeneral(page, back);
      if (back['2083_port']) await restartOpenPanel(page);
    }
  });
});

test('page shows the current values', async ({ page }) => {
  const g = await readGeneral(page);
  expect(g.force_domain).not.toBe('');
  expect(Number(g['2087_port'])).toBeGreaterThan(0);
  expect(Number(g['2083_port'])).toBeGreaterThan(0);
  expect(g.openpanel_proxy).toMatch(/^[a-zA-Z0-9_-]+$/);
});

test('/openpanel path redirects to the user panel right after saving', async ({ page }) => {
  const domain = await userDomain(page);
  test.skip(!domain, `${PANEL_USER} has no domain`);
  const path = `pwpath${stamp}`;
  await saveGeneral(page, { openpanel_proxy: path });
  await expect(page.locator('[name="openpanel_proxy"]')).toHaveValue(path);

  // caddy is reloaded on save, no restart needed
  await expect(async () => {
    const r = await page.request.get(`https://${domain}/${path}`, { maxRedirects: 0 });
    expect(r.status()).toBe(301);
    expect(r.headers()['location']).toMatch(new RegExp(`:${original['2083_port']}/login$`));
  }).toPass({ timeout: 30_000 });
  // the old path is gone
  const old = await page.request.get(`https://${domain}/${original.openpanel_proxy}`, { maxRedirects: 0 });
  expect(old.status()).not.toBe(301);
});

test('user panel port moves the panel and opens the firewall', async ({ page, browser }, testInfo) => {
  test.setTimeout(420_000);
  const port = original['2083_port'] === '2084' ? '2085' : '2084';
  await saveGeneral(page, { '2083_port': port });
  await expect(page.locator('[name="2083_port"]')).toHaveValue(port);
  await restartOpenPanel(page);

  // Login as user lands on the new port
  const user = await openUserPanel(browser, testInfo).catch(() => null);
  const origin = `https://${original.force_domain}:${port}`;
  await expect(async () => {
    const r = await page.request.get(`${origin}/login`, { timeout: 10_000 });
    expect(r.status()).toBe(200);
  }).toPass({ timeout: 180_000 });
  if (user) {
    expect(new URL(user.url()).port).toBe(port);
    await user.context().close();
  }

  // and the /openpanel redirect follows it
  const domain = await userDomain(page);
  if (domain) {
    const r = await page.request.get(`https://${domain}/${(await readGeneral(page)).openpanel_proxy}`, { maxRedirects: 0 });
    expect(r.headers()['location']).toContain(`:${port}/`);
  }

  // back to the original port
  await saveGeneral(page, { '2083_port': original['2083_port'] });
  await restartOpenPanel(page);
  await expect(async () => {
    const r = await page.request.get(`https://${original.force_domain}:${original['2083_port']}/login`, { timeout: 10_000 });
    expect(r.status()).toBe(200);
  }).toPass({ timeout: 180_000 });
});

test('dev mode is saved', async ({ page }) => {
  // it only turns on debug logging, there's nothing to see in the GUI
  await saveGeneral(page, { dev_mode: !original.dev_mode });
  expect((await readGeneral(page)).dev_mode).toBe(!original.dev_mode);
  await expect(page.getByRole('link', { name: /needs? restart/i })).toBeVisible();
  await saveGeneral(page, { dev_mode: original.dev_mode });
  expect((await readGeneral(page)).dev_mode).toBe(original.dev_mode);
});

test('domain is used for the user panel links', async ({ page }) => {
  test.skip(!disruptive, 'set OPENADMIN_TEST_DOMAIN_AND_ADMIN_PORT=1, it restarts the mail server and OpenAdmin');
  test.setTimeout(600_000);
  const ip = new URL(process.env.BASE_URL!).hostname;
  test.skip(!/^\d+\.\d+\.\d+\.\d+$/.test(ip), 'BASE_URL has to be the server IP for this one');
  await saveGeneral(page, { force_domain: ip });
  await expect(page.locator('[name="force_domain"]')).toHaveValue(ip);
  // Login as user reads the domain on every request
  const r = await page.request.get(`/login/token/${PANEL_USER}`, { maxRedirects: 0 });
  expect(r.headers()['location'] ?? '').toContain(`//${ip}:`);
  await saveGeneral(page, { force_domain: original.force_domain });
  await expect(page.locator('[name="force_domain"]')).toHaveValue(original.force_domain);
});

test('OpenAdmin port is saved and opened on the firewall', async ({ page }) => {
  test.skip(!disruptive, 'set OPENADMIN_TEST_DOMAIN_AND_ADMIN_PORT=1, it moves the panel this suite runs on');
  test.setTimeout(600_000);
  const port = original['2087_port'] === '2088' ? '2089' : '2088';
  await saveGeneral(page, { '2087_port': port });
  await expect(page.locator('[name="2087_port"]')).toHaveValue(port);
  // the Caddy /openadmin redirect follows right away
  const domain = await userDomain(page);
  if (domain) {
    const r = await page.request.get(`https://${domain}/openadmin`, { maxRedirects: 0 });
    expect(r.headers()['location']).toContain(`:${port}/`);
  }
  await saveGeneral(page, { '2087_port': original['2087_port'] });
  await expect(page.locator('[name="2087_port"]')).toHaveValue(original['2087_port']);
});
