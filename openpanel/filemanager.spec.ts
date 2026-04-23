import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
	  test.setTimeout(90_000);
  await page.goto('https://185.193.66.252:2083/login');
  await page.getByRole('textbox', { name: 'Username' }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill('testinguser');
  await page.getByRole('textbox', { name: 'Username' }).press('Tab');
  await page.getByRole('textbox', { name: 'Password' }).fill('testingpassword');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.locator('.size-9.items-center.justify-center.rounded-xl').first().click();
  await page.getByRole('button', { name: ' New File' }).click();
  await page.getByRole('textbox', { name: 'File Name*' }).click();
  await page.getByRole('textbox', { name: 'File Name*' }).fill('radovanfajl');
  await page.getByRole('button', { name: 'Create' }).click();
	await expect(page.locator('body')).toContainText(/File created successfully/i);
	await expect(page.locator('body')).toContainText(/radovanfajl/i);
	
  await page.getByRole('button', { name: ' New Folder' }).click();
  await page.locator('#foldername').click();
  await page.locator('#foldername').fill('radovanfolder');
  await page.getByRole('button', { name: 'Create' }).click();
  	await expect(page.locator('body')).toContainText(/Folder created successfully/i);
	await expect(page.locator('body')).toContainText(/radovanfolder/i);

  await page.locator('#filemanager_table div').filter({ hasText: 'radovanfajl' }).click();
  await page.getByRole('button', { name: ' Copy' }).click();
  await page.locator('#copyfiletree').getByText('radovanfolder').click();
  await page.getByRole('button', { name: 'Copy', exact: true }).click();
    await expect(page.locator('body')).toContainText(/Copy complete/i);
	await expect(page.locator('body')).toContainText(/radovanfajl/i);
	
  await page.getByRole('link', { name: 'radovanfolder' }).click();
  	await expect(page.locator('body')).toContainText(/radovanfajl/i);
  await page.locator('#filemanager_table div').filter({ hasText: 'radovanfajl' }).click();
  await page.getByRole('button', { name: ' Move' }).click();
  await page.getByRole('textbox', { name: 'Where to:*' }).click();
  await page.getByRole('textbox', { name: 'Where to:*' }).press('ControlOrMeta+Shift+ArrowLeft');
  await page.getByRole('textbox', { name: 'Where to:*' }).press('ControlOrMeta+Shift+ArrowLeft');
  await page.getByRole('textbox', { name: 'Where to:*' }).fill('/');
  await page.getByRole('button', { name: 'Move', exact: true }).click();
    await expect(page.locator('body')).toContainText(/Move complete/i);
	await expect(page.locator('body')).not.toContainText(/radovanfajl/i);
	await expect(page.locator('body')).toContainText(/No items found/i);

  await page.getByRole('link', { name: '/var/www/html/' }).click();
    await expect(page.locator('body')).toContainText(/radovanfajl/i);

  await page.locator('#filemanager_table div').filter({ hasText: 'radovanfajl' }).click();
  await page.getByRole('button', { name: ' Delete' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
	await expect(page.locator('body')).not.toContainText(/radovanfajl/i);
  await page.getByRole('link', { name: 'Trash' }).click();
	await expect(page.locator('body')).toContainText(/radovanfajl/i);
  await page.locator('#filemanager_table div').filter({ hasText: 'radovanfajl' }).click();
  await page.getByRole('button', { name: ' Restore' }).click();
  await page.getByRole('button', { name: 'Restore', exact: true }).click();
  await page.getByRole('link', { name: 'File Manager' }).click();
  	await expect(page.locator('body')).toContainText(/radovanfajl/i);

  await page.goto('https://185.193.66.252:2083/files');
  await page.locator('#filemanager_table div').filter({ hasText: 'radovanfolder' }).click();
  await page.locator('#filemanager_table div').filter({ hasText: 'radovanfajl' }).click({
    modifiers: ['ControlOrMeta']
  });
  await page.getByRole('button', { name: ' Delete' }).click();
  await page.getByRole('checkbox', { name: 'Skip the trash and' }).check();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
	await expect(page.locator('body')).not.toContainText(/radovanfajl/i);
	await expect(page.locator('body')).not.toContainText(/radovanfolder/i);

});
