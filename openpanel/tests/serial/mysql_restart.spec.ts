import { test, expect } from '@playwright/test';

// "2 minutes", "1 hours", "30 seconds" on the services list, in seconds
function uptimeSeconds(text: string): number {
  const m = text.match(/(\d+)\s*(second|minute|hour|day|week)/i);
  if (!m) return NaN;
  const unit: Record<string, number> = { second: 1, minute: 60, hour: 3600, day: 86400, week: 604800 };
  return Number(m[1]) * unit[m[2].toLowerCase()];
}

// restarts the account's mysql/mariadb from the services list, then checks it really started over and the databases page reads from it again
// serial: every database page and app install in the other specs loses its connection while it restarts
test('restart mysql from services', async ({ page }) => {
  test.setTimeout(5 * 60_000);
  let service = '';
  // the list only offers Restart for a running service, /mysql starts a stopped one
  await expect(async () => {
    await page.goto('/services/');
    for (const name of ['mysql', 'mariadb']) {
      if (await page.locator(`form[action="/services/"]:has(input[name="service"][value="${name}"]) button[value="restart"]`).count()) {
        service = name;
        return;
      }
    }
    await page.goto('/mysql');
    throw new Error('no running mysql or mariadb service on /services/ yet');
  }).toPass({ timeout: 120_000, intervals: [5_000] });
  const row = page.locator('tr', { has: page.getByRole('button', { name: `Actions for ${service}`, exact: true }) });
  const before = (await row.innerText()).replace(/\s+/g, ' ').trim();
  console.log(`${service} before: ${before}`);

  await page.getByRole('button', { name: `Actions for ${service}`, exact: true }).click();
  // the row menu can open outside the headless viewport, a DOM click still submits its form with action=restart
  const restart = page.locator(`form[action="/services/"]:has(input[name="service"][value="${service}"]) button[value="restart"]`);
  await expect(restart).toBeVisible();
  await Promise.all([page.waitForLoadState('domcontentloaded'), restart.evaluate((b: HTMLButtonElement) => b.click())]);
  await expect(page.locator('body')).toContainText(new RegExp(`${service} service is now restarted`, 'i'), { timeout: 120_000 });
  console.log(`${service} restarted`);

  // started over: running with an uptime in seconds, and the server accepts connections again
  await expect(async () => {
    await page.goto('/services/');
    const text = (await row.innerText()).replace(/\s+/g, ' ').trim();
    expect(text).toMatch(/running/i);
    // the list counts in whole minutes, started over means less uptime than before (or under a minute)
    const after = uptimeSeconds(text);
    expect(after < 60 || after < uptimeSeconds(before), `uptime didn't start over: ${before} -> ${text}`).toBe(true);
    await page.goto('/mysql');
    await expect(page.locator('body')).toContainText(/total databases:\s*\d+|create your first database/i, { timeout: 10_000 });
    await expect(page.locator('body')).toContainText(/Version:/i, { timeout: 5_000 });
    console.log(`${service} after: ${text}, answering again`);
  }).toPass({ timeout: 90_000, intervals: [3_000] });
});
