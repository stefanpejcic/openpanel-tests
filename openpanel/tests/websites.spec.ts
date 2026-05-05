import { test, expect } from '@playwright/test';

test('auto-installer page has install links', async ({ page }) => {
  await page.goto('/auto-installer');

  const expectedHrefs = [
    '/wordpress/install',
    '/website-builder/install',
    '/pm2/install#python',
    '/pm2/install#node',
  ];

  for (const href of expectedHrefs) {
    const links = page.locator(`a[href="${href}"]`);
    await expect(links.first()).toBeVisible();
  }

  console.log('all links present);  
});


test('website builder', async ({ page }) => {
  // 1. Open installer
  await page.goto('/website-builder/install');
  // 2. Select domain
  await page.locator('#domain_id').selectOption('website-builder.tests.openpanel.org');
  // 3. Install
  await page.locator('#installButton').click();
  // 4. Success message
  await expect(page.locator('text=Website creation completed!')).toBeVisible({ timeout: 60000 });
  // 5. Redirect check (dynamic ID allowed)
  await expect(page).toHaveURL(/\/website-builder\/edit\?domain=website-builder\.tests\.openpanel\.org\/.+/);
  // 6. Save inside builder
  await page.locator('span.gjs-pn-btn.fa.fa-save').click();
  // 7. Save confirmation
  await expect(page.locator('text=Saved successfully!')).toBeVisible({ timeout: 30000 });
  // 8. Public site check
  await page.goto('http://website-builder.tests.openpanel.org/');
  await expect(page.locator('body')).toContainText('tailwindcss');
  // 9. Go to sites list
  await page.goto('/sites');
  // 10. Assert table contains installed sites section
  const table = page.locator('tbody.divide-y.divide-gray-200.dark\\:divide-gray-800');
  await expect(table).toBeVisible();
  // 11. Expect created row to exist
  await expect(page.locator('tr#site-row-website-builder.tests.openpanel.org')).toBeVisible();
  console.log('website install is working');
  // 12. Ensure edit link exists
  await expect(page.locator('a[href="/website-builder/edit?domain=website-builder.tests.openpanel.org"]')).toBeVisible();
  console.log('website edit is working');
  // 13. Navigate to site management page
  await page.goto('/website?domain=website-builder.tests.openpanel.org');
  // 14. Open remove/delete tab
  await page.locator('a#remove-tab').click();
  // 15. Click delete site button
  await page.locator('button#delete-site').click();
  // 16. Confirm deletion
  await page.locator('button#confirm-delete-site').click();
  // 17. Expect success message
  await expect(page.locator('text=Website deleted successfully!')).toBeVisible({ timeout: 30000 });
  // 18. Verify row is gone from the table
  await page.goto('/sites');
  await expect(page.locator('tr#site-row-website-builder.tests.openpanel.org')).not.toBeVisible();
  console.log('website uninstall is working');

  // TODO: cover detach also!
});

