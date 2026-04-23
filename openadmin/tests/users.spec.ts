import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'https://185.193.66.252:2087';


async function navigateToUsersPage(page: any) {
  await page.goto(`${BASE_URL}/users`);
  await expect(page).toHaveURL(/users/);
}



test('access users page', async ({ page }) => {
  await navigateToUsersPage(page);
  //await expect(page.locator('body')).toContainText('no users');
  await expect(page.locator('body')).toContainText('create new');
  console.log('Users page is accessible');
});



test('search users', async ({ page }) => {
  await navigateToUsersPage(page);
  await page.getByRole('searchbox', { name: 'Search...' }).fill('testinguser');
  
  const row = page.getByRole('row').filter({ hasText: 'testinguser' });
  await expect(row).toHaveCount(1);
  await expect(row).toHaveText(/testinguser/i);

  console.log('Users search is functional');
});



test('check columns for users', async ({ page }) => {
  await navigateToUsersPage(page);

  await page.getByRole('button', { name: 'Show Columns' }).click();

  const rows = page.locator('ul[aria-labelledby="dropdownToggleButton"] li');

  const count = await rows.count();

  for (let i = 0; i < count; i++) {
    const row = rows.nth(i);

    const checkbox = row.locator('input[type="checkbox"]');

    const xModel = await checkbox.getAttribute('x-model');
    if (!xModel) continue;

    const columnKey = xModel.replace('columns.', '');
    const th = page.locator(`th[x-show="columns.${columnKey}"]`);

    const initialState = await checkbox.isChecked();

    await row.locator('label').click();
    await page.waitForTimeout(100); // needed for alpine.js x-show

    const expectedStateAfterToggle = !initialState;

    if (expectedStateAfterToggle) {
      await expect(th).toBeVisible();
    } else {
      await expect(th).toBeHidden();
    }

    await row.locator('label').click();
    await page.waitForTimeout(100);

    if (initialState) {
      await expect(th).toBeVisible();
    } else {
      await expect(th).toBeHidden();
    }
  }

  console.log('column toggle is working');
});
