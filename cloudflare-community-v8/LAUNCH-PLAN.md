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
- Nine hosted smoke groups pass in the isolated release rehearsal with the launch auth settings. They cover contact and photo/vehicle gates, last-seat concurrency, WhatsApp privacy, persisted chat/online presence, administration/reporting, live-trip grants/stop/replay/completion, recurring invitations/per-date bookings/leave/cancel, city/radius filtering and logout revocation. Synthetic fixtures are retired. These synthetic checks do not verify real member photos, vehicles or GPS devices. A separate real DVLA lookup and save was later verified through the production vehicle form on 28 September 2026.
- During a controlled production write pause, a fresh protected export was rehearsed and the three additive migrations applied. All original 29 tables/56 rows remained identical; foreign-key checks passed. The existing production D1, LiveHub identity, signing keys and routes were preserved.
- Production R2 photos, email and server-side DVLA secret are configured. Both original domains return v8.0.0 with SMS off; ten deployed asset hashes per domain match the source, and six private endpoints reject anonymous requests.
- Compatible maintenance recovery was tested on the isolated hosted rehearsal before production. Production history now includes ChatRoom; use compatible forward recovery, not a v5 rollback or old database restore.
- Chrome on the original domain rendered town maps, populated the departure field from map selection, exposed email signup with required WhatsApp/consent, and showed the new navigation.
- The owner completed verified email sign-in on the live www domain. The explicitly designated owner email now has a separate administrator unlock; the legacy owner identity and credentials remain. The live control room and empty photo-review queue loaded. A real launch-issue report was submitted, read and resolved through the owner UI after fixing its inbox click handler.
- The public getting-started page, PDF and WhatsApp image are deployed at `/welcome.html`. Both download QR codes decode to the production URL. Desktop and 390px guide layouts were visually reviewed with no horizontal overflow; all 18 checked launch assets across the two domains match local files.
- Three historical automatic load-error records (two resource errors and a service-worker registration error) are retained as investigating. They did not recur in current checks; all 25 core assets returned HTTP 200 and the current owner console was clear. Their original cause remains unconfirmed.

## Before a broad community invitation

These are remaining real-person operational checks, not implemented features to advertise as certified:

1. Approve suitable real profile photos and check each participating driver's vehicle. The owner's real vehicle lookup/save has now passed on production; this does not qualify other members or certify ownership and condition.
2. Complete one journey with two consenting phones: booking acceptance, chat/WhatsApp contact, denied GPS, sharing stop, weak signal and background/return. Real-device passkeys and push delivery still need testing. Keep WhatsApp available.
3. Monitor the three retained automatic load diagnostics during this first rollout; capture a reproducible case before claiming their root causes are fixed.

The downloadable introduction PDF and message describe deployed capabilities without claiming perfection, inspected vehicles, verified identities or continuous background location. No community announcement was sent automatically.

## DVLA correction verified on production

The Worker rejected `redirect: error` before contacting DVLA, and the previous catch-all mislabeled this as a timeout. The adapter now uses `manual`, rejects every redirect, distinguishes failure types and records safe operational codes. Eight focused tests pass, including a bundled adapter test in Workerd, and 44 scripts pass syntax. The real vehicle form returned and saved a DVLA record with the user-selected four passenger seats. Production version: 073d6c43-5b94-46e1-aa3a-65066ba9bee2. Preview: e7795770-f071-4e2f-bbd2-a7847dde2a1e.


## 28 September account integration follow-up

Fixed the saved WhatsApp mismatch, restored persisted sharing consent, removed incorrect SMS prompts in launch mode, and replaced static setup instructions with current account states. Account status uses the same eligibility rules as booking and posting. Profile edits preserve both contact and legacy login identifiers. Photo and vehicle saves refresh account cards immediately.

The current suite passes 56 local results and 47 syntax checks; isolated hosted validation passes 10 groups including the new canonical contact/account checks. Chrome confirmed contact save/update/reopen/reload, profile editing, maps and mobile layout. Push and SMS outbound requests no longer use the unsupported redirect mode; guide navigation no longer overwrites the offline app shell. Physical-device GPS, push and passkey qualification remains outstanding; these results are not a claim of 100% reliability. See INTEGRATION-AUDIT.md.
