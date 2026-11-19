import { test, expect } from '@playwright/test';

test('manage crons', async ({ page }) => {
  // two saves (each a POST and a page reload) for every cron job, ~23 on a default install
  test.setTimeout(5 * 60_000);
  await page.goto('/server/crons');
  await expect(page).toHaveURL(/server\/crons/);

  const saveButton = page.getByRole('button', { name: /save/i });
  const successToast = page.getByText('Cron jobs updated successfully');

  // the previous save's toast is still up when the next one is clicked, so waiting for it alone reads
  // the inputs mid-reload; mark the current document and wait until a new one has loaded
  const save = async () => {
    await page.evaluate(() => { (window as any).__beforeSave = true; });
    await saveButton.click();
    await page.waitForFunction(() => !(window as any).__beforeSave && document.readyState === 'complete');
    await expect(successToast).toBeVisible();
  };

  const rows = page.locator('tbody tr').filter({
    has: page.locator('input[name$="_schedule_0"]'),
    });
  const rowCount = await rows.count();

  const nextValue = (val: string) => {
    if (val === '*') return '1';
    if (val.startsWith('*/')) return `*/${parseInt(val.slice(2)) + 1}`;
    if (/^\d+$/.test(val)) return String(Number(val) + 1);
    return '1';
  };

  for (let i = 0; i < rowCount; i++) {
    const row = rows.nth(i);

    const firstInput = row.locator('input[name$="_schedule_0"]');

    const originalValue = await firstInput.inputValue();
    const updatedValue = nextValue(originalValue);

    // EDIT
    await firstInput.fill(updatedValue);
    await save();
    await expect(firstInput).toHaveValue(updatedValue);

    // REVERT
    await firstInput.fill(originalValue);
    await save();
    await expect(firstInput).toHaveValue(originalValue);
  }
});

test('every job carries its command so a save edits the right line', async ({ page }) => {
  await page.goto('/server/crons');
  const rows = page.locator('#crons_table tbody tr[id]');
  test.skip(await rows.count() === 0, 'no cron jobs on this server');

  for (const row of await rows.all()) {
    const line = await row.getAttribute('id');
    const command = await row.locator(`input[name="${line}_command"]`).inputValue();
    expect(command.trim()).not.toBe('');
    await expect(row).toContainText(command.trim().split(/\s+/).slice(0, 2).join(' '));
  }
});

// the switch adds or comments out the "echo cron executed" part of the line, docker-backup is used since it never runs (31 Feb)
test('logging on a job can be turned off and back on', async ({ page }) => {
  await page.goto('/server/crons');
  const row = page.locator('#crons_table tbody tr[id]', { has: page.locator('input[name$="_command"][value*="docker-backup"]') });
  test.skip(await row.count() === 0, 'no docker-backup cron job');
  const box = row.locator('input[name$="_logging"]');
  const was = await box.isChecked();
  const set = async (on: boolean) => {
    await page.goto('/server/crons');
    await box.setChecked(on, { force: true });
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.getByText('Cron jobs updated successfully')).toBeVisible({ timeout: 30_000 });
    await page.goto('/server/crons');
    await expect(box).toBeChecked({ checked: on });
  };
  try {
    await set(!was);
  } finally {
    await set(was);
  }
});
