import { test, expect } from '@playwright/test';

const templates = [
  { type: 'ipv4', selector: 'textarea#zone_template_ipv4', restoreIndex: 0 },
  { type: 'ipv6', selector: 'textarea#zone_template_ipv6', restoreIndex: 1 },
];

for (const { type, selector, restoreIndex } of templates) {
  test(`edit ${type} zone template`, async ({ page }) => {
    await page.goto('/domains/zone-templates');

    const textarea = page.locator(selector);
    const comment = `;${type} comment added`;
    const saveButton = page.getByRole('button', { name: 'Save Files' });
    const successMsg = page.getByText('Template updated successfully!');

    // 1. Add and Save
    const originalValue = await textarea.inputValue();
    await textarea.fill(`${originalValue}\n${comment}`);
    await saveButton.click();

    await expect(successMsg).toBeVisible();
    await expect(textarea).toHaveValue(new RegExp(comment));

    // 2. Restore and Save
    await page.getByRole('button', { name: 'Restore Default' }).nth(restoreIndex).click();
    await expect(textarea).not.toHaveValue(new RegExp(comment));
    
    await saveButton.click();
    await expect(successMsg).toBeVisible();
    await expect(textarea).not.toHaveValue(new RegExp(comment));
  });
}
