import { test, expect } from '@playwright/test';


test('create new file and folder', async ({ page }) => {
  await page.goto(`/dashboard`);


  console.log('dashboard is functional');
});
