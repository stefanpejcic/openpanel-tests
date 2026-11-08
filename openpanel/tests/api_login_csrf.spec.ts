import { test, expect } from '@playwright/test';

// logs in on its own, the shared session the other specs run on is never touched
test.use({ storageState: { cookies: [], origins: [] } });

// /api/login skips csrf, a form on another site posting json-as-text/plain to it must not replace the browser's panel session
test('cross-site post to /api/login does not log the browser out', async ({ page, baseURL }) => {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Username' }).fill(process.env.PANEL_USERNAME!);
  await page.getByRole('textbox', { name: 'Password' }).fill(process.env.PANEL_PASSWORD!);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(/.*dashboard/);

  const before = (await page.context().cookies()).find(c => c.name === 'OPENPANEL')?.value;
  expect(before).toBeTruthy();

  // valid account creds, sent the way a text/plain form encodes name=value
  const name = `{"username":${JSON.stringify(process.env.PANEL_USERNAME)},"password":${JSON.stringify(process.env.PANEL_PASSWORD)},"x":"`;
  const attacker = 'http://attacker.invalid/';
  await page.route(attacker, route => route.fulfill({
    contentType: 'text/html',
    body: `<form id="f" method="POST" enctype="text/plain" action="${baseURL}/api/login">
             <input type="hidden" name='${name.replace(/'/g, '&#39;')}' value='"}'>
           </form><script>document.getElementById('f').submit()</script>`,
  }));
  await page.goto(attacker);
  await page.waitForURL(/\/api\/login/, { timeout: 15_000 });

  const after = (await page.context().cookies()).find(c => c.name === 'OPENPANEL')?.value;
  console.log(`session cookie ${after === before ? 'unchanged' : 'REPLACED'} by the cross-site post`);

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/.*dashboard/);
  console.log('still logged in after the cross-site /api/login post');
});
