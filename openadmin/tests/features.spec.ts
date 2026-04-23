import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'https://185.193.66.252:2087';



test('create feature set', async ({ page }) => {

  await page.goto(`${BASE_URL}/features/`);
  await expect(page).toHaveURL(/features/);


   expect getByText('add a new feature set')).toBeVisible();



  await page.getByRole('textbox').fill('example');
  await page.getByRole('button', { name: 'Create' }).click();

  await expect getByText('feature set created successfully')).toBeVisible();

  console.log(`create feature set is working`);
});



test('edit feature set - random enable 3 features', async ({ page }) => {
  await page.goto(`${BASE_URL}/features/`);
  await expect(page).toHaveURL(/features/);

  // Select feature set
  await page.getByLabel('Manage feature set:').selectOption('example');
  await expect(page).toHaveURL(/features\/example/);

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

  console.log(
    'Enabled features:',
    selectedRows.map(f => f.name)
  );

  console.log('editing features is working');
});
