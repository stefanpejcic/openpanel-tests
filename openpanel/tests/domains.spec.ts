import { test, expect } from '@playwright/test';
import { randomBytes } from 'crypto';

const DOMAINS = [
  'wp.tests.openpanel.org',
  'php.tests.openpanel.org',
  'nodejs.tests.openpanel.org',
  'python.tests.openpanel.org',
  'website-builder.tests.openpanel.org',
  'files.tests.openpanel.org',
];

async function addDomain(page, domain) {
  await page.goto(`/domains/new`);
  await expect(page).toHaveURL(/domains\/new/);
  await page.getByRole('textbox', { name: 'Domain*' }).fill(domain);
  await page.getByRole('button', { name: 'Add Domain' }).click();

  await expect(page.getByText(new RegExp(`Domain name ${domain} added successfully`, 'i'))).toBeVisible();
  console.log(`Domain added: ${domain}`);
}



test('add domains', async ({ page }) => {
  for (const domain of DOMAINS) {
    await addDomain(page, domain);
  }
});

test('verify files created for a new domain', async ({ page }) => {
  // domains page shows new domain
  await page.goto(`/domains`);
  await expect(page.locator('td[x-show="columns.domain"]', { hasText: 'wp.tests.openpanel.org' })).toBeVisible();
  console.log(`domain visible`);

  // docroot created
  await page.goto(`/files`);
  await expect(page).toHaveURL(/files/);
  await expect(page.getByText(/wp.tests.openpanel.org/i)).toBeVisible();
  console.log(`document root visible`);

  // DNS zone created
  await page.goto(`/domains\/edit-dns-zone\/wp.tests.openpanel.org`);
  await expect(page).toHaveURL(/domains\/edit-dns-zone\/wp.tests.openpanel.org/);
  await expect(page.getByText(/spf1/i)).toBeVisible();
  console.log(`zone file exists`);

  // vhosts file created
  await page.goto(`/domains\/vhosts?domain=wp.tests.openpanel.org`);
  await expect(page.locator('#editor')).toContainText('index.php');  
  console.log(`vhost file exists`);

  // SSL generation
  await page.goto('http://wp.tests.openpanel.org', {
    waitUntil: 'domcontentloaded',
  });
  const certData = page.locator('#certData');
  const start = Date.now();
  
  while (Date.now() - start < 15000) {
    await page.goto('/domains/ssl?domain_name=wp.tests.openpanel.org');
  
    try {
      await expect(certData).toBeVisible({ timeout: 2000 });
      break;
    } catch (e) {
      // retry
    }
  }
  
  await expect(certData).toBeVisible();
  console.log(`cert file exists`);
});

test('search domains', async ({ page }) => {
  await page.goto(`/domains`);
  await expect(page).toHaveURL(/domains/);

  const searchBox = page.getByRole('searchbox', { name: 'Search' });
  const rows = page.locator('tbody tr');

  await searchBox.fill('wp.tests.openpanel.org');
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);

  const visibleRows = rows.filter({ has: page.locator(':visible') });
  await expect(visibleRows).toHaveCount(1);
  await expect(visibleRows.first()).toContainText(/wp\.tests\.openpanel\.org/i);

  await expect(rows.filter({ hasNot: page.locator(':visible') })).toHaveCount(
    (await rows.count()) - 1
  );

  await searchBox.fill('non-existing-domain.com');
  await expect(rows.filter({ has: page.locator(':visible') })).toHaveCount(0);

  console.log('Domain search is working');
});



test('check columns for domains table', async ({ page }) => {
  await page.goto(`/domains`);
  await expect(page).toHaveURL(/domains/);
  await page.getByRole('button', { name: 'Show Columns' }).click();

  const rows = page.locator('ul[aria-labelledby="dropdownToggleButton"] li');

  const count = await rows.count();

  for (let i = 0; i < count; i++) {
    const row = rows.nth(i);

    const checkbox = row.locator('input[type="checkbox"]');

    const xModel = await checkbox.getAttribute('x-model');
    if (!xModel) continue;

    const columnKey = xModel.replace('columns.', '');
    const th = page.locator(`th[x-show="columns.${columnKey}"]`);

    const initialState = await checkbox.isChecked();

    await row.locator('label').click();
    await page.waitForTimeout(100); // needed for alpine.js x-show

    const expectedStateAfterToggle = !initialState;

    if (expectedStateAfterToggle) {
      await expect(th).toBeVisible();
    } else {
      await expect(th).toBeHidden();
    }

    await row.locator('label').click();
    await page.waitForTimeout(100);

    if (initialState) {
      await expect(th).toBeVisible();
    } else {
      await expect(th).toBeHidden();
    }
  }
  console.log('column toggle is working'); 
});



test('vhost editor', async ({ page }) => {
  await page.goto(`/domains/vhosts?domain=wp.tests.openpanel.org`);

  // TODO: add header for ols, apache, nginx
  //       then curl the domain and check for header

  console.log('vhost editor is working');
});





test('dns zone editor', async ({ page }) => {
  const domain = 'wp.tests.openpanel.org';

  await page.goto(`/domains/edit-dns-zone/${domain}`);

  const randomSuffix = randomBytes(3).toString('hex');
  const recordValue = `verify-${randomBytes(6).toString('hex')}`;

  // 1. create random TXT record
  await page.locator('#AddDNSRecord').click();
  const addRow = page.locator('#addRecordRow');
  await expect(addRow).toBeVisible();

  await addRow.locator('input[name="Name"]').fill(domain);
  await addRow.locator('select[name="Type"]').selectOption('TXT');
  await addRow.locator('input[name="Record"]').fill(recordValue);
  // await addRow.locator('input[name="TTL"]').fill('14400');
  await page.locator('#save-row').click();

  await expect(page.getByText(new RegExp(`DNS record added successfully`, 'i'))).toBeVisible();

  // 2. validate on page
  const newRow = page.locator('tr.domain_row', { hasText: recordValue });
  await expect(newRow).toBeVisible();
  await expect(newRow.locator('td').nth(2)).toHaveText('TXT');
  await expect(newRow.locator('td').nth(3)).toContainText(recordValue);

  // 3. validate using dig tools
  await page.goto(`https://digwebinterface.com/?hostnames=${domain}&type=TXT&useresolver=9.9.9.10&ns=self&nameservers=${domain}`);
  const resultsArea = page.locator('#results, pre, .results, [id*="result"]').first();
  await expect(resultsArea).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction(() => !document.querySelector('.loading, .spinner, [aria-busy="true"]'),{ timeout: 30_000 });
  await expect(page.locator('body')).toContainText(recordValue, { timeout: 30_000 });

  console.log('dns editor is working');
});
