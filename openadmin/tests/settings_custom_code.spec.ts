import { test, expect, type Page } from '@playwright/test';
import { restartOpenPanel, openUserPanel, withAdminPage, PANEL_USER } from '../op-settings';

// every Custom code field is saved through the form, OpenPanel is restarted
// and the result is checked in the user panel as PANEL_USER, the original contents go back at the end

const FIELDS = ['custom_css', 'custom_js', 'in_header', 'in_footer', 'custom_section', 'welcome_email', 'post_update', 'pre_startup'] as const;
type Field = typeof FIELDS[number];
const stamp = Date.now() % 100000;
let original: Partial<Record<Field, string>> = {};

async function read(page: Page): Promise<Partial<Record<Field, string>>> {
  await page.goto('/settings/custom-code');
  const out: Partial<Record<Field, string>> = {};
  for (const f of FIELDS) {
    const el = page.locator(`textarea[name="${f}"]`);
    if (await el.count()) out[f] = await el.inputValue();
  }
  return out;
}

async function save(page: Page, values: Partial<Record<Field, string>>) {
  await page.goto('/settings/custom-code');
  for (const [k, v] of Object.entries(values)) await page.locator(`textarea[name="${k}"]`).fill(v!);
  await page.getByRole('button', { name: 'Save files' }).click();
  await expect(page.getByText('Files updated successfully!')).toBeVisible({ timeout: 30_000 });
}

test.beforeAll(async ({ browser }, testInfo) => {
  await withAdminPage(browser, testInfo, async page => { original = await read(page); });
});

test.afterAll(async ({ browser }, testInfo) => {
  test.setTimeout(300_000);
  await withAdminPage(browser, testInfo, async page => {
    await save(page, original);
    await restartOpenPanel(page);
  });
});

test('fields are listed, the Enterprise ones only with a license', async ({ page }) => {
  await page.goto('/settings/custom-code');
  for (const f of ['post_update', 'pre_startup']) await expect(page.locator(`textarea[name="${f}"]`), f).toHaveCount(1);
  // WordPress sets moved to Settings > OpenPanel
  await expect(page.locator('textarea[name="wp_plugins"]')).toHaveCount(0);
});

test.describe('code reaches the user panel', () => {
  const css = `/* pw-css-${stamp} */ #pw-${stamp} { color: red; }`;
  const js = `window.pwCustomJs${stamp} = true;`;
  const header = `<meta name="pw-header" content="${stamp}">`;
  const footer = `<div id="pw-footer-${stamp}">footer ${stamp}</div>`;
  const section = { section_title: `PW Section ${stamp}`, section_position: 'top', items: [{ label: `PW Link ${stamp}`, url: 'https://openpanel.com/', icon: 'bi bi-star' }] };
  // the startup script runs before the footer is read, so its line shows up next to the saved one
  const startup = `echo '<div id="pw-startup-${stamp}"></div>' >> /etc/openpanel/openpanel/custom_code/in_footer.html`;
  let user: Page;
  let enterprise = false;

  test.beforeAll(async ({ browser }, testInfo) => {
    test.setTimeout(300_000);
    await withAdminPage(browser, testInfo, async page => {
      await page.goto('/settings/custom-code');
      enterprise = await page.locator('textarea[name="custom_css"]').count() > 0;
      const values: Partial<Record<Field, string>> = { pre_startup: startup, post_update: `# pw ${stamp}\necho done` };
      if (enterprise) Object.assign(values, { custom_css: css, custom_js: js, in_header: header, in_footer: footer, custom_section: JSON.stringify(section) });
      await save(page, values);

      // what was saved is what the form shows
      const now = await read(page);
      for (const [k, v] of Object.entries(values)) expect(now[k as Field], k).toBe(v);
      await restartOpenPanel(page);
      user = await openUserPanel(browser, testInfo);
    });
  });

  test.afterAll(async () => { await user?.context().close(); });

  test('custom CSS and JS are served on every page', async () => {
    test.skip(!enterprise, 'needs an Enterprise license');
    expect(await (await user.request.get('/static/css/custom.css')).text()).toContain(`pw-css-${stamp}`);
    expect(await (await user.request.get('/static/js/custom.js')).text()).toContain(`pwCustomJs${stamp}`);
    await user.goto('/dashboard');
    await expect.poll(() => user.evaluate(k => (window as any)[k], `pwCustomJs${stamp}`)).toBe(true);
  });

  test('code in header and footer is on every page', async () => {
    test.skip(!enterprise, 'needs an Enterprise license');
    for (const path of ['/dashboard', '/domains']) {
      await user.goto(path);
      await expect(user.locator(`head meta[name="pw-header"][content="${stamp}"]`), path).toHaveCount(1);
      await expect(user.locator(`#pw-footer-${stamp}`), path).toHaveCount(1);
    }
  });

  test('custom dashboard section', async () => {
    test.skip(!enterprise, 'needs an Enterprise license');
    await user.goto('/dashboard');
    await expect(user.getByText(section.section_title)).toBeVisible();
    await expect(user.locator('a', { hasText: `PW Link ${stamp}` })).toHaveAttribute('href', 'https://openpanel.com/');
  });

  test('the before startup script runs when OpenPanel starts', async () => {
    // the footer it writes to is only loaded with Enterprise
    test.skip(!enterprise, 'needs an Enterprise license to see the footer');
    await user.goto('/dashboard');
    await expect(user.locator(`#pw-startup-${stamp}`)).toHaveCount(1);
  });
});

test('welcome email is saved and previewed', async ({ page }) => {
  await page.goto('/settings/custom-code');
  test.skip(await page.locator('textarea[name="welcome_email"]').count() === 0, 'needs an Enterprise license');
  const html = `<p>Welcome pw ${stamp} {{EMAIL}}</p>`;
  await save(page, { welcome_email: html });
  expect((await read(page)).welcome_email).toBe(html);
  // the preview frame renders it
  await expect(page.frameLocator('#preview_welcome_email').getByText(`Welcome pw ${stamp}`)).toBeVisible();
});
