import { test, expect } from '@playwright/test';

test('create domain', async ({ page }) => {
  await page.goto('/domains');
  await expect(page).toHaveURL(/domains/);

  await page.getByText('Add Domain', { exact: true }).first().click();

  await page.locator('#domain').fill('example.test.rs');
  await page.locator('#username').fill('testinguser');
  // aa-users deletes testinguser at its end, and on a cluster master other servers' users show as "name (server)"
  const owner = page.getByRole('option').filter({ hasText: /^\s*testinguser\s*$/ });
  await page.waitForTimeout(1_500);
  test.skip((await owner.count()) === 0, 'testinguser does not exist on this server');
  await owner.first().click();

  await page.locator('form:has(#username) button[type="submit"]').click();

  // Verify the domain was added
  await expect(page.locator('tr[data-domain="example.test.rs"]')).toBeAttached({ timeout: 120_000 });

  // it's only a check, the domain goes away again
  await page.goto('/domains');
  const csrf = await page.locator('input[name="csrf_token"]').first().inputValue();
  await page.request.post('/domains/delete/toggle', { form: { csrf_token: csrf, domain_name: 'example.test.rs' }, headers: { Referer: page.url() } });
  await page.goto('/domains');
  await expect(page.locator('tr[data-domain="example.test.rs"]')).toHaveCount(0, { timeout: 60_000 });
});
