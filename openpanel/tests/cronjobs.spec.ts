import { test, expect, type Page } from '@playwright/test';

// These tests intentionally share a cron job. Run in order, in one worker.
test.describe.configure({ mode: 'serial' });

const JOB = 'curl job';
const UPDATED_JOB = 'updated description';
const COMMAND = 'curl https://google.com > /var/www/html/cron-test.txt';
const INITIAL_SCHEDULE = '@every 5s';

function jobRow(page: Page, name: string) {
  return page.locator('#cronjobs-table tbody tr').filter({
    has: page.locator('[data-sort-col="comment"]', { hasText: name }),
  });
}

async function jobTable(page: Page) {
  await page.goto('/cronjobs');
  await expect(page.locator('#cronjobs-table')).toBeVisible();
}

async function editorText(page: Page) {
  await expect(page.locator('.CodeMirror')).toBeVisible();
  return page.locator('.CodeMirror').evaluate((el: any) => el.CodeMirror.getValue() as string);
}

test('list', async ({ page }) => {
  await jobTable(page);
  await expect(page.locator('a[href="/cronjobs/new"]')).toBeVisible();
  await expect(page.locator('#page-tabs a[href="/cronjobs/editor"]')).toBeVisible();
  await expect(page.locator('#page-tabs a[href="/cronjobs/logs"]')).toBeVisible();
  // The list may contain existing jobs; an empty-state check is not appropriate.
});

test('create job', async ({ page }) => {
  await page.goto('/cronjobs/new');
  await expect(page).toHaveURL(/\/cronjobs\/new(?:\?|$)/);

  // The old "Switch to file editor" link was removed from this workflow.
  // Navigation to File Editor is now in the Cron Jobs page tabs.
  await expect(page.locator('#container')).toBeVisible();
  await page.locator('#container').selectOption('php-fpm-8.5');
  await page.getByRole('radio', { name: /custom/i }).check();
  await expect(page.locator('#schedule')).toBeVisible();
  await page.locator('#schedule').fill(INITIAL_SCHEDULE);
  await page.locator('#command').fill(COMMAND);
  await page.locator('#comment').fill(JOB);
  await page.getByRole('button', { name: /schedule cronjob/i }).click();

  await expect(page.getByText('Cron job created and saved successfully!')).toBeVisible();
  await jobTable(page);
  await expect(jobRow(page, JOB)).toBeVisible();
  await expect(jobRow(page, JOB)).toContainText(COMMAND);
});

test('view logs', async ({ page }) => {
  await jobTable(page);
  const row = jobRow(page, JOB);
  await expect(row).toBeVisible();

  // New frontend: a Logs link exists on each row as well as in the top tabs.
  await row.locator('a[href^="/cronjobs/logs?job="]').click();
  await expect(page).toHaveURL(/\/cronjobs\/logs(?:\?|$)/);

  // The logs endpoint returns an array. Poll instead of sleeping a fixed 15s.
  await expect.poll(async () => {
    const response = await page.request.get('/cronjobs/log', {
      params: { job: JOB, lines: '1000' },
    });
    if (!response.ok()) return 0;
    const body: unknown = await response.json();
    if (!Array.isArray(body)) return 0;
    return body.filter((entry: any) =>
      String(entry.log ?? entry.message ?? entry.msg ?? '').includes(JOB)
    ).length;
  }, { timeout: 30_000, intervals: [1_000, 2_000, 3_000] }).toBeGreaterThan(0);

  // The log page's table/dropdown structure isn't present in the provided HTML.
  // Verify its route and the underlying job-specific log data above.
});

test('edit as file', async ({ page }) => {
  await page.goto('/cronjobs/editor');
  await expect(page).toHaveURL(/\/cronjobs\/editor(?:\?|$)/);
  const before = await editorText(page);
  expect(before).toContain(`[job-exec "${JOB}"]`);
  expect(before).toContain(`command = ${COMMAND}`);

  // Only update this job's block, not the schedule of an unrelated job.
  const header = `[job-exec "${JOB}"]`;
  const start = before.indexOf(header);
  const end = before.indexOf('\n[', start + header.length);
  const blockEnd = end === -1 ? before.length : end;
  const block = before.slice(start, blockEnd);
  expect(block).toMatch(/^schedule\s*=.*$/m);
  const updatedBlock = block.replace(/^schedule\s*=.*$/m, 'schedule = * * * * * *');
  const after = before.slice(0, start) + updatedBlock + before.slice(blockEnd);

  await page.locator('.CodeMirror').evaluate((el: any, value) => {
    el.CodeMirror.setValue(value);
    el.CodeMirror.save();
  }, after);
  await page.getByRole('button', { name: /save changes/i }).click();
  await expect(page.getByText('Crons file saved successfully!')).toBeVisible();

  await jobTable(page);
  await expect(jobRow(page, JOB)).toContainText('* * * * * *');
});

test('edit job', async ({ page }) => {
  await jobTable(page);
  const edits: { field: string; value: string; select?: boolean }[] = [
    { field: 'schedule', value: '0 0 * * * *' },
    { field: 'container', value: 'php-fpm-8.4', select: true },
    { field: 'command', value: 'curl https://google.com' },
    { field: 'comment', value: UPDATED_JOB },
  ];
  let currentName = JOB;

  for (const edit of edits) {
    let row = jobRow(page, currentName);
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: `Edit ${currentName}` }).click();

    const field = row.locator(`[name="${edit.field}"]:visible`);
    await expect(field).toBeVisible();
    if (edit.select) await field.selectOption(edit.value);
    else await field.fill(edit.value);

    // Clicking Save posts to /cronjobs/edit and reloads/navigates.
    await Promise.all([
      page.waitForResponse(r => r.url().includes('/cronjobs/edit') && r.request().method() === 'POST'),
      row.getByRole('button', { name: `Save ${currentName}` }).click(),
    ]);

    if (edit.field === 'comment') currentName = edit.value;
    await jobTable(page);
    row = jobRow(page, currentName);
    await expect(row).toBeVisible();
    await expect(row).toContainText(edit.value);
  }
});

test('delete job', async ({ page }) => {
  await jobTable(page);
  const row = jobRow(page, UPDATED_JOB);
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: `Delete ${UPDATED_JOB}` }).click();

  // The row's delete button changes its title to Confirm for five seconds.
  const confirm = row.locator('button[title="Confirm"]');
  await expect(confirm).toBeVisible();
  await confirm.click();
  await expect(page.getByText('Cron job was successfully deleted.')).toBeVisible();
  await jobTable(page);
  await expect(jobRow(page, UPDATED_JOB)).toHaveCount(0);
});
