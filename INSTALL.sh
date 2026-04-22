#!/bin/bash
sudo apt update && sudo apt upgrade -y

sudo apt install ubuntu-desktop -y

sudo apt install xrdp -y
sudo systemctl enable xrdp
sudo adduser xrdp ssl-cert

sudo tee /etc/polkit-1/rules.d/45-allow-colord.rules <<EOF
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

sudo tee /etc/polkit-1/localauthority/50-network-manager.d/xrdp-color-manager.pkla <<EOF
[Allow colord for all users]
Identity=unix-user:*
Action=org.freedesktop.color-manager.create-device;org.freedesktop.color-manager.create-profile;org.freedesktop.color-manager.delete-device;org.freedesktop.color-manager.delete-profile;org.freedesktop.color-manager.modify-device;org.freedesktop.color-manager.modify-profile
ResultAny=no
ResultInactive=no
ResultActive=yes
EOF

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

mkdir -p ~/playwright-test
git clone https://github.com/stefanpejcic/openpanel-tests/  ~/playwright-test

cd ~/playwright-test
npm init -y
npx playwright install --with-deps
npm install @playwright/test

if [ -d "node_modules/@playwright/test" ]; then
  echo "--- Setup Complete ---"
  echo "1. Reboot your machine: sudo reboot"
  echo "2. RDP into the server using your Ubuntu username/password."
  echo "3. Open a terminal inside the RDP session."
  echo "4. Run: cd ~/playwright-test && npx playwright test --ui"
else
  echo "Install failed!"
fi
