# Carpool Network community candidate

A focused upgrade for the existing UK ride-sharing community. It preserves the original red, navy and aqua identity and community artwork. WhatsApp remains optional.

Hosted preview: https://carpool-community-design.balashankarbollineni4.workers.dev

**The latest source changes are not deployed to that preview or production.** The public site remains v5.9.0. This candidate is not approved for public invitations. Read `LAUNCH-PLAN.md` for implementation status and outstanding work.

## Local development

Use a supported Node.js version and Python 3.11 or later:

```sh
npm ci
npm run build
node scripts/init-local.mjs
npm run db:local
npm run dev
```

In a second terminal run `npm run check` and `npm test`. Integration tests target only `127.0.0.1:8788` and local D1, with synthetic members and Wrangler's local email simulator. They do not send real email. A live local Worker is required for the journey suite. The standalone location, vehicle-adapter and service-worker tests can run without it:

```sh
node --test test/locations-vehicles.test.js test/service-worker.test.js
```

`wrangler.local.jsonc` is local only; `wrangler.jsonc` targets the isolated hosted preview. Both include maintenance. Secrets, databases, logs and audit files are excluded from Git. Never apply `schema.sql` to an existing database.

## Components and trust boundaries

- `src/index.js`: account, booking, support and community API; database constraints protect seat allocation and transitions. D1 owns message records; one Durable Object per conversation distributes events and short-lived presence.
- `src/email-auth.js`: single-use email codes, expiry, attempt and rate limits. Normal sign-in preserves existing authentication methods.
- `src/reliability.js`, `public/diagnostics.js`: bounded, scrubbed diagnostics and protected manual reporting, including startup failures.
- `src/places.js`, `public/locations.js`, `public/geo.js`: UK town suggestions, one-shot device geolocation and town-centre radius filters. These are not street-address search or live map tiles.
- `src/vehicles.js`, `public/member-details.js`: server-only DVLA adapter and optional Instagram/Facebook profile links. A key is not configured; live vehicle checks are not verified. Social links are member-provided, not OAuth connections.
- `src/photos.js`, `public/profile-photo.js`: private R2 uploads, metadata removal, pending moderator review and approved public thumbnails. Optional on-device face detection is advisory. No facial recognition or identity proof is claimed.
- `public/app.js`, `social.js`, `email-ui.js`, `focus.css`: member journeys and original-brand refinements. Reconnection reloads persisted messages; failed sends keep the draft.
- `scripts/build-browser.mjs`: bundles pinned SimpleWebAuthn browser code. The server imports the pinned package directly. See `THIRD-PARTY-NOTICES.md`.
- `migration-v8.sql`, `migration-mobility.sql`: additive candidate schema. Production-specific migration and recovery guidance are under `migrations/`.

Presence is recent connection activity, not proof of availability. Email verification proves inbox access, not identity, licence, insurance or vehicle condition. Conversations are authorized over HTTPS; the app does not claim end-to-end encryption.

## Evidence on 28 September 2026

The full local suite passed 30 results before the final small fixes. Those checks covered email signup/replay/expiry/attempt limits, session revocation, signed synthetic passkey registration/login, booking concurrency, private rooms, real WebSockets/presence, blocking, cancellations, diagnostic redaction, town/radius filtering, optional social links, missing-DVLA behavior and R2 photo moderation. The latest focused suite passes 7 checks, including an additional regression against unrelated departure towns. All 24 JavaScript/build/test scripts pass syntax checks. The final full integration rerun is pending because terminal network access is blocked.

Chrome confirmed test-image selection, resize/submission, persisted pending status, moderator replacement request, and the member-visible reason. The fixture is a blank image, not a real member photo or evidence of identity verification. Chrome also confirmed an offline reconnect screen and automatic recovery of the existing account when connectivity returned. Earlier desktop and 390px phone checks covered signup, posting and chat composition. Real-device passkeys, GPS permission, push delivery and background/resume remain unqualified.

A protected production-backup rehearsal preserved all 29 existing tables and 53 rows through both additive migrations, repeat application, trigger removal and schema reapplication. No production migration ran. This does not test runtime rollback; adding the new Durable Object class prevents a simple rollback to the old Worker version.

The recorded npm audit found zero known vulnerabilities. It is a dependency snapshot, not a security certification. The previous hosted core journey passed before these latest source changes; it must be repeated after the next preview deployment.
