import { test, expect } from '@playwright/test';

test('test processes sorting asc/desc for each column', async ({ page }) => {
  await page.goto('/server/processes');
  await expect(page).toHaveURL(/server\/processes/);

  const table = page.locator('#processes_table');

  const columns = [
    { name: 'Pid', asc: 'pid', desc: '-pid', type: 'number' },
    { name: 'Owner', asc: 'owner', desc: '-owner', type: 'string' },
    { name: 'Priority', asc: 'priority', desc: '-priority', type: 'number' },
    { name: 'CPU %', asc: 'cpu', desc: '-cpu', type: 'number' },
    { name: 'Memory %', asc: 'memory', desc: '-memory', type: 'number' },
    { name: 'Command', asc: 'command', desc: '-command', type: 'string' },
  ];

  const getColumnValues = async (colIndex: number) => {
    return await table.locator(`tbody tr td:nth-child(${colIndex + 1})`).allInnerTexts();
  };

  const parse = (values: string[], type: string) => {
    return values.map(v => {
      const cleaned = v.trim();
      return type === 'number' ? parseFloat(cleaned) : cleaned.toLowerCase();
    });
  };

  for (const col of columns) {
    const header = table.locator('th', { hasText: col.name });

    // ---------- ASC ----------
    await header.locator(`a[href*="sort=${col.asc}"]`).click();
    await page.waitForURL(`**sort=${col.asc}**`);

    const ascValues = parse(await getColumnValues(columns.indexOf(col)), col.type);

    const ascFirst = ascValues[0];
    const ascLast = ascValues[ascValues.length - 1];

    // validate ordering ASC
    const sortedAsc = [...ascValues].sort((a, b) =>
      col.type === 'number' ? a - b : a.localeCompare(b)
    );

    expect(ascValues).toEqual(sortedAsc);

    // ---------- DESC ----------
    await header.locator(`a[href*="sort=${col.desc}"]`).click();
    await page.waitForURL(`**sort=${col.desc}**`);

    const descValues = parse(await getColumnValues(columns.indexOf(col)), col.type);

    const descFirst = descValues[0];
    const descLast = descValues[descValues.length - 1];

    // validate ordering DESC
    const sortedDesc = [...descValues].sort((a, b) =>
      col.type === 'number' ? b - a : b.localeCompare(a)
    );

    expect(descValues).toEqual(sortedDesc);

    // ---------- CROSS CHECK ----------
    expect(ascFirst).not.toEqual(descFirst);
    expect(ascLast).not.toEqual(descLast);

    // strongest check: DESC should be reverse of ASC
    expect(descValues).toEqual([...ascValues].reverse());
  }
});
