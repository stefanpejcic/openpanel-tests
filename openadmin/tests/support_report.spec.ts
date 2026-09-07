import { test, expect } from '@playwright/test';

// GET /support/report synchronously runs `opencli report --public
// --non-interactive` (a diagnostics report, not a destructive action) and
// redirects back to /license with the result as a flash message. This can
// take a while, mirroring the generous timeout zzz-api_endpoints.spec.ts
// already uses for the equivalent API endpoint.

test('generating a support report redirects to /license with the report result', async ({ page }) => {
  test.setTimeout(150_000);

  await page.goto('/license');
  const reportLink = page.locator('#tour-generate-report-btn');
  await expect(reportLink).toHaveAttribute('href', '/support/report');

  await reportLink.click();
  await expect(page).toHaveURL(/\/license/, { timeout: 120_000 });
  await expect(page.getByRole('alert')).toBeVisible();

  console.log('support report generated, redirected back to /license with a result flash');
});
