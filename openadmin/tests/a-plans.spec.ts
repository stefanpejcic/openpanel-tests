import { test, expect } from '@playwright/test';

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
  max_email_quota: '77G',
  max_hourly_email: '66',
  ftp_limit: '22',
};

const EDITED_PLAN_DATA = {
  name: 'probniRenamed',
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
  max_email_quota: '77G',
  max_hourly_email: '66',
  ftp_limit: '22',
};

const PLAN_DISPLAY = {
  name: 'probni',
  ram: '25 GB',
  cpu: '15 Core',
  disk_limit: '400 GB',
  inodes_limit: '699.999',   // UI adds thousands separator
  bandwidth: '28 mbits',
  domains_limit: '44',
  websites_limit: '55',
  db_limit: '88',
  email_limit: '99',
  max_email_quota: '77G',
  ftp_limit: '22',
};

async function fillPlanForm(page: any) {
  for (const [field, value] of Object.entries(PLAN_DATA)) {
    await page.locator(`input[name="${field}"]`).fill(value);
  }
}

async function fillPlanEditForm(page: any) {
  for (const [field, value] of Object.entries(EDITED_PLAN_DATA)) {
    await page.locator(`input[name="${field}"]`).fill(value);
  }
}

async function verifyPlanRow(page: Page, planName: string) {
  const row = page.locator('tr.user-row').filter({
    has: page.locator('td', { hasText: new RegExp(`^\\s*${planName}\\s*$`) }),
  });
  await expect(row).toHaveCount(1);

  const expected = { ...PLAN_DISPLAY, name: planName };  // name comes from the arg
  for (const [field, value] of Object.entries(expected)) {
    await test.step(`cell ${field} = ${value}`, async () => {
      await expect(row.locator(`td[data-field="${field}"]`)).toHaveText(value);
    });
  }
  await expect(row.getByRole('link', { name: 'mysql_only' })).toBeVisible();
}

async function navigateToUserPackages(page: any) {
  await page.getByRole('button', { name: 'Hosting Plans' }).click();
  await page.getByRole('link', { name: 'User Packages' }).click();
}

test('create new hosting plan and verify all fields', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/dashboard/);

  await navigateToUserPackages(page);

  await expect(
    page.getByText('Developer plus', { exact: true })
  ).toBeVisible();

  await page.getByRole('link', { name: 'Create New' }).click();
  await expect(page).toHaveURL(/\/plans\/new/);

  await fillPlanForm(page);

  const featureSet = page.locator('select[name="feature_set"]');

  await expect(featureSet).toBeVisible();
  await featureSet.selectOption('mysql_only');
  await expect(featureSet).toHaveValue('mysql_only');

  await page.getByRole('button', { name: 'Create Plan' }).click();

  // Verify success toast.
  const successAlert = page.getByRole('alert');

  await expect(successAlert).toBeVisible();
  await expect(successAlert).toContainText(
    /Plan\s+probni\s+created\s+successfully/i
  );

  // Explicitly open the plans table after creation.
  await page.goto('/plans');
  await expect(page).toHaveURL(/\/plans/);

  await expect(
    page.getByRole('heading', { name: 'User Packages' })
  ).toBeVisible();

  // Find the newly-created plan in the table.
  const row = page.locator('tr.user-row').filter({
    has: page.getByRole('cell', {
      name: 'probni',
      exact: true,
    }),
  });

  await expect(row).toHaveCount(1);
  await expect(row).toBeVisible();

  const cells = row.getByRole('cell');

  // Verify displayed values.
  await expect(cells.nth(0)).toHaveText('probni');
  await expect(cells.nth(1)).toContainText('25 GB');
  await expect(cells.nth(2)).toContainText('15 Core');
  await expect(cells.nth(3)).toContainText('400 GB');
  await expect(cells.nth(4)).toContainText('699.999');
  await expect(cells.nth(5)).toHaveText('28 mbits');
  await expect(cells.nth(6)).toHaveText('44');
  await expect(cells.nth(7)).toHaveText('55');
  await expect(cells.nth(8)).toHaveText('88');
  await expect(cells.nth(9)).toHaveText('99');
  await expect(cells.nth(10)).toHaveText('∞');
  await expect(cells.nth(11)).toHaveText('22');

  // Verify feature set.
  await expect(
    cells.nth(12).getByRole('link', {
      name: 'mysql_only',
      exact: true,
    })
  ).toBeVisible();

  console.log(
    'Plan "probni" created successfully, toast verified, and plan verified in /plans table'
  );
});


test('edit hosting plan and verify all fields', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/dashboard/);

  await navigateToUserPackages(page);

  const planName = 'probni';
  const editedPlanName = 'probniRenamed';

  const row = page.locator('tr.user-row').filter({
    has: page.getByRole('cell', {
      name: planName,
      exact: true,
    }),
  }).first();

  await expect(row).toBeVisible();

  const menuButton = row
    .locator('button[data-dropdown-toggle^="dropdown-"]')
    .first();

  await expect(menuButton).toBeVisible();

  const dropdownId = await menuButton.getAttribute('data-dropdown-toggle');

  if (!dropdownId) {
    throw new Error(`Dropdown ID not found for plan row: ${planName}`);
  }

  await menuButton.click();

  const dropdown = page.locator(`#${dropdownId}`);
  await expect(dropdown).toBeVisible();

  const editLink = dropdown.getByRole('link', { name: /^Edit$/ });

  await expect(editLink).toBeVisible();
  await editLink.click();

  await expect(page).toHaveURL(/\/plans\/\d+/);

  await fillPlanEditForm(page);

  const featureSet = page.locator('select[name="feature_set"]');

  await expect(featureSet).toBeVisible();
  await featureSet.selectOption('mysql_only');
  await expect(featureSet).toHaveValue('mysql_only');

  await page.getByRole('button', { name: 'Save changes' }).click();

  // Verify success notification.
  const successAlert = page.getByRole('alert');

  await expect(successAlert).toBeVisible();
  await expect(successAlert).toContainText(
    /updated successfully|successfully updated/i
  );

  // Explicitly go back to plans table.
  await page.goto('/plans');
  await expect(page).toHaveURL(/\/plans/);

  await expect(
    page.getByRole('heading', { name: 'User Packages' })
  ).toBeVisible();

  // Find renamed plan.
  const editedRow = page.locator('tr.user-row').filter({
    has: page.getByRole('cell', {
      name: editedPlanName,
      exact: true,
    }),
  });

  await expect(editedRow).toHaveCount(1);
  await expect(editedRow).toBeVisible();

  const cells = editedRow.getByRole('cell');

  // Verify edited plan values in table.
  await expect(cells.nth(0)).toHaveText('probniRenamed');
  await expect(cells.nth(1)).toContainText('25 GB');
  await expect(cells.nth(2)).toContainText('15 Core');
  await expect(cells.nth(3)).toContainText('400 GB');
  await expect(cells.nth(4)).toContainText('699.999');
  await expect(cells.nth(5)).toHaveText('28 mbits');
  await expect(cells.nth(6)).toHaveText('44');
  await expect(cells.nth(7)).toHaveText('55');
  await expect(cells.nth(8)).toHaveText('88');
  await expect(cells.nth(9)).toHaveText('99');
  await expect(cells.nth(10)).toHaveText('∞');
  await expect(cells.nth(11)).toHaveText('22');

  await expect(
    cells.nth(12).getByRole('link', {
      name: 'mysql_only',
      exact: true,
    })
  ).toBeVisible();

  console.log(
    'Plan "probni" successfully renamed to "probniRenamed", notification verified, and edited values verified in /plans table'
  );
});


test('delete hosting plan', async ({ page }) => {
  await page.goto(`/dashboard`);
  await expect(page).toHaveURL(/dashboard/);

  await navigateToUserPackages(page);

  const planName = 'probniRenamed';

  const row = page.locator('tr.user-row').filter({
    has: page.locator('td', { hasText: new RegExp(`^${planName}$`) }),
  }).first();

  await expect(row).toBeVisible();

  const menuButton = row.locator('button[data-dropdown-toggle^="dropdown-"]').first();
  await expect(menuButton).toBeVisible();

  const dropdownId = await menuButton.getAttribute('data-dropdown-toggle');
  if (!dropdownId) {
    throw new Error(`Dropdown ID not found for plan row: ${planName}`);
  }

  await menuButton.click();

  const dropdown = page.locator(`#${dropdownId}`);
  await expect(dropdown).toBeVisible();

  const deleteButton = dropdown.getByRole('button', { name: /^Delete$/ });
  await expect(deleteButton).toBeVisible();

  await Promise.all([
    page.waitForLoadState('networkidle').catch(() => {}),
    deleteButton.click(),
  ]);

  await expect(page.getByText(/plan deleted successfully/i)).toBeVisible();

  await expect(page.locator('tr.user-row').filter({
    has: page.locator('td', { hasText: new RegExp(`^${planName}$`) }),
  })).toHaveCount(0);
});


test('search hosting plans', async ({ page }) => {
  await page.goto(`/dashboard`);
  await expect(page).toHaveURL(/dashboard/);

  await navigateToUserPackages(page);
  await page.getByRole('searchbox', { name: 'Search by plan name...' }).fill('Standard');
  
  const row = page.getByRole('row').filter({ hasText: 'Standard' });
  await expect(row).toHaveCount(1);
  await expect(row).toHaveText(/Standard plan/i);

  console.log('Plan search is functional');
});



test('check columns for hosting plans', async ({ page }) => {
  await page.goto(`/dashboard`);
  await expect(page).toHaveURL(/dashboard/);

  await navigateToUserPackages(page);

  const showColumnsButton = page.locator('button#dropdownToggleButton');
  await expect(showColumnsButton).toBeVisible();

  await showColumnsButton.click();

  const dropdownId = await showColumnsButton.getAttribute('data-dropdown-toggle');
  if (!dropdownId) {
    throw new Error('Show Columns dropdown ID not found');
  }

  const dropdown = page.locator(`#${dropdownId}`);
  await expect(dropdown).toBeVisible();

  const rows = dropdown.locator('ul[aria-labelledby="dropdownToggleButton"] li');
  const count = await rows.count();

  for (let i = 0; i < count; i++) {
    const menuRow = rows.nth(i);
    const checkbox = menuRow.locator('input[type="checkbox"]').first();

    const xModel = await checkbox.getAttribute('x-model');
    if (!xModel || !xModel.startsWith('columns.')) continue;

    const columnKey = xModel.replace('columns.', '');
    const header = page.locator(`th[x-show="columns.${columnKey}"]`).first();
    const cells = page.locator(`td[x-show="columns.${columnKey}"]`);

    const initialState = await checkbox.isChecked();

    await menuRow.locator('label').click();
    await expect(checkbox).toBeChecked({ checked: !initialState });

    if (!initialState) {
      await expect(header).toBeVisible();
      await expect(cells.first()).toBeVisible();
    } else {
      await expect(header).toBeHidden();
      if (await cells.count()) {
        await expect(cells.first()).toBeHidden();
      }
    }

    await menuRow.locator('label').click();
    await expect(checkbox).toBeChecked({ checked: initialState });

    if (initialState) {
      await expect(header).toBeVisible();
      await expect(cells.first()).toBeVisible();
    } else {
      await expect(header).toBeHidden();
      if (await cells.count()) {
        await expect(cells.first()).toBeHidden();
      }
    }
  }

  console.log('column toggle is working');
});
