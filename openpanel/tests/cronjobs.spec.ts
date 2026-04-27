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



test('todo', async ({ page }) => {

  // LOGS AFTER CREATE
  
  // EDIT

  // LOGS AFTER EDIT
 
  // DELETE

  // LOGS AFTER DELETE


  
  
   
  console.log(`cronjobs functional`);
});

     
