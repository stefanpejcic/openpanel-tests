import { test, expect, type Page } from '@playwright/test';
import { openUserPanel } from '../op-settings';

// the templates on Domains are what a newly added domain gets: its default page, its DNS zone, its Caddy file
// and the page it shows while suspended, each gets a marker, a domain is added and checked, all of it is undone after

test.describe.configure({ mode: 'serial' });

const stamp = Date.now() % 100000;
const DOMAIN = `pwtpl${stamp}.tests.openpanel.org`;
const original: Record<string, string> = {};

const FIELDS: Record<string, string> = {
  zone_template_ipv4: '/domains/zone-templates',
  default_page: '/domains/file-templates',
  suspended_website: '/domains/file-templates',
  docker_caddy: '/domains/vhost-templates',
};

async function saveField(page: Page, name: string, value: string) {
  await page.goto(FIELDS[name]);
  const field = page.locator(`textarea[name="${name}"]`);
  await field.evaluate((el, v) => { (el as HTMLTextAreaElement).value = v; }, value);
  await field.evaluate(el => (el as HTMLTextAreaElement).form!.requestSubmit());
  await expect(page.getByText(/Template(s)? updated successfully!/)).toBeVisible({ timeout: 30_000 });
}

async function domainAction(page: Page, action: string) {
  await page.goto('/domains');
  const csrf = await page.locator('input[name="csrf_token"]').first().inputValue();
  return page.request.post(`/domains/${action}/toggle`, { form: { csrf_token: csrf, domain_name: DOMAIN }, headers: { Referer: page.url() } });
}

test.afterAll(async ({ browser }, testInfo) => {
  test.setTimeout(300_000);
  const ctx = await browser.newContext(testInfo.project.use as any);
  const page = await ctx.newPage();
  await domainAction(page, 'delete');
  for (const [k, v] of Object.entries(original)) await saveField(page, k, v);
  await ctx.close();
});

test('a new domain gets the default page, zone and Caddy templates', async ({ page, browser }, testInfo) => {
  test.setTimeout(480_000);
  for (const [k, path] of Object.entries(FIELDS)) {
    await page.goto(path);
    const f = page.locator(`textarea[name="${k}"]`);
    if (await f.count()) original[k] = await f.inputValue();
  }
  test.skip(!('default_page' in original) || !('zone_template_ipv4' in original), 'templates not available');

  await saveField(page, 'default_page', `${original.default_page}\n<!-- pw-default-${stamp} -->\n`);
  await saveField(page, 'zone_template_ipv4', `${original.zone_template_ipv4.trimEnd()}\npwzone${stamp} 3600 IN TXT "pw${stamp}"\n`);
  if ('docker_caddy' in original) await saveField(page, 'docker_caddy', `# pw-vhost-${stamp}\n${original.docker_caddy}`);
  if ('suspended_website' in original) await saveField(page, 'suspended_website', `${original.suspended_website}\n<!-- pw-suspended-${stamp} -->\n`);

  const user = await openUserPanel(browser, testInfo);
  await user.goto('/domains/new');
  await user.getByRole('textbox', { name: 'Domain*' }).fill(DOMAIN);
  await user.getByRole('button', { name: 'Add Domain' }).click();
  await expect(user.getByText(`Domain name ${DOMAIN} added successfully`)).toBeVisible({ timeout: 180_000 });
  await user.context().close();

  // the site serves the default page
  await expect.poll(async () => (await page.request.get(`https://${DOMAIN}/`, { timeout: 15_000 }).catch(() => null))?.text() ?? '', { timeout: 120_000 }).toContain(`pw-default-${stamp}`);
  // the zone has the template's record
  await page.goto(`/domains/dns/${DOMAIN}`);
  expect(await page.content()).toContain(`pwzone${stamp}`);
  // the Caddy file starts from the template
  if ('docker_caddy' in original) {
    await page.goto(`/domains/caddy/${DOMAIN}`);
    expect(await page.content()).toContain(`pw-vhost-${stamp}`);
  }
});

test('a suspended domain shows the suspended website page', async ({ page }) => {
  test.skip(!('suspended_website' in original), 'no suspended website template');
  test.setTimeout(240_000);
  expect((await domainAction(page, 'suspend')).status()).toBeLessThan(400);
  try {
    await expect.poll(async () => (await page.request.get(`https://${DOMAIN}/`, { timeout: 15_000 }).catch(() => null))?.text() ?? '', { timeout: 120_000 }).toContain(`pw-suspended-${stamp}`);
  } finally {
    await domainAction(page, 'unsuspend');
  }
  await expect.poll(async () => (await page.request.get(`https://${DOMAIN}/`, { timeout: 15_000 }).catch(() => null))?.text() ?? '', { timeout: 120_000 }).toContain(`pw-default-${stamp}`);
});
