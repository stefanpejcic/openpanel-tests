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


test('open single user page', async ({ page }) => {
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


test('test tabs on single user', async ({ page }) => {
  await page.goto(`/users/testinguser`);
  await expect(page).toHaveURL(/users\/testinguser/);

  // SERVICES
  await page.getByRole('link', { name: /services/i }).click();
  await expect(page).toHaveURL(/#services/);

  const expectedServices = [
    /name/i, /cpu/i, /memory/i, /actions/i, /disabled/i, /allocated/i,
  ];

  for (const service of expectedServices) {
    await expect(page.getByText(service)).toBeVisible();
  }

  console.log('services tab ok');

  // STORAGE
  await page.getByRole('link', { name: /storage/i }).click();
  await expect(page).toHaveURL(/#storage/);

  const expectedStorage = [
    /volumes/i, /containers/i, /images/i, /files/i, /testing_user_html_data/i, /php-fpm-8.5/i,
  ];

  for (const service of expectedStorage) {
    await expect(page.getByText(service)).toBeVisible();
  }

  console.log('storage tab ok');

  // OVERVIEW
  await page.getByRole('link', { name: /overview/i }).click();
  await expect(page).toHaveURL(/#info/);

  const expectedData = [
    /username/i, /locale/i, /email address/i, /2fa/i, /uid/i, /ip address/i, /context/i, /geo location/i, /home dir/i, /varnish/i,  /server/i,  /time/i, /message/i
  ];

  for (const service of expectedData) {
    await expect(page.getByText(service)).toBeVisible();
  }

  console.log('overview tab ok');

  // EDIT
  await page.getByRole('link', { name: /edit/i }).click();
  await expect(page).toHaveURL(/#edit/);

  const expectedFields = [
    /username/i, /email/i, /images/i, /ip address/i, /package/i, /save/i,
  ];

  for (const service of expectedFields) {
    await expect(page.getByText(service)).toBeVisible();
  }

  console.log('edit tab ok');

  // TRANSFER
  await page.getByRole('link', { name: /transfer/i }).click();
  await expect(page).toHaveURL(/#transfer/);

  const expectedTransfer = [
    /server/i, /username/i, /password/i, /live transfer/i, /suspend/i,
  ];

  for (const service of expectedTransfer) {
    await expect(page.getByText(service)).toBeVisible();
  }

  console.log('transfer tab ok');

  // SUSPEND
  await page.getByRole('link', { name: /suspend/i }).click();
  await expect(page).toHaveURL(/#suspend/);
  
  await expect(page.getByText('confirm', { exact: false })).toBeVisible();
  await page.locator('[x-model="confirmationText"]').fill('testinguser');
  await expect(page.getByRole('button', { name: /suspend account/i })).toBeVisible();
  
  console.log('suspend tab ok');

  // DELETE
  await page.getByRole('link', { name: /delete/i }).click();
  await expect(page).toHaveURL(/#delete/);
  
  await expect(page.getByText('confirm', { exact: false })).toBeVisible();
  await page.locator('[x-model="confirmationText"]').fill('testinguser');
  await expect(page.getByRole('button', { name: /delete account permanently/i })).toBeVisible();
  
  console.log('delete tab ok');

  // ACTIVITY LOG
  await page.getByRole('link', { name: /activity log/i }).click();
  await expect(page).toHaveURL(/#activity/);
  
  const expectedActivity= [
    /view raw/i, /download/i, /date/i, /action/i, /ip address/i,
  ];

  for (const service of expectedActivity) {
    await expect(page.getByText(service)).toBeVisible();
  }
  console.log('activity tab ok');

  // LOGIN LOG
  await page.getByRole('link', { name: /login log/i }).click();
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
