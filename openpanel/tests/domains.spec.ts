import { test, expect } from '@playwright/test';

test('add domain', async ({ page }) => {
  await page.goto(`/domains`);
  await expect(page).toHaveURL(/domains/);
  await page.getByRole('link', { name: 'New Domain', exact: true }).click();
  await expect(page).toHaveURL(/domains\/new/);
  await page.getByRole('textbox', { name: 'Domain*' }).fill('wp1.jecmenica.rs');
  await page.getByRole('button', { name: 'Add Domain' }).click();
  await expect(page.getByText(/Domain name wp1.jecmenica.rs added successfully/i)).toBeVisible();
  console.log(`domain add successfull`);

  await page.goto(`/domains`);
  await expect(page.locator('td[x-show="columns.domain"]', { hasText: 'wp1.jecmenica.rs' })).toBeVisible();
  console.log(`domain visible`);

  await page.goto(`/files`);
  await expect(page).toHaveURL(/files/);
  await expect(page.getByText(/wp1.jecmenica.rs/i)).toBeVisible();
  console.log(`document root visible`);

  await page.goto(`/domains\/edit-dns-zone\/wp1.jecmenica.rs`);
  await expect(page).toHaveURL(/domains\/edit-dns-zone\/wp1.jecmenica.rs/);
  await expect(page.getByText(/spf1/i)).toBeVisible();
  console.log(`zone file exists`);

  await page.goto(`/domains\/vhosts?domain=wp1.jecmenica.rs`);
  await expect(page.locator('#editor')).toContainText('index.php');  
  console.log(`vhost file exists`);
  
  await page.goto(`/domains\/ssl?domain_name=wp1.jecmenica.rs`);
  const certData = page.locator('#certData');
  await expect(certData).toBeVisible();
  console.log(`cert file exists`);
});

test('search domains', async ({ page }) => {
  await page.goto(`/domains`);
  await expect(page).toHaveURL(/domains/);

  await navigateToUserPackages(page);
  await page.getByRole('searchbox', { name: 'Search' }).fill('wp1.jecmenica.rs');
  
  const row = page.getByRole('row').filter({ hasText: 'wp1.jecmenica.rs' });
  await expect(row).toHaveCount(1);
  await expect(row).toHaveText(/wp1.jecmenica.rs/i);

  console.log('Domain search is working');
});

