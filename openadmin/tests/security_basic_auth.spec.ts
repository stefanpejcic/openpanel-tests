import { test, expect } from '@playwright/test';

test('basic auth settings page loads with expected fields', async ({ page }) => {
  await page.goto('/security/basic_auth');
  await expect(page).toHaveURL(/security\/basic_auth/);

  await expect(page.locator('#basic_auth')).toBeVisible();
  await expect(page.locator('[name="basic_auth_username"]')).toBeVisible();
  await expect(page.locator('#basic_auth_password')).toBeVisible();
  await expect(page.locator('#generatePassword')).toBeVisible();
  await expect(page.locator('#togglePassword')).toBeVisible();
  await expect(page.locator('#tour-save-basic-auth-btn')).toBeVisible();

  console.log('basic auth page loaded with expected fields');
});

test('generate password button fills password field', async ({ page }) => {
  await page.goto('/security/basic_auth');

  const passwordField = page.locator('#basic_auth_password');
  await passwordField.fill('');
  await page.locator('#generatePassword').click();

  const value = await passwordField.inputValue();
  expect(value.length).toBe(16);
  await expect(passwordField).toHaveAttribute('type', 'text');

  console.log('generate password populated a 16-char password and revealed it');
});

test('toggle password visibility button switches input type', async ({ page }) => {
  await page.goto('/security/basic_auth');

  const passwordField = page.locator('#basic_auth_password');
  await expect(passwordField).toHaveAttribute('type', 'password');

  await page.locator('#togglePassword').click();
  await expect(passwordField).toHaveAttribute('type', 'text');

  await page.locator('#togglePassword').click();
  await expect(passwordField).toHaveAttribute('type', 'password');

  console.log('toggle password visibility working');
});

test('save basic auth settings persists username (kept disabled)', async ({ page }) => {
  // NOTE: intentionally never sets basic_auth select to "yes" here -- enabling it would
  // require basic-auth credentials on every subsequent request and could lock the
  // Playwright session (and CI) out of OpenAdmin since the storageState has no such header.
  await page.goto('/security/basic_auth');

  await expect(page.locator('#basic_auth')).toHaveValue('no');

  const usernameField = page.locator('[name="basic_auth_username"]');
  const testUsername = `testbasicauth${Date.now() % 100000}`;
  await usernameField.fill(testUsername);
  await page.locator('#basic_auth_password').fill('TestPassword123');

  await page.locator('#tour-save-basic-auth-btn').click();
  await expect(page.getByText('Basic_auth settings for OpenAdmin edited successfully.')).toBeVisible();

  await page.reload();
  await expect(page.locator('[name="basic_auth_username"]')).toHaveValue(testUsername);
  await expect(page.locator('#basic_auth')).toHaveValue('no');

  console.log('basic auth settings saved and verified while staying disabled');
});

// with basic auth on (after the restart OpenAdmin needs), requests without the login get 401 and with it go through,
// it's switched off again in finally with the login so the suite can't be locked out
test('basic auth protects OpenAdmin once it restarts', async ({ page, browser }, testInfo) => {
  test.setTimeout(600_000);
  const user = `pwba${Date.now() % 100000}`;
  const pass = 'Pw-Basic-Auth-2026!';
  const base = process.env.BASE_URL!;

  const restartAdmin = async (p: typeof page) => {
    await p.goto('/services');
    const csrf = await p.locator('input[name="csrf_token"]').first().inputValue();
    await p.request.post('/service/restart/admin', { form: { csrf_token: csrf }, headers: { Referer: p.url() }, timeout: 15_000 }).catch(() => null);
    await expect.poll(async () => (await p.request.get('/login', { timeout: 5_000 }).catch(() => null))?.status() ?? 0, { timeout: 180_000, intervals: [3_000] }).not.toBe(0);
  };
  const setBasicAuth = async (p: typeof page, on: boolean) => {
    await p.goto('/security/basic_auth');
    await p.locator('#basic_auth').selectOption(on ? 'yes' : 'no');
    await p.locator('[name="basic_auth_username"]').fill(user);
    await p.locator('#basic_auth_password').fill(pass);
    await p.locator('#tour-save-basic-auth-btn').click();
    await expect(p.getByText('Basic_auth settings for OpenAdmin edited successfully.')).toBeVisible();
  };

  // a page that always sends the login, used from here on
  const ctx = await browser.newContext({ ...(testInfo.project.use as any), httpCredentials: { username: user, password: pass } });
  const withLogin = await ctx.newPage();
  try {
    await setBasicAuth(page, true);
    await restartAdmin(withLogin);
    const anon = await browser.newContext({ ignoreHTTPSErrors: true });
    expect((await anon.request.get(`${base}/login`)).status()).toBe(401);
    await anon.close();
    expect((await withLogin.request.get('/login')).status()).toBe(200);
  } finally {
    await setBasicAuth(withLogin, false);
    await restartAdmin(withLogin);
    await ctx.close();
  }
  const anon = await browser.newContext({ ignoreHTTPSErrors: true });
  expect((await anon.request.get(`${base}/login`)).status()).toBe(200);
  await anon.close();
});
