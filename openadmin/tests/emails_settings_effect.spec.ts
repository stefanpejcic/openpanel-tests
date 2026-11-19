import { test, expect, type Page } from '@playwright/test';
import net from 'net';

// Emails > Settings: switching POP3 off restarts the mail server without it, so port 110 stops answering,
// switching it back on opens it again, it ends the way it started

const host = new URL(process.env.BASE_URL!).hostname;

// podman's port forward accepts the connection either way, only a running POP3 sends its +OK greeting
function portOpen(port: number, greeting = '+OK'): Promise<boolean> {
  return new Promise(resolve => {
    const s = net.connect(port, host);
    s.setTimeout(5_000, () => { s.destroy(); resolve(false); });
    s.on('data', d => { s.destroy(); resolve(d.toString().startsWith(greeting)); });
    s.on('close', () => resolve(false));
    s.on('error', () => resolve(false));
  });
}

async function setToggle(page: Page, name: string, on: boolean) {
  await page.goto('/emails/settings');
  const box = page.locator(`input[type="checkbox"][name="${name}"]`);
  await box.setChecked(on, { force: true });
  await box.evaluate(el => (el as HTMLInputElement).form!.requestSubmit());
  await expect(page.getByText(/Configuration updated/)).toBeVisible({ timeout: 60_000 });
}

test('POP3 on and off opens and closes port 110', async ({ page }) => {
  test.setTimeout(600_000);
  await page.goto('/emails/settings');
  const box = page.locator('input[type="checkbox"][name="ENABLE_POP3"]');
  test.skip(await box.count() === 0, 'the mail server is not installed');
  const wasOn = await box.isChecked();
  try {
    await setToggle(page, 'ENABLE_POP3', !wasOn);
    await expect.poll(() => portOpen(110), { timeout: 300_000, intervals: [5_000] }).toBe(!wasOn);
    await setToggle(page, 'ENABLE_POP3', wasOn);
    await expect.poll(() => portOpen(110), { timeout: 300_000, intervals: [5_000] }).toBe(wasOn);
  } finally {
    await page.goto('/emails/settings');
    if (await page.locator('input[type="checkbox"][name="ENABLE_POP3"]').isChecked() !== wasOn) await setToggle(page, 'ENABLE_POP3', wasOn);
  }
});

test('IMAP on and off opens and closes port 143', async ({ page }) => {
  test.setTimeout(600_000);
  await page.goto('/emails/settings');
  const box = page.locator('input[type="checkbox"][name="ENABLE_IMAP"]');
  test.skip(await box.count() === 0, 'the mail server is not installed');
  const wasOn = await box.isChecked();
  try {
    await setToggle(page, 'ENABLE_IMAP', !wasOn);
    await expect.poll(() => portOpen(143, '* OK'), { timeout: 240_000, intervals: [5_000] }).toBe(!wasOn);
    await setToggle(page, 'ENABLE_IMAP', wasOn);
    await expect.poll(() => portOpen(143, '* OK'), { timeout: 240_000, intervals: [5_000] }).toBe(wasOn);
  } finally {
    await page.goto('/emails/settings');
    if (await page.locator('input[type="checkbox"][name="ENABLE_IMAP"]').isChecked() !== wasOn) await setToggle(page, 'ENABLE_IMAP', wasOn);
  }
});
