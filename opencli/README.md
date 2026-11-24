# Usage

## OS Install tests
Run on playwright server, edit the info on beginning of the file and run the test.
```
bash opencli/os_install.sh
```

---

## API
Run on openpanel test server, not on playwright server:
```
RUN_WRITE_TESTS=1 ADMIN_USER=stefan ADMIN_PASSWORD=stefan ./api.sh
```

---

## Disk and inode quotas
Run on openpanel test server, not on playwright server. Checks that an account's plan limits count, and stop, every file in its home, also the ones its containers write as subuids (database data, files made by PHP and the webserver):
```
bash opencli/quota.sh                       # testinguser
QUOTA_USER=someuser bash opencli/quota.sh
```
The limits are lowered for a moment to test that writes over them fail, then put back from the plan. With project quotas off the subuid checks fail, turn them on with `opencli user-quota --enable-project` and reboot.

To also check a WordPress site on another account (files uploaded through wp-admin, plugins, themes), run the WordPress spec on its domain from the playwright server:
```
PANEL_USERNAME=someuser PANEL_PASSWORD=... npx playwright test -c openpanel/playwright.config.ts --project=login
PANEL_USERNAME=someuser PANEL_PASSWORD=... WP_DOMAIN=some.domain npx playwright test -c openpanel/playwright.config.ts --project=installers --no-deps openpanel/tests/wordpress.spec.ts -g "install wordpress|wp-admin"
```
