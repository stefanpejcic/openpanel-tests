import { test, expect } from '@playwright/test';

test('all keyboard shortcuts work correctly', async ({ page, request }) => {
  // 🔐 LOGIN
  await page.goto('https://185.193.66.252:2087/login');
  await page.getByRole('textbox', { name: 'Username' }).fill('stefan');
  await page.getByRole('textbox', { name: 'Password' }).fill('stefan');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/.*dashboard/);

  // 🍪 authenticated request
  const context = await request.newContext({
    storageState: await page.context().storageState(),
  });

  const response = await context.get('https://185.193.66.252:2087/shortcuts.json');
  const shortcuts = await response.json();

  // helper
  const parseShortcut = (shortcut: string) => {
    return shortcut
      .replace(/ctrl/g, 'Control')
      .replace(/shift/g, 'Shift')
      .replace(/escape/g, 'Escape')
      .split('+')
      .map(key => key.length === 1 ? key.toLowerCase() : key)
      .join('+');
  };

  let logoutCombo: string | null = null;

  // ▶️ test all except logout
  for (const [combo, path] of Object.entries(shortcuts)) {
    if (path === '/logout') {
      logoutCombo = combo;
      continue;
    }

    await page.goto('https://185.193.66.252:2083/dashboard');

    await page.keyboard.press(parseShortcut(combo));

    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }

  // 🚪 logout last
  if (logoutCombo) {
    await page.keyboard.press(parseShortcut(logoutCombo));
    await expect(page).toHaveURL(/login/);
  }
});
