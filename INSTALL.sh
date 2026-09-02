#!/bin/bash

set -euo pipefail

# Must run as root — prevents ANY sudo/password prompts.
if [ "$EUID" -ne 0 ]; then
    echo "ERROR: This script must be run as root."
    exit 1
fi

export DEBIAN_FRONTEND=noninteractive
export DEBIAN_PRIORITY=critical
export NEEDRESTART_MODE=a
export CI=true
export npm_config_yes=true
export npm_config_update_notifier=false
export npm_config_fund=false
export npm_config_audit=false

APT_OPTS=(
    -y
    -o Dpkg::Options::=--force-confold
    -o Dpkg::Options::=--force-confdef
)

echo "=== Updating system ==="

apt-get update
apt-get upgrade "${APT_OPTS[@]}"

echo "=== Installing Ubuntu Desktop ==="

apt-get install "${APT_OPTS[@]}" ubuntu-desktop

echo "=== Installing XRDP ==="

apt-get install "${APT_OPTS[@]}" xrdp

systemctl enable xrdp
systemctl restart xrdp

# Never use adduser here — it can be interactive.
usermod -aG ssl-cert xrdp

echo "=== Configuring Polkit ==="

mkdir -p /etc/polkit-1/rules.d

cat > /etc/polkit-1/rules.d/45-allow-colord.rules <<'EOF'
polkit.addRule(function(action, subject) {
    if ((action.id == "org.freedesktop.color-manager.create-device" ||
         action.id == "org.freedesktop.color-manager.create-profile" ||
         action.id == "org.freedesktop.color-manager.delete-device" ||
         action.id == "org.freedesktop.color-manager.delete-profile" ||
         action.id == "org.freedesktop.color-manager.modify-device" ||
         action.id == "org.freedesktop.color-manager.modify-profile") &&
        subject.isInGroup("users")) {
        return polkit.Result.YES;
    }
});
EOF

mkdir -p /etc/polkit-1/localauthority/50-network-manager.d

cat > /etc/polkit-1/localauthority/50-network-manager.d/xrdp-color-manager.pkla <<'EOF'
[Allow colord for all users]
Identity=unix-user:*
Action=org.freedesktop.color-manager.create-device;org.freedesktop.color-manager.create-profile;org.freedesktop.color-manager.delete-device;org.freedesktop.color-manager.delete-profile;org.freedesktop.color-manager.modify-device;org.freedesktop.color-manager.modify-profile
ResultAny=yes
ResultInactive=yes
ResultActive=yes
EOF

echo "=== Disabling sleep / suspend ==="

systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target

# These may fail when executed outside a graphical session.
# Do NOT make the entire setup fail because of that.
if command -v gsettings >/dev/null 2>&1; then
    gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-ac-type 'nothing' || true
    gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-battery-type 'nothing' || true
    gsettings set org.gnome.desktop.session idle-delay 0 || true
    gsettings set org.gnome.desktop.screensaver lock-enabled false || true
    gsettings set org.gnome.desktop.screensaver idle-activation-enabled false || true
fi

echo "=== Installing Node.js 20 ==="

curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

apt-get install "${APT_OPTS[@]}" nodejs git

echo "=== Setting up Playwright ==="

mkdir -p /root/playwright-test

if [ ! -d "/root/playwright-test/.git" ]; then
    rm -rf /root/playwright-test
    git clone --branch main --single-branch \
        https://github.com/stefanpejcic/openpanel-tests.git \
        /root/playwright-test
fi

cd /root/playwright-test

# npm init is explicitly non-interactive.
if [ ! -f package.json ]; then
    npm init -y
fi

npm install --yes @playwright/test
npm install --yes dotenv basic-ftp otplib

# Playwright itself is non-interactive.
npx --yes playwright install --with-deps

echo "=== Configuring cron ==="

CRON_JOB="0 3 * * * bash /root/playwright-test/opencli/os_install.sh"

# Install the cron entry without opening an editor or prompting.
CURRENT_CRON="$(crontab -l 2>/dev/null || true)"

if ! printf '%s\n' "$CURRENT_CRON" | grep -Fqx "$CRON_JOB"; then
    printf '%s\n' "$CURRENT_CRON" "$CRON_JOB" | crontab -
fi

echo
echo "================================"
echo "      Setup Complete"
echo "================================"
echo
echo "Next steps:"
echo "1. Reboot the machine: reboot"
echo "2. RDP into the server using your Ubuntu username/password."
echo "3. Open a terminal inside the RDP session."
echo "4. Create:"
echo "   /root/playwright-test/openpanel/.env"
echo "   /root/playwright-test/openadmin/.env"
echo "5. Edit:"
echo "   /root/playwright-test/opencli/os_install.sh"
echo "6. Run tests as described in the README files."
