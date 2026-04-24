import { test, expect } from '@playwright/test';

test('test processes sorting asc/desc for each column', async ({ page }) => {
  await page.goto('/server/processes');
  await expect(page).toHaveURL(/server\/processes/);

  const table = page.locator('#processes_table');

  const columns = [
    { name: 'Pid', asc: 'pid', desc: '-pid' },
    { name: 'Owner', asc: 'owner', desc: '-owner' },
    { name: 'Priority', asc: 'priority', desc: '-priority' },
    { name: 'CPU %', asc: 'cpu', desc: '-cpu' },
    { name: 'Memory %', asc: 'memory', desc: '-memory' },
    { name: 'Command', asc: 'command', desc: '-command' },
  ];

  for (const col of columns) {
    const header = table.locator('th', { hasText: col.name });

    // ASC
    await header.locator(`a[href*="sort=${col.asc}"]`).click();
    await page.waitForURL(`**sort=${col.asc}**`);
    await expect(page).toHaveURL(new RegExp(`sort=${col.asc}`));

    const firstRowAsc = await table.locator('tbody tr').first().innerText();

    // DESC
    await header.locator(`a[href*="sort=${col.desc}"]`).click();
    await page.waitForURL(`**sort=${col.desc}**`);
    await expect(page).toHaveURL(new RegExp(`sort=${col.desc}`));

    const firstRowDesc = await table.locator('tbody tr').first().innerText();

    expect(firstRowAsc).not.toEqual(firstRowDesc);
  }
});
