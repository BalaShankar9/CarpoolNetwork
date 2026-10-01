# Public launch operations — 1 October 2026

The production app is `cloudflare-community-v8`, deployed with `wrangler.production.jsonc`. The repository root and its older CI are a separate, legacy application. Do not deploy the root build over this service.

## Release checks

1. Install locked dependencies with `npm ci` on Node 24 or later.
2. Run `npm run check` and `npm audit --omit=dev --audit-level=high`.
3. On a fresh isolated checkout only: `node scripts/init-local.mjs`, then `npm run db:local`. Never point these reset/schema commands at production.
4. Start `npm run dev`; run `npm test` and `node scripts/check-public.mjs --base=http://127.0.0.1:8788`.
5. Deploy the rehearsal configuration, then run `CARPOOL_REHEARSAL_CHECK=1 node scripts/check-preview.mjs`. That script refuses production targets and retires its synthetic fixtures.
6. Run public route checks on the rehearsal. Check desktop/mobile layouts, keyboard focus and the signup form. Automated accessibility results are not a complete accessibility certification.
7. Before a schema change, export D1 to `.private/` with mode 600, redirect the entire export log there (it may contain a signed download URL), and run `scripts/rehearse-migration.py` against the export. Never commit exports, secrets, logs or member data.
8. Deploy with the production configuration. Run `node scripts/check-public.mjs`, confirm the health release, verify changed asset hashes on both domains and inspect a fresh browser load.

## Monitoring and triage

- The GitHub `Live site availability` workflow on the default branch requests read-only checks every 15 minutes. GitHub may delay schedules. Receipts are retained for 30 days. Check the operator's existing Actions notification preferences; no new alert recipients are configured.
- It checks both domains, trusted TLS and certificate expiry, HTTP redirects, database health, static help/policy pages, robots/sitemap, anonymous admin denial, private-shell indexing and proper 404s. A failure is retried once, then fails the workflow.
- Daily maintenance runs at 03:17 UTC. Success or failure is recorded in the existing `app_settings` table. A failed run or more than 40 hours without a heartbeat needs investigation. New monitoring has a 40-hour first-run grace period. The first real production heartbeat must still be observed after deployment.
- The private Feedback & bug reports inbox (`/?view=issues`) shows release/maintenance status and manual feedback, ideas and automatic errors. Review daily during launch. Acknowledge safety/support concerns before cosmetic bugs. Reproduce issues in the rehearsal, fix, test and record a clear resolution note. Never resolve an old report solely because a new release exists.
- Automatic reports exclude message/form contents, credentials, query strings and precise location. Do not add session replay or marketing analytics without assessing the data collection and updating the privacy choices.
- Email sending is enabled for the production domain. DKIM, bounce-domain SPF and a DMARC reject policy were observed in DNS. These checks do not establish inbox delivery to every provider. Email is limited to 1,000 per month; SMS is deliberately disabled with zero allowances.
- CPU is bounded at 100 ms per invocation. Check Worker/D1/email usage and quota errors during launch. HTTPS and indexing policy currently run in the Worker for all routes; static asset requests therefore invoke the Worker. If domain-level HTTPS enforcement is later enabled, routing can be narrowed after preserving private-query noindex behavior.

## Recovery and data protection

- D1 Time Travel is enabled. Cloudflare documents a 7-day window on Free and 30 days on Paid. Confirm the account plan before promising a retention period.
- A protected production export taken on 1 October restored into an in-memory SQLite database successfully: 64 tables, 97 rows, no foreign-key errors and no duplicate active rider/offer bookings. Repeated additive migrations and forward schema reapplication preserved every original row. This was an isolated rehearsal, not a production restore.
- No profile-photo objects were referenced in that snapshot. Future active R2 photos need separate backup coverage; D1 Time Travel does not include R2. Do not treat an old SQL export as a complete copy of all future media.
- For an incident requiring writes to pause, use the compatible forward-maintenance entrypoint: `npx wrangler deploy --config wrangler.recovery.production.jsonc`. It retains both deployed Durable Object classes and returns 503. Its bundle was dry-run checked, not deliberately deployed to the live community.
- Recover by deploying a tested compatible forward version with the existing bindings/migration history. Do not deploy an old v5 Worker across the newer Durable Object migration history.
- A production database restore overwrites newer data. Treat it as a separately approved incident action with a fresh snapshot and a plan for recent bookings/messages. Never restore automatically in response to an availability alert.
- The SQL export is in a private local directory and contains member data. Keep it out of shared deliverables. It is a point-in-time checkpoint, not a new indefinite retention policy.

## Owner decisions still needed for a complete public launch

1. Confirm the legal operator name, public contact and applicable correspondence address, whether the service charges a fee, and whether journeys are strictly cost sharing. Use these facts to finalise terms and the privacy notice (controller, lawful bases, rights, recipients/transfers and retention). Do not publish invented company or legal details.
2. Complete a real journey rehearsal on two consenting phones: new email signup and inbox delivery, photo review, driver vehicle check, seat request/acceptance, chat/WhatsApp, cancellation, location permission denied/allowed, weak signal and background/return. Simulator and hosted tests do not replace these checks.
3. Assign a daily support/moderation owner and response expectations, confirm GitHub alert delivery, and observe the first daily maintenance heartbeat. Existing unresolved reports remain in the private queue.
4. Verify Search Console ownership and submit the sitemap. Indexable metadata and a sitemap are published; actual indexing and rankings cannot be guaranteed.
5. Confirm registrar renewal/billing alerts and review the applicable legal/regulatory and insurance position for the actual operating model before paid promotion or expanding scope. No account subscription, marketing campaign or announcement is launched automatically.

## References

- Cloudflare static routing: https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/
- D1 recovery limits: https://developers.cloudflare.com/d1/reference/time-travel/
- Sitemap guidance: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- GitHub schedule limitations: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
- Privacy notice requirements: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/
