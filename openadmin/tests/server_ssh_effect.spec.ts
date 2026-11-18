import { test, expect, type Page } from '@playwright/test';
import { execFileSync, spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Server > SSH: password authentication off makes sshd stop offering it, a key added on the Keys tab logs in
// and stops working once removed, the port is never touched so the server can't be locked out

const host = new URL(process.env.BASE_URL!).hostname;
const SSH_OPTS = ['-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=no', '-o', 'UserKnownHostsFile=/dev/null', '-o', 'ConnectTimeout=10'];

// the auth methods sshd offers, from the "Permission denied (...)" of a login with none
function offered(): string {
  const r = spawnSync('ssh', [...SSH_OPTS, '-o', 'PreferredAuthentications=none', `root@${host}`, 'true'], { encoding: 'utf8' });
  return (r.stderr.match(/Permission denied \(([^)]*)\)/) || [])[1] ?? '';
}

function keyLogin(keyFile: string): boolean {
  const r = spawnSync('ssh', [...SSH_OPTS, '-o', 'PreferredAuthentications=publickey', '-o', 'IdentitiesOnly=yes', '-i', keyFile, `root@${host}`, 'true'], { encoding: 'utf8' });
  return r.status === 0;
}

async function setPasswordAuth(page: Page, value: 'yes' | 'no') {
  await page.goto('/server/ssh#basic');
  await page.locator('select#password_auth').selectOption(value);
  await page.locator('select#password_auth').evaluate(el => (el as HTMLSelectElement).form!.requestSubmit());
  await expect(page.getByText('SSH settings updated.')).toBeVisible({ timeout: 60_000 });
}

test.beforeAll(() => {
  test.skip(spawnSync('ssh', ['-V']).status !== 0, 'no ssh client on the runner');
});

test('password authentication off is no longer offered by sshd', async ({ page }) => {
  test.setTimeout(240_000);
  const before = offered();
  test.skip(!before.includes('password'), 'password authentication is already off');
  try {
    await setPasswordAuth(page, 'no');
    await expect.poll(() => offered(), { timeout: 60_000, intervals: [3_000] }).not.toContain('password');
  } finally {
    await setPasswordAuth(page, 'yes');
  }
  await expect.poll(() => offered(), { timeout: 60_000, intervals: [3_000] }).toContain('password');
});

test('a key added on the Keys tab logs in and stops after it is removed', async ({ page }) => {
  test.setTimeout(240_000);
  test.skip(!offered().includes('publickey'), 'public key authentication is off');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-ssh-'));
  const keyFile = path.join(dir, 'id_ed25519');
  execFileSync('ssh-keygen', ['-t', 'ed25519', '-N', '', '-C', `pw-${Date.now() % 100000}`, '-f', keyFile, '-q']);
  const pub = fs.readFileSync(`${keyFile}.pub`, 'utf8').trim();
  expect(keyLogin(keyFile)).toBe(false);

  await page.goto('/server/ssh#keys');
  await page.locator('textarea#new_key').fill(pub);
  await page.locator('textarea#new_key').evaluate(el => (el as HTMLTextAreaElement).form!.requestSubmit());
  await expect(page.getByText('New SSH key added.')).toBeVisible({ timeout: 30_000 });
  try {
    await expect.poll(() => keyLogin(keyFile), { timeout: 30_000 }).toBe(true);
  } finally {
    await page.goto('/server/ssh#keys');
    const remove = page.locator(`form:has(input[name="key_to_remove"][value*="${pub.split(' ')[1]}"])`);
    if (await remove.count()) {
      await remove.first().evaluate(f => (f as HTMLFormElement).requestSubmit());
      await expect(page.getByText('SSH key removed.')).toBeVisible({ timeout: 30_000 });
    }
  }
  expect(keyLogin(keyFile)).toBe(false);
  fs.rmSync(dir, { recursive: true, force: true });
});
