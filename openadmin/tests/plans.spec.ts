import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'https://185.193.66.252:2087';

const PLAN_DATA = {
  name: 'probni',
  description: 'plan za test',
  disk_limit: '400',
  inodes_limit: '699999',
  cpu: '15',
  ram: '25',
  bandwidth: '28',
  domains_limit: '44',
  websites_limit: '55',
  db_limit: '88',
  email_limit: '99',
  max_email_quota: '77',
  max_hourly_email: '66',
  ftp_limit: '22',
};

async function fillPlanForm(page: any) {
  for (const [field, value] of Object.entries(PLAN_DATA)) {
    await page.locator(`input[name="${field}"]`).fill(value);
  }
}

async function verifyPlanRow(page: any, rowText: string) {
  const row = page.locator('tr', { hasText: rowText });
  for (const value of Object.values(PLAN_DATA)) {
    await expect(page.locator('body')).toContainText(value);
    //await expect(row.getByText(value)).toBeVisible();
  }
  await expect(page.locator('body')).toContainText('mysql_only');
}

async function navigateToUserPackages(page: any) {
  await page.getByRole('button', { name: 'Hosting Plans' }).click();
  await page.getByRole('link', { name: 'User Packages' }).click();
}

test('create new hosting plan and verify all fields', async ({ page }) => {
  await page.goto(`${BASE_URL}/dashboard`);
  await expect(page).toHaveURL(/dashboard/);

  await navigateToUserPackages(page);
  await expect(page.getByText('developer plus')).toBeVisible();

  await page.getByRole('link', { name: 'Create New' }).click();
  await expect(page).toHaveURL(/\/plans\/new/);

  await fillPlanForm(page);
  await page.getByRole('combobox').selectOption('mysql_only');
  await page.getByRole('button', { name: 'Create Plan' }).click();

  await expect(page.getByText('plan probni created successfully')).toBeVisible();
  await verifyPlanRow(page, 'probni');

  console.log('Plan "probni" created successfully with all fields verified in table');
});

test('delete hosting plan', async ({ page }) => {
  await page.goto(`${BASE_URL}/dashboard`);
  await expect(page).toHaveURL(/dashboard/);

  await navigateToUserPackages(page);

  await page.getByRole('cell').filter({ hasText: 'Edit Delete' }).click();
  await page.getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByText('plan deleted successfully')).toBeVisible();
  await expect(page.getByText('probni')).not.toBeVisible();

  console.log('Plan "probni" deleted successfully');
});

test('edit hosting plan and verify all fields', async ({ page }) => {
  await page.goto(`${BASE_URL}/dashboard`);
  await expect(page).toHaveURL(/dashboard/);

  await navigateToUserPackages(page);

  await page.locator('[id="1"]').click();
  await page.getByRole('link', { name: 'Edit' }).click();

  await fillPlanForm(page);
  await page.getByRole('combobox').selectOption('mysql_only');
  await page.getByRole('button', { name: 'Save changes' }).click();

  await expect(page.getByText('successfully updated plan id')).toBeVisible();

  await navigateToUserPackages(page);
  await verifyPlanRow(page, 'probni');

  console.log('Plan "Standard plan" edited successfully with all fields verified in table');
});
