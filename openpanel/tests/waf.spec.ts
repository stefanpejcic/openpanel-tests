import { test, expect } from '@playwright/test';

test('waf on/off', async ({ page }) => {
  await page.goto('/website?domain=wp.tests.openpanel.org');

  await page.locator('#waf_toggle_btn').click();
  const message = await page.getByText(/Firewall for wp\.tests\.openpanel\.org is now (On|Off)/).innerText();
  const isOn = message.includes('On');

  await page.waitForTimeout(5000);

  const response = await page.request.get('https://wp.tests.openpanel.org');
  
  if (isOn) {
    // WAF ON
    expect([403, 406, 409, 422]).toContain(response.status());
  } else {
    // WAF OFF
    expect(response.status()).toBe(200);
  }
  console.log('wp manager firewall on/off is working as expected!');
});
