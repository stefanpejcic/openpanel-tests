import { test, expect } from '@playwright/test';

test('Domain add', async ({ page }) => {
  await page.goto(`/domains`);
  await expect(page).toHaveURL(/domains/);
  await page.getByRole('link', { name: 'New Domain', exact: true }).click();
  await expect(page).toHaveURL(/domains\/new/);
  await page.getByRole('textbox', { name: 'Domain*' }).fill('rasa.rs');
  await page.getByRole('button', { name: 'Add Domain' }).click();
  await expect(page.getByText(/success/i)).toBeVisible();
  console.log(`domain add successfull`);

  await page.goto(`/domains`);
  await Promise.all([
    expect(page.getByText(/rasa.rs/i)).toBeVisible(),
    expect(page.getByText(/\/var\/www\/html\/rasa.rs/i)).toBeVisible(),
  ]);
  console.log(`domain visible`);
  
  await page.goto(`/files`);
  await expect(page).toHaveURL(/files/);
  await expect(page.getByText(/rasa.rs/i)).toBeVisible();
  console.log(`document root visible`);

  
  await page.goto(`/domains\/edit-dns-zone\/rasa.rs`);
  await expect(page).toHaveURL(/domains\/edit-dns-zone\/rasa.rs/);
  await expect(page.getByText(/spf1/i)).toBeVisible();
  console.log(`zone file exists`);
  
  await page.goto(`/domains\/ssl?domain_name=rasa.rs`);
  await expect(page).toHaveURL(/domains\/ssl?domain_name=rasa.rs);
  const certData = page.locator('#certData');
  await expect(certData).toBeVisible();
  console.log(`cert file exists`);

  await page.goto(`/domains\/vhosts?domain=rasa.rs`);
  await expect(page.getByText(/index.php/i)).toBeVisible();
  console.log(`vhost file exists`);
  
});
