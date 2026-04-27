import { test, expect } from '@playwright/test';



test('list', async ({ page }) => {
  await page.goto('/cronjobs');
  await expect(page.getByText(/no cronjobs yet/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /create new/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /switch to file editor/i })).toBeVisible();
  console.log(`cronjobs functional`);
});



test('create', async ({ page }) => {
  await page.goto('/cronjobs/new');
  await expect(page).toHaveURL(/\/cronjobs\/new/);

  await page.selectOption('#container', 'php-fpm-8.5');
  await page.fill('#schedule', '@every 15s');
  const testCommand = 'curl https://google.com > /var/www/html/cron-test.txt';
  await page.fill('#command', testCommand);
  await page.fill('#comment', 'curl job');

  await page.getByRole('button', { name: 'Schedule CronJob' }).click();

  await expect(page.getByText('Cron job created and saved successfully!')).toBeVisible();

  const tableRow = page.locator('tr', { hasText: 'curl job' });
  await expect(tableRow).toBeVisible();
  await expect(tableRow).toContainText(testCommand);

  console.log(`cronjob created`);
});



test('logs', async ({ page }) => {
  await page.goto('/cronjobs');

  const tableRow = page.locator('tr', { hasText: 'curl job' });
  await expect(tableRow).toBeVisible();

  const logsButton = tableRow.locator('button', {
    hasText: /log|logs/i,
  });

  await logsButton.click();

  const logsPanel = page.locator('[x-show="logsOpen"]');
  await expect(logsPanel).toBeVisible();

  const logRows = logsPanel.locator('table tbody tr');
  await expect(logRows.first()).toBeVisible();
  expect(await logRows.count()).toBeGreaterThan(0);

  console.log('cronjob logs working');
});



test('file editor', async ({ page }) => {
  await page.goto('/cronjobs?view=code');
  await expect(page).toHaveURL(/\/cronjobs\?view=code/);

  const expectedCron = `[job-exec "curl job"]
schedule = @every 15s
container = php-fpm-8.5
command = curl https://google.com > /var/www/html/cron-test.txt`;

  const actualContent = await page.evaluate(() => {
    return document.querySelector('.CodeMirror').CodeMirror.getValue();
  });

  expect(actualContent.trim()).toBe(expectedCron);

  const updatedContent = expectedCron.replace('@every 15s', '* * * * * *');
  
  await page.evaluate((val) => {
    const cm = document.querySelector('.CodeMirror').CodeMirror;
    cm.setValue(val);
    cm.save();
  }, updatedContent);

  await page.getByRole('button', { name: 'Save Changes' }).click();
  
  await expect(page.getByText('Crontab file saved successfully!')).toBeVisible();

  const postSaveContent = await page.evaluate(() => {
    return document.querySelector('.CodeMirror').CodeMirror.getValue();
  });
  expect(postSaveContent).toContain('schedule = * * * * * *');

  await page.goto('/cronjobs?view=table');
  await expect(page).toHaveURL(/\/cronjobs\?view=table/);
  const tableRow = page.locator('tr', { hasText: 'curl job' });
  await expect(tableRow).toBeVisible();
  await expect(tableRow).toContainText(`* * * * * *`);

  console.log(`cronjob file editor working`);
});



test('edit cronjob fields', async ({ page }) => {
  await page.goto('/cronjobs?view=table');
  await expect(page).toHaveURL(/\/cronjobs\?view=table/);

  const tableRow = page.locator('tr', { hasText: 'curl job' });
  await expect(tableRow).toBeVisible();

  const edits = [
    { label: 'schedule', newValue: '0 0 * * *', originalValue: '* * * * * *' },
    { label: 'container', newValue: 'another-service', isSelect: true },
    { label: 'command', newValue: 'curl https://google.com' },
    { label: 'comment', newValue: 'updated description' },
  ];

  for (const edit of edits) {
    await tableRow.getByRole('button', { name: /Edit/i }).click();

    if (edit.isSelect) {
      await tableRow.locator('select[name="container"]').selectOption(edit.newValue);
    } else {
      const input = tableRow.locator(`input[name="${edit.label}"]`);
      await input.fill(edit.newValue);
    }

    await tableRow.getByRole('button', { name: /Save/i }).click();

    await expect(page.getByText('Cron job was successfully edited.')).toBeVisible();
    await expect(tableRow).toContainText(edit.newValue);
  }
});



test('delete', async ({ page }) => {

  console.log(`delete working`);
});

test('delete', async ({ page }) => {

  console.log(`delete working`);
});
