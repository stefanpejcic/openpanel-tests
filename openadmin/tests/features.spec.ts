import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'https://185.193.66.252:2087';

function randomName() {
  return `feature-${Math.random().toString(36).substring(2, 10)}`;
}

let featureSetName: string;

test('access features page', async ({ page }) => {
  await page.goto(`${BASE_URL}/features/`);
  await expect(page).toHaveURL(/features/);
  await expect(page.getByText('add a new feature')).toBeVisible();

  console.log(`features manager is accessible`);
});

test('create feature set', async ({ page }) => {
  featureSetName = randomName();

  await page.goto(`${BASE_URL}/features/`);
  await page.getByRole('textbox').fill(featureSetName);
  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page.getByText('feature set created successfully')).toBeVisible();

  console.log(`created feature set: ${featureSetName}`);
});


test('edit feature set - random enable 3 features', async ({ page }) => {
  await page.goto(`${BASE_URL}/features/`);
  await expect(page).toHaveURL(/features/);

  await page.getByLabel('Manage feature set:').selectOption(featureSetName);
  await expect(page).toHaveURL(new RegExp(`features/${featureSetName}`));

  const rows = page.locator('tbody tr');
  const count = await rows.count();

  const selectedIndexes = new Set<number>();

  while (selectedIndexes.size < 3 && selectedIndexes.size < count) {
    selectedIndexes.add(Math.floor(Math.random() * count));
  }

  const selectedRows: any[] = [];

  for (const index of selectedIndexes) {
    const row = rows.nth(index);

    const name = await row.locator('td').nth(1).locator('span.font-medium').innerText();
    const toggle = row.locator('button[type="button"]');

    const before = await toggle.getAttribute('aria-checked');

    if (before !== 'true') {
      await toggle.click();
    }

    selectedRows.push({ row, toggle, name });
  }

  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByText('features updated successfully')).toBeVisible();

  for (const item of selectedRows) {
    await expect(item.toggle).toHaveAttribute('aria-checked', 'true');
  }

  console.log('Enabled features:', selectedRows.map(f => f.name));
  console.log('editing features is working');
});
