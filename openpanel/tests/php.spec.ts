import { test, expect } from '@playwright/test';

// OPEN
test('view php versions', async ({ page }) => {
  await page.goto(`/php/domains`);
  // validate i table all domains have php version!
  console.log('php versions shown');
});
