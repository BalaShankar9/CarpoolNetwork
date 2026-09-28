# Carpool Network — focused community release

Purpose: help an existing UK community arrange shared journeys with less uncertainty. WhatsApp remains an optional coordination channel.

## Product decisions

- Preserve the existing red, navy and aqua brand and original community image. Polish navigation, typography, spacing and usability without replacing the visual identity.

- The first screen helps a visitor find or offer a ride. Bookings, conversations and account are always one step away.
- Community chat supports the community; it does not silently turn a conversation into a public listing. Publishing is deliberate.
- Browse before joining. Verify an email before messaging or booking. Clearly distinguish email verification from phone or identity verification.
- A request is not a booking. Show pending, confirmed, declined, cancelled and past journeys explicitly. A past booking is not proof that travel happened.
- Show truthful empty, offline, loading and failure states. Preserve entered messages when delivery fails. Never show fabricated rides, activity, reviews or verification badges.
- Jobs, goods, services and accommodation remain secondary listings, accessible from community rather than the primary navigation.
- Keep member contacts private before booking acceptance. Public chat means visible to signed-in members; private conversations require membership.

## Architecture

Workers serves the API and static application. D1 owns account, booking and message records with database constraints protecting seat allocation and authorization. A Durable Object per conversation distributes changes and short-lived presence; it is not the authoritative message store. Server acceptance precedes a sent state. The browser reloads persisted messages after reconnect. Passkeys use pinned SimpleWebAuthn packages; cryptographic protocol code remains separate from application logic. Error capture stores scrubbed metadata; manual issue descriptions are private to the support/admin workflow.

Version 8 is deployed on the original domains using the existing production D1 and preserved LiveHub namespace. The preview, local database and hosted rehearsal remain isolated. Synthetic fixtures are confined to test environments.

## Release gates

1. Email signup, sign-in, linking, expired/reused codes, logout, device revocation and recovery tested. Real provider delivery must be verified before public signup is enabled.
2. Two different members complete offer → search → request → accept → booking conversation → cancel. Concurrent requests cannot oversell a seat or bypass restrictions.
3. Community and private messages persist, reconnect without gaps, do not duplicate on retry, and enforce blocks, membership removal and logout. Presence reflects recent visible connections rather than claiming a person is available.
4. Desktop and mobile UI, keyboard navigation, long names/messages, empty states, API failure and offline behavior checked in Chrome.
5. Diagnostics work for guests and members; unauthorized users cannot read reports. A named support owner and visible contact route are required for launch.
6. A rehearsed additive migration and protected backup are required, together with a compatible runtime recovery plan that accounts for Durable Object migration restrictions. A small real-device community pilot comes before a broad invitation.

## Provider status

Email sending is configured on production and preview through Cloudflare. SMS is deliberately disabled at the owner's request, with zero send allowances. A WhatsApp number is still required and labelled as member-provided; no phone-access or identity badge is implied. Photo approval and driver vehicle requirements stay enabled.

## Engineering references

- https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- https://developers.cloudflare.com/workers/wrangler/configuration/
- https://developers.cloudflare.com/email-service/get-started/send-emails/
- https://developers.cloudflare.com/email-service/local-development/sending/
- https://developers.cloudflare.com/email-service/platform/pricing/

## Expanded requested scope

See `LAUNCH-PLAN.md` for town/location matching, reviewed profile photos, vehicle records, social links, live trip location and recurring shift groups. It records deployed features separately from real-device/provider checks that have not been performed.
