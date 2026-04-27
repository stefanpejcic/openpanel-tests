import { test, expect } from '@playwright/test';

async function navigateToMySQLPage(page: any) {
  await page.goto(`/mysql`);
  await expect(page).toHaveURL(/mysql/);
}

// ACCESS
test('access databases', async ({ page }) => {
  await navigateToMySQLPage(page);
  await expect(page.locator('body'))
    .toContainText(/create your first database/i, { timeout: 20000 });
  console.log('mysql initialized');
});



test('create database', async ({ page }) => {
  await navigateToMySQLPage(page);
  await page.getByRole('link', { name: 'Create your first database' }).click();
  await page.getByRole('textbox', { name: 'Database Name' }).fill('stefan_baza');
  await page.getByRole('button', { name: 'Create Database' }).click();

  await expect(page.locator('body')).toContainText(/successfully created a database/i);
  const row = page.locator('tr', { hasText: 'stefan_baza' });
  await expect(row).toBeVisible();
  await expect(row.getByRole('link', { name: /import/i })).toBeVisible();
  await expect(row.getByRole('button', { name: /export/i })).toBeVisible();
  await expect(row.getByRole('link', { name: /phpmyadmin/i })).toBeVisible();
  await expect(row.getByRole('button', { name: /delete/i })).toBeVisible();

  console.log('database created');
});



test('show system databases', async ({ page }) => {
  await navigateToMySQLPage(page);

  await page.getByText('Show system databases').click();
  await expect(page.locator('body')).toContainText(/information_schema/i);

  console.log('show system databases working');
});



test('show database sizes', async ({ page }) => {
  await navigateToMySQLPage(page);

  const showSizesCheckbox = page.locator('#showSizesCheckbox');
  await showSizesCheckbox.check();
  await expect(page.locator('#size-column-header')).toBeVisible();
  await page.locator('#display-size').selectOption('mb');
  await expect(page.locator('#size_unit')).toHaveText('(MB)');

  console.log('show database sizes working');
});



test('access users', async ({ page }) => {
  await page.goto(`/mysql/users`);
  await expect(page).toHaveURL(/.*mysql\/users/);
  await expect(page.locator('body')).toContainText(/no users yet/i);

  console.log('users page accessible');
});


test('show system users', async ({ page }) => {
  await page.goto(`/mysql/users`);

  await page.getByText('Show system users').click();
  await expect(page.locator('body')).toContainText(/healthcheck/i);

  console.log('show system users working');
});


test('create user', async ({ page }) => {
  await page.goto(`/mysql/users`);

  await page.getByRole('link', { name: 'Create your first user' }).click();
  await expect(page).toHaveURL(/.*mysql\/user/);

  await page.getByRole('textbox', { name: 'Username*' }).fill('stefan_user');
  await page.getByRole('textbox', { name: 'Password*' }).fill('stefan94');
  await page.getByRole('button', { name: 'Create User' }).click();

  await expect(page.locator('body')).toContainText(/successfully created a database user stefan_user/i);

  await page.getByRole('link', { name: 'Back to Users' }).click();
  await expect(page).toHaveURL(/.*mysql\/users/);
  await expect(page.locator('body')).toContainText(/stefan_user/i);
  
  console.log('user created');
});



test('change password', async ({ page }) => {
  await page.goto(`/mysql/users`);

  await page.getByRole('link', { name: ' Change Password' }).click();
  await expect(page).toHaveURL(/.*mysql\/password/);  
  await page.locator('#generatePassword').click();
  await page.getByRole('button', { name: 'Change Password' }).click();
  await expect(page).toHaveURL(/.*mysql\/users/);  
  await expect(page.locator('body')).toContainText(/successfully changed password for user stefan_user/i);
  
  console.log('change password working');
});



test('grant privileges', async ({ page }) => {
  await page.goto(`/mysql/users`);
  await page.getByRole('link', { name: 'Assign User to Database' }).click();
  await expect(page).toHaveURL(/.*mysql\/assign/);

  await page.waitForResponse(resp => resp.url().includes('/mysql/info') && resp.status() === 200);

  await page.locator('select[name="db_user"]').selectOption('stefan_user');
  await page.locator('select[name="database_name"]').selectOption('stefan_baza');

  await page.waitForResponse(resp => resp.url().includes('/mysql/privileges/') && resp.status() === 200);

  // GRANT 'CREATE ROUTE' ONLY
  await page.getByRole('checkbox', { name: 'ALTER', exact: true }).check();
  await page.getByRole('checkbox', { name: 'CREATE ROUTINE' }).check();
  await page.getByRole('button', { name: 'Make Changes' }).click();
  await expect(page.locator('body')).toContainText(/Privileges granted successfully for user\s+'.+?'\s+on database\s+'.+?'/i);

  // REMOVE 'CREATE ROUTE' - expect error!
  await page.getByRole('link', { name: 'Back to Databases' }).click();
  await expect(page).toHaveURL(/.*mysql/);
  await expect(page.locator('body')).toContainText(/stefan_user/i);
  await page.getByRole('link', { name: 'stefan_user' }).click();
  await page.getByRole('checkbox', { name: 'ALTER', exact: true }).uncheck();
  await page.getByRole('checkbox', { name: 'CREATE ROUTINE' }).uncheck();
  await page.getByRole('button', { name: 'Make Changes' }).click();
  await expect(page.locator('body')).toContainText(/at least one privilege must be selected/i);

  // GRANT 'ALL PRIVILEGES'
  await page.getByRole('checkbox', { name: 'ALTER', exact: true }).check();
  await page.getByRole('checkbox', { name: 'ALL PRIVILEGES' }).check();
  await page.getByRole('button', { name: 'Make Changes' }).click();
  await expect(page.locator('body')).toContainText(/Privileges granted successfully for user\s+'.+?'\s+on database\s+'.+?'/i);
  
  console.log('assign user to database is working');
});



test('revoke privileges', async ({ page }) => {
  await page.goto(`/mysql/users`);
  await page.getByRole('link', { name: 'Remove User from DB' }).click();
  await expect(page).toHaveURL(/.*mysql\/remove/);

  await page.waitForResponse(resp => resp.url().includes('/mysql/info') && resp.status() === 200);

  await page.locator('select[name="db_user"]').selectOption('stefan_user');
  await page.locator('select[name="database_name"]').selectOption('stefan_baza');

  await page.getByRole('button', { name: 'Remove User from Database' }).click();
  await expect(page.locator('body')).toContainText(/successfully revoked all privileges for user/i);
  await page.getByRole('link', { name: 'Back to Databases' }).click();
  await expect(page.locator('body')).not.toContainText(/stefan_test/i);
  console.log('remove user from database is working');
});



test('database wizard', async ({ page }) => {
  await page.goto(`/mysql/wizard`);
  await expect(page).toHaveURL(/.*mysql\/wizard/);  
  await page.getByRole('textbox', { name: 'Database Name' }).fill('proba');
  await page.getByRole('textbox', { name: 'Database User' }).fill('novi_user');
  await page.getByRole('textbox', { name: 'Password' }).fill('stefan456g7dsd');
  await page.getByRole('button', { name: 'Create DB, User, and Grant' }).click();
  await page.getByRole('link', { name: 'Back to Databases' }).click();
  await expect(page).toHaveURL(/.*mysql/);  
  await expect(page.locator('body')).toContainText([
    /proba/i,
    /novi_user/i
  ]);

  console.log('mysql database wizard is working');
});



test('processlist', async ({ page }) => {
  await page.goto(`/mysql/processlist`);
  await expect(page).toHaveURL(/.*mysql\/processlist/);
  await expect(page.locator('body')).toContainText(/host/i);
  await expect(page.locator('body')).toContainText(/state/i);
  console.log('processlist is working');
});



test('configuration editor', async ({ page }) => {
  await page.goto(`/mysql/configuration`);
  await expect(page).toHaveURL(/.*mysql\/configuration/);
  await expect(page.locator('body')).toContainText(/max_allowed_packet/i);
  await expect(page.locator('body')).toContainText(/log_error_verbosity/i);
  await page.locator('#interactive_timeout').fill('90');
  await page.locator('#wait_timeout').fill('300');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.locator('body')).toContainText(/configuration updated and service restarted/i);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#interactive_timeout')).toHaveValue('90');
  await expect(page.locator('#wait_timeout')).toHaveValue('300');
  console.log('mysql configuration is saved');
});



test('change root password', async ({ page }) => {
  await page.goto(`/mysql/root-password`);
  await expect(page).toHaveURL(/.*mysql\/root-password/);  
  await page.getByRole('textbox', { name: 'New Password*' }).fill('stefan94');
  await page.getByRole('button', { name: 'Change Password' }).click();
  await expect(page.locator('body')).toContainText(/successfully changed root password/i);
  await page.getByRole('link', { name: 'Back to Databases' }).click();
  await expect(page).toHaveURL(/.*mysql/);  
  await expect(page.locator('body')).toContainText(/stefan_baza/i, { timeout: 15000 });

  console.log('change root password is working');
});



test('remote access', async ({ page }) => {
  await page.goto('/mysql/remote-mysql');

  const statusText = page.locator('dd p.text-lg.font-semibold');
  await expect(statusText).toHaveText('Disabled');

  const redBars = page.locator('dd .bg-red-500').first();
  await expect(redBars).toBeVisible();

  const localServerText = await page.locator('#local_server').textContent();
  expect(localServerText?.toLowerCase()).toMatch(/mysql|mariadb/);

  await expect(page.locator('#local_port')).toHaveText('3306');

  const remoteServerText = await page.locator('#remote_server').textContent();
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  expect(remoteServerText?.trim()).toMatch(ipv4Regex);

  const parts = remoteServerText!.trim().split('.').map(Number);
  expect(parts[0]).not.toBe(127);
  expect(parts[0]).not.toBe(10);
  expect(!(parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)).toBe(true);
  expect(!(parts[0] === 192 && parts[1] === 168)).toBe(true);

  const remotePortText = await page.locator('#remote_port').textContent();
  const remotePortNum = parseInt(remotePortText ?? '0', 10);
  expect(remotePortNum).toBeGreaterThanOrEqual(32768);
  expect(remotePortNum).toBeLessThanOrEqual(65535);

  // 1. ON
  const enableBtn = page.locator('dd button', { hasText: 'Click to Enable' });
  await enableBtn.click();
  await expect(page.locator('text=Remote MySQL access is now enabled')).toBeVisible();
  await expect(statusText).toHaveText('Enabled');
  const greenBars = page.locator('dd .bg-emerald-500').first();
  await expect(greenBars).toBeVisible();

  // 2. TEST
  await page.goto('https://piehost.com/tools/mysql-tester');
  await page.fill('input[name="host"]', remoteServerText?.trim());
  await page.fill('input[name="port"]', remotePortText?.trim());
  await page.fill('input[name="username"]', 'novi_user');
  await page.fill('input[name="password"]', 'stefan456g7dsd');
  await page.fill('input[name="database"]', 'proba');
  
  await page.click('button[type="submit"]');
  
  await expect(page.locator('body')).toContainText(/Connection successful!/i);


  // 3. OFF
  await page.goto('/mysql/remote-mysql');
  const disableBtn = page.locator('dd button', { hasText: 'Click to Disable' });
  await disableBtn.click();
  await expect(page.locator('text=Remote MySQL access is now disabled')).toBeVisible();
  await expect(statusText).toHaveText('Disabled');
  await expect(redBars).toBeVisible();
});



test('delete user', async ({ page }) => {
  await page.goto(`/mysql/users`);

  const deleteButtons = page.locator('button.btn-danger');
  const count = await deleteButtons.count();
  expect(count).toBeGreaterThan(0);

  await deleteButtons.first().click();

  const confirmButton = page.locator('button.btn-dark');
  await expect(confirmButton.first()).toBeVisible();

  await confirmButton.first().click();

  await expect(page.locator('body')).toContainText(/successfully deleted/i);
  console.log('delete user is working');
});



test('delete database', async ({ page }) => {
  await navigateToMySQLPage(page);

  const deleteButton = page.locator('button.btn-danger').first();
  await expect(deleteButton).toBeVisible();
  await deleteButton.click();

  const confirmButton = page.locator('button.btn-dark').first();
  await expect(confirmButton).toBeVisible();
  await confirmButton.click();

  await expect(page.locator('body')).toContainText(/successfully deleted/i);
  console.log('delete database is working');
});
