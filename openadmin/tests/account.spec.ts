import { test, expect } from '@playwright/test';

// NOTE: /account is the reseller self-service "change my own password" page
// (ServeAccount in resellers.go) -- it 403s for anything but role=="reseller".
// This suite's storageState logs in as the admin account only (auth.setup.ts
// has no reseller-login flow), so the reseller-facing UI itself (the
// password form) isn't reachable here. What IS reachable and worth locking
// down is the access-control check itself: an admin must never be able to
// use this reseller-only self-service page.

test('admin is forbidden from the reseller self-service account page', async ({ page }) => {
  const response = await page.goto('/account');
  expect(response?.status()).toBe(403);

  console.log('admin request to /account correctly returned 403 Forbidden');
});
