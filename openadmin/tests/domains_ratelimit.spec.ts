import { Locator, test, expect } from '@playwright/test';

// /domains/ratelimit: server default and per-domain request limits, every change is put back

test('page lists domains with their limits and loads the 24h stats', async ({ page }) => {
  const stats = page.waitForResponse(r => r.url().includes('/domains/ratelimit/stats'));
  await page.goto('/domains/ratelimit');
  await expect(page.getByRole('heading', { name: 'Rate Limiting' })).toBeVisible();
  await expect(page.locator('#ratelimit_table')).toBeVisible();
  await expect(page.getByText("Couldn't read the rate limits")).toHaveCount(0);

  const res = await stats;
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body).toHaveProperty('stats');
  console.log(`rate limit stats for ${Object.keys(body.stats).length} domains`);
});

test('server default form shows the current limits', async ({ page }) => {
  await page.goto('/domains/ratelimit');
  await page.getByText('Server Default', { exact: true }).click();
  for (const id of ['#default_per_ip', '#default_per_site']) {
    await expect(page.locator(id)).toBeVisible();
    expect(await page.locator(id).inputValue()).toMatch(/^\d+$/);
  }
});

test('search narrows the domains', async ({ page }) => {
  await page.goto('/domains/ratelimit');
  const rows = page.locator('#ratelimit_table tbody tr:has(button:text("Edit"))');
  test.skip(await rows.count() === 0, 'No domains on this server');

  await page.getByPlaceholder('Search domains or users…').fill('no-such-domain-xyz');
  await expect(page.locator('#ratelimit_table tbody tr:has(button:text("Edit")):visible')).toHaveCount(0);
  await page.getByPlaceholder('Search domains or users…').fill('');
  await expect(page.locator('#ratelimit_table tbody tr:has(button:text("Edit")):visible')).toHaveCount(await rows.count());
});

// cluster masters add a Server column, so cells are found by their header name instead of a fixed position
async function colIndex(table: Locator, name: string): Promise<number> {
  const heads = (await table.locator('thead th').allInnerTexts()).map(h => h.trim().toLowerCase());
  const i = heads.indexOf(name.toLowerCase());
  if (i < 0) throw new Error(`no "${name}" column in ${heads.join(', ')}`);
  return i;
}

test('custom limits on a domain are saved and then put back', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/domains/ratelimit');
  const row = page.locator('#ratelimit_table tbody tr:has(button:text("Edit"))').first();
  test.skip(await row.count() === 0, 'No domains on this server');

  const table = page.locator('#ratelimit_table');
  const [domainCol, settingCol, ipCol, siteCol] = [await colIndex(table, 'Domain'), await colIndex(table, 'Setting'), await colIndex(table, 'Per IP'), await colIndex(table, 'Per domain')];
  const domain = (await row.locator('td').nth(domainCol).innerText()).trim();
  const mode = (await row.locator('td').nth(settingCol).innerText()).trim().toLowerCase();
  const original = mode.startsWith('custom') ? 'custom' : mode.startsWith('off') ? 'off' : 'default';
  const [perIP, perSite] = [(await row.locator('td').nth(ipCol).innerText()).trim(), (await row.locator('td').nth(siteCol).innerText()).trim()];

  const save = async (m: string, ip?: string, site?: string) => {
    await page.locator('#ratelimit_table tbody tr', { hasText: domain }).getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByText(`Rate limit for ${domain}`).first()).toBeVisible();
    await page.locator(`input[name="mode"][value="${m}"]`).check();
    if (m === 'custom') {
      await page.locator('#edit_per_ip').fill(ip!);
      await page.locator('#edit_per_site').fill(site!);
    }
    await page.locator('form:has(input[name="action"][value="domain"])').getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(`Rate limit for ${domain} updated.`)).toBeVisible({ timeout: 60_000 });
  };

  await save('custom', '123', '4567');
  const changed = page.locator('#ratelimit_table tbody tr', { hasText: domain });
  await expect(changed).toContainText('Custom');
  await expect(changed.locator('td').nth(ipCol)).toHaveText('123');
  await expect(changed.locator('td').nth(siteCol)).toHaveText('4567');

  await save(original, perIP === '-' ? '0' : perIP, perSite === '-' ? '0' : perSite);
  console.log(`${domain}: custom 123/4567 saved, back to ${original}`);
});
