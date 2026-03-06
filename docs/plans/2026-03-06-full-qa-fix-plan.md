# Full QA Fix Plan -- 339 Issues Across 10 Modules

Generated: 2026-03-06
Audit: 10 parallel agents simulating real users testing every feature

## Priority Legend
- P0: App-breaking / security / data corruption -- fix immediately
- P1: Major UX failures / wrong data shown -- fix before release
- P2: Medium bugs / dead features / inconsistencies -- fix soon
- P3: Polish / dead code cleanup / minor UX -- fix when time allows

---

## MODULE 1: Critical Runtime Bugs (P0)

### 1A. BookingDetails infinite loading spinner
- `src/pages/BookingDetails.tsx:144-189` -- `setLoading(false)` never called on success path
- Fix: Add `setLoading(false)` after line 182

### 1B. Dashboard crashes on null average_rating
- `src/components/dashboard/Dashboard.tsx:128` -- `profile?.average_rating.toFixed(1)` throws TypeError for new users
- Fix: `(profile?.average_rating || 0).toFixed(1)`

### 1C. Home page stats always show 0
- `src/pages/Home.tsx:101-105` -- `head: true` returns no data rows, so `.length` is always 0
- Fix: Use the `count` variable from the response instead of `data?.length`

### 1D. Password change doesn't verify current password
- `src/pages/SecuritySettings.tsx:22-57` -- `updateUser()` called without verifying old password
- Fix: Add current password input field and re-authenticate before changing

### 1E. Share tokens use Math.random() (not crypto-secure)
- `src/services/safetyService.ts:467-474` and `src/services/emergencyService.ts:377-384`
- Fix: Replace with `crypto.getRandomValues()` / Web Crypto API

### 1F. Realtime subscriptions have NO user filter
- `src/contexts/RealtimeContext.tsx:164-177` (bookings) and `180-205` (messages)
- Every user receives ALL booking/message events globally -- N-squared at scale
- Fix: Add `filter: 'user_id=eq.${user.id}'` or relevant column filter

### 1G. Admin search has PostgREST injection risk
- `src/pages/admin/NotificationsManagement.tsx:110` and `src/pages/admin/BulkOperations.tsx:126-129`
- Fix: Sanitize search input (escape special PostgREST chars)

### 1H. Admin role/permissions not cleared on signout
- `src/contexts/AuthContext.tsx:68-77` -- SIGNED_OUT event doesn't clear adminRole/permissions
- Fix: Set adminRole to null and permissions to empty on signout

---

## MODULE 2: Security Fixes (P0)

### 2A. Emergency contacts delete/update not scoped to user_id
- `src/components/profile/EmergencyContactsManager.tsx:87-97,134-148`
- Fix: Add `.eq('user_id', profile?.id)` to both queries

### 2B. EditRideModal missing driver_id check on update
- `src/components/rides/EditRideModal.tsx:172`
- Fix: Add `.eq('driver_id', user.id)` to the update query

### 2C. Cookie consent is purely cosmetic (PECR violation)
- `src/components/shared/CookieConsent.tsx` -- saves preference but nothing reads it
- Fix: Check `cookie_consent_v1` before loading analytics scripts

### 2D. Dispute service has payment/refund logic
- `src/services/disputeService.ts:55-56,265-266,367-408` -- contradicts "no payments" model
- Fix: Remove `creditAmount`, `refundAmount`, `processCompensation()`, payment dispute type

### 2E. Duplicate account deletion flows
- `src/pages/SecuritySettings.tsx:60-78` (hard delete) vs `src/components/settings/DataSettings.tsx:81-107` (soft delete)
- Fix: Consolidate to one flow; ensure auth account is also cleaned up

### 2F. Public profile fallback may leak private fields
- `src/services/publicProfiles.ts:7-22` -- fallback bypasses view security boundary
- Fix: Explicitly select only public fields in fallback query

### 2G. Spam filter regex has stateful bug (global flag + .test())
- `src/services/moderationService.ts:76-80,101-106`
- Fix: Remove `g` flag from SPAM_PATTERNS regexes

### 2H. Admin pages missing PermissionGuard
- PlatformSettings, SystemHealth, BulkOperations, etc. only use route-level AdminRoute
- Fix: Add `<PermissionGuard>` at page level for role-specific pages

---

## MODULE 3: Wrong Data / Fake Stats Shown to Users (P0-P1)

### 3A. Hardcoded fake response rate (95%) on profiles
- `src/components/profile/StatisticsDashboard.tsx:15-16` and `src/pages/PublicProfile.tsx:124`
- Fix: Either compute from real data or remove the stat entirely

### 3B. Hardcoded fake admin analytics change percentages
- `src/pages/admin/AdvancedAnalytics.tsx:228-249`
- Fix: Compute real deltas or show "N/A"

### 3C. Safety analytics falls back to mock data silently
- `src/services/safetyAnalyticsService.ts:207-208,409,432-471`
- Fix: Show error state instead of mock data; remove hardcoded area scores

### 3D. Corporate dashboard has fabricated metrics
- `src/components/corporate/CorporateDashboard.tsx:182-204` and `CompanyDashboard.tsx:125`
- Fix: Remove corporate module (dead code) or wire to real data

### 3E. Reliability score uses wrong scale (0-5 thresholds on 0-100 data)
- `src/pages/MyRides.tsx:1202-1205`
- Fix: Change thresholds to 90/70 instead of 4.5/3.5

### 3F. Data usage values in settings are hardcoded fakes
- `src/components/settings/DataSettings.tsx:157-173`
- Fix: Remove fake values or compute real storage usage

### 3G. "Money Earned" terminology persists in analytics exports
- `src/services/analyticsService.ts:14,52,172,227,275,294,573,583`
- Fix: Replace with "Community Impact" / "Fuel Contributions"

---

## MODULE 4: Broken Features (P1)

### 4A. Theme/dark mode saves but never applies to DOM
- `src/components/settings/AppearanceSettings.tsx:77-98`
- Fix: Connect to AccessibilityContext or add DOM class toggling

### 4B. Accessibility settings save to wrong system (DB vs localStorage)
- `src/components/settings/AccessibilitySettings.tsx` vs `src/components/accessibility/AccessibilitySettings.tsx`
- Fix: Use the accessibility/ version that actually works, or wire settings/ to AccessibilityContext

### 4C. RideStatusTracker realtime subscription never cleaned up (memory leak)
- `src/components/rides/RideStatusTracker.tsx:37-41`
- Fix: Capture and return cleanup function from useEffect

### 4D. Weather API N+1 problem (50 HTTP calls per page load)
- `src/pages/FindRides.tsx:208-219`
- Fix: Remove per-ride weather or batch/cache weather calls

### 4E. Realtime subscription triggers full reload with weather
- `src/pages/FindRides.tsx:102-126`
- Fix: Debounce or use targeted updates instead of full reload

### 4F. Notification panel missing click-through for most types
- `src/components/notifications/NotificationsPanel.tsx:32-51`
- Fix: Add route handlers for RIDE_MATCH, BOOKING_*, REVIEW, SAFETY_ALERT

### 4G. Notification settings checkboxes are non-functional
- `src/pages/Notifications.tsx:326-357`
- Fix: Add onChange handlers and persist to DB, or remove the panel

### 4H. "Request Ride" button shown when already booked
- `src/pages/FindRides.tsx:821-829`
- Fix: Hide button when `ride.userBooking` exists and is not cancelled

### 4I. RequestRide service gating bypassed
- `src/pages/RequestRide.tsx:19`
- Fix: Call `checkAccess()` before submission and render `<ServiceGatingModal />`

### 4J. Driver ride cancellation doesn't update bookings or notify passengers
- `src/pages/MyRides.tsx:461-482`
- Fix: Cancel associated bookings and send notifications via RPC

### 4K. Phone verified badge falsely shows for unverified phone
- `src/components/profile/VerificationBadges.tsx:86`
- Fix: Remove `!!profile?.phone` fallback; only use `phone_verified` field

### 4L. Preferences saved to wrong table (onboarding vs profile)
- Onboarding saves to `profiles`, Profile page reads from `user_preferences`
- Fix: Consolidate to one table

### 4M. Dynamic Tailwind classes broken in production
- `src/components/profile/DocumentUploadCenter.tsx:226`
- Fix: Use explicit class mappings instead of string interpolation

### 4N. Wrong table names break achievements and referrals
- `src/services/achievementService.ts:209,228` -- `bookings` vs `ride_bookings`, `friends` vs `friendships`
- `src/services/referralService.ts:230`
- Fix: Use correct table names

### 4O. Emergency contact notifications are console.log only
- `src/services/emergencyService.ts:228`
- Fix: Wire to actual notification delivery or clearly mark as placeholder

### 4P. SOS requires rideId -- can't be used outside a ride
- `src/services/safetyService.ts:235-278`
- Fix: Make rideId optional

### 4Q. Profanity filter uses placeholder words only
- `src/services/moderationService.ts:68-73`
- Fix: Add real word list or integrate a library

### 4R. License rejection doesn't update the license record
- `src/pages/admin/VerificationQueue.tsx:167-195`
- Fix: Update driving_licenses status to 'rejected'

---

## MODULE 5: Inconsistencies & UX Issues (P1-P2)

### 5A. Password requirements: signup=6 chars, reset=8 chars + special
- `src/components/auth/PasswordSignupForm.tsx:76` vs `src/pages/auth/ResetPassword.tsx:26`
- Fix: Align to consistent policy (recommend 8 chars minimum everywhere)

### 5B. Preference value mismatches between onboarding and profile
- conversation_level: 'some-chat' vs 'small-talk'
- music_preference: 'radio'/'podcasts' vs 'background'
- smoking_policy: 'ask-first' vs 'e-cigarettes-only'
- Fix: Align option values

### 5C. 8 window.prompt() calls in admin panel
- BookingDetailAdmin, MessagesManagement, ConversationDetailAdmin, RidesManagement, RideDetailAdmin, BookingsManagement
- Fix: Replace with ConfirmModal + reason input

### 5D. 2 window.prompt() calls in MyRides
- `src/pages/MyRides.tsx:543,579`
- Fix: Replace with modal components

### 5E. Leaderboards and Challenges double-wrap in Layout
- `src/pages/Leaderboards.tsx:37` and `src/pages/Challenges.tsx:60`
- Fix: Remove inner `<Layout>` wrapper

### 5F. Map shows straight line instead of route
- `src/components/rides/RideDetailsMap.tsx:136-143`
- Fix: Use actual route polyline from directions response

### 5G. Non-functional buttons (6+)
- Clear Cache, Live Chat, Feature Request, Rate App, Share App, Dashboard Settings/View Details
- Fix: Either implement or remove

### 5H. Pet policy sub-fields not wired to state
- `src/components/preferences/DriverPreferenceDashboard.tsx:412-433`
- Fix: Connect to preferences state

### 5I. Currency display inconsistencies ($ icon for GBP, "GBP" vs "£")
- Fix: Use £ symbol and PoundSterling icon consistently

### 5J. Hardcoded emergency number 999 (UK only)
- Fix: Make configurable or use platform locale

---

## MODULE 6: Performance (P2)

### 6A. RideHistoryChart makes 12 sequential DB queries
- Fix: Replace with single query/RPC

### 6B. Performance monitor flushes 50 individual RPC calls
- Fix: Batch into single RPC

### 6C. Pools search fires on every keystroke (no debounce)
- Fix: Add debounce

### 6D. Group invite search has no debounce
- Fix: Add debounce

### 6E. SafetyDashboard N+1 (7 queries for 7 days)
- Fix: Single query with date grouping

### 6F. Duplicate Google Maps API calls (TripInsights + EnhancedRideMap)
- Fix: Share route data between components

### 6G. ContentWarnings/Announcements stats computed from page, not total
- Fix: Use separate count query or total from response

---

## MODULE 7: Dead Code Cleanup (P2-P3)

### 7A. Dead files to delete
- `src/pages/Profile.old.tsx` (~1400 lines)
- `src/components/onboarding/OnboardingWizard.tsx`
- `src/components/shared/OnboardingModal.tsx`
- `src/components/notifications/NotificationCenter.tsx` (741 lines, wrong schema)
- `src/components/shared/NotificationCenter.tsx` (also dead)
- `src/services/webhookService.ts` (imports Node crypto, 557 lines)
- `src/services/locationTracking.ts` (privacy issues if activated)
- `src/services/reliabilityService.ts` (imported nowhere)
- `src/services/multiStopRouteService.ts` (imported nowhere)
- `src/components/rides/AdvancedSearchFilters.tsx` (never rendered)

### 7B. Dead community components (7 files, never imported)
- CommunityGuidelines, CommunityStats, EventsCalendar, LocalEvents, MemberSpotlight, NewMemberWelcome, ChallengeCenter

### 7C. Dead corporate module (never routed)
- CompanyDashboard, CorporateDashboard, EmployeeManager, corporateService

### 7D. Duplicate/competing systems to consolidate
- Two subscription services (subscriptionService vs membershipService)
- Two accessibility settings components
- Two analytics dashboards
- Three notification display components
- Two account deletion flows

### 7E. Unused imports across ~20 files
- Remove unused icon imports and variables

### 7F. Referral code collected but never submitted
- `src/components/auth/PasswordSignupForm.tsx:20,391-411`
- Fix: Either wire to backend or remove field

### 7G. Remember Me checkbox does nothing
- Fix: Either implement session persistence or remove

### 7H. Facebook auth defined but never exposed
- `src/contexts/AuthContext.tsx` -- signInWithFacebook unused
- Fix: Remove

---

## MODULE 8: Memory Leaks & Cleanup (P2)

### 8A. setTimeout not cleaned up
- `src/pages/Profile.tsx:166,170,206,248`
- `src/pages/auth/ResetPassword.tsx:74-76`
- `src/components/preferences/DriverPreferenceDashboard.tsx:59`
- `src/components/auth/ImpactFacts.tsx:16-26`
- Fix: Use useEffect cleanup or refs

### 8B. setInterval leaks
- `src/services/performanceMonitoring.ts:53`
- `src/services/errorTracking.ts:150`
- `src/components/profile/VehicleManager.tsx:211-213`
- Fix: Add cleanup

### 8C. Module-level timer Maps in messagingUtils
- `src/services/messagingUtils.ts:269,316`
- Fix: Add cleanup on component unmount

### 8D. EditRideModal (MyRides) is wired but never opened
- `src/pages/MyRides.tsx:1693-1698` -- editingRide never set
- Fix: Remove dead modal or wire edit button

---

## MODULE 9: Accessibility (P2-P3)

### 9A. OTP inputs missing aria-labels
### 9B. Toggle switches missing role="switch" and aria-checked
### 9C. Password toggle missing aria-label
### 9D. Social auth SVGs missing aria-hidden
### 9E. ClickableUserProfile not keyboard accessible
### 9F. FeedbackButton has permanent animate-pulse (vestibular concern)

---

## MODULE 10: Legal & Compliance (P1)

### 10A. Privacy Policy missing DPO details and governing law
### 10B. Terms of Service missing governing law and dispute resolution
### 10C. Cookie consent doesn't disable tracking (PECR)
### 10D. Price filter exists on free platform
- `src/components/rides/AdvancedSearchFilters.tsx:282-296`
- `src/services/advancedMatching.ts:80-95`
- Fix: Remove price references

---

## Execution Order

**Wave 1 -- Showstoppers (Module 1 + 2):** ~20 fixes
Fix runtime crashes, security holes, data exposure

**Wave 2 -- Wrong Data (Module 3):** ~7 fixes
Remove fake stats, fix wrong scales

**Wave 3 -- Broken Features (Module 4):** ~18 fixes
Fix features that don't work end-to-end

**Wave 4 -- UX & Consistency (Module 5):** ~10 fixes
Align behaviors, replace prompts with modals

**Wave 5 -- Performance (Module 6):** ~7 fixes
Fix N+1 queries, add debouncing

**Wave 6 -- Dead Code (Module 7):** ~15 file deletions + consolidation
Remove unused files and competing systems

**Wave 7 -- Memory Leaks (Module 8):** ~10 fixes
Add cleanup to timers and subscriptions

**Wave 8 -- Accessibility & Legal (Module 9 + 10):** ~10 fixes
ARIA attributes, legal compliance
