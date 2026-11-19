# OpenAdmin e2e plan

Goal: every option in the OpenAdmin GUI has a test that checks its real effect (the user panel, a response header, a DNS answer, an open port, a login), so a release can't ship with an option that silently does nothing.

## How we work

- Run one spec at a time, never in parallel: `npx playwright test -c openadmin/playwright.config.ts --project=tests --no-deps --workers=1 tests/<spec>`. Refresh the session first with `--project=setup` when it's stale.
- Every test puts back what it changed (in `finally`) and deletes the users, domains and mailboxes it made.
- When a test fails, find out whether the test or the product is wrong. Product bugs get fixed in the right repo, deployed to the test server, and added to the changelog of the next version.
- Effect specs are named `*_effect.spec.ts`. Older specs mostly check that a page loads; keep them, and add effect tests next to them.
- Never put server addresses, passwords or tokens in this repo.

## Status

Done, all passing:

- Settings: every page (OpenPanel, General, Defaults, Modules, Custom code, Locales, Notifications, PHP, API, Updates)
- Plans and features: `a-plans-limits`, `features_effect`, `reseller_limits`
- Services: limits, status, logs, FTP settings and quota, Podman
- Security: basic auth, 2FA login, WAF, bot control
- Users: `users_effect` (password, email, plan, language, suspend, rename, delete)
- Server: SSH, swap, timezone, resource usage, processes, crons (incl. the logging switch), migrate, demo mode
- Domains: `domains_effect` (HSTS, Cloudflare only, zone editor, zone delete/create, Caddy editor), templates, rate limit, config, SSL, logs/stats, vhost/Caddy editors, add domain

## Next, in this order

1. **Emails, open failures**
   - `emails_accounts_effect`: the per-test timeout was raised to 120s after the quota test hit 30s; rerun it. The new send restriction and delete tests haven't run yet.
   - `emails_settings_effect`: POP3 and the new IMAP test both failed with "page closed" (test timeout) in the last batch, while POP3 had passed on its own before. Check whether the mail server takes longer to come back when both toggles run back to back, or whether a save didn't recreate it.
   - `emails.spec`: "emails accounts page loads" can't find an element, probably renamed text.
2. **Emails, missing effects**
   - Domain limits (postfwd): a per-domain send limit of 1 lets the first authenticated message through and refuses the second.
   - Webmail SSO: `/emails/webmail/<email>` lands logged in to Roundcube.
   - Other Settings toggles that are visible from outside (e.g. webmail domain served by Caddy).
3. **Backups**
   - `backups_effect` › "a system backup goes to the destination set in Settings": written, not run yet.
   - Admin-run user backups (`/backups/user/run`) and exclusions: need a look at how heavy a run is on the test server before writing a test.
   - Retention counts in days, so a quick test can't see it prune; leave it unless opencli gets a way to fake the date.
4. **Coverage review**: go through the GUI page by page and list every option that still has no effect test, then work down that list.

## Skipped on purpose

- Root password: only the Super Administrator can open it, and the test login is a regular admin. Changing the root password would also lock out SSH.
- Reboot (`reboot.spec.ts`): really reboots the server, so run it only on request.
- Demo mode: once enabled it can only be turned off from the terminal.
- Migrate and DNS cluster: need a second server.

## Test server notes

- It has `autoupdate` and `autopatch` on, so it can update itself overnight and replace a locally built panel image. Check the version before a session.
- To test an OpenPanel change, build the `/openpanel` binary, copy it into a local image `FROM openpanel/openpanel:<version>-orig`, tag it as `<version>` and recreate the `openpanel` container. A `podman cp` into the running container is lost on the next restart.
- opencli is developed on the `podman` branch.

## Product bugs these tests found

Fixed in 2.0.27:

- Logout URL ignored
- Before-startup script never ran
- Proxy/port changes not applied
- Dynamic DNS enabled BIND
- Default locale cached for 24h
- Notification toggles missing or not saved
- FTP limit not enforced
- Feature-only modules not gated
- Service limits not applied live
- SSH settings overridden by the cloud-init drop-in
- Login favicon missing
- Forbidden usernames list ignored its last line
- WordPress profile rows not saved
- Dev mode couldn't be turned off
- Account creation cut off after 30s
- Add domain log not opening on error
- Mail server settings never applied (Roundcube kept the old container)
- A lifted email restriction kept rejecting mail
- `<html lang>` always `en`
- DNS delete/default did nothing
- A recreated zone was never served
