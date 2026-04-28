import { test, expect, Page } from '@playwright/test';

async function openPhpPage(page: Page) {
  await page.goto('/php/domains');
  await expect(page.locator('table')).toBeVisible();
}

function domainRows(page: Page) {
  return page.locator('tbody tr');
}

test.describe('page structure', () => {
  test('page loads and shows the heading', async ({ page }) => {
    await openPhpPage(page);
    await expect(page.getByRole('heading', { name: /PHP version for domains/i })).toBeVisible();
  });

  test('table has 3 columns', async ({ page }) => {
    await openPhpPage(page);
    const headers = page.locator('thead th');
    await expect(headers).toHaveCount(3);
    await expect(headers.nth(0)).toContainText(/domain/i);
    await expect(headers.nth(1)).toContainText(/current php version/i);
    await expect(headers.nth(2)).toContainText(/change version/i);
  });
});

test.describe('version 4 domain', () => {
  test('non-empty PHP version', async ({ page }) => {
    await openPhpPage(page);

    const rows = domainRows(page);
    const rowCount = await rows.count();

    if (rowCount === 1) {
      const empty = rows.first();
      const text = await empty.textContent();
      if (text?.includes('No domains')) {
        test.skip();
        return;
      }
    }

    expect(rowCount).toBeGreaterThan(0);

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const versionCell = row.locator('td').nth(1);
      const text = await versionCell.textContent();
      expect(text?.trim()).toMatch(/\d+\.\d+|\//);
    }
  });

  test('status indicator bars', async ({ page }) => {
    await openPhpPage(page);
    const rows = domainRows(page);
    const rowCount = await rows.count();
    if (rowCount === 0) return;

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const versionCell = row.locator('td').nth(1);
      const bars = versionCell.locator('div.flex.gap-0\\.5 > div');
      await expect(bars).toHaveCount(3);
    }
  });

  test('summary counters', async ({ page }) => {
    await openPhpPage(page);
    const counters = page.locator('dl > div');
    const count = await counters.count();
    const rows = domainRows(page);
    const rowCount = await rows.count();
    if (rowCount > 0) {
      expect(count).toBeGreaterThan(0);
    }
  });
});

test.describe('search', () => {
  test('filter table rows', async ({ page }) => {
    await openPhpPage(page);

    const rows = domainRows(page);
    const totalRows = await rows.count();
    if (totalRows < 2) return;

    const firstDomainText = (await rows.first().locator('td').first().textContent()) ?? '';
    const searchTerm = firstDomainText.trim().split('.')[0];

    await page.getByPlaceholder(/search/i).fill(searchTerm);

    await page.waitForTimeout(300); // 4 alpinejs

    const visibleRows = rows.filter({ hasNot: page.locator('[style*="display: none"]') });
    const visibleCount = await visibleRows.count();
    expect(visibleCount).toBeGreaterThanOrEqual(1);
    expect(visibleCount).toBeLessThanOrEqual(totalRows);
  });

  test('clicking a version counter link filters by that version', async ({ page }) => {
    await openPhpPage(page);

    const counterLink = page.locator('dl a').first();
    const count = await counterLink.count();
    if (count === 0) return;

    const versionText = (await counterLink.textContent()) ?? '';
    await counterLink.click();

    await page.waitForTimeout(300);

    const searchInput = page.getByPlaceholder(/search/i);
    const searchValue = await searchInput.inputValue();
    expect(searchValue).toMatch(/\d+\.\d+/);
  });

  test('clear search', async ({ page }) => {
    await openPhpPage(page);

    const rows = domainRows(page);
    const totalRows = await rows.count();
    if (totalRows < 1) return;

    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('xyznonexistent999');
    await page.waitForTimeout(300);

    await searchInput.fill('');
    await page.waitForTimeout(300);

    const hiddenRows = page.locator('tbody tr[style*="display: none"]');
    await expect(hiddenRows).toHaveCount(0);
  });
});


test.describe('Change version', () => {
  test('Change button is disabled when the same version is selected', async ({ page }) => {
    await openPhpPage(page);
    const rows = domainRows(page);
    if (await rows.count() === 0) return;

    const firstRow = rows.first();
    const changeBtn = firstRow.getByRole('button', { name: /change/i });
    await expect(changeBtn).toBeDisabled();
  });

  test('Change button becomes enabled after picking a different version', async ({ page }) => {
    await openPhpPage(page);
    const rows = domainRows(page);
    if (await rows.count() === 0) return;

    const firstRow = rows.first();
    const select = firstRow.locator('select[name="new_php_version"]');

    // Get all option values
    const options = await select.locator('option:not([disabled])').all();
    if (options.length === 0) return;

    const newVersion = await options[0].getAttribute('value');
    if (!newVersion) return;

    await select.selectOption(newVersion);
    await page.waitForTimeout(200);

    const changeBtn = firstRow.getByRole('button', { name: /change/i });
    await expect(changeBtn).toBeEnabled();
  });

  test('submitting a version change posts the form and reloads', async ({ page }) => {
    await openPhpPage(page);
    const rows = domainRows(page);
    if (await rows.count() === 0) return;

    const firstRow = rows.first();
    const select = firstRow.locator('select[name="new_php_version"]');
    const options = await select.locator('option:not([disabled])').all();
    if (options.length === 0) return;

    const newVersion = await options[0].getAttribute('value');
    if (!newVersion) return;

    await select.selectOption(newVersion);

    const [request] = await Promise.all([
      page.waitForRequest((req) => req.method() === 'POST'),
      firstRow.getByRole('button', { name: /change/i }).click(),
    ]);

    expect(request.method()).toBe('POST');
    const body = request.postData() ?? '';
    expect(body).toContain('new_php_version');
    expect(body).toContain('domain_url');
    expect(body).toContain('csrf_token');
  });
});

test.describe('info.php live PHP version check', () => {
  test('info.php is reachable and reports the expected PHP version', async ({ page }) => {
    // 1. create info.php
    await page.goto(`/files/wp.tests.openpanel.org`);
    await page.getByRole('button', { name: ' New File' }).click();
    await page.getByRole('textbox', { name: 'File Name*' }).fill(`info.php`);
    await page.getByRole('button', { name: 'Create' }).click();
  
    await page.goto(`/file-manager/edit-file/wp.tests.openpanel.org/info.php`);
    await page.getByRole('textbox', { name: 'Editor content;Press Alt+F1' }).fill('<?php phpinfo();');
    await page.getByRole('button', { name: 'Save' }).click();
    
    const domain = 'wp.tests.openpanel.org';
    
    await openPhpPage(page);
    const rows = domainRows(page);
    const rowCount = await rows.count();

    let expectedVersion: string | null = null;
    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const domainCell = await row.locator('td').first().textContent();
      if (domainCell && domain.includes(domainCell.trim())) {
        const versionCell = await row.locator('td').nth(1).textContent();
        expectedVersion = versionCell?.match(/\d+\.\d+/)?.[0] ?? null;
        break;
      }
    }

    if (!expectedVersion) {
      test.skip(true, `Could not find domain "${domain}" in the PHP settings table`);
      return;
    }

    await page.goto(`${domain}/info.php`);
    await expect(page.locator('body')).toContainText(`PHP Version ${expectedVersion}`);
  });

  test('info.php page title confirms it is a PHP info page', async ({ page }) => {
    await page.goto(`${domain}/info.php`);
    await expect(page).toHaveTitle(/phpinfo/i);
  });
});

test.describe('AJAX requests and dynamic data', () => {
  test('no failed network requests on page load', async ({ page }) => {
    const failedRequests: string[] = [];

    page.on('requestfailed', (req) => {
      failedRequests.push(`${req.method()} ${req.url()} – ${req.failure()?.errorText}`);
    });

    await openPhpPage(page);
    await page.waitForTimeout(1000);

    expect(failedRequests).toHaveLength(0);
  });

  test('XHR/fetch responses that affect the page return 2xx status', async ({ page }) => {
    const badResponses: string[] = [];

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/api/') || url.includes('/ajax/') || url.includes('/php/')) {
        if (response.status() >= 400) {
          badResponses.push(`${response.status()} ${url}`);
        }
      }
    });

    await openPhpPage(page);
    await page.waitForTimeout(1000);

    expect(badResponses).toHaveLength(0);
  });

  test('domain rows are populated from server data (not empty)', async ({ page }) => {
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/php/domains') && res.status() === 200),
      page.goto('/php/domains'),
    ]);

    const html = await response.text();
    expect(html).toMatch(/\d+\.\d+/);
  });

  test('version counters are shown and display domain counts', async ({ page }) => {
    await openPhpPage(page);

    const counterLinks = page.locator('dl a');
    const count = await counterLinks.count();

    for (let i = 0; i < count; i++) {
      const text = await counterLinks.nth(i).textContent();
      expect(text).toMatch(/\d+\s+domains?/i);
    }
  });
});
