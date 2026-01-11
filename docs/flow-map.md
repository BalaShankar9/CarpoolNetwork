# CARPOOL NETWORK - CANONICAL FLOW MAP

**Version:** 1.0
**Source of Truth:** AUDIT_BASELINE.md (January 11, 2026)
**Status:** NORMATIVE SPECIFICATION

---

## TABLE OF CONTENTS

1. [Rider Flows](#1-rider-flows)
2. [Driver Flows](#2-driver-flows)
3. [Admin Flows](#3-admin-flows)
4. [Edge Cases](#4-edge-cases)

---

## 1. RIDER FLOWS

### 1.1 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     RIDER AUTHENTICATION                        │
└─────────────────────────────────────────────────────────────────┘

START: User visits /signup
  │
  ▼
┌─────────────────────┐
│ Enter credentials   │
│ - full_name         │
│ - email             │
│ - password (6+ ch)  │
└─────────────────────┘
  │
  ▼
┌─────────────────────┐     FAIL      ┌─────────────────────┐
│ Rate limit check    │──────────────▶│ Show rate limit     │
│ checkRateLimit()    │               │ error, block submit │
└─────────────────────┘               └─────────────────────┘
  │ PASS
  ▼
┌─────────────────────┐
│ Supabase auth       │
│ creates account     │
└─────────────────────┘
  │
  ▼
┌─────────────────────┐
│ Email verification  │
│ link sent           │
└─────────────────────┘
  │
  ▼
┌─────────────────────┐
│ User clicks email   │
│ verification link   │
└─────────────────────┘
  │
  ▼
┌─────────────────────┐
│ email_confirmed_at  │
│ set in auth.users   │
└─────────────────────┘
  │
  ▼
┌─────────────────────┐
│ Redirect to /       │
│ (Home)              │
└─────────────────────┘
  │
  ▼
END: User authenticated + email verified
```

**Guards Applied:**
| Guard | Enforced At | Action |
|-------|-------------|--------|
| Rate limiting | SignUp form submit | Block submission |
| Password length | SignUp form | Require 6+ characters |
| Email verification | PostRide only | Show EmailVerificationBanner |

**CANONICAL DECISION:** Email verification is required for POSTING rides but NOT for BOOKING rides.

---

### 1.2 Browse & Search Rides Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     BROWSE & SEARCH RIDES                       │
└─────────────────────────────────────────────────────────────────┘

START: User navigates to /find-rides
  │
  ▼
┌─────────────────────┐
│ ProtectedRoute      │
│ guard check         │
└─────────────────────┘
  │ PASS (authenticated + email verified)
  ▼
┌─────────────────────┐
│ checkEligibility()  │───▶ Returns: {is_eligible, reason, reliability_score}
│ RPC call            │
└─────────────────────┘
  │
  ▼
┌─────────────────────┐
│ loadAllRides()      │
│ Query: rides WHERE  │
│ - status = 'active' │
│ - driver_id != user │
│ - available_seats   │
│   >= seats_needed   │
│ - departure_time    │
│   >= now()          │
│ LIMIT 50            │
└─────────────────────┘
  │
  ▼
┌─────────────────────┐
│ Subscribe realtime: │
│ - rides table       │
│ - ride_bookings     │
└─────────────────────┘
  │
  ▼
┌─────────────────────┐
│ Display ride cards  │
│ with filters:       │
│ - Ride type         │
│ - Min rating        │
│ - Verified only     │
│ - Sort by: match/   │
│   time/rating       │
└─────────────────────┘
  │
  ▼
END: User sees available rides
```

**Query Limits:**
- Initial load: 50 rides
- Search results: 20 rides

---

### 1.3 Booking Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     REQUEST BOOKING                             │
└─────────────────────────────────────────────────────────────────┘

START: User clicks "Request Ride" on ride card
  │
  ▼
┌─────────────────────┐     FAIL      ┌─────────────────────┐
│ Check eligibility   │──────────────▶│ Show warning toast  │
│ is_eligible == true │               │ with reason         │
└─────────────────────┘               └─────────────────────┘
  │ PASS
  ▼
┌─────────────────────┐
│ CANONICAL: Use RPC  │
│ request_booking()   │
│ NOT direct INSERT   │
└─────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────────────────────────┐
│ RPC: request_booking(ride_id, pickup, dropoff, seats_requested) │
│                                                                 │
│ 1. SELECT ... FROM rides WHERE id = ride_id FOR UPDATE          │
│ 2. Validate: status = 'active'                                  │
│ 3. Validate: available_seats >= seats_requested                 │
│ 4. INSERT ride_bookings (status = 'pending')                    │
│ 5. UPDATE rides SET available_seats -= seats_requested          │
│                                                                 │
│ All within single transaction with row lock                     │
└─────────────────────────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────┐
│ TRIGGER:            │
│ notify_driver_      │
│ new_booking()       │
│ Creates BOOKING_    │
│ REQUEST notification│
└─────────────────────┘
  │
  ▼
┌─────────────────────┐
│ Show success toast  │
│ Navigate to         │
│ /my-rides           │
└─────────────────────┘
  │
  ▼
END: Booking created with status='pending'
```

**Seat Reservation:**
- Seats are reserved IMMEDIATELY on booking creation
- NOT when driver confirms
- This is the canonical behavior

---

### 1.4 Cancel Booking Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     CANCEL BOOKING                              │
└─────────────────────────────────────────────────────────────────┘

START: User clicks cancel on booking in MyRides > "My Bookings"
  │
  ▼
┌─────────────────────┐
│ Show confirmation   │
│ dialog with optional│
│ reason prompt       │
└─────────────────────┘
  │ CONFIRM
  ▼
┌─────────────────────────────────────────────────────────────────┐
│ RPC: cancel_booking(booking_id, reason)                         │
│                                                                 │
│ VALIDATIONS:                                                    │
│ 1. Booking exists                                               │
│ 2. auth.uid() == passenger_id                                   │
│ 3. status NOT IN ('cancelled', 'completed')                     │
│                                                                 │
│ OPERATIONS:                                                     │
│ 1. Calculate is_last_minute = (departure_time - now) <= 2 hours │
│ 2. UPDATE ride_bookings SET status = 'cancelled'                │
│ 3. UPDATE rides SET available_seats = LEAST(                    │
│      total_seats, available_seats + seats_requested)            │
│ 4. INSERT booking_history                                       │
│ 5. UPDATE reliability_scores (if last-minute)                   │
└─────────────────────────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────┐
│ TRIGGER:            │
│ notify_passenger_   │
│ booking_status()    │
│ Creates BOOKING_    │
│ CANCELLED notif     │
└─────────────────────┘
  │
  ▼
END: Booking cancelled, seats restored
```

**Last-Minute Cancellation Definition:**
- Cancellation within 2 hours of departure_time
- Recorded in is_last_minute_cancellation field
- Impacts reliability_score

---

## 2. DRIVER FLOWS

### 2.1 Vehicle Registration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     VEHICLE REGISTRATION                        │
└─────────────────────────────────────────────────────────────────┘

START: Driver opens VehicleManager component
  │
  ▼
┌─────────────────────┐
│ Click "Add Vehicle" │
└─────────────────────┘
  │
  ▼
┌─────────────────────┐     OPTIONAL   ┌─────────────────────┐
│ Enter license plate │───────────────▶│ UK plate lookup     │
│ (UK format)         │                │ Auto-fills: make,   │
│                     │◀───────────────│ model, year, color, │
│                     │    SUCCESS     │ capacity, fuel_type │
└─────────────────────┘                └─────────────────────┘
  │                           │ FAIL (manual entry required)
  ▼                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ REQUIRED FIELDS:                                                │
│ - make (string)                                                 │
│ - model (string)                                                │
│ - year (1900 to current_year + 2)                               │
│ - color (string)                                                │
│ - license_plate (UPPERCASE)                                     │
│ - capacity (1-8 passenger seats)                                │
│ - fuel_type (petrol|diesel|electric|hybrid|cng|lpg)             │
│ - vehicle_type (sedan|suv|hatchback|mpv|van|other)              │
│ - vehicle_photo (MANDATORY for new vehicles, max 10MB)          │
└─────────────────────────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────┐
│ INSERT vehicles     │
│ (is_active = true)  │
└─────────────────────┘
  │
  ▼
┌─────────────────────┐
│ Upload photo to     │
│ storage: vehicle-   │
│ images/{user_id}/   │
│ {vehicleId}-        │
│ {timestamp}.{ext}   │
└─────────────────────┘
  │
  ▼
┌─────────────────────┐
│ UPDATE vehicles SET │
│ vehicle_photo_url   │
└─────────────────────┘
  │
  ▼
END: Vehicle registered and active
```

**Multiple Vehicles:**
- Drivers MAY register multiple vehicles
- Only is_active = true vehicles shown for ride creation
- First active vehicle auto-selected in PostRide

---

### 2.2 Vehicle Deactivation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     VEHICLE DEACTIVATION                        │
└─────────────────────────────────────────────────────────────────┘

START: Driver clicks delete on vehicle
  │
  ▼
┌─────────────────────┐
│ Show confirmation   │
│ dialog              │
└─────────────────────┘
  │ CONFIRM
  ▼
┌─────────────────────────────────────────────────────────────────┐
│ RPC: deactivate_vehicle(vehicle_id)                             │
│                                                                 │
│ GUARD CHECK:                                                    │
│ SELECT EXISTS (                                                 │
│   SELECT 1 FROM rides                                           │
│   WHERE vehicle_id = p_vehicle_id                               │
│   AND (available_until > now() OR departure_time > now())       │
│   AND status NOT IN ('cancelled', 'completed')                  │
│ )                                                               │
│                                                                 │
│ IF EXISTS → RAISE 'Vehicle is assigned to active/future rides'  │
│ ELSE → UPDATE vehicles SET is_active = false                    │
└─────────────────────────────────────────────────────────────────┘
  │
  ├──▶ SUCCESS: Vehicle deactivated
  │
  └──▶ BLOCKED: Show error "Cannot delete - assigned to rides"
```

---

### 2.3 Create Ride Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     CREATE RIDE                                 │
└─────────────────────────────────────────────────────────────────┘

START: Driver navigates to /post-ride
  │
  ▼
┌─────────────────────┐
│ RequireProfile      │
│ Complete guard      │
└─────────────────────┘
  │ PASS
  ▼
┌─────────────────────┐     FAIL      ┌─────────────────────┐
│ Email verified?     │──────────────▶│ Show error:         │
│                     │               │ "Verify email first"│
└─────────────────────┘               └─────────────────────┘
  │ PASS
  ▼
┌─────────────────────┐     FAIL      ┌─────────────────────┐
│ Has active vehicle? │──────────────▶│ Redirect to         │
│                     │               │ VehicleManager      │
└─────────────────────┘               └─────────────────────┘
  │ PASS
  ▼
┌─────────────────────────────────────────────────────────────────┐
│ RIDE FORM:                                                      │
│                                                                 │
│ Vehicle: [Dropdown - first active auto-selected]                │
│                                                                 │
│ REQUIRED:                                                       │
│ - origin (geocoded location)                                    │
│ - destination (geocoded location)                               │
│ - departure_time (must be future)                               │
│ - available_seats (1 to vehicle.capacity - 1)                   │
│                                                                 │
│ OPTIONAL:                                                       │
│ - notes (text, up to 4 rows)                                    │
│ - ride_type (daily_commute|one_time|airport_transfer|           │
│              moving_help|long_distance|flexible)                │
│ - is_recurring (boolean)                                        │
│ - availableUntil (for flexible rides)                           │
│ - pickupRadius (5|10|25|50 km, flexible rides only)             │
└─────────────────────────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────┐
│ SEAT CALCULATION:   │
│ max = vehicle.      │
│ capacity - 1        │
│ (driver takes 1)    │
└─────────────────────┘
  │
  ▼
┌─────────────────────┐                ┌─────────────────────┐
│ is_recurring?       │────YES────────▶│ INSERT recurring_   │
│                     │                │ ride_patterns       │
└─────────────────────┘                │                     │
  │ NO                                 │ Then RPC:           │
  ▼                                    │ generate_recurring_ │
┌─────────────────────┐                │ rides(pattern_id,   │
│ INSERT rides        │                │ days_ahead=30)      │
│ status = 'active'   │                └─────────────────────┘
│ total_seats =       │                          │
│ available_seats     │                          ▼
└─────────────────────┘                ┌─────────────────────┐
  │                                    │ Creates individual  │
  │                                    │ ride records for    │
  ▼                                    │ next 30 days        │
┌─────────────────────┐                └─────────────────────┘
│ Show success        │                          │
│ Redirect /my-rides  │◀─────────────────────────┘
└─────────────────────┘
```

---

### 2.4 Manage Booking Requests Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     MANAGE BOOKING REQUESTS                     │
└─────────────────────────────────────────────────────────────────┘

START: Driver views MyRides > "Requests" tab
  │
  ▼
┌─────────────────────┐
│ Query: ride_bookings│
│ WHERE ride_id IN    │
│ (driver's rides)    │
│ AND status='pending'│
└─────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────────────────────────┐
│ DISPLAY PER REQUEST:                                            │
│ - Passenger: name, avatar, rating, reliability_score            │
│ - History: total_bookings, cancelled_bookings,                  │
│            last_minute_cancellations                            │
│ - Trip: pickup, dropoff, seats_requested, created_at            │
│ - Ride: origin, destination, departure_time                     │
└─────────────────────────────────────────────────────────────────┘
  │
  ├──▶ ACCEPT                          ├──▶ DECLINE
  │                                    │
  ▼                                    ▼
┌─────────────────────┐          ┌─────────────────────┐
│ Confirmation dialog │          │ Optional reason     │
│                     │          │ prompt              │
└─────────────────────┘          └─────────────────────┘
  │ CONFIRM                        │ CONFIRM
  ▼                                ▼
┌─────────────────────┐          ┌─────────────────────┐
│ RPC: driver_decide_ │          │ RPC: driver_decide_ │
│ booking(id,         │          │ booking(id,         │
│ 'confirmed')        │          │ 'cancelled')        │
│                     │          │                     │
│ - Status → confirmed│          │ - Status → cancelled│
│ - NO seat change    │          │ - Seats restored    │
│   (already reserved)│          │                     │
└─────────────────────┘          └─────────────────────┘
  │                                │
  ▼                                ▼
┌─────────────────────┐          ┌─────────────────────┐
│ TRIGGER: notify_    │          │ TRIGGER: notify_    │
│ passenger_booking_  │          │ passenger_booking_  │
│ status()            │          │ status()            │
│ BOOKING_CONFIRMED   │          │ BOOKING_CANCELLED   │
└─────────────────────┘          └─────────────────────┘
```

**CANONICAL DECISION:** When driver declines, the status is set to `'cancelled'` NOT `'rejected'` or `'declined'`.

---

### 2.5 Cancel Ride Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     CANCEL RIDE                                 │
└─────────────────────────────────────────────────────────────────┘

START: Driver clicks cancel icon on ride in MyRides > "Offered"
  │
  ▼
┌─────────────────────┐
│ Check: Has confirmed│
│ passengers?         │
└─────────────────────┘
  │
  ├──▶ YES                              ├──▶ NO
  │                                     │
  ▼                                     ▼
┌─────────────────────┐           ┌─────────────────────┐
│ WARNING DIALOG:     │           │ CONFIRM DIALOG:     │
│ "This ride has      │           │ "Are you sure you   │
│ confirmed passengers│           │ want to cancel?"    │
│ who will be         │           │                     │
│ notified"           │           │                     │
└─────────────────────┘           └─────────────────────┘
  │ CONFIRM                         │ CONFIRM
  ▼                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ UPDATE rides SET status = 'cancelled' WHERE id = ride_id        │
│                                                                 │
│ NOTE: Existing bookings are NOT automatically updated.          │
│ Booking status remains as-is until sync_expired_ride_state()    │
│ or manual intervention.                                         │
│                                                                 │
│ KNOWN GAP: No explicit notification trigger for passengers      │
│ when driver cancels ride. Passengers rely on realtime           │
│ subscription or page reload.                                    │
└─────────────────────────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────┐
│ Refresh ride list   │
│ Show success toast  │
└─────────────────────┘
```

---

### 2.6 Ride Lifecycle & Auto-Expiry

```
┌─────────────────────────────────────────────────────────────────┐
│                     RIDE LIFECYCLE                              │
└─────────────────────────────────────────────────────────────────┘

                    ┌─────────────┐
                    │   active    │ ◀── Initial state on creation
                    └─────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ in-progress │    │  cancelled  │    │  completed  │
│ (manual)    │    │ (driver)    │    │ (auto/manual)
└─────────────┘    └─────────────┘    └─────────────┘
          │                                  ▲
          │                                  │
          └──────────────────────────────────┘
                  (manual or auto-expiry)


AUTO-EXPIRY PROCESS:
═══════════════════

Triggered: When driver visits MyRides (offered/passengers/requests tabs)

┌─────────────────────────────────────────────────────────────────┐
│ RPC: sync_expired_ride_state()                                  │
│                                                                 │
│ 1. Find rides WHERE driver_id = auth.uid()                      │
│    AND (available_until < now() OR departure_time < now())      │
│    AND status NOT IN ('cancelled', 'completed')                 │
│                                                                 │
│ 2. UPDATE ride_bookings SET status = 'completed'                │
│    WHERE ride_id IN (expired_rides)                             │
│    AND status IN ('confirmed', 'pending', 'active')             │
│                                                                 │
│ 3. UPDATE rides SET status = 'completed'                        │
│    WHERE id IN (expired_rides)                                  │
│                                                                 │
│ Returns: {success, updated_bookings, updated_rides}             │
└─────────────────────────────────────────────────────────────────┘

KNOWN GAP: No pg_cron or background job. Sync only runs on page visit.
```

---

## 3. ADMIN FLOWS

### 3.1 Admin Access Control

```
┌─────────────────────────────────────────────────────────────────┐
│                     ADMIN ACCESS                                │
└─────────────────────────────────────────────────────────────────┘

CURRENT IMPLEMENTATION (with known gaps):
═════════════════════════════════════════

User navigates to /admin/*
  │
  ▼
┌─────────────────────┐
│ ProtectedRoute      │◀── Only checks: authenticated + email verified
│ guard               │    Does NOT check: isAdmin or permissions
└─────────────────────┘
  │ PASS
  ▼
┌─────────────────────┐
│ Component renders   │
│ useEffect runs      │
│ checks isAdmin      │
└─────────────────────┘
  │
  ├──▶ isAdmin = true              ├──▶ isAdmin = false
  │                                │
  ▼                                ▼
┌─────────────────────┐      ┌─────────────────────┐
│ Admin page renders  │      │ Redirect to /       │
│                     │      │ (delayed)           │
└─────────────────────┘      └─────────────────────┘

KNOWN GAP: Momentary exposure before redirect. Some pages
(/admin/audit, /admin/bugs, /admin/beta, /admin/feedback)
have NO permission check at all.


RBAC ROLE HIERARCHY:
═══════════════════

Level 4: super_admin  → Full system access
Level 3: admin        → User management, safety, verification
Level 2: moderator    → Limited review, verification approvals
Level 1: analyst      → Read-only analytics and reports

52 granular permissions across 11 categories
Stored in admin_permissions table
```

### 3.2 Admin Booking Management

```
┌─────────────────────────────────────────────────────────────────┐
│                     ADMIN BOOKING MANAGEMENT                    │
└─────────────────────────────────────────────────────────────────┘

PATH: /admin/bookings

┌─────────────────────┐
│ Permission required:│
│ bookings.view       │
│ bookings.manage     │
└─────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────────────────────────┐
│ ADMIN ACTIONS:                                                  │
│                                                                 │
│ 1. View all bookings (any user)                                 │
│ 2. Filter by status: pending, confirmed, completed, cancelled   │
│ 3. View booking details                                         │
│ 4. Admin override booking status                                │
│ 5. View passenger/driver profiles                               │
│                                                                 │
│ RPC: admin_approve_booking() - Force confirm booking            │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Admin Ride Management

```
┌─────────────────────────────────────────────────────────────────┐
│                     ADMIN RIDE MANAGEMENT                       │
└─────────────────────────────────────────────────────────────────┘

PATH: /admin/rides

┌─────────────────────┐
│ Permission required:│
│ rides.view          │
│ rides.manage        │
└─────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────────────────────────┐
│ ADMIN ACTIONS:                                                  │
│                                                                 │
│ 1. View all rides (any driver)                                  │
│ 2. Filter by status: active, in-progress, completed, cancelled  │
│ 3. View ride details                                            │
│ 4. Admin cancel ride                                            │
│ 5. View associated bookings                                     │
│                                                                 │
│ RPC: admin_cancel_ride() - Force cancel with audit log          │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 Admin User Management

```
┌─────────────────────────────────────────────────────────────────┐
│                     ADMIN USER MANAGEMENT                       │
└─────────────────────────────────────────────────────────────────┘

PATH: /admin/users

┌─────────────────────┐
│ Permission required:│
│ users.view          │
└─────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────────────────────────┐
│ ADMIN ACTIONS:                                                  │
│                                                                 │
│ 1. View all users                                               │
│ 2. Search by name/email                                         │
│ 3. View user details + rides + bookings + reviews               │
│ 4. Account status management:                                   │
│    - active, suspended, banned, restricted,                     │
│      pending_verification, deactivated                          │
│ 5. Ban user: RPC admin_ban_user()                               │
│ 6. Issue warnings                                               │
│                                                                 │
│ All actions logged to admin_audit_log                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. EDGE CASES

### 4.1 Cancel Timing Edge Cases

```
┌─────────────────────────────────────────────────────────────────┐
│                     CANCEL TIMING                               │
└─────────────────────────────────────────────────────────────────┘

LAST-MINUTE CANCELLATION THRESHOLD: 2 hours before departure
══════════════════════════════════════════════════════════════

Timeline relative to departure_time:
─────────────────────────────────────────────────────────────────

  -24h        -4h        -2h        -1h        0 (departure)
   │           │          │          │          │
   ▼           ▼          ▼          ▼          ▼
┌──────────────────────┬───────────────────────┬──────────────┐
│   Normal cancel      │   LAST-MINUTE cancel  │  Too late    │
│   No penalty         │   is_last_minute=true │  (expired)   │
│                      │   Impacts reliability │              │
└──────────────────────┴───────────────────────┴──────────────┘

CALCULATION:
  is_last_minute = (departure_time - now()) <= interval '2 hours'

NOTE: Uses <= not <, so exactly 2 hours before IS last-minute.


EDGE CASE: Cancellation after departure time
════════════════════════════════════════════

IF departure_time < now() AND status IN ('pending', 'confirmed'):
  - cancel_booking() RPC will still execute
  - is_last_minute = true (trivially)
  - Booking marked cancelled
  - Seats restored (may be unnecessary since ride expired)

RECOMMENDED: Should sync_expired_ride_state() first, but
             this is not enforced in current implementation.
```

### 4.2 Expired Ride Edge Cases

```
┌─────────────────────────────────────────────────────────────────┐
│                     EXPIRED RIDES                               │
└─────────────────────────────────────────────────────────────────┘

EXPIRY CONDITIONS:
══════════════════

Regular rides:
  EXPIRED IF departure_time < now()

Flexible rides (ride_type = 'flexible'):
  EXPIRED IF available_until < now() (if set)
           OR departure_time < now() (fallback)


EDGE CASE: Booking on expired ride
══════════════════════════════════

SCENARIO: Rider attempts to book after departure_time passed

UI GUARD: FindRides query filters:
  .gte('departure_time', new Date().toISOString())

RPC GUARD: request_booking() checks:
  IF v_ride_status != 'active' THEN RAISE EXCEPTION

GAP: If ride status not yet synced to 'completed',
     booking could theoretically succeed.

MITIGATION: Client-side filter should prevent this.


EDGE CASE: Stale "active" rides
═══════════════════════════════

SCENARIO: Driver never visits MyRides → sync never runs

RESULT:
  - Ride shows status='active' in database
  - departure_time is in the past
  - Ride appears in search results (until UI filters it)
  - Bookings remain 'pending' or 'confirmed' forever

IMPACT: Data inconsistency, confusing search results
```

### 4.3 Declined Booking Edge Cases

```
┌─────────────────────────────────────────────────────────────────┐
│                     DECLINED BOOKINGS                           │
└─────────────────────────────────────────────────────────────────┘

CANONICAL DECISION: "Declined" is NOT a valid status.
══════════════════════════════════════════════════════

When driver declines a booking request:
  - Status is set to 'cancelled'
  - cancellation_reason may contain "declined by driver"
  - Notification type is BOOKING_CANCELLED

DEPRECATED TERMS:
  - 'rejected' - Found in staging.sql, NOT in active schema
  - 'declined' - UI display text only, NOT a database status

CANONICAL FLOW:
  1. Booking created: status = 'pending'
  2. Driver declines: status = 'cancelled' (NOT 'rejected' or 'declined')
  3. Notification: type = BOOKING_CANCELLED
  4. UI displays: "Your booking was declined" (text only)


SEAT RESTORATION ON DECLINE:
════════════════════════════

Driver declines pending booking:
  - RPC: driver_decide_booking(booking_id, 'cancelled')
  - Seats restored: available_seats += seats_requested
  - Capped: LEAST(total_seats, available_seats + seats_requested)

Driver declines confirmed booking:
  - Same flow (confirmed → cancelled transition allowed)
  - Seats restored same way
```

### 4.4 Concurrent Booking Edge Cases

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONCURRENT BOOKINGS                         │
└─────────────────────────────────────────────────────────────────┘

SCENARIO: Two riders book last seat simultaneously
══════════════════════════════════════════════════

Ride: available_seats = 1, total_seats = 4
Rider A: requests 1 seat
Rider B: requests 1 seat (concurrently)

PROTECTION: request_booking() uses FOR UPDATE lock

FLOW:
  Time 0: Rider A calls request_booking()
          → Acquires lock on ride row
          → Sees available_seats = 1
          → Inserts booking, decrements seats
          → available_seats = 0
          → Commits, releases lock

  Time 1: Rider B calls request_booking()
          → Blocked waiting for lock
          → Lock released
          → Sees available_seats = 0
          → RAISE EXCEPTION 'Not enough seats available'
          → Returns error to client

RESULT: Only Rider A succeeds. No overbooking.


EDGE CASE: Direct INSERT bypassing RPC
══════════════════════════════════════

DANGEROUS: FindRides.tsx line 333-345 uses direct INSERT

IF direct INSERT used instead of request_booking():
  - No row lock acquired
  - No seat validation
  - Both riders could insert
  - Trigger fires after commit
  - available_seats could go negative

CANONICAL REQUIREMENT: ALWAYS use request_booking() RPC
```

### 4.5 Notification Edge Cases

```
┌─────────────────────────────────────────────────────────────────┐
│                     NOTIFICATION EDGE CASES                     │
└─────────────────────────────────────────────────────────────────┘

EDGE CASE: Notification trigger fails
═════════════════════════════════════

SCENARIO: Booking INSERT succeeds, notify_driver_new_booking() fails

RESULT:
  - Booking exists in database
  - Driver receives NO notification
  - Passenger thinks booking submitted
  - Driver may never see request

CURRENT BEHAVIOR: Silent failure (P0 risk)


EDGE CASE: Duplicate notifications on retry
═══════════════════════════════════════════

SCENARIO: Client retries UPDATE after network timeout

FLOW:
  1. UPDATE ride_bookings SET status = 'confirmed'
  2. Trigger fires: INSERT notification
  3. Network timeout (client thinks failed)
  4. Client retries UPDATE (idempotent)
  5. Trigger fires again: INSERT another notification
  6. Passenger gets 2 notifications

CURRENT BEHAVIOR: No idempotency check in trigger


EDGE CASE: Ride cancelled, no passenger notification
════════════════════════════════════════════════════

SCENARIO: Driver cancels ride with confirmed passengers

CURRENT BEHAVIOR:
  - Ride status → 'cancelled'
  - Booking status unchanged (until sync)
  - NO notification sent to passengers

GAP: Passengers discover cancellation only via:
  - Realtime subscription refresh
  - Manual page reload
  - sync_expired_ride_state() later
```

---

## APPENDIX: FLOW DIAGRAM LEGEND

```
Symbol meanings:

┌─────────────────────┐
│ Process/Action      │
└─────────────────────┘

  │
  ▼                    → Flow direction

──────────────────▶    → Conditional branch

════════════════════   → Section separator

START:                 → Flow entry point
END:                   → Flow exit point

RPC:                   → Database function call
TRIGGER:               → Automatic database trigger
GUARD:                 → Validation check

PASS/FAIL:             → Guard check result
YES/NO:                → Conditional branch
CONFIRM:               → User confirmation required
```

---

**END OF FLOW MAP**
