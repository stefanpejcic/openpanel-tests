#!/bin/bash
################################################################################
# Disk and inode quota test
#
# Checks that an account's plan limits (disk + inodes) count, and stop, every
# file in its home, including the ones its rootless containers write as subuids
# (mysql/postgres/mongodb data, files made by PHP or the webserver):
# https://github.com/stefanpejcic/OpenPanel/discussions/1370
#
# Run as root ON the OpenPanel server, not on the playwright server:
#   bash opencli/quota.sh                     # tests testinguser
#   QUOTA_USER=someuser bash opencli/quota.sh
#
# The account's limits are lowered for a moment to test that writes over them
# fail, and put back from its plan with 'opencli user-quota --update' at the
# end (also on Ctrl+C). Test files go in <home>/.quota-test-* and are removed.
#
# With project quotas off (user quotas only) the subuid checks FAIL, that's the
# bug from the discussion. Turn them on with: opencli user-quota --enable-project
# XFS answers a write over a project quota with "No space left on device", ext4 with "Disk quota exceeded".
################################################################################

U="${QUOTA_USER:-testinguser}"
DB_CNF=/etc/my.cnf
DB_NAME=panel

PASS=0; FAIL=0; SKIP=0
FAILED=()
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[0;33m'; NC='\033[0m'

pass() { echo -e "  ${GREEN}PASS${NC} $1"; PASS=$((PASS+1)); }
fail() { echo -e "  ${RED}FAIL${NC} $1"; FAIL=$((FAIL+1)); FAILED+=("$1"); }
skip() { echo -e "  ${YELLOW}SKIP${NC} $1"; SKIP=$((SKIP+1)); }
check() { local name="$1"; shift; if "$@"; then pass "$name"; else fail "$name"; fi; }

[ "$(id -u)" = "0" ] || { echo "Run as root on the OpenPanel server."; exit 1; }
command -v opencli >/dev/null || { echo "opencli not found, run this on the OpenPanel server."; exit 1; }
id "$U" >/dev/null 2>&1 || { echo "User $U does not exist, set QUOTA_USER."; exit 1; }

UID_N=$(id -u "$U")
HOME_DIR="/home/$U"
SUBUID_BASE=$(awk -F: -v u="$U" '$1 == u {print $2}' /etc/subuid)
[ -n "$SUBUID_BASE" ] || { echo "$U has no /etc/subuid range, not an OpenPanel account?"; exit 1; }
# www-data (33) inside the containers, what php-fpm and apache write as
SUB_WWW=$((SUBUID_BASE + 32))
TEST_DIR="$HOME_DIR/.quota-test-$$"
SOCK="unix:///run/user/$UID_N/podman/podman.sock"
REPORT=/etc/openpanel/openpanel/quota_report.json

pm() { (cd /tmp && timeout 60 podman --url "$SOCK" "$@"); }

# used/soft/hard for the account from quota_report.json: field name
report_field() {
    opencli user-quota >/dev/null 2>&1
    jq -r --arg u "$U" --arg f "$1" '.users[] | select(.username == $u) | .[$f]' "$REPORT" 2>/dev/null
}

# hard block and inode limit of one id from repquota: -u|-P #id
limits() {
    repquota "$1" -n / 2>/dev/null | awk -v id="$2" '$1 == id {
        i = ($2 ~ /^\+/) ? 7 : 6           # a grace column follows the block limits when over the soft one
        print $5, $(i + 2) }'
}

# back to the plan's limits, before anything reads the report (it emails the user when close to the limit)
plan_limits() { opencli user-quota --update "$U" >/dev/null 2>&1; }

PROJECT=0
quotaon -pP / 2>/dev/null | grep -q "^project quota on / .* is on" && PROJECT=1

# lowers the limits on what the account's files count against right now
set_limit() { # blocks inodes
    setquota -u "$U" "$1" "$1" "$2" "$2" / 2>/dev/null
    [ "$PROJECT" = 1 ] && setquota -P "$UID_N" "$1" "$1" "$2" "$2" / 2>/dev/null
}

cleanup() {
    rm -rf "$TEST_DIR"
    [ -n "$DB_C" ] && pm exec "$DB_C" rm -f "$DB_DIR/.quota-test-$$" >/dev/null 2>&1
    plan_limits
}
trap cleanup EXIT
trap 'exit 130' INT TERM

echo "== Quota test for $U (uid $UID_N, subuids from $SUBUID_BASE) =="
echo "Project quotas: $([ "$PROJECT" = 1 ] && echo on || echo off)"
echo

################################################################################
echo "== 1. Quotas on / =="
check "user quota is on for /" bash -c 'quotaon -pu / 2>/dev/null | grep -q "^user quota on / .* is on"'
if [ "$PROJECT" = 1 ]; then
    pass "project quota is on for /"
else
    fail "project quota is on for / (run: opencli user-quota --enable-project, then reboot)"
fi
echo

################################################################################
echo "== 2. Plan limits applied by opencli user-quota --update =="
read -r PLAN_DISK PLAN_INODES < <(mariadb --defaults-extra-file="$DB_CNF" -D "$DB_NAME" -N -B -e \
    "SELECT REPLACE(p.disk_limit, ' GB', ''), p.inodes_limit FROM users u JOIN plans p ON u.plan_id = p.id WHERE u.username = '$U'" 2>/dev/null)
OUT=$(opencli user-quota --update "$U" 2>&1)
check "opencli user-quota --update $U exits 0" test $? -eq 0
echo "$OUT" | grep -q "Quota set for user $U" && echo "     $(echo "$OUT" | grep "Quota set for user $U" | sed 's/^\[[^]]*\] //')"
if [ -n "$PLAN_DISK" ]; then
    WANT_BLOCKS=$((PLAN_DISK * 1024000))
    check "disk limit in the report is the plan's ${PLAN_DISK} GB ($WANT_BLOCKS blocks)" test "$(report_field disk_hard)" = "$WANT_BLOCKS"
    check "inode limit in the report is the plan's $PLAN_INODES" test "$(report_field inodes_hard)" = "$PLAN_INODES"
    check "user quota of uid $UID_N has the same limits" test "$(limits -u "#$UID_N")" = "$WANT_BLOCKS $PLAN_INODES"
    if [ "$PROJECT" = 1 ]; then
        check "project $UID_N has the same limits" test "$(limits -P "#$UID_N")" = "$WANT_BLOCKS $PLAN_INODES"
    fi
else
    skip "plan limits (no plan found in the database for $U)"
fi
echo

################################################################################
echo "== 3. Every file in the home is on the account's project =="
if [ "$PROJECT" = 1 ]; then
    check "$HOME_DIR is on project $UID_N and passes it on" bash -c "lsattr -pd '$HOME_DIR' | awk '{exit !(\$1 == $UID_N && \$2 ~ /P/)}'"
    UNTAGGED=$(find "$HOME_DIR" -xdev \( -type f -o -type d \) -print0 2>/dev/null | xargs -0 -r lsattr -pd 2>/dev/null | awk -v id="$UID_N" '$1 != id' | wc -l)
    check "no files or folders in $HOME_DIR on another project ($UNTAGGED found)" test "$UNTAGGED" -eq 0
else
    skip "project tagging (project quotas off)"
fi
echo

################################################################################
echo "== 4. Usage in the report matches what is on disk =="
DU_KB=$(du -skx "$HOME_DIR" 2>/dev/null | awk '{print $1}')
NOT_OWN=$(find "$HOME_DIR" -xdev ! -uid "$UID_N" 2>/dev/null | wc -l)
USED_KB=$(report_field disk_used)
echo "     du: ${DU_KB} KiB, report: ${USED_KB} KiB, files not owned by uid $UID_N: $NOT_OWN"
# du and the quota count a few blocks differently (sockets, links, sparse files), 90% is close enough
check "report counts at least 90% of what du sees in $HOME_DIR" test "$((USED_KB * 100))" -ge "$((DU_KB * 90))"
echo

################################################################################
echo "== 5. Files written as a container subuid are counted =="
mkdir -p "$TEST_DIR/www" "$TEST_DIR/own" && chown "$SUB_WWW:$SUB_WWW" "$TEST_DIR/www" && chown "$UID_N:$UID_N" "$TEST_DIR/own"
BEFORE=$(report_field disk_used)
setpriv --reuid="$SUB_WWW" --regid="$SUB_WWW" --clear-groups dd if=/dev/zero of="$TEST_DIR/www/20M" bs=1M count=20 conv=fsync status=none
AFTER=$(report_field disk_used)
echo "     disk_used before: $BEFORE KiB, after 20 MiB as uid $SUB_WWW (www-data): $AFTER KiB"
check "20 MiB written by www-data's subuid is counted" test "$((AFTER - BEFORE))" -ge 19000
if [ "$PROJECT" = 1 ]; then
    check "the new file got project $UID_N" bash -c "lsattr -p '$TEST_DIR/www/20M' | awk '{exit !(\$1 == $UID_N)}'"
fi
rm -f "$TEST_DIR/www/20M"
echo

################################################################################
echo "== 6. Writes over the disk limit fail, whichever uid writes =="
sync; USED=$(report_field disk_used); IUSED=$(report_field inodes_used)
set_limit "$((USED + 10240))" "$((IUSED + 1000))"
OUT=$(setpriv --reuid="$SUB_WWW" --regid="$SUB_WWW" --clear-groups dd if=/dev/zero of="$TEST_DIR/www/big" bs=1M count=40 conv=fsync 2>&1)
check "40 MiB as www-data's subuid with 10 MiB left fails with 'Disk quota exceeded'" bash -c "echo \"\$1\" | grep -qE 'Disk quota exceeded|No space left on device'" _ "$OUT"
rm -f "$TEST_DIR/www/big"
OUT=$(setpriv --reuid="$UID_N" --regid="$UID_N" --clear-groups dd if=/dev/zero of="$TEST_DIR/own/big" bs=1M count=40 conv=fsync 2>&1)
check "40 MiB as the account's own uid with 10 MiB left fails too" bash -c "echo \"\$1\" | grep -qE 'Disk quota exceeded|No space left on device'" _ "$OUT"
rm -f "$TEST_DIR/own/big"
echo

################################################################################
echo "== 7. Creating files over the inode limit fails =="
plan_limits
sync; USED=$(report_field disk_used); IUSED=$(report_field inodes_used)
set_limit "$((USED + 102400))" "$((IUSED + 50))"
OUT=$(setpriv --reuid="$SUB_WWW" --regid="$SUB_WWW" --clear-groups bash -c "for i in \$(seq 1 200); do : > '$TEST_DIR/www/f'\$i || exit 1; done" 2>&1)
check "200 files as www-data's subuid with 50 inodes left fails with 'Disk quota exceeded'" bash -c "echo \"\$1\" | grep -qE 'Disk quota exceeded|No space left on device'" _ "$OUT"
rm -rf "$TEST_DIR/www"/f*
echo

################################################################################
echo "== 8. A database container writing its own data =="
DB_C=""; DB_DIR=""; DB_USER=""
for spec in mysql:mysql:/var/lib/mysql mariadb:mysql:/var/lib/mysql postgres:postgres:/var/lib/postgresql/data mongodb:mongodb:/data/db; do
    IFS=: read -r c usr dir <<<"$spec"
    if [ "$(pm inspect -f '{{.State.Running}}' "$c" 2>/dev/null)" = "true" ]; then DB_C=$c; DB_USER=$usr; DB_DIR=$dir; break; fi
done
if [ -z "$DB_C" ]; then
    skip "no mysql, mariadb, postgres or mongodb container running for $U"
else
    echo "     using $DB_C, writing to $DB_DIR as $DB_USER"
    plan_limits
    BEFORE=$(report_field disk_used)
    pm exec -u "$DB_USER" "$DB_C" dd if=/dev/zero of="$DB_DIR/.quota-test-$$" bs=1M count=20 conv=fsync >/dev/null 2>&1
    AFTER=$(report_field disk_used)
    echo "     disk_used before: $BEFORE KiB, after 20 MiB from $DB_C: $AFTER KiB"
    check "20 MiB written by $DB_C ($DB_USER) is counted" test "$((AFTER - BEFORE))" -ge 19000
    pm exec "$DB_C" rm -f "$DB_DIR/.quota-test-$$" >/dev/null 2>&1
    sync; USED=$(report_field disk_used); IUSED=$(report_field inodes_used)
    set_limit "$((USED + 10240))" "$((IUSED + 1000))"
    OUT=$(pm exec -u "$DB_USER" "$DB_C" dd if=/dev/zero of="$DB_DIR/.quota-test-$$" bs=1M count=40 conv=fsync 2>&1)
    check "40 MiB from $DB_C with 10 MiB left fails with 'Disk quota exceeded'" bash -c "echo \"\$1\" | grep -qiE 'quota exceeded|No space left on device'" _ "$OUT"
    pm exec "$DB_C" rm -f "$DB_DIR/.quota-test-$$" >/dev/null 2>&1
fi
echo

################################################################################
echo "== 9. Limits are back to the plan =="
rm -rf "$TEST_DIR"
plan_limits
if [ -n "$PLAN_DISK" ]; then
    check "disk limit is the plan's again" test "$(report_field disk_hard)" = "$((PLAN_DISK * 1024000))"
    check "inode limit is the plan's again" test "$(report_field inodes_hard)" = "$PLAN_INODES"
else
    skip "plan limits (no plan found)"
fi
echo

echo "======================================"
echo -e "  ${GREEN}PASS: $PASS${NC}   ${RED}FAIL: $FAIL${NC}   ${YELLOW}SKIP: $SKIP${NC}"
echo "======================================"
if [ ${#FAILED[@]} -gt 0 ]; then
    echo "Failed:"
    printf '  %s\n' "${FAILED[@]}"
    exit 1
fi
exit 0
