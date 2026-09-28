# Carpool Network community candidate

A focused upgrade for the existing UK ride-sharing community. It preserves the original red, navy and aqua identity and community artwork. Members supply a WhatsApp contact for accepted ride partners; opening WhatsApp and sending a message remains their choice.

Hosted preview: https://carpool-community-design.balashankarbollineni4.workers.dev

**This is an isolated preview release candidate, not a production launch.** The public site remains v5.9.0. This candidate is not approved for public invitations. Read `LAUNCH-PLAN.md` for implementation status and outstanding work.

## Local development

Use a supported Node.js version and Python 3.11 or later:

```sh
npm ci
npm run build
node scripts/init-local.mjs
npm run db:local
npm run dev
```

In a second terminal run `npm run check` and `npm test`. Integration tests target only `127.0.0.1:8788` and local D1, with synthetic members and Wrangler's local email simulator. They do not send real email. A live local Worker is required for the journey suite. The standalone phone, eligibility, trip, commute, location, vehicle-adapter and service-worker tests can run without it:

```sh
node --test test/phone-eligibility.test.js test/trips-commutes.test.js test/locations-vehicles.test.js test/service-worker.test.js
```

`wrangler.local.jsonc` is local only; `wrangler.jsonc` targets the isolated hosted preview. Both include maintenance. Secrets, databases, logs and audit files are excluded from Git. Never apply `schema.sql` to an existing database.

## Components and trust boundaries

- `src/index.js`: account, booking, support and community API; database constraints protect seat allocation and transitions. D1 owns message records; one Durable Object per conversation distributes events and short-lived presence.
- `src/email-auth.js`: single-use email codes, expiry, attempt and rate limits. Normal sign-in preserves existing authentication methods.
- `src/reliability.js`, `public/diagnostics.js`: bounded, scrubbed diagnostics and protected manual reporting, including startup failures.
- `src/places.js`, `public/locations.js`, `public/geo.js`: UK town suggestions, one-shot device geolocation and town-centre radius filters. `public/town-map.js` adds on-demand OpenFreeMap tiles through self-hosted MapLibre assets. These are town-centre selections, not street-address search or route estimates.
- `src/vehicles.js`, `public/member-details.js`: server-only DVLA adapter and optional Instagram/Facebook profile links. The provided key is stored only as the preview Worker secret `DVLA_API_KEY`. A direct provider call using the documentation example returned HTTP 200. No real member vehicle has been verified. Social links are member-provided, not OAuth connections.
- `src/contacts.js`, `public/contact-details.js`: validated international WhatsApp format, explicit member consent, accepted/completed-booking authorization, block/cancellation privacy and account export/deletion. SMS verification is required before participation when enabled; only successful provider approval verifies access to a number. Real delivery is awaiting provider setup, not simulated in the app. See SMS-SETUP.md.
- `src/phone-verification.js`: Twilio Verify integration, account-bound code challenges, resend/attempt/send caps and number replacement. No credentials or real SMS delivery are configured yet.
- `src/trips.js`, `public/live-trip.js`: confirmed trip membership, start/finish, explicit foreground location sharing, revocable sharing grants and ephemeral 90-second coordinates.
- `src/commutes.js`, `public/commutes.js`: bounded recurring journeys, invitations, per-date bookings, cancellations and membership removal.
- `src/recovery.js`: maintenance forward-recovery entrypoint; both Durable Object classes remain exported, writes are paused and databases preserved. Local HTTP recovery checks passed; production topology rehearsal is outstanding.
- `src/photos.js`, `public/profile-photo.js`: private R2 uploads, metadata removal, pending moderator review and approved public thumbnails. Optional on-device face detection is advisory. No facial recognition or identity proof is claimed.
- `public/app.js`, `social.js`, `email-ui.js`, `focus.css`: member journeys and original-brand refinements. Reconnection reloads persisted messages; failed sends keep the draft.
- `scripts/build-browser.mjs`: bundles pinned SimpleWebAuthn browser code. The server imports the pinned package directly. See `THIRD-PARTY-NOTICES.md`.
- `migration-v8.sql`, `migration-mobility.sql`, `migration-launch.sql`: additive candidate schema. Production-specific migration and recovery guidance are under `migrations/`.

Presence is recent connection activity, not proof of availability. Email verification proves inbox access, not identity, licence, insurance or vehicle condition. Conversations are authorized over HTTPS; the app does not claim end-to-end encryption.

## Evidence on 28 September 2026

The full local suite passes 49 results, covering email signup/replay/expiry/attempt limits, session revocation, signed synthetic passkey registration/login, booking concurrency, private rooms, real WebSockets/presence, blocking, cancellations, diagnostic redaction, town/radius filtering, social links, DVLA failure handling, R2 photo moderation, WhatsApp onboarding and contact privacy. The syntax check covers all application, test, build and recovery scripts. See the release verification artifact for hosted checks and the deployed version.

Chrome confirmed test-image selection, resize/submission, persisted pending status, moderator replacement request, and the member-visible reason. The fixture is a blank image, not a real member photo or evidence of identity verification. Chrome also confirmed an offline reconnect screen and automatic recovery of the existing account when connectivity returned. Chrome also rendered live town maps at 390px and confirmed that selecting a map town populated the departure field. Earlier desktop and 390px phone checks covered signup, posting and chat composition. Real-device passkeys, GPS permission, push delivery and background/resume remain unqualified.

A protected production-backup rehearsal preserved all 29 existing tables and 53 rows through all three additive migrations, repeat application, trigger removal and schema reapplication. No production migration ran. This does not test runtime rollback; adding the new Durable Object class prevents a simple rollback to the old Worker version.

The strict running-Worker smoke suite additionally enforces all three onboarding flags and verifies location grants through a real Durable Object, recurring group privacy, date requests, city/radius discovery and contact controls. It seeds synthetic verification rows and retires them afterward; no real phone, photo or vehicle is verified by that suite.

The recorded npm audit found zero known vulnerabilities. It is a dependency snapshot, not a security certification. Hosted release checks are recorded separately after deployment.
