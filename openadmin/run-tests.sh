#!/bin/bash
#
# Runs the OpenAdmin (admin panel) Playwright suite headlessly, on a single
# worker, updates this folder's README.md with a results table, and pushes
# that to git so results can be checked online.
#
# Meant to be invoked from cron on the test runner, e.g.:
#   0 17 * * * /root/playwright-test/openadmin/run-tests.sh
#
# Can also be run manually:
#   ./run-tests.sh

set -uo pipefail

LABEL="OpenAdmin"

# cron runs with a minimal PATH -- make sure node/npx/git are findable.
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"

PROJECT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
REPO_DIR="$(dirname "$PROJECT_DIR")"
LOG_DIR="$REPO_DIR/logs"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
LOG_FILE="$LOG_DIR/openadmin-${TIMESTAMP}.log"
JSON_FILE="$LOG_DIR/openadmin-latest.json"
README="$PROJECT_DIR/README.md"

mkdir -p "$LOG_DIR"
cd "$REPO_DIR" || { echo "Cannot cd to $REPO_DIR" >&2; exit 1; }

# keep each run's HTML report separate instead of overwriting the last one
export PLAYWRIGHT_HTML_REPORT="$LOG_DIR/html-report-openadmin-${TIMESTAMP}"
export PLAYWRIGHT_HTML_OPEN=never
export PLAYWRIGHT_JSON_OUTPUT_NAME="$JSON_FILE"

{
  echo "=== $LABEL tests starting at $(date) ==="

  npx playwright test -c openadmin/playwright.config.ts --project=tests --workers=1 --reporter=list,html,json
  TEST_STATUS=$?

  echo "=== $LABEL tests finished at $(date) with exit code $TEST_STATUS ==="
  echo "=== HTML report: $PLAYWRIGHT_HTML_REPORT ==="
} >>"$LOG_FILE" 2>&1

# build the results table into README.md, regardless of pass/fail
node "$REPO_DIR/scripts/build-report.js" "$JSON_FILE" "$README" "$LABEL" >>"$LOG_FILE" 2>&1

# commit and push the updated README so results are visible on git
if ! git diff --quiet -- "$README"; then
  {
    git add "$README"
    git commit -m "Automated $LABEL test run: $(date +%Y-%m-%d\ %H:%M)"
    git pull --rebase --autostash
    git push
  } >>"$LOG_FILE" 2>&1
fi

# prune logs/reports older than 30 days so this doesn't grow forever
find "$LOG_DIR" -maxdepth 1 \( -name 'openadmin-*.log' -o -name 'html-report-openadmin-*' \) -mtime +30 -exec rm -rf {} +

exit "$TEST_STATUS"
