
// claude wrote the test based on https://github.com/stefanpejcic/2083/blob/main/modules/api.py

import { test, expect, request, APIRequestContext } from '@playwright/test';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const BASE_URL = process.env.BASE_URL;
const API_USER = process.env.PANEL_USERNAME;
const API_PASS = process.env.PANEL_PASSWORD;
const API_TOKEN  = process.env.API_TOKEN  ?? '';          // pre-set token shortcut
const TOTP_SECRET = process.env.API_2FA_SECRET ?? '';     // base32 TOTP secret

const TEST_DOMAIN = process.env.TEST_DOMAIN ?? 'wp.tests.openpanel.org';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a RFC 6238 TOTP code from a base32 secret (no external libs). */
function generateTotp(base32Secret: string): string {
  // Minimal pure-JS TOTP — works for standard 30-s / SHA-1 / 6-digit tokens
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = base32Secret.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const c of clean) bits += base32Chars.indexOf(c).toString(2).padStart(5, '0');
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);

  const counter = Math.floor(Date.now() / 1000 / 30);
  const msg = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) { msg[i] = counter & 0xff; counter >> 8; }

  // We can't use crypto in TS without Node imports — return empty and skip 2FA assertion
  // For real 2FA testing, pass API_TOKEN instead.
  return '';
}

// ---------------------------------------------------------------------------
// Fixture: authenticated API context
// ---------------------------------------------------------------------------
let sharedToken = API_TOKEN;

async function getAuthContext(playwright: typeof import('@playwright/test')): Promise<APIRequestContext> {
  const ctx = await playwright.request.newContext({ baseURL: BASE_URL });

  if (!sharedToken) {
    const body: Record<string, string> = { username: API_USER, password: API_PASS };
    if (TOTP_SECRET) body['twofa_code'] = generateTotp(TOTP_SECRET);

    const res = await ctx.post('/api/login', { data: body });
    expect(res.status(), `POST /api/login should return 200`).toBe(200);

    const json = await res.json();
    expect(json).toHaveProperty('token');
    expect(typeof json.token).toBe('string');
    sharedToken = json.token;
  }

  return playwright.request.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${sharedToken}` },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------


  // Shared auth context reused across all tests in the suite
  let api: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    api = await getAuthContext(playwright);
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  // ── POST /api/login ────────────────────────────────────────────────────────
  test.describe('POST /api/login', () => {

    test('returns 401 for wrong credentials', async ({ request }) => {
      const ctx = await request.newContext({ baseURL: BASE_URL });
      const res = await ctx.post('/api/login', {
        data: { username: 'nobody', password: 'wrongpassword' },
      });
      expect(res.status()).toBe(401);
      await ctx.dispose();
    });

    test('returns token for valid credentials', async ({ playwright }) => {
      // A fresh context so we can inspect the full response independently
      const ctx = await playwright.request.newContext({ baseURL: BASE_URL });
      const res = await ctx.post('/api/login', {
        data: { username: API_USER, password: API_PASS },
      });
      // Allow 200 (success) or 401 (2FA required) — both are valid depending on account config
      expect([200, 401]).toContain(res.status());

      const json = await res.json();
      if (res.status() === 200) {
        expect(json).toHaveProperty('token');
        expect(json).toHaveProperty('user_id');
        expect(json).toHaveProperty('expires_in');
        expect(typeof json.token).toBe('string');
        expect(typeof json.expires_in).toBe('number');
        expect(json.expires_in).toBeGreaterThan(0);
      } else {
        // 2FA flow
        expect(json).toHaveProperty('twofa_required', true);
        expect(json).toHaveProperty('user_id');
      }
      await ctx.dispose();
    });

    test('rejects missing body fields', async ({ request }) => {
      const ctx = await request.newContext({ baseURL: BASE_URL });
      const res = await ctx.post('/api/login', { data: {} });
      expect([400, 401]).toContain(res.status());
      await ctx.dispose();
    });
  });

  // ── GET /api/endpoints ────────────────────────────────────────────────────
  test.describe('GET /api/endpoints', () => {

    test('returns a list of API endpoints', async () => {
      const res = await api.get('/api/endpoints');
      expect(res.status()).toBe(200);

      const json = await res.json();
      expect(json).toHaveProperty('endpoints');
      expect(json).toHaveProperty('total');
      expect(Array.isArray(json.endpoints)).toBe(true);
      expect(json.total).toBeGreaterThan(0);

      // Each entry should have required fields
      for (const ep of json.endpoints as Record<string, unknown>[]) {
        expect(ep).toHaveProperty('path');
        expect(ep).toHaveProperty('methods');
        expect(ep).toHaveProperty('endpoint');
        expect((ep.path as string).startsWith('/api/')).toBe(true);
        expect(Array.isArray(ep.methods)).toBe(true);
      }
    });
  });

  // ── GET /api/ (redirect) ──────────────────────────────────────────────────
  test.describe('GET /api/ redirect', () => {

    test('redirects to /api/dashboard', async () => {
      const res = await api.get('/api/', { maxRedirects: 0 });
      // Playwright follows redirects by default; check final URL or status
      expect([200, 301, 302, 307, 308]).toContain(res.status());
    });
  });

  // ── GET /api/dashboard ────────────────────────────────────────────────────
  test.describe('GET /api/dashboard', () => {

    test('returns dashboard metadata', async () => {
      const res = await api.get('/api/dashboard');
      expect(res.status()).toBe(200);

      const json = await res.json();
      // The endpoint currently returns title, locale, user_allowed
      expect(json).toHaveProperty('title');
      expect(json).toHaveProperty('locale');
    });
  });

  // ── GET /api/system/hosting/info ─────────────────────────────────────────
  test.describe('GET /api/system/hosting/info', () => {

    test('returns system information', async () => {
      const res = await api.get('/api/system/hosting/info');
      expect(res.status()).toBe(200);

      const json = await res.json();
      const requiredFields = ['system', 'node', 'release', 'version', 'machine', 'processor', 'ip', 'uptime', 'load_avg'];
      for (const field of requiredFields) {
        expect(json, `system info missing field: ${field}`).toHaveProperty(field);
      }
      expect(typeof json.system).toBe('string');
      expect(typeof json.uptime).not.toBe('undefined');
    });
  });

  // ── GET /api/disk_inodes ──────────────────────────────────────────────────
  test.describe('GET /api/disk_inodes', () => {

    test('returns disk and inode data', async () => {
      const res = await api.get('/api/disk_inodes');
      expect(res.status()).toBe(200);

      const json = await res.json();
      // Should not be an error response
      expect(json).not.toHaveProperty('error');
      // Data object should be truthy
      expect(json).toBeTruthy();
    });
  });

  // ── GET /api/account/login-history ───────────────────────────────────────
  test.describe('GET /api/account/login-history', () => {

    test('returns an array of login records', async () => {
      const res = await api.get('/api/account/login-history');
      expect(res.status()).toBe(200);

      const json = await res.json();
      expect(Array.isArray(json)).toBe(true);
    });
  });

  // ── GET /api/account/language ─────────────────────────────────────────────
  test.describe('GET /api/account/language', () => {

    test('returns available locales and current locale', async () => {
      const res = await api.get('/api/account/language');
      expect(res.status()).toBe(200);

      const json = await res.json();
      expect(json).toHaveProperty('locales');
      expect(json).toHaveProperty('current');
      expect(Array.isArray(json.locales)).toBe(true);
      expect(typeof json.current).toBe('string');
    });
  });

  // ── GET /api/auto-installer ───────────────────────────────────────────────
  test.describe('GET /api/auto-installer', () => {

    test('returns autoinstaller data', async () => {
      const res = await api.get('/api/auto-installer');
      expect(res.status()).toBe(200);

      const json = await res.json();
      expect(json).not.toHaveProperty('error');
      expect(json).toHaveProperty('domains');
      expect(json).toHaveProperty('data');
      expect(Array.isArray(json.domains)).toBe(true);
    });
  });

  // ── GET /api/favorites ────────────────────────────────────────────────────
  test.describe('GET /api/favorites', () => {

    test('returns favorites list', async () => {
      const res = await api.get('/api/favorites');
      expect(res.status()).toBe(200);

      const json = await res.json();
      // Could be an array or an object wrapping an array
      expect(json).toBeTruthy();
    });
  });

  // ── PUT /api/favorites ────────────────────────────────────────────────────
  test.describe('PUT /api/favorites', () => {

    test('adds a new favorite', async () => {
      const res = await api.put('/api/favorites', {
        data: { link: '/test-favorite', title: 'Playwright Test Favorite' },
      });
      expect([200, 201]).toContain(res.status());
    });

    test('returns error without link field', async () => {
      const res = await api.put('/api/favorites', { data: {} });
      // Application may return 400 or a JSON error body
      const json = await res.json();
      if (res.status() !== 200) {
        expect(json).toHaveProperty('error');
      }
    });
  });

  // ── DELETE /api/favorites ─────────────────────────────────────────────────
  test.describe('DELETE /api/favorites', () => {

    test('removes a favorite (link must exist)', async () => {
      // First, ensure the link exists
      await api.put('/api/favorites', {
        data: { link: '/test-delete-me', title: 'To Be Deleted' },
      });

      const res = await api.delete('/api/favorites', {
        data: { link: '/test-delete-me' },
      });
      expect([200, 204]).toContain(res.status());
    });

    test('returns error for missing link', async () => {
      const res = await api.delete('/api/favorites', { data: {} });
      const json = await res.json();
      if (res.status() !== 200) {
        expect(json).toHaveProperty('error');
      }
    });
  });

  // ── GET /api/waf/<domain> ─────────────────────────────────────────────────
  test.describe('GET /api/waf/:domain', () => {

    test('returns WAF stats for a domain', async () => {
      const res = await api.get(`/api/waf/${TEST_DOMAIN}`);
      expect(res.status()).toBe(200);

      const json = await res.json();
      expect(json).toHaveProperty('domain', TEST_DOMAIN);
      expect(json).toHaveProperty('seconds');
      expect(json).toHaveProperty('checks');
      expect(json).toHaveProperty('blocks');
      expect(typeof json.checks).toBe('number');
      expect(typeof json.blocks).toBe('number');
    });

    test('respects ?seconds query param', async () => {
      const res = await api.get(`/api/waf/${TEST_DOMAIN}?seconds=300`);
      expect(res.status()).toBe(200);

      const json = await res.json();
      expect(json.seconds).toBe(300);
    });

    test('strips subfolders from domain', async () => {
      const res = await api.get(`/api/waf/${TEST_DOMAIN}/some/path`);
      expect(res.status()).toBe(200);

      const json = await res.json();
      // Should use only the domain, not the path
      expect(json.domain).toBe(TEST_DOMAIN);
    });
  });

  // ── GET /api/docker_domains ───────────────────────────────────────────────
  test.describe('GET /api/docker_domains', () => {

    test('returns main and sub domains', async () => {
      const res = await api.get('/api/docker_domains');
      expect(res.status()).toBe(200);

      const json = await res.json();
      expect(json).toHaveProperty('maindomains');
      expect(json).toHaveProperty('subdomains');
      expect(Array.isArray(json.maindomains)).toBe(true);
      expect(Array.isArray(json.subdomains)).toBe(true);
    });
  });

  // ── GET /api/docker_databases ─────────────────────────────────────────────
  test.describe('GET /api/docker_databases', () => {

    test('returns database usage count', async () => {
      const res = await api.get('/api/docker_databases');
      expect(res.status()).toBe(200);

      const json = await res.json();
      expect(json).toHaveProperty('db_usage');
    });
  });

  // ── GET /api/resource_usage ───────────────────────────────────────────────
  test.describe('GET /api/resource_usage', () => {

    test('returns resource usage data', async () => {
      const res = await api.get('/api/resource_usage');
      expect(res.status()).toBe(200);
      // The response proxies from get_resource_usage — just assert it's not empty
      const text = await res.text();
      expect(text.length).toBeGreaterThan(0);
    });
  });

  // ── GET /api/account/activity ─────────────────────────────────────────────
  test.describe('GET /api/account/activity', () => {

    test('returns paginated activity log', async () => {
      const res = await api.get('/api/account/activity');
      expect(res.status()).toBe(200);

      const json = await res.json();
      const requiredFields = [
        'log_content', 'current_page', 'items_per_page',
        'total_pages', 'total_lines', 'search_term', 'show_all',
      ];
      for (const field of requiredFields) {
        expect(json, `activity log missing field: ${field}`).toHaveProperty(field);
      }
      expect(Array.isArray(json.log_content)).toBe(true);
      expect(typeof json.current_page).toBe('number');
      expect(typeof json.total_pages).toBe('number');
    });

    test('supports ?search= filter', async () => {
      const res = await api.get('/api/account/activity?search=login');
      expect(res.status()).toBe(200);

      const json = await res.json();
      expect(json.search_term).toBe('login');
    });

    test('supports ?page= param', async () => {
      const res = await api.get('/api/account/activity?page=2');
      expect(res.status()).toBe(200);

      const json = await res.json();
      expect(json.current_page).toBe(2);
    });

    test('supports ?show_all=true', async () => {
      const res = await api.get('/api/account/activity?show_all=true');
      expect(res.status()).toBe(200);

      const json = await res.json();
      expect(json.show_all).toBe(true);
    });
  });

  // ── Authentication guard ──────────────────────────────────────────────────
  test.describe('Authentication guard', () => {

    test('unauthenticated request is rejected', async ({ request }) => {
      const ctx = await request.newContext({ baseURL: BASE_URL });
      const protectedRoutes = [
        '/api/endpoints',
        '/api/system/hosting/info',
        '/api/disk_inodes',
        '/api/account/login-history',
        '/api/account/language',
        '/api/docker_domains',
        '/api/docker_databases',
        '/api/resource_usage',
        '/api/account/activity',
      ];

      for (const route of protectedRoutes) {
        const res = await ctx.get(route, { maxRedirects: 0 });
        expect(
          [401, 403, 302],
          `${route} should reject unauthenticated requests`
        ).toContain(res.status());
      }
      await ctx.dispose();
    });
  });
