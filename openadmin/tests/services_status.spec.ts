import { test, expect } from '@playwright/test';

test('services page lists services with search and edit-services link', async ({ page }) => {
  await page.goto('/services');
  await expect(page).toHaveURL(/\/services\/?$/);

  await expect(page.locator('#exiting_users')).toBeVisible();
  await expect(page.locator('#tour-edit-services-btn')).toHaveAttribute('href', '/services/edit');

  console.log('services page loaded with table and edit link');
});

test('search filters the services table', async ({ page }) => {
  await page.goto('/services');

  const rows = page.locator('#exiting_users tbody tr:not([data-cluster-node])');
  const count = await rows.count();
  test.skip(count === 0, 'No services detected on this environment');

  const fullName = (await rows.first().locator('td').nth(1).innerText()).trim();
  const firstName = fullName.split(/\s+/)[0];
  await page.locator('input[x-model="searchQuery"]').fill(firstName);
  await page.waitForTimeout(150);

  await expect(rows.filter({ hasText: firstName }).first()).toBeVisible();

  console.log(`search filtered services table to "${firstName}"`);
});

test('each service row exposes start/stop and restart actions', async ({ page }) => {
  await page.goto('/services');

  const table = page.locator('#exiting_users');
  const headers = table.locator('thead th');
  const headerTexts = await headers.allInnerTexts();
  const realNameIdx = headerTexts.findIndex(h => h.trim() === 'Real Name');
  // a cluster master shows one row per service with a column per server, the real name sits under the service name
  const pivot = realNameIdx < 0;

  const rows = table.locator('tbody tr');
  const count = await rows.count();

  test.skip(count === 0, 'No services detected on this environment');

  let foundAtLeastOne = false;

  for (let i = 0; i < count; i++) {
    const row = rows.nth(i);

    const realName = pivot
      ? ((await row.locator('td span.block.text-xs').first().innerText().catch(() => '')).split('·')[0] || '').trim()
      : (await row.locator('td').nth(realNameIdx).innerText()).trim();
    if (!realName) continue;

    const startBtn = row.getByRole('button', { name: new RegExp(`Start ${realName}`, 'i') });
    const stopBtn = row.getByRole('button', { name: new RegExp(`Stop ${realName}`, 'i') });
    const restartBtn = row.getByRole('button', { name: new RegExp(`^Restart ${realName}$`, 'i') });

    const hasStartOrStop =
      (await startBtn.count()) > 0 || (await stopBtn.count()) > 0;

    if (hasStartOrStop) {
      if (pivot) {
        expect(await restartBtn.count()).toBeGreaterThanOrEqual(1);
      } else {
        await expect(restartBtn).toHaveCount(1);
      }
      foundAtLeastOne = true;
    }
  }

  expect(foundAtLeastOne).toBeTruthy();
  console.log('verified start/stop and restart action buttons are present for services');
});

test('monitored services link to notifications settings', async ({ page }) => {
  await page.goto('/services');

  const monitoredLink = page.locator('a[href="/settings/notifications#services"]').first();
  const hasMonitored = (await monitoredLink.count()) > 0;
  test.skip(!hasMonitored, 'No monitored services detected on this environment');

  await expect(monitoredLink).toHaveText('Monitored');
  console.log('monitored service links to notifications settings');
});

// stopping a service through its row really stops it and starting brings it back, FTP is used since nothing else depends on it
test('stop and start a service from its row', async ({ page }) => {
  test.setTimeout(300_000);
  const name = 'openadmin_ftp';
  const row = () => page.locator('#exiting_users tbody tr:not([data-cluster-node])').filter({ has: page.getByRole('button', { name: new RegExp(`(Start|Stop) ${name}$`, 'i') }) }).first();
  await page.goto('/services');
  test.skip(await row().count() === 0, 'no FTP service row');
  const act = async (verb: 'Stop' | 'Start') => {
    await page.goto('/services');
    await row().getByRole('button', { name: new RegExp(`^${verb} ${name}$`, 'i') }).first().click();
    const ok = page.locator('[role="alertdialog"] [data-act="ok"], [role="dialog"] [data-act="ok"]');
    if (await ok.isVisible().catch(() => false)) await ok.click();
    await expect(async () => {
      await page.goto('/services');
      await expect(row().getByRole('button', { name: new RegExp(`^${verb === 'Stop' ? 'Start' : 'Stop'} ${name}$`, 'i') }).first()).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 180_000 });
  };
  const wasRunning = await row().getByRole('button', { name: new RegExp(`^Stop ${name}$`, 'i') }).count() > 0;
  try {
    if (wasRunning) { await act('Stop'); await act('Start'); }
    else { await act('Start'); await act('Stop'); }
  } finally {
    const running = await row().getByRole('button', { name: new RegExp(`^Stop ${name}$`, 'i') }).count() > 0;
    if (running !== wasRunning) await act(wasRunning ? 'Start' : 'Stop');
  }
});

// Edit services is the list the status page shows, an added entry becomes a row
test('a service added in Edit services shows on the status page', async ({ page }) => {
  await page.goto('/services/edit');
  const field = page.locator('textarea[name="data"]');
  const original = await field.inputValue();
  const list = JSON.parse(original);
  const label = `PW service ${Date.now() % 100000}`;
  const copy = Array.isArray(list) ? { ...list[0], name: label } : null;
  test.skip(!copy, 'services.json is not a list');
  const save = async (text: string) => {
    await page.goto('/services/edit');
    await page.locator('textarea[name="data"]').fill(text);
    await page.locator('form button[type="submit"]').last().click();
    await expect(page.getByText('Config file updated successfully.')).toBeVisible();
  };
  try {
    await save(JSON.stringify([...list, copy], null, 2));
    await page.goto('/services');
    await expect(page.locator('#exiting_users')).toContainText(label);
  } finally {
    await save(original);
  }
  await page.goto('/services');
  await expect(page.locator('#exiting_users')).not.toContainText(label);
});
