import { test, expect, request as playwrightRequest } from '@playwright/test';

test('all keyboard shortcuts work correctly', async ({ page }) => {
  // 🔐 LOGIN
  await page.goto('https://185.193.66.252:2087/login');
  await page.getByRole('textbox', { name: 'Username' }).fill('stefan');
  await page.getByRole('textbox', { name: 'Password' }).fill('stefan');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/.*dashboard/);

  await page.waitForTimeout(1000);

  
  // 🍪 create API context WITH auth
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

  for (const [combo, path] of Object.entries(shortcuts)) {
    if (path === '/logout') {
      logoutCombo = combo;
      continue;
    }

    await page.goto('https://185.193.66.252:2083/dashboard');
    await page.locator('body').click();
    await page.keyboard.press(parseShortcut(combo));

    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }

  if (logoutCombo) {
    await page.keyboard.press(parseShortcut(logoutCombo));
    await expect(page).toHaveURL(/login/);
  }
});
