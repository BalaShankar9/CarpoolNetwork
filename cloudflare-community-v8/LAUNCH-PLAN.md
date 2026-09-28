# Carpool Network public release

Version 8.0.0 is live on https://carpoolnetwork.co.uk/ and https://www.carpoolnetwork.co.uk/. The familiar red/navy/aqua brand and red-car artwork are retained. This is the community's first introduction.

## Launch configuration

- Sign in with a six-digit email code. WhatsApp number and sharing consent are required; contact becomes available only to accepted/completed ride partners.
- The owner explicitly deferred SMS on 28 September 2026. `REQUIRE_PHONE_VERIFICATION=false`, both SMS allowances are zero, and no SMS provider credentials are configured. Saved contacts are not represented as phone-verified.
- A clear profile photo requires moderator approval before participation. Drivers add registration, recent DVLA data and their declared passenger capacity. Vehicle records do not certify ownership, insurance, licence or current condition.
- Community/private chat and online presence, UK town autocomplete and live maps, city/radius discovery, recurring private groups and live-trip coordination are deployed.
- Regular groups are created between connected ride partners, up to four weeks and seven passengers. Joining is separate from requesting and accepting seats for each date.
- Location sharing is optional for current confirmed trip participants. It stops on Stop, closing/hiding the trip screen or finishing. Points expire after 90 seconds without an update. It is foreground coordination, not continuous background tracking.
- Automatic scrubbed diagnostics and private manual problem reporting are enabled. Owner support email: balashankarbollineni4@gmail.com.

## Verified release evidence

- 50 local results pass; 43 application, test and build scripts pass syntax checks.
- Nine hosted smoke groups pass in the isolated release rehearsal with the launch auth settings. They cover contact and photo/vehicle gates, last-seat concurrency, WhatsApp privacy, persisted chat/online presence, administration/reporting, live-trip grants/stop/replay/completion, recurring invitations/per-date bookings/leave/cancel, city/radius filtering and logout revocation. Synthetic fixtures are retired. This does not verify real member photos, vehicles or GPS devices.
- During a controlled production write pause, a fresh protected export was rehearsed and the three additive migrations applied. All original 29 tables/56 rows remained identical; foreign-key checks passed. The existing production D1, LiveHub identity, signing keys and routes were preserved.
- Production R2 photos, email and server-side DVLA secret are configured. Both original domains return v8.0.0 with SMS off; ten deployed asset hashes per domain match the source, and six private endpoints reject anonymous requests.
- Compatible maintenance recovery was tested on the isolated hosted rehearsal before production. Production history now includes ChatRoom; use compatible forward recovery, not a v5 rollback or old database restore.
- Chrome on the original domain rendered town maps, populated the departure field from map selection, exposed email signup with required WhatsApp/consent, and showed the new navigation. No browser errors were observed during these checks.

## Before a broad community invitation

These are remaining real-person operational checks, not implemented features to advertise as certified:

1. Sign in to the existing owner account, verify/link email from Account and exercise photo-review/support administration. Preserve the existing owner identity and credentials. Owner login/unlock was not completed in the signed-out production browser check.
2. Approve suitable real profile photos and verify an actual consenting driver's vehicle. The app enforces these requirements; synthetic test fixtures do not fulfil them for real users.
3. Complete one journey with two consenting phones: email delivery, booking acceptance, chat/WhatsApp contact, denied GPS, sharing stop, weak signal and background/return. Real-device passkeys and push delivery still need testing. Keep WhatsApp available.

The downloadable introduction PDF and message describe deployed capabilities without claiming perfection, inspected vehicles, verified identities or continuous background location. No community announcement was sent automatically.
