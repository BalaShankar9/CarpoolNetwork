# Release plan and acceptance criteria

Status: **isolated preview; not ready for public invitations**. Keep the original red/navy/aqua identity and red-car artwork. Production remains v5.9.0, with no production schema or route changes in this release.

| Area | Implemented and tested in candidate | Remaining qualification |
|---|---|---|
| Sign-in and accounts | Email code, logout and other-session revocation, passkey protocol; verified owner account retained | Owner admin UI check and physical-device passkey/recovery pilot |
| Phone / WhatsApp | Twilio Verify adapter, six-digit code form, expiry/resend/attempt/send caps, unique numbers, number-change protection; contact only after accepted/completed booking | SMS provider account, secrets, approved budget and real delivery. SMS is deliberately unavailable until configured; participation is blocked for unverified accounts. See SMS-SETUP.md |
| Booking and chat | Requests, acceptance, last-seat race protection, cancellation; persisted private/public chat, consent, blocks and presence | Consenting driver/rider phone pilot, push delivery, reconnect and background behavior |
| Discovery | UK town autocomplete, one-shot current-town suggestion, on-demand live maps, city-first home feed, driver search for passenger requests, 0/5/10/25/50 mile radius, paginated search; private listing filtering in one database query | Real-device GPS/permission denial and representative-volume performance. Town centres are not street addresses or driving routes; legacy free text still exists |
| Photos | Mandatory approved photo before participation; private upload, metadata stripping, moderator queue and replacement reasons | Named moderator coverage and suitable real member photos. Optional on-device face detection is advisory, not identity verification |
| Vehicles | Mandatory driver registration, recent server-side DVLA record, dated MOT/tax checks and declared capacity across posting/editing/reopening/acceptance/start; vehicle-change and capacity DB guards | Real member vehicle check. Exempt records require Support review; no automated exemption approval. DVLA does not prove insurance, ownership, licence or current roadworthiness |
| Live trips | Driver start/finish; explicit sharing consent; per-sharing-session grants prevent delayed updates after Stop; current confirmed participants only; block/removal/logout checks; 90-second expiry, twelve-hour trip maximum | Two-person device and weak-network pilot. Sharing is foreground only, stops when closing/hiding the trip screen, and is not promised through phone lock/background |
| Regular commutes | Private four-week schedules, weekday/day-off selections, invitations, separate per-date requests/acceptance/capacity, one-date or future cancellation, removal/leave with future-seat cancellation | Real shift-group pilot. To change a route/time, cancel future dates and create a replacement series; completed history is retained. No automatic renewal/payment collection |
| Reporting and support | Automatic scrubbed error capture, manual issue reports, protected administration and resolution | Named response/moderation coverage and owner control-room exercise |
| Recovery | Additive schema rehearsal preserves all 29 old tables/53 rows from the protected backup; maintenance recovery entrypoint retains DO exports and rejects writes | Fresh production backup and isolated hosted rehearsal of the actual production migration/bindings and forward recovery before any domain change |

## Next release steps

1. Complete preview schema, deploy, run the strict hosted smoke test, and retire test listings and sessions. The main local regression suite uses relaxed photo/phone/vehicle flags for legacy flows; `scripts/check-preview.mjs` separately verifies all three flags enabled, against the running Worker and real Durable Objects. Both are required.
2. Arrange SMS provider/budget and activate through `SMS-SETUP.md`. Do not mark the owner's real number verified through a database edit. Photo and vehicle requirements are enabled in preview; this is a setup gate, not a public-ready claim.
3. Pilot a real authorized vehicle, approved profile photos and multiple consenting driver/rider phones. Exercise signup, actual SMS, denied GPS, low signal, background/return, group invitations, multiple dates, full capacity, cancellation, live sharing and WhatsApp contact. Verify push separately; a mock delivery is not a real notification receipt.
4. The owner checks administrator access and report/photo-review handling and identifies support coverage. Existing owner privileges and production credentials must remain intact.
5. Rehearse a fresh production snapshot and compatible forward maintenance recovery. See `migrations/README.md`; a rollback to the pre-ChatRoom Worker cannot be assumed. No production migration has run.
6. Only after those gates pass, qualify the exact production configuration and conduct a small, staffed community launch. Maintain WhatsApp as the established contact option.

## Boundaries

No claim of universal reliability, identity verification, inspected vehicles, end-to-end encrypted chat or continuous background tracking is made. The supplied DVLA key is a server secret and the provider's documentation-example lookup returned HTTP 200; this is not a real member vehicle check. Social links are optional member-provided links, not Instagram/Facebook OAuth proof. OpenFreeMap is optional; typing towns remains available when maps fail.

The owner email is balashankarbollineni4@gmail.com. SMS setup, real photos/vehicle/pilot participants and staffing are external prerequisites. Keep all private credentials, recovery codes, account data and database backups out of Git.

References: [Twilio Verify](https://www.twilio.com/docs/verify/api), [DVLA](https://developer-portal.driver-vehicle-licensing.api.gov.uk/apis/vehicle-enquiry-service/v1.2.0-vehicle-enquiry-service.html), [Cloudflare rollback restrictions](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/), [OpenFreeMap](https://openfreemap.org/).
