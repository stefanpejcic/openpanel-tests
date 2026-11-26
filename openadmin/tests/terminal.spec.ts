import { test, expect } from '@playwright/test';

// NOTE: the live shell is driven over a raw WebSocket with a custom init/resize
// protocol -- not something plain Playwright page actions can usefully drive. We only
// verify the page loads, is access-gated, and shows the expected xterm.js scaffold;
// we don't attempt to type commands into the terminal.
//
// Opening the terminal now needs a fresh password (it runs as root): the page shows a
// #term-auth overlay, and the websocket only connects after POST /terminal/authorize
// returns a token. The tests below cover that gate.

test('terminal page loads for an admin user with expected UI elements', async ({ page }) => {
  const response = await page.goto('/terminal');

  // route may 403 (disabled flag-file or non-admin) -- only assert scaffold when it succeeds
  test.skip(response?.status() === 403, 'Terminal disabled via /root/disable_openadmin_terminal_ui flag-file or current user lacks access');

  await expect(page).toHaveURL(/terminal/);
  await expect(page.locator('#shell')).toBeVisible();
  await expect(page.locator('#term-status')).toBeVisible();
  await expect(page.locator('#status-dot')).toBeVisible();
  await expect(page.locator('#status-text')).toBeVisible();
  await expect(page.locator('#terminal')).toBeVisible();

  console.log('terminal page loaded with shell selector and status scaffold');
});

test('reconnect button is present', async ({ page }) => {
  const response = await page.goto('/terminal');
  test.skip(response?.status() === 403, 'Terminal disabled or current user lacks access');

  await page.waitForLoadState('networkidle');
  await expect(page.locator('#reconnect-btn')).toBeAttached();
  console.log('reconnect button present');
});

test('shell selector offers bash/sh options', async ({ page }) => {
  const response = await page.goto('/terminal');
  test.skip(response?.status() === 403, 'Terminal disabled or current user lacks access');

  const options = page.locator('#shell option');
  const count = await options.count();
  expect(count).toBeGreaterThan(0);

  console.log(`shell selector offers ${count} options`);
});


test('web terminal asks for the password before connecting', async ({ page }) => {
  const response = await page.goto('/terminal');
  test.skip(response?.status() === 403, 'Terminal disabled or current user lacks access');

  // the password overlay is shown and the session is not connected yet
  await expect(page.locator('#term-auth')).toBeVisible();
  await expect(page.locator('#term-auth-pw')).toBeVisible();
  await expect(page.locator('#status-text')).not.toHaveText('Connected');
  console.log('terminal gated behind the password prompt');
});

test('wrong password is rejected and keeps the terminal closed', async ({ page }) => {
  const response = await page.goto('/terminal');
  test.skip(response?.status() === 403, 'Terminal disabled or current user lacks access');

  await page.locator('#term-auth-pw').fill('definitely-not-the-password');
  await page.getByRole('button', { name: 'Open terminal' }).click();

  await expect(page.locator('#term-auth-err')).toBeVisible();
  await expect(page.locator('#term-auth')).toBeVisible();
  await expect(page.locator('#status-text')).not.toHaveText('Connected');
  console.log('wrong terminal password rejected');
});

test('correct password opens the terminal', async ({ page }) => {
  const password = process.env.PANEL_PASSWORD;
  test.skip(!password, 'PANEL_PASSWORD not set');

  const response = await page.goto('/terminal');
  test.skip(response?.status() === 403, 'Terminal disabled or current user lacks access');

  await page.locator('#term-auth-pw').fill(password!);
  await page.getByRole('button', { name: 'Open terminal' }).click();

  // the overlay goes away and the websocket connects
  await expect(page.locator('#term-auth')).toBeHidden();
  await expect(page.locator('#status-text')).toHaveText('Connected', { timeout: 15000 });
  console.log('terminal opened after the correct password');
});
