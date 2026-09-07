import { test, expect } from '@playwright/test';

// NOTE: verify-only for "Generate Backup" -- it shells out to `opencli
// user-backup --account <username>` for real (a slow, disk-heavy full
// account archive), and "Delete"/"Download" act on whatever real backups
// exist, so none of those are clicked. The transfer form is also never
// submitted (it SSHes the whole account to a remote server). This tab only
// renders on an Enterprise license, so every test here skips gracefully
// when it's absent.

test('export tab (Enterprise only) offers backup and transfer modes', async ({ page }) => {
  await page.goto('/users/testinguser');
  await expect(page).toHaveURL(/users\/testinguser/);

  const nav = page.getByRole('navigation', { name: 'core navigation links' });
  const exportLink = nav.getByText('Export', { exact: true });
  const hasExportTab = (await exportLink.count()) > 0;
  test.skip(!hasExportTab, 'Export tab not present (non-Enterprise license, or testinguser missing)');

  await exportLink.click();
  await expect(page).toHaveURL(/#export/);
  await expect(page.getByRole('button', { name: 'Generate full account backup' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Transfer to another server' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Generate full account backup' })).toBeVisible();

  console.log('export tab loaded with backup/transfer mode toggle');
});

test('backup mode shows existing backups or the empty state, without generating one', async ({ page }) => {
  await page.goto('/users/testinguser#export');

  const generateBtn = page.getByRole('button', { name: /Generate Backup|Backup in progress/ });
  const hasExportTab = (await generateBtn.count()) > 0;
  test.skip(!hasExportTab, 'Export tab not present (non-Enterprise license, or testinguser missing)');

  await expect(generateBtn).toBeVisible({ timeout: 10_000 });

  const emptyState = page.getByText('No backups found. Generate the first one above.');
  const table = page.locator('table').filter({ hasText: 'Filename' });

  const hasBackups = await table.isVisible().catch(() => false);
  if (!hasBackups) {
    await expect(emptyState).toBeVisible();
    console.log('backup mode shows empty state (no backups generated yet)');
    return;
  }

  await expect(table.getByRole('columnheader', { name: 'Actions' })).toBeVisible();
  console.log('backup mode lists existing backup archive(s)');
});

test('transfer mode exposes the SSH transfer form fields', async ({ page }) => {
  await page.goto('/users/testinguser#export');

  const transferModeBtn = page.getByRole('button', { name: 'Transfer to another server' });
  const hasExportTab = (await transferModeBtn.count()) > 0;
  test.skip(!hasExportTab, 'Export tab not present (non-Enterprise license, or testinguser missing)');

  await transferModeBtn.click();

  const form = page.locator('#transfer-form');
  await expect(form).toBeVisible();
  await expect(form.locator('#server')).toBeVisible();
  await expect(form.locator('#port')).toBeVisible();
  await expect(form.locator('#username')).toBeVisible();
  await expect(form).toHaveAttribute('action', '/import/transfer/');

  console.log('transfer mode form fields present, action targets /import/transfer/');
});
