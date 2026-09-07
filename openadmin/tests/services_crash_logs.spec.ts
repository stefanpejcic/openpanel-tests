import { test, expect } from '@playwright/test';

// NOTE: verify-only for Delete -- unlike the main log viewer's DELETE (which
// truncates a file to 0 bytes), this page's Delete genuinely removes the
// crash log file from disk. Download is also not clicked, matching
// services_logs.spec.ts's own precedent for that button.

test('crash logs viewer loads with a log selector', async ({ page }) => {
  await page.goto('/services/crashlogs/log/');
  await expect(page).toHaveURL(/services\/crashlogs\/log/);

  await expect(page.getByRole('heading', { name: 'Crash Logs Viewer' })).toBeVisible();
  await expect(page.locator('#log-select')).toBeVisible();
  await expect(page.locator('#log-content')).toHaveText('Select a log file to view its content here.');

  console.log('crash logs viewer page loaded with log selector');
});

test('selecting a crash log loads its content and reveals download/delete buttons', async ({ page }) => {
  await page.goto('/services/crashlogs/log/');

  const select = page.locator('#log-select');
  const options = select.locator('option:not([disabled])');
  const count = await options.count();
  test.skip(count === 0, 'No crash log files present on this environment');

  const firstValue = await options.first().getAttribute('value');
  await select.selectOption(firstValue!);

  await expect(page.locator('#log-content')).not.toHaveText('Select a log file to view its content here.', { timeout: 10_000 });
  await expect(page.locator('#download-btn')).toBeVisible();
  await expect(page.locator('#truncate-btn')).toBeVisible();

  console.log(`loaded crash log content for "${firstValue}", download/delete buttons revealed`);
});

test('selecting a crash log via ?log_name= query param preselects and loads it', async ({ page }) => {
  const select = page.locator('#log-select');

  await page.goto('/services/crashlogs/log/');
  const options = select.locator('option:not([disabled])');
  const count = await options.count();
  test.skip(count === 0, 'No crash log files present on this environment');
  const firstValue = await options.first().getAttribute('value');

  await page.goto(`/services/crashlogs/log/?log_name=${encodeURIComponent(firstValue!)}`);
  await expect(select).toHaveValue(firstValue!);
  await expect(page.locator('#log-content')).not.toHaveText('Select a log file to view its content here.', { timeout: 10_000 });

  console.log(`?log_name= preselected and loaded "${firstValue}"`);
});
