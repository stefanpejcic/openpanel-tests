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

**Last run:** 2026-09-10 22:40:21 UTC  
**Result:** ❌ 30 failed — 479 passed, 30 failed, 71 skipped (580 total) in 40m 18s

#### ❌ Failures

| Test file | Test | Status | Error |
|---|---|---|---|
| cronjobs.spec.ts | view logs | ❌ | Error: expect(locator).toBeVisible() failed |
| emails.spec.ts | edit email — suspend incoming | ❌ | Error: expect(locator).toBeVisible() failed |
| emails.spec.ts | edit email — suspend outgoing | ❌ | Error: expect(locator).toBeVisible() failed |
| emails.spec.ts | edit email — restore allow incoming and outgoing | ❌ | Error: expect(locator).toBeVisible() failed |
| emails.spec.ts | edit email — change password via generate button | ❌ | Error: expect(locator).toBeVisible() failed |
| emails.spec.ts | edit email — manual password change | ❌ | Error: expect(locator).toBeVisible() failed |
| emails.spec.ts | webmail autologin and send/receive | ❌ | TimeoutError: page.waitForSelector: Timeout 20000ms exceeded. |
| emails.spec.ts | delete emails and verify dashboard count | ❌ | Error: expect(locator).toHaveCount(expected) failed |
| mysql.spec.ts | import | ❌ | Error: expect(received).toBeGreaterThan(expected) |
| prestashop.spec.ts | tests/prestashop.spec.ts › 1. install app | ❌ | Error: expect(locator).toBeVisible() failed |
| wordpress.spec.ts | live preview | ❌ | Error: expect(locator).toContainText(expected) failed |
| z-cache.spec.ts | redis | ❌ | Error: Expected "REDIS_OK" in response but got: |
| z-cache.spec.ts | elasticsearch | ⏱️ | Test timeout of 60000ms exceeded. |
| z-cache.spec.ts | opensearch | ❌ | Error: expect(locator).toBeVisible() failed |
| zzz-json_assets.spec.ts | screenshot can be force-regenerated via POST | ❌ | Error: expect(received).toBeLessThan(expected) |
| zzzz-varnish_cache.spec.ts | enable varnish | ❌ | Error: expect(locator).not.toHaveText(expected) failed |
| zzzz-varnish_cache.spec.ts | should show domains table and enable Varnish | ❌ | Error: expect(received).toBe(expected) // Object.is equality |
| zzzz-varnish_cache.spec.ts | should display container log and show Varnish Cache & Container stats | ❌ | Error: expect(locator).toBeVisible() failed |
| zzzz-varnish_cache.spec.ts | should disable Varnish for domain | ❌ | Error: expect(received).toBe(expected) // Object.is equality |
| zzzz-varnish_cache.spec.ts | disable varnish | ❌ | Error: expect(locator).not.toHaveText(expected) failed |
| zzzzz-docker.spec.ts | terminal | ❌ | Error: expect(locator).toContainText(expected) failed |
| zzzzz-docker.spec.ts | containers status endpoint returns JSON | ❌ | Error: expect(received).toBe(expected) // Object.is equality |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › resolves without error | ❌ | Error: expect(received).toContain(expected) // indexOf |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns log entries or a clear not-found error | ❌ | Error: expect(received).toContain(expected) // indexOf |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects path traversal | ❌ | Error: expect(received).toContain(expected) // indexOf |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects path traversal | ❌ | Error: expect(received).toContain(expected) // indexOf |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns quarantine_files array | ❌ | Error: expect(received).toBe(expected) // Object.is equality |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns an aliases array | ❌ | Error: expect(received).toBe(expected) // Object.is equality |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns a processes array | ❌ | Error: expect(received).toBe(expected) // Object.is equality |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unauthenticated requests are rejected on all protected routes | ❌ | Error: /api/inodes should reject unauthenticated requests (got 301) |

<details>
<summary>Full results (580 tests)</summary>

| Test file | Test | Status | Duration |
|---|---|---|---|
| 2fa.spec.ts | enable 2FA | ✅ | 3.0s |
| 2fa.spec.ts | disable 2FA | ✅ | 1.2s |
| a-malware_scan.spec.ts | malware scanner page loads | ✅ | 222ms |
| a-malware_scan.spec.ts | start a scan and see streamed results | ✅ | 412ms |
| a-malware_scan.spec.ts | quarantine page loads | ✅ | 290ms |
| a-malware_scan.spec.ts | quarantine page links back to scanner | ✅ | 392ms |
| aa-filemanager.spec.ts | create file | ✅ | 1.2s |
| aa-filemanager.spec.ts | create folder | ✅ | 1.2s |
| aa-filemanager.spec.ts | copy file to folder | ✅ | 791ms |
| aa-filemanager.spec.ts | move file | ✅ | 2.7s |
| aa-filemanager.spec.ts | delete file to trash | ✅ | 2.3s |
| aa-filemanager.spec.ts | restore file from trash | ✅ | 6.2s |
| aa-filemanager.spec.ts | delete multiple items permanently | ✅ | 2.4s |
| aa-filemanager.spec.ts | create file with editor | ✅ | 1.8s |
| aa-filemanager.spec.ts | view file content | ✅ | 493ms |
| aa-filemanager.spec.ts | edit file content | ✅ | 1.5s |
| aa-filemanager.spec.ts | rename file | ✅ | 895ms |
| aa-filemanager.spec.ts | change file permissions | ✅ | 1.2s |
| aa-filemanager.spec.ts | upload file from URL | ✅ | 2.7s |
| aa-filemanager.spec.ts | compress files | ✅ | 2.8s |
| aa-filemanager.spec.ts | extract files | ✅ | 3.1s |
| aa-filemanager.spec.ts | cleanup subdir | ✅ | 13.6s |
| aa-filemanager.spec.ts | /disk-usage | ✅ | 797ms |
| aa-filemanager.spec.ts | /inodes-explorer | ✅ | 749ms |
| aaa-domains.spec.ts | add domains | ✅ | 52.5s |
| aaa-domains.spec.ts | verify files created for a new domain | ✅ | 1.9s |
| aaa-domains.spec.ts | search domains | ✅ | 448ms |
| aaa-domains.spec.ts | check columns for domains table | ✅ | 11.6s |
| aaa-domains.spec.ts | vhost editor | ✅ | 213ms |
| aaa-domains.spec.ts | change docroot | ✅ | 3.3s |
| aaa-domains.spec.ts | add dns record | ✅ | 5.3s |
| aaa-domains.spec.ts | edit dns record | ✅ | 2.5s |
| aaa-domains.spec.ts | delete dns record | ✅ | 2.5s |
| aaa-domains.spec.ts | export dns zone | ✅ | 93ms |
| aaa-domains.spec.ts | edit zone file | ✅ | 4.2s |
| aaa-domains.spec.ts | reset dns zone | ✅ | 4.0s |
| aaa-domains.spec.ts | dynamic dns record | ✅ | 4.6s |
| aaa-domains.spec.ts | redirects | ✅ | 3.3s |
| aaa-domains.spec.ts | suspend domain | ✅ | 2.6s |
| aaa-domains.spec.ts | unsuspend domain | ✅ | 2.7s |
| aaa-domains.spec.ts | delete domain | ✅ | 2.7s |
| aaa-waf.spec.ts | waf status | ✅ | 250ms |
| aaa-waf.spec.ts | waf on/off and disabled rules for domain | ✅ | 4.4s |
| aaa-waf.spec.ts | waf logs show blocked requests for domain | ✅ | 540ms |
| aaaa-ssl.spec.ts | view ssl info | ✅ | 1.0s |
| aaaa-ssl.spec.ts | add custom ssl | ✅ | 4.2s |
| aaaa-ssl.spec.ts | switch back to Lets Encrypt | ✅ | 2.3s |
| aaaaa-ip_blocker.spec.ts | IP Blocker | ✅ | 5.4s |
| autoinstaller.spec.ts | auto-installer page loads | ✅ | 258ms |
| autoinstaller.spec.ts | auto-installer shows available applications | ✅ | 300ms |
| autoinstaller.spec.ts | auto-installer search/filter works | ✅ | 230ms |
| autoinstaller.spec.ts | auto-installer install form is accessible | ✅ | 406ms |
| backups.spec.ts | access backups page | ✅ | 370ms |
| backups.spec.ts | access backup settings | ✅ | 252ms |
| backups.spec.ts | save backup settings | ✅ | 1.2s |
| backups.spec.ts | access backup destination | ✅ | 251ms |
| backups.spec.ts | run backup | ✅ | 280ms |
| backups.spec.ts | list backups from destination | ✅ | 252ms |
| capitalize_domains.spec.ts | capitalize domains page loads | ✅ | 243ms |
| capitalize_domains.spec.ts | letter buttons are rendered for domain | ✅ | 252ms |
| capitalize_domains.spec.ts | toggle a letter to uppercase and save | ✅ | 429ms |
| capitalize_domains.spec.ts | revert domain capitalization to original | ✅ | 527ms |
| cronjobs.spec.ts | list | ✅ | 687ms |
| cronjobs.spec.ts | create job | ✅ | 1.8s |
| cronjobs.spec.ts | view logs | ❌ | 20.8s |
| cronjobs.spec.ts | edit as file | ✅ | 1.6s |
| cronjobs.spec.ts | edit job | ✅ | 5.5s |
| cronjobs.spec.ts | delete job | ✅ | 2.1s |
| dashboard.spec.ts | access dashboard | ✅ | 320ms |
| dashboard.spec.ts | sidebar open/close | ✅ | 623ms |
| dashboard.spec.ts | toggle dark mode | ✅ | 590ms |
| dashboard.spec.ts | search results | ✅ | 3.8s |
| dashboard.spec.ts | icons mode toggle | ✅ | 781ms |
| dashboard.spec.ts | icon sections drag&sort | ✅ | 1.8s |
| dashboard.spec.ts | icon sections open/close | ✅ | 1.2s |
| dashboard.spec.ts | menu items collapse/expand individually | ✅ | 4.1s |
| dashboard.spec.ts | menu items collapse/expand all | ✅ | 885ms |
| drupal.spec.ts | tests/drupal.spec.ts › 1. install app | ✅ | 24.3s |
| drupal.spec.ts | tests/drupal.spec.ts › 2. verify app appears on /sites | ✅ | 1.2s |
| drupal.spec.ts | tests/drupal.spec.ts › 3. verify app is responding | ✅ | 4.0s |
| drupal.spec.ts | tests/drupal.spec.ts › 4. admin auto-login link generation works | ✅ | 412ms |
| drupal.spec.ts | tests/drupal.spec.ts › 5. remove app | ✅ | 1.5s |
| emails.spec.ts | emails accounts page loads and shows table | ✅ | 270ms |
| emails.spec.ts | emails accounts new-email button links to /emails/new | ✅ | 182ms |
| emails.spec.ts | emails accounts export button is present | ✅ | 233ms |
| emails.spec.ts | create email new page loads | ✅ | 294ms |
| emails.spec.ts | create email password generate button fills field | ✅ | 283ms |
| emails.spec.ts | create email toggle password visibility | ✅ | 375ms |
| emails.spec.ts | create emails and verify dashboard count | ✅ | 3.8s |
| emails.spec.ts | emails accounts search filters rows | ✅ | 323ms |
| emails.spec.ts | edit email page loads for existing account | ✅ | 986ms |
| emails.spec.ts | edit email — suspend incoming | ❌ | 10.9s |
| emails.spec.ts | edit email — suspend outgoing | ❌ | 11.0s |
| emails.spec.ts | edit email — restore allow incoming and outgoing | ❌ | 11.3s |
| emails.spec.ts | edit email — change password via generate button | ❌ | 11.0s |
| emails.spec.ts | edit email — manual password change | ❌ | 11.1s |
| emails.spec.ts | edit email — delete button links to delete page | ✅ | 1.1s |
| emails.spec.ts | connect devices page loads for an email | ✅ | 381ms |
| emails.spec.ts | connect devices back button goes to /emails | ✅ | 496ms |
| emails.spec.ts | webmail autologin and send/receive | ❌ | 21.9s |
| emails.spec.ts | email filters selector page loads | ✅ | 309ms |
| emails.spec.ts | email filters selector navigates to email filter page | ✅ | 403ms |
| emails.spec.ts | email filter GUI page loads for email | ✅ | 393ms |
| emails.spec.ts | email filter — add a filter rule in GUI mode | ✅ | 449ms |
| emails.spec.ts | email filter raw mode shows textarea | ✅ | 364ms |
| emails.spec.ts | import emails page loads | ✅ | 266ms |
| emails.spec.ts | import emails file input accepts csv and xlsx only | ✅ | 230ms |
| emails.spec.ts | import emails back button links to /emails | ✅ | 407ms |
| emails.spec.ts | export emails returns a CSV download | ✅ | 223ms |
| emails.spec.ts | aliases list page loads | ✅ | 594ms |
| emails.spec.ts | new alias page loads | ✅ | 328ms |
| emails.spec.ts | new alias — domain selector updates @domain preview | ✅ | 251ms |
| emails.spec.ts | create alias and verify in list | ✅ | 1.2s |
| emails.spec.ts | aliases search filters rows | ✅ | 313ms |
| emails.spec.ts | alias detail page loads for existing alias | ✅ | 417ms |
| emails.spec.ts | alias detail — add then remove a destination | ✅ | 2.2s |
| emails.spec.ts | delete alias and verify removal | ✅ | 1.3s |
| emails.spec.ts | default address selector page loads | ✅ | 233ms |
| emails.spec.ts | default address domain selector navigates to domain page | ✅ | 353ms |
| emails.spec.ts | default address detail page shows current config or empty state | ✅ | 351ms |
| emails.spec.ts | default address — set and clear catch-all | ✅ | 693ms |
| emails.spec.ts | delete emails and verify dashboard count | ❌ | 6.7s |
| emails.spec.ts | delete email page shows selector when no address given | ✅ | 304ms |
| favorites.spec.ts | Left-click to add | ✅ | 389ms |
| favorites.spec.ts | check table | ✅ | 215ms |
| favorites.spec.ts | Yellow star | ✅ | 826ms |
| favorites.spec.ts | Right-click to remove | ✅ | 451ms |
| favorites.spec.ts | search table | ✅ | 553ms |
| favorites.spec.ts | delete in table | ✅ | 1.6s |
| fixpermissions.spec.ts | fix permissions | ✅ | 5.9s |
| forgot_password.spec.ts | reset password page loads | ✅ | 347ms |
| forgot_password.spec.ts | submit empty email shows error | ✅ | 414ms |
| forgot_password.spec.ts | submit invalid email format shows error | ✅ | 556ms |
| forgot_password.spec.ts | submit valid email shows confirmation | ✅ | 534ms |
| forgot_password.spec.ts | invalid reset token shows error | ✅ | 335ms |
| ftp.spec.ts | create account | ✅ | 2.1s |
| ftp.spec.ts | login, upload, list, download, delete | ✅ | 140ms |
| ftp.spec.ts | password change | ✅ | 4.7s |
| ftp.spec.ts | path change | ✅ | 831ms |
| ftp.spec.ts | filezilla config | ✅ | 110ms |
| ftp.spec.ts | cyberduck config | ✅ | 72ms |
| ftp.spec.ts | search | ✅ | 290ms |
| ftp.spec.ts | account delete | ✅ | 4.4s |
| goaccess.spec.ts | traffic stats page loads | ✅ | 221ms |
| goaccess.spec.ts | traffic stats shows domain list | ✅ | 275ms |
| joomla.spec.ts | tests/joomla.spec.ts › 1. install app | ✅ | 5.5s |
| joomla.spec.ts | tests/joomla.spec.ts › 2. verify app appears on /sites | ✅ | 628ms |
| joomla.spec.ts | tests/joomla.spec.ts › 3. verify app is responding | ✅ | 1.0s |
| joomla.spec.ts | tests/joomla.spec.ts › 4. admin auto-login link generation works | ✅ | 410ms |
| joomla.spec.ts | tests/joomla.spec.ts › 5. remove app | ✅ | 1.2s |
| last_login.spec.ts | table, clipboard, activity link, search filter and dashboard IP | ✅ | 1.0s |
| matomo.spec.ts | tests/matomo.spec.ts › 1. install app | ✅ | 16.5s |
| matomo.spec.ts | tests/matomo.spec.ts › 2. verify app appears on /sites | ✅ | 601ms |
| matomo.spec.ts | tests/matomo.spec.ts › 3. verify app is responding | ✅ | 2.6s |
| matomo.spec.ts | tests/matomo.spec.ts › 4. admin auto-login link generation works | ✅ | 402ms |
| matomo.spec.ts | tests/matomo.spec.ts › 5. remove app | ✅ | 1.2s |
| mediawiki.spec.ts | tests/mediawiki.spec.ts › 1. install app | ✅ | 7.5s |
| mediawiki.spec.ts | tests/mediawiki.spec.ts › 2. verify app appears on /sites | ✅ | 635ms |
| mediawiki.spec.ts | tests/mediawiki.spec.ts › 3. verify app is responding | ✅ | 2.9s |
| mediawiki.spec.ts | tests/mediawiki.spec.ts › 4. admin auto-login link generation works | ✅ | 394ms |
| mediawiki.spec.ts | tests/mediawiki.spec.ts › 5. remove app | ✅ | 1.9s |
| moodle.spec.ts | tests/moodle.spec.ts › 1. install app | ✅ | 1m 39s |
| moodle.spec.ts | tests/moodle.spec.ts › 2. verify app appears on /sites | ✅ | 643ms |
| moodle.spec.ts | tests/moodle.spec.ts › 3. verify app is responding | ✅ | 4.6s |
| moodle.spec.ts | tests/moodle.spec.ts › 4. remove app | ✅ | 4.4s |
| mysql.spec.ts | list databases | ✅ | 344ms |
| mysql.spec.ts | create database | ✅ | 1.3s |
| mysql.spec.ts | show system databases | ✅ | 530ms |
| mysql.spec.ts | show database sizes | ✅ | 359ms |
| mysql.spec.ts | phpmyadmin auto-login | ✅ | 951ms |
| mysql.spec.ts | list users | ✅ | 313ms |
| mysql.spec.ts | show system users | ✅ | 450ms |
| mysql.spec.ts | create user | ✅ | 862ms |
| mysql.spec.ts | change password | ✅ | 689ms |
| mysql.spec.ts | grant CREATE ROUTE privilege | ✅ | 725ms |
| mysql.spec.ts | grant NO privileges | ✅ | 1.2s |
| mysql.spec.ts | grant ALL PRIVILEGES | ✅ | 807ms |
| mysql.spec.ts | revoke privileges | ✅ | 713ms |
| mysql.spec.ts | database wizard | ✅ | 840ms |
| mysql.spec.ts | remote access | ✅ | 27.3s |
| mysql.spec.ts | processlist | ✅ | 246ms |
| mysql.spec.ts | configuration editor | ✅ | 11.6s |
| mysql.spec.ts | import | ❌ | 1.1s |
| mysql.spec.ts | export | ✅ | 2.5s |
| mysql.spec.ts | delete user | ✅ | 547ms |
| mysql.spec.ts | delete database | ✅ | 1.2s |
| nextcloud.spec.ts | tests/nextcloud.spec.ts › 1. install app | ✅ | 34.8s |
| nextcloud.spec.ts | tests/nextcloud.spec.ts › 2. verify app appears on /sites | ✅ | 611ms |
| nextcloud.spec.ts | tests/nextcloud.spec.ts › 3. verify app is responding | ✅ | 3.3s |
| nextcloud.spec.ts | tests/nextcloud.spec.ts › 4. admin auto-login link generation works | ✅ | 415ms |
| nextcloud.spec.ts | tests/nextcloud.spec.ts › 5. remove app | ✅ | 2.1s |
| nodejs.spec.ts | tests/nodejs.spec.ts › 1. create app files | ✅ | 712ms |
| nodejs.spec.ts | tests/nodejs.spec.ts › 2. install app | ✅ | 23.9s |
| nodejs.spec.ts | tests/nodejs.spec.ts › 3. verify app appears on /sites | ✅ | 742ms |
| nodejs.spec.ts | tests/nodejs.spec.ts › 4. verify app is responding | ✅ | 3.5s |
| notifications.spec.ts | notifications page loads | ✅ | 271ms |
| notifications.spec.ts | notifications page has toggles or settings | ✅ | 242ms |
| notifications.spec.ts | save notification preferences | ✅ | 401ms |
| notifications.spec.ts | notification settings persist after reload | ✅ | 1.0s |
| opencart.spec.ts | tests/opencart.spec.ts › 1. install app | ✅ | 4.4s |
| opencart.spec.ts | tests/opencart.spec.ts › 2. verify app appears on /sites | ✅ | 635ms |
| opencart.spec.ts | tests/opencart.spec.ts › 3. verify app is responding | ✅ | 848ms |
| opencart.spec.ts | tests/opencart.spec.ts › 4. admin auto-login link generation works | ✅ | 394ms |
| opencart.spec.ts | tests/opencart.spec.ts › 5. remove app | ✅ | 1.3s |
| passkeys.spec.ts | passkeys settings page loads | ✅ | 241ms |
| passkeys.spec.ts | register a new passkey | ⏭️ | 49ms |
| passkeys.spec.ts | remove a passkey | ⏭️ | 48ms |
| php_extensions.spec.ts | extensions version selector page loads | ✅ | 231ms |
| php_extensions.spec.ts | select version navigates to per-version extensions page | ✅ | 1.4s |
| php_extensions.spec.ts | toggle an extension enable/disable | ✅ | 2.4s |
| php_extensions.spec.ts | available extensions list loads in install modal | ✅ | 2.7s |
| php.spec.ts | list versions | ✅ | 451ms |
| php.spec.ts | change default php version | ✅ | 461ms |
| php.spec.ts | edit php options | ✅ | 3.5s |
| php.spec.ts | edit php.ini files | ✅ | 938ms |
| php.spec.ts | tests/php.spec.ts › filter table rows | ✅ | 570ms |
| php.spec.ts | tests/php.spec.ts › version counter filter | ✅ | 625ms |
| php.spec.ts | tests/php.spec.ts › clear search | ✅ | 914ms |
| php.spec.ts | tests/php.spec.ts › php 8.5 | ⏭️ | 260ms |
| php.spec.ts | tests/php.spec.ts › php 8.4 | ✅ | 13.5s |
| php.spec.ts | tests/php.spec.ts › php 8.3 | ✅ | 19.6s |
| php.spec.ts | tests/php.spec.ts › php 8.2 | ✅ | 14.0s |
| php.spec.ts | tests/php.spec.ts › php 8.1 | ✅ | 14.0s |
| php.spec.ts | tests/php.spec.ts › php 8.0 | ✅ | 13.9s |
| php.spec.ts | tests/php.spec.ts › php 7.4 | ✅ | 14.4s |
| php.spec.ts | tests/php.spec.ts › php 7.3 | ✅ | 14.1s |
| php.spec.ts | tests/php.spec.ts › php 7.2 | ✅ | 14.3s |
| php.spec.ts | tests/php.spec.ts › php 7.1 | ✅ | 14.1s |
| php.spec.ts | tests/php.spec.ts › php 7.0 | ✅ | 14.3s |
| php.spec.ts | tests/php.spec.ts › php 5.6 | ✅ | 14.0s |
| postgresql.spec.ts | list databases | ✅ | 6.5s |
| postgresql.spec.ts | create database | ✅ | 954ms |
| postgresql.spec.ts | list users | ✅ | 310ms |
| postgresql.spec.ts | create user | ✅ | 657ms |
| postgresql.spec.ts | change password | ✅ | 739ms |
| postgresql.spec.ts | assign user to database | ✅ | 819ms |
| postgresql.spec.ts | revoke user from database | ✅ | 811ms |
| postgresql.spec.ts | database wizard | ✅ | 670ms |
| postgresql.spec.ts | processlist | ✅ | 234ms |
| postgresql.spec.ts | configuration editor | ✅ | 1.5s |
| postgresql.spec.ts | remote access | ✅ | 4.1s |
| postgresql.spec.ts | import | ✅ | 1.1s |
| postgresql.spec.ts | delete user | ✅ | 572ms |
| postgresql.spec.ts | delete database | ✅ | 594ms |
| prestashop.spec.ts | tests/prestashop.spec.ts › 1. install app | ❌ | 13m 0s |
| prestashop.spec.ts | tests/prestashop.spec.ts › 2. verify app appears on /sites | ⏭️ | 0ms |
| prestashop.spec.ts | tests/prestashop.spec.ts › 3. verify app is responding | ⏭️ | 0ms |
| prestashop.spec.ts | tests/prestashop.spec.ts › 4. admin auto-login link generation works | ⏭️ | 0ms |
| prestashop.spec.ts | tests/prestashop.spec.ts › 5. remove app | ⏭️ | 0ms |
| process_manager.spec.ts | tests/process_manager.spec.ts › loads process table with at least one row | ✅ | 2.9s |
| process_manager.spec.ts | tests/process_manager.spec.ts › kill a random process, expect toast and row removed | ✅ | 5.0s |
| process_manager.spec.ts | tests/process_manager.spec.ts › refresh and confirm killed PID is absent | ✅ | 5.5s |
| process_manager.spec.ts | tests/process_manager.spec.ts › search filters rows correctly | ✅ | 3.6s |
| python.spec.ts | tests/python.spec.ts › 1. create app files | ✅ | 773ms |
| python.spec.ts | tests/python.spec.ts › 2. install app | ✅ | 25.5s |
| python.spec.ts | tests/python.spec.ts › 3. verify app appears on /sites | ✅ | 681ms |
| python.spec.ts | tests/python.spec.ts › 4. verify app is responding | ✅ | 2.4s |
| resource_usage.spec.ts | Resource Usage page loads with gauges | ✅ | 303ms |
| resource_usage.spec.ts | Resource Usage page shows CPU and RAM gauges when data available | ✅ | 291ms |
| resource_usage.spec.ts | Usage History page loads | ✅ | 351ms |
| resource_usage.spec.ts | Usage History search filters rows | ✅ | 337ms |
| resource_usage.spec.ts | Usage History show all checkbox loads all data | ✅ | 513ms |
| resource_usage.spec.ts | Usage History show all checkbox can be unchecked | ✅ | 490ms |
| resource_usage.spec.ts | Usage History pagination works | ✅ | 314ms |
| resource_usage.spec.ts | View Usage History button navigates correctly | ✅ | 1.1s |
| server_info.spec.ts | server info page | ✅ | 1.1s |
| services.spec.ts | services list page | ✅ | 262ms |
| services.spec.ts | services list contains expected entries | ✅ | 277ms |
| services.spec.ts | webserver service page (nginx / apache / openlitespeed) | ✅ | 412ms |
| services.spec.ts | mysql service page | ✅ | 296ms |
| services.spec.ts | php-fpm-8.5 service page | ✅ | 298ms |
| services.spec.ts | restart a service | ✅ | 348ms |
| services.spec.ts | service version selector | ✅ | 448ms |
| website_builder.spec.ts | website builder install page loads | ✅ | 247ms |
| website_builder.spec.ts | install form has domain selector | ✅ | 282ms |
| website_builder.spec.ts | website builder | ✅ | 7.7s |
| websites.spec.ts | auto-installer page has install links | ✅ | 348ms |
| wordpress.spec.ts | list wordpress sites | ✅ | 238ms |
| wordpress.spec.ts | install wordpress | ✅ | 8.2s |
| wordpress.spec.ts | wordpress security hardening page | ✅ | 130ms |
| wordpress.spec.ts | wordpress vulnerability scan | ✅ | 1.9s |
| wordpress.spec.ts | wp-cli check update preferences check | ✅ | 136ms |
| wordpress.spec.ts | generate backup | ✅ | 8.0s |
| wordpress.spec.ts | list backup | ✅ | 131ms |
| wordpress.spec.ts | wordpress reload data | ✅ | 139ms |
| wordpress.spec.ts | wp manager data | ✅ | 438ms |
| wordpress.spec.ts | live preview | ❌ | 25.4s |
| wordpress.spec.ts | wp-admin autologin | ✅ | 3.3s |
| wordpress.spec.ts | general options | ✅ | 11.7s |
| wordpress.spec.ts | maintenance mode | ✅ | 11.6s |
| wordpress.spec.ts | cache flush | ✅ | 2.6s |
| wordpress.spec.ts | live visitors count | ✅ | 889ms |
| wordpress.spec.ts | waf on/off | ✅ | 6.5s |
| wordpress.spec.ts | wp remove | ✅ | 1.2s |
| wordpress.spec.ts | tests/wordpress.spec.ts › wp-admin - upgrade wordpress core | ✅ | 14.7s |
| wordpress.spec.ts | tests/wordpress.spec.ts › wp-admin - install scrollchart plugin | ✅ | 9.3s |
| wordpress.spec.ts | tests/wordpress.spec.ts › wp-admin - install nexusslash theme | ✅ | 7.8s |
| z-cache.spec.ts | redis | ❌ | 38.9s |
| z-cache.spec.ts | valkey | ✅ | 36.2s |
| z-cache.spec.ts | memcached | ✅ | 9.1s |
| z-cache.spec.ts | elasticsearch | ⏱️ | 1m 0s |
| z-cache.spec.ts | opensearch | ❌ | 8.6s |
| zz-account_language.spec.ts | tests/zz-account_language.spec.ts › locale: sr | ✅ | 1.5s |
| zz-account_language.spec.ts | tests/zz-account_language.spec.ts › locale: bg | ✅ | 984ms |
| zz-account_language.spec.ts | tests/zz-account_language.spec.ts › locale: de | ✅ | 753ms |
| zz-account_language.spec.ts | tests/zz-account_language.spec.ts › locale: es | ✅ | 1.8s |
| zz-account_language.spec.ts | tests/zz-account_language.spec.ts › locale: fr | ✅ | 1.0s |
| zz-account_language.spec.ts | tests/zz-account_language.spec.ts › locale: hu | ✅ | 877ms |
| zz-account_language.spec.ts | tests/zz-account_language.spec.ts › locale: ne | ✅ | 1.1s |
| zz-account_language.spec.ts | tests/zz-account_language.spec.ts › locale: pt | ✅ | 1.2s |
| zz-account_language.spec.ts | tests/zz-account_language.spec.ts › locale: ro | ✅ | 675ms |
| zz-account_language.spec.ts | tests/zz-account_language.spec.ts › locale: ru | ✅ | 1.5s |
| zz-account_language.spec.ts | tests/zz-account_language.spec.ts › locale: tr | ✅ | 1.1s |
| zz-account_language.spec.ts | tests/zz-account_language.spec.ts › locale: uk | ✅ | 889ms |
| zz-account_language.spec.ts | tests/zz-account_language.spec.ts › locale: zh | ✅ | 1.4s |
| zz-account_language.spec.ts | tests/zz-account_language.spec.ts › locale: en | ✅ | 397ms |
| zzz-json_assets.spec.ts | favicon endpoint redirects to a favicon image | ✅ | 316ms |
| zzz-json_assets.spec.ts | favicon endpoint rejects a domain the user does not own | ✅ | 98ms |
| zzz-json_assets.spec.ts | screenshot endpoint returns an image | ✅ | 73ms |
| zzz-json_assets.spec.ts | screenshot endpoint rejects a domain the user does not own | ✅ | 77ms |
| zzz-json_assets.spec.ts | screenshot can be force-regenerated via POST | ❌ | 146ms |
| zzzz-varnish_cache.spec.ts | enable varnish | ❌ | 48.7s |
| zzzz-varnish_cache.spec.ts | should show domains table and enable Varnish | ❌ | 1.0s |
| zzzz-varnish_cache.spec.ts | should display container log and show Varnish Cache & Container stats | ❌ | 5.9s |
| zzzz-varnish_cache.spec.ts | should disable Varnish for domain | ❌ | 1.0s |
| zzzz-varnish_cache.spec.ts | disable varnish | ❌ | 5.9s |
| zzzzz-docker.spec.ts | check columns for docker table | ✅ | 3.9s |
| zzzzz-docker.spec.ts | containers page loads with header and table | ✅ | 890ms |
| zzzzz-docker.spec.ts | containers search filters rows | ✅ | 1.3s |
| zzzzz-docker.spec.ts | containers page New Service button navigates to add form | ✅ | 1.6s |
| zzzzz-docker.spec.ts | edit cpu, ram and toggle container state for all rows | ✅ | 2m 33s |
| zzzzz-docker.spec.ts | add new service form loads | ✅ | 327ms |
| zzzzz-docker.spec.ts | add new service - invalid name shows error | ✅ | 1.5s |
| zzzzz-docker.spec.ts | add new service - image blur suggests service name | ✅ | 460ms |
| zzzzz-docker.spec.ts | add new service - add and remove volume entry | ✅ | 561ms |
| zzzzz-docker.spec.ts | add new service - Back to Containers link works | ✅ | 2.1s |
| zzzzz-docker.spec.ts | delete confirm page loads for a custom service | ✅ | 2.1s |
| zzzzz-docker.spec.ts | delete confirm - core service returns 403 | ✅ | 118ms |
| zzzzz-docker.spec.ts | delete confirm - php-fpm service returns 403 | ✅ | 57ms |
| zzzzz-docker.spec.ts | change mysql page loads | ✅ | 236ms |
| zzzzz-docker.spec.ts | change webserver page loads | ✅ | 243ms |
| zzzzz-docker.spec.ts | logs page loads with container selector | ✅ | 635ms |
| zzzzz-docker.spec.ts | logs page - selecting container loads log content | ✅ | 2.7s |
| zzzzz-docker.spec.ts | logs page - ?container= param pre-selects and loads | ✅ | 2.7s |
| zzzzz-docker.spec.ts | terminal page without container shows service picker | ✅ | 21.6s |
| zzzzz-docker.spec.ts | terminal page - selecting service redirects | ✅ | 21.5s |
| zzzzz-docker.spec.ts | terminal | ❌ | 5.5s |
| zzzzz-docker.spec.ts | terminal - reconnect button appears after disconnect | ✅ | 2.4s |
| zzzzz-docker.spec.ts | containers status endpoint returns JSON | ❌ | 804ms |
| zzzzzz-api.spec.ts | POST /api/malware-scanner/scan runs a real clamscan | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects wrong credentials with 401 | ✅ | 26ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns token shape for valid credentials | ✅ | 302ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects empty body | ✅ | 13ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns a list of API endpoints | ✅ | 851ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › includes a representative sample of modules/api/ routes | ✅ | 13ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › resolves without error | ❌ | 9ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns account fields | ✅ | 30ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects empty body | ✅ | 15ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns a sessions array | ✅ | 22ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unknown session token returns 404 | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns the service list | ✅ | 18.4s |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unknown service returns 404 | ✅ | 11ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects invalid action | ✅ | 12ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns compose config | ✅ | 523ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns running_containers | ✅ | 651ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns state/health shape | ✅ | 646ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unknown service returns 500 | ✅ | 642ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › restart a disposable test service | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns domains with stats availability | ✅ | 9ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns stats availability for TEST_DOMAIN | ✅ | 11ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns sites, counts and technologies | ✅ | 11ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns blocked_ips array | ✅ | 55ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects a request with no valid IPs | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › blocks a scratch IP then removes all blocks | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns a domains map | ✅ | 9ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects missing domain/subdomain | ✅ | 7ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects unowned domain | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › POST creates an entry | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › DELETE removes the entry | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns domains with zone_file_exists flags | ✅ | 11ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 7ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › TEST_DOMAIN returns records or 404 if no zone file | ✅ | 288ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects missing fields | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › POST creates an A record | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › PATCH updates the record | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › DELETE removes the record | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › resets the zone to default | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns a domain->status map | ✅ | 9ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns status and rule exclusions | ✅ | 9ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 7ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects invalid status | ✅ | 9ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › reads current status, flips it, flips it back | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns paginated entries | ✅ | 10ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › ?seconds param is reflected in response | ✅ | 9ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › accepts tags and ids | ✅ | 37ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects unknown id_type | ✅ | 5ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns available php versions | ✅ | 10ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unknown version returns 404 | ✅ | 10ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects missing content | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns available_keys and current_config | ✅ | 12ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects a body with no recognized keys | ✅ | 11ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns extension list | ✅ | 3.0s |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns installable extensions | ✅ | 1.3s |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects empty extensions list | ✅ | 10ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns idle/busy status with no install_id | ✅ | 649ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › enables then disables a low-risk extension | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns webmail running state | ✅ | 100ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an invalid email | ✅ | 12ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns the live webserver config | ✅ | 10ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects missing content | ✅ | 5ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › writes back the same content it read | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns jobs and containers | ✅ | 445ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns raw file content | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects missing fields | ✅ | 7ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an invalid schedule | ✅ | 5ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns log entries or a clear not-found error | ❌ | 650ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an overlong job filter | ✅ | 10ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › POST creates a job | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › PATCH updates the job | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › DELETE removes the job | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 12ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 7ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › protected service name is rejected | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 9ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › restart -> read logs | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns accounts array | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects missing fields | ✅ | 55ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects a path outside /var/www/html/ | ✅ | 61ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns raw connections text | ✅ | 220ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects unknown config type | ✅ | 7ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › POST creates an account | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › PATCH updates the password | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › PATCH updates the path | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › DELETE removes the account | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns status shape | ✅ | 656ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an invalid action | ✅ | 9ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › restarts the service | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns status shape | ✅ | 646ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an invalid action | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › restarts the service | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns status shape | ✅ | 642ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an invalid action | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › restarts the service | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns status shape | ✅ | 640ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an invalid action | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › restarts the service | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns status shape | ✅ | 643ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an invalid action | ✅ | 7ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › restarts the service | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns status and domain_statuses | ✅ | 647ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an invalid action | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns running or stopped shape | ✅ | 641ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns a domain status map | ✅ | 7ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 7ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects invalid status | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › restarts varnish | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns databases array | ✅ | 74ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an invalid database name | ✅ | 5ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects a reserved database name | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns databases/users/assigned_databases | ✅ | 71ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns processlist array | ✅ | 9ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns enabled/server_ip/port | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns configuration and available_keys | ✅ | 9ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects a body with no recognized keys | ✅ | 6ms |
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
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns databases array | ✅ | 59ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects a reserved database name | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns databases/users/assigned_databases | ✅ | 27ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns processlist array | ✅ | 18ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns enabled/server_ip/port | ✅ | 7ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns configuration or a clear container-down error | ✅ | 645ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects a body with no recognized keys | ✅ | 7ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › POST creates a database | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › POST creates a user | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › POST grants privileges | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › PATCH updates the user password | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › DELETE revokes grants | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › DELETE removes the user | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › DELETE removes the database | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › flips the setting and flips it back | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns entries sorted by inode_count | ✅ | 1.7s |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects path traversal | ❌ | 9ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns entries with size/path | ✅ | 753ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects path traversal | ❌ | 17ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns usage data or a clear not-yet-available error | ✅ | 11ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns paginated entries | ✅ | 17ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › ?page=2 is reflected in response | ✅ | 13ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns quarantine_files array | ❌ | 10ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects a directory outside /var/www/html | ✅ | 12ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects a non-existent directory | ✅ | 14ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns an emails array | ✅ | 9ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects missing fields | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns per-domain deliverability checks | ✅ | 521ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an unknown config type | ✅ | 7ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns an aliases array | ❌ | 11ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an invalid target address | ✅ | 19ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 13ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › POST creates a mailbox | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › GET returns the mailbox detail | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › PATCH suspends incoming mail | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › PUT sets a filter | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › POST creates an alias to the mailbox | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › DELETE removes the mailbox | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 7ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects a missing domain_id | ✅ | 10ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unknown site_id returns 404 | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › POST creates a site | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › PUT updates the html/css | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns a sites array | ✅ | 16ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › TEST_DOMAIN returns site detail or 404 if unmanaged | ✅ | 7ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 7ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › kicks off an async scan | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an invalid domain param | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › pagespeed | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › wp-vulnerability | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns sites and count | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects both backup flags disabled | ✅ | 7ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects missing backup_date | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns available hardening rules | ✅ | 16ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 5ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unknown site_id returns 404 | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an unknown action | ✅ | 7ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects a missing domain | ✅ | 6ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › list_plugins | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › list_themes | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › cache_flush | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › creates a backup of TEST_DOMAIN | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns a processes array | ❌ | 21.4s |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an invalid pid | ✅ | 9ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects a pid that is not one of the caller's processes | ✅ | 21.5s |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › returns domains with total | ✅ | 20ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects a missing domain | ✅ | 11ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unowned domain returns 403 | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › TEST_DOMAIN returns status shape | ✅ | 10ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › TEST_DOMAIN returns a docroot | ✅ | 45ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects a docroot outside /var/www/html/ | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › TEST_DOMAIN returns redirect status | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an invalid url | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › TEST_DOMAIN returns ssl_mode | ✅ | 182ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects an unknown action | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › TEST_DOMAIN returns vhost content or 404 | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects empty vhost content | ✅ | 7ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › TEST_DOMAIN returns records or 404 | ✅ | 8ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › rejects missing fields | ✅ | 7ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › POST creates a record | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › DELETE removes the record | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › TEST_DOMAIN returns paginated logs | ✅ | 31ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › POST creates the domain | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › POST suspends it | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › POST unsuspends it | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › DELETE removes the domain | ⏭️ | 0ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › unauthenticated requests are rejected on all protected routes | ❌ | 123ms |
| zzzzzz-api.spec.ts | tests/zzzzzz-api.spec.ts › a garbage bearer token is rejected the same way | ✅ | 25ms |
| zzzzzzz-activity_log.spec.ts | activity log contains all known recorded user actions | ✅ | 452ms |
| zzzzzzz-webserver_conf.spec.ts | access webserver configuration page | ✅ | 272ms |
| zzzzzzz-webserver_conf.spec.ts | editor contains valid config content | ✅ | 308ms |
| zzzzzzz-webserver_conf.spec.ts | save webserver configuration | ✅ | 1.7s |
| zzzzzzz-webserver_conf.spec.ts | invalid config is rejected | ✅ | 1.7s |
| zzzzzzzz-active_sessions.spec.ts | active sessions: search, activity logs, terminate session | ✅ | 1.9s |
| zzzzzzzz-logout.spec.ts | logout | ✅ | 877ms |
| zzzzzzzzz-account_settings.spec.ts | email address | ✅ | 453ms |
| zzzzzzzzz-account_settings.spec.ts | password | ✅ | 2.6s |

</details>
<!-- AUTOMATED-RESULTS:END -->
