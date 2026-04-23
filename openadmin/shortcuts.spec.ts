import { test, expect, request as playwrightRequest } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'https://185.193.66.252:2087';
const USERNAME  = process.env.USERNAME  ?? 'stefan';
const PASSWORD  = process.env.PASSWORD  ?? 'stefan';

test('all keyboard shortcuts work correctly', async ({ page }) => {
  // LOGIN
  await page.goto(`${BASE_URL}/login`);
  await page.getByRole('textbox', { name: 'Username' }).fill(USERNAME);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/.*dashboard/);
  await page.waitForTimeout(1000);

  // SHORTCUTS
  const apiContext = await playwrightRequest.newContext({
    storageState: await page.context().storageState(),
  });
  const response = await apiContext.get(`${BASE_URL}/shortcuts.json`);
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
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page).toHaveURL(/dashboard/);
    await page.locator('body').click();
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load', timeout: 10000 }),
      page.keyboard.press(parseShortcut(combo)),
    ]);
    expect(page.url()).toContain(path);
    console.log(`${combo} → ${path} loaded successfully`);
  }

  if (logoutCombo) {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.locator('body').click();
    await Promise.all([
      page.waitForURL(/login/, { timeout: 5000 }),
      page.keyboard.press(parseShortcut(logoutCombo)),
    ]);
    await expect(page).toHaveURL(/login/);
    console.log(`${logoutCombo} → /logout redirected to login`);
  }
});
