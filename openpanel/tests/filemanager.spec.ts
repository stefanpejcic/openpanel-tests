import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'https://185.193.66.252:2083';

const USER = {
  username: 'testinguser',
  password: 'testingpassword',
};

const FILES = {
  fileName: 'radovanfajl',
  folderName: 'radovanfolder',
  editorFile: 'petarfajl.txt',
  editorContent: 'nekitext',
  editorContentUpdated: 'nekitext2',
};

// ---------------- HELPERS ----------------

async function login(page: any) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByRole('textbox', { name: 'Username' }).fill(USER.username);
  await page.getByRole('textbox', { name: 'Password' }).fill(USER.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
}

async function openFileManager(page: any) {
  await page.goto(`${BASE_URL}/files`);
}

async function createFile(page: any, name: string) {
  await page.getByRole('button', { name: ' New File' }).click();
  await page.getByRole('textbox', { name: 'File Name*' }).fill(name);
  await page.getByRole('button', { name: 'Create' }).click();
}

async function createFolder(page: any, name: string) {
  await page.getByRole('button', { name: ' New Folder' }).click();
  await page.locator('#foldername').fill(name);
  await page.getByRole('button', { name: 'Create' }).click();
}

async function selectFile(page: any, name: string) {
  await page.locator('#filemanager_table div').filter({ hasText: name }).click();
}

async function copyFile(page: any, file: string, targetFolder: string) {
  await selectFile(page, file);
  await page.getByRole('button', { name: ' Copy' }).click();
  await page.locator('#copyfiletree').getByText(targetFolder).click();
  await page.getByRole('button', { name: 'Copy', exact: true }).click();
}

async function moveFileToRoot(page: any, file: string) {
  await selectFile(page, file);
  await page.getByRole('button', { name: ' Move' }).click();
  await page.getByRole('textbox', { name: 'Where to:*' }).fill('/');
  await page.getByRole('button', { name: 'Move', exact: true }).click();
}

async function deleteSelected(page: any) {
  await page.getByRole('button', { name: ' Delete' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
}

async function restoreFromTrash(page: any, file: string) {
  await page.getByRole('link', { name: 'Trash' }).click();
  await selectFile(page, file);
  await page.getByRole('button', { name: ' Restore' }).click();
  await page.getByRole('button', { name: 'Restore', exact: true }).click();
}

async function openEditorAndSave(page: any, content: string) {
  await page.locator('.view-lines').click();
  await page.getByRole('textbox', { name: 'Editor content;Press Alt+F1' }).fill(content);
  await page.getByRole('button', { name: 'Save' }).click();
}

// ---------------- TESTS ----------------

test('file and folder lifecycle (create, copy, move, delete, restore)', async ({ page }) => {
  test.setTimeout(180_000);

  await login(page);

  // Create file + folder
  await createFile(page, FILES.fileName);
  await expect(page.locator('body')).toContainText(/File created successfully/i);

  await createFolder(page, FILES.folderName);
  await expect(page.locator('body')).toContainText(/Folder created successfully/i);

  // Copy file into folder
  await copyFile(page, FILES.fileName, FILES.folderName);
  await expect(page.locator('body')).toContainText(/Copy complete/i);

  // Verify inside folder
  await page.getByRole('link', { name: FILES.folderName }).click();
  await expect(page.locator('body')).toContainText(FILES.fileName);

  // Move file to root
  await moveFileToRoot(page, FILES.fileName);
  await expect(page.locator('body')).toContainText(/Move complete/i);

  // Verify removed from folder
  await page.getByRole('link', { name: 'File Manager' }).click();
  await expect(page.locator('body')).not.toContainText(FILES.fileName);

  // Delete file
  await selectFile(page, FILES.fileName);
  await deleteSelected(page);
  await expect(page.locator('body')).not.toContainText(FILES.fileName);

  // Restore file
  await restoreFromTrash(page, FILES.fileName);
  await expect(page.locator('body')).toContainText(FILES.fileName);
});

test('file editor, view, edit, rename and permissions', async ({ page }) => {
  test.setTimeout(180_000);

  await login(page);
  await openFileManager(page);

  // Create editable file
  await createFile(page, FILES.editorFile);
  await page.locator('#open').check();

  await openEditorAndSave(page, FILES.editorContent);
  await expect(page.locator('body')).toContainText(/File saved successfully/i);

  // View file
  await selectFile(page, FILES.editorFile);
  const viewPage = await page.waitForEvent('popup');
  await page.getByRole('button', { name: ' View' }).click();
  await expect(viewPage.locator('body')).toContainText(FILES.editorContent);

  // Edit file
  const editPage = await page.waitForEvent('popup');
  await page.getByRole('button', { name: ' Edit' }).click();
  await expect(editPage.locator('body')).toContainText(FILES.editorContent);

  await editPage.getByRole('textbox', { name: 'Editor content;Press Alt+F1' }).fill(FILES.editorContentUpdated);
  await editPage.getByRole('button', { name: 'Save' }).click();

  // Verify updated content
  const viewPage2 = await page.waitForEvent('popup');
  await page.getByRole('button', { name: ' View' }).click();
  await expect(viewPage2.locator('body')).toContainText(FILES.editorContentUpdated);

  // Rename file
  await page.getByRole('button', { name: ' Rename' }).click();
  await page.locator('#renameInput').fill(`${FILES.editorFile}_bak`);
  await page.getByRole('button', { name: 'Rename', exact: true }).click();

  await expect(page.locator('body')).toContainText(/File renamed successfully/i);

  // Permissions
  await selectFile(page, `${FILES.editorFile}_bak`);
  await page.getByRole('button', { name: ' Permissions' }).click();

  await page.getByPlaceholder('775').fill('755');
  await page.getByRole('button', { name: 'Confirm' }).click();

  await expect(page.locator('body')).toContainText(/Permissions changed/i);

  // Cleanup: delete everything
  await page.getByRole('button', { name: ' Delete' }).click();
  await page.getByText('Skip the trash and').click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();

  await expect(page.locator('body')).toContainText(/No items found/i);
});
