import { test, expect } from '@playwright/test';

// user page: networks tab, plan usage cards, custom message preview, usage history columns

const USER = process.env.DETAIL_USER || 'testinguser';

test.beforeEach(async ({ page }) => {
  const res = await page.request.get(`/users/${USER}`);
  test.skip(!res.ok(), `${USER} does not exist on this server`);
});

test('networks tab lists the same networks as the api', async ({ page }) => {
  const res = await page.request.get(`/client/networks/${USER}`);
  expect(res.ok()).toBeTruthy();
  const nets = await res.json();
  expect(Array.isArray(nets)).toBeTruthy();
  for (const n of nets) {
    expect(n.name).toBeTruthy();
    expect(Array.isArray(n.subnets)).toBeTruthy();
    // the default podman network only shows up when something is on it
    if (n.name === 'podman') expect(n.containers.length).toBeGreaterThan(0);
    for (const c of n.containers) {
      expect(c.name).toBeTruthy();
      for (const ip of c.ips) expect(ip).toMatch(/^[0-9a-f.:]+$/i);
    }
  }

  await page.goto(`/users/${USER}#networks`);
  const panel = page.locator(`[x-show="activeTab === 'networks'"]`);
  await expect(panel).toBeVisible();
  await expect(panel.getByText('Loading networks…')).toBeHidden();
  if (nets.length === 0) {
    await expect(panel.getByText('This user has no networks.')).toBeVisible();
    return;
  }
  for (const n of nets) await expect(panel.getByText(n.name, { exact: true }).first()).toBeVisible();

  // a row opens its details with the container IPs
  const withContainers = nets.find((n: any) => n.containers.length && n.containers[0].ips.length);
  if (withContainers) {
    await panel.getByText(withContainers.name, { exact: true }).first().click();
    await expect(panel.getByText(withContainers.containers[0].ips[0]).first()).toBeVisible();
  }
});

test('plan usage cards link to the lists searched for the user', async ({ page }) => {
  await page.goto(`/users/${USER}`);
  const overview = page.locator(`[x-show="activeTab === 'stats'"]`);
  const cards = overview.locator(`a[href$="?q=${USER}"]`);
  // websites is admin only, the other four are always there
  expect(await cards.count()).toBeGreaterThanOrEqual(4);
  for (const label of ['Domains', 'Databases', 'Emails', 'FTP']) {
    await expect(overview.getByText(label, { exact: true })).toBeVisible();
  }
  for (const card of await cards.all()) {
    await expect(card).toContainText(/\d+ of (\d+|∞)/);
  }

  const hrefs = await cards.evaluateAll(els => els.map(e => e.getAttribute('href')!));
  for (const href of hrefs) {
    await page.goto(href);
    // the email page only has the search box once the mail server runs
    const search = page.locator('input[x-model="searchQuery"]').first();
    if ((await search.count()) === 0) continue;
    await expect(search, `${href} should open searched for ${USER}`).toHaveValue(USER);
  }
});

test('custom message preview renders html and never runs its scripts', async ({ page }) => {
  // the saved message loads after the page, typing before it lands gets overwritten
  const loaded = page.waitForResponse(r => r.url().includes('/get_custom_message_for_user/'));
  await page.goto(`/users/${USER}`);
  await loaded;
  // the message sits next to Server on the overview, its pencil opens the editor with the preview
  const pencil = page.locator('button[aria-label="Change custom message"]');
  await pencil.locator('xpath=ancestor::div[@x-data][1]').hover();
  await pencil.click();
  const textarea = page.locator('#custom_message_for_this_user');
  await expect(textarea).toBeVisible();

  // typed only, never saved, so the user's real message stays as it was
  await textarea.fill('');
  await expect(page.locator('#custom_message_preview_empty')).toBeVisible();

  await textarea.fill('Maintenance on <b>Saturday</b><script>parent.window.__pwned = 1; document.title = "x"</script>');
  const preview = page.locator('#custom_message_preview');
  await expect(preview).toBeVisible();
  await expect(page.frameLocator('#custom_message_preview').locator('b')).toHaveText('Saturday');
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => (window as any).__pwned)).toBeUndefined();
  expect(await page.title()).not.toBe('x');
});

test('usage history shows cpu and memory in one column each, cpu as share of the limit', async ({ page }) => {
  const history = (await (await page.request.get(`/get_resource_usage_history/${USER}`)).text()).trim();
  await page.goto(`/users/${USER}#usage`);
  const panel = page.locator(`[x-show="activeTab === 'usage'"]`);
  await expect(panel).toBeVisible();

  const headers = (await panel.locator('thead th').allInnerTexts()).map(h => h.trim());
  expect(headers).toEqual(expect.arrayContaining(['CPU usage', 'Memory usage']));
  expect(headers).not.toContain('CPU %');
  expect(headers).not.toContain('Memory %');

  test.skip(!history, 'no usage recorded for this user yet');
  const last = JSON.parse(history.split('\n').pop()!);
  // collect_stats writes usage pct against the plan limit, cores come from pct and the limit
  const pct = last.cpu.usage.pct;
  const cores = (pct * last.cpu.total.pct / 10000).toFixed(1);

  const firstRow = panel.locator('tbody tr').first();
  await expect(firstRow.locator('[role="meter"]')).toHaveCount(2);
  const cpuCell = firstRow.locator('td').nth(1);
  await expect(cpuCell).toContainText(`${cores} / ${last.cpu.total.human}`);
  await expect(cpuCell).toContainText(`${pct}%`);
  await expect(firstRow.locator('td').nth(2)).toContainText(`${last.memory.usage_pct}%`);
});

test('the private note saves when the field is left and can be cleared again', async ({ page }) => {
  const original = (await (await page.request.get(`/get_user_notes/${USER}`)).json()).notes ?? '';
  const note = `pw note ${Date.now()}`;
  const field = page.locator('textarea[aria-label="Private note"]');
  const setNote = async (text: string) => {
    await page.goto(`/users/${USER}`);
    const pencil = page.locator('[aria-label="Edit private note"]');
    if (await pencil.count()) {
      await pencil.locator('xpath=..').hover();
      await pencil.click();
    } else {
      await field.click();
    }
    await field.fill(text);
    const saved = page.waitForResponse(r => r.url().includes('/get_user_notes/') && r.request().method() === 'POST');
    await page.locator('h1').first().click();
    expect((await saved).ok()).toBeTruthy();
  };
  try {
    await setNote(note);
    await page.reload();
    await expect(page.locator('[title="Private note, only admins and resellers see it"]')).toHaveText(note);
  } finally {
    await setNote(original);
  }
});

test('the overview cards include processes with the plan formula behind its pencil', async ({ page }) => {
  await page.goto(`/users/${USER}`);
  for (const label of ['Storage', 'Inodes', 'CPU', 'Memory', 'Processes']) {
    await expect(page.locator('.op-ring-card', { hasText: label }).first()).toBeVisible();
  }
  const pencil = page.locator('button[aria-label="Edit the process limit"]');
  test.skip(await pencil.count() === 0, 'resellers do not get the pencil');
  await pencil.locator('xpath=..').hover();
  await pencil.click();
  await expect(page.locator('#tasks-max-value')).toBeVisible();
  await expect(page.getByText('1000 processes per GB')).toBeVisible();
});
