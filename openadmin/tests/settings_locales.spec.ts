import { test, expect } from '@playwright/test';

test('locales page loads with table', async ({ page }) => {
  await page.goto('/settings/locales');
  await expect(page).toHaveURL(/settings\/locales/);
  await expect(page.locator('#tour-locales-table')).toBeVisible();

  console.log('locales page loaded');
});

test('search filters the locales table', async ({ page }) => {
  await page.goto('/settings/locales');

  const rows = page.locator('#tour-locales-table tbody tr');
  const count = await rows.count();
  test.skip(count === 0, 'No locales available on this environment');

  const firstLocale = (await rows.first().locator('td').nth(1).innerText()).trim();
  await page.locator('input[x-model="searchQuery"]').fill(firstLocale);
  await page.waitForTimeout(150);

  await expect(rows.filter({ hasText: firstLocale })).toBeVisible();
  console.log(`search filtered locales table to "${firstLocale}"`);
});

test('set a different installed locale as default, then revert', async ({ page }) => {
  await page.goto('/settings/locales');

  const setDefaultButtons = page.getByRole('button', { name: 'Set as Default' });
  const count = await setDefaultButtons.count();
  test.skip(count === 0, 'Only one (or zero) installed locale available, nothing to switch between');

  const currentDefaultRow = page.locator('#tour-locales-table tbody tr').filter({ hasText: 'Default' }).first();
  const currentDefaultLocale = (await currentDefaultRow.locator('td').nth(1).innerText()).trim();

  await setDefaultButtons.first().click();
  await page.waitForLoadState();

  // switch back to the original default
  const restoreButton = page.locator('#tour-locales-table tbody tr')
    .filter({ hasText: currentDefaultLocale })
    .getByRole('button', { name: 'Set as Default' });
  await expect(restoreButton).toBeVisible();
  await restoreButton.click();
  await page.waitForLoadState();

  await expect(
    page.locator('#tour-locales-table tbody tr').filter({ hasText: currentDefaultLocale }).getByText('Default')
  ).toBeVisible();

  console.log(`switched default locale away from "${currentDefaultLocale}" and back`);
});

test('install button present for non-installed locales (not clicked)', async ({ page }) => {
  // NOTE: verify-only -- installing a locale is a real, possibly slow package operation;
  // we don't want every test run to install/download locale files on the host.
  await page.goto('/settings/locales');

  const installButtons = page.getByRole('button', { name: /Install/ });
  const count = await installButtons.count();
  test.skip(count === 0, 'All locales already installed on this environment');

  await expect(installButtons.first()).toBeVisible();
  console.log(`found ${count} not-yet-installed locales with an Install action`);
});
