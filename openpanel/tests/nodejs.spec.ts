import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://185.7.32.60:2083/files/nodejs.tests.openpanel.org?view=classic');
});
