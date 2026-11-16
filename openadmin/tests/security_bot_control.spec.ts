import { APIRequestContext, Browser, Page, test, expect, request as pwRequest } from '@playwright/test';

// /security/bot-control: AI crawler policy per domain, checked live against caddy with fake user agents, every change is put back

type Row = { domain: string; owner: string; policy: 'allow' | 'ratelimit' | 'block' };
type State = { module_enabled: boolean; rate_limit: number; domains: Row[]; policy_counts: Record<string, number> };

const CHROME = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

// openadmin drops idle keep-alive connections after 2s, a GET that lands on one just gets retried
async function state(page: Page): Promise<State> {
  const get = () => page.request.get('/security/bot-control?output=json');
  const res = await get().catch(e => { if (!/socket hang up|ECONNRESET/.test(String(e))) throw e; return get(); });
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

// the rate limit is keyed on the full User-Agent, unique ones start every run with an empty bucket
function crawlers() {
  const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return {
    gpt: `Mozilla/5.0 (compatible; GPTBot/1.1; +https://openai.com/gptbot) test-${run}`,
    claude: `Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com) test-${run}`,
  };
}

function policyRow(page: Page, domain: string) {
  return page.locator('tbody tr').filter({ has: page.getByRole('link', { name: domain, exact: true }) });
}

async function setPolicy(page: Page, domain: string, policy: string) {
  await page.goto('/security/bot-control');
  await policyRow(page, domain).locator('select[name="policy"]').selectOption(policy);
  await expect(page.getByText(`Updated AI & bot policy for ${domain} to '${policy}'.`)).toBeVisible({ timeout: 60_000 });
}

async function setLimit(page: Page, n: number) {
  await page.goto('/security/bot-control');
  const form = page.locator('#bot_rate_limit');
  await form.locator('#rate_limit').fill(String(n));
  await form.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(`AI crawlers on rate-limited domains now get ${n} requests per minute per site.`)).toBeVisible({ timeout: 60_000 });
}

// a user's domain that answers plain http without redirecting, otherwise every UA just gets the redirect
async function pickDomain(api: APIRequestContext, s: State): Promise<Row | undefined> {
  for (const d of [...s.domains].sort((a, b) => Number(!a.owner) - Number(!b.owner))) {
    const code = await hit(api, d.domain, CHROME).catch(() => 0);
    if (code >= 200 && code < 300) return d;
  }
  return undefined;
}

// turns the module on for the test and back off after, a domain's policy is always put back
async function withDomain(page: Page, fn: (domain: string, api: APIRequestContext) => Promise<void>) {
  const api = await pwRequest.newContext();
  const before = await state(page);
  const target = await pickDomain(api, before);
  test.skip(!target, 'No domain answers plain http on this server');
  const domain = target!.domain;

  let enabledHere = false;
  try {
    if (!before.module_enabled) {
      await page.goto('/security/bot-control');
      await page.getByRole('button', { name: 'Enable module' }).first().click();
      await expect(page.getByText(/AI & Bot Control module enabled/)).toBeVisible({ timeout: 60_000 });
      enabledHere = true;
    }
    await fn(domain, api);
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
  console.log(`${domain}: back on ${target!.policy}`);
}

// bearer token for /api/security/bot-control, undefined while the API is off in settings; no keep-alive, a POST on a connection openadmin just closed isn't retried
async function apiAs(username: string, password: string): Promise<APIRequestContext | undefined> {
  const anon = await pwRequest.newContext({ baseURL: process.env.BASE_URL, ignoreHTTPSErrors: true });
  const login = await anon.post('/api/', { data: { username, password } });
  const token = login.ok() ? (await login.json()).access_token : undefined;
  await anon.dispose();
  if (!token) return undefined;
  return pwRequest.newContext({ baseURL: process.env.BASE_URL, ignoreHTTPSErrors: true, extraHTTPHeaders: { Authorization: `Bearer ${token}`, Connection: 'close' } });
}

async function apiPost(api: APIRequestContext, data: object) {
  const res = await api.post('/api/security/bot-control', { data });
  return { status: res.status(), body: await res.json().catch(() => ({})) };
}

test('page loads with module badge, traffic report and per-site policies', async ({ page }) => {
  await page.goto('/security/bot-control');
  await expect(page.getByRole('heading', { name: 'AI & bot control' })).toBeVisible();
  await expect(page.getByText(/^Module (enabled|disabled)$/)).toBeVisible();
  await expect(page.getByRole('heading', { name: "Who's hitting the server" })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Per-site AI crawler policies' })).toBeVisible();

  const s = await state(page);
  expect(typeof s.module_enabled).toBe('boolean');
  expect(Array.isArray(s.domains)).toBeTruthy();
  for (const p of ['allow', 'ratelimit', 'block']) expect(s.policy_counts).toHaveProperty(p);
  expect(s.rate_limit).toBeGreaterThan(0);
  await expect(page.locator('#rate_limit')).toHaveValue(String(s.rate_limit));
  await expect(page.getByText(`Rate-limit (${s.rate_limit}/min)`, { exact: true })).toBeVisible();
  console.log(`bot control: module ${s.module_enabled ? 'on' : 'off'}, ${s.domains.length} domains, ${s.rate_limit} requests/min`);
});

test('time window filter is kept in the report', async ({ page }) => {
  await page.goto('/security/bot-control?window=24h');
  await expect(page.locator('select[name="window"]')).toHaveValue('24h');
  await expect(page.getByText('Total requests (24h)')).toBeVisible();
});

test('rate limit rejects values out of range', async ({ page }) => {
  const before = (await state(page)).rate_limit;
  await page.goto('/security/bot-control');
  const input = page.locator('#rate_limit');
  await expect(input).toHaveAttribute('min', '1');
  await expect(input).toHaveAttribute('max', '100000');
  // the browser stops a 0 before it's sent, the server must say no to it too
  const csrf = await page.locator('#bot_rate_limit input[name="csrf_token"]').inputValue();
  await page.request.post('/security/bot-control', {
    form: { csrf_token: csrf, action: 'set_rate_limit', rate_limit: '0' },
    headers: { Referer: new URL('/security/bot-control', process.env.BASE_URL).toString() },
  });
  expect((await state(page)).rate_limit).toBe(before);
});

test('block and rate-limit only hit AI crawlers on the domain, then put back', async ({ page }) => {
  test.setTimeout(240_000);
  await withDomain(page, async (domain, api) => {
    const { gpt, claude } = crawlers();
    const limit = (await state(page)).rate_limit;
    test.skip(limit > 60, `rate limit is ${limit}/min, too many requests to check it here`);

    await setPolicy(page, domain, 'block');
    await expect(policyRow(page, domain)).toContainText('Block (403)');
    expect((await state(page)).domains.find(d => d.domain === domain)?.policy).toBe('block');
    expect(await hit(api, domain, gpt)).toBe(403);
    expect(await hit(api, domain, claude)).toBe(403);
    expect(await hit(api, domain, CHROME)).not.toBe(403);
    expect(await hit(api, domain, GOOGLEBOT)).not.toBe(403);
    console.log(`${domain}: block gives GPTBot and ClaudeBot 403, Chrome and Googlebot pass`);

    await setPolicy(page, domain, 'ratelimit');
    await expect(policyRow(page, domain)).toContainText('Rate-limit');
    const codes: number[] = [];
    for (let i = 0; i < limit; i++) codes.push(await hit(api, domain, gpt));
    expect(codes.filter(c => c === 403 || c === 429), `first ${limit} GPTBot answers: ${codes.join(',')}`).toHaveLength(0);
    expect(await hit(api, domain, gpt)).toBe(429);
    // GPTBot is over its limit now, nobody else may be
    expect(await hit(api, domain, claude)).not.toBe(429);
    expect(await hit(api, domain, CHROME)).not.toBe(429);
    expect(await hit(api, domain, GOOGLEBOT)).not.toBe(429);
    console.log(`${domain}: rate-limit gives GPTBot ${limit} answers then 429, ClaudeBot, Chrome and Googlebot unaffected`);
  });
});

test('a lower rate limit set by the admin is what caddy enforces, then put back', async ({ page }) => {
  test.setTimeout(240_000);
  const original = (await state(page)).rate_limit;
  const lowered = 3;
  await withDomain(page, async (domain, api) => {
    try {
      await setLimit(page, lowered);
      expect((await state(page)).rate_limit).toBe(lowered);
      await expect(page.locator('#rate_limit')).toHaveValue(String(lowered));
      await expect(page.getByText(`Rate-limit (${lowered}/min)`, { exact: true })).toBeVisible();

      await setPolicy(page, domain, 'ratelimit');
      const { gpt, claude } = crawlers();
      const codes: number[] = [];
      for (let i = 0; i < lowered; i++) codes.push(await hit(api, domain, gpt));
      expect(codes.filter(c => c === 429), `first ${lowered} GPTBot answers: ${codes.join(',')}`).toHaveLength(0);
      expect(await hit(api, domain, gpt)).toBe(429);
      expect(await hit(api, domain, claude)).not.toBe(429);
      expect(await hit(api, domain, CHROME)).not.toBe(429);
      expect(await hit(api, domain, GOOGLEBOT)).not.toBe(429);
      console.log(`${domain}: limit ${lowered}/min gives GPTBot ${lowered} answers then 429, others unaffected`);
    } finally {
      if ((await state(page)).rate_limit !== original) await setLimit(page, original);
    }
  });
  expect((await state(page)).rate_limit).toBe(original);
  console.log(`rate limit back on ${original}/min`);
});

test('API shows the same state and changes the limit and policies like the page', async ({ page }) => {
  test.setTimeout(240_000);
  const api = await apiAs(process.env.PANEL_USERNAME!, process.env.PANEL_PASSWORD!);
  test.skip(!api, 'API is off in OpenAdmin settings');
  try {
    const anon = await pwRequest.newContext({ baseURL: process.env.BASE_URL, ignoreHTTPSErrors: true });
    expect((await anon.get('/api/security/bot-control')).status(), 'no token must not get in').toBe(404);
    await anon.dispose();
    const res = await api!.get('/api/security/bot-control');
    expect(res.status()).toBe(200);
    const viaApi: State = await res.json();
    const viaPage = await state(page);
    expect(viaApi.rate_limit).toBe(viaPage.rate_limit);
    expect(viaApi.domains.map(d => `${d.domain}:${d.policy}`).sort()).toEqual(viaPage.domains.map(d => `${d.domain}:${d.policy}`).sort());

    for (const [data, code] of [
      [{ action: 'set_rate_limit', rate_limit: 0 }, 400],
      [{ action: 'set_rate_limit', rate_limit: 'lots' }, 400],
      [{ action: 'bogus', policy: 'block' }, 400],
      [{ action: 'set_policy', domain: 'not-on-this-server.example', policy: 'block' }, 404],
    ] as const) {
      expect((await apiPost(api!, data)).status, JSON.stringify(data)).toBe(code);
    }
    expect((await state(page)).rate_limit, 'a rejected API call changed the limit').toBe(viaPage.rate_limit);

    const original = viaPage.rate_limit;
    const lower = original > 3 ? 3 : original + 1;
    try {
      const set = await apiPost(api!, { action: 'set_rate_limit', rate_limit: lower });
      expect(set.status, set.body.error).toBe(200);
      expect((await state(page)).rate_limit).toBe(lower);
      await page.goto('/security/bot-control');
      await expect(page.locator('#rate_limit')).toHaveValue(String(lower));
    } finally {
      expect((await apiPost(api!, { action: 'set_rate_limit', rate_limit: original })).status).toBe(200);
    }
    expect((await state(page)).rate_limit).toBe(original);

    await withDomain(page, async (domain, http) => {
      const { gpt } = crawlers();
      const before = (await state(page)).domains.find(d => d.domain === domain)!.policy;
      const r = await apiPost(api!, { action: 'set_policy', domain, policy: 'block' });
      expect(r.status, r.body.error).toBe(200);
      expect((await state(page)).domains.find(d => d.domain === domain)?.policy).toBe('block');
      expect(await hit(http, domain, gpt)).toBe(403);
      expect(await hit(http, domain, CHROME)).not.toBe(403);
      expect((await apiPost(api!, { action: 'set_policy', domain, policy: before })).status).toBe(200);
      console.log(`API: limit ${original} -> ${lower} -> ${original}, ${domain} blocked for GPTBot and put back on ${before}`);
    });
  } finally {
    await api?.dispose();
  }
});

async function loginAs(browser: Browser, username: string, password: string): Promise<Page> {
  const context = await browser.newContext({ baseURL: process.env.BASE_URL, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Username' }).fill(username);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.locator('button[type="submit"]', { hasText: 'Sign in' }).first().click();
  await expect(page).toHaveURL(/.*(dashboard|onboarding|users)/);
  return page;
}

test('a reseller sees only their own domains and can not change the module or the limit', async ({ page, browser }) => {
  test.setTimeout(180_000);
  await page.goto('/resellers');
  const enableBtn = page.getByRole('button', { name: 'Enable Resellers' });
  if (await enableBtn.isVisible().catch(() => false)) {
    await enableBtn.click();
    await expect(enableBtn).toBeHidden({ timeout: 10_000 });
  }
  const createBtn = page.locator('#tour-create-reseller-btn');
  test.skip(!(await createBtn.isVisible().catch(() => false)), 'Resellers are not available on this license');

  const username = `tstreseller${Date.now() % 100000}`;
  const password = 'TestPassword123';
  await createBtn.click();
  await page.locator('#username').fill(username);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.locator('#exiting_users tbody tr').filter({ hasText: username })).toBeVisible({ timeout: 15_000 });

  const admin = await state(page);
  try {
    const reseller = await loginAs(browser, username, password);
    await reseller.goto('/security/bot-control');
    await expect(reseller.getByRole('heading', { name: 'AI & bot control' })).toBeVisible();
    await expect(reseller.locator('#bot_rate_limit')).toHaveCount(0);
    await expect(reseller.getByRole('button', { name: /^(Enable module|Disable module)$/ })).toHaveCount(0);
    await expect(reseller.getByText(`Rate-limit (${admin.rate_limit}/min)`, { exact: true })).toBeVisible();

    const res = await reseller.request.get('/security/bot-control?output=json');
    expect(res.ok()).toBeTruthy();
    const mine: State = await res.json();
    // a fresh reseller owns no users, so none of the admin's domains may show up
    expect(mine.domains, 'reseller sees domains that are not theirs').toHaveLength(0);
    expect(mine.rate_limit).toBe(admin.rate_limit);

    if (admin.module_enabled) {
      await reseller.locator('input[x-model="query"]').first().fill('bot');
      await expect(reseller.getByRole('link', { name: /AI & Bot Control/ }).first()).toBeVisible();
      const csrf = await reseller.locator('input[name="csrf_token"]').first().inputValue();
      await reseller.request.post('/security/bot-control', {
        form: { csrf_token: csrf, action: 'set_rate_limit', rate_limit: '77' },
        headers: { Referer: new URL('/security/bot-control', process.env.BASE_URL).toString() },
      });
      expect((await state(page)).rate_limit, 'a reseller changed the rate limit').toBe(admin.rate_limit);
    }

    const rapi = await apiAs(username, password);
    if (rapi) {
      const st = await rapi.get('/api/security/bot-control');
      expect(st.status()).toBe(200);
      expect((await st.json()).domains, 'reseller API lists domains that are not theirs').toHaveLength(0);
      for (const data of [{ action: 'set_rate_limit', rate_limit: 77 }, { action: 'disable_module' }, { action: 'enable_module' }]) {
        expect((await apiPost(rapi, data)).status, JSON.stringify(data)).toBe(403);
      }
      if (admin.domains.length) {
        expect((await apiPost(rapi, { action: 'set_policy', domain: admin.domains[0].domain, policy: 'block' })).status).toBe(404);
      }
      const after = await state(page);
      expect(after.rate_limit).toBe(admin.rate_limit);
      expect(after.module_enabled).toBe(admin.module_enabled);
      expect(after.domains.map(d => d.policy)).toEqual(admin.domains.map(d => d.policy));
      await rapi.dispose();
      console.log(`reseller ${username} over the API: 0 domains, 403 on limit and module, 404 on the admin's domain`);
    }
    console.log(`reseller ${username}: page opens with 0 domains, no module or limit controls, limit stays ${admin.rate_limit}`);
    await reseller.context().close();
  } finally {
    await page.goto('/resellers');
    const menuBtn = page.locator(`#exiting_users tbody tr:not([data-cluster-node]) button.account-menu-btn[data-user="${username}"]`);
    await menuBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await menuBtn.click();
    page.once('dialog', d => d.accept());
    await page.locator('#account-menu').getByRole('menuitem', { name: 'Delete', exact: true }).click();
    await expect(page.locator(`button.account-menu-btn[data-user="${username}"]`)).toHaveCount(0);
  }
});
