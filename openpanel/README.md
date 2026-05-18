# Usage

1. Prepare OpenPanel server:
   ```bash
   bash <(curl -sSL [https://openpanel.org](https://raw.githubusercontent.com/stefanpejcic/openpanel-tests/refs/heads/main/openpanel/prepare.sh)) <LICENSE_KEY>
   ```
3. nano `/root/playwright-test/openpanel/.env`:
   ```bash
   BASE_URL=
   PANEL_USERNAME=
   PANEL_PASSWORD=
   ```
4. run:
   ```
   cd /root/playwright-test && npx playwright test -c openpanel/playwright.config.ts --project=tests --project=tests --ui
   ```
