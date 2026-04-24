import { test, expect } from '@playwright/test';

test('manage crons', async ({ page }) => {
  await page.goto('/server/crons');
  await expect(page).toHaveURL(/server\/crons/);

  const saveButton = page.getByRole('button', { name: /save/i });
  const successToast = page.getByText('Cron jobs updated successfully');

  const rows = page.locator('tbody tr');

  const rowCount = await rows.count();

  for (let r = 0; r < rowCount; r++) {
    const row = rows.nth(r);

    const inputs = row.locator('td:first-child input[type="text"]');
    const inputCount = await inputs.count();

    const originals: string[] = [];
    for (let i = 0; i < inputCount; i++) {
      originals.push(await inputs.nth(i).inputValue());
    }

    const makeNewValue = (val: string) => {
      if (val === '*') return '1';
      if (val.startsWith('*/')) return '*/2';
      if (/^\d+$/.test(val)) return String(Number(val) + 1);
      return '1';
    };

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);

      const originalValue = originals[i];
      const newValue = makeNewValue(originalValue);

      if (newValue === originalValue) continue;

      await input.fill(newValue);
      await saveButton.click();

      await expect(successToast).toBeVisible();

      await expect(input).toHaveValue(newValue);

      await input.fill(originalValue);
      await saveButton.click();

      await expect(successToast).toBeVisible();
      await expect(input).toHaveValue(originalValue);
    }
  }
});
