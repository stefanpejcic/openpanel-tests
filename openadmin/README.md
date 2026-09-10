# OpenAdmin tests

Playwright end-to-end tests for the OpenAdmin (admin) panel.

## Setup

1. Download the tests: `cd /root/playwright-test && git pull`
2. Add logins to `/root/playwright-test/openadmin/.env`:
   ```
   BASE_URL=
   PANEL_USERNAME=
   PANEL_PASSWORD=
   ```

## Run manually

```bash
cd /root/playwright-test && npx playwright test -c openadmin/playwright.config.ts --project=tests --ui
```

## Run headlessly (single worker)

This is what `run-tests.sh` and cron use — no `--ui`, since there's no
display available in cron. Always run this suite with a single worker;
running it in parallel hammers the shared test server and causes
contention-related failures that aren't real bugs.

```bash
cd /root/playwright-test && npx playwright test -c openadmin/playwright.config.ts --project=tests --workers=1
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
chmod +x /root/playwright-test/openadmin/run-tests.sh
```

Add to crontab (`crontab -e`) to run daily at 17:00:

```cron
0 17 * * * /root/playwright-test/openadmin/run-tests.sh >> /root/playwright-test/admin_cron.log 2>&1
```

Full logs, the Playwright HTML report, and the raw JSON results for each
run are kept under `/root/playwright-test/logs/` (not committed to git,
pruned after 30 days). The README below only ever shows the *latest* run.

**Note:** two tests in this suite (`reboot.spec.ts`, and the OpenAdmin
self-restart in `general_settings.spec.ts`) genuinely reboot/restart the
server. Expect a brief outage each time this suite runs.

## Automated Test Results

<!-- AUTOMATED-RESULTS:START -->
### Latest OpenAdmin run

**Last run:** 2026-09-10 15:16:03 UTC  
**Result:** ❌ 14 failed — 262 passed, 14 failed, 115 skipped (391 total) in 10m 56s

#### ❌ Failures

| Test file | Test | Status | Error |
|---|---|---|---|
| aa-users.spec.ts | create user | ❌ | Error: expect(locator).toBeVisible() failed |
| aa-users.spec.ts | test autologin | ❌ | TimeoutError: page.waitForURL: Timeout 20000ms exceeded. |
| aa-users.spec.ts | recreate user | ❌ | Error: expect(locator).toBeVisible() failed |
| domains_add.spec.ts | create domain | ⏱️ | Test timeout of 30000ms exceeded. |
| features.spec.ts | delete a set | ❌ | Error: expect(locator).toBeVisible() failed |
| notifications_top.spec.ts | acknowledge a single unread notification | ❌ | Error: page.goto: net::ERR_CONNECTION_REFUSED at https://185.7.32.112:2087/notifications |
| process_manager.spec.ts | tests/process_manager.spec.ts › search | ❌ | Error: expect(locator).toContainText(expected) failed |
| process_manager.spec.ts | tests/process_manager.spec.ts › strace | ⏱️ | Test timeout of 30000ms exceeded. |
| process_manager.spec.ts | tests/process_manager.spec.ts › kill | ❌ | Error: expect(locator).toBeVisible() failed |
| search.spec.ts | searching an existing username surfaces a user result | ❌ | Error: expect(locator).toBeVisible() failed |
| security_waf.spec.ts | manage rules link navigates to waf rules page | ❌ | Error: expect(page).toHaveURL(expected) failed |
| security_waf.spec.ts | search filters waf rule sets table | ❌ | Error: page.goto: net::ERR_CONNECTION_REFUSED at https://185.7.32.112:2087/security/waf/rules |
| settings_domain_templates.spec.ts | edit zone for a domain | ⏱️ | Test timeout of 30000ms exceeded. |
| users_export.spec.ts | export tab (Enterprise only) offers backup and transfer modes | ❌ | Error: expect(page).toHaveURL(expected) failed |

<details>
<summary>Full results (391 tests)</summary>

| Test file | Test | Status | Duration |
|---|---|---|---|
| a-plans.spec.ts | create new hosting plan and verify all fields | ✅ | 2.1s |
| a-plans.spec.ts | edit hosting plan and verify all fields | ✅ | 2.1s |
| a-plans.spec.ts | delete hosting plan | ✅ | 2.7s |
| a-plans.spec.ts | search hosting plans | ✅ | 1.1s |
| a-plans.spec.ts | check columns for hosting plans | ✅ | 3.8s |
| aa-users.spec.ts | view users | ✅ | 385ms |
| aa-users.spec.ts | create user | ❌ | 2m 0s |
| aa-users.spec.ts | test autologin | ❌ | 20.9s |
| aa-users.spec.ts | open single user | ✅ | 1.3s |
| aa-users.spec.ts | test tabs | ✅ | 2.1s |
| aa-users.spec.ts | toggle columns | ✅ | 7.0s |
| aa-users.spec.ts | delete user | ✅ | 2.0s |
| aa-users.spec.ts | recreate user | ❌ | 2m 0s |
| account.spec.ts | admin is forbidden from the reseller self-service account page | ✅ | 157ms |
| backups_system.spec.ts | system backups page loads with Backups/Runs/Settings tabs | ✅ | 307ms |
| backups_system.spec.ts | backups tab lists archives or shows the empty state | ✅ | 285ms |
| backups_system.spec.ts | search filters the backups table | ⏭️ | 255ms |
| backups_system.spec.ts | runs tab lists run history or shows the empty state | ✅ | 319ms |
| backups_system.spec.ts | settings tab saves and restores destination and retention | ✅ | 769ms |
| backups_user.spec.ts | user backups page loads with Settings/Configuration/Runs tabs and a schedule badge | ✅ | 327ms |
| backups_user.spec.ts | settings tab shows the current schedule choice | ✅ | 274ms |
| backups_user.spec.ts | configuration tab restores and saves the default backup.env | ✅ | 538ms |
| backups_user.spec.ts | runs tab shows run log or the empty state, gated Run Backup Now by schedule | ✅ | 343ms |
| crons.spec.ts | manage crons | ✅ | 7.6s |
| dashboard.spec.ts | access dashboard | ✅ | 332ms |
| dashboard.spec.ts | sidebar | ✅ | 657ms |
| dashboard.spec.ts | dark mode | ✅ | 486ms |
| dashboard.spec.ts | /json/system | ✅ | 903ms |
| dashboard.spec.ts | /json/cpu | ✅ | 1.2s |
| dashboard.spec.ts | /json/memory | ✅ | 141ms |
| dashboard.spec.ts | /json/load | ✅ | 127ms |
| dashboard.spec.ts | /json/disk | ✅ | 127ms |
| demo_mode.spec.ts | demo mode page renders branch matching current state | ✅ | 266ms |
| domains_add.spec.ts | create domain | ⏱️ | 30.1s |
| domains_dns_cluster.spec.ts | dns cluster page renders enabled or disabled branch | ✅ | 357ms |
| domains_dns_cluster.spec.ts | add server form validates IPv4 format client-side | ⏭️ | 247ms |
| domains_dns_cluster.spec.ts | search filters cluster nodes table | ⏭️ | 274ms |
| domains_logs_stats.spec.ts | domain logs selector page loads when no domain chosen | ✅ | 263ms |
| domains_logs_stats.spec.ts | domain access logs table loads with search/columns for a real domain | ⏭️ | 290ms |
| domains_logs_stats.spec.ts | domain goaccess stats page loads or shows not-yet-generated message | ⏭️ | 311ms |
| domains_ssl.spec.ts | ssl management page loads for a domain | ⏭️ | 304ms |
| domains_ssl.spec.ts | ssl status shows AutoSSL, Custom SSL, or Unknown branch | ⏭️ | 286ms |
| domains_ssl.spec.ts | custom certificate upload form is present | ⏭️ | 259ms |
| domains_vhost_caddy_editor.spec.ts | vhost editor loads, edits, saves, and reverts | ⏭️ | 264ms |
| domains_vhost_caddy_editor.spec.ts | vhost editor domain selector page loads when no domain in URL | ✅ | 259ms |
| domains_vhost_caddy_editor.spec.ts | caddyfile editor loads with warning banner | ⏭️ | 286ms |
| domains_vhost_caddy_editor.spec.ts | caddyfile editor domain selector page loads when no domain in URL | ✅ | 276ms |
| emails_actions_extra.spec.ts | per-row actions dropdown exposes password/quota/restrict/delete | ⏭️ | 583ms |
| emails_actions_extra.spec.ts | set quota for an account, then revert to its original value | ⏭️ | 594ms |
| emails_actions_extra.spec.ts | restrictions modal opens for an account (not submitted) | ⏭️ | 589ms |
| emails_actions_extra.spec.ts | delete account modal requires explicit confirm (not confirmed) | ⏭️ | 588ms |
| emails_actions_extra.spec.ts | webmail link opens SSO redirect in a new tab | ⏭️ | 596ms |
| emails_actions_extra.spec.ts | queue retry/delete bulk actions are clickable when messages exist | ⏭️ | 1.5s |
| emails_actions_extra.spec.ts | individual report can be opened from the reports list | ⏭️ | 327ms |
| emails_actions_extra.spec.ts | domain-limits raw mode save persists edited content, then reverts | ✅ | 857ms |
| emails.spec.ts | emails accounts page loads | ✅ | 648ms |
| emails.spec.ts | emails accounts search filters rows | ✅ | 628ms |
| emails.spec.ts | emails accounts webmail link present per row | ✅ | 616ms |
| emails.spec.ts | emails queue page loads | ✅ | 1.5s |
| emails.spec.ts | emails queue refresh button reloads page | ✅ | 2.8s |
| emails.spec.ts | emails queue search filters rows | ✅ | 1.5s |
| emails.spec.ts | emails queue bulk actions visible when messages exist | ✅ | 1.5s |
| emails.spec.ts | emails settings page loads | ✅ | 678ms |
| emails.spec.ts | emails settings shows mailserver status badge | ✅ | 647ms |
| emails.spec.ts | emails settings webmail domain input accepts value | ✅ | 682ms |
| emails.spec.ts | emails settings service toggles are present | ✅ | 637ms |
| emails.spec.ts | emails settings storage type select is present | ✅ | 696ms |
| emails.spec.ts | email rate limits page loads | ✅ | 538ms |
| emails.spec.ts | email rate limits shows rules table or empty state | ✅ | 524ms |
| emails.spec.ts | email rate limits search input filters rows | ✅ | 553ms |
| emails.spec.ts | email rate limits edit pencil opens inline input | ✅ | 545ms |
| emails.spec.ts | email rate limits raw mode toggle shows textarea | ✅ | 366ms |
| emails.spec.ts | emails reports page loads | ✅ | 348ms |
| features.spec.ts | list sets | ✅ | 262ms |
| features.spec.ts | create a set | ✅ | 412ms |
| features.spec.ts | edit features | ✅ | 1.2s |
| features.spec.ts | enable all features | ✅ | 1.4s |
| features.spec.ts | disable all features | ✅ | 1.4s |
| features.spec.ts | delete a set | ❌ | 5.8s |
| features.spec.ts | prevent delete default set | ✅ | 340ms |
| firewall.spec.ts | test firewall gui | ✅ | 1.3s |
| firewall.spec.ts | whitelist an ip address | ✅ | 2.8s |
| general_settings.spec.ts | update proxy and test restart needed msg | ✅ | 11.3s |
| login_2fa.spec.ts | navigating directly to /login/2fa without a pending session redirects to login | ✅ | 255ms |
| notifications_top.spec.ts | notifications page loads with table and edit settings link | ✅ | 338ms |
| notifications_top.spec.ts | search filters the notifications table | ✅ | 1.7s |
| notifications_top.spec.ts | acknowledge a single unread notification | ❌ | 1.1s |
| notifications_top.spec.ts | delete single notification requires a second confirm click | ✅ | 3.6s |
| notifications_top.spec.ts | acknowledge all button is present and submits without confirmation | ✅ | 586ms |
| notifications_top.spec.ts | delete all button requires a second confirm click (not confirmed) | ✅ | 394ms |
| onboarding.spec.ts | onboarding page loads with the intro step | ✅ | 956ms |
| onboarding.spec.ts | Start walks through steps 1-3 with progress indicator and Back navigation | ✅ | 1.4s |
| onboarding.spec.ts | config and user/plan step cards link to their real settings pages | ✅ | 2.2s |
| onboarding.spec.ts | Skip for now leaves onboarding without dismissing it | ✅ | 1.9s |
| process_manager.spec.ts | tests/process_manager.spec.ts › search | ❌ | 5.4s |
| process_manager.spec.ts | tests/process_manager.spec.ts › asc/desc sorting | ✅ | 4.3s |
| process_manager.spec.ts | tests/process_manager.spec.ts › strace | ⏱️ | 30.2s |
| process_manager.spec.ts | tests/process_manager.spec.ts › kill | ❌ | 5.5s |
| reboot.spec.ts | reboot | ✅ | 1.9s |
| search.spec.ts | searching a known page surfaces it in the dropdown and navigates on click | ✅ | 1.4s |
| search.spec.ts | searching an existing username surfaces a user result | ❌ | 5.3s |
| search.spec.ts | searching an existing website surfaces a website result | ⏭️ | 410ms |
| search.spec.ts | clearing the search query restores the dropdown results | ✅ | 751ms |
| security_basic_auth.spec.ts | basic auth settings page loads with expected fields | ✅ | 314ms |
| security_basic_auth.spec.ts | generate password button fills password field | ✅ | 441ms |
| security_basic_auth.spec.ts | toggle password visibility button switches input type | ✅ | 377ms |
| security_basic_auth.spec.ts | save basic auth settings persists username (kept disabled) | ✅ | 586ms |
| security_blacklist_useragents.spec.ts | blacklist useragents page loads with expected fields | ⏭️ | 108ms |
| security_blacklist_useragents.spec.ts | edit and save blacklist useragents list | ⏭️ | 101ms |
| security_blacklist_useragents.spec.ts | restore default fetches default list into textarea | ⏭️ | 108ms |
| security_blacklist_useragents.spec.ts | toggle enable select | ⏭️ | 115ms |
| security_imunify.spec.ts | imunify page renders the branch matching current service state | ✅ | 293ms |
| security_passkeys.spec.ts | passkeys page loads | ✅ | 267ms |
| security_passkeys.spec.ts | shows either domain warning or add-passkey form depending on access method | ✅ | 276ms |
| security_passkeys.spec.ts | existing passkeys list shows rename and remove forms | ⏭️ | 249ms |
| security_passkeys.spec.ts | remove passkey form has a confirm dialog and is not submitted | ⏭️ | 240ms |
| security_twofa.spec.ts | 2fa page loads and shows the correct branch for current state | ✅ | 337ms |
| security_twofa.spec.ts | 2fa code input only accepts 6 digits | ✅ | 268ms |
| security_waf.spec.ts | waf settings page loads with status select and active/total badge | ✅ | 283ms |
| security_waf.spec.ts | manage rules link navigates to waf rules page | ❌ | 5.3s |
| security_waf.spec.ts | search filters waf rule sets table | ❌ | 6.6s |
| security_waf.spec.ts | view rule set opens raw rules in new tab | ✅ | 586ms |
| security_waf.spec.ts | toggle a rule set enable/disable and revert | ✅ | 734ms |
| server_migrate.spec.ts | migrate page shows start form or in-progress status | ✅ | 300ms |
| server_node.spec.ts | default node page loads with expected fields | ✅ | 280ms |
| server_node.spec.ts | default node fields are required | ✅ | 264ms |
| server_resource_usage.spec.ts | resource usage page shows drop-cache and clear-swap controls | ✅ | 579ms |
| server_resource_usage.spec.ts | resource usage history page loads with default line view | ✅ | 570ms |
| server_resource_usage.spec.ts | time range selector changes period via query param | ✅ | 608ms |
| server_resource_usage.spec.ts | view toggle switches between line and grid views | ✅ | 891ms |
| server_resource_usage.spec.ts | refresh button reloads the page | ✅ | 608ms |
| server_root_password.spec.ts | root password page loads with expected fields | ⏭️ | 112ms |
| server_root_password.spec.ts | password field rejects apostrophe via pattern attribute | ⏭️ | 105ms |
| server_ssh.spec.ts | ssh page loads with status indicator and basic tab fields | ✅ | 304ms |
| server_ssh.spec.ts | switching to advanced tab lazy-loads full sshd config | ✅ | 333ms |
| server_ssh.spec.ts | keys tab is only shown when pubkey auth is enabled | ✅ | 313ms |
| server_ssh.spec.ts | tab state persists via URL hash on reload | ✅ | 311ms |
| server_swap.spec.ts | swap page loads with current usage, devices table, and controls | ✅ | 320ms |
| server_timezone.spec.ts | timezone page loads with current timezone and select options | ✅ | 291ms |
| server_timezone.spec.ts | change timezone updates host setting and can be reverted | ✅ | 687ms |
| services_crash_logs.spec.ts | crash logs viewer loads with a log selector | ✅ | 295ms |
| services_crash_logs.spec.ts | selecting a crash log loads its content and reveals download/delete buttons | ⏭️ | 268ms |
| services_crash_logs.spec.ts | selecting a crash log via ?log_name= query param preselects and loads it | ⏭️ | 265ms |
| services_edit.spec.ts | edit services page loads with JSON editor and Go back link | ✅ | 268ms |
| services_edit.spec.ts | invalid JSON is rejected client-side without submitting | ✅ | 402ms |
| services_edit.spec.ts | saving the same (unchanged) JSON round-trips successfully | ✅ | 427ms |
| services_ftp.spec.ts | ftp accounts page renders branch matching current ftp server status | ✅ | 323ms |
| services_ftp.spec.ts | configuration tab navigates to ftp settings page | ✅ | 544ms |
| services_ftp.spec.ts | edit and save ftp configuration, then revert | ✅ | 1.6s |
| services_limits.spec.ts | service limits page loads with per-service-group sections | ✅ | 256ms |
| services_limits.spec.ts | each service group exposes numeric CPU/RAM and boolean fields | ✅ | 282ms |
| services_logs.spec.ts | log viewer page loads with selects and settings link | ✅ | 277ms |
| services_logs.spec.ts | selecting a log file loads its content and reveals download/delete buttons | ✅ | 258ms |
| services_logs.spec.ts | lines-select limits the number of fetched log lines via URL params | ✅ | 268ms |
| services_logs.spec.ts | edit log paths page validates JSON before submitting | ✅ | 384ms |
| services_podman.spec.ts | podman page loads with Info/Images/Volumes/Networks/Disk Usage tabs | ✅ | 1.9s |
| services_podman.spec.ts | info tab shows podman info output by default | ✅ | 1.6s |
| services_podman.spec.ts | images tab lists images with search and bulk action controls | ✅ | 1.6s |
| services_podman.spec.ts | search filters the images table | ✅ | 1.7s |
| services_podman.spec.ts | each downloaded, unused image exposes a Delete control; in-use images do not | ✅ | 1.9s |
| services_podman.spec.ts | volumes tab lists podman volumes | ✅ | 1.6s |
| services_podman.spec.ts | networks tab lists podman networks | ✅ | 1.6s |
| services_podman.spec.ts | disk usage tab shows podman system df output | ✅ | 1.6s |
| services_status.spec.ts | services page lists services with search and edit-services link | ✅ | 392ms |
| services_status.spec.ts | search filters the services table | ✅ | 588ms |
| services_status.spec.ts | each service row exposes start/stop and restart actions | ✅ | 586ms |
| services_status.spec.ts | monitored services link to notifications settings | ✅ | 360ms |
| settings_administrators.spec.ts | administrators page loads with table | ✅ | 255ms |
| settings_administrators.spec.ts | search filters the administrators table | ✅ | 437ms |
| settings_administrators.spec.ts | create, inspect, and delete a new administrator (Enterprise only) | ✅ | 990ms |
| settings_administrators.spec.ts | rename and change-password links navigate to dedicated pages | ✅ | 339ms |
| settings_api.spec.ts | api settings page renders branch matching current state | ✅ | 276ms |
| settings_api.spec.ts | api tester sends a safe GET request and shows response | ⏭️ | 259ms |
| settings_api.spec.ts | view examples loads endpoint documentation | ⏭️ | 254ms |
| settings_caddy.spec.ts | caddy settings page loads without error | ✅ | 128ms |
| settings_caddy.spec.ts | caddy metrics endpoint returns raw text proxy | ✅ | 98ms |
| settings_custom_code.spec.ts | custom code page loads with save button | ✅ | 271ms |
| settings_custom_code.spec.ts | pagespeed api key field edits and saves | ✅ | 641ms |
| settings_custom_code.spec.ts | edit, save, and revert "wp_plugins" textarea | ✅ | 664ms |
| settings_custom_code.spec.ts | edit, save, and revert "wp_themes" textarea | ✅ | 742ms |
| settings_custom_code.spec.ts | edit, save, and revert "forbidden_usernames" textarea | ✅ | 752ms |
| settings_custom_code.spec.ts | edit, save, and revert "restricted_domains" textarea | ✅ | 722ms |
| settings_custom_code.spec.ts | edit, save, and revert "post_update" textarea | ✅ | 659ms |
| settings_custom_code.spec.ts | edit, save, and revert "pre_startup" textarea | ✅ | 701ms |
| settings_custom_code.spec.ts | edit, save, and revert "custom_css" textarea (Enterprise only) | ✅ | 713ms |
| settings_custom_code.spec.ts | edit, save, and revert "custom_js" textarea (Enterprise only) | ⏭️ | 281ms |
| settings_custom_code.spec.ts | edit, save, and revert "in_header" textarea (Enterprise only) | ⏭️ | 277ms |
| settings_custom_code.spec.ts | edit, save, and revert "in_footer" textarea (Enterprise only) | ⏭️ | 283ms |
| settings_custom_code.spec.ts | edit, save, and revert "howto_guides" textarea (Enterprise only) | ✅ | 716ms |
| settings_custom_code.spec.ts | edit, save, and revert "custom_section" textarea (Enterprise only) | ✅ | 701ms |
| settings_custom_code.spec.ts | restore default fetches content into a textarea | ✅ | 686ms |
| settings_defaults.spec.ts | defaults page loads with webserver/database/varnish/php pickers | ✅ | 3.4s |
| settings_defaults.spec.ts | webserver picker selects without submitting | ✅ | 3.4s |
| settings_defaults.spec.ts | autostart services exposes toggleable buttons | ✅ | 3.3s |
| settings_defaults.spec.ts | advanced link navigates to defaults files editor | ✅ | 3.5s |
| settings_defaults.spec.ts | defaults files editor exposes validate/save workflow | ✅ | 294ms |
| settings_domain_templates.spec.ts | edit template: IPv4 Zone | ✅ | 1.0s |
| settings_domain_templates.spec.ts | edit template: IPv6 Zone | ✅ | 1.5s |
| settings_domain_templates.spec.ts | edit template: Default Page | ✅ | 1.2s |
| settings_domain_templates.spec.ts | edit template: Suspended Website | ✅ | 1.2s |
| settings_domain_templates.spec.ts | edit template: Suspended User | ✅ | 1.2s |
| settings_domain_templates.spec.ts | edit template: Apache VHost | ✅ | 1.7s |
| settings_domain_templates.spec.ts | edit template: Nginx VHost | ✅ | 1.1s |
| settings_domain_templates.spec.ts | edit template: OpenResty VHost | ✅ | 1.2s |
| settings_domain_templates.spec.ts | edit template: Varnish Template | ✅ | 1.3s |
| settings_domain_templates.spec.ts | edit template: Caddy VHosts | ✅ | 1.2s |
| settings_domain_templates.spec.ts | edit zone for a domain | ⏱️ | 30.1s |
| settings_license.spec.ts | license page loads with key field and actions | ✅ | 412ms |
| settings_license.spec.ts | verify/downgrade links are gated on having a key set | ✅ | 317ms |
| settings_license.spec.ts | generate support report link is present | ✅ | 261ms |
| settings_locales.spec.ts | locales page loads with table | ✅ | 672ms |
| settings_locales.spec.ts | search filters the locales table | ✅ | 541ms |
| settings_locales.spec.ts | set a different installed locale as default, then revert | ✅ | 884ms |
| settings_locales.spec.ts | install button present for non-installed locales (not clicked) | ✅ | 372ms |
| settings_modules.spec.ts | modules page loads with grid, filters, and save button | ✅ | 380ms |
| settings_modules.spec.ts | search filters the modules grid | ✅ | 602ms |
| settings_modules.spec.ts | category filter buttons toggle active state | ✅ | 599ms |
| settings_modules.spec.ts | a module toggle switch responds to click without saving | ✅ | 545ms |
| settings_modules.spec.ts | enable all / disable all bulk buttons affect toggle states | ✅ | 635ms |
| settings_notifications.spec.ts | notifications settings page loads with email/webhook fields | ✅ | 352ms |
| settings_notifications.spec.ts | edit and save notification email, then revert | ✅ | 789ms |
| settings_notifications.spec.ts | attack-prevention thresholds appear only when attack toggle is enabled | ✅ | 320ms |
| settings_notifications.spec.ts | SMTP fields are present for mail delivery configuration | ✅ | 301ms |
| settings_notifications.spec.ts | service monitoring checkboxes are present | ✅ | 315ms |
| settings_openpanel.spec.ts | openpanel settings page loads with branding/nameserver/display sections | ✅ | 337ms |
| settings_openpanel.spec.ts | edit and save brand name, then revert | ✅ | 683ms |
| settings_openpanel.spec.ts | nameserver and file manager limit fields are present and numeric where expected | ✅ | 337ms |
| settings_openpanel.spec.ts | display toggle switches respond to clicks without saving | ✅ | 316ms |
| settings_php.spec.ts | php settings page loads with options textarea and ini accordions | ✅ | 646ms |
| settings_php.spec.ts | edit and save available php options, then revert | ✅ | 2.1s |
| settings_php.spec.ts | first php.ini accordion expands and collapses | ✅ | 929ms |
| settings_php.spec.ts | edit, save, and revert the first php.ini file | ✅ | 15.9s |
| settings_php.spec.ts | restore default fetches ini content from GitHub | ✅ | 8.8s |
| settings_resellers.spec.ts | resellers page loads with table | ✅ | 249ms |
| settings_resellers.spec.ts | create a new reseller | ✅ | 654ms |
| settings_resellers.spec.ts | edit plans & limits link navigates to update page | ✅ | 314ms |
| settings_resellers.spec.ts | delete reseller (runs last) | ✅ | 594ms |
| shortcuts.spec.ts | all keyboard shortcuts work correctly | ✅ | 11.7s |
| support_report.spec.ts | generating a support report redirects to /license with the report result | ✅ | 1.4s |
| system_ips.spec.ts | GET /system/ips/{username} returns the server's public IP addresses | ✅ | 21ms |
| terminal.spec.ts | terminal page loads for an admin user with expected UI elements | ✅ | 410ms |
| terminal.spec.ts | reconnect button is present | ✅ | 1.9s |
| terminal.spec.ts | shell selector offers bash/sh options | ✅ | 354ms |
| updates.spec.ts | check updates page | ✅ | 766ms |
| updates.spec.ts | update notification preferences | ✅ | 1.8s |
| updates.spec.ts | check changelog link | ✅ | 3.0s |
| users_export.spec.ts | export tab (Enterprise only) offers backup and transfer modes | ❌ | 5.3s |
| users_export.spec.ts | backup mode shows existing backups or the empty state, without generating one | ⏭️ | 385ms |
| users_export.spec.ts | transfer mode exposes the SSH transfer form fields | ⏭️ | 306ms |
| users_import.spec.ts | import account page loads with backup type selector and file picker | ✅ | 320ms |
| users_import.spec.ts | selecting a non-OpenPanel backup type reveals plan selection | ✅ | 367ms |
| users_import.spec.ts | account imports log page lists past import runs or the empty state | ✅ | 272ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/ returns api status | ✅ | 14ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/ with valid credentials returns access token | ⏭️ | 1ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/ with invalid credentials is rejected | ✅ | 7ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/whoami returns the authenticated username | ⏭️ | 1ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/whoami without a token is rejected | ✅ | 8ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/users lists users | ⏭️ | 1ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › mutating verbs on /api/users require auth | ✅ | 23ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/users/<username>/containers lists compose services | ⏭️ | 2ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/users/<username>/containers?stats=1 returns live stats | ⏭️ | 2ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/users/<username>/containers/<action>/<container> requires auth | ✅ | 7ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/domains lists all domains | ⏭️ | 1ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/domains/new requires auth | ✅ | 7ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/domains/<action>/<domain> (suspend/unsuspend/delete) requires auth | ✅ | 15ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/domains/docroot/<domain> returns docroot | ⏭️ | 1ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/domains/docroot/<domain> requires auth | ✅ | 7ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/domains/<domain>/dns returns the zone file | ⏭️ | 1ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/domains/<domain>/dns requires auth | ✅ | 6ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/domains/<domain>/caddy returns the caddy config | ⏭️ | 1ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/domains/<domain>/caddy requires auth | ✅ | 6ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/domains/<domain>/vhost/<username> returns the vhost file | ⏭️ | 1ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/domains/<domain>/vhost/<username> requires auth | ✅ | 6ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/domains/<domain>/ssl returns ssl status | ⏭️ | 1ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/domains/<domain>/ssl action=logs returns issuance logs | ⏭️ | 1ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/domains/<domain>/log returns the paginated access log | ⏭️ | 1ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/domains/<domain>/stats/<username> returns goaccess report | ⏭️ | 4ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/domains/file-templates returns default templates | ⏭️ | 1ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/domains/file-templates requires auth | ✅ | 7ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/dns/cluster returns cluster config | ⏭️ | 1ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/dns/cluster requires auth | ✅ | 8ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/dns/cluster/<ip> checks slave reachability | ⏭️ | 1ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/dns/zone-templates returns ipv4/ipv6 templates | ⏭️ | 1ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/dns/zone-templates requires auth | ✅ | 6ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/plans lists plans | ⏭️ | 1ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › plan lifecycle: POST create -> GET -> PUT edit -> DELETE | ⏭️ | 1ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › PATCH /api/plans/<id> requires auth | ✅ | 6ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/services lists monitored services | ⏭️ | 1ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › PUT /api/services requires auth | ✅ | 6ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/services/status checks services status | ⏭️ | 1ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/services/<action>/<service_name> requires auth | ✅ | 8ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/docker/info returns docker info | ⏭️ | 1ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/ips lists dedicated ip users | ⏭️ | 1ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/system returns system information | ⏭️ | 1ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/usage/cpu returns usage data | ⏭️ | 1ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/usage/memory returns usage data | ⏭️ | 1ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/usage/server returns usage data | ⏭️ | 1ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/usage/disk returns usage data | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/notifications lists notifications | ⏭️ | 2ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/notifications/<id>/read marks a notification as read | ⏭️ | 1ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › DELETE /api/notifications/<id> requires auth | ✅ | 7ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › DELETE /api/notifications/<id>?command=delete_all requires auth | ✅ | 5ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/emails/settings returns mailserver settings | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/emails/settings requires auth | ✅ | 6ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/emails/accounts lists mailboxes | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST and DELETE /api/emails/accounts require auth | ✅ | 11ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/emails/queue views the mail queue | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/emails/queue requires auth | ✅ | 5ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/emails/domain-limits views postfwd rules | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/emails/domain-limits?hits=<domain> views hit counters | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/emails/domain-limits requires auth | ✅ | 6ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/security/basic-auth returns basic auth config | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/security/basic-auth requires auth | ✅ | 5ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/security/blacklist-useragents returns the blacklist | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/security/blacklist-useragents requires auth | ✅ | 5ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/security/disable-admin requires auth (never executed) | ✅ | 5ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/security/firewall checks CSF availability | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/security/firewall requires auth | ✅ | 8ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/security/waf returns WAF status | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/security/waf requires auth | ✅ | 5ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/security/waf/rules lists WAF rule sets | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/security/waf/rules requires auth | ✅ | 8ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/security/2fa returns 2FA status | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/security/2fa/enable and /disable require auth | ✅ | 12ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/security/passkeys lists passkeys | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST and DELETE /api/security/passkeys require auth | ✅ | 13ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/server/crons lists cronjobs | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/server/crons requires auth | ✅ | 5ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/server/ssh returns ssh status/config/keys | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/server/ssh requires auth | ✅ | 6ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/server/ssh/config returns raw sshd_config | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/server/ssh/config requires auth | ✅ | 7ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/server/timezone returns current timezone | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/server/timezone requires auth | ✅ | 5ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/server/memory/drop-cache requires auth (not executed) | ✅ | 5ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/server/memory/drop-swap requires auth (not executed) | ✅ | 5ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/server/processes lists processes sorted by memory | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/server/processes/<pid>/kill requires auth (not executed) | ✅ | 6ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/server/node returns default clustering node | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/server/node requires auth | ✅ | 5ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/server/root-password requires auth (not executed) | ✅ | 5ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/server/reboot requires auth (not executed) | ✅ | 5ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/server/reboot/status reports panel availability | ⏭️ | 3ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/server/migrate reports migration status | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/server/migrate requires auth (not executed) | ✅ | 6ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/settings/administrators lists admin accounts | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/settings/administrators requires auth | ✅ | 8ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/settings/resellers lists reseller accounts | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/settings/resellers requires auth | ✅ | 5ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/settings/general returns general settings | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/settings/general requires auth | ✅ | 5ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/settings/defaults returns default env/services | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/settings/defaults requires auth | ✅ | 5ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/settings/defaults/files returns compose/env templates | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST and DELETE /api/settings/defaults/files require auth | ✅ | 13ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/settings/defaults/files/<username> returns per-user files | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/settings/defaults/files/<username> requires auth | ✅ | 5ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/settings/features lists feature sets | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/settings/features/default views the default feature set | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › feature set lifecycle: create -> update -> delete | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/settings/locales lists locales | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/settings/locales requires auth | ✅ | 9ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/settings/modules lists enabled modules | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/settings/modules requires auth | ✅ | 10ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/settings/custom-code returns custom code snippets | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/settings/custom-code requires auth | ✅ | 10ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/settings/php returns php options | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/settings/php requires auth | ✅ | 8ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/settings/caddy/metrics returns prometheus metrics | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/settings/updates returns update preferences | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/settings/updates requires auth | ✅ | 7ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/settings/updates/now requires auth (not executed) | ✅ | 6ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/settings/updates/tags lists available image tags | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/settings/updates/tags requires auth (not executed) | ✅ | 5ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/settings/notifications returns notification preferences | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/settings/notifications requires auth | ✅ | 6ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/license returns license info | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST and DELETE /api/license require auth (not executed) | ✅ | 12ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/license/info returns detailed license info | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/license/verify verifies the license | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/support/report generates a diagnostics report | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/import/cpanel lists import job statuses | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/import/<panel_type> requires auth (not executed) | ✅ | 6ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/import/backup-files lists discovered backup archives | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/import/transfers lists transfer log files | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › POST /api/import/transfers requires auth (not executed) | ✅ | 5ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/import/transfers/<username> lists per-user transfer logs | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/import/logs/account/<log> handles missing log gracefully | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › GET /api/import/logs/transfer/<log> handles missing log gracefully | ⏭️ | 1ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › user lifecycle: create -> suspend -> unsuspend -> delete | ⏭️ | 0ms |
| zzz-api_endpoints.spec.ts | tests/zzz-api_endpoints.spec.ts › domain lifecycle: new -> suspend -> unsuspend -> docroot -> delete | ⏭️ | 0ms |

</details>
<!-- AUTOMATED-RESULTS:END -->

