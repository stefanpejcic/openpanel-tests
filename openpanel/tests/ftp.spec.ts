import { test, expect, Page } from '@playwright/test';

const FTP_USERNAME = 'ftp';
const FTP_PASSWORD = 'b&tK3C9+cncXl%Ut';
const FTP_PATH = '/var/www/html/files.tests.openpanel.org';

async function getFTPCount(page: Page): Promise<number> {
  const text = await page.locator('#dashboard_usage_ftp').locator('p').nth(1).textContent();
  if (!text) throw new Error('Cannot read FTP count');
  const match = text.match(/(\d+)\s*\//);
  if (!match) throw new Error(`Cannot parse FTP count from: ${text}`);
  return parseInt(match[1], 10);
}

test('create FTP account', async ({ page }) => {
  await page.goto('/dashboard');
  const initialCount = await getFTPCount(page);
  const expectedCount = initialCount + 1;

  await page.goto('/ftp/new');
  await expect(page.getByRole('heading', { name: 'New FTP Account' })).toBeVisible();
  await page.locator('#new_ftp_username').fill(FTP_USERNAME);
  await page.locator('#password').fill(FTP_PASSWORD);
  await page.locator('#new_user_path').fill(FTP_PATH);
  await page.getByRole('button', { name: /Create Account/i }).click();

  await expect(page.getByText(/created successfully/i)).toBeVisible();

  const row = page.locator('tbody tr').filter({ hasText: `${FTP_USERNAME}.testinguser` });
  await expect(row).toBeVisible();
  await expect(row).toContainText(`${FTP_USERNAME}.testinguser`);
  await expect(row).toContainText(FTP_PATH);

  await expect.poll(
    async () => {
      await page.goto('/dashboard');
      return getFTPCount(page);
    },
    { timeout: 15000, intervals: [2000] }
  ).toBe(expectedCount);
});

test('verify FTP connection via ftptest.net', async ({ page }) => {
  // TODO: fill in server hostname/IP
  const FTP_HOST = 'your.server.hostname';

  await page.goto('https://ftptest.net/');
  await page.locator('input[name="host"]').fill(FTP_HOST);
  await page.locator('input[name="username"]').fill(`${FTP_USERNAME}.testinguser`);
  await page.locator('input[name="password"]').fill(FTP_PASSWORD);
  await page.locator('input[name="dir"]').fill(FTP_PATH);
  await page.getByRole('button', { name: /test/i }).click();

  await expect(page.getByText(/success/i)).toBeVisible({ timeout: 30000 });
});
