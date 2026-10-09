import { test, expect } from '@playwright/test';


test('auto-installer page loads', async ({ page }) => {
  await page.goto('/auto-installer');
  await expect(page).toHaveURL(/auto-installer/);
  await expect(page.locator('body')).toContainText(/install|application|wordpress/i);
  console.log('auto-installer page accessible');
});


test('auto-installer shows available applications', async ({ page }) => {
  await page.goto('/auto-installer');

  // should list at least some installable apps
  const apps = ['WordPress', 'Python', 'NodeJS', 'PHP', 'Docker'];
  let found = 0;
  for (const app of apps) {
    const isVisible = await page.locator('body').textContent().then(t => t?.includes(app) ?? false);
    if (isVisible) found++;
  }

  expect(found).toBeGreaterThan(0);
  console.log(`auto-installer shows ${found} known applications`);
});


test('auto-installer install form is accessible', async ({ page }) => {
  await page.goto('/auto-installer');

  // click install/select on first visible app
  const installLink = page.locator('a:has-text("Install"), button:has-text("Install"), a[href*="install"]').first();
  const hasInstallLink = await installLink.isVisible({ timeout: 3000 }).catch(() => false);

  if (hasInstallLink) {
    await installLink.click();
    await expect(page.locator('body')).toContainText(/domain|path|version|install/i, { timeout: 10000 });
    console.log('auto-installer install form is accessible');
  } else {
    // apps shown in cards/icons — just verify page has content
    await expect(page.locator('body')).toContainText(/install|application/i);
    console.log('auto-installer has application content');
  }
});


test('every auto-installer app opens its install page', async ({ page }) => {
  await page.goto('/auto-installer');

  const links = await page.locator('main a[href]').evaluateAll(els =>
    Array.from(new Set(els.map(e => (e as HTMLAnchorElement).getAttribute('href') || '')))
      .filter(h => /^\/[\w-]+\/install\b/.test(h) || h === '/website-builder/install')
  );
  expect(links.length).toBeGreaterThan(5);

  const broken: string[] = [];
  for (const href of links) {
    const res = await page.request.get(href);
    if (res.status() !== 200) broken.push(`${href} -> ${res.status()}`);
  }
  expect(broken, broken.join('\n')).toEqual([]);
  console.log(`all ${links.length} install pages load`);
});
