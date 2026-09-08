import { test, expect } from '@playwright/test';

// NOTE: "Dismiss completely" and "Got it, take me to the dashboard" both
// call finish(), which POSTs /api/quickstart/dismiss and permanently marks
// onboarding as dismissed for this admin account (server-side, not just this
// browser session) -- neither is clicked here. "Skip for now" is a plain
// client-side redirect with no server mutation, so it IS exercised. The
// wizard's own step navigation (Start/Continue/Back) is entirely client-side
// (an Alpine `step` counter) until finish() runs, so walking through all
// three steps is otherwise safe.

test('onboarding page loads with the intro step', async ({ page }) => {
  await page.goto('/onboarding');
  await expect(page).toHaveURL(/onboarding/);

  await expect(page.getByRole('heading', { name: "Let's get your server ready" })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Skip for now' })).toBeVisible();
  await expect(page.locator('#onboarding-dismiss-intro-btn')).toBeVisible();

  console.log('onboarding page loaded on the intro step');
});

test('Start walks through steps 1-3 with progress indicator and Back navigation', async ({ page }) => {
  await page.goto('/onboarding');
  await expect(page).toHaveURL(/\/onboarding/);

  const main = page.getByRole('main');

  await page.getByRole('button', { name: 'Start' }).click();

  await expect(
    main.locator('p.onb-step-eyebrow', { hasText: 'Step 1 of 3' })
  ).toBeVisible();

  await expect(
    page.getByRole('heading', { name: 'Enable modules & services' })
  ).toBeVisible();

  const serviceCards = page.locator(
    '#onboarding-services input[type="checkbox"]'
  );

  const serviceCount = await serviceCards.count();

  if (serviceCount > 0) {
    console.log(`step 1 lists ${serviceCount} onboarding service checkbox(es)`);
  }

  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(
    main.locator('p.onb-step-eyebrow', { hasText: 'Step 2 of 3' })
  ).toBeVisible();

  await expect(
    page.getByRole('heading', { name: 'Server configuration' })
  ).toBeVisible();

  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(
    main.locator('p.onb-step-eyebrow', { hasText: 'Step 3 of 3' })
  ).toBeVisible();

  await expect(
    page.getByRole('heading', { name: 'Users and plans' })
  ).toBeVisible();

  await expect(
    page.getByRole('button', {
      name: 'Got it, take me to the dashboard',
    })
  ).toBeVisible();

  // Back navigates without losing wizard state.
  await page.getByRole('button', { name: 'Back' }).click();

  await expect(
    main.locator('p.onb-step-eyebrow', { hasText: 'Step 2 of 3' })
  ).toBeVisible();

  await expect(
    page.getByRole('heading', { name: 'Server configuration' })
  ).toBeVisible();

  console.log('walked forward through all three steps and back one step');
});

test('config and user/plan step cards link to their real settings pages', async ({ page }) => {
  await page.goto('/onboarding');
  await page.getByRole('button', { name: 'Start' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  const configCards = page.locator('main a.onb-card');
  const configCount = await configCards.count();
  test.skip(configCount === 0, 'No config steps rendered on this environment');

  const firstHref = await configCards.first().getAttribute('href');
  expect(firstHref).toBeTruthy();
  expect(firstHref!.startsWith('/')).toBeTruthy();
  console.log(`step 2 rendered ${configCount} card(s), first links to "${firstHref}"`);
});

test('Skip for now leaves onboarding without dismissing it', async ({ page }) => {
  await page.goto('/onboarding');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await expect(page).toHaveURL(/dashboard/);

  // onboarding is still reachable afterward -- confirms "skip" did not
  // permanently dismiss it server-side
  await page.goto('/onboarding');
  await expect(page.getByRole('heading', { name: "Let's get your server ready" })).toBeVisible();

  console.log('skip for now redirected to dashboard without dismissing onboarding');
});
