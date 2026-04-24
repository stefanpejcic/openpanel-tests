import { test, expect } from '@playwright/test';

test('process table sorting - verifies asc/desc direction only', async ({ page }) => {
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

  const getValues = async (colIndex: number) =>
    table
      .locator(`tbody tr td:nth-child(${colIndex + 1})`)
      .allInnerTexts();

  const normalize = (vals: string[]) =>
    vals.map(v => v.replace(/\u00a0/g, '').trim()).filter(Boolean);

  for (const col of columns) {
    const colIndex = columns.indexOf(col);
    const header = table.locator('th', { hasText: col.name });

    // ================= ASC =================
    await header.locator(`a[href*="sort=${col.asc}"]`).click();
    await page.waitForURL(`**sort=${col.asc}**`);

    const asc = normalize(await getValues(colIndex));
    expect(asc.length).toBeGreaterThan(0);

    const ascFirst = asc[0];
    const ascLast = asc[asc.length - 1];

    // ================= DESC =================
    await header.locator(`a[href*="sort=${col.desc}"]`).click();
    await page.waitForURL(`**sort=${col.desc}**`);

    const desc = normalize(await getValues(colIndex));
    expect(desc.length).toBeGreaterThan(0);

    const descFirst = desc[0];
    const descLast = desc[desc.length - 1];

    // ================= SIMPLE SORT DIRECTION CHECK =================
    expect(ascFirst).not.toBe(descFirst);
    expect(ascLast).not.toBe(descLast);
  }
});
