import { test, expect, type Page } from '@playwright/test';
import { createUser, deleteUser, loginAsUser, openUserPanel, withAdminPage } from '../op-settings';

// Settings > PHP: the options list is what users get on PHP > Options, the default php.ini files
// are copied into accounts created afterwards, the original files go back at the end

const stamp = Date.now() % 100000;
const NEW_USER = `pwphp${stamp}`;
const OPTION = 'session.gc_maxlifetime';
let originalOptions = '';
let originalIni: Record<string, string> = {};

async function saveField(page: Page, name: string, value: string, flash: string) {
  await page.goto('/settings/php');
  const field = page.locator(`textarea[name="${name}"]`);
  // the php.ini editors are collapsed, the value is set directly and the form submitted
  await field.evaluate((el, v) => { (el as HTMLTextAreaElement).value = v; }, value);
  await field.evaluate(el => (el as HTMLTextAreaElement).form!.requestSubmit());
  await expect(page.getByText(flash)).toBeVisible({ timeout: 30_000 });
}

async function read(page: Page, name: string) {
  await page.goto('/settings/php');
  return page.locator(`textarea[name="${name}"]`).inputValue();
}

test.beforeAll(async ({ browser }, testInfo) => {
  await withAdminPage(browser, testInfo, async page => {
    originalOptions = await read(page, 'options');
    for (const k of await page.locator('textarea[name^="php"]').evaluateAll(t => t.map(x => (x as HTMLTextAreaElement).name))) {
      originalIni[k] = await page.locator(`textarea[name="${k}"]`).inputValue();
    }
  });
});

test.afterAll(async ({ browser }, testInfo) => {
  test.setTimeout(300_000);
  await withAdminPage(browser, testInfo, async page => {
    await deleteUser(page, NEW_USER);
    if (originalOptions) await saveField(page, 'options', originalOptions, 'PHP options saved successfully!');
    for (const [k, v] of Object.entries(originalIni)) {
      if (await read(page, k) !== v) await saveField(page, k, v, `${k} INI file saved successfully!`);
    }
  });
});

test('every installed PHP version has a default php.ini', async ({ page }) => {
  await page.goto('/settings/php');
  const keys = Object.keys(originalIni);
  expect(keys.length).toBeGreaterThan(0);
  for (const k of keys) expect(originalIni[k], k).toContain('[PHP]');
});

test('the options list is what users can change on PHP > Options', async ({ page, browser }, testInfo) => {
  const lines = originalOptions.split('\n').map(l => l.trim()).filter(Boolean).filter(l => l !== OPTION);
  await saveField(page, 'options', [...lines, OPTION].join('\n'), 'PHP options saved successfully!');
  expect(await read(page, 'options')).toContain(OPTION);

  // read on every request, no restart
  const user = await openUserPanel(browser, testInfo);
  await user.goto('/php/options');
  await expect(user.locator('main')).toContainText(OPTION);

  await saveField(page, 'options', lines.join('\n'), 'PHP options saved successfully!');
  await user.reload();
  await expect(user.locator('main')).not.toContainText(OPTION);
  await user.context().close();
});

test('a new account gets the default php.ini', async ({ page, browser }, testInfo) => {
  test.setTimeout(480_000);
  // the account's default version, its php.ini is the one users open first
  await page.goto('/settings/defaults');
  const def = await page.locator('select[name="DEFAULT_PHP_VERSION"]').inputValue();
  const key = `php${def.replace('.', '')}`;
  test.skip(!(key in originalIni), `no default php.ini for ${def}`);
  const marker = `; pw-ini-${stamp}`;
  await saveField(page, key, `${originalIni[key].trimEnd()}\n${marker}\n`, `${key} INI file saved successfully!`);
  expect(await read(page, key)).toContain(marker);

  await createUser(page, NEW_USER);
  const user = await loginAsUser(browser, testInfo, NEW_USER);
  await user.goto(`/php/php_ini_editor/${def}`);
  expect(await user.content()).toContain(marker);
  await user.context().close();
});
