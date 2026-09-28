# Additive upgrade and recovery

No production migration has been executed. The protected 28 September 2026 backup rehearsal includes `production-v8-additive.sql` plus `../migration-mobility.sql` and `../migration-launch.sql`. All 29 original tables and 53 rows were preserved through first and repeated application, trigger removal and forward schema reapplication. Foreign-key checks passed; no duplicate active booking pairs were found. Run `python3 scripts/rehearse-migration.py /path/to/protected-backup.sql` from the project root against a fresh export before a production window. The script never prints database content.

This is schema evidence only. A previous draft incorrectly described a simple rollback to the old production Worker. **Cloudflare does not permit rolling back across a deployment that adds a Durable Object class.** Production currently has `LiveHub`; the candidate also needs `ChatRoom`. See [Cloudflare rollback restrictions](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/). Do not use the preview's migration history for production.

## Preview deployment order

1. Confirm `wrangler.jsonc` targets `carpool-community-design` and its separate D1/R2/DO resources. Export a protected preview backup and record the current version.
2. Apply `migration-v8.sql` if not already present, then `migration-mobility.sql` and `migration-launch.sql`, to that preview database only. New code queries the mobility tables during session/feed loading, so migrate before deploying.
3. Build browser assets, check all scripts and run local tests. Dry-run the Worker build. Preview requires phone, photo and vehicle eligibility. Without configured SMS, unverified members may browse and contact Support but cannot participate. Do not waive that gate silently.
4. Deploy and run `scripts/check-preview.mjs`, then the expanded UI and provider checks. Record the exact deployed version and source commit. Retire synthetic public listings and revoke test sessions/roles afterward.

## Production release gates and order

1. Complete `LAUNCH-PLAN.md`, including configured providers, real owner access and phone pilot. Prepare a separate production configuration using the existing production D1, LiveHub migration history, routing, email and R2 bindings. Keep existing integrity-signing keys and VAPID data; never substitute preview keys.
2. Prepare and rehearse a **compatible forward-recovery Worker** that retains the new `ChatRoom` export/binding/migration history while reverting failing application behavior. An alternative is a rehearsed staged bridge deployment before switching behavior. `src/recovery.js` now supplies a maintenance recovery mode retaining both class exports. A local Worker test confirms HTTP 503, health/database visibility and blocked API writes. `wrangler.recovery.local.jsonc` is local-only. Production-specific hosted migration/recovery remains unqualified, so production release remains blocked. Configure recovery with the exact already-deployed bindings and DO migration history, assets `run_worker_first: true`, and no active cron. It intentionally pauses service instead of serving stale booking behavior.
3. During a controlled write pause, export a fresh protected backup and record current Worker version, deployment, bindings, cron, routing and secret names. Verify original rows, foreign keys, active booking uniqueness and schema drift.
4. Apply only `migrations/production-v8-additive.sql`, followed by `migration-mobility.sql` and `migration-launch.sql`. Never run `schema.sql` against production. The migration must not rewrite bookings to resolve uniqueness conflicts.
5. Deploy the qualified Worker with a new DO migration tag adding `ChatRoom` while preserving production's existing `LiveHub` class type and history. Confirm owner sign-in, admin unlock, reporting and the two-member smoke journey before reopening writes.
6. Enable public indexing/invitations only after verification. Keep private records, test credentials and backups out of source control.

If a release fails, pause the affected writes and deploy the rehearsed compatible recovery artifact. `rollback-v8-triggers.sql` only removes new behavioral triggers; it is not a full application rollback. New tables and post-release records must remain intact. Do not overwrite recent bookings/messages with an old SQL export as routine recovery. D1 Time Travel is disaster recovery requiring explicit assessment of intervening data loss.
