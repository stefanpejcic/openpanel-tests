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

// podman update can't lift a limit, so 0 only saves and offers a restart, nothing restarts on its own
test('a limit set to 0 offers a restart instead of applying it', async ({ page }) => {
  await page.goto('/services/limits');
  const field = page.locator('[name="REDIS_CPUS"]');
  test.skip(await field.count() === 0, 'no REDIS_CPUS limit on this server');
  const original = await field.inputValue();
  test.skip(original === '0', 'REDIS_CPUS is already 0 here');
  const save = async (v: string) => {
    await page.goto('/services/limits');
    await page.getByRole('button', { name: 'Edit REDIS_CPUS' }).click();
    const input = page.locator('[name="REDIS_CPUS"]');
    await input.fill(v);
    await input.locator('xpath=ancestor::form').getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('New limits saved successfully!', { exact: false })).toBeVisible({ timeout: 30_000 });
  };
  try {
    await save('0');
    await expect(page.getByText(/Restart to apply: [^.]*openpanel_redis/)).toBeVisible();
    await expect(page.locator('form[action="/services/limits/recreate"]').getByRole('button', { name: 'Restart openpanel_redis' })).toBeVisible();
  } finally {
    await save(original);
  }
});

test('usage and Docker Hub tags load for the table', async ({ page }) => {
  const usage = await page.request.get('/services/limits/usage');
  expect(usage.ok()).toBeTruthy();
  const stats = await usage.json();
  for (const [name, s] of Object.entries<any>(stats)) {
    expect(name).toBeTruthy();
    expect(typeof s.cpu).toBe('number');
    expect(s.pids).toBeGreaterThanOrEqual(0);
  }

  await page.goto('/services/limits');
  // a *_VERSION row whose image tag comes from .env turns into a select of tags
  const select = page.locator('select[name$="_VERSION"]').first();
  test.skip(await select.count() === 0, 'no image version picked through .env here');
  const key = (await select.getAttribute('name'))!;
  const tags = await (await page.request.get('/services/limits/tags?key=' + encodeURIComponent(key))).json();
  expect(Array.isArray(tags.tags)).toBeTruthy();
  // a key that doesn't pick an image is refused
  const bad = await page.request.get('/services/limits/tags?key=NOT_A_REAL_KEY');
  expect(bad.status()).toBe(400);
});
