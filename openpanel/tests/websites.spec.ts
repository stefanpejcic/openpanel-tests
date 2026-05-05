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


test('wordpress', async ({ page }) => {
  // 1. install
  await page.goto('/wordpress/install');
  await page.fill('input[name="website_name"]', 'My Site');
  await page.fill('input[name="site_description"]', 'another site testing');
  await page.fill('input[name="admin_username"]', 'admin');
  await page.fill('input[name="admin_password"]', 'b67sf97sfs3sedf45');
  await page.locator('#domain_id').selectOption('wp.tests.openpanel.org');
  await page.locator('#wordpress_version').selectOption('6.9.4'); // TODO: randomize!
  await page.locator('#installButton').click();

  await expect(page.locator('text=WordPress installation complete!')).toBeVisible({ timeout: 30000 });

  // 2. visit installed site
  await page.goto('http://wp.tests.openpanel.org');
  await expect(page.locator('body')).toContainText('Hello world!');

  
  // 3. test links on /wordpress

  // 4. test WP manager on /website?domain=wp.tests.openpanel.org/44444

  // 5. test remove
  await page.goto('/website?domain=website-builder.tests.openpanel.org');
  await page.locator('a#remove-tab').click();
  await page.locator('button#delete-site').click();
  await page.locator('button#confirm-delete-site').click();
  await expect(page.locator('text=Website deleted successfully!')).toBeVisible({ timeout: 30000 });
  await page.goto('/sites');
  await expect(page.locator('tr#site-row-website-builder.tests.openpanel.org')).not.toBeVisible();
  console.log('website uninstall is working');

  // 6. install again and test detach
  // TODO: remove files

});




test('website builder', async ({ page }) => {
  // 1. install
  await page.goto('/website-builder/install');
  await page.locator('#domain_id').selectOption('website-builder.tests.openpanel.org');
  await page.locator('#installButton').click();
  await expect(page.locator('text=Website creation completed!')).toBeVisible({ timeout: 60000 });
  await expect(page).toHaveURL(/\/website-builder\/edit\?domain=website-builder\.tests\.openpanel\.org\/.+/);

  // 2. test edit and save
  await page.locator('span.gjs-pn-btn.fa.fa-save').click();
  await expect(page.locator('text=Saved successfully!')).toBeVisible({ timeout: 30000 });
  await page.goto('http://website-builder.tests.openpanel.org/');
  await expect(page.locator('body')).toContainText('tailwindcss');

  // 3. test view
  await page.goto('/sites');
  const table = page.locator('tbody.divide-y.divide-gray-200.dark\\:divide-gray-800');
  await expect(table).toBeVisible();
  await expect(page.locator('tr#site-row-website-builder.tests.openpanel.org')).toBeVisible();
  console.log('website install is working');
  await expect(page.locator('a[href="/website-builder/edit?domain=website-builder.tests.openpanel.org"]')).toBeVisible();
  console.log('website edit is working');

  // 4. test remove
  await page.goto('/website?domain=website-builder.tests.openpanel.org');
  await page.locator('a#remove-tab').click();
  await page.locator('button#delete-site').click();
  await page.locator('button#confirm-delete-site').click();
  await expect(page.locator('text=Website deleted successfully!')).toBeVisible({ timeout: 30000 });
  await page.goto('/sites');
  await expect(page.locator('tr#site-row-website-builder.tests.openpanel.org')).not.toBeVisible();
  console.log('website uninstall is working');

  // 5. install again and test detach
  await page.goto('/website-builder/install');
  await page.locator('#domain_id').selectOption('website-builder.tests.openpanel.org');
  await page.locator('#installButton').click();
  await expect(page.locator('text=Website creation completed!')).toBeVisible({ timeout: 60000 });
  await expect(page).toHaveURL(/\/website-builder\/edit\?domain=website-builder\.tests\.openpanel\.org\/.+/);

  await page.goto('/website?domain=website-builder.tests.openpanel.org');
  await page.locator('a#remove-tab').click();
  await page.locator('button#detach-site').click();
  await page.locator('button#confirm-detach-site').click();
  await expect(page.locator('text=Website detached successfully!')).toBeVisible({ timeout: 30000 });
  await page.goto('/sites');
  await expect(page.locator('tr#site-row-website-builder.tests.openpanel.org')).not.toBeVisible();
  console.log('website detach is working');
  // TODO: remove files

});
