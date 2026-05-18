import { test, expect } from '@playwright/test';

const EMAILS = [
  'test1',
]; 

async function createEmail(page, email) {
  await page.goto(`/emails/new`);
  await expect(page).toHaveURL(/emails\/new/);
  await page.getByRole('textbox', { name: 'Username*' }).fill(email);
  await page.getByRole('textbox', { name: 'Password*' }).fill("password123");
  await page.getByRole('button', { name: 'Create Email' }).click();

  await expect(page.getByText(new RegExp(`Email ${email}@wp.tests.openpanel.org added successfully`, 'i'))).toBeVisible();
  console.log(`Email added: ${email}@wp.tests.openpanel.org`);
}


test('create emails', async ({ page }) => {
  for (const email of EMAILS) {
    await createEmail(page, email);
  }
});

async function autoLogintest (page) {
  await page.goto(`/emails`);
  await expect(page).toHaveURL(/\/emails$/);
  const popupPromise = page.waitForEvent('popup'); 
  await page.locator('[data-email^="test1@"]').click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  await popup.goto(`http://185.119.89.17:8080/?_task=mail&_action=compose`)
  //await popup.locator('#rcmbtn103').click();
  //await expect(popup.locator('#composebody')).toBeVisible();
  //await popup.goto(`/?_task=mail&_action=compose`)
  const toInput = popup.locator('#compose_to input[type="text"]');
  await toInput.fill('lazar@netops.com');
  await popup.getByLabel('Subject').fill('Ovo je neki naslov');
  await popup.locator('#composebody').fill('Ovo je samo jos jedan test bla bla');
  await popup.getByRole('button', { name: 'Send' }).click();
  await expect(popup.getByText().toBeVisible();
  //await popup.close();
}

test('Webmail autologin tests', async ({ page }) => {
  await autoLogintest(page);
});

async function webMailtest (page) {
  await page.goto(`/emails`);
  await expect(page).toHaveURL(/\/emails$/);
  await page.goto(`/webmail/test1@wp.tests.openpanel.org`)
  await page.locator('#rcmloginpwd').fill('password123');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.goto(`?_task=mail&_action=compose`);
  await page.locator('.input-group .recipient-input input').fill('lazar@netops.com');
  await page.getByLabel('Subject').fill('Ovo je neki naslov');
  await page.locator('#composebody').fill('Ovo je samo jos jedan test bla bla');
  await page.getByRole('button', { name: 'Send' }).click();
  await page.close();
  }

//test('Login to webmail', async ({ page }) => {
//  await webMailtest(page);
//});





async function suspendIncoming(page, email) {
  await page.goto(`/emails/edit/${email}@wp.tests.openpanel.org`);
  await expect(page).toHaveURL(/emails\/edit/);
  await page.locator('#suspend_incoming').check();
  await page.getByRole('button', { name: 'Update Email Settings' }).click();
  const alert = page.locator('#alert-1');
  await expect(alert).toBeVisible({ timeout: 10000 });
  await expect(alert).toContainText('Settings saved for email');
  console.log(`Email receiving suspended for ${email}@wp.tests.openpanel.org`);
}
test('suspend incoming', async ({ page }) => {
  for (const email of EMAILS) {
    await suspendIncoming(page, email);
  }
});

async function suspendOutgoing(page, email) {
  await page.goto(`/emails/edit/${email}@wp.tests.openpanel.org`);
  await expect(page).toHaveURL(/emails\/edit/);
  await page.locator('#suspend_outgoing').check();
  await page.getByRole('button', { name: 'Update Email Settings' }).click();
  const alert = page.locator('#alert-1');
  await expect(alert).toBeVisible({ timeout: 10000 });
  await expect(alert).toContainText('Settings saved for email');
  console.log(`Email sending suspended for ${email}@wp.tests.openpanel.org`);
}
test('suspend outgoing', async ({ page }) => {
  for (const email of EMAILS) {
    await suspendOutgoing(page, email);
  }
});

async function changePass(page, email) {
  await page.goto(`/emails/edit/${email}@wp.tests.openpanel.org`);
  await expect(page).toHaveURL(/emails\/edit/);
  await page.locator('#generatePassword').click();
  await page.getByRole('button', { name: 'Update Email Settings' }).click();
  const alert = page.locator('#alert-1');
  await expect(alert).toBeVisible({ timeout: 10000 });
  await expect(alert).toContainText('Settings saved for email');
  console.log(`Password changed for ${email}@wp.tests.openpanel.org`);
}
test('change passwords', async ({ page }) => {
  for (const email of EMAILS) {
    await changePass(page, email);
  }
});


async function deleteEmails(page, email) {
  await page.goto(`/emails/delete/${email}@wp.tests.openpanel.org`);
  await expect(page).toHaveURL(/emails\/delete/);
  await page.getByRole('button', { name: 'Confirm Delete' }).click();
  await expect(page).toHaveURL('https://185.119.89.17:2083/emails');
  console.log(`Email account ${email}@wp.tests.openpanel.org has been deleted.`);

}

test('delete created emails', async ({ page }) => {
  for (const email of EMAILS) {
    await deleteEmails(page, email);
  }
});
