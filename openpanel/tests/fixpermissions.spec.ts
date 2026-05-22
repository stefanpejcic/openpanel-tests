import { test, expect } from '@playwright/test';

test('fix permissions', async ({ page }) => {
  await page.goto(`/files`);
  await page.getByRole('button', { name: ' New File' }).click();
  await page.getByRole('textbox', { name: 'File Name*' }).fill('testfajl');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.locator('#alert-1')).toContainText('File created successfully');
  await page.getByRole('button', { name: ' New Folder' }).click();
  await page.locator('#foldername').fill('testdir');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.locator('#alert-1')).toContainText('Folder created successfully');
  await page.locator('#filemanager_table div').filter({ hasText: 'testdir' }).click();
  await page.getByRole('button', { name: ' Permissions' }).click();
  await page.getByPlaceholder('775').fill('200');
  await page.getByRole('button', { name: 'Confirm' }).click();
  await page.locator('div').filter({ hasText: /^testfajl$/ }).click();
  await page.getByRole('button', { name: ' Permissions' }).click();
  await page.getByPlaceholder('775').fill('200');
  await page.getByRole('button', { name: 'Confirm' }).click();
  await page.goto(`/fix-permissions`)
  await page.getByRole('button', { name: 'Fix Permissions' }).click();
  const message = page.locator('#scan-complete-message');

  await expect(message).toBeVisible();
  await expect(message).toHaveText('Permissions are fixed!');

  await page.goto(`/files`);
  await page.locator('#filemanager_table div').filter({ hasText: 'testdir' }).click();
  await page.getByRole('button', { name: ' Permissions' }).click();
  await expect(page.locator('#c-oct')).toHaveValue('775');
  await page.goto(`/files`);
  await page.locator('div').filter({ hasText: /^testfajl$/ }).click();
  await page.getByRole('button', { name: ' Permissions' }).click();
  await expect(page.locator('#c-oct')).toHaveValue('644');

});
