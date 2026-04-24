import { test, expect } from '@playwright/test';

test('reboot', async ({ page }) => {
  await page.goto('/server/reboot/');
  await page.locator('#reboot_type').selectOption('graceful');
  await page.getByRole('button', { name: 'Reboot Server' }).click();
  const successMessage = page.getByText('The system has been rebooted.');
  await expect(successMessage).toBeVisible();
  const text = await successMessage.textContent();
  console.log(text);
});
