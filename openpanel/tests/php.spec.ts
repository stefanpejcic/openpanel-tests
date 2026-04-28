import { test, expect, Page } from '@playwright/test';

async function openPhpPage(page: Page) {
  await page.goto('/php/domains');
  await expect(page.locator('table')).toBeVisible();
}

function domainRows(page: Page) {
  return page.locator('tbody tr');
}

test('list versions', async ({ page }) => {
  await openPhpPage(page);

  // header is ok
  await expect(page.getByRole('heading', { name: /PHP version for domains/i })).toBeVisible();

  // table is ok
  const headers = page.locator('thead th');
  await expect(headers).toHaveCount(3);
  await expect(headers.nth(0)).toContainText(/domain/i);
  await expect(headers.nth(1)).toContainText(/current php version/i);
  await expect(headers.nth(2)).toContainText(/change version/i);

  // versions are shown in the table
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

    // version format is ok
    const text = await versionCell.textContent();
    expect(text?.trim()).toMatch(/\d+\.\d+/);
  
    // status indicators are ok
    const bars = versionCell.locator('div.flex.gap-0\\.5 > div');
    await expect(bars).toHaveCount(3);   
  }

  // summary per version
  const counters = page.locator('dl > div');
  const count = await counters.count();
  if (rowCount > 0) {
    expect(count).toBeGreaterThan(0);
  }  

});



test.describe('search filter', () => {
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

  test('version counter filter', async ({ page }) => {
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



test('change every PHP version and verify info.php', async ({ page }) => {
  test.setTimeout(120_000); // 2min
  const domain = 'wp.tests.openpanel.org';

  // 1. Create info.php
  await page.goto(`/files/${domain}`);
  await page.getByRole('button', { name: ' New File' }).click();
  await page.getByRole('textbox', { name: 'File Name*' }).fill('info.php');
  await page.getByRole('button', { name: 'Create' }).click();
  await page.goto(`/file-manager/edit-file/${domain}/info.php`);
  await page.getByRole('textbox', { name: 'Editor content;Press Alt+F1' }).fill('<?php phpinfo();');
  await page.getByRole('button', { name: 'Save' }).click();

  try {
    await openPhpPage(page);
    const rows = domainRows(page);
    const rowCount = await rows.count();

    let targetRow = null;
    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const domainCell = await row.locator('td').first().textContent();
      if (domainCell?.trim() && domain.includes(domainCell.trim())) {
        targetRow = row;
        break;
      }
    }
    if (!targetRow) {
      test.skip(true, `Could not find domain "${domain}" in the PHP settings table`);
      return;
    }

    const select = targetRow.locator('select[name="new_php_version"]');
    const options = await select.locator('option:not([disabled])').all();
    if (options.length === 0) {
      test.skip(true, 'No PHP versions available to switch to');
      return;
    }

    // 2. Cycle through every available version
    for (const option of options) {
      const newVersion = await option.getAttribute('value');
      if (!newVersion) continue;

      const currentVersion = (await targetRow.locator('td').nth(1).textContent())?.match(/\d+\.\d+/)?.[0] ?? 'unknown';

      await select.selectOption(newVersion);
      await Promise.all([page.waitForResponse((res) => res.request().method() === 'POST' && res.status() === 200,{ timeout: 90_000 }),targetRow.getByRole('button', { name: /change/i }).click(),]);
      await expect(page.getByText(new RegExp(`PHP version for domain .* updated from ${currentVersion} to ${newVersion}`, 'i'))).toBeVisible({ timeout: 10_000 });
      await expect(targetRow).toContainText(newVersion, { timeout: 5_000 });

      const versionShort = newVersion.match(/\d+\.\d+/)?.[0] ?? newVersion;
      await page.goto(`https://${domain}/info.php?nocache=${Math.floor(Math.random() * 100_000)}`);
      await expect(page.locator('body')).toContainText(`PHP Version ${versionShort}`);
      await openPhpPage(page);
      console.log(`php ${versionShort} is working`);
    }
  } finally {
    await page.goto(`/files/${domain}`);
    await page.locator('#filemanager_table div').filter({ hasText: 'info.php' }).click();
    await page.getByRole('button', { name: ' Delete' }).click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
  }
});
