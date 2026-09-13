# OpenPanel tests

Playwright end-to-end tests for the OpenPanel (user) panel.

## Prepare OpenPanel server

1. Install/update OpenPanel on the server: `bash <(curl -sSL https://openpanel.org)` | `opencli update --beta`
2. On the OpenPanel server run:

   ```bash
   bash <(curl -sSL https://raw.githubusercontent.com/stefanpejcic/openpanel-tests/refs/heads/main/openpanel/prepare.sh)
   ```

## Prepare Playwright tests

1. Download all tests: `cd /root/playwright-test && git pull`
2. Add logins to `/root/playwright-test/openpanel/.env`:
   ```
   BASE_URL=
   PANEL_USERNAME=
   PANEL_PASSWORD=
   ```

## Run manually

```bash
cd /root/playwright-test && npx playwright test -c openpanel/playwright.config.ts --project=tests --ui
```

## Run headlessly (single worker)

This is what `run-tests.sh` and cron use — no `--ui`, since there's no
display available in cron. Always run this suite with a single worker;
running it in parallel hammers the shared test server and causes
contention-related failures that aren't real bugs.

```bash
cd /root/playwright-test && npx playwright test -c openpanel/playwright.config.ts --project=tests --workers=1
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
chmod +x /root/playwright-test/openpanel/run-tests.sh
```

Add to crontab (`crontab -e`) to run daily at 22:00:

```cron
0 22 * * * /root/playwright-test/openpanel/run-tests.sh >> /root/playwright-test/user_cron.log 2>&1
```

Full logs, the Playwright HTML report, and the raw JSON results for each
run are kept under `/root/playwright-test/logs/` (not committed to git,
pruned after 30 days). The README below only ever shows the *latest* run.

## Automated Test Results

<!-- AUTOMATED-RESULTS:START -->
### Latest OpenPanel run

**Last run:** 2026-09-13 22:28:48 UTC  
**Result:** ❌ 33 failed — 479 passed, 33 failed, 68 skipped (580 total) in 28m 45s

#### ❌ Failures

| Test file | Test | Status | Error |
|---|---|---|---|
| aaa-domains.spec.ts | reset dns zone | ⏱️ | Test timeout of 30000ms exceeded. |
| aaa-waf.spec.ts | waf on/off and disabled rules for domain | ❌ | Error: apiRequestContext.get: socket hang up |
| cronjobs.spec.ts | view logs | ❌ | Error: expect(locator).toBeVisible() failed |
| emails.spec.ts | create emails and verify dashboard count | ❌ | Error: expect(received).toBe(expected) // Object.is equality |
| emails.spec.ts | edit email — suspend incoming | ❌ | Error: expect(locator).toBeVisible() failed |
| emails.spec.ts | edit email — suspend outgoing | ❌ | Error: expect(locator).toBeVisible() failed |
| emails.spec.ts | edit email — restore allow incoming and outgoing | ❌ | Error: expect(locator).toBeVisible() failed |
| emails.spec.ts | edit email — change password via generate button | ❌ | Error: expect(locator).toBeVisible() failed |
| emails.spec.ts | edit email — manual password change | ❌ | Error: expect(locator).toBeVisible() failed |
| emails.spec.ts | webmail autologin and send/receive | ❌ | TimeoutError: page.waitForSelector: Timeout 20000ms exceeded. |
| emails.spec.ts | delete emails and verify dashboard count | ❌ | Error: expect(locator).toHaveCount(expected) failed |
| mysql.spec.ts | import | ❌ | Error: expect(received).toBeGreaterThan(expected) |
| wordpress.spec.ts | live preview | ❌ | Error: expect(locator).toContainText(expected) failed |
| wordpress.spec.ts | tests/wordpress.spec.ts › wp-admin - install scrollchart plugin | ⏱️ | Test timeout of 180000ms exceeded. |
| z-cache.spec.ts | memcached | ❌ | Error: Expected "MEMCACHED_OK" in response but got: |
| z-cache.spec.ts | elasticsearch | ⏱️ | Test timeout of 60000ms exceeded. |
| z-cache.spec.ts | opensearch | ❌ | Error: expect(locator).toBeVisible() failed |
| zzz-json_assets.spec.ts | screenshot can be force-regenerated via POST | ❌ | Error: expect(received).toBeLessThan(expected) |
| zzzz-varnish_cache.spec.ts | should show domains table and enable Varnish | ❌ | Error: expect(received).toBe(expected) // Object.is equality |
| zzzz-varnish_cache.spec.ts | should display container log and show Varnish Cache & Container stats | ❌ | Error: expect(locator).toBeVisible() failed |
| zzzz-varnish_cache.spec.ts | should disable Varnish for domain | ❌ | Error: expect(received).toBe(expected) // Object.is equality |
| zzzz-varnish_cache.spec.ts | disable varnish | ❌ | Error: expect(locator).toHaveText(expected) failed |
| zzzzz-docker.spec.ts | edit cpu, ram and toggle container state for all rows | ❌ | Error: expect(locator).toContainText(expected) failed |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › resolves without error | ❌ | Error: expect(received).toContain(expected) // indexOf |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects path traversal | ❌ | Error: expect(received).toContain(expected) // indexOf |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects path traversal | ❌ | Error: expect(received).toContain(expected) // indexOf |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns quarantine_files array | ❌ | Error: expect(received).toBe(expected) // Object.is equality |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns an aliases array | ❌ | Error: expect(received).toBe(expected) // Object.is equality |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects a pid that is not one of the caller's processes | ❌ | Error: expect(received).toContain(expected) // indexOf |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unauthenticated requests are rejected on all protected routes | ❌ | Error: /api/inodes should reject unauthenticated requests (got 301) |
| zzzzzzzz-logout.spec.ts | logout | ⏱️ | Test timeout of 30000ms exceeded. |
| zzzzzzzzz-account_settings.spec.ts | email address | ⏱️ | Test timeout of 30000ms exceeded. |
| zzzzzzzzz-account_settings.spec.ts | password | ⏱️ | Test timeout of 30000ms exceeded. |

<details>
<summary>Full results (580 tests)</summary>

| Test file | Test | Status | Duration |
|---|---|---|---|
| 2fa.spec.ts | enable 2FA | ✅ | 2.9s |
| 2fa.spec.ts | disable 2FA | ✅ | 1.3s |
| a-malware_scan.spec.ts | malware scanner page loads | ✅ | 218ms |
| a-malware_scan.spec.ts | start a scan and see streamed results | ✅ | 445ms |
| a-malware_scan.spec.ts | quarantine page loads | ✅ | 257ms |
| a-malware_scan.spec.ts | quarantine page links back to scanner | ✅ | 336ms |
| aa-filemanager.spec.ts | create file | ✅ | 1.2s |
| aa-filemanager.spec.ts | create folder | ✅ | 1.1s |
| aa-filemanager.spec.ts | copy file to folder | ✅ | 781ms |
| aa-filemanager.spec.ts | move file | ✅ | 2.8s |
| aa-filemanager.spec.ts | delete file to trash | ✅ | 2.3s |
| aa-filemanager.spec.ts | restore file from trash | ✅ | 6.2s |
| aa-filemanager.spec.ts | delete multiple items permanently | ✅ | 2.3s |
| aa-filemanager.spec.ts | create file with editor | ✅ | 1.6s |
| aa-filemanager.spec.ts | view file content | ✅ | 493ms |
| aa-filemanager.spec.ts | edit file content | ✅ | 1.3s |
| aa-filemanager.spec.ts | rename file | ✅ | 882ms |
| aa-filemanager.spec.ts | change file permissions | ✅ | 1.3s |
| aa-filemanager.spec.ts | upload file from URL | ✅ | 2.6s |
| aa-filemanager.spec.ts | compress files | ✅ | 2.7s |
| aa-filemanager.spec.ts | extract files | ✅ | 3.1s |
| aa-filemanager.spec.ts | cleanup subdir | ✅ | 13.7s |
| aa-filemanager.spec.ts | /disk-usage | ✅ | 842ms |
| aa-filemanager.spec.ts | /inodes-explorer | ✅ | 757ms |
| aaa-domains.spec.ts | add domains | ✅ | 55.4s |
| aaa-domains.spec.ts | verify files created for a new domain | ✅ | 2.3s |
| aaa-domains.spec.ts | search domains | ✅ | 473ms |
| aaa-domains.spec.ts | check columns for domains table | ✅ | 11.6s |
| aaa-domains.spec.ts | vhost editor | ✅ | 209ms |
| aaa-domains.spec.ts | change docroot | ✅ | 3.5s |
| aaa-domains.spec.ts | add dns record | ✅ | 3.2s |
| aaa-domains.spec.ts | edit dns record | ✅ | 2.7s |
| aaa-domains.spec.ts | delete dns record | ✅ | 2.5s |
| aaa-domains.spec.ts | export dns zone | ✅ | 78ms |
| aaa-domains.spec.ts | edit zone file | ✅ | 3.3s |
| aaa-domains.spec.ts | reset dns zone | ⏱️ | 30.3s |
| aaa-domains.spec.ts | dynamic dns record | ✅ | 4.9s |
| aaa-domains.spec.ts | redirects | ✅ | 3.5s |
| aaa-domains.spec.ts | suspend domain | ✅ | 2.6s |
| aaa-domains.spec.ts | unsuspend domain | ✅ | 2.7s |
| aaa-domains.spec.ts | delete domain | ✅ | 2.4s |
| aaa-waf.spec.ts | waf status | ✅ | 254ms |
| aaa-waf.spec.ts | waf on/off and disabled rules for domain | ❌ | 360ms |
| aaa-waf.spec.ts | waf logs show blocked requests for domain | ✅ | 1.0s |
| aaaa-ssl.spec.ts | view ssl info | ✅ | 1.1s |
| aaaa-ssl.spec.ts | add custom ssl | ✅ | 2.2s |
| aaaa-ssl.spec.ts | switch back to Lets Encrypt | ✅ | 2.6s |
| aaaaa-ip_blocker.spec.ts | IP Blocker | ✅ | 5.4s |
| autoinstaller.spec.ts | auto-installer page loads | ✅ | 249ms |
| autoinstaller.spec.ts | auto-installer shows available applications | ✅ | 269ms |
| autoinstaller.spec.ts | auto-installer search/filter works | ✅ | 206ms |
| autoinstaller.spec.ts | auto-installer install form is accessible | ✅ | 443ms |
| backups.spec.ts | access backups page | ✅ | 322ms |
| backups.spec.ts | access backup settings | ✅ | 246ms |
| backups.spec.ts | save backup settings | ✅ | 1.3s |
| backups.spec.ts | access backup destination | ✅ | 232ms |
| backups.spec.ts | run backup | ✅ | 268ms |
| backups.spec.ts | list backups from destination | ✅ | 236ms |
| capitalize_domains.spec.ts | capitalize domains page loads | ✅ | 239ms |
| capitalize_domains.spec.ts | letter buttons are rendered for domain | ✅ | 216ms |
| capitalize_domains.spec.ts | toggle a letter to uppercase and save | ✅ | 411ms |
| capitalize_domains.spec.ts | revert domain capitalization to original | ✅ | 503ms |
| cronjobs.spec.ts | list | ✅ | 636ms |
| cronjobs.spec.ts | create job | ✅ | 1.8s |
| cronjobs.spec.ts | view logs | ❌ | 20.8s |
| cronjobs.spec.ts | edit as file | ✅ | 1.6s |
| cronjobs.spec.ts | edit job | ✅ | 5.4s |
| cronjobs.spec.ts | delete job | ✅ | 2.1s |
| dashboard.spec.ts | access dashboard | ✅ | 315ms |
| dashboard.spec.ts | sidebar open/close | ✅ | 667ms |
| dashboard.spec.ts | toggle dark mode | ✅ | 501ms |
| dashboard.spec.ts | search results | ✅ | 3.5s |
| dashboard.spec.ts | icons mode toggle | ✅ | 753ms |
| dashboard.spec.ts | icon sections drag&sort | ✅ | 1.8s |
| dashboard.spec.ts | icon sections open/close | ✅ | 1.1s |
| dashboard.spec.ts | menu items collapse/expand individually | ✅ | 4.2s |
| dashboard.spec.ts | menu items collapse/expand all | ✅ | 868ms |
| drupal.spec.ts | tests/drupal.spec.ts › 1. install app | ✅ | 24.3s |
| drupal.spec.ts | tests/drupal.spec.ts › 2. verify app appears on /sites | ✅ | 1.2s |
| drupal.spec.ts | tests/drupal.spec.ts › 3. verify app is responding | ✅ | 4.0s |
| drupal.spec.ts | tests/drupal.spec.ts › 4. admin auto-login link generation works | ✅ | 411ms |
| drupal.spec.ts | tests/drupal.spec.ts › 5. remove app | ✅ | 1.5s |
| emails.spec.ts | emails accounts page loads and shows table | ✅ | 304ms |
| emails.spec.ts | emails accounts new-email button links to /emails/new | ✅ | 246ms |
| emails.spec.ts | emails accounts export button is present | ✅ | 218ms |
| emails.spec.ts | create email new page loads | ✅ | 306ms |
| emails.spec.ts | create email password generate button fills field | ✅ | 338ms |
| emails.spec.ts | create email toggle password visibility | ✅ | 372ms |
| emails.spec.ts | create emails and verify dashboard count | ❌ | 11.7s |
| emails.spec.ts | emails accounts search filters rows | ✅ | 372ms |
| emails.spec.ts | edit email page loads for existing account | ✅ | 1.1s |
| emails.spec.ts | edit email — suspend incoming | ❌ | 11.0s |
| emails.spec.ts | edit email — suspend outgoing | ❌ | 11.1s |
| emails.spec.ts | edit email — restore allow incoming and outgoing | ❌ | 11.2s |
| emails.spec.ts | edit email — change password via generate button | ❌ | 11.1s |
| emails.spec.ts | edit email — manual password change | ❌ | 11.2s |
| emails.spec.ts | edit email — delete button links to delete page | ✅ | 1.1s |
| emails.spec.ts | connect devices page loads for an email | ✅ | 432ms |
| emails.spec.ts | connect devices back button goes to /emails | ✅ | 487ms |
| emails.spec.ts | webmail autologin and send/receive | ❌ | 21.7s |
| emails.spec.ts | email filters selector page loads | ✅ | 317ms |
| emails.spec.ts | email filters selector navigates to email filter page | ✅ | 402ms |
| emails.spec.ts | email filter GUI page loads for email | ✅ | 414ms |
| emails.spec.ts | email filter — add a filter rule in GUI mode | ✅ | 448ms |
| emails.spec.ts | email filter raw mode shows textarea | ✅ | 398ms |
| emails.spec.ts | import emails page loads | ✅ | 298ms |
| emails.spec.ts | import emails file input accepts csv and xlsx only | ✅ | 248ms |
| emails.spec.ts | import emails back button links to /emails | ✅ | 384ms |
| emails.spec.ts | export emails returns a CSV download | ✅ | 204ms |
| emails.spec.ts | aliases list page loads | ✅ | 557ms |
| emails.spec.ts | new alias page loads | ✅ | 273ms |
| emails.spec.ts | new alias — domain selector updates @domain preview | ✅ | 276ms |
| emails.spec.ts | create alias and verify in list | ✅ | 1.2s |
| emails.spec.ts | aliases search filters rows | ✅ | 268ms |
| emails.spec.ts | alias detail page loads for existing alias | ✅ | 383ms |
| emails.spec.ts | alias detail — add then remove a destination | ✅ | 2.2s |
| emails.spec.ts | delete alias and verify removal | ✅ | 1.4s |
| emails.spec.ts | default address selector page loads | ✅ | 263ms |
| emails.spec.ts | default address domain selector navigates to domain page | ✅ | 354ms |
| emails.spec.ts | default address detail page shows current config or empty state | ✅ | 340ms |
| emails.spec.ts | default address — set and clear catch-all | ✅ | 796ms |
| emails.spec.ts | delete emails and verify dashboard count | ❌ | 7.2s |
| emails.spec.ts | delete email page shows selector when no address given | ✅ | 294ms |
| favorites.spec.ts | Left-click to add | ✅ | 460ms |
| favorites.spec.ts | check table | ✅ | 253ms |
| favorites.spec.ts | Yellow star | ✅ | 834ms |
| favorites.spec.ts | Right-click to remove | ✅ | 523ms |
| favorites.spec.ts | search table | ✅ | 614ms |
| favorites.spec.ts | delete in table | ✅ | 1.6s |
| fixpermissions.spec.ts | fix permissions | ✅ | 5.9s |
| forgot_password.spec.ts | reset password page loads | ✅ | 358ms |
| forgot_password.spec.ts | submit empty email shows error | ✅ | 452ms |
| forgot_password.spec.ts | submit invalid email format shows error | ✅ | 567ms |
| forgot_password.spec.ts | submit valid email shows confirmation | ✅ | 538ms |
| forgot_password.spec.ts | invalid reset token shows error | ✅ | 328ms |
| ftp.spec.ts | create account | ✅ | 2.1s |
| ftp.spec.ts | login, upload, list, download, delete | ✅ | 140ms |
| ftp.spec.ts | password change | ✅ | 3.8s |
| ftp.spec.ts | path change | ✅ | 797ms |
| ftp.spec.ts | filezilla config | ✅ | 107ms |
| ftp.spec.ts | cyberduck config | ✅ | 64ms |
| ftp.spec.ts | search | ✅ | 283ms |
| ftp.spec.ts | account delete | ✅ | 4.4s |
| goaccess.spec.ts | traffic stats page loads | ✅ | 209ms |
| goaccess.spec.ts | traffic stats shows domain list | ✅ | 272ms |
| joomla.spec.ts | tests/joomla.spec.ts › 1. install app | ✅ | 5.5s |
| joomla.spec.ts | tests/joomla.spec.ts › 2. verify app appears on /sites | ✅ | 656ms |
| joomla.spec.ts | tests/joomla.spec.ts › 3. verify app is responding | ✅ | 1.0s |
| joomla.spec.ts | tests/joomla.spec.ts › 4. admin auto-login link generation works | ✅ | 371ms |
| joomla.spec.ts | tests/joomla.spec.ts › 5. remove app | ✅ | 1.2s |
| last_login.spec.ts | table, clipboard, activity link, search filter and dashboard IP | ✅ | 968ms |
| matomo.spec.ts | tests/matomo.spec.ts › 1. install app | ✅ | 16.4s |
| matomo.spec.ts | tests/matomo.spec.ts › 2. verify app appears on /sites | ✅ | 609ms |
| matomo.spec.ts | tests/matomo.spec.ts › 3. verify app is responding | ✅ | 2.5s |
| matomo.spec.ts | tests/matomo.spec.ts › 4. admin auto-login link generation works | ✅ | 408ms |
| matomo.spec.ts | tests/matomo.spec.ts › 5. remove app | ✅ | 1.2s |
| mediawiki.spec.ts | tests/mediawiki.spec.ts › 1. install app | ✅ | 8.1s |
| mediawiki.spec.ts | tests/mediawiki.spec.ts › 2. verify app appears on /sites | ✅ | 595ms |
| mediawiki.spec.ts | tests/mediawiki.spec.ts › 3. verify app is responding | ✅ | 4.3s |
| mediawiki.spec.ts | tests/mediawiki.spec.ts › 4. admin auto-login link generation works | ✅ | 370ms |
| mediawiki.spec.ts | tests/mediawiki.spec.ts › 5. remove app | ✅ | 2.0s |
| moodle.spec.ts | tests/moodle.spec.ts › 1. install app | ✅ | 1m 39s |
| moodle.spec.ts | tests/moodle.spec.ts › 2. verify app appears on /sites | ✅ | 640ms |
| moodle.spec.ts | tests/moodle.spec.ts › 3. verify app is responding | ✅ | 4.4s |
| moodle.spec.ts | tests/moodle.spec.ts › 4. remove app | ✅ | 4.6s |
| mysql.spec.ts | list databases | ✅ | 285ms |
| mysql.spec.ts | create database | ✅ | 1.2s |
| mysql.spec.ts | show system databases | ✅ | 501ms |
| mysql.spec.ts | show database sizes | ✅ | 418ms |
| mysql.spec.ts | phpmyadmin auto-login | ✅ | 969ms |
| mysql.spec.ts | list users | ✅ | 275ms |
| mysql.spec.ts | show system users | ✅ | 439ms |
| mysql.spec.ts | create user | ✅ | 775ms |
| mysql.spec.ts | change password | ✅ | 677ms |
| mysql.spec.ts | grant CREATE ROUTE privilege | ✅ | 721ms |
| mysql.spec.ts | grant NO privileges | ✅ | 1.3s |
| mysql.spec.ts | grant ALL PRIVILEGES | ✅ | 799ms |
| mysql.spec.ts | revoke privileges | ✅ | 670ms |
| mysql.spec.ts | database wizard | ✅ | 783ms |
| mysql.spec.ts | remote access | ✅ | 27.5s |
| mysql.spec.ts | processlist | ✅ | 260ms |
| mysql.spec.ts | configuration editor | ✅ | 11.6s |
| mysql.spec.ts | import | ❌ | 1.2s |
| mysql.spec.ts | export | ✅ | 2.3s |
| mysql.spec.ts | delete user | ✅ | 535ms |
| mysql.spec.ts | delete database | ✅ | 1.2s |
| nextcloud.spec.ts | tests/nextcloud.spec.ts › 1. install app | ✅ | 39.0s |
| nextcloud.spec.ts | tests/nextcloud.spec.ts › 2. verify app appears on /sites | ✅ | 663ms |
| nextcloud.spec.ts | tests/nextcloud.spec.ts › 3. verify app is responding | ✅ | 3.3s |
| nextcloud.spec.ts | tests/nextcloud.spec.ts › 4. admin auto-login link generation works | ✅ | 460ms |
| nextcloud.spec.ts | tests/nextcloud.spec.ts › 5. remove app | ✅ | 2.0s |
| nodejs.spec.ts | tests/nodejs.spec.ts › 1. create app files | ✅ | 644ms |
| nodejs.spec.ts | tests/nodejs.spec.ts › 2. install app | ✅ | 24.0s |
| nodejs.spec.ts | tests/nodejs.spec.ts › 3. verify app appears on /sites | ✅ | 643ms |
| nodejs.spec.ts | tests/nodejs.spec.ts › 4. verify app is responding | ✅ | 2.4s |
| notifications.spec.ts | notifications page loads | ✅ | 231ms |
| notifications.spec.ts | notifications page has toggles or settings | ✅ | 227ms |
| notifications.spec.ts | save notification preferences | ✅ | 439ms |
| notifications.spec.ts | notification settings persist after reload | ✅ | 994ms |
| opencart.spec.ts | tests/opencart.spec.ts › 1. install app | ✅ | 5.0s |
| opencart.spec.ts | tests/opencart.spec.ts › 2. verify app appears on /sites | ✅ | 647ms |
| opencart.spec.ts | tests/opencart.spec.ts › 3. verify app is responding | ✅ | 1.1s |
| opencart.spec.ts | tests/opencart.spec.ts › 4. admin auto-login link generation works | ✅ | 413ms |
| opencart.spec.ts | tests/opencart.spec.ts › 5. remove app | ✅ | 1.3s |
| passkeys.spec.ts | passkeys settings page loads | ✅ | 228ms |
| passkeys.spec.ts | register a new passkey | ⏭️ | 49ms |
| passkeys.spec.ts | remove a passkey | ⏭️ | 53ms |
| php_extensions.spec.ts | extensions version selector page loads | ✅ | 255ms |
| php_extensions.spec.ts | select version navigates to per-version extensions page | ✅ | 1.5s |
| php_extensions.spec.ts | toggle an extension enable/disable | ✅ | 2.9s |
| php_extensions.spec.ts | available extensions list loads in install modal | ✅ | 3.0s |
| php.spec.ts | list versions | ✅ | 450ms |
| php.spec.ts | change default php version | ✅ | 441ms |
| php.spec.ts | edit php options | ✅ | 3.6s |
| php.spec.ts | edit php.ini files | ✅ | 5.1s |
| php.spec.ts | tests/php.spec.ts › filter table rows | ✅ | 573ms |
| php.spec.ts | tests/php.spec.ts › version counter filter | ✅ | 656ms |
| php.spec.ts | tests/php.spec.ts › clear search | ✅ | 894ms |
| php.spec.ts | tests/php.spec.ts › php 8.5 | ⏭️ | 224ms |
| php.spec.ts | tests/php.spec.ts › php 8.4 | ✅ | 13.6s |
| php.spec.ts | tests/php.spec.ts › php 8.3 | ✅ | 19.9s |
| php.spec.ts | tests/php.spec.ts › php 8.2 | ✅ | 14.2s |
| php.spec.ts | tests/php.spec.ts › php 8.1 | ✅ | 14.4s |
| php.spec.ts | tests/php.spec.ts › php 8.0 | ✅ | 14.4s |
| php.spec.ts | tests/php.spec.ts › php 7.4 | ✅ | 14.6s |
| php.spec.ts | tests/php.spec.ts › php 7.3 | ✅ | 14.4s |
| php.spec.ts | tests/php.spec.ts › php 7.2 | ✅ | 14.0s |
| php.spec.ts | tests/php.spec.ts › php 7.1 | ✅ | 14.2s |
| php.spec.ts | tests/php.spec.ts › php 7.0 | ✅ | 14.3s |
| php.spec.ts | tests/php.spec.ts › php 5.6 | ✅ | 14.3s |
| postgresql.spec.ts | list databases | ✅ | 6.5s |
| postgresql.spec.ts | create database | ✅ | 908ms |
| postgresql.spec.ts | list users | ✅ | 280ms |
| postgresql.spec.ts | create user | ✅ | 663ms |
| postgresql.spec.ts | change password | ✅ | 663ms |
| postgresql.spec.ts | assign user to database | ✅ | 785ms |
| postgresql.spec.ts | revoke user from database | ✅ | 784ms |
| postgresql.spec.ts | database wizard | ✅ | 732ms |
| postgresql.spec.ts | processlist | ✅ | 249ms |
| postgresql.spec.ts | configuration editor | ✅ | 1.6s |
| postgresql.spec.ts | remote access | ✅ | 4.2s |
| postgresql.spec.ts | import | ✅ | 988ms |
| postgresql.spec.ts | delete user | ✅ | 572ms |
| postgresql.spec.ts | delete database | ✅ | 551ms |
| prestashop.spec.ts | tests/prestashop.spec.ts › 1. install app | ✅ | 35.7s |
| prestashop.spec.ts | tests/prestashop.spec.ts › 2. verify app appears on /sites | ✅ | 553ms |
| prestashop.spec.ts | tests/prestashop.spec.ts › 3. verify app is responding | ✅ | 5.8s |
| prestashop.spec.ts | tests/prestashop.spec.ts › 4. admin auto-login link generation works | ✅ | 410ms |
| prestashop.spec.ts | tests/prestashop.spec.ts › 5. remove app | ✅ | 2.2s |
| process_manager.spec.ts | tests/process_manager.spec.ts › loads process table with at least one row | ✅ | 3.2s |
| process_manager.spec.ts | tests/process_manager.spec.ts › kill a random process, expect toast and row removed | ✅ | 5.4s |
| process_manager.spec.ts | tests/process_manager.spec.ts › refresh and confirm killed PID is absent | ✅ | 5.7s |
| process_manager.spec.ts | tests/process_manager.spec.ts › search filters rows correctly | ✅ | 3.8s |
| python.spec.ts | tests/python.spec.ts › 1. create app files | ✅ | 700ms |
| python.spec.ts | tests/python.spec.ts › 2. install app | ✅ | 27.1s |
| python.spec.ts | tests/python.spec.ts › 3. verify app appears on /sites | ✅ | 657ms |
| python.spec.ts | tests/python.spec.ts › 4. verify app is responding | ✅ | 3.5s |
| resource_usage.spec.ts | Resource Usage page loads with gauges | ✅ | 256ms |
| resource_usage.spec.ts | Resource Usage page shows CPU and RAM gauges when data available | ✅ | 243ms |
| resource_usage.spec.ts | Usage History page loads | ✅ | 356ms |
| resource_usage.spec.ts | Usage History search filters rows | ✅ | 338ms |
| resource_usage.spec.ts | Usage History show all checkbox loads all data | ✅ | 506ms |
| resource_usage.spec.ts | Usage History show all checkbox can be unchecked | ✅ | 519ms |
| resource_usage.spec.ts | Usage History pagination works | ✅ | 336ms |
| resource_usage.spec.ts | View Usage History button navigates correctly | ✅ | 1.0s |
| server_info.spec.ts | server info page | ✅ | 1.1s |
| services.spec.ts | services list page | ✅ | 242ms |
| services.spec.ts | services list contains expected entries | ✅ | 281ms |
| services.spec.ts | webserver service page (nginx / apache / openlitespeed) | ✅ | 433ms |
| services.spec.ts | mysql service page | ✅ | 294ms |
| services.spec.ts | php-fpm-8.5 service page | ✅ | 305ms |
| services.spec.ts | restart a service | ✅ | 328ms |
| services.spec.ts | service version selector | ✅ | 446ms |
| website_builder.spec.ts | website builder install page loads | ✅ | 246ms |
| website_builder.spec.ts | install form has domain selector | ✅ | 241ms |
| website_builder.spec.ts | website builder | ✅ | 7.5s |
| websites.spec.ts | auto-installer page has install links | ✅ | 402ms |
| wordpress.spec.ts | list wordpress sites | ✅ | 237ms |
| wordpress.spec.ts | install wordpress | ✅ | 7.6s |
| wordpress.spec.ts | wordpress security hardening page | ✅ | 205ms |
| wordpress.spec.ts | wordpress vulnerability scan | ✅ | 2.1s |
| wordpress.spec.ts | wp-cli check update preferences check | ✅ | 138ms |
| wordpress.spec.ts | generate backup | ✅ | 7.8s |
| wordpress.spec.ts | list backup | ✅ | 132ms |
| wordpress.spec.ts | wordpress reload data | ✅ | 124ms |
| wordpress.spec.ts | wp manager data | ✅ | 464ms |
| wordpress.spec.ts | live preview | ❌ | 25.3s |
| wordpress.spec.ts | wp-admin autologin | ✅ | 3.7s |
| wordpress.spec.ts | general options | ✅ | 11.7s |
| wordpress.spec.ts | maintenance mode | ✅ | 11.4s |
| wordpress.spec.ts | cache flush | ✅ | 2.5s |
| wordpress.spec.ts | live visitors count | ✅ | 849ms |
| wordpress.spec.ts | waf on/off | ✅ | 6.1s |
| wordpress.spec.ts | wp remove | ✅ | 1.1s |
| wordpress.spec.ts | tests/wordpress.spec.ts › wp-admin - upgrade wordpress core | ✅ | 14.5s |
| wordpress.spec.ts | tests/wordpress.spec.ts › wp-admin - install scrollchart plugin | ⏱️ | 3m 0s |
| wordpress.spec.ts | tests/wordpress.spec.ts › wp-admin - install nexusslash theme | ⏭️ | 0ms |
| z-cache.spec.ts | redis | ✅ | 36.0s |
| z-cache.spec.ts | valkey | ✅ | 35.7s |
| z-cache.spec.ts | memcached | ❌ | 8.5s |
| z-cache.spec.ts | elasticsearch | ⏱️ | 1m 0s |
| z-cache.spec.ts | opensearch | ❌ | 7.5s |
| zz-account_language.spec.ts | tests/zz-account_language.spec.ts › locale: sr | ✅ | 910ms |
| zz-account_language.spec.ts | tests/zz-account_language.spec.ts › locale: bg | ✅ | 704ms |
| zz-account_language.spec.ts | tests/zz-account_language.spec.ts › locale: de | ✅ | 648ms |
| zz-account_language.spec.ts | tests/zz-account_language.spec.ts › locale: es | ✅ | 670ms |
| zz-account_language.spec.ts | tests/zz-account_language.spec.ts › locale: fr | ✅ | 594ms |
| zz-account_language.spec.ts | tests/zz-account_language.spec.ts › locale: hu | ✅ | 619ms |
| zz-account_language.spec.ts | tests/zz-account_language.spec.ts › locale: ne | ✅ | 629ms |
| zz-account_language.spec.ts | tests/zz-account_language.spec.ts › locale: pt | ✅ | 667ms |
| zz-account_language.spec.ts | tests/zz-account_language.spec.ts › locale: ro | ✅ | 728ms |
| zz-account_language.spec.ts | tests/zz-account_language.spec.ts › locale: ru | ✅ | 753ms |
| zz-account_language.spec.ts | tests/zz-account_language.spec.ts › locale: tr | ✅ | 740ms |
| zz-account_language.spec.ts | tests/zz-account_language.spec.ts › locale: uk | ✅ | 625ms |
| zz-account_language.spec.ts | tests/zz-account_language.spec.ts › locale: zh | ✅ | 670ms |
| zz-account_language.spec.ts | tests/zz-account_language.spec.ts › locale: en | ✅ | 376ms |
| zzz-json_assets.spec.ts | favicon endpoint redirects to a favicon image | ✅ | 265ms |
| zzz-json_assets.spec.ts | favicon endpoint rejects a domain the user does not own | ✅ | 89ms |
| zzz-json_assets.spec.ts | screenshot endpoint returns an image | ✅ | 98ms |
| zzz-json_assets.spec.ts | screenshot endpoint rejects a domain the user does not own | ✅ | 92ms |
| zzz-json_assets.spec.ts | screenshot can be force-regenerated via POST | ❌ | 152ms |
| zzzz-varnish_cache.spec.ts | enable varnish | ✅ | 10.2s |
| zzzz-varnish_cache.spec.ts | should show domains table and enable Varnish | ❌ | 389ms |
| zzzz-varnish_cache.spec.ts | should display container log and show Varnish Cache & Container stats | ❌ | 5.3s |
| zzzz-varnish_cache.spec.ts | should disable Varnish for domain | ❌ | 478ms |
| zzzz-varnish_cache.spec.ts | disable varnish | ❌ | 40.6s |
| zzzzz-docker.spec.ts | check columns for docker table | ✅ | 3.9s |
| zzzzz-docker.spec.ts | containers page loads with header and table | ✅ | 900ms |
| zzzzz-docker.spec.ts | containers search filters rows | ✅ | 1.4s |
| zzzzz-docker.spec.ts | containers page New Service button navigates to add form | ✅ | 1.6s |
| zzzzz-docker.spec.ts | edit cpu, ram and toggle container state for all rows | ❌ | 24.8s |
| zzzzz-docker.spec.ts | add new service form loads | ✅ | 386ms |
| zzzzz-docker.spec.ts | add new service - invalid name shows error | ✅ | 1.7s |
| zzzzz-docker.spec.ts | add new service - image blur suggests service name | ✅ | 470ms |
| zzzzz-docker.spec.ts | add new service - add and remove volume entry | ✅ | 550ms |
| zzzzz-docker.spec.ts | add new service - Back to Containers link works | ✅ | 1.8s |
| zzzzz-docker.spec.ts | delete confirm page loads for a custom service | ✅ | 1.6s |
| zzzzz-docker.spec.ts | delete confirm - core service returns 403 | ✅ | 112ms |
| zzzzz-docker.spec.ts | delete confirm - php-fpm service returns 403 | ✅ | 53ms |
| zzzzz-docker.spec.ts | change mysql page loads | ✅ | 250ms |
| zzzzz-docker.spec.ts | change webserver page loads | ✅ | 237ms |
| zzzzz-docker.spec.ts | logs page loads with container selector | ✅ | 742ms |
| zzzzz-docker.spec.ts | logs page - selecting container loads log content | ✅ | 2.8s |
| zzzzz-docker.spec.ts | logs page - ?container= param pre-selects and loads | ✅ | 2.8s |
| zzzzz-docker.spec.ts | terminal page without container shows service picker | ✅ | 2.7s |
| zzzzz-docker.spec.ts | terminal page - selecting service redirects | ✅ | 3.1s |
| zzzzz-docker.spec.ts | terminal | ✅ | 1.7s |
| zzzzz-docker.spec.ts | terminal - reconnect button appears after disconnect | ✅ | 2.3s |
| zzzzz-docker.spec.ts | containers status endpoint returns JSON | ✅ | 131ms |
| zzzzzz-api.spec.ts | POST /api/malware-scanner/scan runs a real clamscan | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects wrong credentials with 401 | ✅ | 11ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns token shape for valid credentials | ✅ | 152ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects empty body | ✅ | 19ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns a list of API endpoints | ✅ | 713ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › includes a representative sample of modules/api/ routes | ✅ | 14ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › resolves without error | ❌ | 9ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns account fields | ✅ | 15ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects empty body | ✅ | 10ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns a sessions array | ✅ | 27ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unknown session token returns 404 | ✅ | 9ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns the service list | ✅ | 1.5s |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unknown service returns 404 | ✅ | 31ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects invalid action | ✅ | 17ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns compose config | ✅ | 502ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns running_containers | ✅ | 73ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns state/health shape | ✅ | 60ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unknown service returns 500 | ✅ | 46ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › restart a disposable test service | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns domains with stats availability | ✅ | 9ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns stats availability for TEST_DOMAIN | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns sites, counts and technologies | ✅ | 11ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns blocked_ips array | ✅ | 53ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects a request with no valid IPs | ✅ | 9ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › blocks a scratch IP then removes all blocks | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns a domains map | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects missing domain/subdomain | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects unowned domain | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › POST creates an entry | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › DELETE removes the entry | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns domains with zone_file_exists flags | ✅ | 7ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › TEST_DOMAIN returns records or 404 if no zone file | ✅ | 317ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 11ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects missing fields | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › POST creates an A record | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › PATCH updates the record | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › DELETE removes the record | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › resets the zone to default | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns a domain->status map | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns status and rule exclusions | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 12ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects invalid status | ✅ | 10ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › reads current status, flips it, flips it back | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns paginated entries | ✅ | 12ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › ?seconds param is reflected in response | ✅ | 10ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › accepts tags and ids | ✅ | 48ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects unknown id_type | ✅ | 5ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns available php versions | ✅ | 7ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unknown version returns 404 | ✅ | 5ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects missing content | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns available_keys and current_config | ✅ | 11ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects a body with no recognized keys | ✅ | 13ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns extension list | ✅ | 1.0s |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns installable extensions | ✅ | 900ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects empty extensions list | ✅ | 9ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns idle/busy status with no install_id | ✅ | 168ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › enables then disables a low-risk extension | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns webmail running state | ✅ | 75ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an invalid email | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 7ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns the live webserver config | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects missing content | ✅ | 7ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › writes back the same content it read | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns jobs and containers | ✅ | 505ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns raw file content | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects missing fields | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an invalid schedule | ✅ | 5ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns log entries or a clear not-found error | ✅ | 1.7s |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an overlong job filter | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › POST creates a job | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › PATCH updates the job | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › DELETE removes the job | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 9ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 5ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › protected service name is rejected | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › restart -> read logs | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns accounts array | ✅ | 10ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects missing fields | ✅ | 42ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects a path outside /var/www/html/ | ✅ | 66ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns raw connections text | ✅ | 230ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects unknown config type | ✅ | 10ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › POST creates an account | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › PATCH updates the password | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › PATCH updates the path | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › DELETE removes the account | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns status shape | ✅ | 59ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an invalid action | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › restarts the service | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns status shape | ✅ | 52ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an invalid action | ✅ | 7ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › restarts the service | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns status shape | ✅ | 53ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an invalid action | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › restarts the service | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns status shape | ✅ | 59ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an invalid action | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › restarts the service | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns status shape | ✅ | 60ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an invalid action | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › restarts the service | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns status and domain_statuses | ✅ | 65ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an invalid action | ✅ | 7ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns running or stopped shape | ✅ | 61ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns a domain status map | ✅ | 7ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 5ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects invalid status | ✅ | 7ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › restarts varnish | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns databases array | ✅ | 64ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an invalid database name | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects a reserved database name | ✅ | 5ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns databases/users/assigned_databases | ✅ | 61ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns processlist array | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns enabled/server_ip/port | ✅ | 9ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns configuration and available_keys | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects a body with no recognized keys | ✅ | 7ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › POST creates a database | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › POST creates a user | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › POST grants privileges | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › GET privileges reflects the grant | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › GET tables on the new (empty) database | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › PATCH updates the user password | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › DELETE revokes grants | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › DELETE removes the user | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › DELETE removes the database | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › flips the setting and flips it back | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns databases array | ✅ | 85ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects a reserved database name | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns databases/users/assigned_databases | ✅ | 39ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns processlist array | ✅ | 84ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns enabled/server_ip/port | ✅ | 5ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns configuration or a clear container-down error | ✅ | 83ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects a body with no recognized keys | ✅ | 5ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › POST creates a database | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › POST creates a user | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › POST grants privileges | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › PATCH updates the user password | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › DELETE revokes grants | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › DELETE removes the user | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › DELETE removes the database | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › flips the setting and flips it back | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns entries sorted by inode_count | ✅ | 1.9s |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects path traversal | ❌ | 9ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns entries with size/path | ✅ | 825ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects path traversal | ❌ | 19ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns usage data or a clear not-yet-available error | ✅ | 20ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns paginated entries | ✅ | 17ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › ?page=2 is reflected in response | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns quarantine_files array | ❌ | 9ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects a directory outside /var/www/html | ✅ | 11ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects a non-existent directory | ✅ | 14ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns an emails array | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects missing fields | ✅ | 9ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns per-domain deliverability checks | ✅ | 592ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an unknown config type | ✅ | 7ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns an aliases array | ❌ | 18ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an invalid target address | ✅ | 10ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 16ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › POST creates a mailbox | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › GET returns the mailbox detail | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › PATCH suspends incoming mail | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › PUT sets a filter | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › POST creates an alias to the mailbox | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › DELETE removes the mailbox | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 9ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects a missing domain_id | ✅ | 9ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unknown site_id returns 404 | ✅ | 9ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › POST creates a site | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › PUT updates the html/css | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns a sites array | ✅ | 9ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › TEST_DOMAIN returns site detail or 404 if unmanaged | ✅ | 13ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 10ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › kicks off an async scan | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an invalid domain param | ✅ | 10ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 11ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › pagespeed | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › wp-vulnerability | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns sites and count | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 5ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects both backup flags disabled | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects missing backup_date | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns available hardening rules | ✅ | 18ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unknown site_id returns 404 | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an unknown action | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects a missing domain | ✅ | 5ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › list_plugins | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › list_themes | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › cache_flush | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › creates a backup of TEST_DOMAIN | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns a processes array | ✅ | 2.1s |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an invalid pid | ✅ | 7ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects a pid that is not one of the caller's processes | ❌ | 2.5s |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns domains with total | ✅ | 27ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects a missing domain | ✅ | 13ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 7ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › TEST_DOMAIN returns status shape | ✅ | 11ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › TEST_DOMAIN returns a docroot | ✅ | 49ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects a docroot outside /var/www/html/ | ✅ | 7ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › TEST_DOMAIN returns redirect status | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an invalid url | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › TEST_DOMAIN returns ssl_mode | ✅ | 240ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an unknown action | ✅ | 10ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › TEST_DOMAIN returns vhost content or 404 | ✅ | 12ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects empty vhost content | ✅ | 9ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › TEST_DOMAIN returns records or 404 | ✅ | 9ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects missing fields | ✅ | 10ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › POST creates a record | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › DELETE removes the record | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › TEST_DOMAIN returns paginated logs | ✅ | 28ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › POST creates the domain | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › POST suspends it | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › POST unsuspends it | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › DELETE removes the domain | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unauthenticated requests are rejected on all protected routes | ❌ | 135ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › a garbage bearer token is rejected the same way | ✅ | 25ms |
| zzzzzzz-activity_log.spec.ts | activity log contains all known recorded user actions | ✅ | 393ms |
| zzzzzzz-webserver_conf.spec.ts | access webserver configuration page | ✅ | 278ms |
| zzzzzzz-webserver_conf.spec.ts | editor contains valid config content | ✅ | 250ms |
| zzzzzzz-webserver_conf.spec.ts | save webserver configuration | ✅ | 1.2s |
| zzzzzzz-webserver_conf.spec.ts | invalid config is rejected | ✅ | 663ms |
| zzzzzzzz-active_sessions.spec.ts | active sessions: search, activity logs, terminate session | ✅ | 2.1s |
| zzzzzzzz-logout.spec.ts | logout | ⏱️ | 30.0s |
| zzzzzzzzz-account_settings.spec.ts | email address | ⏱️ | 30.1s |
| zzzzzzzzz-account_settings.spec.ts | password | ⏱️ | 30.0s |

</details>
<!-- AUTOMATED-RESULTS:END -->
