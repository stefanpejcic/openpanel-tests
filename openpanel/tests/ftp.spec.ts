import { test, expect } from '@playwright/test';
import * as ftp from 'basic-ftp';
import { Readable, Writable } from 'stream';

const FTP_USER = 'ftp';
const FTP_PASS = 'b&tK3C9+cncXl%Ut';
const FTP_PATH = '/var/www/html/files.tests.openpanel.org';

let ftpHost: string;

test('create FTP account and verify FTP server info', async ({ page }) => {
  await page.goto('/ftp/new');
  await expect(page.getByRole('heading', { name: 'New FTP Account' })).toBeVisible();
  await page.locator('#new_ftp_username').fill(FTP_USER);
  await page.locator('#password').fill(FTP_PASS);
  await page.locator('#new_user_path').fill(FTP_PATH);
  await page.getByRole('button', { name: /Create Account/i }).click();
  await expect(page.getByText(/created successfully/i)).toBeVisible();

  const row = page.locator('tbody tr').filter({ hasText: `${FTP_USER}.testinguser` });
  await expect(row).toBeVisible();
  await expect(row).toContainText(`${FTP_USER}.testinguser`);
  await expect(row).toContainText(FTP_PATH);

  ftpHost = (await page.locator('#ftp_server_address').textContent())?.trim() ?? '';
  const ftpPort = (await page.locator('#ftp_server_port').textContent())?.trim();
  expect(ftpHost).toBeTruthy();
  expect(ftpPort).toBe('21');

  console.log(`Account created, logins:`);
  console.log(`USERNAME: ${FTP_USER}.testinguser`);
  console.log(`PASSWORD: ${FTP_PASS}`);
  console.log(`SERVER:   ${ftpHost}`);
  console.log(`PORT:     ${ftpPort}`);
});

test('FTP login, upload, list, download, delete', async ({ page }) => {
  if (!ftpHost) {
    await page.goto('/ftp');
    ftpHost = (await page.locator('#ftp_server_address').textContent())?.trim() ?? '';
  }
  expect(ftpHost).toBeTruthy();

  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    await client.access({
      host: ftpHost,
      port: 21,
      user: `${FTP_USER}.testinguser`,
      password: FTP_PASS,
      secure: false,
    });

    // Upload
    const testContent = Buffer.from('playwright-ftp-test');
    await client.uploadFrom(Readable.from(testContent), 'pw_test.txt');
    
    // List
    const list = await client.list();
    const found = list.find(f => f.name === 'pw_test.txt');
    expect(found).toBeTruthy();
    expect(found!.size).toBe(testContent.byteLength);
    console.log(`ftp upload is working`);

    // Download
    const chunks: Buffer[] = [];
    const sink = new Writable({write(chunk, _enc, cb) { chunks.push(chunk); cb(); }});
    await client.downloadTo(sink, 'pw_test.txt');
    expect(Buffer.concat(chunks).toString()).toBe('playwright-ftp-test');
    console.log(`ftp download is working`);

    // Delete
    await client.remove('pw_test.txt');
    const listAfter = await client.list();
    expect(listAfter.find(f => f.name === 'pw_test.txt')).toBeUndefined();
    console.log(`ftp delete is working`);

  } finally {
    client.close();
  }
});
