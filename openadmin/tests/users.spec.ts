// NOT FINISHED!
import { test, expect } from '@playwright/test';

async function navigateToUsersPage(page: any) {
  await page.goto(`/users`);
  await expect(page).toHaveURL(/users/);
}



test('access users page', async ({ page }) => {
  await navigateToUsersPage(page);
  await expect(page.getByText(/create new/i)).toBeVisible();
  console.log('Users page is accessible');
});



test('create new user', async ({ page }) => {
  await page.goto(`/user/new`);
  await expect(page).toHaveURL(/user\/new/);

  await page.fill('[name="admin_username"]', 'testinguser');
  await page.fill('[name="admin_password"]', 'testingpassword');
  await page.fill('[name="admin_email"]', 'testingpassword');

  await page.click('#CreateUserButton');

  await expect(page.getByText('created successfully')).toBeVisible();

  console.log('User created successfully');
});



test('test autologin', async ({ page, context }) => {
  await navigateToUsersPage(page);
  await expect(page.getByText(/create new/i)).toBeVisible();

  const [newTab] = await Promise.all([
    context.waitForEvent('page'),
    page.click('a[href="/login/token/testinguser"]'),
  ]);

  await newTab.waitForLoadState();
  await expect(newTab).toHaveURL(/dashboard/);
  await expect(newTab.getByText(/last login ip address/i)).toBeVisible();

  console.log('autologin is working');
});


test('open single user', async ({ page }) => {
  await page.goto(`/users/testinguser`);
  await expect(page).toHaveURL(/users\/testinguser/);

  const expectedItems = [
    /statistics/i,
    /services/i,
    /storage/i,
    /overview/i,
    /edit/i,
    /transfer/i,
    /suspend/i,
    /delete/i,
    /activity log/i,
    /login log/i,
  ];

  for (const item of expectedItems) {
    await expect(page.getByText(item)).toBeVisible();
  }
  console.log('single user page working');
  // todo: /get_resource_usage_history/testinguser
});

test('test tabs', async ({ page }) => {
  await page.goto(`/users/testinguser`);
  await expect(page).toHaveURL(/users\/testinguser/);
  const nav = page.getByRole('navigation', { name: 'core navigation links' });
  
  // SERVICES
  await nav.getByText('Services').click();
  await expect(page).toHaveURL(/#services/);
  const expectedServices = ['cpu', 'ram', 'actions'];
  for (const col of expectedServices) {
    await expect(page.locator(`th[x-show="columns.${col}"]`)).toBeVisible();
  }
  console.log('services tab ok');

  // STORAGE
  await nav.getByText('Storage').click();
  await expect(page).toHaveURL(/#storage/);
  await expect(page.getByText('Volumes').first()).toBeVisible();
  await expect(page.getByText('Containers').first()).toBeVisible();
  await expect(page.getByText('Images').first()).toBeVisible();
  console.log('storage tab ok');

  // OVERVIEW
  await nav.getByText('Overview').click();
  await expect(page).toHaveURL(/#info/);
  
  const fieldValidators = {
    'Username:':      (v) => /^[a-z0-9_-]+$/i.test(v),
    'Email address:': (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    'Locale:':        (v) => v.length > 0,
    '2FA status:':    (v) => ['Active', 'Inactive'].includes(v),
    'User ID (UID):': (v) => /^\d+$/.test(v),
    'IP address:':    (v) => /^(\d{1,3}\.){3}\d{1,3}$|^[0-9a-fA-F:]+$/.test(v),
    'Geo Location:':  (v) => /^[A-Z]{2}$/.test(v),
    'Server:':        (v) => v.length > 0,
    'Docker Context:': (v) => v.length > 0,
    'Home dir:':      (v) => v.startsWith('/home/'),
    'Web server:':    (v) => v.length > 0,
    'Varnish Caching:': (v) => ['Enabled', 'Disabled'].includes(v),
    'Database type:': (v) => v.length > 0,
    'Setup time:':    (v) => /^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}:\d{2}$/.test(v),
  };
  
  const infoPanel = page.locator('[x-show="activeTab === \'info\'"]');
  
  for (const [label, validator] of Object.entries(fieldValidators)) {
    const row = infoPanel.locator('.rounded-lg', { hasText: label });
    await expect(row).toBeVisible();
  
    const valueEl = row.locator('span.font-medium');
    const value = (await valueEl.innerText()).trim();
  
    if (!validator(value)) {
      throw new Error(`Field "${label}" has unexpected value: "${value}"`);
    }
  }
  
  console.log('overview tab ok');

  // EDIT
  await nav.getByText('Edit').click();
  await expect(page).toHaveURL(/#edit/);
  const expectedFields = ['username', 'email', 'images', 'ip_address', 'package'];
  for (const col of expectedFields) {
    await expect(page.locator(`th[x-show="columns.${col}"]`)).toBeVisible();
  }
  console.log('edit tab ok');

  // TRANSFER
  await nav.getByText('Transfer').click();
  await expect(page).toHaveURL(/#transfer/);
  const expectedTransfer = ['server', 'username', 'password', 'live_transfer', 'suspend'];
  for (const col of expectedTransfer) {
    await expect(page.locator(`th[x-show="columns.${col}"]`)).toBeVisible();
  }
  console.log('transfer tab ok');

  // SUSPEND
  await nav.getByText('Suspend').click();
  await expect(page).toHaveURL(/#suspend/);
  
  await expect(page.getByText('confirm', { exact: false })).toBeVisible();
  await page.locator('[x-model="confirmationText"]').fill('testinguser');
  await expect(page.getByRole('button', { name: /suspend account/i })).toBeVisible();
  
  console.log('suspend tab ok');

  // DELETE
  await nav.getByText('Delete').click();
  await expect(page).toHaveURL(/#delete/);
  
  await expect(page.getByText('confirm', { exact: false })).toBeVisible();
  await page.locator('[x-model="confirmationText"]').fill('testinguser');
  await expect(page.getByRole('button', { name: /delete account permanently/i })).toBeVisible();
  
  console.log('delete tab ok');

  // ACTIVITY LOG
  await nav.getByText('Activity Log').click();
  await expect(page).toHaveURL(/#activity/);
  
  const expectedActivity= [
    /view raw/i, /download/i, /date/i, /action/i, /ip address/i,
  ];

  for (const service of expectedActivity) {
    await expect(page.getByText(service)).toBeVisible();
  }
  console.log('activity tab ok');

  // LOGIN LOG
  await nav.getByText('Login Log').click();
  await expect(page).toHaveURL(/#logins/);
  
  const expectedLoginLog = [
    /view raw/i, /download/i, /date/i, /country/i, /ip address/i,
  ];

  for (const service of expectedLoginLog) {
    await expect(page.getByText(service)).toBeVisible();
  }
  console.log('loginlog tab ok');

});



test('search users', async ({ page }) => {
  await navigateToUsersPage(page);
  await page.locator('[x-model="searchQuery"]').fill('testinguser');
  
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
