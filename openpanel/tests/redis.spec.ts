import { test, expect } from '@playwright/test';


async function navigateToRedisLPage(page: any) {
  await page.goto(`/cache/redis`);
  await expect(page).toHaveURL(/cache\/redis/);
}
