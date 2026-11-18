import { test, expect, type Page } from '@playwright/test';
import { openUserPanel } from '../op-settings';

// with the WAF on an attack-looking request to a user's domain is refused, switched off on Security > WAF
// the same request goes through, switched back on it's refused again, the WAF ends the way it started

test.describe.configure({ mode: 'serial' });

const stamp = Date.now() % 100000;
const DOMAIN = `pwwaf${stamp}.tests.openpanel.org`;
const ATTACK = `https://${DOMAIN}/?id=1%27%20OR%20%271%27%3D%271`;

async function wafStatus(page: Page): Promise<string> {
  await page.goto('/security/waf');
  return page.locator('select#status').inputValue();
}

async function setWaf(page: Page, on: boolean) {
  await page.goto('/security/waf');
  await page.locator('select#status').selectOption(on ? 'yes' : 'no');
  await page.locator('#waf-status-form button[type="submit"]').click();
  const ok = page.getByRole('alertdialog').getByRole('button').filter({ hasText: /disable|continue|yes/i });
  if (await ok.isVisible().catch(() => false)) await ok.click();
  await page.waitForLoadState();
  await expect.poll(() => wafStatus(page), { timeout: 120_000 }).toBe(on ? 'yes' : 'no');
}

const hit = async (page: Page, url: string) => (await page.request.get(url, { maxRedirects: 0, timeout: 15_000 }).catch(() => null))?.status() ?? 0;

test('the WAF refuses attacks while on and lets them through while off', async ({ page, browser }, testInfo) => {
  test.setTimeout(600_000);
  const start = await wafStatus(page);
  test.skip(start !== 'yes', 'the WAF is off on this server, turning it on downloads the rule sets');

  const user = await openUserPanel(browser, testInfo);
  await user.goto('/domains/new');
  await user.getByRole('textbox', { name: 'Domain*' }).fill(DOMAIN);
  await user.getByRole('button', { name: 'Add Domain' }).click();
  await expect(user.getByText(`Domain name ${DOMAIN} added successfully`)).toBeVisible({ timeout: 180_000 });
  await user.context().close();

  // the new domain gets the WAF, a normal request passes and the attack doesn't
  await expect.poll(() => hit(page, `https://${DOMAIN}/`), { timeout: 120_000 }).not.toBe(0);
  await expect.poll(() => hit(page, ATTACK), { timeout: 60_000 }).toBe(403);

  try {
    await setWaf(page, false);
    await expect.poll(() => hit(page, ATTACK), { timeout: 120_000 }).not.toBe(403);
  } finally {
    await setWaf(page, true);
  }
  await expect.poll(() => hit(page, ATTACK), { timeout: 180_000 }).toBe(403);
});
