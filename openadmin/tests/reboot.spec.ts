import { test, expect } from '@playwright/test';

test('reboot', async ({ page }) => {
  await page.goto('/server/reboot');
  await page.locator('#reboot_type').selectOption('graceful');
  await page.getByRole('button', { name: 'Reboot Server' }).click();
  await expect(page.getByText('The system has been rebooted.')).toBeVisible({ timeout: 30_000 });
});
