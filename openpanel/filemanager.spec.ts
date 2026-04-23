import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
	  test.setTimeout(180_000);
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



  await page.goto('https://185.193.66.252:2083/files');
  await page.getByRole('button', { name: ' New File' }).click();
  await page.getByRole('textbox', { name: 'File Name*' }).click();
  await page.getByRole('textbox', { name: 'File Name*' }).fill('petarfajl.txt');
  await page.locator('#open').check();
  await page.getByRole('button', { name: 'Create' }).click();
  await page.locator('.view-lines').click();
  await page.getByRole('textbox', { name: 'Editor content;Press Alt+F1' }).fill('nekitext');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.locator('#fullscreenButton').click();
		await expect(page.locator('body')).toContainText(/File saved successfully/i);
	
  await page.goto('https://185.193.66.252:2083/files');
		await expect(page.locator('body')).toContainText(/petarfajl.txt/i);
  await page.locator('#filemanager_table div').filter({ hasText: 'petarfajl.txt' }).click();
  const page2Promise = page.waitForEvent('popup');
  await page.getByRole('button', { name: ' View' }).click();
  const page2 = await page2Promise;
		await expect(page2.locator('body')).toContainText(/nekitext/i);

  const page3Promise = page.waitForEvent('popup');
  await page.getByRole('button', { name: ' Edit' }).click();
  const page3 = await page3Promise;
		await expect(page3.locator('body')).toContainText(/nekitext/i);
  await page3.locator('div').filter({ hasText: /^nekitext$/ }).nth(2).click();
  await page3.getByRole('textbox', { name: 'Editor content;Press Alt+F1' }).fill('nekitext2');
  await page3.getByRole('button', { name: 'Save' }).click();
  const page4Promise = page.waitForEvent('popup');
  await page.getByRole('button', { name: ' View' }).click();
  const page4 = await page4Promise;
		await expect(page4.locator('body')).toContainText(/nekitext2/i);

  await page.getByRole('button', { name: ' Rename' }).click();
  await page.locator('#renameInput').click();
  await page.locator('#renameInput').fill('petarfajl.txt_bak');
  await page.getByRole('button', { name: 'Rename', exact: true }).click();
		await expect(page.locator('body')).toContainText(/petarfajl.txt_bak/i);
		await expect(page.locator('body')).toContainText(/File renamed successfully/i);

  await page.locator('#filemanager_table div').filter({ hasText: 'petarfajl.txt_bak' }).click();
  await page.getByRole('button', { name: ' Permissions' }).click();
  await page.getByPlaceholder('775').click();
  await page.getByPlaceholder('775').press('ControlOrMeta+a');
  await page.getByPlaceholder('775').fill('755');
  await page.getByRole('button', { name: 'Confirm' }).click();
		await expect(page.locator('body')).toContainText(/Permissions changed/i);
		await expect(page.locator('body')).toContainText(/-rwxr-xr-x/i);
		
  await page.getByRole('button', { name: ' Select all' }).click();
  await page.getByRole('button', { name: ' Delete' }).click();
  await page.getByText('Skip the trash and').click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
		await expect(page.locator('body')).toContainText(/No items found/i);

});
