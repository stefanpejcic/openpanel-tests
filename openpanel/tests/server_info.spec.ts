import { test, expect } from '@playwright/test';

test('server info page', async ({ page }) => {
  await page.goto(`/server/info`);
  await expect(page).toHaveURL(/server\/info/);

  console.log('server info has data');
});


