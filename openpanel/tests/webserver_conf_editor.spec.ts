import { test, expect } from '@playwright/test';

test('edit conf', async ({ page }) => {
  await page.goto('/server/webserver_conf');

  console.log(`/server/webserver_conf functional`);
});
