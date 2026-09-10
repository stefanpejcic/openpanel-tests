import { test, expect } from '@playwright/test';

test('update proxy and test restart needed msg', async ({ page }) => {
  // this test restarts both the openpanel container and the OpenAdmin
  // service itself and waits for each to come back, which together can
  // comfortably exceed the default 30s test timeout.
  test.setTimeout(180_000);

  const randomNum = Math.floor(Math.random() * 100000);
  const randomLink = `newlink${randomNum}`;

  await page.goto('/settings/general');
  await expect(page).toHaveURL(/\/settings\/general/);

  // Update setting
  const redirectInput = page.getByRole('textbox', { name: /openpanel/i });
  await redirectInput.fill(randomLink);

  await page.getByRole('button', { name: /save settings/i }).click();

  // Toast — scope it so it can't match sidebar/nav text
  await expect(page.getByRole('alert')).toContainText(/settings updated/i);

  // Input value, not text content
  await expect(redirectInput).toHaveValue(randomLink);

  // Restart banner is a link; assert on the role, tolerate 1 or 2
  const restartLink = page.getByRole('link', { name: /services? needs? restart/i });
  await expect(restartLink).toBeVisible();

  await restartLink.click();
  await expect(page).toHaveURL(/\/services/);

  await page.getByRole('row', { name: 'OpenPanel UI' }).getByRole('button', { name: 'Restart openpanel', exact: true }).click();
  // restarting the openpanel container is async, so the banner count updates
  // only once the restart actually completes -- can take a while
  await expect(page.getByRole('link', { name: /1 service needs restart/i })).toBeVisible({ timeout: 60_000 });

  // the page-level "actions in progress" lock only clears on a fresh page
  // load, so the other action buttons stay disabled until we reload
  await page.reload();

  await page.getByRole('row', { name: 'OpenAdmin UI' }).getByRole('button', { name: 'Restart admin', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(/openadmin is restarting/i);

  // OpenAdmin restarts itself here, so give it a moment to come back up
  // before continuing to use the session.
  await expect(async () => {
    await page.goto('/services/');
    await expect(page).toHaveURL(/\/services/);
  }).toPass({ timeout: 60_000 });

  // Final state
  await expect(page.getByRole('link', { name: /needs? restart/i })).toHaveCount(0, { timeout: 30_000 });
});
