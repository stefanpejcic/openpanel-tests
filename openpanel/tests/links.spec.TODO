import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {

  // TEST MENU LINKS
  await page.getByRole('button', { name: 'Websites' }).click();
  await page.getByRole('link', { name: 'Auto Installer', exact: true }).click();
  await expect(page).toHaveURL(/.*auto-installer/);
  await expect(page.locator('body')).toContainText([
    /wordpress/i,
  
    /website builder/i,
    /node\.js/i,
    /python/i
  ]);


  await page.getByRole('link', { name: 'Site Manager' }).click();
  await expect(page).toHaveURL(/.*sites/);
  await expect(page.locator('body'))
    .toContainText(/no websites yet/i);


  await page.getByRole('link', { name: 'WordPress Manager' }).click();
  await expect(page).toHaveURL(/.*wordpress/);
  await expect(page.locator('body'))
    .toContainText(/total installations/i);


  await page.getByRole('button', { name: 'Files' }).click();
  await page.getByRole('link', { name: 'File Manager' }).click();
  await expect(page).toHaveURL(/.*files/);
  await expect(page.locator('body'))
    .toContainText(/no items found/i);

  await page.getByRole('link', { name: 'Upload from device' }).click();
  await expect(page.locator('body'))
    .toContainText(/file upload/i);

  await page.getByRole('link', { name: 'Download from URL' }).click();
  await expect(page.locator('body'))
    .toContainText(/upload from device instead/i);

  await page.getByRole('link', { name: 'FTP Accounts' }).click();
  await expect(page.locator('body'))
    .toContainText(/no accounts yet/i);

  await page.getByRole('link', { name: 'Backups' }).click();
  await expect(page.locator('body'))
    .toContainText(/select destination/i);

  await page.getByRole('link', { name: 'Disk Usage' }).click();
  await expect(page.locator('body'))
    .toContainText(/docker-data/i);

  await page.getByRole('link', { name: ' docker-data' }).click();
  await expect(page.locator('body'))
    .toContainText(/containers/i);

  await page.getByRole('link', { name: ' Up One Level' }).click();
  await expect(page.locator('body'))
    .toContainText(/docker-data/i);

  await page.getByRole('link', { name: 'Inodes Explorer' }).click();
  await expect(page.locator('body'))
    .toContainText(/docker-data/i);

  await page.getByRole('link', { name: ' docker-data' }).click();

  await expect(page.locator('body'))
    .toContainText(/containerd/i);

  await page.getByRole('link', { name: 'Fix Permissions' }).click();
  await expect(page.locator('body'))
    .toContainText(/choose a directory/i);
  await page.getByRole('button', { name: 'Fix Permissions' }).click();
  await expect(page.locator('body'))
    .toContainText(/permissions are fixed/i);


  await page.getByRole('link', { name: 'Trash' }).click();
  await expect(page.locator('body'))
    .toContainText(/no files/i);


  // LOGOUT
  await page.getByRole('button', { name: 'User settings' }).click();
  await page.getByRole('link', { name: 'Sign out' }).click();

  await expect(page).toHaveURL(/.*login/);

});
