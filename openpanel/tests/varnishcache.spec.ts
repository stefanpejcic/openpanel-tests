import { test, expect } from '@playwright/test';

test.describe('Varnish Cache Page', () => {

  test('enable varnish', async ({ page }) => {
    await page.goto('/cache/varnish');
    const status = page.locator('#service-page-status');
    await expect(status).toHaveText('Disabled');
    await page.getByRole('button', { name: 'Click to Enable' }).click();
    await expect(status).not.toHaveText('Disabled');
  });

  test('should show domains table and enable Varnish for wp.tests.openpanel.org', async ({ page }) => {
    await page.goto('/cache/varnish');
    const table = page.locator('table');
    await expect(table).toBeVisible();
    const firstRow = page.locator('tbody tr.domain_row').first();
    await expect(firstRow).toBeVisible();
    const domainCell = firstRow.locator('td').first();
    const domainName = (await domainCell.textContent())?.trim();
    expect(domainName).toBeTruthy();
    expect(domainName).toBe('wp.tests.openpanel.org');
    const toggleButton = firstRow.locator('button[type="submit"]');
    await expect(toggleButton).toHaveAttribute('aria-checked', 'false');
    await toggleButton.click();
    await page.waitForLoadState('networkidle');
    const alert = page.locator('#alert-stack .ms-3');
    await expect(alert).toContainText(`Varnish cache is now On for domain ${domainName}`, { timeout: 10_000 });

    const response = await page.request.get(`http://wp.tests.openpanel.org/test`);
    const headers = response.headers();
    const isVarnishActive = 'x-varnish' in headers
      || headers['x-cache']?.toLowerCase().includes('hit')
      || headers['x-cache']?.toLowerCase().includes('miss');
    expect(isVarnishActive).toBe(true);
  });

  test('should display container log and show Varnish Cache & Container stats', async ({ page }) => {
    await page.goto('/cache/varnish');
    const logButton = page.locator('#service-log');
    await expect(logButton).toBeVisible();
    await expect(logButton).toHaveText('View container log');
    await logButton.click();
    const logContainer = page.locator('#log-container');
    await expect(logContainer).toBeVisible({ timeout: 15_000 });
    const logPre = page.locator('#log-content');
    await expect(logPre).toBeVisible();
    const logText = await logPre.textContent();
    expect(logText?.trim().length).toBeGreaterThan(0);

    const varnishCacheSection = page.locator('h2:has-text("Varnish Cache")');
    await expect(varnishCacheSection).toBeVisible();

    const expectedMetrics = ['Hit Ratio', 'Hits', 'Misses', 'Pass', 'Requests', 'Backend Requests'];
    for (const metric of expectedMetrics) {
      const label = page.locator('span.text-sm').filter({ hasText: metric }).first();
      await expect(label).toBeVisible();
    }

    const metricValues = page.locator('[x-data="varnishStats()"] span.font-medium');
    const count = await metricValues.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(metricValues.nth(i)).not.toHaveText('--', { timeout: 10_000 });
    }

    const containerSection = page.locator('h2:has-text("Container")');
    await expect(containerSection).toBeVisible();
    const containerStats = page.locator('#service-page-stats');
    await expect(containerStats).toBeVisible();
    const expectedContainerLabels = ['CPU Usage', 'Memory Usage', 'Memory %', 'Network I/O', 'PIDs'];
    for (const label of expectedContainerLabels) {
      const labelEl = containerStats.locator('span.text-sm').filter({ hasText: label });
      await expect(labelEl).toBeVisible();
    }

    const containerValues = containerStats.locator('span.font-medium');
    const containerCount = await containerValues.count();
    expect(containerCount).toBeGreaterThan(0);
    for (let i = 0; i < containerCount; i++) {
      await expect(containerValues.nth(i)).not.toHaveText('--', { timeout: 10_000 });
    }
  });

  test('should disable Varnish for wp.tests.openpanel.org', async ({ page }) => {
  await page.goto('/cache/varnish');

  const table = page.locator('table');
  await expect(table).toBeVisible();

  const firstRow = page.locator('tbody tr.domain_row').first();
  await expect(firstRow).toBeVisible();

  const domainCell = firstRow.locator('td').first();
  const domainName = (await domainCell.textContent())?.trim();
  expect(domainName).toBeTruthy();
  expect(domainName).toBe('wp.tests.openpanel.org');

  const toggleButton = firstRow.locator('button[type="submit"]');
  await expect(toggleButton).toHaveAttribute('aria-checked', 'true');

  await toggleButton.click();
  await page.waitForLoadState('networkidle');

  const alert = page.locator('#alert-stack .ms-3');
  await expect(alert).toContainText(`Varnish cache is now Off for domain ${domainName}`, { timeout: 10_000 });

  const response = await page.request.get(`http://wp.tests.openpanel.org/test2`);
  const headers = response.headers();

  const xCache = headers['x-cache']?.toLowerCase() || '';
  const via = headers['via']?.toLowerCase() || '';

  const isVarnishActive = Boolean(
	'x-varnish' in headers ||
	xCache.includes('hit') ||
	xCache.includes('miss') ||
	via.includes('varnish')
	);

	expect(isVarnishActive).toBe(false);
});
  test('disable varnish', async ({ page }) => {
	  await page.goto('/cache/varnish');
	  const status = page.locator('#service-page-status');
	  await expect(status).not.toHaveText('Disabled');
	  await page.getByRole('button', { name: 'Click to Disable' }).click();
	  await expect(status).toHaveText('Disabled');
  });

});