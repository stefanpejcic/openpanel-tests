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

    // CONTAINER STATS
    await page.waitForResponse(response => response.url().includes(`/api/services?name=${service.name}`) && response.status() === 200);
    const statsContainer = page.locator('#service-page-stats');
    await expect(statsContainer.locator('span.font-medium').filter({ hasText: '--' })).toHaveCount(0, { timeout: 5000 });
    const getStat = (label) => statsContainer.locator('div', { hasText: label }).locator('span.font-medium').last();

    const statItems = statsContainer.locator('div.flex.items-center.justify-between');
    const count = await statItems.count();
    
    const stats = {};
    for (let i = 0; i < count; i++) {
      const item = statItems.nth(i);
      const label = await item.locator('span').first().innerText();
      const value = await item.locator('span').last().innerText();
      stats[label.trim()] = value.trim();
    }
    
    console.log('Collected stats:', stats); //TODO: remove
    
    const requiredKeys = ['ID', 'Name', 'CPU Usage', 'Memory Usage', 'Memory %', 'Network I/O', 'Block I/O', 'PIDs'];
    for (const key of requiredKeys) {
      expect(stats).toHaveProperty(key, expect.any(String));
    }
    
    await expect(getStat('Name')).toHaveText(service.name);
    
    const validations = {
      'ID':           { re: /^[a-f0-9]{12}$/,                    desc: '12 hex chars' },
      'CPU Usage':    { re: /^\d+\.\d+%$/,                       desc: 'percentage like 0.05%' },
      'Memory Usage': { re: /^\d+(\.\d+)?\w+\s*\/\s*\d+(\.\d+)?\w+$/, desc: 'bytes like 2.098MiB / 102.4MiB' },
      'Memory %':     { re: /^\d+\.\d+%$/,                       desc: 'percentage like 2.05%' },
      'Network I/O':  { re: /^\d+(\.\d+)?\w+\s*\/\s*\d+(\.\d+)?\w+$/, desc: 'bytes like 1.04kB / 126B' },
      'Block I/O':    { re: /^\d+(\.\d+)?\w+\s*\/\s*\d+(\.\d+)?\w+$/, desc: 'bytes like 147kB / 0B' },
      'PIDs':         { re: /^\d+$/,                             desc: 'integer like 10' },
    };
    
    for (const [label, { re, desc }] of Object.entries(validations)) {
      const value = stats[label];
      expect(re.test(value),`"${label}" value "${value}" should match ${desc}`).toBe(true);
    }  

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
