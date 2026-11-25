import { test, expect } from '@playwright/test';

// data the user page loads for an account, and a service limit changed and put back

const USER = process.env.TEST_USER || 'testinguser';

test.beforeEach(async ({ page }) => {
  const res = await page.request.get(`/users/${USER}`);
  test.skip(!res.ok(), `${USER} does not exist on this server`);
});

test('container stats list the running services', async ({ page }) => {
  const res = await page.request.get(`/containers/stats/${USER}`);
  expect(res.ok()).toBeTruthy();
  const stats = (await res.json()).container_stats ?? [];
  for (const c of stats) {
    expect(c.Name).toBeTruthy();
    // 0 is a service without a memory limit, docker-proxy has none
    expect(c.MemLimit).toBeGreaterThanOrEqual(0);
  }
  console.log(`${USER}: ${stats.length} running containers`);
});

test('disk, notes and usage history load', async ({ page }) => {
  const disk = await (await page.request.get(`/client/disk/${USER}`)).json();
  expect(disk.map((d: any) => d.Type)).toContain('Containers');

  const notes = await (await page.request.get(`/get_user_notes/${USER}`)).json();
  expect(notes).toHaveProperty('notes');

  // one json object per line, newest last
  const history = (await (await page.request.get(`/get_resource_usage_history/${USER}`)).text()).trim();
  if (history) {
    const last = JSON.parse(history.split('\n').pop()!);
    expect(last.user).toBe(USER);
    expect(last.memory.total.bytes).toBeGreaterThan(0);
  }
});

test('a service process limit is saved and then put back', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(`/users/${USER}#services`);
  const form = page.locator(`form[action^="/containers/${USER}/pids/"]`).first();
  test.skip(await form.count() === 0, `${USER} has no services listed`);

  const action = (await form.getAttribute('action'))!;
  const service = action.split('/').pop()!;
  const original = await form.locator('input[name="value"]').inputValue();
  const csrf = await form.locator('input[name="csrf_token"]').inputValue();
  const set = async (value: string) => {
    const res = await page.request.post(action, { form: { csrf_token: csrf, value }, headers: { Referer: page.url() } });
    expect(res.status()).toBeLessThan(400);
  };

  await set('1234');
  // same url with a hash wouldn't load the page again
  await page.reload();
  await expect(page.locator(`form[action="${action}"] input[name="value"]`)).toHaveValue('1234');

  await set(original);
  await page.reload();
  await expect(page.locator(`form[action="${action}"] input[name="value"]`)).toHaveValue(original);
  console.log(`${service}: pids 1234 saved, back to ${original}`);
});

// the services tab saves limits with fetch, it gets json back and a 0 cpu limit asks for a restart instead of restarting
test('a service limit saved from the page answers with json', async ({ page }) => {
  await page.goto(`/users/${USER}#services`);
  const form = page.locator(`form[action^="/containers/${USER}/pids/"]`).first();
  test.skip(await form.count() === 0, `${USER} has no services listed`);
  const action = (await form.getAttribute('action'))!;
  const original = await form.locator('input[name="value"]').inputValue();
  const csrf = await form.locator('input[name="csrf_token"]').inputValue();
  const post = (value: string) => page.request.post(action, {
    form: { csrf_token: csrf, value },
    headers: { Referer: page.url(), 'X-Requested-With': 'XMLHttpRequest' },
  });
  try {
    const res = await post('1234');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.restart_needed).toBe(false);
  } finally {
    expect((await post(original)).ok()).toBeTruthy();
  }
});

test('the service editor gives one service and locks its ports', async ({ page }) => {
  await page.goto(`/users/${USER}#services`);
  const form = page.locator(`form[action^="/containers/${USER}/pids/"]`).first();
  test.skip(await form.count() === 0, `${USER} has no services listed`);
  const csrf = await form.locator('input[name="csrf_token"]').inputValue();

  // the first service that publishes a port through .env
  const services = await page.locator('tr[data-svc]').evaluateAll(rows => rows.map(r => (r as HTMLElement).dataset.svc!));
  let svc = '', cfg: any = null;
  for (const s of services) {
    const res = await page.request.get(`/containers/${USER}/config/${s}`);
    if (!res.ok()) continue;
    const body = await res.json();
    if (body.env.some((r: any) => r.readonly && !r.missing)) { svc = s; cfg = body; break; }
  }
  test.skip(!svc, `${USER} has no service with a port in .env`);

  expect(cfg.compose.startsWith(`${svc}:`)).toBeTruthy();
  const port = cfg.env.find((r: any) => r.readonly && !r.missing);
  expect(port.key).toMatch(/PORT/);

  const values = Object.fromEntries(cfg.env.map((r: any) => [r.key, r.value]));
  const save = (env: Record<string, string>) => page.request.post(`/containers/${USER}/config/${svc}`, {
    multipart: { csrf_token: csrf, compose: cfg.compose, env: JSON.stringify(env) },
    headers: { Referer: page.url(), 'X-Requested-With': 'XMLHttpRequest' },
  });

  // saving it as it is changes nothing
  const same = await (await save(values)).json();
  expect(same.success).toBe(true);
  expect(same.changed).toBe(false);

  // a port can't be changed from here
  const moved = await save({ ...values, [port.key]: '0.0.0.0:1:1' });
  expect(moved.status()).toBe(400);
  expect((await moved.json()).error).toContain(port.key);
});
