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


test('sections drag to sort', async ({ page }) => {
  await navigateToDashboardPage(page);

  const firstSection = page.locator('#dashboard-sortable-area > [data-id]').nth(0);
  const secondSection = page.locator('#dashboard-sortable-area > [data-id]').nth(1);

  const firstKey = await firstSection.getAttribute('data-id');
  const secondKey = await secondSection.getAttribute('data-id');

  const handle = page.locator(`#section-title-${firstKey}`);
  const targetHandle = page.locator(`#section-title-${secondKey}`);

  const handleBox = await handle.boundingBox();
  const targetBox = await targetHandle.boundingBox();

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(300); // wait for SortableJS
  const steps = 10;
  const deltaY = (targetBox.y + targetBox.height) - (handleBox.y + handleBox.height / 2);
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(
      handleBox.x + handleBox.width / 2,
      handleBox.y + handleBox.height / 2 + (deltaY * i) / steps
    );
    await page.waitForTimeout(20);
  }

  await page.mouse.up();
  await page.waitForTimeout(300);

  const savedOrder = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('dashboard_section_order'))
  );

  expect(savedOrder).not.toBeNull();
  expect(savedOrder[0]).toBe(secondKey);
  expect(savedOrder[1]).toBe(firstKey);

  const newFirstKey = await page.locator('#dashboard-sortable-area > [data-id]').nth(0).getAttribute('data-id');
  const newSecondKey = await page.locator('#dashboard-sortable-area > [data-id]').nth(1).getAttribute('data-id');

  expect(newFirstKey).toBe(secondKey);
  expect(newSecondKey).toBe(firstKey);

  console.log(`sections drag to sort working: moved '${firstKey}' below '${secondKey}'`);
});


test('section open and close', async ({ page }) => {
  await navigateToDashboardPage(page);

  const firstSectionWrapper = page.locator('#dashboard-sortable-area > [data-id]').nth(0);
  const sectionKey = await firstSectionWrapper.getAttribute('data-id');

  const toggleBtn = firstSectionWrapper.locator('button[aria-expanded]');
  const iconsGrid = firstSectionWrapper.locator(`#section-icons-${sectionKey}`);

  await expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
  await expect(iconsGrid).toBeVisible();

  await toggleBtn.click();
  await page.waitForTimeout(350); // alpinejs x-collapse

  await expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
  await expect(iconsGrid).toBeHidden();

  const closedValue = await page.evaluate((key) =>
    localStorage.getItem(`section_state_${key}`)
  , sectionKey);
  expect(closedValue).toBe('false');

  await toggleBtn.click();
  await page.waitForTimeout(350);

  await expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
  await expect(iconsGrid).toBeVisible();

  const openedValue = await page.evaluate((key) =>
    localStorage.getItem(`section_state_${key}`)
  , sectionKey);
  expect(openedValue).toBe('true');

  console.log(`section toggle open/close working for section: '${sectionKey}'`);
});
