import { test, expect, type Page } from '@playwright/test';
import { type Snapshot, snapshotForm, restoreForm, restartOpenPanel, openUserPanel, withAdminPage } from '../op-settings';

// a module that's off isn't registered in the user panel, so its pages are gone,
// every module currently on is switched off, checked as testinguser, then switched back on and checked again

// a page per module, each one only exists while its module is on
const PAGES: Record<string, string> = {
  docker: '/containers',
  terminal: '/containers/terminal',
  change_image: '/containers/image/change',
  change_ws: '/containers/webserver',
  change_db: '/containers/mysql',
  services: '/services',
  filemanager: '/files',
  disk_usage: '/disk-usage/',
  inodes: '/inodes-explorer/',
  fix_permissions: '/fix-permissions',
  malware_scan: '/malware-scanner',
  imunifyav: '/imunifyav',
  trash: '/files.trash',
  ftp: '/ftp',
  backup_wizard: '/backup-wizard',
  git: '/git',
  backups: '/backups',
  domains: '/domains',
  drupal: '/drupal/install',
  flarum: '/flarum/install',
  sofawiki: '/sofawiki/install',
  tinyphotogallery: '/tinyphotogallery/install',
  tinyfilemanager: '/tinyfilemanager/install',
  dokuwiki: '/dokuwiki/install',
  phpbb: '/phpbb/install',
  joomla: '/joomla/install',
  opencart: '/opencart/install',
  nextcloud: '/nextcloud/install',
  prestashop: '/prestashop/install',
  matomo: '/matomo/install',
  moodle: '/moodle/install',
  ojs: '/ojs/install',
  mediawiki: '/mediawiki/install',
  goaccess: '/domains/stats',
  error_logs: '/error-logs',
  summary: '/summary',
  php: '/php/wizard',
  dns: '/domains/edit-dns-zone',
  dynamic_dns: '/domains/dynamic-dns',
  redis: '/cache/redis',
  memcached: '/cache/memcached',
  elasticsearch: '/cache/elasticsearch',
  opensearch: '/cache/opensearch',
  valkey: '/cache/valkey',
  varnish: '/cache/varnish',
  mysql: '/mysql',
  mysql_conf: '/mysql/configuration',
  mysql_import: '/mysql/import',
  mysql_processlist: '/mysql/processlist',
  mysql_root_password: '/mysql/root-password',
  remote_mysql: '/mysql/remote-mysql',
  mongodb: '/mongodb',
  mongodb_import: '/mongodb/import',
  emails: '/emails',
  email_aliases: '/emails/aliases',
  email_default: '/emails/default',
  email_deliverability: '/emails/deliverability',
  email_export: '/emails/export',
  email_filters: '/emails/filter',
  email_import: '/emails/import',
  email_migrate: '/emails/migrate',
  webmail: '/webmail/',
  crons: '/cronjobs',
  info: '/server/info',
  usage: '/server/usage',
  process_manager: '/process-manager',
  ip_blocker: '/security/ip-blocker',
  webserver_conf: '/server/webserver_conf',
  waf: '/server/waf',
  bot_control: '/server/bot-control',
  account: '/account',
  locale: '/account/language',
  twofa: '/account/2fa',
  passkeys: '/account/passkeys',
  notifications: '/account/notifications',
  favorites: '/account/favorites',
  sessions: '/account/sessions',
  activity: '/account/activity',
  login_history: '/account/login-history',
  mcp: '/account/mcp',
  api: '/account/api',
  ai_assistant: '/ai/info',
  postgresql: '/postgresql',
  postgresql_conf: '/postgresql/configuration',
  postgresql_import: '/postgresql/import',
  remote_postgresql: '/postgresql/remote-postgresql',
  python: '/python/install',
  nodejs: '/nodejs/install',
  ruby: '/ruby/install',
  java: '/java/install',
  autoinstaller: '/auto-installer',
  wordpress: '/wordpress',
  website_builder: '/website-builder/install',
};

// modules OpenAdmin lists that the panel doesn't register on its own, only the plan's feature set gates them
const FEATURE_ONLY: Record<string, string> = {
  ssl: '/domains/ssl', redirects: '/domains/redirect', php_options: '/php/options', php_ini: '/php/php_ini_editor',
  php_extensions: '/php/extensions', phpmyadmin: '/phpmyadmin/link', edit_vhost: '/domains/vhosts', domain_logs: '/domains/log',
};

const FORM = 'form:has(#tour-modules-grid)';
let original: Snapshot;
const enabled = () => original.map(([k]) => k);

async function status(user: Page, path: string): Promise<number> {
  const r = await user.request.get(path, { maxRedirects: 0 });
  return r.status();
}

async function saveModules(page: Page, on: Set<string>) {
  await page.goto('/settings/modules');
  // same as the page's Enable all / Disable all: each card's state is set, collapsed areas included
  await page.evaluate(names => {
    document.querySelectorAll('[data-row]:not([data-locked])').forEach(el => {
      const name = el.querySelector('input[name]')?.getAttribute('name');
      if (name) (window as any).Alpine.$data(el).enabled = names.includes(name);
    });
    document.querySelector('form:has(#tour-modules-grid)')?.dispatchEvent(new CustomEvent('modules-dirty', { bubbles: true }));
  }, [...on]);
  // no flash on save, the POST answering is the signal
  const saved = page.waitForResponse(r => r.url().includes('/settings/modules') && r.request().method() === 'POST');
  await page.locator('#tour-save-modules-btn').click();
  expect((await saved).status()).toBeLessThan(400);
  await page.waitForLoadState();
}

test.beforeAll(async ({ browser }, testInfo) => {
  await withAdminPage(browser, testInfo, async page => { original = await snapshotForm(page, '/settings/modules', FORM); });
});

test.afterAll(async ({ browser }, testInfo) => {
  test.setTimeout(300_000);
  if (!original) return;
  await withAdminPage(browser, testInfo, async page => {
    await restoreForm(page, '/settings/modules', original);
    await restartOpenPanel(page);
  });
});

test('every module the panel has is listed', async ({ page }) => {
  await page.goto('/settings/modules');
  for (const m of [...Object.keys(PAGES), ...Object.keys(FEATURE_ONLY)]) {
    await expect(page.locator(`#tour-modules-grid input[name="${m}"]`), m).toHaveCount(1);
  }
});

test('switched off modules are gone from the user panel and come back when switched on', async ({ page, browser }, testInfo) => {
  test.setTimeout(900_000);
  const testable = enabled().filter(m => PAGES[m]);
  test.skip(testable.length === 0, 'no module is enabled');

  await saveModules(page, new Set());
  await expect(page.locator('#tour-modules-grid input[role="switch"]:checked')).toHaveCount(0);
  await restartOpenPanel(page);
  let user = await openUserPanel(browser, testInfo);
  const stillThere: string[] = [];
  for (const m of testable) if ((await status(user, PAGES[m])) !== 404) stillThere.push(`${m} ${PAGES[m]}`);
  await user.context().close();
  expect(stillThere, 'pages of switched off modules').toEqual([]);

  await restoreForm(page, '/settings/modules', original);
  await restartOpenPanel(page);
  user = await openUserPanel(browser, testInfo);
  const missing: string[] = [];
  for (const m of testable) if ((await status(user, PAGES[m])) === 404) missing.push(`${m} ${PAGES[m]}`);
  await user.context().close();
  expect(missing, 'pages of switched on modules').toEqual([]);
});

test('switching off a feature-only module takes it away from users', async ({ page, browser }, testInfo) => {
  test.setTimeout(600_000);
  const testable = enabled().filter(m => FEATURE_ONLY[m]);
  test.skip(testable.length === 0, 'none of them is enabled');
  await saveModules(page, new Set(enabled().filter(m => !FEATURE_ONLY[m])));
  await restartOpenPanel(page);
  const user = await openUserPanel(browser, testInfo);
  const open: string[] = [];
  for (const m of testable) {
    const s = await status(user, FEATURE_ONLY[m]);
    if (s < 400) open.push(`${m} ${FEATURE_ONLY[m]} ${s}`);
  }
  await user.context().close();
  expect(open, 'still reachable with the module off').toEqual([]);
});

test('search filters the modules grid', async ({ page }) => {
  await page.goto('/settings/modules');

  const cards = page.locator('#tour-modules-grid [data-row]');
  const count = await cards.count();
  test.skip(count === 0, 'No modules registered on this environment');

  const firstName = (await cards.first().locator('h3').innerText()).trim();
  await page.locator('#tour-modules-filters input[x-model="searchQuery"]').fill(firstName);
  await page.waitForTimeout(150);

  await expect(cards.filter({ hasText: firstName })).toBeVisible();
  console.log(`search filtered modules grid to "${firstName}"`);
});

test('category filter buttons toggle active state', async ({ page }) => {
  await page.goto('/settings/modules');

  const edition = page.getByRole('radiogroup', { name: 'Edition' });
  const community = edition.getByRole('radio', { name: 'Community' });
  // the radios are visually hidden, their labels are the visible pills
  await edition.getByText('Community', { exact: true }).click();
  await expect(community).toBeChecked();
  await edition.getByText('Any edition', { exact: true }).click();
  await expect(community).not.toBeChecked();

  console.log('category filter button toggled active state');
});

test('a module toggle switch responds to click without saving', async ({ page }) => {
  await page.goto('/settings/modules');

  const cards = page.locator('#tour-modules-grid [data-row]');
  const count = await cards.count();
  test.skip(count === 0, 'No modules registered on this environment');

  // the switch is a visually hidden checkbox inside a label; clicking the label flips it
  const toggle = cards.first().locator('label:has(input[role="switch"])');
  const checkbox = cards.first().locator('input[role="switch"]');
  const lockedCard = await cards.first().getAttribute('data-locked');
  test.skip(lockedCard !== null, 'First module is a locked plugin card with no toggle');

  await expect(toggle).toBeVisible();

  const initial = await checkbox.isChecked();

  // toggle
  await toggle.click();
  expect(await checkbox.isChecked()).toBe(!initial);

  // toggle back (restore original state)
  await toggle.click();
  expect(await checkbox.isChecked()).toBe(initial);

  console.log('module toggle switch responded to toggles (not saved)');
});

test('enable all / disable all bulk buttons affect toggle states', async ({ page }) => {
  await page.goto('/settings/modules');

  const checkboxes = page.locator('#tour-modules-grid [data-row]:not([data-locked]) input[type="checkbox"]');
  const count = await checkboxes.count();
  test.skip(count === 0, 'No unlocked modules to bulk toggle');

  await page.getByRole('button', { name: 'Disable All' }).click();
  await expect(checkboxes.first()).not.toBeChecked();

  await page.getByRole('button', { name: 'Enable All' }).click();
  await expect(checkboxes.first()).toBeChecked();

  console.log('bulk enable/disable buttons updated toggle states (not saved)');
});
