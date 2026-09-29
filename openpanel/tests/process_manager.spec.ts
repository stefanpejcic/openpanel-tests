import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

let killedPid: string;

test.describe('Process Manager', () => {

    test('loads process table with at least one row', async ({ page }) => {
        await page.goto('/process-manager');
        await page.waitForLoadState('networkidle');

        const rows = page.locator('tbody tr[x-show]');
        const count = await rows.count();

        expect(count).toBeGreaterThan(0);
    });

    test('kill a random process, expect toast and row removed', async ({ page }) => {
        await page.goto('/process-manager');
        await page.waitForLoadState('networkidle');

        const rows = page.locator('tbody tr[x-show]');
        const count = await rows.count();

        expect(count).toBeGreaterThan(0);

        let targetRow;
        let killedName = '';

        // Pick a random process that isn't PID 1
        for (let attempts = 0; attempts < 20; attempts++) {
            const targetIndex = Math.floor(Math.random() * count);
            const candidate = rows.nth(targetIndex);

            const pid = (
                await candidate.locator('td[data-sort-col="pid"]').innerText()
            ).trim();

            if (pid !== '1') {
                targetRow = candidate;
                killedPid = pid;

                killedName = (
                    await candidate.locator('td[data-sort-col="container"]').innerText()
                ).trim();

                break;
            }
        }

        expect(targetRow).toBeDefined();
        expect(killedPid).toBeTruthy();
        expect(killedPid).not.toBe('1');

        console.log(`Killing process: container=${killedName}, PID=${killedPid}`);

        const terminateBtn = targetRow!
            .getByRole('button', { name: 'Terminate' });

        const responsePromise = page.waitForResponse(
            response =>
                response.url().includes('/process-manager') &&
                response.request().method() === 'POST'
        );

        await terminateBtn.click();

        const response = await responsePromise;
        const body = await response.json();

        console.log('Kill response:', JSON.stringify(body));

        expect(body.success).toBe(true);

        // Confirm the exact PID disappeared from the current table
        const rowByPid = page.locator(
            `tbody tr[x-show] td[data-sort-col="pid"]`
        ).filter({
            hasText: new RegExp(`^${killedPid}$`)
        });

        await expect(rowByPid).toHaveCount(0);
    });

    test('refresh and confirm killed PID is absent', async ({ page }) => {
        await page.goto('/process-manager');
        await page.waitForLoadState('networkidle');

        await page.getByRole('link', { name: 'Refresh Processes' }).click();
        await page.waitForLoadState('networkidle');

        const allPids = await page
            .locator('tbody tr[x-show] td[data-sort-col="pid"]')
            .allInnerTexts();

        const normalizedPids = allPids.map(pid => pid.trim());

        console.log(`Killed PID: ${killedPid}`);
        console.log('Current PIDs:', normalizedPids);

        expect(normalizedPids).not.toContain(killedPid);
    });

    test('search filters rows correctly', async ({ page }) => {
        await page.goto('/process-manager');
        await page.waitForLoadState('networkidle');

        const rows = page.locator('tbody tr[x-show]');
        const firstRow = rows.first();

        const containerName = (
            await firstRow
                .locator('td[data-sort-col="container"]')
                .innerText()
        ).trim();

        const searchInput = page.locator(
            'section[aria-label="Processes Table"] input[type="search"]'
        );

        await searchInput.fill(containerName);

        // Wait for Alpine x-show filtering
        await page.waitForTimeout(300);

        const visibleRows = page.locator('tbody tr[x-show]:visible');
        const visibleCount = await visibleRows.count();

        expect(visibleCount).toBeGreaterThan(0);

        for (let i = 0; i < visibleCount; i++) {
            const row = visibleRows.nth(i);

            const container = (
                await row.locator('td[data-sort-col="container"]').innerText()
            ).trim();

            const pid = (
                await row.locator('td[data-sort-col="pid"]').innerText()
            ).trim();

            const cmd = (
                await row.locator('td[data-sort-col="cmd"]').innerText()
            ).trim();

            const matchesAny = [container, pid, cmd].some(value =>
                value.toLowerCase().includes(containerName.toLowerCase())
            );

            expect(matchesAny).toBe(true);
        }

        // Clear search and confirm more rows appear
        await searchInput.fill('');
        await page.waitForTimeout(300);

        const totalVisible = await page
            .locator('tbody tr[x-show]:visible')
            .count();

        expect(totalVisible).toBeGreaterThan(visibleCount);
    });

});
