import { test, expect } from '@playwright/test';

async function navigateToDashboardPage(page: any) {
  await page.goto(`/dashboard`);
  await expect(page).toHaveURL(/dashboard/);
}


test('access dashboard', async ({ page }) => {
  await navigateToDashboardPage(page);
  await expect(page.getByText(/cpu usage/i)).toBeVisible();
  console.log('Dashboard page is accessible');
});



test('sidebar', async ({ page }) => {
  await navigateToDashboardPage(page);

  const html = page.locator('html');
  const sidebar = page.locator('#sidebar');

  await expect(html).toHaveClass(/sidebar-open/);
  await expect(sidebar).toBeVisible();

  await page.locator('#sidebar_toggle_button').click();
  await expect(html).not.toHaveClass(/sidebar-open/);
  await expect(sidebar).not.toBeVisible();

  await page.locator('#sidebar_toggle_button').click();
  await expect(html).toHaveClass(/sidebar-open/);
  await expect(sidebar).toBeVisible();

  console.log('sidebar toggle working');
});



test('dark mode', async ({ page }) => {
  await navigateToDashboardPage(page);

  await page.locator('#user-btn-info').click();

  await expect(page.locator('#theme-toggle-dark-icon')).toBeVisible();

  await page.locator('#theme-toggle-dark-icon').click();
  await expect(page.locator('#theme-toggle-light-icon')).toBeVisible();
  await expect(page.locator('html')).toHaveClass(/dark/);

  await page.locator('#theme-toggle-light-icon').click();
  await expect(page.locator('#theme-toggle-dark-icon')).toBeVisible();
  await expect(page.locator('html')).not.toHaveClass(/dark/);

  console.log('Dark mode switch is working');
});




test('icons toggle', async ({ page }) => {
  await navigateToDashboardPage(page);

  const iconViewBtn = page.locator('button[title="Top"]');
  const listViewBtn = page.locator('button[title="Start"]');

  await listViewBtn.click();
  const listValue = await page.evaluate(() => localStorage.getItem('dashboard_icon_view'));
  expect(listValue).toBe('list');
  await expect(listViewBtn).toHaveClass(/bg-slate-700/);
  await expect(iconViewBtn).not.toHaveClass(/bg-slate-700/);

  await iconViewBtn.click();
  const iconValue = await page.evaluate(() => localStorage.getItem('dashboard_icon_view'));
  expect(iconValue).toBe('icon');
  await expect(iconViewBtn).toHaveClass(/bg-slate-700/);
  await expect(listViewBtn).not.toHaveClass(/bg-slate-700/);

  console.log('icons toggle working');
});
