# CARPOOL NETWORK - CODE TRUTH AUDIT BASELINE

**Audit Date:** January 11, 2026
**Auditor Role:** Principal Engineer + Auditor
**Platform Type:** Community/Commute Ride-Sharing (NO PAYMENTS)

---

## TABLE OF CONTENTS

1. [Route & Page Map](#1-route--page-map)
2. [Entity & Table Map](#2-entity--table-map)
3. [State Map](#3-state-map)
4. [Workflow Summaries](#4-workflow-summaries)
5. [Top Risks (Ranked)](#5-top-risks-ranked)
6. [What Is Unclear or Dangerous](#6-what-is-unclear-or-dangerous)

---

## 1. ROUTE & PAGE MAP

### 1.1 Authentication Routes (Public)

| Path | Component | Guard | Notes |
|------|-----------|-------|-------|
| `/signin` | SignIn | PublicRoute | Redirects to `/` if authenticated |
| `/signup` | SignUp | PublicRoute | Beta allowlist check if VITE_BETA_MODE |
| `/verify-otp` | VerifyOtp | PublicRoute | OTP verification |
| `/verify-email` | VerifyEmail | None | Skip via VITE_SKIP_EMAIL_VERIFICATION |
| `/forgot-password` | ForgotPassword | PublicRoute | Password reset initiation |
| `/reset-password` | ResetPassword | None | Accessed via email link |

### 1.2 Core Protected Routes (Authenticated + Email Verified)

| Path | Component | Guard | Notes |
|------|-----------|-------|-------|
| `/` | Home | ProtectedRoute | Main landing |
| `/find-rides` | FindRides | ProtectedRoute | Browse available rides |
| `/my-rides` | MyRides | ProtectedRoute | Driver + passenger ride history |
| `/messages` | Messages | ProtectedRoute | Messaging |
| `/notifications` | Notifications | ProtectedRoute | Notification center |
| `/rides/:rideId` | RideDetails | ProtectedRoute | View ride details |
| `/bookings/:bookingId` | BookingDetails | ProtectedRoute | View booking details |

### 1.3 Strict Profile-Required Routes

| Path | Component | Guard | Notes |
|------|-----------|-------|-------|
| `/post-ride` | PostRide | RequireProfileComplete | Vehicle required, service gating |
| `/request-ride` | RequestRide | RequireProfileComplete | Service gating checks |

### 1.4 Social & Community Routes

| Path | Component | Guard |
|------|-----------|-------|
| `/community` | Community | ProtectedRoute |
| `/community/:postId` | CommunityPost | ProtectedRoute |
| `/friends` | Friends | ProtectedRoute |
| `/social/groups/:groupId` | GroupDetail | ProtectedRoute |

### 1.5 Profile & Settings Routes

| Path | Component | Guard | Notes |
|------|-----------|-------|-------|
| `/profile` | Profile | ProtectedRoute | User profile |
| `/onboarding/profile` | ProfileOnboarding | ProtectedRoute | Initial setup |
| `/user/:userId` | PublicProfile | ProtectedRoute | Other user profiles |
| `/settings` | Settings | ProtectedRoute | General settings |
| `/security` | SecuritySettings | ProtectedRoute | No Layout wrapper |
| `/preferences` | Preferences | ProtectedRoute | No Layout wrapper |

### 1.6 Feature Routes

| Path | Component | Guard |
|------|-----------|-------|
| `/analytics` | Analytics | ProtectedRoute |
| `/leaderboards` | Leaderboards | ProtectedRoute |
| `/challenges` | Challenges | ProtectedRoute |
| `/favorites` | Favorites | ProtectedRoute |
| `/pools` | Pools | ProtectedRoute |
| `/help` | HelpHub | ProtectedRoute |
| `/safety` | SafetyCenter | ProtectedRoute |

### 1.7 Public Legal Routes

| Path | Component | Guard |
|------|-----------|-------|
| `/terms` | TermsOfService | None |
| `/privacy` | PrivacyPolicy | None |

### 1.8 Admin Routes

**CRITICAL SECURITY FINDING:** All admin routes use only `ProtectedRoute` guard. No router-level permission check. Access control is enforced per-page via `useEffect` redirect.

| Path | Component | Permission Required | Guard Type |
|------|-----------|---------------------|------------|
| `/admin` | AdminDashboard | isAdmin check in component | ProtectedRoute |
| `/admin/admins` | AdminManagement | admins.view/edit/delete | ProtectedRoute |
| `/admin/audit` | AuditLog | **NONE** | ProtectedRoute |
| `/admin/users` | UserManagement | users.view | ProtectedRoute |
| `/admin/users/:userId` | UserDetailAdmin | users.view | ProtectedRoute |
| `/admin/rides` | RidesManagement | rides.view/manage | ProtectedRoute |
| `/admin/rides/:rideId` | RideDetailAdmin | rides.view | ProtectedRoute |
| `/admin/bookings` | BookingsManagement | bookings.view/manage | ProtectedRoute |
| `/admin/bookings/:bookingId` | BookingDetailAdmin | bookings.view | ProtectedRoute |
| `/admin/messages` | MessagesManagement | messages.view/moderate | ProtectedRoute |
| `/admin/community` | CommunityManagement | community.view/moderate | ProtectedRoute |
| `/admin/safety` | SafetyReports | safety.view | ProtectedRoute |
| `/admin/verifications` | VerificationQueue | verification.view/approve | ProtectedRoute |
| `/admin/notifications` | NotificationsManagement | notifications.view/send | ProtectedRoute |
| `/admin/analytics` | AdvancedAnalytics | analytics.view | ProtectedRoute |
| `/admin/settings` | PlatformSettings | system.settings | ProtectedRoute |
| `/admin/bugs` | BugReports | **NONE** | ProtectedRoute |
| `/admin/beta` | BetaManagement | **NONE** | ProtectedRoute |
| `/admin/feedback` | FeedbackManagement | **NONE** | ProtectedRoute |

### 1.9 Route Guard Issues

| Issue | Severity | Location |
|-------|----------|----------|
| Admin routes lack router-level permission check | P1 | App.tsx |
| `/admin/audit`, `/admin/bugs`, `/admin/beta`, `/admin/feedback` have no permission validation | P1 | Individual components |
| No explicit driver-only route guards exist | P2 | Router config |
| Email verification enforced for posting but NOT booking | P2 | PostRide.tsx vs FindRides.tsx |

---

## 2. ENTITY & TABLE MAP

### 2.1 Core Business Tables

#### `profiles`
- **FK:** auth.users(id)
- **Fields Used:** id, email, full_name, avatar_url, profile_photo_url, phone, phone_number, phone_e164, bio, city, country, date_of_birth, gender, is_verified, email_verified, phone_verified, photo_verified, id_verified, verification_badge, profile_verified, profile_completion_percentage, total_rides_offered, total_rides_taken, average_rating, trust_score, reliability_score, is_admin, whatsapp_number, whatsapp_e164, preferred_contact_method, phone_visibility, whatsapp_visibility, language, timezone, onboarding_completed, created_at, updated_at
- **State Fields:** is_verified, email_verified, phone_verified, photo_verified, id_verified, profile_verified, onboarding_completed
- **Drift:** Multiple phone format fields (phone, phone_number, phone_e164) - unclear which is canonical

#### `vehicles`
- **FK:** profiles(user_id)
- **Fields Used:** id, user_id, make, model, year, color, license_plate, capacity, is_active, fuel_type, vehicle_type, registration_year, engine_capacity, image_url, vehicle_photo_url, vehicle_front_photo_path, vehicle_verified, plate_ocr_text, plate_verified, plate_verified_at, mot_status, mot_expiry_date, tax_status, tax_due_date, created_at, updated_at
- **State Fields:** is_active, vehicle_verified, plate_verified, mot_status, tax_status

#### `rides`
- **FK:** profiles(driver_id), vehicles(vehicle_id)
- **Fields Used:** id, driver_id, vehicle_id, origin, origin_lat, origin_lng, destination, destination_lat, destination_lng, departure_time, available_seats, total_seats, status, is_recurring, recurrence_pattern, notes, route_polyline, estimated_duration, estimated_distance, city_area, start_point, closed_at, price_per_seat, pickup_radius_km, created_at, updated_at
- **State Fields:** status, available_seats, is_recurring
- **Status Values:** `'active'`, `'in-progress'`, `'completed'`, `'cancelled'`

#### `ride_bookings`
- **FK:** rides(ride_id), profiles(passenger_id)
- **Fields Used:** id, ride_id, passenger_id, pickup_location, pickup_lat, pickup_lng, dropoff_location, dropoff_lat, dropoff_lng, seats_requested, status, pickup_order, created_at, updated_at, cancellation_reason, cancelled_at, is_last_minute_cancellation
- **State Fields:** status
- **Status Values:** `'pending'`, `'confirmed'`, `'completed'`, `'cancelled'`
- **Drift:** `'rejected'` exists in staging.sql but NOT in TypeScript types or active schema

#### `notifications`
- **FK:** profiles(user_id)
- **Fields Used:** id, user_id, type, data (JSONB), read_at, is_read, created_at
- **State Fields:** read_at, is_read
- **Type Values (DB Constraint):** NEW_MESSAGE, FRIEND_REQUEST, FRIEND_REQUEST_ACCEPTED, FORUM_REPLY, FORUM_MENTION, RIDE_MATCH, BOOKING_REQUEST, BOOKING_CONFIRMED, BOOKING_CANCELLED, REVIEW, SAFETY_ALERT, SYSTEM
- **Drift:** TypeScript defines 22 types (10 unreachable in DB constraint)

#### `user_preferences`
- **PK/FK:** user_id (profiles)
- **Categories:** Driver vehicle/comfort, passenger screening, safety, search filters, smart matching, accessibility
- **70+ fields** - comprehensive preference system

#### `messages`
- **FK:** profiles(sender_id), profiles(recipient_id), rides(ride_id)
- **Fields Used:** id, sender_id, recipient_id, ride_id, content, is_read, created_at
- **State Fields:** is_read

#### `reviews`
- **FK:** rides(ride_id), profiles(reviewer_id), profiles(reviewee_id)
- **Fields Used:** id, ride_id, reviewer_id, reviewee_id, rating (1-5), comment, review_type, created_at
- **State Fields:** review_type (`'driver'`, `'passenger'`)

### 2.2 Social/Community Tables

| Table | FK References | Key State Fields |
|-------|---------------|------------------|
| `friend_requests` | profiles(from_user_id), profiles(to_user_id) | status: PENDING, ACCEPTED, DECLINED, CANCELLED |
| `friendships` | profiles(user_a), profiles(user_b) | - |
| `blocks` | profiles(blocker_id), profiles(blocked_id) | - |
| `social_groups` | profiles(owner_id) | visibility: PUBLIC, PRIVATE, INVITE_ONLY; is_active |
| `social_group_members` | social_groups(group_id), profiles(user_id) | role: OWNER, ADMIN, MODERATOR, MEMBER |
| `social_group_invites` | social_groups, profiles(inviter), profiles(invitee) | status: PENDING, ACCEPTED, DECLINED, CANCELLED |
| `community_posts` | profiles(author_id) | is_pinned, is_locked |
| `community_comments` | community_posts, profiles(author_id) | - |

### 2.3 Ride Request/Matching Tables

| Table | Purpose | Status Values |
|-------|---------|---------------|
| `ride_requests` | Passenger ride requests | pending, matched, cancelled, expired |
| `trip_requests` | Alternative ride requests | OPEN, CONFIRMED, CANCELLED, EXPIRED |
| `trip_offers` | Driver offers to requests | OFFERED, WITHDRAWN_BY_DRIVER, DECLINED_BY_RIDER, CONFIRMED, EXPIRED |
| `trip_requests_matches` | Match results | PENDING_DRIVER, ACCEPTED_BY_DRIVER, DECLINED_BY_DRIVER, CONFIRMED, CANCELLED_BY_RIDER, EXPIRED |

### 2.4 Safety/Emergency Tables

| Table | Purpose |
|-------|---------|
| `safety_reports` | Incident reports (status: pending, investigating, resolved, dismissed) |
| `safety_alerts` | Alert notifications |
| `emergency_contacts` | User emergency contacts |
| `sos_alerts` | Panic button events |
| `safety_checkins` | Check-in during rides |

### 2.5 Admin/Audit Tables

| Table | Purpose |
|-------|---------|
| `admin_audit_log` | Admin action logging |
| `admin_permissions` | RBAC permissions |
| `content_moderation_queue` | Flagged content |
| `user_restrictions` | Suspensions, bans |
| `moderation_actions` | Moderation action log |

### 2.6 Table Name/Column Drift

| Drift Type | Details |
|------------|---------|
| Dual messaging systems | `messages` table AND `chat_messages` table exist |
| Multiple phone formats | `phone`, `phone_number`, `phone_e164` in profiles |
| Ride request naming | Both `ride_requests` and `trip_requests` may represent same concept |
| Alternative ride tables | `trip_offers` vs `rides` table inconsistency |
| Notification read status | Migrated from `is_read` boolean to `read_at` timestamp |

---

## 3. STATE MAP

### 3.1 Ride Status

**Source:** `src/lib/database.types.ts`, SQL migrations

| Status | Meaning | Transitions To |
|--------|---------|----------------|
| `'active'` | Ride posted, accepting bookings | in-progress, completed, cancelled |
| `'in-progress'` | Driver started ride | completed, cancelled |
| `'completed'` | Ride finished | - (terminal) |
| `'cancelled'` | Driver cancelled | - (terminal) |

**Notes:**
- Uses hyphen: `'in-progress'` (NOT underscore)
- British spelling: `'cancelled'` (consistent throughout)
- DB constraint enforces valid values

### 3.2 Booking Status

**Source:** `src/lib/database.types.ts`, SQL migrations

| Status | Meaning | Transitions To |
|--------|---------|----------------|
| `'pending'` | Awaiting driver confirmation | confirmed, cancelled |
| `'confirmed'` | Driver accepted booking | completed, cancelled |
| `'completed'` | Booking/ride finished | - (terminal) |
| `'cancelled'` | Cancelled by driver/passenger | - (terminal) |

**Inconsistencies Found:**
- `'rejected'` exists in staging.sql but NOT in active schema/types
- UI references `'declined'` in some places (spec audit report)
- Status drift between code and database

### 3.3 Notification Types

**DB Constraint (12 types):**
```
NEW_MESSAGE, FRIEND_REQUEST, FRIEND_REQUEST_ACCEPTED, FORUM_REPLY,
FORUM_MENTION, RIDE_MATCH, BOOKING_REQUEST, BOOKING_CONFIRMED,
BOOKING_CANCELLED, REVIEW, SAFETY_ALERT, SYSTEM
```

**TypeScript Definition (22 types):** Includes 10 additional:
- RIDE_STARTED, RIDE_LOCATION_UPDATE, RIDE_COMPLETED, RIDE_DELAYED, DRIVER_ARRIVING
- ACHIEVEMENT_UNLOCKED, BADGE_EARNED, LEVEL_UP, ECO_MILESTONE, CO2_SAVED

**CRITICAL:** These 10 types are UNREACHABLE in database (not in CHECK constraint)

**UI Schema (NotificationCenter.tsx) - Different naming:**
```
ride_request, ride_confirmed, ride_cancelled, ride_reminder, message,
friend_request, friend_accepted, achievement, milestone_reached,
challenge, event, waitlist_available, review, system, promo
```

**CONFLICT:** UI uses snake_case, DB uses UPPER_CASE

### 3.4 Friendship Status

| Status | Meaning |
|--------|---------|
| `PENDING` | Request sent, awaiting response |
| `ACCEPTED` | Friendship established |
| `DECLINED` | Request rejected |
| `CANCELLED` | Request withdrawn |

### 3.5 Other Status Fields

| Entity | Field | Values |
|--------|-------|--------|
| Payment | status | pending, processing, completed, failed, refunded, cancelled |
| Subscription | status | trial, active, cancelled, expired, past_due |
| Account | status | active, suspended, banned, restricted, pending_verification, deactivated |
| Safety Report | status | pending, investigating, resolved, dismissed |
| Group Visibility | visibility | PUBLIC, PRIVATE, INVITE_ONLY |

### 3.6 Unreachable/Inconsistent States

| State | Issue | Location |
|-------|-------|----------|
| Booking `'rejected'` | In staging.sql, not in active schema | staging.sql:1657 |
| 10 notification types | Not in DB CHECK constraint | database.types.ts vs migration |
| UI notification types | snake_case vs UPPER_CASE mismatch | NotificationCenter.tsx |
| `'declined'` status | Referenced in UI but not in schema | spec-audit-report.md |

---

## 4. WORKFLOW SUMMARIES

### 4.1 Rider Authentication Flow

```
1. SignUp → Enter name, email, password (min 6 chars)
2. Rate limit check (checkRateLimit)
3. Supabase auth creates account
4. Email verification link sent
5. User clicks link → email_confirmed_at set
6. AuthContext checks isEmailVerified
7. EmailVerificationBanner shown if not verified
```

**Guards:**
- Rate limiting prevents signup abuse
- Email verification required for posting rides (NOT booking)

### 4.2 Rider Browse & Search Flow

```
1. FindRides loads → checkEligibility() RPC
2. loadAllRides() fetches active rides
3. Subscribe to realtime: rides, ride_bookings tables
4. User applies filters (type, rating, verified)
5. Query: rides WHERE status='active', driver_id != user, available_seats >= needed
6. Results limited to 50 rides initially, 20 for search
```

### 4.3 Rider Booking Flow

```
1. Rider clicks "Request Ride" on FindRides
2. Eligibility check (is_eligible, reliability_score)
3. INSERT ride_bookings (status='pending')
4. DB trigger: recalculate_ride_seats (decrements available_seats)
5. DB trigger: notify_driver_new_booking (creates notification)
6. Driver sees request in MyRides "Requests" tab
```

**Seat Handling:**
- Seats reserved immediately on booking creation
- Formula: `available_seats = LEAST(total_seats, available_seats + seats_requested)` on cancel

### 4.4 Rider Cancel Booking Flow

```
1. Rider clicks cancel in MyRides → "My Bookings"
2. Optional reason prompt
3. RPC: cancel_booking(booking_id, reason)
4. Validates: booking exists, passenger owns it, not already cancelled
5. UPDATE ride_bookings SET status='cancelled'
6. UPDATE rides SET available_seats = LEAST(total_seats, available_seats + seats_requested)
7. Track is_last_minute_cancellation if < 2 hours before departure
8. DB trigger: notify_passenger_booking_status
```

### 4.5 Driver Vehicle Registration Flow

```
1. VehicleManager → "Add Vehicle"
2. Optional: UK plate lookup auto-fills fields
3. Required: make, model, year, color, license_plate, capacity, fuel_type, vehicle_type, photo
4. Photo uploaded to supabase storage: vehicle-images/{user_id}/{vehicleId}-{timestamp}
5. INSERT vehicles (is_active=true)
6. Multiple vehicles allowed per driver
```

**Deletion Guard:**
- Cannot deactivate vehicle if assigned to active/future rides
- RPC: deactivate_vehicle(vehicle_id)

### 4.6 Driver Create Ride Flow

```
1. PostRide → Select vehicle (first active auto-selected)
2. Required: origin, destination (geocoded), departure_time, available_seats
3. Seats capped at vehicle.capacity - 1 (driver takes one)
4. Optional: notes, ride_type, is_recurring
5. Validation: email verified, service gating check
6. INSERT rides (status='active')
7. If recurring: INSERT recurring_ride_patterns, then RPC generate_recurring_rides(30 days)
```

### 4.7 Driver Manage Bookings Flow

```
1. MyRides "Requests" tab shows pending bookings
2. Displays: passenger profile, rating, reliability score, cancellation history
3. Accept: RPC driver_decide_booking(booking_id, 'confirmed')
   - No seat change (already reserved on booking creation)
4. Decline: RPC driver_decide_booking(booking_id, 'cancelled')
   - Seats restored: LEAST(total_seats, available_seats + seats_requested)
5. DB trigger creates notification for passenger
```

### 4.8 Driver Cancel Ride Flow

```
1. MyRides → Click cancel icon on offered ride
2. Check for confirmed passengers → warning dialog
3. UPDATE rides SET status='cancelled'
4. Ride no longer accepts bookings
5. ISSUE: No explicit passenger notification trigger in UI code
```

### 4.9 Ride Lifecycle & Auto-Expiry

```
States: active → in-progress → completed
       active → cancelled (driver cancels)

Auto-expiry:
1. syncExpiredRideState() called on MyRides tab load
2. Finds rides WHERE (available_until < now OR departure_time < now) AND status NOT IN ('cancelled', 'completed')
3. UPDATE ride_bookings SET status='completed' for those rides
4. UPDATE rides SET status='completed'
```

**ISSUE:** Sync only runs when driver visits MyRides - no background job

### 4.10 Notification Flow

**Architecture:** Database triggers + External webhook

| Event | Trigger | Notification Type |
|-------|---------|-------------------|
| Booking created | INSERT ride_bookings status='pending' | booking-request → driver |
| Booking confirmed | UPDATE ride_bookings status→'confirmed' | booking-confirmed → passenger |
| Booking cancelled | UPDATE ride_bookings status→'cancelled' | booking-cancelled → passenger |
| New message | INSERT messages | message → recipient |

**CRITICAL ISSUE:** Friend accept notification removed due to webhook conflict (migration 20260117)

---

## 5. TOP RISKS (RANKED)

### P0 - System Integrity Risks

| ID | Risk | Impact | Location |
|----|------|--------|----------|
| R001 | Notification trigger fails silently after booking INSERT | Passenger never learns booking created | 20251214202053, 20260117 |
| R002 | cancel_booking_with_impact() has multiple failure points | Incomplete audit trail, skipped restrictions | 20251228120000:237-439 |
| R003 | Database webhook misconfiguration blocks all notifications | Infrastructure-level notification outage | 20260117:3-5 |

### P1 - Logic Correctness Risks

| ID | Risk | Impact | Location |
|----|------|--------|----------|
| R004 | driver_decide_booking() doesn't lock ride row | Race condition during concurrent confirms | 20251228120000:160-234 |
| R005 | Booking cancellation uses two separate UPDATEs | Race condition creates negative available_seats | 20251214200908 |
| R006 | Status value drift: DB 'rejected', UI 'declined' | State machine confusion | state-model.md, MyRides.tsx |
| R007 | syncExpiredRideState() only called manually | Expired rides stay active forever | MyRides.tsx:203-214 |
| R008 | Trigger doesn't validate joined data (ride/profile) | NULL pointer causes INSERT fail | 20251214202053:98-102 |
| R009 | No idempotency check in notification trigger | Duplicate notifications on retry | 20251214202053:270-287 |
| R010 | Admin routes checked in-page, not router-level | Admin permission bypass window | App.tsx |
| R011 | RLS uses nested EXISTS join | DOS via resource exhaustion | 20251115164524:204-211 |
| R012 | syncExpiredRides → loadRides not atomic | Race condition between calls | MyRides.tsx:213-220 |
| R013 | Booking creation: RPC then navigate | User navigated to non-existent booking | FindRides.tsx |

### P2 - UX/Resilience Risks

| ID | Risk | Impact | Location |
|----|------|--------|----------|
| R014 | Orphaned notifications if user deleted | Notification table accumulates stale data | implicit FK |
| R015 | Notification insert failure doesn't retry | Notifications stuck indefinitely | 20251214202053 |
| R016 | Seat restoration edge case | available_seats > total_seats theoretically possible | 20251214200908:113 |
| R017 | Vehicle delete network failure | Vehicle in undefined UI state | VehicleManager.tsx:333-350 |
| R018 | Multiple trigger fires per cascade delete | Performance degradation | 20260115 |

---

## 6. WHAT IS UNCLEAR OR DANGEROUS

### 6.1 DANGEROUS: Notification Atomicity

**Problem:** Booking INSERT commits, then notification trigger fails → booking exists but user never notified.

**Evidence:**
- Migration 20260117 comment: "the notifications table triggers a database webhook that is misconfigured with Unexpected operation type: notification_created"
- Friend accept notification removed entirely due to conflict
- No retry mechanism for failed notifications

**Impact:** Users may book rides and never know if confirmed/declined.

### 6.2 DANGEROUS: Admin Route Security

**Problem:** All admin routes use `ProtectedRoute` only. Permission check happens INSIDE component via useEffect.

**Evidence:**
- `/admin/audit`, `/admin/bugs`, `/admin/beta`, `/admin/feedback` have NO permission validation
- Stale auth context could render admin page before redirect

**Impact:** Momentary admin page exposure; some admin pages fully accessible to any authenticated user.

### 6.3 DANGEROUS: Manual Expiry Sync

**Problem:** `sync_expired_ride_state()` only called when driver visits MyRides page.

**Evidence:**
- MyRides.tsx line 203-214: Called on tab load
- No pg_cron job or background task
- If driver never visits, rides stay "active" forever

**Impact:** Stale rides pollute search results; bookings never marked complete.

### 6.4 UNCLEAR: Booking Status Values

**What exists:**
- DB schema: `pending`, `confirmed`, `completed`, `cancelled`
- staging.sql: Also includes `rejected`
- UI code: References `declined` in some places
- Spec audit: Mentions `active`, `paid` as "observed UI variants (non-canonical)"

**Question:** What is the canonical status set? Are `rejected`, `declined`, `active`, `paid` deprecated or bugs?

### 6.5 UNCLEAR: Notification Type Mismatch

**What exists:**
- DB CHECK constraint: 12 types (UPPER_CASE)
- TypeScript: 22 types (10 additional unreachable)
- UI (NotificationCenter.tsx): 15 types (snake_case, different names)

**Question:** Why does the TypeScript definition include types the database cannot accept? Are these future types or dead code?

### 6.6 UNCLEAR: Dual Messaging Systems

**What exists:**
- `messages` table (peer-to-peer messaging)
- `chat_messages` table (conversation-based messaging)
- `conversations` table with types: RIDE_MATCH, TRIP_MATCH, FRIENDS_DM, GROUP_CHAT

**Question:** Is `messages` deprecated in favor of `chat_messages`? Which is the source of truth?

### 6.7 UNCLEAR: Phone Field Canonical Source

**What exists in profiles:**
- `phone` - Original field
- `phone_number` - Alternate format?
- `phone_e164` - E.164 international format

**Question:** Which field should code read/write? Are they synchronized? What happens if they disagree?

### 6.8 UNCLEAR: Ride Request vs Trip Request

**What exists:**
- `ride_requests` table with status: pending, matched, cancelled, expired
- `trip_requests` table with status: OPEN, CONFIRMED, CANCELLED, EXPIRED
- Different case conventions suggest different origins

**Question:** Are these the same concept implemented twice? Which is active?

### 6.9 UNCLEAR: Seat Calculation Race Window

**What's implemented:**
- `request_booking()` uses `FOR UPDATE` lock on ride row
- Seat decrement happens within same transaction

**Question:** What happens if trigger `recalculate_ride_seats` fires during concurrent booking? Is there a race window between lock release and trigger execution?

### 6.10 DANGEROUS: Booking Direct Insert

**Evidence in FindRides.tsx line 333-345:**
```javascript
await supabase.from('ride_bookings').insert([{
  ride_id: rideId,
  passenger_id: user.id,
  ...
}])
```

**Problem:** This BYPASSES the `request_booking()` RPC which has:
- Seat availability validation
- Ride status check
- Atomic transaction safety
- Row-level locking

**Impact:** Overbooking possible if direct insert used instead of RPC.

### 6.11 UNCLEAR: Driver Ride Cancellation → Passenger Notification

**Evidence:**
- Driver cancel in MyRides.tsx: `UPDATE rides SET status='cancelled'`
- No explicit notification INSERT or trigger call
- Passengers rely on realtime subscription or page reload

**Question:** Is there a trigger for ride cancellation → passenger notification? If not, how do passengers learn their ride was cancelled?

### 6.12 DANGEROUS: Eligibility Check Staleness

**Evidence in FindRides.tsx:**
```javascript
useEffect(() => {
  checkEligibility()  // Called once on mount
}, [])  // Empty dependency array
```

**Problem:** If user's eligibility changes (new restriction added) after page load, they can still book with stale eligibility status.

---

## APPENDIX: KEY FILE REFERENCES

| File | Purpose |
|------|---------|
| src/App.tsx | Router configuration, route guards |
| src/pages/FindRides.tsx | Ride search and booking |
| src/pages/MyRides.tsx | Driver/rider ride management |
| src/pages/PostRide.tsx | Ride creation |
| src/components/profile/VehicleManager.tsx | Vehicle CRUD |
| src/contexts/AuthContext.tsx | Authentication state |
| src/lib/database.types.ts | TypeScript type definitions |
| supabase/migrations/20251214193708_add_atomic_booking_rpc.sql | request_booking RPC |
| supabase/migrations/20251214200908_add_atomic_booking_operations.sql | cancel_booking, driver_decide_booking |
| supabase/migrations/20251214202053_enable_realtime_and_notification_triggers.sql | Notification triggers |
| supabase/migrations/20260117_fix_friend_accept_notification.sql | Webhook conflict fix |
| supabase/migrations/20260214120000_fix_vehicle_ride_delete_expiry.sql | Expiry sync, vehicle delete |

---

**END OF AUDIT BASELINE**
