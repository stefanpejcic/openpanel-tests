import { test, expect } from '@playwright/test';

test('reboot', async ({ page }) => {
  await page.goto('/server/reboot');

  await page.locator('#reboot_type').selectOption('graceful');
  await page.getByRole('button', { name: 'Reboot Server' }).click();

  const success = page.locator('#success_reboot');
  
  await expect(page.getByText('A reboot is now in progress')).toBeVisible();  
  
  await expect(success).not.toHaveClass(/hidden/, {timeout: 60_000,});
  await expect(success).toContainText('The system has been rebooted.'); 
});
