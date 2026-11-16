import { APIRequestContext, Page, test, expect, request as pwRequest } from '@playwright/test';

// /server/bot-control: the user's AI crawler policy per domain, checked live against caddy with fake user agents, every change is put back

const CHROME = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const POLICIES = ['allow', 'ratelimit', 'block'] as const;

// domains don't need dns, caddy on the server ip is asked with the Host header over plain http
function serverHost(): string {
  return new URL(process.env.BASE_URL!).hostname;
}

async function hit(api: APIRequestContext, domain: string, ua: string): Promise<number> {
  const res = await api.get(`http://${serverHost()}/`, { headers: { Host: domain, 'User-Agent': ua }, maxRedirects: 0, timeout: 15_000 });
  return res.status();
}

// the limit is keyed on the full User-Agent, unique ones start every run with an empty bucket
function crawlers() {
  const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return {
    gpt: `Mozilla/5.0 (compatible; GPTBot/1.1; +https://openai.com/gptbot) test-${run}`,
    claude: `Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com) test-${run}`,
  };
}

async function openList(page: Page) {
  await page.goto('/server/bot-control');
  await expect(page.getByRole('heading', { name: 'AI & bot control' })).toBeVisible();
}

function policySelect(page: Page, domain: string) {
  return page.locator(`form[action="/server/bot-control/${domain}"] select[name="policy"]`);
}

async function listDomains(page: Page): Promise<string[]> {
  await openList(page);
  return page.locator('form[action^="/server/bot-control/"]').evaluateAll(fs => fs.map(f => (f.getAttribute('action') || '').split('/').pop() || ''));
}

// the admin sets the limit, the page shows it in the Rate-limit label
async function rateLimit(page: Page): Promise<number> {
  await openList(page);
  const m = (await page.locator('main').innerText()).match(/Rate-limit \((\d+)\/min\)/);
  expect(m, 'no "Rate-limit (N/min)" label on the page').toBeTruthy();
  return Number(m![1]);
}

async function setPolicy(page: Page, domain: string, policy: string) {
  await openList(page);
  await policySelect(page, domain).selectOption(policy);
  await expect(page.getByText(`AI & bot policy updated for ${domain}.`)).toBeVisible({ timeout: 60_000 });
  await expect(policySelect(page, domain)).toHaveValue(policy);
}

// a domain that answers plain http without redirecting, otherwise every UA just gets the redirect
async function pickDomain(page: Page, api: APIRequestContext): Promise<string | undefined> {
  for (const d of await listDomains(page)) {
    const code = await hit(api, d, CHROME).catch(() => 0);
    if (code >= 200 && code < 300) return d;
  }
  return undefined;
}

test('list page shows every domain with its policy and the rate limit', async ({ page }) => {
  await openList(page);
  const domains = await listDomains(page);
  test.skip(domains.length === 0, 'No domains on this account');
  for (const d of domains) expect(POLICIES).toContain(await policySelect(page, d).inputValue());
  const limit = await rateLimit(page);
  expect(limit).toBeGreaterThan(0);
  await expect(page.getByText(`Caps known AI crawlers at ${limit} requests/minute per crawler per site`)).toBeVisible();
  console.log(`${domains.length} domains, rate limit ${limit}/min`);
});

test('domain page shows the report for each time window', async ({ page }) => {
  const domains = await listDomains(page);
  test.skip(domains.length === 0, 'No domains on this account');
  const domain = domains[0];
  await page.goto(`/server/bot-control/${domain}`);
  await expect(page.getByRole('heading', { name: domain, exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: "Who's hitting me" })).toBeVisible();
  for (const w of ['1h', '24h', '7d']) {
    await page.goto(`/server/bot-control/${domain}?window=${w}`);
    await expect(page.locator(`a[href="/server/bot-control/${domain}?window=${w}"]`)).toHaveClass(/bg-blue-600/);
  }
  await expect(page.getByRole('button', { name: /^Rate-limit \(\d+\/min\)$/ })).toBeVisible();
});

test('block and rate-limit only hit AI crawlers on the domain, then put back', async ({ page }) => {
  test.setTimeout(240_000);
  const api = await pwRequest.newContext();
  const domain = await pickDomain(page, api);
  test.skip(!domain, 'No domain answers plain http on this server');
  const limit = await rateLimit(page);
  test.skip(limit > 60, `rate limit is ${limit}/min, too many requests to check it here`);
  const original = await policySelect(page, domain!).inputValue();

  try {
    const { gpt, claude } = crawlers();
    await setPolicy(page, domain!, 'block');
    expect(await hit(api, domain!, gpt)).toBe(403);
    expect(await hit(api, domain!, claude)).toBe(403);
    expect(await hit(api, domain!, CHROME)).not.toBe(403);
    expect(await hit(api, domain!, GOOGLEBOT)).not.toBe(403);
    console.log(`${domain}: block gives GPTBot and ClaudeBot 403, Chrome and Googlebot pass`);

    await setPolicy(page, domain!, 'ratelimit');
    const codes: number[] = [];
    for (let i = 0; i < limit; i++) codes.push(await hit(api, domain!, gpt));
    expect(codes.filter(c => c === 403 || c === 429), `first ${limit} GPTBot answers: ${codes.join(',')}`).toHaveLength(0);
    expect(await hit(api, domain!, gpt)).toBe(429);
    // GPTBot is over its limit now, nobody else may be
    expect(await hit(api, domain!, claude)).not.toBe(429);
    expect(await hit(api, domain!, CHROME)).not.toBe(429);
    expect(await hit(api, domain!, GOOGLEBOT)).not.toBe(429);
    console.log(`${domain}: rate-limit gives GPTBot ${limit} answers then 429, ClaudeBot, Chrome and Googlebot unaffected`);
  } finally {
    await setPolicy(page, domain!, original);
    await api.dispose();
  }
  console.log(`${domain}: back on ${original}`);
});

test('policy buttons on the domain page change it and put it back', async ({ page }) => {
  test.setTimeout(120_000);
  const domains = await listDomains(page);
  test.skip(domains.length === 0, 'No domains on this account');
  const domain = domains[0];
  const original = await policySelect(page, domain).inputValue();
  const other = original === 'block' ? 'allow' : 'block';
  const label = other === 'block' ? 'Block (403)' : 'Allow';
  try {
    await page.goto(`/server/bot-control/${domain}`);
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page.getByText(`AI & bot policy updated for ${domain}.`)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole('button', { name: label, exact: true })).toHaveClass(/bg-blue-600/);
  } finally {
    await setPolicy(page, domain, original);
  }
});

test('API lists policies with the rate limit and only touches own domains', async ({ page }) => {
  const anon = await pwRequest.newContext({ baseURL: process.env.BASE_URL, ignoreHTTPSErrors: true });
  const login = await anon.post('/api/login', { data: { username: process.env.PANEL_USERNAME, password: process.env.PANEL_PASSWORD } });
  test.skip(login.status() !== 200, `API login answered ${login.status()}, the api feature is off for this account`);
  const { token } = await login.json();
  const api = await pwRequest.newContext({ baseURL: process.env.BASE_URL, ignoreHTTPSErrors: true, extraHTTPHeaders: { Authorization: `Bearer ${token}` } });
  try {
    const list = await api.get('/api/bot-control');
    test.skip(list.status() === 403, 'bot_control or api feature is off for this account');
    expect(list.status()).toBe(200);
    const body = await list.json();
    expect(body.rate_limit).toBe(await rateLimit(page));
    for (const d of body.domains) expect(POLICIES).toContain(d.policy);

    expect((await api.post('/api/bot-control/not-mine-pw.example', { data: { policy: 'block' } })).status()).toBe(403);
    if (body.domains.length) {
      const domain = body.domains[0].domain;
      expect((await api.post(`/api/bot-control/${domain}`, { data: { policy: 'nope' } })).status()).toBe(400);
      const stats = await api.get(`/api/bot-control/${domain}/stats?window=1h`);
      expect(stats.status()).toBe(200);
      const s = await stats.json();
      expect(s.report.window).toBe('1h');
      expect(s.rate_limit).toBe(body.rate_limit);
    }
  } finally {
    await api.dispose();
    await anon.dispose();
  }
});
