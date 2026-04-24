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
    return await table
      .locator(`tbody tr td:nth-child(${colIndex + 1})`)
      .allInnerTexts();
  };

  const normalize = (values: string[], type: string) =>
    values
      .map(v => v.replace(/\u00a0/g, '').trim())
      .filter(Boolean)
      .map(v => (type === 'number' ? Number(v) : v.toLowerCase()));

const isMonotonicAsc = (arr: any[], type: string) => {
  for (let i = 1; i < arr.length; i++) {
    if (type === 'number') {
      if (arr[i] < arr[i - 1]) return false;
    } else {
      if (String(arr[i]) < String(arr[i - 1])) return false;
    }
  }
  return true;
};

const isMonotonicDesc = (arr: any[], type: string) => {
  for (let i = 1; i < arr.length; i++) {
    if (type === 'number') {
      if (arr[i] > arr[i - 1]) return false;
    } else {
      if (String(arr[i]) > String(arr[i - 1])) return false;
    }
  }
  return true;
};


  for (const col of columns) {
    const header = table.locator('th', { hasText: col.name });

    // ================= ASC =================
    await header.locator(`a[href*="sort=${col.asc}"]`).click();
    await page.waitForURL(`**sort=${col.asc}**`);

    const ascValues = normalize(
      await getColumnValues(columns.indexOf(col)),
      col.type
    );

    expect(ascValues.length).toBeGreaterThan(0);
    expect(isMonotonicAsc(ascValues, col.type)).toBeTruthy();

    const ascFirst = ascValues[0];
    const ascLast = ascValues[ascValues.length - 1];

    // ================= DESC =================
    await header.locator(`a[href*="sort=${col.desc}"]`).click();
    await page.waitForURL(`**sort=${col.desc}**`);

    const descValues = normalize(
      await getColumnValues(columns.indexOf(col)),
      col.type
    );

    expect(descValues.length).toBeGreaterThan(0);
    expect(isMonotonicDesc(descValues, col.type)).toBeTruthy();

    const descFirst = descValues[0];
    const descLast = descValues[descValues.length - 1];

    // ================= BASIC DIRECTION CHECK =================
    expect(ascFirst).toBeDefined();
    expect(descFirst).toBeDefined();

    // ensure sorting direction actually changes ordering
    expect(ascFirst !== descFirst || ascLast !== descLast).toBeTruthy();
  }
});
