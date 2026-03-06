# CarpoolNetwork — Complete Flow-Level QA Audit

**Date:** March 2, 2026
**Method:** Manual code trace of every user journey (human tester simulation)

---

## Summary: 75+ Issues Found Across All Flows

| Flow | Critical | High | Medium | Low | Total |
|------|----------|------|--------|-----|-------|
| Auth (signup/login/OTP) | 1 | 2 | 3 | 3 | 9 |
| Ride Posting | 1 | 2 | 4 | 3 | 10 |
| Search & Booking | 1 | 4 | 5 | 3 | 13 |
| Messaging | 0 | 4 | 4 | 1 | 9 |
| Payments & Subscriptions | 2 | 3 | 6 | 0 | 11 |
| Profile & Settings | 1 | 0 | 5 | 3 | 9 |
| Admin Dashboard | 2 | 4 | 1 | 0 | 7 |
| **Total** | **8** | **19** | **28** | **13** | **68** |

---

## 1. AUTH FLOW (Signup → Login → OTP → Verify → Logout)

### CRITICAL
**AUTH-1: Email Verification Bypass via Environment Variable**
- File: `src/contexts/AuthContext.tsx:315`
- `VITE_SKIP_EMAIL_VERIFICATION=true` disables ALL email checks globally. If this leaks to production, bots/fake accounts get full access.

### HIGH
**AUTH-2: `/verify-email` Route Has No Protection**
- File: `src/App.tsx:262`
- Unauthenticated users access this page, see `undefined` for email, and clicking "Resend" fails silently.

**AUTH-3: `/reset-password` Route Has No Token Validation**
- File: `src/App.tsx:268`
- Anyone can visit `/reset-password` and attempt `supabase.auth.updateUser({ password })`. Security depends entirely on Supabase rejecting invalid tokens.

### MEDIUM
**AUTH-4: OTP State Lost on Page Reload** — `location.state` vanishes, user silently redirected with no error message (`VerifyOtp.tsx:17-21`).

**AUTH-5: Beta Allowlist Errors Not Differentiated** — Can't tell "system error" from "not on allowlist" (`AuthContext.tsx:153-166`).

**AUTH-6: Profile Load Error Silently Swallowed** — If profile fetch fails, `loading=false` but `profile=null`, causing downstream crashes (`AuthContext.tsx:138-142`).

### LOW
**AUTH-7: No OTP Expiration-Specific Message** — Generic Supabase error shown instead of "Code expired, please resend."

**AUTH-8: Phone Verification Redirect Loop** — Users who skip phone verification get stuck between `/onboarding/profile` and protected routes.

**AUTH-9: Unnecessary Error Re-throw in SignIn** — `throw error` then `catch { throw new Error() }` pattern.

---

## 2. RIDE POSTING FLOW (Create → Edit → Delete)

### CRITICAL
**RIDE-1: Simple PostRide Component Hardcodes All Coordinates to (0,0)**
- File: `src/components/rides/PostRide.tsx:49-53`
- Every ride posted through this component maps to "Null Island" off the coast of Africa. No geocoding whatsoever.

### HIGH
**RIDE-2: Main PostRide Allows Submission with (0,0) Coordinates**
- File: `src/pages/PostRide.tsx:46-47, 270-286`
- Coordinates initialized to `{lat:0, lng:0}`. If Google Maps API fails or user types a location name without selecting from autocomplete, the form submits with invalid coords.

**RIDE-3: LocationAutocomplete Accepts Free Text Without Geocoding**
- File: `src/components/shared/LocationAutocomplete.tsx:136-141`
- User can type "My house" and submit. Only non-empty validation exists; no check that a place was actually selected.

### MEDIUM
**RIDE-4: No Past-Time Validation on Today's Date** — User can select today + 8:00 AM when it's currently 2:00 PM (`PostRide.tsx:174-177`).

**RIDE-5: Delete Ride Ignores 'Pending' Bookings** — Only checks `confirmed`/`active` bookings before deletion, leaving pending passengers stranded (`MyRides.tsx:416-420`).

**RIDE-6: Edit Mode Doesn't Check Ride Status** — Can edit completed/cancelled rides (`PostRide.tsx:63-68`).

**RIDE-7: No Idempotency for Duplicate Prevention** — Network timeout + retry = two identical rides created (`PostRide.tsx:301-304`).

### LOW
**RIDE-8: Vehicle Capacity Defaults to 5 if NULL** — Could offer wrong seat count.

**RIDE-9: Flexible Recurring Rides Can Submit Without Pattern** — Button enabled when `rideType === 'flexible'`.

**RIDE-10: Special Characters Allowed in Location Names** — No sanitization of user input.

---

## 3. SEARCH & BOOKING FLOW (Find → Book → Cancel → Review)

### CRITICAL
**SEARCH-1: Search Does NOT Filter by Location**
- File: `src/pages/FindRides.tsx:263-350`
- The `handleSearch` function accepts origin/destination but NEVER uses them in the database query. All active rides are returned regardless of location. The search is completely broken for location-based filtering.

### HIGH
**SEARCH-2: N+1 Weather API Calls** — Each ride triggers a separate HTTP request to weather API. 50 rides = 50 calls (`FindRides.tsx:208-230`).

**SEARCH-3: Pagination Limit Mismatch** — Initial load returns 50 rides; search returns 20. Inconsistent UX (`FindRides.tsx:294`).

**SEARCH-4: Date Timezone Bug** — `new Date("2025-03-05")` interpreted as UTC midnight, then `setHours(0,0,0,0)` applied in local timezone. Off by timezone offset (`FindRides.tsx:283-289`).

**SEARCH-5: Missing Email Verification in FindRides Booking** — `FindRides.tsx` doesn't check email verification, but `RideDetails.tsx` does. Unverified users can book from search but not from details page.

### MEDIUM
**SEARCH-6: No Search Error Toast** — Failed search shows "No rides found" instead of error message.

**SEARCH-7: Inconsistent Booking Status Values** — Code checks for `'active'` booking status which may never be set.

**SEARCH-8: Price Not Shown in Search Results** — Users must click each ride to see pricing.

**SEARCH-9: Realtime Subscription Cleanup Missing `.unsubscribe()`** — Only `removeChannel()` called.

**SEARCH-10: Matching Score Breakdown Uses `totalScore * 0.2`** — Should use actual price calculation (`advancedMatching.ts:200-205`).

### LOW
**SEARCH-11: No Scroll-to-Top on Results** — User may not see search results appear.

**SEARCH-12: Loading State Stuck if Booking Not Found** — `setLoading(false)` not called when data is null in BookingDetails.

**SEARCH-13: Missing Accessibility Attributes on Seat Selector** — No `aria-label` or `role` attributes.

---

## 4. MESSAGING FLOW (List → Open → Send → Receive → Block)

### HIGH
**MSG-1: Message Edit Window Not Enforced Server-Side**
- File: `src/components/messaging/NewChatSystem.tsx:193-197, 1491-1501`
- 15-minute edit window is client-only. Supabase RLS has no time constraint. Users can edit messages days later via DevTools.

**MSG-2: Block Query Has Logic Error**
- File: `NewChatSystem.tsx:1584-1589`
- `.or()` combined with `.in()` on same columns creates conflicting filter. Block status detection may fail, allowing blocked users to still message.

**MSG-3: Message Deduplication Race Condition** — Rapid sends can bypass `client_generated_id` dedup, creating visible duplicates (`NewChatSystem.tsx:325-352`).

**MSG-4: Real-Time Message Ordering Issues** — Websocket may deliver messages out of order due to network latency. Sort applied per-batch, not globally.

### MEDIUM
**MSG-5: Unread Count Hardcoded to 1** — Always shows "1" unread regardless of actual count (`NewChatSystem.tsx:637-647`).

**MSG-6: Attachment URLs Expire After 1 Hour** — Signed URLs not refreshed. Old messages lose attachment access.

**MSG-7: Scheduled Messages Don't Update Conversation Preview** — Early return skips `updateConversationPreview` call.

**MSG-8: No XSS Sanitization on Message Body** — Message text inserted without DOMPurify. React escapes by default, but attachments/metadata might not be.

### LOW
**MSG-9: Typing Indicator May Not Debounce Properly** — Excessive realtime broadcasts possible.

---

## 5. PAYMENTS & SUBSCRIPTIONS FLOW

### CRITICAL
**PAY-1: Double-Charge — No Idempotency Key on PaymentIntent**
- File: `netlify/functions/create-payment-intent.ts:62-72`
- Timeout + retry creates TWO separate PaymentIntents. Both can be charged. No `idempotency_key` used.

**PAY-2: Double-Refund — No Idempotency Key on Refund**
- File: `netlify/functions/process-refund.ts:49-70`
- Same issue: timeout + retry creates duplicate refunds. Massive financial liability.

### HIGH
**PAY-3: Currency Amount Mismatch** — Frontend sends `amount * 100` (pence), but backend also has `Math.round(amount)`. Inconsistent conversion means charges could be 100x wrong.

**PAY-4: Billing Cycle Hardcoded to 'monthly'** — Webhook handler always saves `billing_cycle: 'monthly'` even for annual subscribers (`stripe-webhook.ts:227-242`).

**PAY-5: Unknown Subscription Status Defaults to 'active'** — `statusMap[sub.status] || 'active'` grants access for unexpected Stripe statuses.

### MEDIUM
**PAY-6: No Validation of Subscription Plan** — Any `priceId` accepted without checking it exists in `subscription_plans` table.

**PAY-7: `.single()` Throws on Zero Rows** — Existing subscription check crashes instead of returning null gracefully.

**PAY-8: Payment Metadata Not Validated** — Negative amounts, invalid currencies accepted.

**PAY-9: Default Payment Method Race Condition** — Concurrent deletions can leave user with no default.

**PAY-10: Duplicate Payment Method Records** — Retry after partial failure creates duplicates.

**PAY-11: Subscription Webhook Processing May Fail Silently** — `stripe.subscriptions.retrieve()` failure returns 500 with no retry.

---

## 6. PROFILE & SETTINGS FLOW

### CRITICAL
**PROF-1: Profile Photo Auto-Sets `profile_verified: true`**
- File: `src/pages/Profile.tsx:233-239`
- Any photo upload immediately marks user as "verified" with no backend verification. Users can upload fake photos and appear trusted.

### MEDIUM
**PROF-2: No Phone E.164 Format Validation** — Any text accepted in phone field.

**PROF-3: Preference Updates Race Condition** — Rapid toggles cause out-of-order upserts.

**PROF-4: Account Deletion is Soft-Delete Without Cleanup** — Active rides, messages, storage files, reviews not handled. GDPR compliance concern.

**PROF-5: No Bio Length Validation** — Users can paste 100K+ character bios.

**PROF-6: Vehicle Image Size Check Client-Only** — No server-side validation. Attacker can upload 100MB files.

### LOW
**PROF-7: Vehicle Capacity Allows 1 Seat** — Nonsensical for carpooling.

**PROF-8: No License Plate Format Validation** — Accepts any text.

**PROF-9: No Profile Name Length Validation** — No min/max check.

---

## 7. ADMIN FLOW (Dashboard → Users → Analytics → Moderation)

### CRITICAL
**ADMIN-1: No Role Validation When Promoting Admins**
- File: `src/pages/admin/AdminManagement.tsx:50-79`
- A moderator can promote themselves to `super_admin`. No check that current user's role is higher than the target role.

**ADMIN-2: Bulk Operations Without Confirmation**
- File: `src/pages/admin/BulkOperations.tsx:94-143`
- No explicit count display, no confirmation dialog, no dry-run mode. Could accidentally ban thousands of users.

### HIGH
**ADMIN-3: Admin Routes Only Check `isAdmin`, Not Specific Permissions**
- File: `src/App.tsx:132-164`
- Navigation is filtered by permissions (good UX), but routes themselves aren't. Direct URL access bypasses permission checks.

**ADMIN-4: No Input Validation on Admin Actions**
- File: `src/components/admin/AccountActionModal.tsx:114-125`
- Trust score can be -999999, suspension can be -1 days, ban reason can be empty.

**ADMIN-5: Data Export No Pagination** — Large datasets cause memory exhaustion.

**ADMIN-6: `is_admin: true` With `admin_role: null` Still Grants Full Admin Access** — Inconsistent role/flag check.

### MEDIUM
**ADMIN-7: Audit Logging Coverage Unclear** — Some actions logged, others not.

---

## Top 10 Issues to Fix First

1. **PAY-1: Double-charge race condition** — Add Stripe idempotency keys immediately
2. **ADMIN-1: Privilege escalation in role assignment** — Add role hierarchy validation
3. **PROF-1: Auto-verification on photo upload** — Remove client-side verified flag
4. **SEARCH-1: Search doesn't filter by location** — Core feature is broken
5. **AUTH-1: Email verification bypass via env var** — Restrict to dev builds only
6. **PAY-2: Double-refund risk** — Add refund idempotency keys
7. **MSG-1: Message edit window not enforced server-side** — Add RLS time check
8. **RIDE-1: Null Island coordinates** — Add geocoding validation
9. **ADMIN-2: Bulk operations without confirmation** — Add confirmation dialog
10. **PAY-5: Unknown status defaults to 'active'** — Fail safe, not open

---

## Cross-Cutting Issues (Affect Multiple Flows)

1. **No rate limiting** on any Netlify functions (AI, payments, auth)
2. **Inconsistent error handling** — Some flows show raw Supabase errors, others show friendly messages
3. **Missing `useCallback`/`useMemo`** — Re-renders across all large forms
4. **No input sanitization** — Location names, bios, messages accept anything
5. **Client-side-only validations** — Size limits, edit windows, permissions all bypassable
6. **Timezone handling** — Date comparisons inconsistent across search, booking, and ride posting
7. **`.single()` without error handling** — Used in 12+ places, throws on 0 or >1 rows
