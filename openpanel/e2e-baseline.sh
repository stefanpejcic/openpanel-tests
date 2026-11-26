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

# the admin suite stops the FTP server and switches IMAP off and back on, a run killed in between
# (job timeout, cancel, daily reset) leaves them off and the ftp, api and webmail specs fail
if podman container exists openadmin_ftp 2>/dev/null && [ "$(podman inspect -f '{{.State.Running}}' openadmin_ftp 2>/dev/null)" != "true" ]; then
    echo "starting openadmin_ftp"
    (cd /root && podman-compose up -d openadmin_ftp >/dev/null 2>&1)
fi

MAILENV=/usr/local/mail/openmail/mailserver.env
if [ -f "$MAILENV" ] && grep -q '^ENABLE_IMAP=0$' "$MAILENV"; then
    echo "turning IMAP back on (webmail needs it) and recreating the mailserver"
    sed -i 's/^ENABLE_IMAP=0$/ENABLE_IMAP=1/' "$MAILENV"
    (
        cd /usr/local/mail/openmail/ || exit 0
        rc=$(podman ps --format '{{.Names}}' | grep -qx openadmin_roundcube && echo 1)
        podman-compose down roundcube mailserver >/dev/null 2>&1
        podman-compose up -d mailserver >/dev/null 2>&1
        if [ -n "$rc" ]; then podman-compose up -d roundcube >/dev/null 2>&1; fi
    )
    for _ in $(seq 1 60); do
        timeout 3 bash -c 'exec 3<>/dev/tcp/127.0.0.1/143; head -c 4 <&3' 2>/dev/null | grep -q OK && break
        sleep 5
    done
fi

# general_settings moves the user panel to 2084 and a custom proxy path, a run that dies before putting them back leaves the whole suite on ERR_CONNECTION_REFUSED
if [ "$(opencli proxy 2>/dev/null)" != "openpanel" ]; then
    echo "putting the /openpanel proxy path back"
    opencli proxy default --no-restart >/dev/null
fi
if [ "$(opencli port 2>/dev/null)" != "2083" ]; then
    echo "moving the user panel back to 2083"
    opencli port default --no-restart >/dev/null
    restart=2
fi

if [ "$restart" != 0 ]; then
    echo "restarting openpanel"
    # a port change only applies on recreate, podman restart keeps the old mapping
    if [ "$restart" = 2 ]; then
        (cd /root && podman-compose up -d --force-recreate openpanel >/dev/null 2>&1)
    else
        podman restart openpanel >/dev/null
    fi
    for _ in $(seq 1 60); do
        curl -sk -o /dev/null --max-time 3 https://127.0.0.1:2083/login && break
        sleep 2
    done
fi

echo "baseline ready"
