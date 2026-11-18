import { test, expect, type Page } from '@playwright/test';
import { openUserPanel, openUserPanelLoggedOut, userPanelOrigin, withAdminPage } from '../op-settings';

// Settings > Locales: the default changes the login page language, installed locales are offered
// to users on Account > Language and deleted ones disappear from it, everything goes back at the end

const rows = (page: Page) => page.locator('#tour-locales-table tbody tr:not([data-cluster-node])');
const row = (page: Page, locale: string) => rows(page).filter({ has: page.locator(`input[value="${locale}"]`) });
const base = (locale: string) => locale.split('-')[0];
let originalDefault = '';
let origin = '';

type Locale = { locale: string; installed: boolean; is_default: boolean; update_available: boolean };

async function localesJSON(page: Page): Promise<{ default_locale: string; translations: Locale[] }> {
  return (await page.request.get('/settings/locales?output=json')).json();
}

// the full code of the default row, setDefault needs it
async function defaultLocale(page: Page): Promise<string> {
  const d = await localesJSON(page);
  return d.translations.find(t => t.is_default)?.locale ?? '';
}

async function setDefault(page: Page, locale: string) {
  await page.goto('/settings/locales');
  await row(page, locale).getByRole('button', { name: 'Set as default' }).click();
  await expect(page.getByText(`Default locale set to '${base(locale)}'.`)).toBeVisible({ timeout: 30_000 });
}

async function userLanguages(browser: any, testInfo: any): Promise<string[]> {
  const user = await openUserPanel(browser, testInfo);
  origin = userPanelOrigin(user);
  await user.goto('/account/language');
  const codes = await user.locator('input[name="locale"]').evaluateAll(i => i.map(x => (x as HTMLInputElement).value));
  await user.context().close();
  return codes;
}

test.beforeAll(async ({ browser }, testInfo) => {
  await withAdminPage(browser, testInfo, async page => { originalDefault = await defaultLocale(page); });
});

test.afterAll(async ({ browser }, testInfo) => {
  if (!originalDefault) return;
  await withAdminPage(browser, testInfo, async page => {
    if (await defaultLocale(page) !== originalDefault) await setDefault(page, originalDefault);
  });
});

test('the default locale is the login page language', async ({ page, browser }, testInfo) => {
  test.setTimeout(240_000);
  await page.goto('/settings/locales');
  const de = await page.locator('#tour-locales-table input[name="default"][value^="de-"]').first().getAttribute('value').catch(() => null);
  test.skip(!de, 'German is not installed or is already the default');

  await setDefault(page, de!);
  if (!origin) await userLanguages(browser, testInfo);
  // the panel's cached default is dropped on save, no restart
  const login = await openUserPanelLoggedOut(browser, origin);
  await expect(async () => {
    await login.reload();
    await expect(login.getByText('Kennwort vergessen?')).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 60_000 });

  test.skip(!originalDefault, 'no default locale to go back to');
  await setDefault(page, originalDefault);
  await expect(async () => {
    await login.reload();
    await expect(login.getByText('Forgot password?')).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 60_000 });
  await login.context().close();
});

test('an installed locale is offered to users and gone after delete', async ({ page, browser }, testInfo) => {
  test.setTimeout(420_000);
  await page.goto('/settings/locales');
  const installable = rows(page).filter({ has: page.getByRole('button', { name: 'Install' }) });
  test.skip(await installable.count() === 0, 'every locale is already installed');
  const locale = (await installable.first().locator('input[name="locale"]').getAttribute('value'))!;

  await installable.first().getByRole('button', { name: 'Install' }).click();
  await expect(page.getByText(`Locale '${locale}' installed successfully.`)).toBeVisible({ timeout: 300_000 });
  await expect(row(page, locale).getByRole('button', { name: 'Delete' })).toBeVisible();
  expect(await userLanguages(browser, testInfo)).toContain(base(locale));

  await row(page, locale).getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText(`Locale '${locale}' deleted.`)).toBeVisible({ timeout: 60_000 });
  await expect(row(page, locale).getByRole('button', { name: 'Install' })).toBeVisible();
  expect(await userLanguages(browser, testInfo)).not.toContain(base(locale));
});

test('an outdated locale is updated', async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto('/settings/locales');
  const outdated = rows(page).filter({ has: page.getByRole('button', { name: 'Update' }) });
  test.skip(await outdated.count() === 0, 'every installed locale is up to date');
  const locale = (await outdated.first().locator('input[name="update"]').getAttribute('value'))!;
  await outdated.first().getByRole('button', { name: 'Update' }).click();
  await expect(page.getByRole('alert').filter({ hasText: new RegExp(locale) }).first()).toBeVisible({ timeout: 240_000 });
  await expect(row(page, locale).getByRole('button', { name: 'Update' })).toHaveCount(0);
});

test('search filters the locales table', async ({ page }) => {
  await page.goto('/settings/locales');
  const first = rows(page).first();
  const name = (await first.locator('td').nth(1).innerText()).trim();
  await page.locator('input[x-model="searchQuery"]').fill(name);
  await expect(rows(page).filter({ hasText: name }).first()).toBeVisible();
});
