# Carpool Network integration audit — 28 September 2026

The reported WhatsApp inconsistency is fixed and deployed to https://carpoolnetwork.co.uk/ and https://www.carpoolnetwork.co.uk/. The signed-in production account was checked after deployment without changing its contact, consent or vehicle data.

## Fixed in this release

- Edit Profile previously read a legacy login identifier instead of the saved WhatsApp contact. Both screens now use the canonical saved contact record.
- Account cards previously repeated static setup instructions. They now show current contact, email, photo and vehicle states from the same records and eligibility rules used for posting and booking.
- Reopening the contact form now restores saved sharing consent. Changing the number clears consent until the member confirms it again.
- SMS prompts depend on the server requirement, not merely provider availability. SMS remains disabled for launch.
- Profile edits preserve the legacy sign-in identifier and saved WhatsApp contact. Contact, photo and vehicle saves refresh account status immediately.
- Pending-photo wording no longer asks members to upload the same photo again. Vehicle records that need rechecking show that state.
- Push and disabled SMS adapters now use the Worker-supported redirect mode and reject unsuccessful responses without following redirects.
- Visiting the public guide no longer overwrites the cached offline application shell. Account load errors now identify the account page correctly.

## Current evidence

| Area | Verification | Result |
|---|---|---|
| Local application/runtime tests | 56 results using real local Worker/D1/WebSockets plus focused unit/runtime suites | Passed |
| Source syntax | 47 application, browser, service-worker, build and test scripts | Passed |
| Hosted integration | 10 groups on an isolated Cloudflare Worker using production participation requirements | Passed; fixtures retired |
| Authentication | Email signup, replay/expiry/attempt limits, legacy and email-only profile edits, synthetic signed passkeys, logout revocation | Passed automated checks |
| Contact privacy | Accepted partners only; unrelated accounts, blocks and cancellations denied; public views exclude numbers | Passed local and hosted checks |
| Booking | Last-seat race, acceptance requirements and cancellation seat restoration | Passed local and hosted checks |
| Chat and presence | Durable persistence, real WebSocket events, deduplication and membership checks | Passed local and hosted checks; Chrome lounge connected |
| Recurring groups | Invitations, date requests, retry safety, private listings/chat, leaving and cancellation | Passed local and hosted checks; Chrome entry flow checked |
| Live trip | Start/finish, consent grants, outsider denial, stop/replay and completion | Passed using synthetic coordinates; physical GPS not qualified |
| Maps/search | Town suggestions, live map tiles, selection autofill, town/radius filtering | Passed Chrome and automated checks |
| Account browser flow | Save contact, profile edit, change contact, reopen consent, reload persistence | Passed on a local synthetic member |
| Mobile | 390×844 account and contact form, document width 390px | Visually checked; no horizontal overflow |
| Production account | Same saved contact in Account and Edit Profile, consent checked, no SMS prompt, saved vehicle checked, email verified | Confirmed in signed-in Chrome |
| Production delivery | 56 asset hashes across apex/www, database health and 12 anonymous-access denials | Passed |
| Dependency audit | Current npm audit | Zero reported vulnerabilities; not a security certification |

The production account correctly shows its profile photo as not added. A photo upload and moderator review are still required before participating. Existing DVLA lookup/save was verified with the owner's actual vehicle in the previous fix; this audit confirmed the saved record remains visible. Neither check establishes ownership, insurance or current roadworthiness.

## Remaining qualification

- Complete a journey on two physical phones, including GPS permission denial, weak signal, hiding/returning to the trip screen and ending the ride. Browser location sharing is foreground-only.
- Verify actual push delivery and passkeys on the intended Android/iPhone devices. Automated protocol and runtime checks do not establish device delivery.
- Review real member photos through the moderator queue. Synthetic approved-photo fixtures were used only in isolated tests.
- Three historical automatic resource/service-worker reports remain under investigation. No browser console errors appeared during the current checks, and all current core assets returned correctly, but the original reports have not been attributed to a proven cause.

These results support a controlled initial rollout. They do not establish 100% reliability or complete every possible browser/device/user scenario. No community message was sent and no real member contact was changed during this audit.

## Deployment

- Production Worker: `d9bc0b46-c465-4924-a7e7-28dc2a3d32b7`
- Preview Worker: `1da2e0a1-9216-4d91-aa90-53b382c1a177`
- Rehearsal Worker: `f8fca625-9498-4a22-ba79-986cd8bb4cc9`
- Draft source PR: https://github.com/BalaShankar9/CarpoolNetwork/pull/3
- No database migrations or changes to secrets were needed for this release.
