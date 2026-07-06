#!/bin/bash
################################################################################
# OpenAdmin API smoke test
# Tests every endpoint 1 by 1, prints PASS/FAIL per route, summary at the end.
#
# Usage:
#   ./api_test.sh                          # safe (read-only) tests only
#   RUN_WRITE_TESTS=1 ./api_test.sh        # also run create/edit tests
#
# Config via env vars or edit below.
################################################################################

BASE_URL="${BASE_URL:-$(opencli admin | grep -oE 'https://[^ ]+' | head -n1)}"
ADMIN_USER="${ADMIN_USER:-}"
ADMIN_PASS="${ADMIN_PASS:-}"
RUN_WRITE_TESTS="${RUN_WRITE_TESTS:-0}"

# Test fixtures (used only when RUN_WRITE_TESTS=1)
TEST_USER="apitest_$(date +%s)"
TEST_DOMAIN="apitest-$(date +%s).com"
TEST_PLAN="Standard plan"

PASS=0; FAIL=0; SKIP=0
FAILED_ROUTES=()

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[0;33m'; NC='\033[0m'

if [ -z "$ADMIN_PASS" ]; then
    read -rsp "Admin password for $ADMIN_USER: " ADMIN_PASS
    echo
fi


################################################################################
# Helpers
################################################################################

# test_api <method> <path> <expected_status(es)> [json_body]
test_api() {
    local method="$1" path="$2" expected="$3" body="$4"
    local args=(-s -o /tmp/api_test_body.json -w "%{http_code}" -X "$method"
                -H "Authorization: Bearer $TOKEN"
                --max-time 30
                "$BASE_URL$path")
    [ -n "$body" ] && args+=(-H "Content-Type: application/json" -d "$body")

    local code
    code=$(curl "${args[@]}")

    if [[ ",$expected," == *",$code,"* ]]; then
        printf "${GREEN}PASS${NC} [%s] %-55s -> %s\n" "$method" "$path" "$code"
        PASS=$((PASS+1))
    else
        printf "${RED}FAIL${NC} [%s] %-55s -> %s (expected %s)\n" "$method" "$path" "$code" "$expected"
        head -c 300 /tmp/api_test_body.json; echo
        FAIL=$((FAIL+1))
        FAILED_ROUTES+=("[$method] $path -> $code")
    fi
}

skip() {
    printf "${YELLOW}SKIP${NC} [%s] %-55s (%s)\n" "$1" "$2" "$3"
    SKIP=$((SKIP+1))
}

################################################################################
# 0. Auth
################################################################################
echo "== Authenticating =="
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/")
echo "GET /api/ -> $STATUS_CODE"

TOKEN=$(curl -s -X POST "$BASE_URL/api/" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}" \
    | grep -o '"access_token"[: ]*"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/')

if [ -z "$TOKEN" ]; then
    echo -e "${RED}Could not obtain token — aborting.${NC}"
    exit 1
fi
echo "Token obtained (${#TOKEN} chars)"
echo

################################################################################
# 1. Read-only GET endpoints (always safe)
################################################################################
echo "== Read-only endpoints =="
test_api GET  "/api/whoami"                       200
test_api GET  "/api/users"                        200
test_api GET  "/api/domains"                      200
test_api GET  "/api/plans"                        200
test_api GET  "/api/plans/1"                      "200,404"
test_api GET  "/api/services"                     200
test_api GET  "/api/services/status"              200
test_api GET  "/api/docker/info"                  200
test_api GET  "/api/ips"                          200
test_api GET  "/api/system"                       200
test_api GET  "/api/usage/cpu"                    200
test_api GET  "/api/usage/memory"                 200
test_api GET  "/api/usage/server"                 200
test_api GET  "/api/usage/disk"                   200
test_api GET  "/api/notifications"                200
test_api GET  "/api/dns/cluster"                  200
test_api GET  "/api/dns/zone-templates"           200
test_api GET  "/api/domains/file-templates"       200
test_api GET  "/api/emails/settings"              200
test_api GET  "/api/emails/accounts"              200
test_api GET  "/api/emails/queue"                 200
test_api GET  "/api/emails/domain-limits"         200
test_api GET  "/api/security/basic-auth"          200
test_api GET  "/api/security/blacklist-useragents" 200
test_api GET  "/api/security/firewall"            200
test_api GET  "/api/security/waf"                 200
test_api GET  "/api/security/waf/rules"           200
test_api GET  "/api/security/2fa"                 200
test_api GET  "/api/security/passkeys"            200
test_api GET  "/api/server/crons"                 200
test_api GET  "/api/server/ssh"                   200
test_api GET  "/api/server/ssh/config"            200
test_api GET  "/api/server/timezone"              200
test_api GET  "/api/server/processes?sort=memory" 200
test_api GET  "/api/server/node"                  200
test_api GET  "/api/server/reboot/status"         200
test_api GET  "/api/server/migrate"               200
test_api GET  "/api/settings/administrators"      200
test_api GET  "/api/settings/resellers"           200
test_api GET  "/api/settings/general"             200
test_api GET  "/api/settings/defaults"            200
test_api GET  "/api/settings/defaults/files"      200
test_api GET  "/api/settings/features"            200
test_api GET  "/api/settings/features/default"    200
test_api GET  "/api/settings/locales"             200
test_api GET  "/api/settings/modules"             200
test_api GET  "/api/settings/custom-code"         200
test_api GET  "/api/settings/php"                 200
test_api GET  "/api/settings/caddy/metrics"       200
test_api GET  "/api/settings/updates"             200
test_api GET  "/api/settings/updates/tags"        200
test_api GET  "/api/settings/notifications"       200
test_api GET  "/api/license"                      200
test_api GET  "/api/license/info"                 200
test_api GET  "/api/support/report"               200
test_api GET  "/api/import/cpanel"                200
test_api GET  "/api/import/backup-files"          200
test_api GET  "/api/import/transfers"             200
echo

################################################################################
# 2. Auth negative test (no token should be rejected)
################################################################################
echo "== Auth checks =="
NOAUTH=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/whoami")
if [[ "$NOAUTH" == "401" || "$NOAUTH" == "403" ]]; then
    printf "${GREEN}PASS${NC} [GET] %-55s -> %s (rejected without token)\n" "/api/whoami (no auth)" "$NOAUTH"
    PASS=$((PASS+1))
else
    printf "${RED}FAIL${NC} [GET] %-55s -> %s (should be 401/403!)\n" "/api/whoami (no auth)" "$NOAUTH"
    FAIL=$((FAIL+1))
    FAILED_ROUTES+=("[GET] /api/whoami without token -> $NOAUTH")
fi
echo

################################################################################
# 3. Write tests — full lifecycle with a throwaway user/domain
#    Only runs with RUN_WRITE_TESTS=1
################################################################################
if [ "$RUN_WRITE_TESTS" == "1" ]; then


# PREPARATIONS
    #echo "== Preparing server.. =="
    #opencli email-server installl && opencli email-server start
    # todo: bind and ftp

    echo "== Write tests (user: $TEST_USER, domain: $TEST_DOMAIN) =="

    # User lifecycle
    test_api POST "/api/users" "200,201" \
        "{\"email\":\"$TEST_USER@example.com\",\"username\":\"$TEST_USER\",\"password\":\"Test_$(date +%s)!\",\"plan_name\":\"$TEST_PLAN\"}"

    # Domain lifecycle
    test_api POST "/api/domains/new" "200,201" \
        "{\"username\":\"$TEST_USER\",\"domain\":\"$TEST_DOMAIN\",\"docroot\":\"/var/www/html/$TEST_DOMAIN\"}"
    test_api GET  "/api/domains/docroot/$TEST_DOMAIN"       200
    test_api GET  "/api/domains/$TEST_DOMAIN/dns"           200
    test_api GET  "/api/domains/$TEST_DOMAIN/caddy"         200
    test_api GET  "/api/domains/$TEST_DOMAIN/vhost/$TEST_USER" 200
    test_api GET  "/api/domains/$TEST_DOMAIN/ssl"           200
    test_api GET  "/api/domains/$TEST_DOMAIN/log"           "200,404"
    test_api POST "/api/domains/suspend/$TEST_DOMAIN"       200
    test_api POST "/api/domains/unsuspend/$TEST_DOMAIN"     200
    test_api POST "/api/domains/delete/$TEST_DOMAIN"        200

    # Containers for the test user
    test_api GET  "/api/users/$TEST_USER/containers"        200

    # Plan lifecycle
    test_api POST "/api/plans" "200,201" \
        '{"name":"apitest_plan","description":"test","email_limit":"1","ftp_limit":"1","domains_limit":"1","websites_limit":"1","disk_limit":"1000","inodes_limit":"10000","db_limit":"1","cpu":"1","ram":"1","bandwidth":"10","feature_set":"default"}'
    # NOTE: fetch id of apitest_plan and DELETE it manually, or add jq parsing here

    # Cleanup: delete the test user (adjust to your actual user-delete route)
    test_api DELETE "/api/users" "200,204,404,405" "{\"username\":\"$TEST_USER\"}"
    echo
else
    skip "POST" "/api/users, /api/domains/*, /api/plans ..." "set RUN_WRITE_TESTS=1 to enable"
    echo
fi

################################################################################
# Deliberately never tested (destructive):
#   /api/server/reboot, /api/server/root-password,
#   /api/security/disable-admin, /api/server/memory/drop-*,
#   /api/settings/updates/now, /api/server/processes/<pid>/kill
################################################################################

################################################################################
# Summary
################################################################################
echo "======================================"
echo -e "  ${GREEN}PASS: $PASS${NC}   ${RED}FAIL: $FAIL${NC}   ${YELLOW}SKIP: $SKIP${NC}"
echo "======================================"
if [ ${#FAILED_ROUTES[@]} -gt 0 ]; then
    echo "Failed routes:"
    printf '  %s\n' "${FAILED_ROUTES[@]}"
    exit 1
fi
exit 0
