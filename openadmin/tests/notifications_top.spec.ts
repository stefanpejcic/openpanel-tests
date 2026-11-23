import { test, expect } from '@playwright/test';

test('notifications page loads with table and edit settings link', async ({ page }) => {
  await page.goto('/notifications');
  await expect(page).toHaveURL(/notifications/);

  await expect(page.locator('#tour-notifications-table')).toBeVisible();
  await expect(page.locator('#tour-edit-settings-link')).toHaveAttribute('href', '/settings/notifications');
  await expect(page.locator('#tour-bulk-actions')).toBeVisible();

  console.log('notifications page loaded');
});

test('search filters the notifications table', async ({ page }) => {
  await page.goto('/notifications');
  await expect(page).toHaveURL(/\/notifications/);

  const table = page.locator('#tour-notifications-table');
  const rows = table.locator('tbody tr');
  const search = page.locator('#tour-notifications-search');

  await expect(table).toBeVisible();
  await expect(search).toBeVisible();

  const initialCount = await rows.count();

  test.skip(
    initialCount === 0,
    'No notifications recorded on this environment'
  );

  // Columns:
  // 0 = Time
  // 1 = Status (hidden)
  // 2 = Notification
  // 3 = Details
  // 4 = Actions
  // the title cell is found by its content, a cluster master adds a Server column before it
  const titleCell = (row: any) => row.locator('td:not([data-cluster-server])').nth(2);
  const firstTitle = (await titleCell(rows.first()).innerText()).split('\n')[0].trim();

  expect(firstTitle).not.toBe('');

  console.log(`Searching notifications for: "${firstTitle}"`);

  // search runs on the server, the form reloads the page with ?q=
  await search.fill(firstTitle);
  await search.press('Enter');
  await expect(page).toHaveURL(/[?&]q=/);
  await page.waitForLoadState('load');
  await expect(rows.first()).toBeVisible();

  const count = await rows.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    await expect(rows.nth(i)).toContainText(firstTitle, { ignoreCase: true });
  }

  console.log(
    `search correctly filtered notifications using "${firstTitle}"`
  );
});

test('acknowledge a single unread notification', async ({ page }) => {
  await page.goto('/notifications');

  const ack = page.locator('#notifications_table tbody button[aria-label^="Acknowledge "]').first();
  test.skip((await ack.count()) === 0, 'No unread notifications to acknowledge');

  const unreadBefore = await page.locator('#notifications_table tbody button[aria-label^="Acknowledge "]').count();
  await ack.click();
  await page.waitForLoadState('load');
  await expect(page.locator('#notifications_table tbody button[aria-label^="Acknowledge "]')).toHaveCount(unreadBefore - 1);

  console.log('acknowledged a single unread notification');
});

test('row menu has settings and delete, and closes on outside click', async ({ page }) => {
  await page.goto('/notifications');

  const menu = page.locator('details.nt-menu').first();
  test.skip((await menu.count()) === 0, 'No notifications to open a menu on');

  // the delete confirm used to flash on every row while the page loaded
  await expect(page.getByText('Click again to delete')).toHaveCount(0);

  await menu.locator('summary').click();
  const list = menu.locator('[role=menu]');
  await expect(list).toBeVisible();
  await expect(list.getByRole('menuitem', { name: /Turn off these alerts|Notification settings/ })).toHaveAttribute('href', /^\/settings\/notifications/);
  await expect(list.getByRole('menuitem', { name: 'Delete' })).toBeVisible();

  await page.mouse.click(5, 5);
  await expect(list).toBeHidden();

  console.log('row menu opens with its actions and closes on outside click');
});

test('delete single notification requires a second confirm click', async ({ page }) => {
  await page.goto('/notifications');

  const menu = page.locator('details.nt-menu').first();
  test.skip((await menu.count()) === 0, 'No notifications to test delete-confirm flow on');

  const rowsBefore = await page.locator('details.nt-menu').count();
  await menu.locator('summary').click();
  const del = menu.locator('.nt-del');
  await del.click();
  await expect(del).toHaveText('Click again to delete');
  await expect(page.locator('details.nt-menu')).toHaveCount(rowsBefore);

  // do not click again, just check the confirm gate and that it reverts
  await expect(del).toHaveText('Delete', { timeout: 5000 });
  console.log('delete notification requires a second confirming click (not confirmed)');
});

test('manage link and turn off link point at the right pages', async ({ page }) => {
  await page.goto('/notifications');

  const manage = page.locator('#notifications_table tbody a[title][aria-label]').first();
  if ((await manage.count()) > 0) {
    const href = await manage.getAttribute('href');
    expect(href).toMatch(/^\//);
    const resp = await page.request.get(href!);
    expect(resp.status()).toBe(200);
  }

  const off = page.getByRole('menuitem', { name: 'Turn off these alerts', includeHidden: true }).first();
  test.skip((await off.count()) === 0, 'No notification with a settings toggle on this environment');

  const href = (await off.getAttribute('href'))!;
  expect(href).toMatch(/^\/settings\/notifications#\w+$/);
  await page.goto(href);
  // the anchor is the field that turns the alert off
  const id = href.split('#')[1];
  await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);

  console.log(`manage link opens and turn off link lands on #${id}`);
});

test('acknowledge all button is present and submits without confirmation', async ({ page }) => {
  await page.goto('/notifications');

  const ackAllButton = page.getByRole('button', { name: 'Acknowledge all', exact: true });
  await expect(ackAllButton).toBeVisible();

  await ackAllButton.click();
  await page.waitForLoadState('load');
  await expect(page.locator('#notifications_table tbody button[aria-label^="Acknowledge "]')).toHaveCount(0);

  console.log('acknowledge all marked all notifications as read');
});

test('delete all button requires a second confirm click (not confirmed)', async ({ page }) => {
  // NOTE: verify-only -- "Delete All" permanently wipes notification history with no undo;
  // we only verify the two-click confirm gate, never actually confirm the deletion.
  await page.goto('/notifications');

  const deleteAllButton = page.getByRole('button', { name: 'Delete all', exact: true });
  await expect(deleteAllButton).toBeVisible();

  await deleteAllButton.click();
  await expect(page.getByText('Click to confirm')).toBeVisible();

  console.log('delete all shows confirm-to-proceed state (not confirmed)');
});
