# Release plan and acceptance criteria

Status: **not ready for public launch**. Preserve the familiar red/navy/aqua identity and red-car artwork. Complete coherent journeys before expanding the feature surface. Existing production members and records must survive migration. WhatsApp remains available.

## Current implementation status

| Area | Implemented in candidate | Remaining before the requested launch |
|---|---|---|
| Accounts | Email-code sign-in, logout/revoke, optional PIN/recovery and pinned passkey protocol | Confirm owner inbox/admin access; real email delivery and physical-device passkey pilot |
| Booking | Offers, requests, acceptance, cancellation, seat-race constraints, booking conversations | Real two-person phone pilot, push/background recovery, final candidate rerun |
| Chat and reporting | Persisted community/private messages, consent/blocks, presence, automatic and manual issue capture | Named moderator/support cover; hostile-input/load and real-device pilot |
| Locations | 5,868 UK town suggestions, one-shot GPS-to-town on device, departure radius and optional home-town driver filter | Licensed live-map/address provider; canonical stored place IDs and default city feed; driver search for passenger requests |
| Photos | Private upload, metadata stripping, moderator queue and public approved thumbnail; optional device face hint | Moderator coverage, clear appeal/replacement handling, cross-device checks; photo requirement flags remain disabled |
| Vehicles | Server-side DVLA adapter, declared passenger seats 1–7, status/date display, masked registration before accepted rides | Configure key by secret name/file location, actual DVLA lookup, expiry/exemption policy, enforce eligibility across edit/reopen/accept and future dates before enabling mandatory checks |
| Social profiles | Optional direct Instagram/Facebook links including numeric Facebook profiles | Actual OAuth account connection if required; links are not proof of ownership |
| Live trip location | Not implemented; privacy page explicitly says unavailable | Consent, authenticated recipients, start/stop/completion, stale updates, retention and phone background behavior |
| Regular commutes | Existing one-off booking model | Recurring shift series, exceptions, invitations, group privacy and per-occurrence seat allocation |

Profile photos and vehicle checks have disabled feature flags. Their presence in source must not be described as mandatory enforcement in the deployed app. A DVLA record is not a mechanical inspection, ownership check or insurance/driver-licence verification. DVSA MOT history is a separate integration from DVLA's vehicle enquiry service.

## Product flows to build next

**Location and nearby matching.** Ask for a home town during onboarding; offer optional one-shot location and manual selection. Store a provider/place ID with a canonical label and coordinates, not a home address. Default discovery to that departure city, with a visible city switcher and 5/10/25/50-mile options. Keep the driver's home city separate from the ride's departure: a Cardiff-based driver can deliberately offer a trip from Bristol. Let drivers search passenger requests using their chosen pickup area and time window. Filter in indexed queries with pagination; never let a generic relevance score introduce an unrelated departure. Exact pickup points stay within accepted booking conversations. The current directory cannot resolve every street or point of interest.

**Vehicle eligibility.** Driver adds registration, confirms authorized use and declares passenger seats excluding the driver. Query DVLA using a Worker secret and show the returned fields with the check timestamp. Define exemptions and stale/failed checks explicitly. Validate seat capacity and eligibility on every path that creates, edits, reopens or accepts an offer. Recheck near departure and warn affected passengers if status changes. Passengers should not need to register a vehicle. Full plate access is limited to the owner and confirmed, relevant ride partners; social links remain optional.

**Live location.** Acceptance makes sharing available; it must not silently start tracking. Each participant explicitly starts sharing with the accepted trip members and sees who can view it. Every read, write and WebSocket connection rechecks accepted membership and blocks. The screen displays accuracy and last-update time and marks stale positions. Stop immediately on stop-sharing, cancellation, completion, membership removal or maximum trip duration. Retain only the latest position with a short expiry, separate from analytics and chat history. Use temporary Durable Object state for fan-out with authorization in D1; do not put coordinates in URLs, logs, notifications or diagnostic reports. Verify real iOS/Android background limits before promising continuous tracking. Publish a location-specific privacy notice before enabling this feature.

**Recurring shift groups.** A regular-ride series contains route, UK time zone, weekdays, start/end dates, vehicle and driver. Generate bounded individual occurrences with a unique `(series_id, local_date)` key so retries cannot duplicate trips. Each occurrence owns its seat inventory and booking state. Invite named members; nobody is added without accepting. Support one-day exceptions, holidays, cancellation of one occurrence, and editing future occurrences without changing completed history. Reserve/confirm seats atomically; accepted seats plus new requests cannot exceed declared passenger seats (4 or 7 are passenger counts, not vehicle-total seats). A private group can coordinate the regular journey, but membership is not an automatic confirmed seat. Removing a member revokes chat/location access and addresses their future bookings with an explicit notice. Do not claim DST, shift crossover or recurring capacity works until those cases are tested.

## Release sequence

1. Finish the source candidate and final regression run. Deploy additive schema and source to the separate preview, then repeat hosted booking, chat, photo and reporting tests. Retire synthetic test access after checking.
2. Configure the provided DVLA key as a Worker secret; select a maps provider with permission for autocomplete and stored location data. Never paste keys into browser code, screenshots or Git.
3. Confirm the real owner's verified email and existing protected administrator role. Verify moderation, account recovery and private support/report triage. Do not assign the first signup as owner.
4. Complete and test the requested location, eligibility, tracking and recurring flows above. Keep incomplete features visibly unavailable.
5. Pilot with a driver and multiple riders on real phones, including limited connectivity, lost signal, background/resume, cancel/decline, exhausted seats, permission denial, oversized photos, user blocks and invalid vehicle checks. Use actual configured providers; mocked adapter tests do not qualify integrations.
6. Rehearse a current protected production export and compatible forward recovery. Record binding/version/routing state and preserve production signing keys. Follow `migrations/README.md`; simple rollback across the new Durable Object class is unavailable.
7. Change the public domain only after those gates pass. Start with a small community invitation and staffed reporting, then increase access based on observed reliability.

## Inputs still needed

- The owner's intended app email address (an authenticated Cloudflare identity is not sufficient confirmation).
- The local file path or Cloudflare secret name holding the DVLA key, not the key in chat.
- The chosen maps provider/account, or permission to select one after presenting costs and retention terms.
- Runtime network access for the final full test/deployment commands. File-upload permission is now working but does not grant terminal network access.

## Primary integration references

- [DVLA Vehicle Enquiry Service](https://developer-portal.driver-vehicle-licensing.api.gov.uk/apis/vehicle-enquiry-service/v1.2.0-vehicle-enquiry-service.html)
- [DVSA MOT history authentication](https://documentation.history.mot.api.gov.uk/mot-history-api/authentication/)
- [GeoNames source and attribution](https://download.geonames.org/export/dump/readme.txt)
- [Public Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) — unsuitable for client autocomplete.
- [Cloudflare Worker rollback restrictions](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)
