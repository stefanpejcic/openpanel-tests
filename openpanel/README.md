# OpenPanel tests

Playwright end-to-end tests for the OpenPanel (user) panel.

## Prepare OpenPanel server

1. Install/update OpenPanel on the server: `bash <(curl -sSL https://openpanel.org)` | `opencli update --beta`
2. On the OpenPanel server run:

   ```bash
   bash <(curl -sSL https://raw.githubusercontent.com/stefanpejcic/openpanel-tests/refs/heads/main/openpanel/prepare.sh)
   ```

## Prepare Playwright tests

1. Download all tests: `cd /root/playwright-test && git pull`
2. Add logins to `/root/playwright-test/openpanel/.env`:
   ```
   BASE_URL=
   PANEL_USERNAME=
   PANEL_PASSWORD=
   ```

## Run manually

```bash
cd /root/playwright-test && npx playwright test -c openpanel/playwright.config.ts --project=tests --ui
```

## Run headlessly (single worker)

This is what `run-tests.sh` and cron use — no `--ui`, since there's no
display available in cron. Always run this suite with a single worker;
running it in parallel hammers the shared test server and causes
contention-related failures that aren't real bugs.

```bash
cd /root/playwright-test && npx playwright test -c openpanel/playwright.config.ts --project=tests --workers=1
```

## Automated daily runs (cron)

`run-tests.sh` runs the suite headlessly on a single worker, writes a
results table into this README (below), and commits + pushes it so the
latest run is visible on git without needing to log into the server.

Pushing requires `GITHUB_TOKEN` (a token with write access to this repo).
Copy `/root/playwright-test/.env.template` to `/root/playwright-test/.env`
and fill it in — this is the same file `opencli/os_install.sh` reads. If
`GITHUB_TOKEN` isn't set, the script still commits locally, it just skips
the push.

```bash
chmod +x /root/playwright-test/openpanel/run-tests.sh
```

Add to crontab (`crontab -e`) to run daily at 22:00:

```cron
0 22 * * * /root/playwright-test/openpanel/run-tests.sh
```

Full logs, the Playwright HTML report, and the raw JSON results for each
run are kept under `/root/playwright-test/logs/` (not committed to git,
pruned after 30 days). The README below only ever shows the *latest* run.

## Automated Test Results

<!-- AUTOMATED-RESULTS:START -->
_No automated run yet — this section is filled in automatically by `run-tests.sh`._
<!-- AUTOMATED-RESULTS:END -->
