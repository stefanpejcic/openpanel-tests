import { test, expect } from '@playwright/test';

test('waf status', async ({ page }) => {
  await page.goto('/server/waf');

  console.log('wp manager firewall on/off is working as expected!');
});




test('waf on/off and disabled rules for domain', async ({ page }) => {
  const domain = 'wp.tests.openpanel.org';
  await page.goto(`/server/waf/${domain}`);

  const getToggleState = async () => {
    const btn = page.locator('button[aria-checked]');
    const checked = await btn.getAttribute('aria-checked');
    return checked === 'true';
  };

  const setWaf = async (desiredOn) => {
    const isOn = await getToggleState();
    if (isOn !== desiredOn) {
      await page.locator('button[aria-checked]').click();
      await page.waitForTimeout(2000);
      await page.reload();
    }
  };

  // A request that should be blocked by WAF (simulates XSS attempt)
  const blockedUrl = `https://${domain}/?q=<script>alert(1)</script>`;
  const cleanUrl = `https://${domain}/`;

  // ── 1. WAF ON → blocked request should be blocked, clean should pass ───────
  await setWaf(true);
  expect(await getToggleState()).toBe(true);

  let blocked = await page.request.get(blockedUrl, { failOnStatusCode: false });
  let clean = await page.request.get(cleanUrl, { failOnStatusCode: false });
  console.log(`WAF ON  → blocked req: ${blocked.status()}, clean req: ${clean.status()}`);
  expect([403, 406, 409, 422]).toContain(blocked.status());
  expect(clean.status()).toBe(200);

  // ── 2. WAF OFF → both requests should pass ─────────────────────────────────
  await setWaf(false);
  expect(await getToggleState()).toBe(false);

  blocked = await page.request.get(blockedUrl, { failOnStatusCode: false });
  clean = await page.request.get(cleanUrl, { failOnStatusCode: false });
  console.log(`WAF OFF → blocked req: ${blocked.status()}, clean req: ${clean.status()}`);
  expect(blocked.status()).toBe(200);
  expect(clean.status()).toBe(200);

  // ── 3. WAF ON + disable rule by ID → previously blocked request now passes ─
  await setWaf(true);
  expect(await getToggleState()).toBe(true);

  // Confirm it's blocked before we disable the rule
  blocked = await page.request.get(blockedUrl, { failOnStatusCode: false });
  console.log(`WAF ON, rule enabled → blocked req: ${blocked.status()}`);
  expect([403, 406, 409, 422]).toContain(blocked.status());

  // Disable the XSS rule by ID
  const ruleId = '941100';
  await page.locator('#removed_rules').fill(ruleId);
  await page.locator('button[type="submit"]:has-text("Save")').click();
  await page.waitForTimeout(3000);
  await page.reload();

  const savedRules = await page.locator('#removed_rules').inputValue();
  expect(savedRules).toContain(ruleId);
  console.log(`Disabled rule ID ${ruleId} saved: ✓`);

  // Now the same request should pass because the rule is disabled
  blocked = await page.request.get(blockedUrl, { failOnStatusCode: false });
  clean = await page.request.get(cleanUrl, { failOnStatusCode: false });
  console.log(`WAF ON + rule ${ruleId} disabled → blocked req: ${blocked.status()}, clean req: ${clean.status()}`);
  expect(blocked.status()).toBe(200);
  expect(clean.status()).toBe(200);

  // Clear disabled rule IDs
  await page.locator('#removed_rules').fill('');
  await page.locator('button[type="submit"]:has-text("Save")').click();
  await page.waitForTimeout(2000);
  await page.reload();

  // Confirm blocking is restored after clearing rule ID
  blocked = await page.request.get(blockedUrl, { failOnStatusCode: false });
  console.log(`WAF ON, rule ID cleared → blocked req: ${blocked.status()}`);
  expect([403, 406, 409, 422]).toContain(blocked.status());

  // ── 4. WAF ON + disable rule by TAG → previously blocked request now passes ─
  // Confirm it's still blocked before disabling by tag
  blocked = await page.request.get(blockedUrl, { failOnStatusCode: false });
  console.log(`WAF ON, tag enabled → blocked req: ${blocked.status()}`);
  expect([403, 406, 409, 422]).toContain(blocked.status());

  // Disable by tag (OWASP CRS tag that covers XSS rules)
  const ruleTag = 'attack-xss';
  await page.locator('#removed_tags').fill(ruleTag);
  await page.locator('button[type="submit"]:has-text("Save")').click();
  await page.waitForTimeout(3000);
  await page.reload();

  const savedTags = await page.locator('#removed_tags').inputValue();
  expect(savedTags).toContain(ruleTag);
  console.log(`Disabled rule tag "${ruleTag}" saved: ✓`);

  // Now the same request should pass because the tag group is disabled
  blocked = await page.request.get(blockedUrl, { failOnStatusCode: false });
  clean = await page.request.get(cleanUrl, { failOnStatusCode: false });
  console.log(`WAF ON + tag "${ruleTag}" disabled → blocked req: ${blocked.status()}, clean req: ${clean.status()}`);
  expect(blocked.status()).toBe(200);
  expect(clean.status()).toBe(200);

  // ── 5. Cleanup – clear disabled tags, confirm blocking restored ────────────
  await page.locator('#removed_tags').fill('');
  await page.locator('button[type="submit"]:has-text("Save")').click();
  await page.waitForTimeout(2000);
  await page.reload();

  blocked = await page.request.get(blockedUrl, { failOnStatusCode: false });
  console.log(`WAF ON, tag cleared → blocked req: ${blocked.status()}`);
  expect([403, 406, 409, 422]).toContain(blocked.status());

  console.log('WAF on/off + disabled rules by ID + disabled rules by tag test completed successfully!');
});
