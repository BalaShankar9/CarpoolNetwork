# Carpool Network v8

A focused upgrade for the existing UK ride-sharing community. It preserves the original red, navy and aqua identity and community artwork. Members supply a WhatsApp contact for accepted ride partners; opening WhatsApp and sending a message remains their choice.

Production: https://carpoolnetwork.co.uk/ (also www).

Separate preview: https://carpool-community-design.balashankarbollineni4.workers.dev

**v8.0.0 is deployed to both original domains.** The owner chose verified email plus a required WhatsApp contact for launch; SMS is disabled with zero sending allowance. Original records, signing keys and LiveHub identity are preserved. Read `LAUNCH-PLAN.md` for evidence and remaining real-device checks.

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
- `src/vehicles.js`, `public/member-details.js`: server-only DVLA adapter and optional Instagram/Facebook profile links. The provided key is stored only as a server-side production and preview Worker secret `DVLA_API_KEY`. A direct provider call using the documentation example returned HTTP 200. A real member vehicle lookup and save were verified through the production browser on 28 September 2026; this verifies the record lookup, not ownership or current condition. Social links are member-provided, not OAuth connections.
- `src/contacts.js`, `public/contact-details.js`: validated international WhatsApp format, explicit member consent, accepted/completed-booking authorization, block/cancellation privacy and account export/deletion. The public launch uses verified email and a required member-provided WhatsApp number. SMS is disabled at the owner's request. If enabled in future, only successful provider approval verifies access to a number. See SMS-SETUP.md.
- `src/phone-verification.js`: Twilio Verify integration, account-bound code challenges, resend/attempt/send caps and number replacement. No credentials or real SMS delivery are configured yet.
- `src/trips.js`, `public/live-trip.js`: confirmed trip membership, start/finish, explicit foreground location sharing, revocable sharing grants and ephemeral 90-second coordinates.
- `src/commutes.js`, `public/commutes.js`: bounded recurring journeys, invitations, per-date bookings, cancellations and membership removal.
- `src/recovery.js`: maintenance forward-recovery entrypoint; both Durable Object classes remain exported, writes are paused and databases preserved. Local and isolated hosted recovery checks passed with the production-compatible v1 LiveHub → v2 ChatRoom migration history. Maintenance paused writes and return to the candidate preserved the original fixture records and LiveHub namespace.
- `src/photos.js`, `public/profile-photo.js`: private R2 uploads, metadata removal, pending moderator review and approved public thumbnails. Optional on-device face detection is advisory. No facial recognition or identity proof is claimed.
- `public/app.js`, `social.js`, `email-ui.js`, `focus.css`: member journeys and original-brand refinements. Reconnection reloads persisted messages; failed sends keep the draft.
- `scripts/build-browser.mjs`: bundles pinned SimpleWebAuthn browser code. The server imports the pinned package directly. See `THIRD-PARTY-NOTICES.md`.
- `migration-v8.sql`, `migration-mobility.sql`, `migration-launch.sql`: additive candidate schema. Production-specific migration and recovery guidance are under `migrations/`.

Presence is recent connection activity, not proof of availability. Email verification proves inbox access, not identity, licence, insurance or vehicle condition. Conversations are authorized over HTTPS; the app does not claim end-to-end encryption.

## Evidence on 28 September 2026

The full local suite passes 50 results, covering email signup/replay/expiry/attempt limits, session revocation, signed synthetic passkey registration/login, booking concurrency, private rooms, real WebSockets/presence, blocking, cancellations, diagnostic redaction, town/radius filtering, social links, DVLA failure handling, R2 photo moderation, WhatsApp onboarding and contact privacy. The syntax check covers all application, test, build and recovery scripts. See the release verification artifact for hosted checks and the deployed version.

Chrome confirmed test-image selection, resize/submission, persisted pending status, moderator replacement request, and the member-visible reason. The fixture is a blank image, not a real member photo or evidence of identity verification. Chrome also confirmed an offline reconnect screen and automatic recovery of the existing account when connectivity returned. Chrome also rendered live town maps at 390px and confirmed that selecting a map town populated the departure field. Earlier desktop and 390px phone checks covered signup, posting and chat composition. Real-device passkeys, GPS permission, push delivery and background/resume remain unqualified.

The production upgrade used a controlled write pause and protected backup. All 29 original tables and 56 rows were unchanged after the three additive migrations; foreign keys passed. Both production domains return v8.0.0, use the intended auth flags, match ten checked static assets and reject anonymous access to six private endpoints. Existing D1 and LiveHub identities and signing keys remain. Compatible forward-maintenance recovery was rehearsed separately; a simple rollback to v5 is no longer supported after adding ChatRoom.

The running-Worker smoke suite enforces verified email, required WhatsApp contact, photo approval and vehicle checks with SMS disabled and verifies location grants through a real Durable Object, recurring group privacy, date requests, city/radius discovery and contact controls. It seeds synthetic approved-photo and vehicle records, but no phone-verification rows, and retires the fixtures afterward. No real photo or vehicle is verified by that suite.

The recorded npm audit found zero known vulnerabilities. It is a dependency snapshot, not a security certification. Hosted release checks are recorded separately after deployment.

## Public introduction and owner validation

The live `/welcome.html` page provides a short getting-started guide, downloadable PDF and WhatsApp image using the original community artwork. PDF/image QR codes point to the production website. Desktop and 390px layouts were reviewed. Owner email sign-in, control-room unlock, photo-review queue and the manual report-to-resolution workflow were exercised on production. The owner inbox click handler was corrected to call `renderIssues()` without the browser event argument. Three earlier automatic load diagnostics remain under investigation because their original cause is not known; current assets and console checks did not reproduce them. See LAUNCH-PLAN.md for the remaining physical-device qualification.

## DVLA runtime regression

The 28 September vehicle-check fix replaces unsupported `redirect: error` with `manual` and rejects redirects explicitly, so credentials are never forwarded to another destination. Errors distinguish timeouts, connectivity, authorization, throttling and invalid provider responses. Operational failures record fixed diagnostic codes without plates, keys or provider bodies; failed checks do not write vehicle records. `test/vehicles-runtime.test.js` bundles the real adapter and runs it in Workerd at the production compatibility date with an intercepted provider. The focused vehicle suite has eight passing tests.
