import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

let createdBackup = '';

test('backup wizard page loads', async ({ page }) => {
  await page.goto('/backup-wizard');
  await expect(page).toHaveURL(/backup-wizard/);
  await expect(page.locator('#generate-backup-btn')).toBeVisible();

  const res = await page.request.get('/backup-wizard/status');
  expect(res.ok()).toBeTruthy();
  const status = await res.json();
  expect(status).toHaveProperty('in_progress');
  expect(Array.isArray(status.backups) || status.backups === null).toBeTruthy();
  console.log('backup wizard page accessible');
});

test('generate full account backup', async ({ page }) => {
  test.setTimeout(20 * 60 * 1000);

  await page.goto('/backup-wizard');
  const before = await (await page.request.get('/backup-wizard/status')).json();
  const beforeNames = new Set((before.backups || []).map((b: any) => b.name));

  await page.locator('#generate-backup-btn').click();
  await expect(page.getByText(/Backup started|already in progress/i).first()).toBeVisible({ timeout: 30000 });

  // wait for the backup process to exit and a new finished archive to show up
  await expect.poll(async () => {
    const s = await (await page.request.get('/backup-wizard/status')).json();
    if (s.in_progress) return '';
    const fresh = (s.backups || []).find((b: any) => !beforeNames.has(b.name) && !b.in_progress);
    return fresh ? fresh.name : '';
  }, { timeout: 19 * 60 * 1000, intervals: [10000] }).not.toBe('');

  const s = await (await page.request.get('/backup-wizard/status')).json();
  const fresh = s.backups.find((b: any) => !beforeNames.has(b.name) && !b.in_progress);
  expect(fresh.size_raw).toBeGreaterThan(0);
  createdBackup = fresh.name;
  console.log(`backup created: ${createdBackup} (${fresh.size})`);
});

test('download backup', async ({ page }) => {
  test.skip(!createdBackup, 'no backup was created');

  await page.goto('/backup-wizard');
  await expect(page.locator(`a[href="/backup-wizard/download/${createdBackup}"]`)).toBeVisible();

  // HEAD so we don't pull the whole archive into memory
  const res = await page.request.fetch(`/backup-wizard/download/${createdBackup}`, { method: 'HEAD' });
  expect(res.status()).toBe(200);
  console.log('backup download is working');
});

test('download rejects path traversal', async ({ page }) => {
  const res = await page.request.get('/backup-wizard/download/..%2F..%2Fetc%2Fpasswd', { maxRedirects: 0 });
  expect(res.status()).not.toBe(200);
});
