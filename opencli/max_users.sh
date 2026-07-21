#!/bin/bash
# defaults
PANEL_PASSWORD="testingpassword"
PLAN="Developer plus"

# stop thresholds
MIN_DISK_MB=1024   # stop when < 1GB free on /
MIN_RAM_MB=100     # stop when < 100MB free RAM

rand_user() { echo "test_$(tr -dc 'a-z0-9' </dev/urandom | head -c8)"; }

disk_free_mb() { df -BM --output=avail / | awk 'NR==2{gsub("M","");print $1}'; }
ram_free_mb() { free -m | awk '/^Mem:/{print $7}'; }   # $7 = available

echo "=== START ==="
echo "disk_free_mb=$(disk_free_mb) ram_free_mb=$(ram_free_mb)"

CREATED=()
START=$(date +%s)
i=0

while :; do
    DF=$(disk_free_mb); RF=$(ram_free_mb)
    if (( DF < MIN_DISK_MB )); then echo ">>> STOP: disk ${DF}MB < ${MIN_DISK_MB}MB"; break; fi
    if (( RF < MIN_RAM_MB )); then echo ">>> STOP: ram ${RF}MB < ${MIN_RAM_MB}MB"; break; fi

    i=$((i+1))
    U=$(rand_user)
    while opencli user-list 2>/dev/null | grep -qw "$U"; do U=$(rand_user); done

    if opencli user-add "$U" "$PANEL_PASSWORD" "$U@test.com" "$PLAN" >/dev/null 2>&1; then
        CREATED+=("$U")
        echo "[$i] created $U | disk_free=${DF}MB ram_free=${RF}MB"
    else
        echo "[$i] FAILED $U — stopping"; break
    fi
done

END=$(date +%s)
N=${#CREATED[@]}
echo "=== DONE ==="
echo "users_created=$N  time=$((END-START))s"
echo "disk_free_mb=$(disk_free_mb) ram_free_mb=$(ram_free_mb)"
(( N > 0 )) && echo "avg_disk_per_user_mb=$(( ( $(disk_free_mb) ) ))" # see note

printf '%s\n' "${CREATED[@]}" > /root/created_test_users.txt
echo "saved list -> /root/created_test_users.txt"
