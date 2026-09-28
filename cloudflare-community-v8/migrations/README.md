# Production migration and forward recovery

On 28 September 2026 production moved from v5.9.1 to v8.0.0. The release used `wrangler.recovery.production.jsonc` to pause writes, then exported a fresh private backup, rehearsed it in memory and applied these additive scripts in order:

1. `migrations/production-v8-additive.sql`
2. `migration-mobility.sql`
3. `migration-launch.sql`

All 29 original tables and 56 rows compared exactly before and after the production upgrade. Foreign keys passed. No production member records were copied into preview or hosted rehearsal. Never apply `schema.sql` to the existing production database.

The production migration history is v1 adding SQLite LiveHub, then v2 adding SQLite ChatRoom. Existing LiveHub identity and signing secrets were preserved. Preview has a different history, with both classes added in v1; do not substitute its configuration for production.

## Recovery

Use the already-qualified compatible forward-maintenance configuration:

```
npm exec wrangler -- deploy --config wrangler.recovery.production.jsonc
```

It retains both Durable Object exports and bindings, returns HTTP 503, exposes database health and pauses page/API writes and cron. Investigate and deploy a corrected v8-compatible Worker with `wrangler.production.jsonc` after checks. Preserve newly created bookings, accounts and messages.

Do not roll back to v5: Cloudflare does not support rolling back across the deployment that added a Durable Object class. `rollback-v8-triggers.sql` only removes new behavioural triggers; it is not a complete application rollback. Do not restore an old export over recent member activity as routine recovery.

An isolated hosted rehearsal exercised v1 LiveHub -> v2 ChatRoom, maintenance and return, preserving all original 29 fixture tables/46 rows and LiveHub identity. The production release repeated backup and preservation verification under the actual write pause. Runtime forward maintenance and database preservation are separate evidence.

## Future releases

Confirm Wrangler authentication, record current versions/bindings/routes/secret names, run focused tests and dry-run the build. Export private backups with output redirected to protected logs because Wrangler prints a signed download link. Rehearse any additive schema update with `python3 scripts/rehearse-migration.py /path/to/protected-export.sql`. Never print or commit database contents or credentials.

SMS is intentionally disabled by the owner's launch decision; it is not a deployment blocker. Keep verified email, required WhatsApp contact, approved photos and driver vehicle gates enabled. Use `CARPOOL_REHEARSAL_CHECK=1 node scripts/check-preview.mjs` for hosted synthetic acceptance checks; the script cannot target production.

Reference: https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/
