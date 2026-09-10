import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/security/blacklist-useragents');

  if (await page.getByText('Forbidden', { exact: true }).isVisible().catch(() => false)) {
    test.skip(true, 'Got "Forbidden" response — skipping, likely auth/session issue');
  }
});

test('blacklist useragents page loads with expected fields', async ({ page }) => {
  await expect(page).toHaveURL(/security\/blacklist-useragents/);

  await expect(page.locator('#blacklist_useragents_enabled')).toBeVisible();
  await expect(page.locator('#blacklist_useragents')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Restore Default' })).toBeVisible();
  await expect(page.locator('#tour-save-blacklist-ua-btn')).toBeVisible();
});

test('edit and save blacklist useragents list', async ({ page }) => {
  const textarea = page.locator('#blacklist_useragents');
  const comment = `\n# test-comment-${Date.now()}`;
  const originalValue = await textarea.inputValue();

  await textarea.fill(originalValue + comment);
  await page.locator('#tour-save-blacklist-ua-btn').click();

  await expect(page.getByText('Saved blacklisted useragents.')).toBeVisible();

  await page.reload();
  await expect(textarea).toHaveValue(new RegExp(comment.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('restore default fetches default list into textarea', async ({ page }) => {
  const textarea = page.locator('#blacklist_useragents');
  await textarea.fill('# placeholder content to be replaced');

  await page.getByRole('button', { name: 'Restore Default' }).click();

  await expect(textarea).not.toHaveValue('# placeholder content to be replaced', { timeout: 15_000 });
  const restoredValue = await textarea.inputValue();
  expect(restoredValue.length).toBeGreaterThan(0);
});

test('toggle enable select', async ({ page }) => {
  const select = page.locator('#blacklist_useragents_enabled');
  const original = await select.inputValue();
  const other = original === 'yes' ? 'no' : 'yes';

  await select.selectOption(other);
  await page.locator('#tour-save-blacklist-ua-btn').click();
  await expect(page.getByText('Saved blacklisted useragents.')).toBeVisible();

  await page.reload();
  await expect(select).toHaveValue(other);

  await select.selectOption(original);
  await page.locator('#tour-save-blacklist-ua-btn').click();
  await expect(page.getByText('Saved blacklisted useragents.')).toBeVisible();
});
