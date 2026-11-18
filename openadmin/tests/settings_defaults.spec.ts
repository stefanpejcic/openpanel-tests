import { test, expect, type Page } from '@playwright/test';
import { type Snapshot, snapshotForm, restoreForm, createUser, deleteUser, loginAsUser, withAdminPage } from '../op-settings';

// Settings > Defaults only applies to accounts created afterwards, so every option is changed,
// a new account is made and its .env, services and PHP version are checked, then everything goes back

const FORM = 'form[data-warn-unsaved]';
const stamp = Date.now() % 100000;
const NEW_USER = `pwdef${stamp}`;
let original: Snapshot;
let files: { env: string; compose: string; autostart: string };
const orig = (k: string) => original.find(([n]) => n === k)?.[1] ?? '';

// the per-user .env is embedded as JSON for the editor, lines show up with escaped quotes
const envLine = (key: string, value: string) => `${key}=\\"${value}\\"`;

// the button validates the compose file first, then turns into Save
async function saveFiles(page: Page) {
  const btn = page.locator('form[method="POST"] button[type="button"][\\@click*="validate"]').first();
  await btn.click();
  await expect(btn).toHaveText(/^\s*Save\s*$/, { timeout: 120_000 });
  await btn.click();
  await expect(page.getByText('Files updated successfully!')).toBeVisible({ timeout: 30_000 });
}

async function readFiles(page: Page) {
  await page.goto('/settings/defaults/files');
  const v = async (n: string) => page.locator(`textarea[name="${n}"]`).inputValue();
  return { env: await v('env'), compose: await v('compose'), autostart: await v('autostart') };
}

test.beforeAll(async ({ browser }, testInfo) => {
  await withAdminPage(browser, testInfo, async page => {
    original = await snapshotForm(page, '/settings/defaults', FORM);
    files = await readFiles(page);
  });
});

test.afterAll(async ({ browser }, testInfo) => {
  test.setTimeout(300_000);
  await withAdminPage(browser, testInfo, async page => {
    await deleteUser(page, NEW_USER);
    if (!files) return;
    // the raw files hold everything the form writes, putting them back undoes all of it
    await page.goto('/settings/defaults/files');
    for (const [k, v] of Object.entries(files)) await page.locator(`textarea[name="${k}"]`).fill(v);
    await saveFiles(page);
  });
});

test('page shows every section', async ({ page }) => {
  await page.goto('/settings/defaults');
  for (const id of ['webserver', 'MYSQL_TYPE', 'varnish', 'default-php', 'autostart-services', 'services']) {
    await expect(page.locator(`h2#${id}, [id="${id}"]`).first(), id).toBeVisible();
  }
  for (const n of ['WEB_SERVER', 'MYSQL_TYPE', 'VARNISH', 'DEFAULT_PHP_VERSION', 'services']) {
    await expect(page.locator(`[name="${n}"]`).first(), n).toHaveCount(1);
  }
});

test.describe('a new account gets the new defaults', () => {
  let want: Record<string, string>;
  let autostartToggled: string;

  test.beforeAll(async ({ browser }, testInfo) => {
    test.setTimeout(420_000);
    await withAdminPage(browser, testInfo, async page => {
      await page.goto('/settings/defaults');
      const ws = orig('WEB_SERVER') === 'nginx' ? 'apache' : 'nginx';
      const sql = orig('MYSQL_TYPE') === 'mariadb' ? 'mysql' : 'mariadb';
      const php = await page.locator('select[name="DEFAULT_PHP_VERSION"] option').evaluateAll(
        (o, cur) => o.map(x => (x as HTMLOptionElement).value).find(v => v && v !== cur) ?? cur, orig('DEFAULT_PHP_VERSION'));
      want = { WEB_SERVER: ws, MYSQL_TYPE: sql, DEFAULT_PHP_VERSION: php, CRON_RAM: '0.75', CRON_PIDS: '1234', CRON_CPU: '0.30' };

      await page.locator(`input[name="webserver_choice"][value="${ws}"]`).check({ force: true });
      await page.locator(`input[name="MYSQL_TYPE"][value="${sql}"]`).check({ force: true });
      await page.locator('input[name="VARNISH"]').setChecked(orig('VARNISH') !== '1', { force: true });
      await page.locator('select[name="DEFAULT_PHP_VERSION"]').selectOption(php);
      for (const k of ['CRON_RAM', 'CRON_PIDS', 'CRON_CPU']) await page.locator(`[name="${k}"]`).fill(want[k]);
      // flip one autostart service
      const chip = page.locator('div[role="group"][aria-labelledby="autostart-services"] label').filter({ hasText: /^cron$/ });
      autostartToggled = 'cron';
      await chip.click();

      await page.locator('#tour-save-defaults-btn').click();
      await expect(page.getByText('New defaults saved successfully!')).toBeVisible({ timeout: 30_000 });

      // what was saved is what the form and the files show
      await page.reload();
      await expect(page.locator('input[name="WEB_SERVER"]')).toHaveValue(ws);
      await expect(page.locator(`input[name="MYSQL_TYPE"][value="${sql}"]`)).toBeChecked();
      await expect(page.locator('select[name="DEFAULT_PHP_VERSION"]')).toHaveValue(php);
      const f = await readFiles(page);
      expect(f.env).toContain(`WEB_SERVER="${ws}"`);
      expect(f.env).toContain(`CRON_RAM="0.75G"`);
      expect(f.env).toMatch(orig('VARNISH') === '1' ? /^#PROXY_HTTP_PORT=/m : /^PROXY_HTTP_PORT=/m);
      expect(f.autostart.split('\n').includes(autostartToggled)).toBe(!files.autostart.split('\n').includes(autostartToggled));

      await createUser(page, NEW_USER);
    });
  });

  test('its .env has the new webserver, database, PHP version and limits', async ({ page }) => {
    await page.goto(`/settings/defaults/files/${NEW_USER}`);
    const html = await page.content();
    expect(html).toContain(envLine('WEB_SERVER', want.WEB_SERVER));
    expect(html).toContain(envLine('MYSQL_TYPE', want.MYSQL_TYPE));
    expect(html).toMatch(new RegExp(`DEFAULT_PHP_VERSION=\\\\?"?${want.DEFAULT_PHP_VERSION.replace('.', '\\.')}`));
    expect(html).toContain(envLine('CRON_RAM', '0.75G'));
    expect(html).toContain(envLine('CRON_PIDS', '1234'));
    expect(html).toContain(envLine('CRON_CPU', '0.30'));
  });

  test('its services carry the new process limit', async ({ page }) => {
    await page.goto(`/users/${NEW_USER}#services`);
    await expect(page.locator(`form[action="/containers/${NEW_USER}/pids/cron"] input[name="value"]`)).toHaveValue('1234');
  });

  test('the user panel shows the new default PHP version', async ({ browser }, testInfo) => {
    const user = await loginAsUser(browser, testInfo, NEW_USER);
    await user.goto('/php/default');
    await expect(user.locator('main')).toContainText(want.DEFAULT_PHP_VERSION);
    await user.context().close();
  });
});

test('the raw template files are saved', async ({ page }) => {
  const marker = `# pw ${stamp}`;
  await page.goto('/settings/defaults/files');
  const env = page.locator('textarea[name="env"]');
  await env.fill(`${await env.inputValue()}\n${marker}\n`);
  await saveFiles(page);
  expect((await readFiles(page)).env).toContain(marker);
});
