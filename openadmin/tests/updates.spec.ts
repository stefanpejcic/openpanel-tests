import { test, expect } from '@playwright/test';

test('check updates page', async ({ page, context }) => {
  await page.goto('/settings/updates');
  await expect(page).toHaveURL(/settings\/updates/);

  const versionEl = page.locator('#installed_version');
  await expect(versionEl).toBeVisible();
  const versionText = await versionEl.textContent();
  const version = versionText?.match(/(\d+\.\d+\.\d+)/)?.[1];
  expect(version).toBeTruthy();

  const listbox = page.getByRole('listbox');
  await expect(listbox).toBeVisible();

  // options are populated asynchronously via fetchTags(), so wait for them
  await expect(listbox.locator('option').first()).toBeAttached({ timeout: 10_000 });

  const options = await listbox.locator('option').allTextContents();
  expect(options.length).toBeGreaterThan(0);

  const toNum = (v: string) => v.split('.').map(Number);
  const [maj, min, pat] = toNum(version!);

  for (const opt of options) {
    const match = opt.match(/(\d+\.\d+\.\d+)/);
    if (!match) continue;
    const [oMaj, oMin, oPat] = toNum(match[1]);
    const isOlder =
      oMaj < maj ||
      (oMaj === maj && oMin < min) ||
      (oMaj === maj && oMin === min && oPat < pat);
    expect(isOlder, `${match[1]} should be older than ${version}`).toBe(true);
  }

  const firstOlderVersion = options[0].match(/(\d+\.\d+\.\d+)/)?.[1];
  if (firstOlderVersion) {
    await listbox.selectOption(firstOlderVersion);
  }
});
  

// every preference is saved, then the one the server had is put back, test servers keep auto updates off
test('update preferences are saved and the original is put back', async ({ page }) => {
  await page.goto('/settings/updates');
  const combobox = page.locator('select[name="preference"]');
  const saveBtn = page.getByRole('button', { name: 'Save' });
  const original = await combobox.inputValue();

  try {
    for (const option of ['major_only', 'minor_only', 'none', 'minor_and_major']) {
      await combobox.selectOption(option);
      await saveBtn.click();
      await expect(page.getByText(/saved successfully/i)).toBeVisible();
      await page.reload();
      await expect(combobox).toHaveValue(option);
    }
  } finally {
    await combobox.selectOption(original);
    await saveBtn.click();
    await expect(page.getByText(/saved successfully/i)).toBeVisible();
  }
  await page.reload();
  await expect(combobox).toHaveValue(original);
});

// it replaces the running build, so only where that's wanted
test('update now starts the update and writes its log', async ({ page }) => {
  test.skip(process.env.OPENADMIN_TEST_UPDATE_NOW !== '1', 'set OPENADMIN_TEST_UPDATE_NOW=1, it updates the server');
  test.setTimeout(900_000);
  await page.goto('/settings/updates');
  await page.getByRole('button', { name: /update now/i }).click();
  const ok = page.getByRole('alertdialog').getByRole('button').filter({ hasText: /update|continue/i });
  if (await ok.isVisible().catch(() => false)) await ok.click();
  await expect(page.getByText('Update process started successfully.', { exact: false })).toBeVisible({ timeout: 60_000 });
});

test('check changelog link', async ({ page, context }) => {
  await page.goto('/settings/updates');
  await expect(page).toHaveURL(/settings\/updates/);

  const versionEl = page.locator('#latest_version');
  await expect(versionEl).toBeVisible();
  const versionText = await versionEl.textContent();
  const version = versionText?.match(/(\d+\.\d+\.\d+)/)?.[1];
  expect(version).toBeTruthy();

  const [newPage] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('link', { name: 'View Changelog' }).click(),
  ]);

  await newPage.waitForLoadState();

  // https://openpanel.com/docs/changelog/1.7.55/
  expect(newPage.url()).toMatch(
    new RegExp(`openpanel\\.com/docs/changelog/${version}`)
  );
});



//
