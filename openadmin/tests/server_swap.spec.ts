import { test, expect } from '@playwright/test';

// NOTE: verify-only -- "Apply" recreates the real swap file (fallocate/dd +
// mkswap + swapon, briefly disabling swap) and "Drop Swap" runs a real
// `swapoff -a; swapon -a` against the host. Neither is clicked, matching
// server_resource_usage.spec.ts's own caution around the same drop-swap
// operation reachable from that page.

test('swap page loads with current usage, devices table, and controls', async ({ page }) => {
  await page.goto('/server/swap');
  await expect(page).toHaveURL(/server\/swap/);

  await expect(page.getByRole('heading', { name: 'Swap' })).toBeVisible();
  await expect(page.getByText('Total', { exact: true })).toBeVisible();
  await expect(page.getByText('Used', { exact: true })).toBeVisible();
  await expect(page.getByText('Free', { exact: true })).toBeVisible();

  const rows = page.locator('tbody tr');
  const count = await rows.count();
  if (count === 1 && (await rows.first().locator('td[colspan]').count()) > 0) {
    await expect(page.getByText('No swap devices are currently active.')).toBeVisible();
    console.log('swap page loaded, no active swap devices');
  } else {
    await expect(page.locator('thead').getByText('Priority', { exact: true })).toBeVisible();
    console.log(`swap page loaded with ${count} active swap device(s)`);
  }

  const sizeInput = page.locator('#swap_size_gb');
  await expect(sizeInput).toBeVisible();
  await expect(sizeInput).toHaveAttribute('min', '0.125');
  const prefilled = await sizeInput.inputValue();
  expect(parseFloat(prefilled)).toBeGreaterThan(0);

  await expect(page.getByRole('button', { name: 'Apply' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Drop Swap' })).toBeVisible();

  console.log('swap page loaded with allocation and drop controls');
});
