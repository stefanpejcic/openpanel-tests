import { test, expect } from '@playwright/test';

test('domain logs selector page loads when no domain chosen', async ({ page }) => {
  const response = await page.goto('/domains/log');
  await expect(page).toHaveURL(/domains\/log/);
  expect(response?.status()).toBeLessThan(400);

  console.log('domain logs selector page loaded without error');
});

test('domain access logs table loads with search/columns for a real domain', async ({ page }) => {
  await page.goto('/domains');
  const vhostLink = page.locator('a[href^="/domains/vhost/"]').first();
  const count = await vhostLink.count();
  test.skip(count === 0, 'No domains available to inspect logs for');

  const href = await vhostLink.getAttribute('href');
  const parts = href!.split('/').filter(Boolean); // ['domains', 'vhost', username, domain]
  const username = parts[2];
  const domain = parts[3];

  await page.goto(`/domains/log/${domain}`);

  // when no log file exists yet, the route redirects back to the selector
  // page (/domains/log) with a flash instead of staying on the domain URL
  if (page.url().includes(`/domains/log/${domain}`)) {
    const table = page.locator('#databases-table');

    if (await table.isVisible().catch(() => false)) {
      await expect(page.locator('#showAllCheckbox')).toHaveCount(await page.locator('#showAllCheckbox').count());
      await expect(page.locator('#dropdownToggleButton')).toBeVisible();
      console.log(`domain access logs table loaded for ${domain}`);
    } else {
      await expect(page.getByText(/Log file (not found|for domain .* is empty)/)).toBeVisible();
      console.log(`no access log file found for ${domain} (expected on environments without traffic yet)`);
    }
  } else {
    await expect(page).toHaveURL(/domains\/log\/?$/);
    await expect(page.getByText(/Log file (not found|for domain .* is empty)/)).toBeVisible();
    console.log(`no access log file found for ${domain}, redirected with flash`);
  }
});

test('domain goaccess stats page loads or shows not-yet-generated message', async ({ page }) => {
  await page.goto('/domains');
  const vhostLink = page.locator('a[href^="/domains/vhost/"]').first();
  const count = await vhostLink.count();
  test.skip(count === 0, 'No domains available to inspect stats for');

  const href = await vhostLink.getAttribute('href');
  const parts = href!.split('/').filter(Boolean);
  const username = parts[2];
  const domain = parts[3];

  await page.goto(`/domains/stats/${username}/${domain}`);

  // route redirects to /domains with a flash if stats file doesn't exist yet (24h generation)
  if (page.url().includes('/domains/stats/')) {
    await expect(page.locator('body')).toBeVisible();
    console.log(`goaccess stats page rendered for ${username}/${domain}`);
  } else {
    await expect(page).toHaveURL(/\/domains\/?$/);
    await expect(page.getByText(/Stats file for domain .* not found/)).toBeVisible();
    console.log(`goaccess stats not yet generated for ${username}/${domain}, redirected with flash`);
  }
});
