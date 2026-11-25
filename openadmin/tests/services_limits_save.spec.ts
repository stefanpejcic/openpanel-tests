import { test, expect } from '@playwright/test';

// Services > Limits writes /root/.env and pushes the change to the running container, the original goes back after
test('a service limit is saved to the environment and read back', async ({ page }) => {
  await page.goto('/services/limits');
  const field = page.locator('[name="REDIS_CPUS"]');
  test.skip(await field.count() === 0, 'no REDIS_CPUS limit on this server');
  const original = await field.inputValue();
  const save = async (v: string) => {
    await page.goto('/services/limits');
    // the limit sits behind the pencil next to Allocated
    await page.getByRole('button', { name: 'Edit REDIS_CPUS' }).click();
    const input = page.locator('[name="REDIS_CPUS"]');
    await input.fill(v);
    await input.locator('xpath=ancestor::form').getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('New limits saved successfully!', { exact: false })).toBeVisible({ timeout: 30_000 });
  };
  try {
    await save(original === '0.9' ? '0.8' : '0.9');
    // the running redis container got it, not just the file
    await expect(page.getByText(/Applied right away to: [^.]*openpanel_redis/)).toBeVisible();
    await page.reload();
    await expect(page.locator('[name="REDIS_CPUS"]')).toHaveValue(original === '0.9' ? '0.8' : '0.9');
  } finally {
    await save(original);
  }
});
