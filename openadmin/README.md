# OpenAdmin tests

Playwright end-to-end tests for the OpenAdmin (admin) panel.

## Setup

1. Download the tests: `cd /root/playwright-test && git pull`
2. Add logins to `/root/playwright-test/openadmin/.env`:
   ```
   BASE_URL=
   PANEL_USERNAME=
   PANEL_PASSWORD=
   ```

## Run manually

```bash
cd /root/playwright-test && npx playwright test -c openadmin/playwright.config.ts --project=tests --ui
```

## Run headlessly (single worker)

This is what `run-tests.sh` and cron use — no `--ui`, since there's no
display available in cron. Always run this suite with a single worker;
running it in parallel hammers the shared test server and causes
contention-related failures that aren't real bugs.

```bash
cd /root/playwright-test && npx playwright test -c openadmin/playwright.config.ts --project=tests --workers=1
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

With `GITHUB_TOKEN` set, it also keeps a single [GitHub issue](https://github.com/stefanpejcic/openpanel-tests/issues)
in sync for this script: opens one the first time a run fails, updates
that same issue (with a "still failing" comment) on every subsequent
failing run instead of opening duplicates, and closes it with a comment
once a run passes again.

```bash
chmod +x /root/playwright-test/openadmin/run-tests.sh
```

Add to crontab (`crontab -e`) to run daily at 17:00:

```cron
0 17 * * * /root/playwright-test/openadmin/run-tests.sh >> /root/playwright-test/admin_cron.log 2>&1
```

Full logs, the Playwright HTML report, and the raw JSON results for each
run are kept under `/root/playwright-test/logs/` (not committed to git,
pruned after 30 days). The README below only ever shows the *latest* run.

**Note:** two tests in this suite (`reboot.spec.ts`, and the OpenAdmin
self-restart in `general_settings.spec.ts`) genuinely reboot/restart the
server. Expect a brief outage each time this suite runs.

## Automated Test Results

<!-- AUTOMATED-RESULTS:START -->
_No automated run yet — this section is filled in automatically by `run-tests.sh`._
<!-- AUTOMATED-RESULTS:END -->
