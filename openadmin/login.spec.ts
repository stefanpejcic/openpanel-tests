import { test, expect, request as playwrightRequest } from '@playwright/test';

test('all keyboard shortcuts work correctly', async ({ page }) => {
  // 🔐 LOGIN
  await page.goto('https://185.193.66.252:2087/login');
  await page.getByRole('textbox', { name: 'Username' }).fill('stefan');
  await page.getByRole('textbox', { name: 'Password' }).fill('stefan');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/.*dashboard/);
  await page.waitForTimeout(1000);

  // 🍪 Create API context WITH auth cookies
  const apiContext = await playwrightRequest.newContext({
    storageState: await page.context().storageState(),
  });

  const response = await apiContext.get('https://185.193.66.252:2087/shortcuts.json');
  const shortcuts = await response.json();

  const parseShortcut = (shortcut: string) =>
    shortcut
      .replace(/ctrl/g, 'Control')
      .replace(/shift/g, 'Shift')
      .replace(/escape/g, 'Escape')
      .split('+')
      .map(k => (k.length === 1 ? k.toLowerCase() : k))
      .join('+');

  let logoutCombo: string | null = null;

  for (const [combo, path] of Object.entries(shortcuts) as [string, string][]) {
    if (path === '/logout') {
      logoutCombo = combo;
      continue;
    }

    // Navigate back to dashboard before each shortcut
    await page.goto('https://185.193.66.252:2087/dashboard');
    await expect(page).toHaveURL(/dashboard/);
    await page.locator('body').click();

    // Press shortcut and wait for navigation
    await Promise.all([
      page.waitForURL(`**${path}`, { timeout: 10000 }),
      page.keyboard.press(parseShortcut(combo)),
    ]);

    // ✅ 1. Verify URL contains expected path
    expect(page.url()).toContain(path);

    // ✅ 2. Verify we're NOT on the login page (session didn't expire)
    expect(page.url()).not.toContain('/login');

    // ✅ 3. Verify page loaded successfully — no error states
    await expect(page.locator('body')).not.toBeEmpty();

    // ✅ 4. Verify network didn't return an error page
    //    (checks that a common error indicator is NOT present)
    await expect(page.locator('text=404')).not.toBeVisible({ timeout: 2000 });
    await expect(page.locator('text=403')).not.toBeVisible({ timeout: 2000 });
    await expect(page.locator('text=500')).not.toBeVisible({ timeout: 2000 });

    // ✅ 5. Wait for the page's main content container to appear
    //    Adjust the selector to match your app's main layout element
    await expect(
      page.locator('main, [role="main"], #app, #content, .page-content').first()
    ).toBeVisible({ timeout: 5000 });

    console.log(`✅ ${combo} → ${path} loaded successfully`);
  }

  // Test logout last
  if (logoutCombo) {
    await page.goto('https://185.193.66.252:2087/dashboard');
    await page.locator('body').click();
    await Promise.all([
      page.waitForURL(/login/, { timeout: 5000 }),
      page.keyboard.press(parseShortcut(logoutCombo)),
    ]);
    await expect(page).toHaveURL(/login/);
    console.log(`✅ ${logoutCombo} → /logout redirected to login`);
  }
});
