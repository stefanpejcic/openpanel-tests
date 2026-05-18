

1. nano `/root/playwright-test/openpanel/.env`:
   ```bash
   BASE_URL=
   PANEL_USERNAME=
   PANEL_PASSWORD=
   ```
2. run:
   ```
   cd /root/playwright-test && npx playwright test -c openpanel/playwright.config.ts --project=tests --project=tests --ui
   ```
