import { test, expect } from '@playwright/test';

async function navigateToPage(page: any, service: string) {
  await page.goto(`/cache/${service}`);
  await expect(page).toHaveURL(new RegExp(`cache/${service}`));
}

// cache services
const services = [
  {
    name: 'redis',
    port: '6379',
  },
  {
    name: 'memcached',
    port: '11211',
  },
  {
    name: 'elasticsearch',
    port: '9200',
  },
  {
    name: 'opensearch',
    port: '9200',
  },
];

for (const service of services) {
  test(`${service.name} page`, async ({ page }) => {

    if (service.name === 'elasticsearch' || service.name === 'opensearch') {
      test.setTimeout(60_000); // 60s
    }
    
    await navigateToPage(page, service.name);

    // CHECK
    const statusText = page.locator('#service-page-status');
    await expect(statusText).toHaveText('Disabled');
    const redBars = page.locator('.bg-gray-400').first();
    const nameText = await page.locator('#service-page-name').textContent();
    expect(nameText?.toLowerCase()).toContain(service.name);
    await expect(page.locator('#service-page-port')).toHaveText(service.port);

    console.log(`${service.name} has correct data`);
  
    // ENABLE
    const enableBtn = page.locator('button', { hasText: 'Click to Enable' });
    await enableBtn.click();
    await expect(page.locator('text=is now enabled')).toBeVisible();

    if (service.name === 'elasticsearch' || service.name === 'opensearch') {
      await page.waitForTimeout(10000);
    } else {
      await page.waitForTimeout(5000);
    }
    
    await navigateToPage(page, service.name);
    await expect(statusText).toHaveText('Running');
    const greenBars = page.locator('.bg-emerald-500').first();
    await expect(greenBars).toBeVisible();
    console.log(`${service.name} is running`);

    // TODO: test connection

    // TODO: check usage data

    // LOGS
    await page.click('button:has-text("View container log")');
    await page.waitForResponse(response => response.url().includes(`/api/containers/log/${service.name}`) && response.status() === 200);
    const logContent = page.locator('#log-content');
    await expect(logContent).not.toHaveText('No logs.');
    await expect(logContent).not.toBeEmpty();
    console.log(`${service.name} logs are working`);

    // DISABLE
    const disableBtn = page.locator('button', { hasText: 'Click to Disable' });
    await disableBtn.click();
    await expect(page.locator('text=is now disabled')).toBeVisible();
    await expect(statusText).toHaveText('Disabled');
    await expect(redBars).toBeVisible();
    console.log(`${service.name} is disbaled`);

  });
}
