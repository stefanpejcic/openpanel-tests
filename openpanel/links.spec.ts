import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  // LOGIN
  await page.goto('https://185.193.66.252:2083/login');
  await page.getByRole('textbox', { name: 'Username' }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill('testinguser');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('testingpassword');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).toHaveURL(/.*dashboard/);

  // EMAIL CHANGE
  await page.getByRole('link', { name: ' Email & Password' }).click();
  await page.getByRole('textbox', { name: 'Email address*' }).click();
  await page.getByRole('textbox', { name: 'Email address*' }).fill('stefan@noviemail.rs');
  await page.getByRole('button', { name: 'Update' }).click();

  await expect(page.locator('body'))
    .toContainText(/has been changed successfully/i);


  // PASSWORD CHANGE
  await page.goto('https://185.193.66.252:2083/account');
  await page.getByRole('textbox', { name: 'Password* Confirm Password*' }).fill('novipassword');
  await page.getByRole('textbox', { name: 'Confirm New Password' }).fill('novipassword');
  
  await page.getByRole('button', { name: 'Update' }).click();
  
  await page.getByText('Notification Password for').click();
  await expect(page.locator('body'))
    .toContainText(/has been changed successfully/i);

  await page.goto('https://185.193.66.252:2083/files');
  await expect(page).toHaveURL(/.*login/);

  await page.goto('https://185.193.66.252:2083/login');
  await page.getByRole('textbox', { name: 'Username' }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill('testinguser');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('testingpassword');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).toHaveURL(/.*dashboard/);
  

  // TEST MENU LINKS
  await page.getByRole('button', { name: 'Websites' }).click();
  await page.getByRole('link', { name: 'Auto Installer', exact: true }).click();
  await expect(page).toHaveURL(/.*auto-installer/);
  await expect(page.locator('body')).toContainText([
    /wordpress/i,
  
    /website builder/i,
    /node\.js/i,
    /python/i
  ]);


  await page.getByRole('link', { name: 'Site Manager' }).click();
  await expect(page).toHaveURL(/.*sites/);
  await expect(page.locator('body'))
    .toContainText(/no websites yet/i);


  await page.getByRole('link', { name: 'WordPress Manager' }).click();
  await expect(page).toHaveURL(/.*wordpress/);
  await expect(page.locator('body'))
    .toContainText(/total installations/i);


  await page.getByRole('button', { name: 'Files' }).click();
  await page.getByRole('link', { name: 'File Manager' }).click();
  await expect(page).toHaveURL(/.*files/);
  await expect(page.locator('body'))
    .toContainText(/no items found/i);

  await page.getByRole('link', { name: 'Upload from device' }).click();
  await expect(page.locator('body'))
    .toContainText(/file upload/i);

  await page.getByRole('link', { name: 'Download from URL' }).click();
  await expect(page.locator('body'))
    .toContainText(/upload from device instead/i);

  await page.getByRole('link', { name: 'FTP Accounts' }).click();
  await expect(page.locator('body'))
    .toContainText(/no accounts yet/i);

  await page.getByRole('link', { name: 'Backups' }).click();
  await expect(page.locator('body'))
    .toContainText(/select destination/i);

  await page.getByRole('link', { name: 'Disk Usage' }).click();
  await expect(page.locator('body'))
    .toContainText(/docker-data/i);

  await page.getByRole('link', { name: ' docker-data' }).click();
  await expect(page.locator('body'))
    .toContainText(/containers/i);

  await page.getByRole('link', { name: ' Up One Level' }).click();
  await expect(page.locator('body'))
    .toContainText(/docker-data/i);

  await page.getByRole('link', { name: 'Inodes Explorer' }).click();
  await expect(page.locator('body'))
    .toContainText(/docker-data/i);

  await page.getByRole('link', { name: ' docker-data' }).click();

  await expect(page.locator('body'))
    .toContainText(/containerd/i);

  await page.getByRole('link', { name: 'Fix Permissions' }).click();
  await expect(page.locator('body'))
    .toContainText(/choose a directory/i);
  await page.getByRole('button', { name: 'Fix Permissions' }).click();
  await expect(page.locator('body'))
    .toContainText(/permissions are fixed/i);


  await page.getByRole('link', { name: 'Trash' }).click();
  await expect(page.locator('body'))
    .toContainText(/no files/i);


  // MYSQL DATABASES
  await page.getByRole('link', { name: 'Databases' }).click();
  // need to set timeout to 20s!
  await expect(page).toHaveURL(/.*mysql/);

  await expect(page.locator('body'))
    .toContainText(/create your first database/i, { timeout: 15000 });
  await page.getByRole('link', { name: 'Create your first database' }).click();
  await page.getByRole('textbox', { name: 'Database Name' }).click();
  await page.getByRole('textbox', { name: 'Database Name' }).fill('stefan_baza');
  await page.getByRole('button', { name: 'Create Database' }).click();
  await expect(page.locator('body'))
    .toContainText(/successfully created a database/i);

  await expect(page.locator('body')).toContainText([
    /import/i,
    /export/i,
    /phpmyadmin/i,
    /delete/i
  ]);


  await page.getByText('Show system databases').click();
  await expect(page.locator('body'))
    .toContainText(/information_schema/i);

  await page.getByRole('switch', { name: 'Show database sizes' }).check();
  await page.locator('#display-size').selectOption('mb');
  await expect(page.locator('body'))
    .toContainText(/Size (MB)/i);


  await page.getByRole('link', { name: 'Users' }).click();
  await expect(page).toHaveURL(/.*mysql\/users/);
  await expect(page.locator('body'))
    .toContainText(/no users yet/i);

  await page.getByRole('link', { name: 'Create your first user' }).click();
  await expect(page).toHaveURL(/.*mysql\/user/);

  await page.getByRole('textbox', { name: 'Username*' }).click();
  await page.getByRole('textbox', { name: 'Username*' }).fill('stefan_user');
  await page.getByRole('textbox', { name: 'Password*' }).click();
  await page.getByRole('textbox', { name: 'Password*' }).fill('stefan94');
  await page.getByRole('button', { name: 'Create User' }).click();

  await expect(page.locator('body'))
    .toContainText(/successfully created a database user stefan_user/i);

  await page.getByRole('link', { name: 'Back to Users' }).click();
  await expect(page).toHaveURL(/.*mysql\/users/);
  await expect(page.locator('body'))
    .toContainText(/stefan_user/i);

  await page.getByRole('link', { name: ' Change Password' }).click();
  await expect(page).toHaveURL(/.*mysql\/password/);  
  await page.locator('#generatePassword').click();
  await page.getByRole('button', { name: 'Change Password' }).click();
  await expect(page).toHaveURL(/.*mysql\/users/);  
  await expect(page.locator('body'))
    .toContainText(/successfully changed password for user stefan_user/i);


  await page.getByRole('link', { name: 'Assign User to Database' }).click();
  await expect(page).toHaveURL(/.*mysql\/assign/);  
  await page.locator('select[name="db_user"]').selectOption('stefan_users');
  await page.locator('select[name="database_name"]').selectOption('stefan_baza');
  await page.getByRole('checkbox', { name: 'ALTER', exact: true }).check();
  await page.getByRole('checkbox', { name: 'CREATE ROUTINE' }).check();
  await page.getByRole('button', { name: 'Make Changes' }).click();
  await expect(page.locator('body'))
    .toContainText(/privilages successfully for user/i);
  await page.getByRole('link', { name: 'Back to Databases' }).click();
  await expect(page).toHaveURL(/.*mysql/);  
  await expect(page.locator('body'))
    .toContainText(/stefan_user/i);

  await page.getByRole('link', { name: 'stefan_users' }).click();
  await page.getByRole('checkbox', { name: 'ALTER', exact: true }).uncheck();
  await page.getByRole('checkbox', { name: 'CREATE ROUTINE' }).uncheck();
  await page.getByRole('button', { name: 'Make Changes' }).click();


  await expect(page.locator('body'))
    .toContainText(/at least one privilege must be selected/i);


  await page.getByRole('link', { name: 'Remove User from DB' }).click();
  await expect(page).toHaveURL(/.*mysql\/remove/);
  await page.getByRole('button', { name: 'Remove User from Database' }).click();
  await expect(page.locator('body'))
    .toContainText(/successfully revoked all privileges for user/i);


  await page.getByRole('link', { name: 'Back to Databases' }).click();
  await expect(page.locator('body'))
    .not.toContainText(/stefan_test/i);


  await page.locator('#mysql-menu').getByRole('link', { name: 'Database Wizard' }).click();
  await expect(page).toHaveURL(/.*mysql\/wizard/);  
  await page.getByRole('textbox', { name: 'Database Name' }).click();
  await page.getByRole('textbox', { name: 'Database Name' }).fill('proba');
  await page.getByRole('textbox', { name: 'Database User' }).click();
  await page.getByRole('textbox', { name: 'Database User' }).fill('novi_user');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('stefan456g7dsd$%D&&');
  await page.getByRole('button', { name: 'Create DB, User, and Grant' }).click();
  await page.getByRole('link', { name: 'Back to Databases' }).click();
  await expect(page).toHaveURL(/.*mysql/);  
  await expect(page.locator('body')).toContainText([
    /proba/i,
    /novi_user/i
  ]);


  await page.getByRole('link', { name: 'Show Processes' }).click();
  await expect(page).toHaveURL(/.*mysql\/processlist/);  
  await expect(page.locator('body')).toContainText([
    /host/i,
    /state/i
  ]);

  await page.getByRole('link', { name: 'Configuration' }).click();
  await expect(page).toHaveURL(/.*mysql\/configuration/);  
  await expect(page.locator('body')).toContainText([
    /max_allowed_packet/i,
    /log_error_verbosity/i
  ]);
  await page.locator('#interactive_timeout').click();
  await page.locator('#interactive_timeout').fill('90');
  await page.locator('#wait_timeout').click();
  await page.locator('#wait_timeout').fill('300');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.locator('body'))
    .toContainText(/configuration updated and service restarted/i);
  await page.waitForLoadState('networkidle');

  await expect(page.locator('#interactive_timeout')).toHaveValue('90');
  await expect(page.locator('#wait_timeout')).toHaveValue('300');

  await page.getByRole('link', { name: 'Change root password' }).click();
  await expect(page).toHaveURL(/.*mysql\/root-password/);  
  await page.getByRole('textbox', { name: 'New Password*' }).click();
  await page.getByRole('textbox', { name: 'New Password*' }).fill('stefan94');
  await page.getByRole('button', { name: 'Change Password' }).click();
  await expect(page.locator('body'))
    .toContainText(/successfully changed root password/i);
  await page.getByRole('link', { name: 'Back to Databases' }).click();
  await expect(page).toHaveURL(/.*mysql/);  
  await expect(page.locator('body'))
    .toContainText(/stefan_baza/i);


  await page.getByRole('button', { name: ' Delete' }).nth(1).click();
  await page.getByRole('button', { name: ' Delete' }).nth(1).click();
  await expect(page.locator('body'))
    .toContainText(/successfully deleted a database stefan_baza/i);

  // LOGOUT
  await page.getByRole('button', { name: 'User settings' }).click();
  await page.getByRole('link', { name: 'Sign out' }).click();

  await expect(page).toHaveURL(/.*login/);

});
