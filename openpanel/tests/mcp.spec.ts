import { test, expect, type Page } from '@playwright/test';
import { bulkRun, bulkSelectKeys, bulkSelectAllAndClear } from '../helpers';

const RUN = process.env.TEST_RUN_ID || Math.random().toString(36).slice(2, 8);

const tokenRow = (page: Page, name: string) => page.locator('#mcp-tokens-table tbody tr', { hasText: name });

// the form and the connect guide start folded behind the Generate token button
async function openForm(page: Page) {
  const btn = page.locator('#mcp-add-button');
  if ((await btn.getAttribute('aria-expanded')) !== 'true') await btn.click();
  await expect(page.locator('#mcp-generate-form')).toBeVisible();
}

async function createToken(page: Page, name: string, readOnly = false) {
  await page.goto('/account/mcp');
  await openForm(page);
  const form = page.locator('#mcp-generate-form');
  await form.locator('input[name="name"]').fill(name);
  await form.locator('select[name="expires_in_days"]').selectOption('30');
  if (readOnly) await form.locator('input[name="read_only"]').check();
  await form.getByRole('button', { name: 'Generate new token' }).click();
  await expect(page).toHaveURL(/\/account\/mcp/);
  await expect(tokenRow(page, name)).toBeVisible();
}

test('mcp tokens page loads', async ({ page }) => {
  await page.goto('/account/mcp');
  await expect(page.locator('#mcp-generate-form')).toBeHidden();
  await openForm(page);
  await expect(page.locator('#mcp-connect-section')).toBeVisible();
});

test('generate a read-only token', async ({ page }) => {
  const name = `pw-mcp-ro-${RUN}`;
  await createToken(page, name, true);
  await expect(tokenRow(page, name)).toContainText('Read-only');
});

test('read-only token cannot create or revoke tokens', async ({ page, playwright, baseURL }) => {
  const name = `pw-mcp-ro2-${RUN}`;
  await createToken(page, name, true);
  const raw = (await page.locator('#new-token-value').textContent())!.trim();
  expect(raw).toMatch(/^op_mcp_/);

  const api = await playwright.request.newContext({
    baseURL, ignoreHTTPSErrors: true,
    extraHTTPHeaders: { Authorization: `Bearer ${raw}`, 'Content-Type': 'application/json' },
  });
  expect((await api.get('/api/account/mcp')).status()).toBe(200);
  const mint = await api.post('/api/account/mcp', { data: { name: `pw-mcp-esc-${RUN}`, read_only: false } });
  expect(mint.status()).toBe(403);
  const id = await tokenRow(page, name).locator('input.bulk-select-box').getAttribute('value');
  expect((await api.delete(`/api/account/mcp/${id}`)).status()).toBe(403);
  const call = await api.post('/mcp', { data: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'account_mcp_post', arguments: { body: { name: `pw-mcp-rpc-${RUN}`, read_only: false } } } } });
  expect(await call.text()).toContain('read-only');
  await api.dispose();

  await page.goto('/account/mcp');
  await expect(tokenRow(page, `pw-mcp-esc-${RUN}`)).toHaveCount(0);
  await expect(tokenRow(page, `pw-mcp-rpc-${RUN}`)).toHaveCount(0);
  console.log('read-only MCP token was refused on token create, revoke and tools/call');
});

test('bulk revoke tokens', async ({ page }) => {
  const names = [`pw-mcp-a-${RUN}`, `pw-mcp-b-${RUN}`];
  for (const name of names) await createToken(page, name);

  await page.goto('/account/mcp');
  await bulkSelectAllAndClear(page);

  // the checkbox key is the token id, so read it from each row
  const ids = await Promise.all(names.map(name => tokenRow(page, name).locator('input.bulk-select-box').getAttribute('value')));
  await bulkSelectKeys(page, ids as string[]);
  await bulkRun(page, 'revoke');
  for (const name of names) await expect(tokenRow(page, name)).toHaveCount(0);

  // the read-only tokens from the tests above go too
  for (const n of [`pw-mcp-ro-${RUN}`, `pw-mcp-ro2-${RUN}`]) {
    const leftover = tokenRow(page, n).locator('input.bulk-select-box');
    if (await leftover.count()) {
      await bulkSelectAllAndClear(page);
      await bulkSelectKeys(page, [(await leftover.getAttribute('value'))!]);
      await bulkRun(page, 'revoke');
    }
  }
});
