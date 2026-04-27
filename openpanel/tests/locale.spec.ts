import { test, expect } from '@playwright/test';

const localeMapping = {
    'ne': 'ne-np',
    'en': 'en-us',
    'pt': 'pt-br',
    'uk': 'uk-ua',
    'zh': 'zh-cn',
};

async function getTranslation(locale) {
    const folder = localeMapping[locale] || locale;
    const url = `https://raw.githubusercontent.com/stefanpejcic/openpanel-translations/main/${folder}/messages.po`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const text = await response.text();
        
        // Matches the msgstr for the "Change Language" msgid
        const regex = /msgid "Change Language"\s+msgstr "(.*)"/;
        const match = text.match(regex);
        return match ? match[1] : null;
    } catch (e) {
        return null;
    }
}

const localesToTest = [ 'bg', 'de', 'en', 'es', 'fr', 'hu', 'ne', 'pt', 'ro', 'ru', 'tr', 'uk', 'zh'];

test.describe('Change and use locale', () => {
    
    for (const locale of localesToTest) {
        
        test(`locale: ${locale}`, async ({ page }) => {
            const expectedText = await getTranslation(locale);
            test.skip(!expectedText, `Translation key for "${locale}" not found on GitHub.`);

            await page.goto('/account/language');
            await page.selectOption('#locale-select', locale);
            const locator = page.getByText(expectedText, { exact: true });
            await expect(locator).toBeVisible({ timeout: 5000 });
        });
    }
});
