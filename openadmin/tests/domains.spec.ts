import { test, expect } from '@playwright/test';

test('edit ipv4 zone template', async ({ page }) => {
    await page.goto(`/domains/zone-templates`);

    const ipv4Textarea = page.locator('textarea#zone_template_ipv4');
    const comment = ';ipv4 comment added';

    const originalValue = await ipv4Textarea.inputValue();
    await ipv4Textarea.fill(originalValue + '\n' + comment);
    await page.getByRole('button', { name: 'Save Files' }).click();

    await expect(page.getByText('Template updated successfully!')).toBeVisible();
    await expect(ipv4Textarea).toHaveValue(new RegExp(comment));

    await page.getByRole('button', { name: 'Restore Default' }).nth(0).click();
    await expect(ipv4Textarea).not.toHaveValue(new RegExp(comment));
    await page.getByRole('button', { name: 'Save Files' }).click();

    await expect(page.getByText('Template updated successfully!')).toBeVisible();
    await expect(ipv4Textarea).not.toHaveValue(new RegExp(comment));
});



test('edit ipv6 zone template', async ({ page }) => {
    await page.goto(`/domains/zone-templates`);

    const ipv6Textarea = page.locator('textarea#zone_template_ipv6');
    const comment = ';ipv6 comment added';

    const originalValue = await ipv6Textarea.inputValue();
    await ipv6Textarea.fill(originalValue + '\n' + comment);
    await page.getByRole('button', { name: 'Save Files' }).click();

    await expect(page.getByText('Template updated successfully!')).toBeVisible();
    await expect(ipv6Textarea).toHaveValue(new RegExp(comment));

    await page.getByRole('button', { name: 'Restore Default' }).nth(1).click();
    await expect(ipv6Textarea).not.toHaveValue(new RegExp(comment));
    await page.getByRole('button', { name: 'Save Files' }).click();

    await expect(page.getByText('Template updated successfully!')).toBeVisible();
    await expect(ipv6Textarea).not.toHaveValue(new RegExp(comment));
});
