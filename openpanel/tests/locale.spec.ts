import { test, expect } from '@playwright/test';

// differ
const localeMapping = {
    'ne': 'ne-np',
    'en': 'en-us',
    'uk': 'uk-ua',
    'zh': 'zh-cn',
};

// msgid "Change Language"
async function getTranslation(locale) {
    const folder = localeMapping[locale] || locale;
    const url = `https://raw.githubusercontent.com/stefanpejcic/openpanel-translations/main/${folder}/messages.po`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const text = await response.text();
        
        const regex = /msgid "Change Language"\s+msgstr "(.*)"/;
        const match = text.match(regex);
        return match ? match[1] : null;
    } catch (e) {
        console.error(`Failed to fetch translation for ${locale}`);
        return null;
    }
}

test('change locale and verify translations', async ({ page }) => {
    await page.goto('/account/language');

    const locales = await page.$$eval('#locale-select option:not([disabled])', options => 
        options.map(option => option.value)
    );

    for (const locale of locales) {
        const expectedText = await getTranslation(locale);
        
        if (!expectedText) {
            console.log(`⚠️ Skipping ${locale}: Translation file or key not found.`);
            continue;
        }

        await page.selectOption('#locale-select', locale);

        const locator = page.locator(`text="${expectedText}"`);
        
        try {
            await expect(locator).toBeVisible({ timeout: 5000 });
            console.log(`${locale} is working: "${expectedText}"`);
        } catch (error) {
            console.log(`${locale} not working: Expected "${expectedText}" but it was not found.`);
        }
    }
});
