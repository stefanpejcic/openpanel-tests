import { test, expect, type Page } from '@playwright/test';
import { promises as dns } from 'dns';
import { openUserPanel } from '../op-settings';

// what the admin changes on a domain is checked from outside: HSTS and Cloudflare-only on the site's responses,
// the zone editor and zone delete/create on the server's own DNS answers, the Caddy editor on a response header,
// on a throwaway domain that's removed after

test.describe.configure({ mode: 'serial' });

const stamp = Date.now() % 100000;
const DOMAIN = `pweff${stamp}.tests.openpanel.org`;
const host = new URL(process.env.BASE_URL!).hostname;

async function serverIP(): Promise<string> {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return host;
  return (await dns.lookup(host, 4)).address;
}

// asks the server's DNS directly, '' when it has no answer
async function ask(name: string, type: 'TXT' | 'SOA'): Promise<string> {
  const r = new dns.Resolver({ timeout: 5_000, tries: 1 });
  r.setServers([await serverIP()]);
  try {
    if (type === 'SOA') return (await r.resolveSoa(name)).nsname;
    return (await r.resolveTxt(name)).flat().join(' ');
  } catch {
    return '';
  }
}

async function site(page: Page) {
  return page.request.get(`https://${DOMAIN}/`, { timeout: 15_000, maxRedirects: 0 }).catch(() => null);
}

async function toggle(page: Page, feature: string, form: Record<string, string>) {
  await page.goto('/domains');
  const csrf = await page.locator('input[name="csrf_token"]').first().inputValue();
  const r = await page.request.post(`/domains/${feature}/toggle`, { form: { csrf_token: csrf, domain_name: DOMAIN, ...form }, headers: { Referer: page.url() } });
  expect(r.status()).toBeLessThan(400);
}

async function saveEditor(page: Page, kind: 'dns' | 'caddy', content: string, flash: RegExp) {
  await page.goto(`/domains/${kind}/${DOMAIN}`);
  const field = page.locator('textarea[name="bind_content"]');
  await field.evaluate((el, v) => { (el as HTMLTextAreaElement).value = v; }, content);
  await field.evaluate(el => (el as HTMLTextAreaElement).form!.requestSubmit());
  await expect(page.getByText(flash).first()).toBeVisible({ timeout: 60_000 });
}

async function readEditor(page: Page, kind: 'dns' | 'caddy') {
  await page.goto(`/domains/${kind}/${DOMAIN}`);
  return page.locator('textarea[name="bind_content"]').inputValue();
}

test.afterAll(async ({ browser }, testInfo) => {
  test.setTimeout(240_000);
  const ctx = await browser.newContext(testInfo.project.use as any);
  const page = await ctx.newPage();
  await toggle(page, 'delete', {}).catch(() => {});
  await ctx.close();
});

test('the domain is added and served', async ({ page, browser }, testInfo) => {
  test.setTimeout(300_000);
  const user = await openUserPanel(browser, testInfo);
  await user.goto('/domains/new');
  await user.getByRole('textbox', { name: 'Domain*' }).fill(DOMAIN);
  await user.getByRole('button', { name: 'Add Domain' }).click();
  await expect(user.getByText(`Domain name ${DOMAIN} added successfully`)).toBeVisible({ timeout: 180_000 });
  await user.context().close();
  await expect.poll(async () => (await site(page))?.status() ?? 0, { timeout: 120_000, intervals: [5_000] }).toBe(200);
});

test('HSTS on sends Strict-Transport-Security and off stops it', async ({ page }) => {
  test.setTimeout(180_000);
  const hsts = async () => (await site(page))?.headers()['strict-transport-security'] ?? '';
  await toggle(page, 'hsts', { hsts_action: 'On' });
  try {
    await expect.poll(hsts, { timeout: 60_000, intervals: [3_000] }).toContain('max-age');
  } finally {
    await toggle(page, 'hsts', { hsts_action: 'Off' });
  }
  await expect.poll(hsts, { timeout: 60_000, intervals: [3_000] }).toBe('');
});

test('Cloudflare only refuses visitors that do not come through Cloudflare', async ({ page }) => {
  test.setTimeout(180_000);
  await toggle(page, 'cloudflare', { cloudflare_action: 'enable' });
  try {
    await expect.poll(async () => (await site(page))?.status() ?? 0, { timeout: 60_000, intervals: [3_000] }).not.toBe(200);
  } finally {
    await toggle(page, 'cloudflare', { cloudflare_action: 'disable' });
  }
  await expect.poll(async () => (await site(page))?.status() ?? 0, { timeout: 60_000, intervals: [3_000] }).toBe(200);
});

test('a record added in the zone editor is what the DNS server answers', async ({ page }) => {
  test.setTimeout(180_000);
  const original = await readEditor(page, 'dns');
  expect(await ask(DOMAIN, 'SOA')).not.toBe('');
  await saveEditor(page, 'dns', `${original.trimEnd()}\npwrec${stamp} 300 IN TXT "pw-${stamp}"\n`, /saved successfully and DNS service reloaded/);
  await expect.poll(() => ask(`pwrec${stamp}.${DOMAIN}`, 'TXT'), { timeout: 60_000, intervals: [3_000] }).toContain(`pw-${stamp}`);
  await saveEditor(page, 'dns', original, /saved successfully and DNS service reloaded/);
  await expect.poll(() => ask(`pwrec${stamp}.${DOMAIN}`, 'TXT'), { timeout: 60_000, intervals: [3_000] }).toBe('');
});

test('deleting the zone stops the DNS answers and creating it brings them back', async ({ page }) => {
  test.setTimeout(180_000);
  await toggle(page, 'dns', { dns_action: 'delete' });
  try {
    await expect.poll(() => ask(DOMAIN, 'SOA'), { timeout: 60_000, intervals: [3_000] }).toBe('');
  } finally {
    await toggle(page, 'dns', { dns_action: 'create' });
  }
  await expect.poll(() => ask(DOMAIN, 'SOA'), { timeout: 60_000, intervals: [3_000] }).not.toBe('');
});

test('a header added in the Caddy editor is sent by the site', async ({ page }) => {
  test.setTimeout(180_000);
  const original = await readEditor(page, 'caddy');
  const lines = original.split('\n');
  // inside the https site block, the http one only serves plain http visitors
  const at = lines.findIndex(l => l.includes(`https://${DOMAIN}`) && l.trimEnd().endsWith('{'));
  expect(at, 'site block for the domain').toBeGreaterThanOrEqual(0);
  lines.splice(at + 1, 0, `    header X-PW-Test "pw-${stamp}"`);
  const header = async () => (await site(page))?.headers()['x-pw-test'] ?? '';
  await saveEditor(page, 'caddy', lines.join('\n'), /saved successfully and reloaded/);
  try {
    await expect.poll(header, { timeout: 60_000, intervals: [3_000] }).toBe(`pw-${stamp}`);
  } finally {
    await saveEditor(page, 'caddy', original, /saved successfully and reloaded/);
  }
  await expect.poll(header, { timeout: 60_000, intervals: [3_000] }).toBe('');
});
