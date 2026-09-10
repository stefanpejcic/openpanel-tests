import { test, expect } from '@playwright/test';

test('reboot', async ({ page }) => {
  // a real full server reboot (not just a service restart) can comfortably
  // take a few minutes; give it plenty of room so later tests in the run
  // don't start hitting the box while it's still coming back up.
  test.setTimeout(240_000);
  await page.goto('/server/reboot');

  await page.locator('#reboot_type').selectOption('graceful');
  await page.getByRole('button', { name: 'Reboot Server' }).click();

  const success = page.locator('#success_reboot');

  await expect(page.getByText('reboot is now in progress')).toBeVisible();

  await expect(success).not.toHaveClass(/hidden/, {timeout: 210_000,});
  await expect(success).toContainText('The system has been rebooted.');
});
