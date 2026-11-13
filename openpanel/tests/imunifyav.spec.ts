import { test, expect, type Page } from '@playwright/test';

// Covers internal/modules/imunifyav: /imunifyav (ImunifyAV GUI in an iframe) and /imunifyav/summary

// without ImunifyAV, or with its GUI down, /imunifyav falls back to the summary page and there's no iframe
async function openGUI(page: Page) {
  await page.goto('/imunifyav');
  await expect(page).toHaveURL(/\/imunifyav$/);
  const hasGUI = (await page.locator('#imunifyav-gui').count()) > 0;
  test.skip(!hasGUI, 'ImunifyAV GUI is not running on this server');
}

// text of the newest scan row on the summary page, empty when there are no scans yet
async function newestScan(page: Page): Promise<string> {
  await page.goto('/imunifyav/summary');
  const row = page.locator('#imunifyav-scans tbody tr').first();
  return (await row.count()) ? (await row.innerText()).trim() : '';
}

test('gui page has the summary link next to the tabs', async ({ page }) => {
  await openGUI(page);
  const link = page.locator('#imunifyav-summary');
  await expect(link).toBeVisible();
  // modern menu puts it in the tabs bar, classic gets its own strip
  if (await page.locator('#page-tabs').count()) await expect(page.locator('#page-tabs #imunifyav-summary')).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/imunifyav\/summary$/);
  await expect(page.locator('#imunifyav-status')).toBeVisible();
  await page.locator('#imunifyav-open-gui').click();
  await expect(page).toHaveURL(/\/imunifyav$/);
  await expect(page.locator('#imunifyav-gui')).toBeVisible();
});

test('start a scan from the ImunifyAV gui and see it on the summary', async ({ page }) => {
  test.setTimeout(10 * 60_000);
  const before = await newestScan(page);

  await openGUI(page);
  const gui = page.frameLocator('#imunifyav-gui');
  const start = gui.getByRole('button', { name: /Start scanning/i });
  const stop = gui.getByRole('button', { name: /Stop scanning/i });
  // the gui logs in with a token first, then lands on the malware scanner
  await expect(start.or(stop)).toBeVisible({ timeout: 60_000 });
  // a scan left over from an earlier run has to finish before a new one can start
  await expect(start).toBeVisible({ timeout: 5 * 60_000 });

  await start.click();
  await expect(gui.getByText(/Scan added to queue/i)).toBeVisible({ timeout: 30_000 });

  // the scan shows up as a new row once ImunifyAV picks it up, then finishes without the running badge
  await expect(async () => {
    expect(await newestScan(page)).not.toBe(before);
  }).toPass({ timeout: 3 * 60_000, intervals: [5_000] });
  await expect(async () => {
    await page.goto('/imunifyav/summary');
    await expect(page.locator('#imunifyav-scans tbody tr').first().locator('.bg-blue-50')).toHaveCount(0);
  }).toPass({ timeout: 5 * 60_000, intervals: [10_000] });
  console.log('imunifyav scan from the gui finished:', (await newestScan(page)).replace(/\s+/g, ' '));
});
