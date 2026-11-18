import { test, expect, type Page } from '@playwright/test';
import net from 'net';

// Services > FTP > Settings saves vsftpd.conf and reloads the server, a new banner is what clients see on connect

const host = new URL(process.env.BASE_URL!).hostname;

function banner(): Promise<string> {
  return new Promise((resolve, reject) => {
    const s = net.connect(21, host);
    let data = '';
    s.setTimeout(10_000, () => { s.destroy(); reject(new Error('no FTP greeting')); });
    s.on('data', d => { data += d.toString(); if (data.includes('\n')) { s.end(); resolve(data.split('\n')[0].trim()); } });
    s.on('error', reject);
  });
}

async function save(page: Page, content: string) {
  await page.goto('/services/ftp/settings');
  await page.locator('textarea[name="config_content"]').fill(content);
  await page.locator('form button[type="submit"]').last().click();
  await expect(page.getByText('Config updated successfully. FTP server reloaded to apply changes.')).toBeVisible({ timeout: 60_000 });
}

test('a changed banner is what FTP clients see', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/services/ftp/settings');
  const original = await page.locator('textarea[name="config_content"]').inputValue();
  test.skip(!original.trim(), 'no vsftpd.conf');
  const text = `PW FTP ${Date.now() % 100000}`;
  const changed = /^ftpd_banner=.*$/m.test(original)
    ? original.replace(/^ftpd_banner=.*$/m, `ftpd_banner=${text}`)
    : `${original.trimEnd()}\nftpd_banner=${text}\n`;
  try {
    await save(page, changed);
    await expect.poll(() => banner().catch(() => ''), { timeout: 60_000 }).toBe(`220 ${text}`);
  } finally {
    await save(page, original);
  }
  await expect.poll(() => banner().catch(() => ''), { timeout: 60_000 }).not.toContain(text);
});
