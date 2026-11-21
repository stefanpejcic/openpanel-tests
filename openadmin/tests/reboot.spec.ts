import { test, expect } from '@playwright/test';

test('reboot', async ({ page }) => {
  // a real full server reboot (not just a service restart) can comfortably
  // take a few minutes; give it plenty of room so later tests in the run
  // don't start hitting the box while it's still coming back up.
  test.setTimeout(420_000);
  await page.goto('/server/reboot');

  await page.locator('#reboot_type').selectOption('graceful');
  await page.getByRole('button', { name: 'Reboot Server' }).click();

  const success = page.locator('#success_reboot');

  await expect(page.getByText('reboot is now in progress')).toBeVisible();

  await expect(success).not.toHaveClass(/hidden/, {timeout: 210_000,});
  await expect(success).toContainText('The system has been rebooted.');

  // the success banner only means admin (:2087) is back; the user panel container
  // (:2083) comes up a bit later, so wait for it too or the autologin specs that
  // run after this one hit ERR_CONNECTION_REFUSED on /login/token/<user>
  const host = new URL(process.env.BASE_URL!).hostname;
  const userPanel = `https://${host}:2083/`;
  await expect.poll(async () => {
    const res = await page.request.get(userPanel, { failOnStatusCode: false, timeout: 10_000 }).catch(() => null);
    return res ? res.status() : 0;
  }, { message: 'user panel (:2083) did not come back after reboot', timeout: 180_000, intervals: [3000] }).toBeGreaterThan(0);
});
