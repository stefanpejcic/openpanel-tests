import { test, expect, Page } from '@playwright/test';

// https://github.com/stefanpejcic/OpenPanel/issues/1357
// "Delete unused" on a fresh server, before any plan/user/service exists, removed alpine from the shared store
// and with it the base layer caddy and others in root's store were built on, so they all broke.
// Runs as its own project before every other spec, see playwright.config.ts.

test.describe.configure({ mode: 'serial' });

// deleting runs one image at a time, a fresh install has dozens of them
test.setTimeout(60 * 60 * 1000);

async function csrf(page: Page) {
  const token = await page.locator('meta[name="csrf-token"]').getAttribute('content');
  expect(token, 'csrf token on the podman page').toBeTruthy();
  return token!;
}

async function postJSON(page: Page, url: string, token: string) {
  const res = await page.request.post(url, {
    headers: {
      'X-CSRFToken': token,
      'X-Requested-With': 'XMLHttpRequest',
      Referer: new URL('/services/podman', page.url()).toString(),
    },
  });
  expect(res.ok(), `POST ${url} -> ${res.status()}`).toBeTruthy();
  return res.json();
}

// repository:tag of every image a system container runs, read from the images tab
async function systemImages(page: Page) {
  const rows = page.locator('#podman-images-tbody tr').filter({ hasText: /\d+ system/ });
  const out: string[] = [];
  for (const row of await rows.all()) {
    const repo = (await row.locator('td').nth(0).innerText()).trim();
    const tag = (await row.locator('td').nth(1).innerText()).trim();
    if (repo && repo !== '<none>') out.push(`${repo}:${tag}`);
  }
  return out;
}

// podman system df fails on a corrupted store and the tab then renders no table at all
async function expectDiskUsageWorks(page: Page) {
  await page.goto('/services/podman#diskusage');
  const rows = page.locator('#podman-diskusage-tbody tr');
  await expect(rows.first(), 'disk usage table (podman system df) still renders').toBeVisible();
  await expect(page.locator('#podman-diskusage-tbody')).toContainText('Images');
}

let before: string[] = [];

test('baseline: system containers are listed and disk usage works', async ({ page }) => {
  await page.goto('/services/podman#images');
  before = await systemImages(page);
  expect(before.length, 'images used by system containers').toBeGreaterThan(0);
  await expectDiskUsageWorks(page);
  console.log(`system container images before: ${before.join(', ')}`);
});

test('Delete unused finishes without corrupting the images system containers use', async ({ page }) => {
  await page.goto('/services/podman#images');
  const token = await csrf(page);

  const started = await postJSON(page, '/services/podman/images/bulk/delete-unused', token);
  expect(started.scheduled).toBe(true);
  console.log(`delete-unused scheduled for ${started.total} image(s)`);

  let status: any;
  await expect
    .poll(
      async () => {
        status = await (await page.request.get('/services/podman/images/bulk-status')).json();
        return status.done;
      },
      { timeout: 55 * 60 * 1000, intervals: [10_000] },
    )
    .toBe(true);
  console.log(`delete-unused: ${status.message} failed: ${(status.failed || []).length}`);

  // a corrupted store makes podman images come back empty, so every system image has to still be listed
  await page.goto('/services/podman#images');
  const after = await systemImages(page);
  for (const ref of before) {
    expect(after, `${ref} still listed as used by a system container`).toContain(ref);
  }
  await expectDiskUsageWorks(page);
});

test('an alpine based image can still be pulled after Delete unused', async ({ page }) => {
  // the reporter's apache/php pulls failed with "readlink .../overlay/l/...: no such file or directory"
  await page.goto('/services/podman#images');
  const token = await csrf(page);
  const ref = 'docker.io/library/httpd:alpine';

  await postJSON(page, `/services/podman/images/pull/${ref}`, token);
  let result: any;
  await expect
    .poll(
      async () => {
        result = await (await page.request.get(`/services/podman/images/action-status?id=${encodeURIComponent(ref)}`)).json();
        return result.done;
      },
      { timeout: 10 * 60 * 1000, intervals: [5_000] },
    )
    .toBe(true);
  expect(result.success, `pull ${ref}: ${result.message}`).toBe(true);
  await expectDiskUsageWorks(page);
});
