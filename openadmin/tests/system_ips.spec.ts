import { test, expect } from '@playwright/test';

// Small JSON endpoint used by the user edit form's IP picker
// ($store.ipStore.fetchIPs() in user_detail.html) -- not a page of its own,
// so this only checks the response shape/access control directly.

test('GET /system/ips/{username} returns the server\'s public IP addresses', async ({ request }) => {
  const response = await request.get('/system/ips/testinguser');
  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  expect(Array.isArray(body.ip_addresses)).toBeTruthy();

  console.log(`/system/ips returned ${body.ip_addresses.length} public IP address(es)`);
});
