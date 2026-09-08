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
  await expect(page).toHaveURL(/\/dashboard/);

  const search = page.locator('#searchInput');
  const dropdown = page.locator('#filteredDropdown');

  await expect(search).toBeVisible();

  await search.fill('testinguser');

  // Alpine uses a 300ms debounced input handler, so let Playwright
  // auto-wait for the rendered dropdown result.
  await expect(dropdown).toBeVisible();

  const userLink = dropdown.locator('a[href="/users/testinguser"]');
  const impersonationLink = dropdown.locator(
    'a[href="/login/token/testinguser"]'
  );

  await expect(userLink).toBeVisible();
  await expect(userLink).toContainText('testinguser');

  await expect(impersonationLink).toBeVisible();
  await expect(impersonationLink).toHaveAttribute(
    'title',
    'Login as testinguser into OpenPanel'
  );

  console.log(
    'search for "testinguser" surfaced a matching user result with an impersonation link'
  );
});

test('searching an existing website surfaces a website result', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard/);

  // Discover a real existing website from the search endpoint.
  const websites = await page.evaluate(async () => {
    const response = await fetch('/search/websites');
    return response.json();
  });

  const siteRows = Array.isArray(websites) ? websites : [];

  test.skip(
    siteRows.length === 0,
    'No websites present on this environment'
  );

  const siteName = String(siteRows[0][0]);

  const search = page.locator('#searchInput');
  const dropdown = page.locator('#filteredDropdown');

  await expect(search).toBeVisible();

  await search.fill(siteName);

  // Search results are populated asynchronously after the debounced input handler.
  await expect(dropdown).toBeVisible();

  const websiteLink = dropdown.locator(
    `a[href="/domains/${siteName}"]`
  );

  await expect(websiteLink).toBeVisible();
  await expect(websiteLink).toContainText(siteName);

  console.log(
    `search for "${siteName}" surfaced a matching website result`
  );
});

test('clearing the search query restores the dropdown results', async ({ page }) => {
  await page.goto('/dashboard');

  const search = page.locator('#searchInput');
  const dropdown = page.locator('#filteredDropdown');
  const results = dropdown.locator('li');

  await expect(search).toBeVisible();

  // Search for something specific.
  await search.fill('Firewall');

  await expect(dropdown).toBeVisible();
  await expect(
    dropdown.getByRole('link', { name: /Firewall/i }).first()
  ).toBeVisible();

  const filteredCount = await results.count();

  // Clear the query.
  await search.fill('');
  await expect(search).toHaveValue('');

  // The dropdown remains open, but the full result set is restored.
  await expect(dropdown).toBeVisible();

  await expect
    .poll(async () => results.count())
    .toBeGreaterThanOrEqual(filteredCount);

  console.log('clearing the search query restored the dropdown results');
});
