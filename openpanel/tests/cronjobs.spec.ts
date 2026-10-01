import { test, expect } from '@playwright/test';



test('list', async ({ page }) => {
  await page.goto('/cronjobs');
  await expect(page.getByText(/no cronjobs yet/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /create new/i })).toBeVisible();
  console.log(`cronjobs functional`);
});



test('create job', async ({ page }) => {
  await page.goto('/cronjobs/new');
  await expect(page).toHaveURL(/\/cronjobs\/new/);

  await expect(
    page.getByRole('link', { name: /switch to file editor/i })
  ).toBeVisible();

  await page.selectOption('#container', 'php-fpm-8.5');

  // Enable custom schedule input
  await page.getByRole('radio', { name: 'Custom' }).click();

  await expect(page.locator('#schedule')).toBeVisible();
  await page.fill('#schedule', '@every 5s');

  const testCommand =
    'curl https://google.com > /var/www/html/cron-test.txt';

  await page.fill('#command', testCommand);
  await page.fill('#comment', 'curl job');

  await page.getByRole('button', { name: 'Schedule CronJob' }).click();

  await expect(
    page.getByText('Cron job created and saved successfully!')
  ).toBeVisible();

  const tableRow = page.locator('tr', { hasText: 'curl job' });
  await expect(tableRow).toBeVisible();
  await expect(tableRow).toContainText(testCommand);

  // TODO: check if service auto-started by fetching /api/services?name=cron

  console.log('cronjob created');
});


test('view logs', async ({ page }) => {
  await page.waitForTimeout(15000); // wait for job to run

  await page.goto('/cronjobs');

  const tableRow = page.locator('tr', { hasText: 'curl job' });
  await expect(tableRow).toBeVisible();

  await page.getByRole('link', { name: 'Logs', exact: true }).click();
  await expect(page).toHaveURL(/\/cronjobs\/logs/);

  const jobSelect = page.locator('select').first();
  await expect(jobSelect).toBeVisible();

  const responsePromise = page.waitForResponse(response =>
    response.url().includes('/cronjobs/log') &&
    response.url().includes('job=curl+job') &&
    response.status() === 200
  );

  await jobSelect.selectOption('curl job');

  const response = await responsePromise;
  const logs = await response.json();

  expect(Array.isArray(logs)).toBe(true);
  expect(logs.length).toBeGreaterThan(0);

  const logRows = page.locator('table tbody tr');
  await expect(logRows.first()).toBeVisible();

  await expect(page.locator('table tbody')).toContainText('curl job');

  console.log(`cronjob logs working: ${logs.length} entries`);
});



test('edit as file', async ({ page }) => {
  await page.goto('/cronjobs/editor');
  await expect(page).toHaveURL(/\/cronjobs\/editor/);

  const actualContent = await page.evaluate(() => {
    return (document.querySelector('.CodeMirror') as any).CodeMirror.getValue();
  });

  // Verify our cron job exists
  expect(actualContent).toContain('[job-exec "curl job"]');
  expect(actualContent).toContain(
    'command = curl https://google.com > /var/www/html/cron-test.txt'
  );

  // Change whatever schedule currently exists to every second
  const updatedContent = actualContent.replace(
    /^schedule\s*=.*$/m,
    'schedule = * * * * * *'
  );

  await page.evaluate((val) => {
    const cm = (document.querySelector('.CodeMirror') as any).CodeMirror;
    cm.setValue(val);
    cm.save();
  }, updatedContent);

  await page.getByRole('button', { name: 'Save Changes' }).click();

  await expect(
    page.getByText('Crons file saved successfully!')
  ).toBeVisible();

  const postSaveContent = await page.evaluate(() => {
    return (document.querySelector('.CodeMirror') as any).CodeMirror.getValue();
  });

  expect(postSaveContent).toContain('schedule = * * * * * *');

  // Verify change is reflected in table mode
  await page.goto('/cronjobs');
  await expect(page).toHaveURL(/\/cronjobs$/);

  const tableRow = page.locator('tr', { hasText: 'curl job' });
  await expect(tableRow).toBeVisible();
  await expect(tableRow).toContainText('* * * * * *');

  console.log('cronjob file editor working');
});

test('edit job', async ({ page }) => {
  await page.goto('/cronjobs');
  await expect(page).toHaveURL(/\/cronjobs$/);

  const edits = [
    { field: 'schedule', newValue: '0 0 * * * *' },
    { field: 'container', newValue: 'php-fpm-8.4', isSelect: true },
    { field: 'command', newValue: 'curl https://google.com' },
    { field: 'comment', newValue: 'updated description' },
  ];

  let currentComment = 'curl job';

  for (const edit of edits) {
    let tableRow = page.locator('tr', { hasText: currentComment });
    await expect(tableRow).toBeVisible();

    await tableRow
      .getByRole('button', { name: `Edit ${currentComment}` })
      .click();

    if (edit.isSelect) {
      await tableRow
        .locator('select[name="container"]')
        .selectOption(edit.newValue);
    } else {
      await tableRow
        .locator(`input[name="${edit.field}"]:visible`)
        .fill(edit.newValue);
    }

    // Save submits /cronjobs/edit and reloads the page.
    await Promise.all([
      page.waitForLoadState('domcontentloaded'),
      tableRow
        .getByRole('button', { name: `Save ${currentComment}` })
        .click(),
    ]);

    if (edit.field === 'comment') {
      currentComment = edit.newValue;
    }

    // Re-locate the row because the page was reloaded.
    tableRow = page.locator('tr', { hasText: currentComment });

    await expect(tableRow).toBeVisible();
    await expect(tableRow).toContainText(edit.newValue);
  }

  console.log('cronjob editing working');
});




test('delete job', async ({ page }) => {
  await page.goto('/cronjobs');

  const tableRow = page.locator('tr', {
    hasText: /curl job|updated description/
  });

  await expect(tableRow).toBeVisible();

  // First click - enters confirmation state
  const deleteButton = tableRow.getByRole('button', { name: /Delete/i });
  await deleteButton.click();

  // Same button now has title="Confirm"
  const confirmButton = tableRow.locator('button[title="Confirm"]');
  await expect(confirmButton).toBeVisible();
  await confirmButton.click();

  await expect(
    page.getByText('Cron job was successfully deleted.')
  ).toBeVisible();

  await expect(
    page.locator('tr', { hasText: /curl job|updated description/ })
  ).toHaveCount(0);

  console.log('delete working');
});
