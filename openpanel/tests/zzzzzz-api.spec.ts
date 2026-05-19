import { test, expect, request, APIRequestContext } from '@playwright/test';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:5000';
const VALID_EMAIL    = process.env.API_USER    ?? 'testuser@example.com';
const VALID_PASSWORD = process.env.API_PASSWORD ?? 'password123';
const TOTP_SECRET    = process.env.API_TOTP_SECRET ?? ''; // leave empty if 2FA not enabled in test env

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function login(
  ctx: APIRequestContext,
  email = VALID_EMAIL,
  password = VALID_PASSWORD,
  twofa_code?: string
) {
  const body: Record<string, string> = { email, password };
  if (twofa_code) body.twofa_code = twofa_code;

  return ctx.post(`${BASE_URL}/api/login`, {
    data: body,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function getToken(ctx: APIRequestContext): Promise<string> {
  const res = await login(ctx);
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.token).toBeTruthy();
  return body.token as string;
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// ---------------------------------------------------------------------------
// POST /api/login
// ---------------------------------------------------------------------------
test.describe('POST /api/login', () => {
  test('returns a JWT token on valid credentials', async ({ request: ctx }) => {
    const res = await login(ctx);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('token');
    expect(body).toHaveProperty('user_id');
    expect(body).toHaveProperty('expires_in', 3600);
  });

  test('returns 401 on wrong password', async ({ request: ctx }) => {
    const res = await login(ctx, VALID_EMAIL, 'wrong_password');
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).not.toHaveProperty('token');
  });

  test('returns 401 on unknown user', async ({ request: ctx }) => {
    const res = await login(ctx, 'nobody@example.com', 'any');
    expect(res.status()).toBe(401);
  });

  test('returns 422 / 400 when body is missing entirely', async ({ request: ctx }) => {
    const res = await ctx.post(`${BASE_URL}/api/login`, {
      headers: { 'Content-Type': 'application/json' },
      data: {},
    });
    expect([400, 401, 422]).toContain(res.status());
  });

  test('signals 2FA requirement when twofa_code is absent and 2FA is enabled', async ({ request: ctx }) => {
    // This test only runs meaningfully against an account with 2FA enabled.
    // Skip when no TOTP secret is supplied to keep CI green.
    test.skip(!TOTP_SECRET, 'TOTP secret not configured');
    const res = await login(ctx);
    const body = await res.json();
    expect(body).toHaveProperty('twofa_required', true);
    expect(body).toHaveProperty('user_id');
  });

  test('rate-limiter returns 429 after excessive attempts', async ({ request: ctx }) => {
    const attempts = Array.from({ length: 20 }, () =>
      login(ctx, 'spam@example.com', 'bad')
    );
    const results = await Promise.all(attempts);
    const statuses = results.map((r) => r.status());
    expect(statuses).toContain(429);
  });
});

// ---------------------------------------------------------------------------
// GET /api/endpoints
// ---------------------------------------------------------------------------
test.describe('GET /api/endpoints', () => {
  test('lists all /api/* routes for an authenticated user', async ({ request: ctx }) => {
    const token = await getToken(ctx);
    const res = await ctx.get(`${BASE_URL}/api/endpoints`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.endpoints)).toBe(true);
    expect(body.total).toBeGreaterThan(0);
    // Every returned path must start with /api/
    for (const ep of body.endpoints) {
      expect(ep.path).toMatch(/^\/api\//);
      expect(Array.isArray(ep.methods)).toBe(true);
    }
  });

  test('returns 401 without a token', async ({ request: ctx }) => {
    const res = await ctx.get(`${BASE_URL}/api/endpoints`);
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/system/hosting/info
// ---------------------------------------------------------------------------
test.describe('GET /api/system/hosting/info', () => {
  test('returns system metadata', async ({ request: ctx }) => {
    const token = await getToken(ctx);
    const res = await ctx.get(`${BASE_URL}/api/system/hosting/info`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('system');
    expect(body).toHaveProperty('node');
    expect(body).toHaveProperty('release');
    expect(body).toHaveProperty('uptime');
    expect(body).toHaveProperty('load_avg');
    expect(body).toHaveProperty('ip');
  });

  test('returns 401 without auth', async ({ request: ctx }) => {
    const res = await ctx.get(`${BASE_URL}/api/system/hosting/info`);
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/disk_inodes
// ---------------------------------------------------------------------------
test.describe('GET /api/disk_inodes', () => {
  test('returns disk and inode data', async ({ request: ctx }) => {
    const token = await getToken(ctx);
    const res = await ctx.get(`${BASE_URL}/api/disk_inodes`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toBeTruthy();
  });

  test('returns 401 without auth', async ({ request: ctx }) => {
    const res = await ctx.get(`${BASE_URL}/api/disk_inodes`);
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/account/login-history
// ---------------------------------------------------------------------------
test.describe('GET /api/account/login-history', () => {
  test('returns an array of login events', async ({ request: ctx }) => {
    const token = await getToken(ctx);
    const res = await ctx.get(`${BASE_URL}/api/account/login-history`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('returns 401 without auth', async ({ request: ctx }) => {
    const res = await ctx.get(`${BASE_URL}/api/account/login-history`);
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/account/language
// ---------------------------------------------------------------------------
test.describe('GET /api/account/language', () => {
  test('returns available locales and the current locale', async ({ request: ctx }) => {
    const token = await getToken(ctx);
    const res = await ctx.get(`${BASE_URL}/api/account/language`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('locales');
    expect(body).toHaveProperty('current');
    expect(Array.isArray(body.locales)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// GET /api/auto-installer
// ---------------------------------------------------------------------------
test.describe('GET /api/auto-installer', () => {
  test('returns domains, data and per-technology counts', async ({ request: ctx }) => {
    const token = await getToken(ctx);
    const res = await ctx.get(`${BASE_URL}/api/auto-installer`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('domains');
    expect(body).toHaveProperty('data');
    // At least one count_* key should be present
    const hasCountKey = Object.keys(body).some((k) => k.startsWith('count_'));
    expect(hasCountKey).toBe(true);
  });

  test('returns 401 without auth', async ({ request: ctx }) => {
    const res = await ctx.get(`${BASE_URL}/api/auto-installer`);
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET|PUT|DELETE /api/favorites
// ---------------------------------------------------------------------------
test.describe('/api/favorites', () => {
  const testLink  = '/test-favorite-link';
  const testTitle = 'Playwright Test Favorite';

  test('GET returns current favorites list', async ({ request: ctx }) => {
    const token = await getToken(ctx);
    const res = await ctx.get(`${BASE_URL}/api/favorites`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);
  });

  test('PUT adds a new favorite', async ({ request: ctx }) => {
    const token = await getToken(ctx);
    const res = await ctx.put(`${BASE_URL}/api/favorites`, {
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      data: { link: testLink, title: testTitle },
    });
    expect(res.status()).toBe(200);
  });

  test('PUT with empty link returns an error', async ({ request: ctx }) => {
    const token = await getToken(ctx);
    const res = await ctx.put(`${BASE_URL}/api/favorites`, {
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      data: { link: '', title: 'No link' },
    });
    expect([400, 422]).toContain(res.status());
  });

  test('DELETE removes an existing favorite', async ({ request: ctx }) => {
    const token = await getToken(ctx);
    // Ensure favorite exists first
    await ctx.put(`${BASE_URL}/api/favorites`, {
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      data: { link: testLink, title: testTitle },
    });
    const res = await ctx.delete(`${BASE_URL}/api/favorites`, {
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      data: { link: testLink },
    });
    expect(res.status()).toBe(200);
  });

  test('returns 401 without auth', async ({ request: ctx }) => {
    const res = await ctx.get(`${BASE_URL}/api/favorites`);
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/waf/:domain
// ---------------------------------------------------------------------------
test.describe('GET /api/waf/:domain', () => {
  const domain = 'example.com';

  test('returns WAF stats for a domain', async ({ request: ctx }) => {
    const token = await getToken(ctx);
    const res = await ctx.get(`${BASE_URL}/api/waf/${domain}`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('domain', domain);
    expect(body).toHaveProperty('seconds');
    expect(body).toHaveProperty('checks');
    expect(body).toHaveProperty('blocks');
  });

  test('respects custom ?seconds= query param', async ({ request: ctx }) => {
    const token = await getToken(ctx);
    const res = await ctx.get(`${BASE_URL}/api/waf/${domain}?seconds=120`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.seconds).toBe(120);
  });

  test('strips subfolders from domain path segment', async ({ request: ctx }) => {
    const token = await getToken(ctx);
    const res = await ctx.get(`${BASE_URL}/api/waf/${domain}/subfolder`, {
      headers: authHeaders(token),
    });
    // Should still resolve to domain only, not 404
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.domain).toBe(domain);
    }
  });

  test('returns 401 without auth', async ({ request: ctx }) => {
    const res = await ctx.get(`${BASE_URL}/api/waf/${domain}`);
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/ (redirect to /api/dashboard)
// ---------------------------------------------------------------------------
test.describe('GET /api/', () => {
  test('redirects to /api/dashboard', async ({ request: ctx }) => {
    const token = await getToken(ctx);
    // Follow redirects manually to observe the chain
    const res = await ctx.get(`${BASE_URL}/api/`, {
      headers: authHeaders(token),
      maxRedirects: 0,
    });
    // Expect a redirect status
    expect([301, 302, 307, 308]).toContain(res.status());
    expect(res.headers()['location']).toMatch(/\/api\/dashboard/);
  });
});

// ---------------------------------------------------------------------------
// GET /api/dashboard
// ---------------------------------------------------------------------------
test.describe('GET /api/dashboard', () => {
  test('returns dashboard metadata', async ({ request: ctx }) => {
    const token = await getToken(ctx);
    const res = await ctx.get(`${BASE_URL}/api/dashboard`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('title', 'Dashboard');
    expect(body).toHaveProperty('locale');
  });

  test('returns 401 without auth', async ({ request: ctx }) => {
    const res = await ctx.get(`${BASE_URL}/api/dashboard`);
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/docker_domains
// ---------------------------------------------------------------------------
test.describe('GET /api/docker_domains', () => {
  test('returns maindomains and subdomains', async ({ request: ctx }) => {
    const token = await getToken(ctx);
    const res = await ctx.get(`${BASE_URL}/api/docker_domains`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('maindomains');
    expect(body).toHaveProperty('subdomains');
    expect(Array.isArray(body.maindomains)).toBe(true);
    expect(Array.isArray(body.subdomains)).toBe(true);
  });

  test('returns 401 without auth', async ({ request: ctx }) => {
    const res = await ctx.get(`${BASE_URL}/api/docker_domains`);
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/docker_databases
// ---------------------------------------------------------------------------
test.describe('GET /api/docker_databases', () => {
  test('returns db_usage count', async ({ request: ctx }) => {
    const token = await getToken(ctx);
    const res = await ctx.get(`${BASE_URL}/api/docker_databases`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('db_usage');
  });

  test('returns 401 without auth', async ({ request: ctx }) => {
    const res = await ctx.get(`${BASE_URL}/api/docker_databases`);
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/resource_usage
// ---------------------------------------------------------------------------
test.describe('GET /api/resource_usage', () => {
  test('returns resource usage data', async ({ request: ctx }) => {
    const token = await getToken(ctx);
    const res = await ctx.get(`${BASE_URL}/api/resource_usage`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);
  });

  test('returns 401 without auth', async ({ request: ctx }) => {
    const res = await ctx.get(`${BASE_URL}/api/resource_usage`);
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/account/activity
// ---------------------------------------------------------------------------
test.describe('GET /api/account/activity', () => {
  test('returns paginated activity log', async ({ request: ctx }) => {
    const token = await getToken(ctx);
    const res = await ctx.get(`${BASE_URL}/api/account/activity`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('log_content');
    expect(body).toHaveProperty('current_page');
    expect(body).toHaveProperty('total_pages');
    expect(body).toHaveProperty('items_per_page');
    expect(body).toHaveProperty('total_lines');
  });

  test('filters results with ?search= param', async ({ request: ctx }) => {
    const token = await getToken(ctx);
    const res = await ctx.get(`${BASE_URL}/api/account/activity?search=login`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.search_term).toBe('login');
  });

  test('respects ?page= param', async ({ request: ctx }) => {
    const token = await getToken(ctx);
    const res = await ctx.get(`${BASE_URL}/api/account/activity?page=2`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.current_page).toBe(2);
  });

  test('respects ?show_all=true param', async ({ request: ctx }) => {
    const token = await getToken(ctx);
    const res = await ctx.get(`${BASE_URL}/api/account/activity?show_all=true`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.show_all).toBe(true);
  });

  test('returns 401 without auth', async ({ request: ctx }) => {
    const res = await ctx.get(`${BASE_URL}/api/account/activity`);
    expect(res.status()).toBe(401);
  });
});
