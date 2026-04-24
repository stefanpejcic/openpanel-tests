import { test, expect } from '@playwright/test';

test('Domain add', async ({ page }) => {
  await page.goto(`/domains`);
  await expect(page).toHaveURL(/domains/);
  await page.getByRole('link', { name: 'New Domain', exact: true }).click();
  await expect(page).toHaveURL(/domains\/new/);
  await page.getByRole('textbox', { name: 'Domain*' }).fill('wp1.jecmenica.rs');
  await page.getByRole('button', { name: 'Add Domain' }).click();
  await expect(page.getByText(/Domain name wp1.jecmenica.rs added successfully/i)).toBeVisible();
  console.log(`domain add successfull`);

  await page.goto(`/domains`);
  await expect(page.getByRole('cell', { name: /wp1\.jecmenica\.rs/ })).toBeVisible();
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
  await expect(page.getByText(/index.php/i)).toBeVisible();
  console.log(`vhost file exists`);
  
  await page.goto(`/domains\/ssl?domain_name=wp1.jecmenica.rs`);
  const certData = page.locator('#certData');
  await expect(certData).toBeVisible();
  console.log(`cert file exists`);

  
});
