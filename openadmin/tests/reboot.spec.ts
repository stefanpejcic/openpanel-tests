import { test, expect } from '@playwright/test';

test('reboot', async ({ page }) => {
  await page.goto('/server/reboot');

  await page.locator('#reboot_type').selectOption('graceful');
  await page.getByRole('button', { name: 'Reboot Server' }).click();

  await expect(page.locator('#success_reboot')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#success_reboot')).toContainText('The system has been rebooted.');
});
