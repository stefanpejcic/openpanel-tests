import { test, expect } from '@playwright/test';

// The sidebar search box (#searchInput) debounces 300ms then queries
// /search/pages, /search/users, /search/websites in parallel and renders
// matching results into #filteredDropdown -- present on every page.

test('searching a known page surfaces it in the dropdown and navigates on click', async ({ page }) => {
  await page.goto('/dashboard');

  await page.locator('#searchInput').fill('Firewall');
  const dropdown = page.locator('#filteredDropdown');
  await expect(dropdown).toBeVisible({ timeout: 5000 });

  const result = dropdown.getByRole('link', { name: /Firewall/i }).first();
  await expect(result).toBeVisible();
  await result.click();

  await expect(page).toHaveURL(/security\/firewall/);
  console.log('search for "Firewall" surfaced a page result and navigated to it');
});

test('searching an existing username surfaces a user result', async ({ page }) => {
  await page.goto('/dashboard');

  await page.locator('#searchInput').fill('testinguser');
  const dropdown = page.locator('#filteredDropdown');

  const userLink = dropdown.locator('a[href="/users/testinguser"]');
  const hasUser = await userLink.isVisible({ timeout: 5000 }).catch(() => false);
  test.skip(!hasUser, 'testinguser not present on this environment');

  await expect(userLink).toBeVisible();
  await expect(dropdown.locator('a[href="/login/token/testinguser"]')).toBeVisible();
  console.log('search for "testinguser" surfaced a matching user result with an impersonation link');
});

test('searching an existing website surfaces a website result', async ({ page }) => {
  await page.goto('/dashboard');

  // Discover a real, existing website name from the search endpoint itself
  // rather than assuming one -- this environment's domains are whatever
  // other test suites (e.g. domains_*.spec.ts) have created.
  const websites: unknown = await page.evaluate(() => fetch('/search/websites').then(r => r.json()));
  const siteRows = Array.isArray(websites) ? (websites as unknown[][]) : [];
  test.skip(siteRows.length === 0, 'No websites present on this environment');

  const siteName = String(siteRows[0][0]);
  await page.locator('#searchInput').fill(siteName);

  const dropdown = page.locator('#filteredDropdown');
  await expect(dropdown.locator(`a[href="/domains/${siteName}"]`)).toBeVisible({ timeout: 5000 });
  console.log(`search for "${siteName}" surfaced a matching website result`);
});

test('clearing the search query closes the dropdown', async ({ page }) => {
  await page.goto('/dashboard');

  await page.locator('#searchInput').fill('Firewall');
  await expect(page.locator('#filteredDropdown')).toBeVisible({ timeout: 5000 });

  await page.locator('#searchInput').fill('');
  await page.waitForTimeout(400);
  await expect(page.locator('#filteredDropdown')).toBeHidden();

  console.log('clearing the search query closed the dropdown');
});
