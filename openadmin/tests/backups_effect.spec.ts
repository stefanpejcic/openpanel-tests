import { test, expect, type Page } from '@playwright/test';
import { createUser, deleteUser, loginAsUser } from '../op-settings';

// Backups: a system backup run adds an archive and deleting it removes it, the user backup schedule is what the
// crontab gets, and an account made while backups are admin run shows them as managed by the administrator

const stamp = Date.now() % 100000;
const NEW_USER = `pwbak${stamp}`;

const archives = (page: Page) => page.locator('button[onclick^="backupsDelete"]');

async function confirmDialog(page: Page) {
  const ok = page.getByRole('alertdialog').or(page.getByRole('dialog')).getByRole('button', { name: /continue|run|delete/i }).first();
  await ok.click();
}

async function schedule(page: Page): Promise<string> {
  await page.goto('/backups/user');
  return page.locator('select[name="schedule_choice"]').inputValue();
}

async function setSchedule(page: Page, choice: string) {
  await page.goto('/backups/user');
  await page.locator('select[name="schedule_choice"]').selectOption(choice);
  await page.locator('form[action="/backups/user/settings"] button[type="submit"]').first().click();
  await expect(page.getByText(/^Saved\./).first()).toBeVisible({ timeout: 30_000 });
}

test.afterAll(async ({ browser }, testInfo) => {
  const ctx = await browser.newContext(testInfo.project.use as any);
  await deleteUser(await ctx.newPage(), NEW_USER);
  await ctx.close();
});

test('a system backup run adds an archive and delete removes it', async ({ page }) => {
  test.setTimeout(600_000);
  await page.goto('/backups/system');
  const before = await archives(page).count();
  await page.getByRole('button', { name: /run backup now/i }).first().click();
  await confirmDialog(page);
  await expect(async () => {
    await page.goto('/backups/system');
    expect(await archives(page).count()).toBe(before + 1);
  }).toPass({ timeout: 480_000, intervals: [10_000] });

  // the newest is first
  await archives(page).first().click();
  await confirmDialog(page);
  await expect(async () => {
    await page.goto('/backups/system');
    expect(await archives(page).count()).toBe(before);
  }).toPass({ timeout: 120_000 });
});

test('the user backup schedule is what the crontab gets', async ({ page }) => {
  const original = await schedule(page);
  try {
    for (const choice of ['daily', 'weekly', 'monthly', 'disabled']) {
      await setSchedule(page, choice);
      // the page reads the choice back from the docker-backup cron entry
      expect(await schedule(page), choice).toBe(choice);
    }
  } finally {
    await setSchedule(page, original);
  }
});

test('an account made while backups are admin run has them managed by the administrator', async ({ page, browser }, testInfo) => {
  test.setTimeout(480_000);
  const original = await schedule(page);
  try {
    await setSchedule(page, 'daily');
    await createUser(page, NEW_USER);
    const user = await loginAsUser(browser, testInfo, NEW_USER);
    await user.goto('/backups');
    await expect(user.getByText('Backups are managed by your administrator')).toBeVisible();
    await user.context().close();
  } finally {
    await setSchedule(page, original);
  }
});
