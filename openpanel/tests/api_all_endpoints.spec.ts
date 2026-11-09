import { test, expect, request as pwRequest, APIRequestContext } from '@playwright/test';

// Every route the panel registers, read at runtime from GET /api/endpoints, so a new endpoint is covered without
// touching this file. api.spec.ts checks what each endpoint returns, this one checks the same things for all of them:
//   - a request without a token is rejected, for every method
//   - every GET answers without a server error, parameterless GETs with 2xx JSON
// Path parameters get a value that can't exist, so a handler runs but never finds (or touches) real data.

const BASE_URL = process.env.BASE_URL!;
const USER = process.env.PANEL_USERNAME!;
const PASS = process.env.PANEL_PASSWORD!;

// public on purpose
const PUBLIC = new Set(['POST /api/login', 'GET /api/', 'POST /api/']);

// GETs that do something (run wp-cli, start a scan, change WordPress, mint a login token or link):
// only the unauthenticated check, never called with a token
const NO_AUTHED_CALL = [
  /^\/api\/sites\/wp-cli\//,
  /^\/api\/wordpress\/scan$/,
  /^\/api\/wordpress\/secure$/,
  /^\/api\/wordpress\/\{[^}]+\}\/secure$/,
  /^\/api\/phpmyadmin$/,
  /^\/api\/webmail$/,
  /\/temporary-link$/,
];

// parameterless GETs that are fine to answer 4xx: the service behind them isn't set up for the account,
// or they need a query parameter (database-size wants ?domain= or ?database=)
const MAY_BE_UNAVAILABLE = [/^\/api\/cache\//, /^\/api\/webserver-conf\/litespeed-license$/, /^\/api\/sites\/database-size$/];

type Endpoint = { path: string; methods: string[] };

let api: APIRequestContext;
let anon: APIRequestContext;
let endpoints: Endpoint[] = [];

const fill = (path: string) => path.replace(/\{[^}]+\}/g, 'pw-nonexistent');

test.beforeAll(async () => {
  anon = await pwRequest.newContext({ baseURL: BASE_URL, ignoreHTTPSErrors: true });
  const login = await anon.post('/api/login', { data: { username: USER, password: PASS } });
  expect(login.status(), 'POST /api/login').toBe(200);
  const { token } = await login.json();
  api = await pwRequest.newContext({
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
  const res = await api.get('/api/endpoints');
  expect(res.ok(), 'GET /api/endpoints').toBeTruthy();
  endpoints = (await res.json()).endpoints;
  expect(endpoints.length, 'the panel registers its endpoints').toBeGreaterThan(100);
});

test.afterAll(async () => {
  await api?.dispose();
  await anon?.dispose();
});

test('every route rejects requests without a token', async () => {
  test.setTimeout(10 * 60_000);
  const accepted: string[] = [];
  let checked = 0;
  for (const e of endpoints) {
    for (const method of e.methods) {
      const key = `${method} ${e.path}`;
      if (PUBLIC.has(key)) continue;
      const res = await anon.fetch(fill(e.path), { method, data: method === 'GET' ? undefined : {}, maxRedirects: 0, timeout: 60_000 });
      checked++;
      // 401/403, or a redirect to the login page, both mean "not without logging in"
      const loc = res.headers()['location'] || '';
      const rejected = [401, 403].includes(res.status()) || (res.status() >= 300 && res.status() < 400 && /\/login/.test(loc));
      if (!rejected) accepted.push(`${key} -> ${res.status()}${loc ? ` (${loc})` : ''}`);
    }
  }
  console.log(`unauthenticated: ${checked} routes checked, ${accepted.length} not rejected`);
  expect(accepted, 'routes that answered a request without a token').toEqual([]);
});

test('every GET answers without a server error', async () => {
  test.setTimeout(20 * 60_000);
  const serverErrors: string[] = [];
  const notOk: string[] = [];
  const slow: string[] = [];
  let checked = 0;
  for (const e of endpoints) {
    if (!e.methods.includes('GET') || NO_AUTHED_CALL.some(rx => rx.test(e.path))) continue;
    const url = fill(e.path);
    const started = Date.now();
    const res = await api.get(url, { maxRedirects: 0, timeout: 120_000 }).catch(err => err as Error);
    const ms = Date.now() - started;
    checked++;
    if (res instanceof Error) {
      serverErrors.push(`GET ${e.path} -> ${res.message.split('\n')[0]}`);
      continue;
    }
    if (ms > 10_000) slow.push(`GET ${url} ${(ms / 1000).toFixed(1)}s`);
    if (res.status() >= 500) {
      serverErrors.push(`GET ${url} -> ${res.status()} ${(await res.text()).slice(0, 160)}`);
      continue;
    }
    // with path parameters a 4xx is the expected answer for a value that doesn't exist
    if (e.path.includes('{') || MAY_BE_UNAVAILABLE.some(rx => rx.test(e.path))) continue;
    const ct = res.headers()['content-type'] || '';
    if (!res.ok() || !/json|text\/plain|octet-stream|csv|zip|gzip/.test(ct)) {
      notOk.push(`GET ${url} -> ${res.status()} ${ct} ${(await res.text()).slice(0, 160)}`);
    }
  }
  console.log(`authenticated GET: ${checked} routes checked`);
  if (slow.length) console.log(`slow (>10s):\n  ${slow.join('\n  ')}`);
  expect.soft(serverErrors, 'GETs that failed with a server error').toEqual([]);
  expect(notOk, 'parameterless GETs that did not answer 2xx').toEqual([]);
});
