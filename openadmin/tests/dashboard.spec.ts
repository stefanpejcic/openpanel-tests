// TODO: /json/combined_activity

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'https://185.193.66.252:2087';


async function navigateToDashboardPage(page: any) {
  await page.goto(`${BASE_URL}/dashboard`);
  await expect(page).toHaveURL(/dashboard/);
}


test('system resources', async ({ page }) => {
  await page.goto(`${BASE_URL}/json/system`);
  await expect(page).toHaveURL(/json\/system/);

  const raw = await page.locator('body').innerText();
  const data = JSON.parse(raw);

  const requiredKeys = [
    'cpu', 'hostname', 'kernel', 'openpanel_version',
    'os', 'package_updates', 'running_processes', 'time', 'uptime'
  ];
  for (const key of requiredKeys) {
    expect(data).toHaveProperty(key);
  }

  expect(typeof data.cpu).toBe('string');
  expect(typeof data.hostname).toBe('string');
  expect(typeof data.kernel).toBe('string');
  expect(typeof data.openpanel_version).toBe('string');
  expect(typeof data.os).toBe('string');
  expect(typeof data.package_updates).toBe('number');
  expect(typeof data.running_processes).toBe('number');
  expect(typeof data.time).toBe('string');
  expect(typeof data.uptime).toBe('string'); // or number

  expect(data.cpu.length).toBeGreaterThan(0);
  expect(data.hostname.length).toBeGreaterThan(0);
  expect(data.running_processes).toBeGreaterThan(0);
  expect(Number(data.uptime)).toBeGreaterThanOrEqual(0);
  expect(data.package_updates).toBeGreaterThanOrEqual(0);
  expect(data.openpanel_version).toMatch(/^\d+\.\d+\.\d+$/);
  expect(data.time).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  expect(data.os.toLowerCase()).toMatch(/ubuntu|debian|almalinux|rockylinux|centos/);


  const serverTime = new Date(data.time.replace(' ', 'T'));
  const now = new Date();
  const diffSeconds = Math.abs(now - serverTime) / 1000;
  expect(diffSeconds).toBeLessThan(60);

  console.log('system info is available:', data);
});


test('access dashboard', async ({ page }) => {
  await navigateToDashboardPage(page);
  await expect(page.getByText(/welcome/i)).toBeVisible();
  console.log('Dashboard page is accessible');
});

