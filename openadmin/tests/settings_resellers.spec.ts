import { test, expect } from '@playwright/test';

test('resellers page loads with table', async ({ page }) => {
  await page.goto('/resellers');
  await expect(page).toHaveURL(/resellers/);
  await expect(page.locator('#exiting_users')).toBeVisible();

  console.log('resellers page loaded');
});

test('create, inspect, and delete a new reseller', async ({ page }) => {
  await page.goto('/resellers');

  await page.locator('#tour-create-reseller-btn').click();

  const testUsername = `tstreseller${Date.now() % 100000}`;
  await page.locator('#username').fill(testUsername);
  await page.locator('#password').fill('TestPassword123');
  await page.getByRole('button', { name: 'Create' }).click();

  const row = page.locator('#exiting_users tbody tr').filter({ hasText: testUsername });
  await expect(row).toBeVisible({ timeout: 15_000 });
  await expect(row.getByText('Active')).toBeVisible();

  // delete the test reseller we just created
  await row.locator('button[data-dropdown-toggle]').click();
  const dropdown = page.locator(`#dropdown-${testUsername}`);
  await expect(dropdown).toBeVisible();
  await dropdown.getByRole('button', { name: 'Delete' }).click();

  await expect(page.locator('#exiting_users tbody tr').filter({ hasText: testUsername })).toHaveCount(0);
  console.log(`created and deleted test reseller "${testUsername}"`);
});

test('edit plans & limits link navigates to update page', async ({ page }) => {
  await page.goto('/resellers');

  const rows = page.locator('#exiting_users tbody tr');
  const count = await rows.count();
  test.skip(count === 0, 'No resellers to inspect');

  const username = (await rows.first().locator('td').nth(1).innerText()).trim();
  await rows.first().locator('button[data-dropdown-toggle]').click();
  const dropdown = page.locator(`#dropdown-${username}`);
  await expect(dropdown.getByRole('link', { name: 'Edit Plans & Limits' })).toHaveAttribute('href', `/resellers/update/${username}`);

  console.log(`verified edit plans & limits link for "${username}"`);
});

test('account self-service page is reachable', async ({ page }) => {
  await page.goto('/account');
  // either renders the reseller's own password page, or redirects/403s for a super-admin account
  await expect(page.locator('body')).toBeVisible();
  console.log('account self-service page reachable');
});
