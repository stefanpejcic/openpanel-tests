import { test, expect, type Page } from '@playwright/test';
import http from 'http';
import os from 'os';
import { type Snapshot, snapshotForm, restoreForm, createUser, deleteUser, withAdminPage } from '../op-settings';

// Settings > Notifications: event toggles decide whether an action is logged, thresholds raise alerts on the next
// sentinel run (every 5 minutes), the rest is saved and read back, the original settings go back at the end

const FORM = 'form#notification-settings-form';
const stamp = Date.now() % 100000;
let original: Snapshot;

type Note = { time: string; last_seen: string; title: string; message: string; source: string; category: string };

async function notes(page: Page): Promise<Note[]> {
  return (await page.request.get('/notifications?output=json')).json();
}

async function save(page: Page, values: Record<string, string | boolean>) {
  await page.goto('/settings/notifications');
  for (const [k, v] of Object.entries(values)) {
    if (typeof v === 'boolean') await page.locator(`${FORM} input[type="checkbox"][name="${k}"]`).setChecked(v, { force: true });
    else await page.locator(`${FORM} [name="${k}"]`).fill(v);
  }
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Settings updated successfully.')).toBeVisible({ timeout: 60_000 });
}

// sentinel writes in the server's local time, so compare by what's new instead of by clock
const seen = async (page: Page) => new Set((await notes(page)).map(n => `${n.title}|${n.message}|${n.last_seen}`));
const fresh = async (page: Page, before: Set<string>) => (await notes(page)).filter(n => !before.has(`${n.title}|${n.message}|${n.last_seen}`));

test.beforeAll(async ({ browser }, testInfo) => {
  await withAdminPage(browser, testInfo, async page => { original = await snapshotForm(page, '/settings/notifications', FORM); });
});

test.afterAll(async ({ browser }, testInfo) => {
  test.setTimeout(300_000);
  await withAdminPage(browser, testInfo, async page => {
    for (const u of [`pwnota${stamp}`, `pwnotb${stamp}`]) await deleteUser(page, u);
    if (original) await restoreForm(page, '/settings/notifications', original);
  });
});

test('an enabled action is logged and a disabled one is not', async ({ page }) => {
  test.setTimeout(900_000);
  const a = `pwnota${stamp}`;
  const b = `pwnotb${stamp}`;

  // created on, deleted off
  await save(page, { user_create: true, user_delete: false });
  let before = await seen(page);
  await createUser(page, a);
  await expect.poll(async () => (await fresh(page, before)).some(n => n.title === `User account '${a}' created`), { timeout: 60_000 }).toBe(true);
  before = await seen(page);
  await deleteUser(page, a);
  await page.waitForTimeout(20_000);
  expect((await fresh(page, before)).filter(n => n.message.includes(`'${a}'`)), 'delete was logged while off').toEqual([]);

  // created off, deleted on
  await save(page, { user_create: false, user_delete: true });
  before = await seen(page);
  await createUser(page, b);
  await page.waitForTimeout(20_000);
  expect((await fresh(page, before)).filter(n => n.title.includes(`'${b}'`)), 'create was logged while off').toEqual([]);
  before = await seen(page);
  await deleteUser(page, b);
  await expect.poll(async () => (await fresh(page, before)).some(n => n.title === 'User account deleted' && n.message.includes(`'${b}'`)), { timeout: 60_000 }).toBe(true);
});

test('every action toggle is saved', async ({ page }) => {
  await page.goto('/settings/notifications');
  const boxes = page.locator(`${FORM} input[type="checkbox"][id]`);
  // services is a list and the mail_ ones are SMTP options, both are covered elsewhere
  const names = [...new Set((await boxes.evaluateAll(b => b.map(x => (x as HTMLInputElement).name)))
    .filter(n => n && n !== 'services' && !n.startsWith('mail_')))];
  expect(names.length).toBeGreaterThan(30);
  const flipped: Record<string, boolean> = {};
  for (const n of names) flipped[n] = !(await page.locator(`${FORM} input[type="checkbox"][name="${n}"]`).first().isChecked());
  await save(page, flipped);
  await page.reload();
  for (const [n, v] of Object.entries(flipped)) {
    expect(await page.locator(`${FORM} input[type="checkbox"][name="${n}"]`).first().isChecked(), n).toBe(v);
  }
});

test('a RAM threshold over the usage raises an alert on the next check', async ({ page }) => {
  // disk is left alone, going over it makes sentinel empty Trash and prune images
  test.setTimeout(720_000);
  await save(page, { ram: '1' });
  const before = await seen(page);
  await expect.poll(async () => (await fresh(page, before)).some(n => n.title === 'High Memory Usage!'), { timeout: 600_000, intervals: [15_000] }).toBe(true);
});

test('thresholds, connection limits, email and SMTP settings are saved', async ({ page }) => {
  const values = {
    load: '21', cpu: '91', du: '86', swap: '86', mail_bounce: '21', mail_defer: '22',
    max_total_conn: '5001', max_conn_per_ip: '201', email: `pw${stamp}@example.com`,
    mail_server: `smtp${stamp}.example.com`, mail_port: '2525', mail_username: `pw${stamp}`, mail_default_sender: `pw${stamp}@example.com`,
  };
  const present: Record<string, string> = {};
  await page.goto('/settings/notifications');
  for (const [k, v] of Object.entries(values)) if (await page.locator(`${FORM} [name="${k}"]`).count()) present[k] = v;
  await save(page, present);
  await page.reload();
  for (const [k, v] of Object.entries(present)) await expect(page.locator(`${FORM} [name="${k}"]`).first(), k).toHaveValue(v);
});

test('SSH whitelist is saved and bad entries are refused', async ({ page }) => {
  await page.goto('/settings/notifications');
  const field = page.locator(`${FORM} [name="ssh_whitelist"]`);
  test.skip(await field.count() === 0, 'no SSH whitelist field');
  await save(page, { ssh_whitelist: '203.0.113.7\n198.51.100.0/24' });
  await page.reload();
  await expect(field).toHaveValue(/203\.0\.113\.7[\s\S]*198\.51\.100\.0\/24/);
  await page.goto('/settings/notifications');
  await field.fill('not-an-ip');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Invalid IP/CIDR: not-an-ip')).toBeVisible();
});

test('webhook test reaches the URL', async ({ page }) => {
  // the server has to reach this runner, so only when it runs on the server itself
  const host = new URL(process.env.BASE_URL!).hostname;
  const local = Object.values(os.networkInterfaces()).flat().some(i => i?.address === host) || ['localhost', '127.0.0.1'].includes(host);
  test.skip(!local, 'the runner is not on the server, the webhook could not reach it');
  let got = '';
  const srv = http.createServer((req, res) => { let b = ''; req.on('data', c => b += c); req.on('end', () => { got = b; res.end('ok'); }); });
  await new Promise<void>(r => srv.listen(0, '127.0.0.1', () => r()));
  const port = (srv.address() as any).port;
  try {
    await save(page, { webhook_url: `http://127.0.0.1:${port}/pw-${stamp}` });
    const csrf = await page.locator('input[name="csrf_token"]').first().inputValue();
    const r = await page.request.post('/settings/notifications/test-webhook', { form: { csrf_token: csrf, url: `http://127.0.0.1:${port}/pw-${stamp}` }, headers: { Referer: page.url() } });
    expect(r.status()).toBeLessThan(400);
    await expect.poll(() => got, { timeout: 30_000 }).not.toBe('');
  } finally {
    srv.close();
  }
});
