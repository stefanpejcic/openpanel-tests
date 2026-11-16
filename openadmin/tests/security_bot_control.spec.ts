import { APIRequestContext, Page, test, expect, request as pwRequest } from '@playwright/test';

// /security/bot-control: AI crawler policy per domain, checked live against caddy with fake user agents, every change is put back

type Row = { domain: string; owner: string; policy: 'allow' | 'ratelimit' | 'block' };

const CHROME = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

async function state(page: Page): Promise<{ module_enabled: boolean; domains: Row[]; policy_counts: Record<string, number> }> {
  const res = await page.request.get('/security/bot-control?output=json');
  expect(res.ok()).toBeTruthy();
  return res.json();
}

// domains don't need dns, caddy on the server ip is asked with the Host header over plain http
function serverHost(): string {
  return new URL(process.env.BASE_URL!).hostname;
}

async function hit(api: APIRequestContext, domain: string, ua: string): Promise<number> {
  const res = await api.get(`http://${serverHost()}/`, { headers: { Host: domain, 'User-Agent': ua }, maxRedirects: 0, timeout: 15_000 });
  return res.status();
}

async function setPolicy(page: Page, domain: string, policy: string) {
  await page.goto('/security/bot-control');
  const row = page.locator('tbody tr').filter({ has: page.getByRole('link', { name: domain, exact: true }) });
  await row.locator('select[name="policy"]').selectOption(policy);
  await expect(page.getByText(`Updated AI & bot policy for ${domain} to '${policy}'.`)).toBeVisible({ timeout: 60_000 });
}

test('page loads with module badge, traffic report and per-site policies', async ({ page }) => {
  await page.goto('/security/bot-control');
  await expect(page.getByRole('heading', { name: 'AI & bot control' })).toBeVisible();
  await expect(page.getByText(/^Module (enabled|disabled)$/)).toBeVisible();
  await expect(page.getByRole('heading', { name: "Who's hitting me" })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Per-site AI crawler policies' })).toBeVisible();

  const s = await state(page);
  expect(typeof s.module_enabled).toBe('boolean');
  expect(Array.isArray(s.domains)).toBeTruthy();
  for (const p of ['allow', 'ratelimit', 'block']) expect(s.policy_counts).toHaveProperty(p);
  console.log(`bot control: module ${s.module_enabled ? 'on' : 'off'}, ${s.domains.length} domains`);
});

test('time window filter is kept in the report', async ({ page }) => {
  await page.goto('/security/bot-control?window=24h');
  await expect(page.locator('select[name="window"]')).toHaveValue('24h');
  await expect(page.getByText('Total requests (24h)')).toBeVisible();
});

test('block and rate-limit only hit AI crawlers on the domain, then put back', async ({ page }) => {
  test.setTimeout(240_000);
  const api = await pwRequest.newContext();
  const before = await state(page);

  // a user's domain that answers plain http without redirecting, otherwise every UA just gets the redirect
  let target: Row | undefined;
  for (const d of [...before.domains].sort((a, b) => Number(!a.owner) - Number(!b.owner))) {
    const code = await hit(api, d.domain, CHROME).catch(() => 0);
    if (code >= 200 && code < 300) { target = d; break; }
  }
  test.skip(!target, 'No domain answers plain http on this server');
  const domain = target!.domain;

  let enabledHere = false;
  try {
    if (!before.module_enabled) {
      await page.goto('/security/bot-control');
      await page.getByRole('button', { name: 'Enable module' }).click();
      await expect(page.getByText(/AI & Bot Control module enabled/)).toBeVisible({ timeout: 60_000 });
      enabledHere = true;
    }

    // the rate limit is keyed on the full User-Agent, unique ones start every run with an empty bucket
    const run = Date.now().toString(36);
    const gpt = `Mozilla/5.0 (compatible; GPTBot/1.1; +https://openai.com/gptbot) test-${run}`;
    const claude = `Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com) test-${run}`;

    await setPolicy(page, domain, 'block');
    await expect(page.locator('tbody tr').filter({ has: page.getByRole('link', { name: domain, exact: true }) })).toContainText('Block (403)');
    expect((await state(page)).domains.find(d => d.domain === domain)?.policy).toBe('block');
    expect(await hit(api, domain, gpt)).toBe(403);
    expect(await hit(api, domain, claude)).toBe(403);
    expect(await hit(api, domain, CHROME)).not.toBe(403);
    expect(await hit(api, domain, GOOGLEBOT)).not.toBe(403);
    console.log(`${domain}: block gives GPTBot and ClaudeBot 403, Chrome and Googlebot pass`);

    await setPolicy(page, domain, 'ratelimit');
    await expect(page.locator('tbody tr').filter({ has: page.getByRole('link', { name: domain, exact: true }) })).toContainText('Rate-limit');
    const codes: number[] = [];
    for (let i = 0; i < 10; i++) codes.push(await hit(api, domain, gpt));
    expect(codes.filter(c => c === 403 || c === 429), `first 10 GPTBot answers: ${codes.join(',')}`).toHaveLength(0);
    expect(await hit(api, domain, gpt)).toBe(429);
    // GPTBot is over its limit now, nobody else may be
    expect(await hit(api, domain, claude)).not.toBe(429);
    expect(await hit(api, domain, CHROME)).not.toBe(429);
    expect(await hit(api, domain, GOOGLEBOT)).not.toBe(429);
    console.log(`${domain}: rate-limit gives GPTBot 10 answers then 429, ClaudeBot, Chrome and Googlebot unaffected`);
  } finally {
    if (enabledHere) {
      // turning the module off puts every domain back on allow too
      await page.goto('/security/bot-control');
      await page.getByRole('button', { name: 'Disable module' }).click();
      await expect(page.getByText(/AI & Bot Control module disabled/)).toBeVisible({ timeout: 60_000 });
    } else if ((await state(page)).domains.find(d => d.domain === domain)?.policy !== target!.policy) {
      await setPolicy(page, domain, target!.policy);
    }
    await api.dispose();
  }

  expect((await state(page)).domains.find(d => d.domain === domain)?.policy).toBe(target!.policy);
  if (target!.policy === 'allow') {
    const after = await pwRequest.newContext();
    expect(await hit(after, domain, `GPTBot/1.1 after-${Date.now()}`)).not.toBe(403);
    await after.dispose();
  }
  console.log(`${domain}: back on ${target!.policy}`);
});
