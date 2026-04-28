import { test, expect } from '@playwright/test';

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
  await page.goto(`/domains`);
  await expect(page.locator('td[x-show="columns.domain"]', { hasText: 'wp.tests.openpanel.org' })).toBeVisible();
  console.log(`domain visible`);

  await page.goto(`/files`);
  await expect(page).toHaveURL(/files/);
  await expect(page.getByText(/wp.tests.openpanel.org/i)).toBeVisible();
  console.log(`document root visible`);

  await page.goto(`/domains\/edit-dns-zone\/wp.tests.openpanel.org`);
  await expect(page).toHaveURL(/domains\/edit-dns-zone\/wp.tests.openpanel.org/);
  await expect(page.getByText(/spf1/i)).toBeVisible();
  console.log(`zone file exists`);

  await page.goto(`/domains\/vhosts?domain=wp.tests.openpanel.org`);
  await expect(page.locator('#editor')).toContainText('index.php');  
  console.log(`vhost file exists`);
  
  await page.goto(`/domains\/ssl?domain_name=wp.tests.openpanel.org`);
  const certData = page.locator('#certData');
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
  await expect(visibleRows.first()).toContainText(/wp1\.jecmenica\.rs/i);

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
