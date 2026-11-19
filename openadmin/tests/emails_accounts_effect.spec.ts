import { test, expect, type Page } from '@playwright/test';
import net from 'net';
import tls from 'tls';
import { openUserPanel } from '../op-settings';

// what the admin does to a mailbox on Emails > Accounts is checked over IMAP and SMTP:
// a new password works and the old one doesn't, a quota is what IMAP reports, a receive restriction refuses mail

test.describe.configure({ mode: 'serial' });

const host = new URL(process.env.BASE_URL!).hostname;
const stamp = Date.now() % 100000;
const DOMAIN = `pwmail${stamp}.tests.openpanel.org`;
const EMAIL = `pw${stamp}@${DOMAIN}`;
const P1 = `Pw-Mail-One-${stamp}!`;
const P2 = `Pw-Mail-Two-${stamp}!`;

// one IMAP session, the reply to the last command
function imap(commands: string[]): Promise<string> {
  return new Promise((resolve) => {
    const s = tls.connect({ host, port: 993, servername: host, rejectUnauthorized: false });
    let buf = '';
    let i = 0;
    const next = () => { if (i < commands.length) s.write(`a${i} ${commands[i++]}\r\n`); else { s.end(); resolve(buf); } };
    s.setTimeout(20_000, () => { s.destroy(); resolve(buf); });
    s.on('data', d => {
      buf += d.toString();
      if (i === 0 && buf.includes('* OK')) next();
      else if (new RegExp(`a${i - 1} (OK|NO|BAD)`).test(buf)) next();
    });
    s.on('error', () => resolve(buf));
  });
}
const login = async (pass: string) => /a0 OK/.test(await imap([`LOGIN "${EMAIL}" "${pass}"`, 'LOGOUT']));

// the SMTP reply to RCPT TO for the mailbox
function rcpt(): Promise<string> {
  return new Promise(resolve => {
    const s = net.connect(25, host);
    const steps = [`EHLO pw.example.com`, `MAIL FROM:<>`, `RCPT TO:<${EMAIL}>`, 'QUIT'];
    let buf = '';
    let step = 0;
    s.setTimeout(20_000, () => { s.destroy(); resolve(buf); });
    s.on('data', d => {
      buf += d.toString();
      const lines = buf.trimEnd().split('\r\n');
      const last = lines[lines.length - 1];
      if (/^\d{3} /.test(last) && step < steps.length) s.write(steps[step++] + '\r\n');
    });
    s.on('close', () => {
      const r = buf.split('\r\n').filter(l => /^\d{3} /.test(l));
      resolve(r[3] ?? buf);
    });
    s.on('error', () => resolve(buf));
  });
}

async function api(page: Page, path: string, body: object) {
  await page.goto('/emails/accounts');
  const token = await page.locator('meta[name="csrf-token"]').getAttribute('content');
  const r = await page.request.post(path, { data: body, headers: { 'X-CSRFToken': token ?? '', Referer: page.url() } });
  expect(r.status(), `${path} -> ${await r.text()}`).toBeLessThan(400);
}

test.afterAll(async ({ browser }, testInfo) => {
  test.setTimeout(240_000);
  const ctx = await browser.newContext(testInfo.project.use as any);
  const page = await ctx.newPage();
  await api(page, '/emails/api/delete', { emails: [EMAIL] }).catch(() => {});
  await page.goto('/domains');
  const csrf = await page.locator('input[name="csrf_token"]').first().inputValue();
  await page.request.post('/domains/delete/toggle', { form: { csrf_token: csrf, domain_name: DOMAIN }, headers: { Referer: page.url() } });
  await ctx.close();
});

test('a mailbox made in the user panel logs in over IMAP', async ({ browser }, testInfo) => {
  test.setTimeout(420_000);
  const user = await openUserPanel(browser, testInfo);
  await user.goto('/domains/new');
  await user.getByRole('textbox', { name: 'Domain*' }).fill(DOMAIN);
  await user.getByRole('button', { name: 'Add Domain' }).click();
  await expect(user.getByText(`Domain name ${DOMAIN} added successfully`)).toBeVisible({ timeout: 180_000 });
  await user.goto('/emails/new');
  test.skip(await user.locator('[name="username"]').count() === 0, 'emails are not available to this user');
  await user.locator('select[name="domain"]').selectOption(DOMAIN);
  await user.locator('[name="username"]').fill(`pw${stamp}`);
  await user.locator('[name="password"]').fill(P1);
  await user.getByRole('button', { name: /create email/i }).click();
  await expect(user.getByText(/created|added/i).first()).toBeVisible({ timeout: 120_000 });
  await user.context().close();
  await expect.poll(() => login(P1), { timeout: 120_000, intervals: [5_000] }).toBe(true);
});

test('a password set by the admin replaces the old one', async ({ page }) => {
  await api(page, '/emails/api/update-password', { email: EMAIL, password: P2 });
  await expect.poll(() => login(P2), { timeout: 60_000, intervals: [3_000] }).toBe(true);
  expect(await login(P1)).toBe(false);
});

test('a quota set by the admin is what IMAP reports', async ({ page }) => {
  await api(page, '/emails/api/quota-set', { email: EMAIL, quota: '123M' });
  await expect.poll(async () => await imap([`LOGIN "${EMAIL}" "${P2}"`, 'GETQUOTAROOT INBOX', 'LOGOUT']), { timeout: 60_000, intervals: [3_000] })
    .toMatch(/STORAGE \d+ 125952/);
});

test('a receive restriction refuses mail and lifting it accepts it again', async ({ page }) => {
  expect(await rcpt()).toMatch(/^250/);
  await api(page, '/emails/api/restrict', { email: EMAIL, action: 'add', type: 'receive' });
  try {
    await expect.poll(() => rcpt(), { timeout: 60_000, intervals: [3_000] }).toMatch(/^5\d\d/);
  } finally {
    await api(page, '/emails/api/restrict', { email: EMAIL, action: 'del', type: 'receive' });
  }
  await expect.poll(() => rcpt(), { timeout: 60_000, intervals: [3_000] }).toMatch(/^250/);
});
