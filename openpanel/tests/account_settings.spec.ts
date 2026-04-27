import { test, expect } from '@playwright/test';

test('add domain', async ({ page }) => {
  await page.goto(`/domains`);
  console.log(`cert file exists`);
});     
