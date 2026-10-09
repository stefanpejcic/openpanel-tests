import { test, expect, Page } from '@playwright/test';

// Toggle lives on the list page, one per domain row → must be scoped
function wafToggle(page: Page, domain: string) {
  return page.locator('#waf-domains-table tbody tr')
    .filter({
      has: page.locator(`input[name="domain_name"][value="${domain}"]`)
    })
    .locator('button[aria-checked]');
}

async function setWaf(page: Page, domain: string, desiredOn: boolean) {
  await page.goto('/server/waf');
  const toggle = wafToggle(page, domain);
  await expect(toggle).toBeVisible();
  if (await toggle.getAttribute('aria-checked') !== String(desiredOn)) {
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', String(desiredOn));
  }
}

async function openDomainPage(page: Page, domain: string) {
  await page.goto(`/server/waf/${domain}`);
  await expect(page).toHaveURL(new RegExp(`/server/waf/${domain.replace(/\./g, '\\.')}$`));
}

// rule exceptions sit in a collapsed <details> that's only open by default when some are set
async function openExceptions(page: Page) {
  const details = page.locator('details', { has: page.locator('#removed_rules') });
  if (!(await details.evaluate(el => (el as HTMLDetailsElement).open))) {
    await details.locator('summary').click();
  }
  await expect(page.locator('#removed_rules')).toBeVisible();
}

async function saveExceptions(page: Page, field: '#removed_rules' | '#removed_tags', value: string) {
  await openExceptions(page);
  await page.locator(field).fill(value);
  await page.getByRole('button', { name: 'Save exceptions' }).click();
  await page.waitForLoadState('load');
  await openExceptions(page);
  await expect(page.locator(field)).toHaveValue(value);
}

test('waf status', async ({ page }) => {
  await page.goto('/server/waf');

  await expect(
    page.getByRole('heading', { name: 'Web Firewall', level: 1 })
  ).toBeVisible();

  await expect(page.locator('#waf-domains-table')).toBeVisible();
});

test('waf on/off and disabled rules for domain', async ({ page }) => {
  const domain = 'wp.tests.openpanel.org';

  const blockedUrl = `https://${domain}/?q=<script>alert(1)</script>`;
  const cleanUrl = `https://${domain}/`;

  // ── 1. WAF ON → blocked request should be blocked, clean should pass ───────
  await setWaf(page, domain, true);

  let blocked = await page.request.get(blockedUrl, { failOnStatusCode: false });
  let clean = await page.request.get(cleanUrl, { failOnStatusCode: false });
  expect([403, 406, 409, 422]).toContain(blocked.status());
  expect(clean.status()).toBe(200);

  // ── 2. WAF OFF → both requests should pass ─────────────────────────────────
  await setWaf(page, domain, false);

  blocked = await page.request.get(blockedUrl, { failOnStatusCode: false });
  clean = await page.request.get(cleanUrl, { failOnStatusCode: false });
  expect(blocked.status()).toBe(200);
  expect(clean.status()).toBe(200);

  // ── 3. WAF ON + disable rule by ID → previously blocked request now passes ─
  await setWaf(page, domain, true);

  blocked = await page.request.get(blockedUrl, { failOnStatusCode: false });
  expect([403, 406, 409, 422]).toContain(blocked.status());

  await openDomainPage(page, domain);

  const ruleId = '941100 941110 941160 941390 949110';
  await saveExceptions(page, '#removed_rules', ruleId);

  blocked = await page.request.get(blockedUrl, { failOnStatusCode: false });
  clean = await page.request.get(cleanUrl, { failOnStatusCode: false });
  expect(blocked.status()).toBe(200);
  expect(clean.status()).toBe(200);

  // Clear disabled rule IDs
  await saveExceptions(page, '#removed_rules', '');

  blocked = await page.request.get(blockedUrl, { failOnStatusCode: false });
  expect([403, 406, 409, 422]).toContain(blocked.status());

  // ── 4. WAF ON + disable rule by TAG → previously blocked request now passes ─
  const ruleTag = 'attack-xss';
  await saveExceptions(page, '#removed_tags', ruleTag);

  blocked = await page.request.get(blockedUrl, { failOnStatusCode: false });
  clean = await page.request.get(cleanUrl, { failOnStatusCode: false });
  expect(blocked.status()).toBe(200);
  expect(clean.status()).toBe(200);

  // ── 5. Cleanup – clear disabled tags, confirm blocking restored ────────────
  await saveExceptions(page, '#removed_tags', '');

  blocked = await page.request.get(blockedUrl, { failOnStatusCode: false });
  expect([403, 406, 409, 422]).toContain(blocked.status());
});

test('waf logs show blocked requests for domain', async ({ page }) => {
  const domain = 'wp.tests.openpanel.org';
  const blockedUrl = `https://${domain}/?q=<script>alert(1)</script>`;

  await setWaf(page, domain, true);

  for (let i = 0; i < 3; i++) {
    const res = await page.request.get(blockedUrl, { failOnStatusCode: false });
    expect([403, 406, 409, 422]).toContain(res.status());
  }

  await page.goto(`/server/waf/log/${domain}`);

  const logsTable = page.locator('#waf-logs-table');
  await expect(logsTable).toBeVisible();
  await expect(page.locator('h1')).toContainText(domain);

  const rows = logsTable.locator('tbody tr');
  await expect(rows).not.toHaveCount(0);
  const rowCount = await rows.count();

  // Scoped so it can't collide with the sidebar search input
  const searchInput = page.getByRole('region', { name: /log/i })
                        .locator('input[type="search"]:visible');
  await searchInput.fill('alert(1)');

  await expect(rows.first()).toContainText('alert(1)');
  const filteredCount = await rows.count();
  expect(filteredCount).toBeGreaterThan(0);

  await searchInput.fill('');
  await expect(rows).toHaveCount(rowCount);
});
