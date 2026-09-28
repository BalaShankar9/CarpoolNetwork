# Carpool Network community preview

A focused upgrade for an existing ride-sharing community. It preserves the original red, navy and aqua identity and community artwork. The main journeys are finding a ride, requesting and confirming seats, coordinating a booking and talking with the community. WhatsApp remains optional.

Preview: https://carpool-community-design.balashankarbollineni4.workers.dev

This is a separate Worker and database. The existing production site has not been replaced. No production members or private messages were copied into the preview.

## Local development

Use a current supported Node.js version and Python 3.11 or later. From this directory:

```sh
npm ci
node scripts/init-local.mjs
npm run db:local
npm run dev
```

In a second terminal:

```sh
npm run check
npm test
```

The integration suite is deliberately fixed to `127.0.0.1:8788` and a local D1 database. It creates synthetic members and reads OTP messages from Wrangler's local email simulator. It does not send real email. Database bootstrap is for a fresh local database; use additive migrations for an existing database.

`wrangler.local.jsonc` is exclusively local. `wrangler.jsonc` targets the isolated hosted design preview. Both include daily maintenance. Secrets, local databases, logs and audit files are ignored by Git.

## Components and trust boundaries

- `src/index.js`: existing application API, booking lifecycle, support, moderation and real-time rooms. Database constraints protect seat allocation and transitions across concurrent requests.
- `src/email-auth.js`: short-lived, single-use email codes, attempt limits, rate limits, linking and sign-in. A routine sign-in preserves other authentication methods.
- `src/reliability.js`: metadata scrubbing, issue capture and protected administrator issue routes.
- `public/app.js`, `social.js`, `email-ui.js`: application, conversation and sign-in interfaces. Reconnecting chat reloads persisted messages from D1. A failed send keeps the draft.
- `public/diagnostics.js`: independent reporting interface and bounded automatic error reporting, including before the main application finishes loading.
- `public/focus.css`: layout and usability refinements over the established brand.
- `schema.sql`, `migration-v8.sql`: new-install schema and candidate migration. Production upgrade SQL is separate under `migrations/`.

D1 is the source of truth. A Durable Object per conversation distributes events and tracks recently active visible connections. Presence is not proof that a person is available. HTTPS and conversation authorization protect messages; this application does not claim end-to-end encryption.

Email verification proves inbox access only. It does not verify a phone number, legal identity, licence, insurance or vehicle. The preview does not enable image uploads or automatic publication of messages as listings.

## Verification completed on 28 September 2026

- 19 passing local test results, including the suite container: email signup, expiry/replay/attempt limits, preserved sign-in methods, malformed and cross-origin requests, concurrent seat acceptance, encoded booking rooms, message idempotency, real WebSockets and presence, direct-message consent and blocking, cancellation, private reports, automatic diagnostic redaction/deduplication, email-only profile updates, forged passkey rejection, support privacy and session revocation.
- Hosted synthetic journey: competing last-seat requests; two-member booking conversation, persistence and real-time presence; unrelated-member access denial; administrator unlock, issue retrieval and resolution; cancellation and logout revocation. Test access was revoked and synthetic public listings retired afterward.
- Chrome checks: email signup using the local simulator, posting a ride, sending a message, desktop layout and a 390px phone viewport. The chat composer now stays above mobile navigation.
- Additive production-schema rehearsal with synthetic accounts, posts and a pending booking: 44 new schema objects; original 29 tables and their seeded records unchanged; valid foreign keys; repeat application successful. No production migration was executed.
- Pinned npm dependency audit reports zero known vulnerabilities. The retained passkey vendor bundle is not covered by npm's dependency inventory; see `SOURCE-PROVENANCE.md`.

These results are not a claim of a security certification, load qualification or universal device compatibility.

## Before a public invitation

1. Verify actual code delivery and sign-in with an owned inbox. The sending domain and Worker binding are configured; local simulator tests do not prove inbox delivery.
2. Establish the real owner's administrator role and separate unlock credential after that account has verified its inbox. There is no first-user-becomes-admin path. Confirm support and issue triage with that account.
3. Pilot with at least a driver and rider on real phones. Check booking notifications, reconnect after losing signal, background/resume, installed-app behavior and any passkey options the pilot will use.
4. Review moderator coverage and the privacy/safety copy for the actual operating community. Keep precise pickup details in booking conversations.
5. Rehearse the production upgrade against a current protected backup, check duplicate active bookings, preserve the existing rating-signing keys and record the rollback version. Only then change the public domain.

Read `PRODUCT.md` for scope and release gates, and `migrations/README.md` for deployment order.
