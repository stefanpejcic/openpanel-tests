import { test, expect } from '@playwright/test';

test('zone template edit and restore flow', async ({ page }) => {
    await page.goto(`/domains/zone-templates/`);

    const ipv4Textarea = page.locator('textarea#zone_template_ipv4');
    const comment = ';comment added';

    // 1. Edit the IPv4 Template
    const originalValue = await ipv4Textarea.inputValue();
    await ipv4Textarea.fill(originalValue + '\n' + comment);

    // 2. Save the changes
    await page.getByRole('button', { name: 'Save Files' }).click();

    await expect(page.getByText('Template updated successfully!')).toBeVisible();
    await expect(ipv4Textarea).toHaveValue(new RegExp(comment));

    // 4. Restore to Default
    await page.getByRole('button', { name: 'Restore Default' }).first().click();
    await expect(ipv4Textarea).not.toHaveValue(new RegExp(comment));
    await page.getByRole('button', { name: 'Save Files' }).click();

    // 6. Final verification
    await expect(page.getByText('Template updated successfully!')).toBeVisible();
    await expect(ipv4Textarea).not.toHaveValue(new RegExp(comment));
});
