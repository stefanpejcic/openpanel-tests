import { test, expect } from '@playwright/test';
import fs from 'fs';
import os from 'os';
import path from 'path';

async function navigateToMongoDBPage(page: any) {
  await page.goto('/mongodb');
  await expect(page).toHaveURL(/mongodb/);
}

async function expectDatabaseInTable(page: any, dbName: string) {
  const row = page.locator('tr', { hasText: dbName });
  await expect(row).toBeVisible();
}

async function expectDatabaseNotInTable(page: any, dbName: string) {
  await expect(page.locator('tr', { hasText: dbName })).toHaveCount(0);
}


// ACCESS
test('list databases', async ({ page }) => {
  await navigateToMongoDBPage(page);
  await expect(page.locator('body')).toContainText(/create your first database|no databases/i, { timeout: 25000 });
  console.log('mongodb initialized');
});


test('create database', async ({ page }) => {
  await navigateToMongoDBPage(page);
  await page.getByRole('link', { name: 'New Database' }).click();
  await page.getByRole('textbox', { name: 'Database Name' }).fill('stefan_mongo');
  await page.getByRole('button', { name: 'Create Database' }).click();
  await expect(page.locator('body')).toContainText(/successfully created/i, { timeout: 25000 });
  await expectDatabaseInTable(page, 'stefan_mongo');
  console.log('mongodb database created');
});


test('list users', async ({ page }) => {
  await page.goto('/mongodb/users');
  await expect(page).toHaveURL(/mongodb\/users/);
  await expect(page.locator('body')).toContainText(/users/i);
  console.log('mongodb users page accessible');
});


test('create user', async ({ page }) => {
  await page.goto('/mongodb/user');
  await expect(page).toHaveURL(/mongodb\/user/);
  await page.getByRole('textbox', { name: 'Username' }).fill('stefan_mongo_user');
  await page.getByRole('textbox', { name: 'Password' }).fill('stefan94');
  await page.getByRole('button', { name: 'Create User' }).click();
  await expect(page.locator('body')).toContainText(/successfully created.*stefan_mongo_user/i);
  await page.getByRole('link', { name: 'Back to Users' }).click();
  await expect(page).toHaveURL(/mongodb\/users/);
  await expect(page.locator('body')).toContainText(/stefan_mongo_user/i);
  console.log('mongodb user created');
});


test('change password', async ({ page }) => {
  await page.goto('/mongodb/users');
  await page.getByRole('link', { name: ' Change Password' }).click();
  await expect(page).toHaveURL(/mongodb\/password/);
  await page.locator('#generatePassword').click();
  await page.getByRole('button', { name: 'Change Password' }).click();
  await expect(page).toHaveURL(/mongodb\/users/);
  await expect(page.locator('body')).toContainText(/successfully changed password/i);
  console.log('mongodb change password working');
});


test('assign user to database', async ({ page }) => {
  await page.goto('/mongodb/users');
  await page.getByRole('link', { name: 'Assign User to Database' }).click();
  await expect(page).toHaveURL(/mongodb\/assign/);
  await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/mongodb/info') && resp.status() === 200),
    page.getByRole('link', { name: 'Assign User to Database' }).click(),
  ]);
  await page.locator('select[name="db_user"]').selectOption('stefan_mongo_user');
  await page.locator('select[name="database_name"]').selectOption('stefan_mongo');
  await page.locator('select[name="role"]').selectOption('readWrite');
  await page.getByRole('button', { name: 'Assign User to Database' }).click();
  await expect(page.locator('body')).toContainText(/Successfully added a user/i);
  console.log('mongodb user assigned to database');
});


test('revoke user from database', async ({ page }) => {
  await page.goto('/mongodb/users');
  await page.getByRole('link', { name: 'Remove User from DB' }).click();
  await expect(page).toHaveURL(/mongodb\/remove/);
  await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/mongodb/info') && resp.status() === 200),
    page.getByRole('link', { name: 'Remove User from DB' }).click(),
  ]);
  await page.locator('select[name="db_user"]').selectOption('stefan_mongo_user');
  await page.locator('select[name="database_name"]').selectOption('stefan_mongo');
  await page.locator('select[name="role"]').selectOption('readWrite');
  await page.getByRole('button', { name: 'Remove User from Database' }).click();
  await expect(page.locator('body')).toContainText(/successfully revoked|removed/i);
  console.log('mongodb user revoked from database');
});


test('database wizard', async ({ page }) => {
  await page.goto('/mongodb/wizard');
  await expect(page).toHaveURL(/mongodb\/wizard/);
  await page.locator('input[name="database_name"]').fill('mongo_proba');
  await page.locator('input[name="db_user"]').fill('mongo_novi_user');
  await page.locator('#password').fill('stefan456g7dsd');
  await page.locator('select[name="role"]').selectOption('readWrite');
  await page.getByRole('button', { name: 'Create DB, User, and Grant Role' }).click();
  await expect(page.getByText('Successfully created database')).toBeVisible();
  await expect(page).toHaveURL(/mongodb/);
  const row = page.locator('#databases-table tr', { hasText: 'mongo_proba' });
  await expect(row).toContainText(/mongo_proba/i);
  console.log('mongodb database wizard is working');
});


// IMPORT
// Unlike MySQL/PostgreSQL, a real MongoDB dump is a binary mongodump archive
// (not a plain-text SQL file), so it can't be hand-written here the way the
// SQL import tests do. This only exercises the page/form itself - the
// selector populating from /mongodb/info and the file input's extension
// filter - not a full mongorestore round trip.
test('import page loads and rejects wrong file type', async ({ page }) => {
  const tempFilePath = path.join(os.tmpdir(), 'test-mongo-import.sql');
  fs.writeFileSync(tempFilePath, 'not a mongodump archive');

  await page.goto('/mongodb/import/stefan_mongo');
  await expect(page).toHaveURL(/mongodb\/import\/stefan_mongo/);
  await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/mongodb/info') && resp.status() === 200),
    page.getByRole('link', { name: 'Import' }).click(),
  ]);
  await expect(page.locator('select[name="database_name"]')).toHaveValue('stefan_mongo');
  await expect(page.locator('input[name="db_file"]')).toHaveAttribute('accept', '.archive,.gz');
  console.log('mongodb import page working');
});


test('delete user', async ({ page }) => {
  await page.goto('/mongodb/users');
  const deleteButtons = page.locator('button.btn-danger');
  const count = await deleteButtons.count();
  expect(count).toBeGreaterThan(0);
  await deleteButtons.first().click();
  const confirmButton = page.locator('button.btn-dark');
  await expect(confirmButton.first()).toBeVisible();
  await confirmButton.first().click();
  await expect(page.locator('body')).toContainText(/successfully deleted/i);
  console.log('mongodb delete user is working');
});


test('delete database', async ({ page }) => {
  await navigateToMongoDBPage(page);
  const dbName = 'stefan_mongo';
  const row = page.locator('tr', { hasText: dbName });
  const deleteButton = row.locator('button.btn-danger');
  await expect(deleteButton).toBeVisible();
  await deleteButton.click();
  const confirmButton = page.locator('button.btn-dark');
  await expect(confirmButton).toBeVisible();
  await confirmButton.click();
  await expect(page.locator('body')).toContainText(/successfully deleted/i);
  await expectDatabaseNotInTable(page, dbName);
  console.log('mongodb database deleted');
});
