import { test, expect } from '@playwright/test';

test('disk usage explorer is functional', async ({ page }) => {
  await page.goto('/disk-usage');
  const table = page.locator('#folders_to_navigate');
  
  await expect(table).toBeVisible();
  await expect(table).toContainText('docker-data');
  await expect(table.locator('th', { hasText: 'Size' })).toBeVisible();
  const chart = page.locator('#folderChart');
  await expect(chart).toBeVisible();

  let box = await chart.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(0);
  expect(box!.height).toBeGreaterThan(0);

  // 1. /
  const sizeCells = table.locator('tbody tr td:nth-child(2)');
  const count = await sizeCells.count();

  for (let i = 0; i < count; i++) {
    const text = (await sizeCells.nth(i).textContent())?.trim();
    expect(text).toMatch(/^\d+(\.\d+)?\s?[KMGT]B?$/);
  }

  // 2. enter directory: 'docker-data'
  const dockerLink = page.locator('a[href="/disk-usage/docker-data/"]');
  await dockerLink.click();

  await expect(page).toHaveURL(/\/disk-usage\/docker-data\/?/);
  const table2 = page.locator('#folders_to_navigate');
  await expect(table2).toContainText('containerd');
  await expect(table2.locator('th', { hasText: 'Size' })).toBeVisible();
  const containerdRow = table2.locator('tr', { hasText: 'containerd' });
  const sizeCell = containerdRow.locator('td').nth(1);
  await expect(sizeCell).toBeVisible();
  await expect(sizeCell).not.toHaveText('');
  const sizeText = (await sizeCell.textContent())?.trim();
  expect(sizeText).toMatch(/^\d+(\.\d+)?\s?[KMGT]B?$/);
  const chart2 = page.locator('#folderChart');
  await expect(chart2).toBeVisible();
  box = await chart2.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(0);
  expect(box!.height).toBeGreaterThan(0);

  const isRendered = await page.evaluate(() => {
    const canvas = document.getElementById('folderChart') as HTMLCanvasElement;
    if (!canvas) return false;

    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    return Array.from(data).some((v) => v !== 0);
  });

  expect(isRendered).toBeTruthy();


  // 3. click on 'Up One Level' link and verify navigation back
  const upOneLevelLink = page.locator('a', { hasText: 'Up One Level' });
  await upOneLevelLink.click();
  await expect(page).toHaveURL(/\/disk-usage\/?$/);
  const table3 = page.locator('#folders_to_navigate');
  await expect(table3).toBeVisible();
  await expect(table3).toContainText('docker-data');
  await expect(table3).not.toContainText('containerd');
  
  console.log('disk usage explorer is functional');
});
