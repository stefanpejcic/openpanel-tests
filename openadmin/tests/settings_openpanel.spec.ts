import { test, expect, type Page } from '@playwright/test';
import {
  PANEL_USER, type Snapshot,
  snapshotOpenpanelSettings, restoreOpenpanelSettings, changeOpenpanelSettings, setOpenpanelFields, saveOpenpanelSettings,
  restartOpenPanel, openUserPanel, openUserPanelLoggedOut, userPanelOrigin, withAdminPage, userExists,
} from '../op-settings';

// every option on Settings > OpenPanel is changed through the form, OpenPanel is restarted
// and the result is checked in the user panel as PANEL_USER, the original settings go back at the end

// one worker runs them in order, a failure restarts the worker and afterAll puts the settings back first
// user panel pages right after an OpenPanel restart can take a while
test.describe.configure({ timeout: 180_000 });
let original: Snapshot;
const orig = (name: string) => original.find(([k]) => k === name)?.[1] ?? '';
const flip = (name: string) => orig(name) !== 'yes';
const stamp = Date.now() % 100000;

test.beforeAll(async ({ browser }, testInfo) => {
  await withAdminPage(browser, testInfo, async page => {
    test.skip(!(await userExists(page, PANEL_USER)), `${PANEL_USER} is created by aa-users.spec.ts`);
    original = await snapshotOpenpanelSettings(page);
    // the checks are written against the built-in templates, not a theme
    if (orig('template') !== '') {
      test.setTimeout(240_000);
      await page.goto('/settings/open-panel');
      await page.locator('input[name="template"][value=""]').check({ force: true });
      await saveOpenpanelSettings(page);
      await restartOpenPanel(page);
    }
  });
});

test.afterAll(async ({ browser }, testInfo) => {
  test.setTimeout(240_000);
  if (!original) return;
  await withAdminPage(browser, testInfo, async page => {
    await restoreOpenpanelSettings(page, original);
    await restartOpenPanel(page);
  });
});

test('page loads with every section', async ({ page }) => {
  await page.goto('/settings/open-panel');
  for (const id of ['brand', 'nameservers', 'users', 'display', 'files', 'databases', 'security', 'login_ratelimit', 'wordpress', 'ai_assistant']) {
    await expect(page.locator(`h2#${id}`), id).toBeVisible();
  }
});

test('every option has a tooltip that explains it', async ({ page }) => {
  await page.goto('/settings/open-panel');
  const labels = page.locator('main label.block.text-sm.font-medium[for]:visible');
  const count = await labels.count();
  expect(count).toBeGreaterThan(40);
  const missing: string[] = [];
  for (let i = 0; i < count; i++) {
    const label = labels.nth(i);
    const forId = await label.getAttribute('for');
    // profile rows are listed under the WordPress profiles tooltip
    if (!forId || forId.startsWith('wp_profile_') || forId.startsWith('new_wp_profile_')) continue;
    const button = label.locator('xpath=following-sibling::button[@data-tooltip-target][1]');
    if (await button.count() === 0) { missing.push(forId); continue; }
    const tip = page.locator(`#${await button.getAttribute('data-tooltip-target')}`);
    expect((await tip.textContent())?.trim().length, `tooltip text for ${forId}`).toBeGreaterThan(20);
  }
  expect(missing, 'options without a tooltip').toEqual([]);

  // hovering shows it
  const first = page.locator('button[data-tooltip-target="tip-op-brand-name"]');
  await first.hover();
  await expect(page.locator('#tip-op-brand-name')).toBeVisible();
});

test.describe('branding, nameservers and display', () => {
  const brand = `PW Brand ${stamp}`;
  const logo = `https://openpanel.com/img/pw-logo-${stamp}.png`;
  const favicon = `https://openpanel.com/img/pw-favicon-${stamp}.ico`;
  const ns = { ns1: `ns1.pw${stamp}.example`, ns2: `ns2.pw${stamp}.example`, ns3: `ns3.pw${stamp}.example` };
  let user: Page;
  let want: Record<string, boolean | string>;

  test.beforeAll(async ({ browser }, testInfo) => {
    test.setTimeout(300_000);
    await withAdminPage(browser, testInfo, async page => {
      want = {
        password_reset: flip('password_reset'),
        twofa_nag: flip('twofa_nag'),
        found_a_bug_link: flip('found_a_bug_link'),
        ip_county_flag: flip('ip_county_flag'),
        permit_username_change_by_user: flip('permit_username_change_by_user'),
        how_to_guides: true,
        avatar_type: orig('avatar_type') === 'letter' ? 'icon' : 'letter',
        menu_style: orig('menu_style') === 'classic' ? 'modern' : 'classic',
      };
      await changeOpenpanelSettings(page, { brand_name: brand, logo, favicon, ...ns, ...want });

      // what was saved is what the form shows after a reload
      await page.reload();
      await expect(page.locator('[name="brand_name"]')).toHaveValue(brand);
      await expect(page.locator('[name="logo"]')).toHaveValue(logo);
      await expect(page.locator('[name="ns3"]')).toHaveValue(ns.ns3);
      await expect(page.locator('#twofa_nag_switch')).toBeChecked({ checked: want.twofa_nag as boolean });

      await restartOpenPanel(page);
      user = await openUserPanel(browser, testInfo);
    });
  });

  test('brand name, logo and favicon', async () => {
    await user.goto('/dashboard');
    await expect(user).toHaveTitle(new RegExp(`${brand}$`));
    await expect(user.locator('img#logo_image')).toHaveAttribute('src', logo);
    await expect(user.locator('link[rel~="icon"]')).toHaveAttribute('href', favicon);
  });

  test('nameservers on the dashboard', async () => {
    await user.goto('/dashboard');
    const box = user.locator('#dashboard_info_nameservers');
    for (const v of Object.values(ns)) await expect(box).toContainText(v);
  });

  test('2FA widget, how-to guides and report a bug link', async () => {
    await user.goto('/dashboard');
    await expect(user.locator('#dashboard_twofa')).toHaveCount(want.twofa_nag ? 1 : 0);
    await expect(user.locator('#dashboard_howto')).toHaveCount(1);
    await expect(user.locator('a[href*="OpenPanel/issues/new"]')).toHaveCount(want.found_a_bug_link ? 1 : 0);
  });

  test('country flag next to the last login IP', async () => {
    await user.goto('/dashboard');
    expect(await user.content()).toContain(`showFlag: '${want.ip_county_flag ? 'yes' : 'no'}' === 'yes'`);
  });

  test('avatar type', async () => {
    await user.goto('/dashboard');
    const avatar = user.locator('button[aria-label="User settings"]').first();
    await expect(avatar.locator('img')).toHaveCount(0);
    if (want.avatar_type === 'letter') await expect(avatar).toContainText(PANEL_USER[0].toUpperCase());
    else await expect(avatar.locator('svg').first()).toBeVisible();
  });

  test('menu style is the default for users who did not pick one', async () => {
    await user.context().clearCookies({ name: 'menu_style' });
    await user.goto('/dashboard');
    await expect.poll(() => user.evaluate(() => (window as any).Alpine?.store('menuStyle')?.value)).toBe(want.menu_style);
  });

  test('users can change their username', async () => {
    await user.goto('/account');
    await expect(user.locator('input#username')).toHaveCount(want.permit_username_change_by_user ? 1 : 0);
  });

  test('login page shows the brand, logo, favicon and password reset link', async ({ browser }) => {
    const login = await openUserPanelLoggedOut(browser, userPanelOrigin(user));
    await expect(login).toHaveTitle(new RegExp(`${brand}$`));
    await expect(login.locator(`img[src="${logo}"]`)).toHaveCount(1);
    await expect(login.locator('link[rel~="icon"]')).toHaveAttribute('href', favicon);
    await expect(login.locator('a[href="/reset_password"]')).toHaveCount(want.password_reset ? 1 : 0);
    await login.context().close();
  });

  test('logout URL', async ({ page, browser }, testInfo) => {
    test.setTimeout(300_000);
    const target = `${userPanelOrigin(user)}/login?pw_logout=${stamp}`;
    await changeOpenpanelSettings(page, { logout_url: target });
    await restartOpenPanel(page);
    const u = await openUserPanel(browser, testInfo);
    // GET /logout is a confirm page, the button posts it
    await u.goto('/logout');
    await u.getByRole('button', { name: 'Sign out' }).click();
    await expect(u).toHaveURL(target);
    await u.context().close();
  });

  test.afterAll(async () => {
    await user?.context().close();
  });
});

test.describe('lists, file manager and DNS', () => {
  let user: Page;
  const editExt = '.txt .pwtest';
  const imgExt = '.png .pwimg';
  const arcExt = '.zip .pwarc';

  test.beforeAll(async ({ browser }, testInfo) => {
    test.setTimeout(300_000);
    await withAdminPage(browser, testInfo, async page => {
      await changeOpenpanelSettings(page, {
        domains_per_page: '5', activity_items_per_page: '5', max_login_records: '5', resource_usage_items_per_page: '5',
        filemanager_files_per_page: '3',
        filemanager_buttons_style: orig('filemanager_buttons_style') === 'modern' ? 'classic' : 'modern',
        filemanager_view_size: '7', filemanager_edit_size: '6', filemanager_upload_size: '9', filemanager_download_size: '8',
        filemanager_edit_extensions: editExt, filemanager_image_extensions: imgExt, filemanager_archives_extensions: arcExt,
        resource_usage_charts_mode: orig('resource_usage_charts_mode') === 'one' ? 'two' : 'one',
      });
      // the record types are buttons, keep only A and TXT
      const dnsTypes = page.locator('div.col-span-full', { has: page.locator('label[for="dns_record_types"]') });
      for (const t of ['AAAA', 'CAA', 'CNAME', 'MX', 'SRV', 'TLSA', 'HTTPS', 'SVCB', 'NS', 'SSHFP', 'URI', 'DMARC']) {
        const b = dnsTypes.locator('button', { hasText: new RegExp(`^${t}$`) });
        if ((await b.getAttribute('class'))?.includes('bg-blue-500')) await b.click();
      }
      for (const t of ['A', 'TXT']) {
        const b = dnsTypes.locator('button', { hasText: new RegExp(`^${t}$`) });
        if (!(await b.getAttribute('class'))?.includes('bg-blue-500')) await b.click();
      }
      await saveOpenpanelSettings(page);
      await restartOpenPanel(page);
      user = await openUserPanel(browser, testInfo);
    });
  });

  test('domains per page', async () => {
    await user.goto('/domains');
    const rows = await user.locator('#domains-table tbody tr').count();
    expect(rows).toBeLessThanOrEqual(5);
  });

  test('activity items per page', async () => {
    await user.goto('/account/activity');
    expect(await user.locator('#activity-table tbody tr').count()).toBeLessThanOrEqual(5);
  });

  test('login records kept per user', async () => {
    // the login that opened this tab trimmed the file to the new limit
    await user.goto('/account/login-history');
    const rows = await user.locator('#login-log-table tbody tr').count();
    expect(rows).toBeGreaterThan(0);
    expect(rows).toBeLessThanOrEqual(5);
  });

  test('file manager files per page, buttons style, size limits and extensions', async () => {
    await user.context().clearCookies({ name: 'filemanager_view' });
    await user.goto('/files');
    expect(await user.locator('#filemanager_table tbody tr').count()).toBeLessThanOrEqual(3);
    const wantView = orig('filemanager_buttons_style') === 'modern' ? 'classic' : 'modern';
    await expect.poll(() => user.evaluate(() => (window as any).Alpine?.store('filemanagerView')?.value)).toBe(wantView);
    const html = await user.content();
    // the template pads these with spaces
    expect(html).toMatch(/editSizeLimit:\s*6 \* 1024 \* 1024/);
    expect(html).toMatch(/viewSizeLimit:\s*7 \* 1024 \* 1024/);
    expect(html).toMatch(/downloadSizeLimit:\s*8 \* 1024 \* 1024/);
    expect(html).toMatch(/Max size:\s*9 MB/);
    expect(html).toMatch(new RegExp(`extensions:\\s*'${editExt}'`));
    expect(html).toMatch(new RegExp(`images:\\s*'${imgExt}'`));
    expect(html).toMatch(new RegExp(`archives:\\s*'${arcExt}'`));
  });

  test('DNS record types users can add', async () => {
    await user.goto('/domains');
    const link = user.locator('a[href^="/domains/edit-dns-zone/"]').first();
    test.skip(await link.count() === 0, `${PANEL_USER} has no DNS zone`);
    await user.goto((await link.getAttribute('href'))!);
    const types = await user.locator('select[name="Type"] option').evaluateAll(o => o.map(x => (x as HTMLOptionElement).value).filter(Boolean));
    expect(types.sort()).toEqual(['A', 'TXT']);
  });

  test('charts mode for resource usage', async () => {
    await user.goto('/server/usage/history');
    const one = orig('resource_usage_charts_mode') !== 'one';
    await expect(user.locator(one ? 'canvas#combinedChart' : 'canvas#cpuChart')).toHaveCount(1);
  });

  test.afterAll(async () => {
    await user?.context().close();
  });
});

test.describe('users, databases and security', () => {
  const forbidden = `pwforbid${stamp}`;
  const restrictedDomain = `pw-restricted-${stamp}.com`;
  const restrictedDb = `pwrestricteddb${stamp}`;
  let user: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    test.setTimeout(300_000);
    await withAdminPage(browser, testInfo, async page => {
      await page.goto('/settings/open-panel');
      const fu = page.locator('textarea[name="forbidden_usernames"]');
      const rd = page.locator('textarea[name="restricted_domains"]');
      await setOpenpanelFields(page, {
        forbidden_usernames: `${await fu.inputValue()}\n${forbidden}`.trim(),
        restricted_domains: `${await rd.inputValue()}\n${restrictedDomain}`.trim(),
        // with the prefix enforced the name that gets checked is <user>_name
      mysql_restricted_databases: `${orig('mysql_restricted_databases')} ${restrictedDb} ${PANEL_USER}_${restrictedDb}`.trim(),
        mysql_enforce_username_prefix: true,
        password_strength: '100',
        captcha_provider: 'turnstile',
        turnstile_site_key: '1x00000000000000000000AA',
        turnstile_secret_key: '1x0000000000000000000000000000000AA',
      });
      await saveOpenpanelSettings(page);
      await restartOpenPanel(page);
      user = await openUserPanel(browser, testInfo);
    });
  });

  test('forbidden usernames can not be used for new accounts', async ({ page }) => {
    await page.goto('/user/new');
    await page.fill('[name="admin_username"]', forbidden);
    await page.fill('[name="admin_password"]', 'Pw-Strong-Pass-123!');
    await page.fill('[name="admin_email"]', `${forbidden}@example.com`);
    await page.click('#CreateUserButton');
    await expect(page.getByText(/is not allowed/i).first()).toBeVisible({ timeout: 60_000 });
    expect(await userExists(page, forbidden)).toBe(false);
  });

  test('restricted domains can not be added by users', async () => {
    await user.goto('/domains/new');
    await user.getByRole('textbox', { name: 'Domain*' }).fill(restrictedDomain);
    await user.getByRole('button', { name: 'Add Domain' }).click();
    await expect(user.getByText(/forbidden domain|not allowed|restricted/i).first()).toBeVisible({ timeout: 60_000 });
    await user.goto('/domains');
    await expect(user.locator('#domains-table')).not.toContainText(restrictedDomain);
  });

  test('restricted MySQL databases', async () => {
    await user.goto('/mysql/new');
    await user.locator('#database_name').fill(restrictedDb);
    // the form refuses it before sending
    await expect(user.getByText('This is a system database that can not be used.')).toBeVisible();
    await expect(user.getByRole('button', { name: 'Create Database' })).toBeDisabled();
    // and the server too when the form is skipped
    const csrf = await user.locator('input[name="csrf_token"]').first().inputValue();
    await user.request.post('/mysql/new', { form: { csrf_token: csrf, database_name: restrictedDb }, headers: { Referer: user.url() } });
    await user.goto('/mysql');
    await expect(user.locator('main')).not.toContainText(restrictedDb);
  });


  test('MySQL username prefix is added to new database names', async () => {
    const name = `pwprefix${stamp}`;
    await user.goto('/mysql/new');
    await expect(user.getByText(`${PANEL_USER}_`, { exact: true }).first()).toBeVisible();
    await user.locator('#database_name').fill(name);
    await user.getByRole('button', { name: 'Create Database' }).click();
    await expect(user).toHaveURL(new RegExp(`created=${PANEL_USER}_${name}`), { timeout: 60_000 });
    // clean up
    await user.goto('/mysql');
    const csrf = await user.locator('input[name="csrf_token"]').first().inputValue();
    await user.request.post('/mysql/delete', { form: { csrf_token: csrf, database_name: `${PANEL_USER}_${name}` }, headers: { Referer: user.url() } });
  });

  test('minimum password strength', async () => {
    await user.goto('/mysql/user');
    await user.locator('[name="db_user"]').fill(`pwweak${stamp}`);
    await user.locator('[name="password"]').fill('abc12345');
    // the form already refuses it
    await expect(user.getByText('Set a password that passes the strength check.')).toBeVisible();
    await expect(user.getByRole('button', { name: 'Create user' })).toBeDisabled();
    // and so does the server when the form is skipped
    const csrf = await user.locator('input[name="csrf_token"]').first().inputValue();
    await user.request.post('/mysql/user', { form: { csrf_token: csrf, db_user: `pwweak${stamp}`, password: 'abc12345' }, headers: { Referer: user.url() } });
    await user.goto('/mysql/users');
    await expect(user.locator('main')).not.toContainText(`pwweak${stamp}`);
  });


  test('captcha on the login page', async ({ browser }) => {
    const login = await openUserPanelLoggedOut(browser, userPanelOrigin(user));
    await expect(login.locator('[data-sitekey="1x00000000000000000000AA"], .cf-turnstile')).toHaveCount(1);
    await login.context().close();
  });

  test('enforce 2FA sends users to the 2FA setup first', async ({ page }) => {
    try {
      await changeOpenpanelSettings(page, { twofa_enforce: true });
      await restartOpenPanel(page);
      // the session from before the restart is still valid, the next page should be the 2FA setup
      await expect(async () => {
        await user.goto('/domains');
        await expect(user).toHaveURL(/2fa|twofa|two-factor/i, { timeout: 5_000 });
      }).toPass({ timeout: 120_000 });
    } finally {
      // later batches log in as the user, they can't with 2FA enforced
      await changeOpenpanelSettings(page, { twofa_enforce: false });
      await restartOpenPanel(page);
    }
  });


  test('values that can not be exercised safely are saved and read back', async ({ page }) => {
    // rate limits would ban the test runner's IP, short sessions log it out, the rest only change timeouts
    const values = {
      login_ratelimit: '41', login_blocklimit: '42', session_duration: '43', session_lifetime: '440',
      activity_lines_retention: '1001', resource_usage_retention: '101', terminal_timeout: '45',
      autopurge_trash: '31', filemanager_compress_max_time: '6', filemanager_extract_max_time: '7', filemanager_download_max_time: '61',
      mysql_startup_time: '47', mysql_import_max_size_gb: '2',
    };
    await changeOpenpanelSettings(page, { ...values, validate_ip_address_cookie: true, weakpass: true });
    await page.reload();
    for (const [k, v] of Object.entries(values)) await expect(page.locator(`[name="${k}"]`), k).toHaveValue(v);
    await expect(page.locator('#validate_ip_address_cookie_switch')).toBeChecked();
    await expect(page.locator('#weakpass_switch')).toBeChecked();
  });

  test.afterAll(async () => {
    await user?.context().close();
  });
});

test.describe('WordPress', () => {
  const profile = `PW Profile ${stamp}`;
  const slug = `pw-profile-${stamp}`;

  test('default sets are saved', async ({ page }) => {
    await changeOpenpanelSettings(page, { wp_plugins: `hello-dolly\n# pw ${stamp}`, wp_themes: `astra\n# pw ${stamp}` });
    await page.reload();
    await expect(page.locator('textarea[name="wp_plugins"]')).toHaveValue(new RegExp(`# pw ${stamp}`));
    await expect(page.locator('textarea[name="wp_themes"]')).toHaveValue(new RegExp(`# pw ${stamp}`));
  });

  test('a profile is offered on the WordPress install form', async ({ page, browser }, testInfo) => {
    test.setTimeout(240_000);
    await page.goto('/settings/open-panel');
    const add = page.locator('details', { hasText: 'Add WordPress profile' });
    if (!(await add.getAttribute('open'))) await add.locator('summary').click();
    await setOpenpanelFields(page, { new_wp_profile_name: profile, new_wp_profile_plugins: 'hello-dolly', new_wp_profile_themes: 'astra' });
    await page.locator('#tour-save-openpanel-btn').click();
    await expect(page.getByText(`WordPress profile '${profile}' added.`)).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(`[name="wp_profile_name__${slug}"]`)).toHaveCount(1);

    // profiles are read on every request, no restart needed
    const user = await openUserPanel(browser, testInfo);
    await user.goto('/wordpress/install');
    await expect(user.locator(`option[value="${slug}"]`)).toHaveCount(1);
    await user.context().close();
  });

  test('several profiles are added in one save', async ({ page }) => {
    await page.goto('/settings/open-panel');
    const add = page.locator('details', { hasText: 'Add WordPress profile' });
    await expect(add).not.toHaveAttribute('open', /.*/);
    await add.locator('summary').click();
    const another = add.getByRole('button', { name: '+ Add another profile' });
    await expect(another).toBeHidden();
    await add.locator('[name="new_wp_profile_name"]').nth(0).fill(`${profile} A`);
    await another.click();
    await add.locator('[name="new_wp_profile_name"]').nth(1).fill(`${profile} B`);
    await add.locator('[name="new_wp_profile_plugins"]').nth(1).fill('akismet');
    await page.locator('#tour-save-openpanel-btn').click();
    await expect(page.getByText(`WordPress profiles '${profile} A', '${profile} B' added.`)).toBeVisible({ timeout: 30_000 });
    for (const sfx of ['a', 'b']) await expect(page.locator(`[name="wp_profile_name__${slug}-${sfx}"]`)).toHaveCount(1);
  });

  test('a profile is deleted', async ({ page }) => {
    await page.goto('/settings/open-panel');
    const row = page.locator('details', { has: page.locator(`[name="wp_profile_name__${slug}"]`) });
    await row.locator('summary').click();
    await row.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('WordPress profile deleted.')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(`[name="wp_profile_name__${slug}"]`)).toHaveCount(0);
    for (const sfx of ['a', 'b']) {
      const r = page.locator('details', { has: page.locator(`[name="wp_profile_name__${slug}-${sfx}"]`) });
      await r.locator('summary').click();
      await r.getByRole('button', { name: 'Delete' }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
      await expect(page.getByText('WordPress profile deleted.')).toBeVisible({ timeout: 30_000 });
    }
  });
});

test.describe('AI assistant', () => {
  test('assistant name and limits reach the user panel', async ({ page, browser }, testInfo) => {
    test.setTimeout(300_000);
    const name = `PW Assistant ${stamp}`;
    await changeOpenpanelSettings(page, { ai_name: name, ai_monthly_limit: '77', ai_max_tokens: '1234', ai_instructions: `pw ${stamp}` });
    await page.reload();
    await expect(page.locator('[name="ai_monthly_limit"]')).toHaveValue('77');
    await expect(page.locator('[name="ai_max_tokens"]')).toHaveValue('1234');
    await expect(page.locator('[name="ai_instructions"]')).toHaveValue(`pw ${stamp}`);
    await restartOpenPanel(page);
    const user = await openUserPanel(browser, testInfo);
    await user.goto('/dashboard');
    test.skip(await user.locator('#ai-assistant-btn').count() === 0, 'AI assistant module is off for this user');
    await user.locator('#ai-assistant-btn').click();
    await expect(user.locator('#ai-assistant-title')).toHaveText(name);
    await user.context().close();
  });
});
