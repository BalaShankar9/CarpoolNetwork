# Carpool Network Worker 5.9.0

This directory is the deployable Cloudflare application. The React/Supabase project at the repository root is legacy and does not build the current public site.

The baseline was recovered from the **active production v5.7 Worker**, version `5f9fba91-35b6-4f54-9e2d-494ba4f065de`, and the public v5.6 frontend. The uploaded v5.8 Worker was not active and was not used. Source recovery removed the missing source-map reference; Wrangler bundles the readable module source here.

## Release changes

- A persistent Report a problem button and signed-out Help & Support route. Reporting runs in a separate script so an app startup failure does not disable it.
- Automatic browser, API and Worker error capture, aggregation and recurrence tracking. No request body, token, form contents, raw error message, IP address or query string is stored in the diagnostic record. Manually submitted descriptions are private and receive a reference.
- Existing admin authentication protects an issue inbox with status filters, resolution notes and an audit trail. Resolved automatic issues reopen on recurrence. Resolved/ignored reports expire after 90 days without recurrence.
- Session recovery instructions now match server behavior. Network errors do not erase remembered credentials; sign-out failures remain visible. Empty POST actions, storage restrictions, timeouts and malformed responses are handled.
- Real calendar-date validation, request size limits, same-origin browser mutation checks, safer push endpoint validation and protection against cancelling departed rides.
- Atomic limits for pending requests, duplicate requests and overlapping bookings across midnight. Repeated quick requests reuse the matching journey. Pending riders can withdraw from My rides.
- UK-time form defaults, accessible control names, dialog keyboard behavior, working alert deep links, clearer dashboard errors, PWA cache fixes and safety/privacy pages.

## Local development

Use Node.js 22 or later and Python 3 for the local fixture tests. On an iCloud-synced Mac, keep the checkout in a `.nosync` directory to avoid file offloading during builds.

```sh
cd cloudflare-worker-v5
npm ci
node test/generate-test-keys.js
npx wrangler d1 execute DB --local --file schema.sql
npx wrangler d1 execute DB --local --file migration-v5-9.sql
npm run dev
```

In another terminal in this directory:

```sh
python3 test/reset-local.py
npm run check
npm test
```

`reset-local.py` recreates the **local disposable fixture database**. Never point it at production. The integration suite refuses a non-local test URL and uses reserved, synthetic phone numbers. Keep the browser idle while resetting fixtures. The tests cover signup, validation, privacy, simultaneous booking acceptance, pending limits, cancellation, community/support actions, diagnostics, administrator permissions, signing and rating integrity, overnight conflicts, scheduled cleanup, recovery and logout. Fault injection is local only.

`test/staging-smoke.js` is explicitly restricted to the dedicated `carpool-network-release-check` Worker. It creates synthetic members and rides there and checks real Cloudflare WebSocket delivery. It must never be redirected to production.

## Production release procedure

1. Run the checks, tests and `npm run dry-run`. Validate the release in isolated staging.
2. Export and verify the existing D1 database. Treat a full export as private member data. Record the current deployed Worker version for rollback.
3. Apply only the additive migration to an existing production database:

```sh
npx wrangler d1 execute DB --remote --file migration-v5-9.sql
npx wrangler deploy --dry-run
npx wrangler deploy
```

Do **not** import `schema.sql` into an existing production database. It is a fresh-database fixture baseline. Do not rerun older migration scripts as a shortcut. The deployment keeps the existing DB, LiveHub namespace, integrity secret names, custom domains and cleanup schedule. Production signing keys remain in Cloudflare secrets; never replace them with the local test keys.

4. Verify `/api/health` returns `5.9.0` and `database: ok`, verify public assets and browser navigation, inspect diagnostics/logs, and compare existing table counts with the backup. Do not create public synthetic rides in production.

For a code rollback, deploy the previously recorded Worker version with Wrangler's rollback command. The additive diagnostic table and triggers can remain. Do not restore the full database over new member activity unless a separately reviewed recovery procedure requires it.

## Operations

Open **My network → Account → Admin Control Room → Reliability & bug reports**, then use the existing separate admin code. Review open and investigating reports regularly. Automatic reports record detectable failures; they do not prove that every possible business flow is correct, and they do not repair themselves. A Worker-wide outage requires Cloudflare's operational logs and external availability monitoring.

The `x-request-id` response header and server error reference identify a request in Worker logs. User-submitted report references identify records in the admin inbox. Worker logs are enabled; traces are sampled at 1%. Query strings are redacted in both. Notification persistence, realtime delivery and push-provider failures also feed the issue inbox.

The app connects members and moves final trip arrangements to WhatsApp. Phone ownership, identity, licences and insurance are not independently verified. The safety page makes this explicit. Notification delivery depends on browser support and permission; live WebSocket delivery has been tested, but delivery to every mobile push provider cannot be guaranteed. Support/bug reports are not an emergency channel.
