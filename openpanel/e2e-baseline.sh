#!/bin/bash
#
# Puts the shared E2E box back into the state the suites expect, run over SSH
# before a suite starts:
#   ssh root@box "PANEL_USERNAME=... PANEL_PASSWORD=... bash -s" < e2e-baseline.sh
#
# The admin suite turns modules off and recreates accounts, so whatever it
# leaves behind must not decide whether the user panel suite passes.
#   - every module of the default feature set is enabled (missing ones added, nothing turned off)
#   - the test account is on the "Developer plus" plan, created when it's missing and a password was given

set -u

CONF=/etc/openpanel/openpanel/conf/openpanel.config
FEATURES=/etc/openpanel/openpanel/features/default.txt
PLAN="Developer plus"
USER_NAME="${PANEL_USERNAME:-testinguser}"
restart=0

if [ -s "$FEATURES" ] && [ -f "$CONF" ]; then
    current=$(grep -oP '^enabled_modules="?\K[^"]*' "$CONF" | head -1)
    merged="$current"
    while read -r mod; do
        mod=$(echo "$mod" | tr -d '[:space:],')
        [ -z "$mod" ] && continue
        case ",$merged," in
            *",$mod,"*) ;;
            *) merged="${merged:+$merged,}$mod"; echo "enabling module $mod" ;;
        esac
    done < <(tr ',' '\n' < "$FEATURES")
    if [ "$merged" != "$current" ]; then
        sed -i "s|^enabled_modules=.*|enabled_modules=\"$merged\"|" "$CONF"
        restart=1
    fi
fi

if opencli user-list --json 2>/dev/null | grep -q "\"username\": *\"$USER_NAME\""; then
    plan=$(opencli user-list --json 2>/dev/null | python3 -c "import sys,json; print(next((u['package']['name'] for u in json.load(sys.stdin)['data'] if u['username']=='$USER_NAME'), ''))" 2>/dev/null)
    if [ "$plan" != "$PLAN" ]; then
        echo "moving $USER_NAME from '$plan' to '$PLAN'"
        opencli user-change_plan "$USER_NAME" "$PLAN"
    fi
elif [ -n "${PANEL_PASSWORD:-}" ]; then
    echo "creating $USER_NAME on '$PLAN'"
    opencli user-add "$USER_NAME" "$PANEL_PASSWORD" "$USER_NAME@example.com" "$PLAN"
else
    echo "$USER_NAME doesn't exist and no password was given, the suite's setup has to create it"
fi

if [ "$restart" = 1 ]; then
    echo "restarting openpanel for the module changes"
    podman restart openpanel >/dev/null
    for _ in $(seq 1 60); do
        curl -sk -o /dev/null --max-time 3 https://127.0.0.1:2083/login && break
        sleep 2
    done
fi

echo "baseline ready"
