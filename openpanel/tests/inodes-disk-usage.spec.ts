import { test, expect } from '@playwright/test';

const explorerTests = [
  {
    name: 'Disk Usage Explorer',
    route: '/disk-usage',
    columnHeader: 'Size',
    valueRegex: /^\d+(\.\d+)?\s?[KMGT]?B?$/ 
  },
  {
    name: 'Inodes Explorer',
    route: '/inodes-explorer',
    columnHeader: 'INodes',
    valueRegex: /^\d+$/ 
  }
];

for (const { name, route, columnHeader, valueRegex } of explorerTests) {
  test(`${name} is functional`, async ({ page }) => {
    // 1. Initial
    await page.goto(route);
    const table = page.locator('#folders_to_navigate');
    
    await expect(table).toBeVisible();
    await expect(table).toContainText('docker-data');
    await expect(table.locator('th', { hasText: columnHeader })).toBeVisible();
    
    const chart = page.locator('#folderChart');
    await expect(chart).toBeVisible();

    let box = await chart.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);

    const valueCells = table.locator('tbody tr td:nth-child(2)');
    const count = await valueCells.count();
    for (let i = 0; i < count; i++) {
      const text = (await valueCells.nth(i).textContent())?.trim();
      expect(text).toMatch(valueRegex);
    }

    // 2. enter "docker-data'
    const dockerLink = page.locator(`a[href*="${route}/docker-data"]`);
    await dockerLink.click();

    await expect(page).toHaveURL(new RegExp(`${route}/docker-data/?`));
    
    const table2 = page.locator('#folders_to_navigate');
    await expect(table2).toContainText('containerd');
    await expect(table2.locator('th', { hasText: columnHeader })).toBeVisible();
    
    const containerdRow = table2.locator('tr', { hasText: 'containerd' });
    const valueCell = containerdRow.locator('td').nth(1);
    
    await expect(valueCell).toBeVisible();
    const cellText = (await valueCell.textContent())?.trim();
    expect(cellText).toMatch(valueRegex);

    const isRendered = await page.evaluate(() => {
      const canvas = document.getElementById('folderChart') as HTMLCanvasElement;
      if (!canvas) return false;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      return Array.from(data).some((v) => v !== 0);
    });
    expect(isRendered).toBeTruthy();

    // 3. "Up One Level"
    const upOneLevelLink = page.locator('a', { hasText: 'Up One Level' });
    await upOneLevelLink.click();
    
    await expect(page).toHaveURL(new RegExp(`${route}/?$`));
    const table3 = page.locator('#folders_to_navigate');
    await expect(table3).toContainText('docker-data');
    await expect(table3).not.toContainText('containerd');
    
    console.log(`${name} functional check passed`);
  });
}
