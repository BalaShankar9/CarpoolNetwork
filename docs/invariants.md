# CARPOOL NETWORK - SYSTEM INVARIANTS

**Version:** 1.0
**Source of Truth:** AUDIT_BASELINE.md (January 11, 2026)
**Status:** NORMATIVE SPECIFICATION

---

## TABLE OF CONTENTS

1. [Seat Accounting Invariants](#1-seat-accounting-invariants)
2. [Authorization Invariants](#2-authorization-invariants)
3. [Time-Based Invariants](#3-time-based-invariants)
4. [Notification Invariants](#4-notification-invariants)
5. [Admin Safety Invariants](#5-admin-safety-invariants)
6. [Data Integrity Invariants](#6-data-integrity-invariants)

---

## 1. SEAT ACCOUNTING INVARIANTS

### INV-SEAT-001: Available Seats Formula

```
INVARIANT: Available seats must equal total seats minus reserved seats

FORMULA:
  rides.available_seats = rides.total_seats - SUM(
    ride_bookings.seats_requested
    WHERE ride_bookings.ride_id = rides.id
      AND ride_bookings.status IN ('pending', 'confirmed')
  )

ENFORCEMENT:
  - Calculated by recalculate_ride_seats() trigger
  - Verified on every booking INSERT/UPDATE/DELETE

VIOLATION RESPONSE:
  - Recalculate from ground truth
  - Log discrepancy to admin_audit_log
```

### INV-SEAT-002: Non-Negative Available Seats

```
INVARIANT: Available seats must never be negative

CONSTRAINT:
  rides.available_seats >= 0

ENFORCEMENT:
  - request_booking() RPC checks before INSERT
  - Uses FOR UPDATE lock to prevent race conditions

VIOLATION RESPONSE:
  - Reject booking with "Not enough seats available"
  - Do NOT allow INSERT
```

### INV-SEAT-003: Available Seats Upper Bound

```
INVARIANT: Available seats must not exceed total seats

CONSTRAINT:
  rides.available_seats <= rides.total_seats

ENFORCEMENT:
  - Seat restoration uses LEAST(total_seats, available_seats + seats_requested)
  - Prevents overflow on cancel

VIOLATION RESPONSE:
  - Cap at total_seats
  - Log warning
```

### INV-SEAT-004: Total Seats Upper Bound

```
INVARIANT: Total seats must not exceed vehicle capacity minus driver

CONSTRAINT:
  rides.total_seats <= (vehicles.capacity - 1)
  WHERE vehicles.id = rides.vehicle_id

ENFORCEMENT:
  - PostRide.tsx: passengerSeats = Math.max((vehicle.capacity || 5) - 1, 1)
  - Form validation caps available_seats selection

VIOLATION RESPONSE:
  - Reject ride creation
  - Show validation error
```

### INV-SEAT-005: Seats Requested Bounds

```
INVARIANT: Seats requested must be positive and within available

CONSTRAINT:
  ride_bookings.seats_requested >= 1
  AND ride_bookings.seats_requested <= rides.available_seats (at time of booking)

ENFORCEMENT:
  - request_booking() RPC validates
  - Form enforces minimum 1

VIOLATION RESPONSE:
  - Reject booking
```

### INV-SEAT-006: Seat Reservation Timing

```
INVARIANT: Seats are reserved immediately on booking creation

TIMING:
  Booking INSERT → Seats decremented (same transaction)
  NOT on driver confirmation

ENFORCEMENT:
  - request_booking() RPC performs atomic operation:
    1. Lock ride row
    2. Validate seats
    3. Insert booking
    4. Decrement available_seats
  - All within single transaction
```

### INV-SEAT-007: Seat Restoration on Cancellation

```
INVARIANT: Cancelled bookings must restore their seats

FORMULA:
  On booking.status → 'cancelled':
    rides.available_seats = LEAST(
      rides.total_seats,
      rides.available_seats + booking.seats_requested
    )

ENFORCEMENT:
  - cancel_booking() RPC
  - driver_decide_booking() RPC (when declining)
```

---

## 2. AUTHORIZATION INVARIANTS

### INV-AUTH-001: Booking Ownership

```
INVARIANT: Only the passenger can cancel their own booking

CONSTRAINT:
  cancel_booking(booking_id) requires:
    auth.uid() = ride_bookings.passenger_id

ENFORCEMENT:
  - RPC validates auth.uid() before UPDATE
  - Row Level Security (RLS) policy

VIOLATION RESPONSE:
  - RAISE EXCEPTION 'Not authorized to cancel this booking'
```

### INV-AUTH-002: Ride Ownership

```
INVARIANT: Only the driver can manage their own ride

CONSTRAINT:
  Ride management operations require:
    auth.uid() = rides.driver_id

OPERATIONS:
  - Cancel ride
  - Delete ride
  - Accept/decline bookings

ENFORCEMENT:
  - RPC validates auth.uid()
  - RLS policy on rides table

VIOLATION RESPONSE:
  - RAISE EXCEPTION 'Not authorized'
```

### INV-AUTH-003: Driver Booking Decision Authority

```
INVARIANT: Only the ride's driver can accept/decline bookings for that ride

CONSTRAINT:
  driver_decide_booking(booking_id, decision) requires:
    auth.uid() = rides.driver_id
    WHERE rides.id = ride_bookings.ride_id

ENFORCEMENT:
  - RPC validates via JOIN
  - Checked before any UPDATE

VIOLATION RESPONSE:
  - RAISE EXCEPTION 'Not authorized to manage this booking'
```

### INV-AUTH-004: Vehicle Ownership

```
INVARIANT: Users can only manage their own vehicles

CONSTRAINT:
  Vehicle operations require:
    auth.uid() = vehicles.user_id

OPERATIONS:
  - Create vehicle
  - Update vehicle
  - Deactivate vehicle

ENFORCEMENT:
  - RLS policy on vehicles table
  - RPC validates user_id
```

### INV-AUTH-005: Self-Booking Prevention

```
INVARIANT: Drivers cannot book their own rides

CONSTRAINT:
  ride_bookings.passenger_id != rides.driver_id
  WHERE ride_bookings.ride_id = rides.id

ENFORCEMENT:
  - FindRides query: driver_id != auth.uid()
  - request_booking() could add explicit check (currently UI enforced)
```

### INV-AUTH-006: Admin Role Requirement

```
INVARIANT: Admin operations require admin role

CONSTRAINT:
  Admin routes and operations require:
    profiles.is_admin = true
    OR profiles.admin_role IS NOT NULL

ENFORCEMENT:
  - Component-level check via useAuth().isAdmin
  - RPC functions check admin status

KNOWN GAP:
  - Router-level guard not implemented
  - Some admin pages lack permission checks
```

### INV-AUTH-007: Email Verification for Posting

```
INVARIANT: Users must verify email before posting rides

CONSTRAINT:
  PostRide requires:
    auth.user.email_confirmed_at IS NOT NULL

ENFORCEMENT:
  - PostRide.tsx checks isEmailVerified
  - Shows error if not verified

NOTE: NOT enforced for booking rides (asymmetric)
```

### INV-AUTH-008: Profile Completion for Transactions

```
INVARIANT: Users must complete profile before posting/requesting rides

CONSTRAINT:
  /post-ride and /request-ride require:
    isProfileComplete() = true

ENFORCEMENT:
  - RequireProfileComplete route guard
  - Service gating via checkAccess()
```

---

## 3. TIME-BASED INVARIANTS

### INV-TIME-001: Future Departure Requirement

```
INVARIANT: Rides must have future departure time at creation

CONSTRAINT:
  rides.departure_time > NOW() (at INSERT time)

ENFORCEMENT:
  - Form validation in PostRide.tsx
  - Should be enforced at RPC level (currently UI only)
```

### INV-TIME-002: Booking on Active Rides Only

```
INVARIANT: Bookings can only be created for active rides

CONSTRAINT:
  At booking creation:
    rides.status = 'active'
    AND rides.departure_time > NOW()

ENFORCEMENT:
  - request_booking() RPC validates ride status
  - FindRides query filters: departure_time >= now()
```

### INV-TIME-003: Last-Minute Cancellation Threshold

```
INVARIANT: Cancellations within 2 hours of departure are "last-minute"

FORMULA:
  is_last_minute_cancellation = (departure_time - NOW()) <= interval '2 hours'

ENFORCEMENT:
  - cancel_booking() RPC calculates and records
  - Impacts reliability_score

NOTE: Uses <= not <, so exactly 2 hours IS last-minute
```

### INV-TIME-004: Ride Expiry Condition

```
INVARIANT: Rides expire when departure time passes

CONDITION:
  Ride is expired IF:
    rides.departure_time < NOW()
    OR rides.available_until < NOW() (for flexible rides)

SYNC BEHAVIOR:
  Expired rides should transition to 'completed'
  Associated bookings should transition to 'completed'

ENFORCEMENT:
  - sync_expired_ride_state() RPC
  - Called manually on MyRides page load

KNOWN GAP: No automatic background sync
```

### INV-TIME-005: Terminal State Timestamp

```
INVARIANT: Terminal state transitions must record timestamp

CONSTRAINT:
  When booking.status → 'cancelled':
    booking.cancelled_at = NOW()
    booking.updated_at = NOW()

  When ride.status → 'completed' or 'cancelled':
    ride.closed_at = NOW() (if applicable)
    ride.updated_at = NOW()

ENFORCEMENT:
  - RPC sets timestamps on state change
```

---

## 4. NOTIFICATION INVARIANTS

### INV-NOTIF-001: Booking Request Notification

```
INVARIANT: Driver must be notified when booking is created

TRIGGER EVENT:
  INSERT INTO ride_bookings WHERE status = 'pending'

REQUIRED NOTIFICATION:
  INSERT INTO notifications (
    user_id = ride.driver_id,
    type = 'BOOKING_REQUEST',
    data = {booking_id, ride_id, passenger_id, seats_requested}
  )

ENFORCEMENT:
  - notify_driver_new_booking() trigger

KNOWN GAP: Trigger can fail silently after booking commits
```

### INV-NOTIF-002: Booking Confirmation Notification

```
INVARIANT: Passenger must be notified when booking is confirmed

TRIGGER EVENT:
  UPDATE ride_bookings SET status = 'confirmed'
  WHERE OLD.status = 'pending'

REQUIRED NOTIFICATION:
  INSERT INTO notifications (
    user_id = booking.passenger_id,
    type = 'BOOKING_CONFIRMED',
    data = {booking_id, ride_id, driver_id}
  )

ENFORCEMENT:
  - notify_passenger_booking_status() trigger
```

### INV-NOTIF-003: Booking Cancellation Notification

```
INVARIANT: Passenger must be notified when booking is cancelled

TRIGGER EVENT:
  UPDATE ride_bookings SET status = 'cancelled'
  WHERE OLD.status IN ('pending', 'confirmed')

REQUIRED NOTIFICATION:
  INSERT INTO notifications (
    user_id = booking.passenger_id,
    type = 'BOOKING_CANCELLED',
    data = {booking_id, ride_id, driver_id}
  )

ENFORCEMENT:
  - notify_passenger_booking_status() trigger
```

### INV-NOTIF-004: Notification Type Validity

```
INVARIANT: Notification type must be in canonical set

CONSTRAINT:
  notifications.type IN (
    'NEW_MESSAGE', 'FRIEND_REQUEST', 'FRIEND_REQUEST_ACCEPTED',
    'FORUM_REPLY', 'FORUM_MENTION', 'RIDE_MATCH',
    'BOOKING_REQUEST', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED',
    'REVIEW', 'SAFETY_ALERT', 'SYSTEM'
  )

ENFORCEMENT:
  - Database CHECK constraint
  - TypeScript type definition must match

VIOLATION RESPONSE:
  - INSERT fails with constraint violation
```

### INV-NOTIF-005: Notification Data Completeness

```
INVARIANT: Booking notifications must include booking_id

CONSTRAINT:
  For type IN ('BOOKING_REQUEST', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED'):
    notifications.data->>'booking_id' IS NOT NULL

ENFORCEMENT:
  - Trigger functions build data object
  - Should add NOT NULL check on data->>field
```

### INV-NOTIF-006: Ride Cancellation Passenger Notification

```
INVARIANT: Passengers should be notified when their ride is cancelled

TRIGGER EVENT:
  UPDATE rides SET status = 'cancelled'
  WHERE EXISTS confirmed bookings

REQUIRED NOTIFICATION:
  For each confirmed booking:
    INSERT INTO notifications (
      user_id = booking.passenger_id,
      type = 'BOOKING_CANCELLED',
      data = {booking_id, ride_id, reason: 'ride cancelled'}
    )

KNOWN GAP: No trigger currently implements this
CURRENT BEHAVIOR: Passengers rely on realtime subscription or page reload
```

---

## 5. ADMIN SAFETY INVARIANTS

### INV-ADMIN-001: Admin Audit Trail

```
INVARIANT: All admin actions must be logged

CONSTRAINT:
  Every admin operation must INSERT INTO admin_audit_log:
    - admin_id
    - action
    - target_type
    - target_id
    - details (JSONB)
    - created_at

OPERATIONS REQUIRING AUDIT:
  - User ban/suspend
  - Booking override
  - Ride cancellation
  - Permission changes
  - User verification
```

### INV-ADMIN-002: Admin Role Hierarchy

```
INVARIANT: Admin actions must respect role hierarchy

HIERARCHY (high to low):
  4: super_admin
  3: admin
  2: moderator
  1: analyst

CONSTRAINT:
  Admin can only modify users with lower role level
  Only super_admin can modify other admins

ENFORCEMENT:
  - hasRole(minRole) check in RPC
  - PermissionGuard component
```

### INV-ADMIN-003: Permission Requirement

```
INVARIANT: Admin actions require specific permissions

PERMISSION CATEGORIES:
  - users.view, users.edit, users.ban, users.delete
  - rides.view, rides.manage
  - bookings.view, bookings.manage
  - messages.view, messages.moderate
  - safety.view, safety.investigate, safety.resolve
  - verification.view, verification.approve
  - analytics.view
  - system.settings, system.diagnostics, system.bulk_operations

ENFORCEMENT:
  - hasPermission(permission) check
  - PermissionGuard component

KNOWN GAPS:
  - /admin/audit, /admin/bugs, /admin/beta, /admin/feedback lack checks
```

### INV-ADMIN-004: Destructive Action Confirmation

```
INVARIANT: Destructive admin actions require confirmation

DESTRUCTIVE ACTIONS:
  - Ban user
  - Delete user
  - Force cancel ride
  - Bulk operations

CONSTRAINT:
  Must show confirmation dialog before execution

ENFORCEMENT:
  - UI confirmation modals
  - Two-step RPC pattern (prepare + execute)
```

### INV-ADMIN-005: No Self-Demotion

```
INVARIANT: Admins cannot demote themselves

CONSTRAINT:
  Admin role change operations:
    target_user_id != auth.uid()

ENFORCEMENT:
  - RPC validation
```

---

## 6. DATA INTEGRITY INVARIANTS

### INV-DATA-001: Foreign Key Integrity

```
INVARIANT: All foreign keys must reference valid records

CRITICAL RELATIONSHIPS:
  - ride_bookings.ride_id → rides.id
  - ride_bookings.passenger_id → profiles.id
  - rides.driver_id → profiles.id
  - rides.vehicle_id → vehicles.id
  - vehicles.user_id → profiles.id
  - notifications.user_id → profiles.id

ENFORCEMENT:
  - Database FOREIGN KEY constraints
  - ON DELETE CASCADE where appropriate
```

### INV-DATA-002: Cascade Delete Safety

```
INVARIANT: Cascade deletes must not orphan critical data

CASCADE CONFIGURATION:
  - rides.vehicle_id: CASCADE (ride deleted if vehicle deleted)
  - ride_bookings.ride_id: CASCADE (booking deleted if ride deleted)
  - booking_history.booking_id: CASCADE

ENFORCEMENT:
  - FK ON DELETE CASCADE
  - deactivate_vehicle() guards against active ride deletion
```

### INV-DATA-003: Vehicle Deactivation Guard

```
INVARIANT: Vehicles cannot be deactivated if assigned to active rides

CONSTRAINT:
  deactivate_vehicle(vehicle_id) blocked IF:
    EXISTS (
      SELECT 1 FROM rides
      WHERE vehicle_id = p_vehicle_id
        AND (available_until > NOW() OR departure_time > NOW())
        AND status NOT IN ('cancelled', 'completed')
    )

ENFORCEMENT:
  - deactivate_vehicle() RPC check
```

### INV-DATA-004: Unique Booking Constraint

```
INVARIANT: User cannot have multiple active bookings for same ride

CONSTRAINT:
  UNIQUE(ride_id, passenger_id) WHERE status != 'cancelled'

ENFORCEMENT:
  - Partial unique index: idx_unique_active_booking_per_passenger

VIOLATION RESPONSE:
  - INSERT fails with duplicate key error (code 23505)
  - UI shows "You have already requested this ride"
```

### INV-DATA-005: Ride Status Consistency

```
INVARIANT: Only valid ride statuses allowed

CONSTRAINT:
  rides.status IN ('active', 'in-progress', 'completed', 'cancelled')

ENFORCEMENT:
  - Database CHECK constraint
  - TypeScript type enforcement
```

### INV-DATA-006: Booking Status Consistency

```
INVARIANT: Only valid booking statuses allowed

CONSTRAINT:
  ride_bookings.status IN ('pending', 'confirmed', 'completed', 'cancelled')

ENFORCEMENT:
  - Database CHECK constraint
  - TypeScript type enforcement

DEPRECATED VALUES (do NOT use):
  - 'rejected', 'declined', 'active', 'paid'
```

### INV-DATA-007: Phone Field Canonical Source

```
INVARIANT: phone_e164 is the canonical phone field

CANONICAL DECISION:
  - profiles.phone_e164: Primary source (E.164 format)
  - profiles.phone: Display format (deprecated)
  - profiles.phone_number: Alias (deprecated)

ENFORCEMENT:
  - New code should read/write phone_e164
  - Other fields maintained for backward compatibility
```

### INV-DATA-008: Notification Read Status

```
INVARIANT: read_at is the canonical read status field

CANONICAL DECISION:
  - notifications.read_at: Timestamp when read (NULL = unread)
  - notifications.is_read: DEPRECATED

ENFORCEMENT:
  - New code uses: is_read = (read_at IS NOT NULL)
```

---

## APPENDIX: INVARIANT VALIDATION QUERIES

### Seat Accounting Validation

```sql
-- Check for seat count mismatches
SELECT
  r.id,
  r.available_seats AS recorded,
  r.total_seats - COALESCE(SUM(
    CASE WHEN rb.status IN ('pending', 'confirmed')
    THEN rb.seats_requested ELSE 0 END
  ), 0) AS calculated
FROM rides r
LEFT JOIN ride_bookings rb ON rb.ride_id = r.id
GROUP BY r.id
HAVING r.available_seats != r.total_seats - COALESCE(SUM(
  CASE WHEN rb.status IN ('pending', 'confirmed')
  THEN rb.seats_requested ELSE 0 END
), 0);

-- Check for negative available seats
SELECT id, available_seats FROM rides WHERE available_seats < 0;

-- Check for available > total
SELECT id, available_seats, total_seats FROM rides
WHERE available_seats > total_seats;
```

### Notification Existence Validation

```sql
-- Find bookings without corresponding notifications
SELECT rb.id, rb.status, rb.created_at
FROM ride_bookings rb
WHERE rb.status = 'pending'
  AND NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.data->>'booking_id' = rb.id::text
      AND n.type = 'BOOKING_REQUEST'
  );
```

### Status Validity Check

```sql
-- Find invalid ride statuses
SELECT id, status FROM rides
WHERE status NOT IN ('active', 'in-progress', 'completed', 'cancelled');

-- Find invalid booking statuses
SELECT id, status FROM ride_bookings
WHERE status NOT IN ('pending', 'confirmed', 'completed', 'cancelled');

-- Find invalid notification types
SELECT id, type FROM notifications
WHERE type NOT IN (
  'NEW_MESSAGE', 'FRIEND_REQUEST', 'FRIEND_REQUEST_ACCEPTED',
  'FORUM_REPLY', 'FORUM_MENTION', 'RIDE_MATCH',
  'BOOKING_REQUEST', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED',
  'REVIEW', 'SAFETY_ALERT', 'SYSTEM'
);
```

### Authorization Validation

```sql
-- Find bookings where passenger is the driver
SELECT rb.id, rb.passenger_id, r.driver_id
FROM ride_bookings rb
JOIN rides r ON r.id = rb.ride_id
WHERE rb.passenger_id = r.driver_id;

-- Find vehicles not owned by their assigned rides' drivers
SELECT r.id AS ride_id, r.driver_id, v.user_id AS vehicle_owner
FROM rides r
JOIN vehicles v ON v.id = r.vehicle_id
WHERE r.driver_id != v.user_id;
```

---

## INVARIANT SEVERITY LEVELS

| Level | Description | Enforcement |
|-------|-------------|-------------|
| **CRITICAL** | System integrity at risk | Database constraint + RPC + UI |
| **HIGH** | Logic correctness | RPC + UI validation |
| **MEDIUM** | Data quality | UI validation + background checks |
| **LOW** | Best practice | UI validation |

### Severity Classification

| Invariant | Severity |
|-----------|----------|
| INV-SEAT-001 through INV-SEAT-007 | CRITICAL |
| INV-AUTH-001 through INV-AUTH-005 | CRITICAL |
| INV-AUTH-006 through INV-AUTH-008 | HIGH |
| INV-TIME-001 through INV-TIME-005 | HIGH |
| INV-NOTIF-001 through INV-NOTIF-006 | HIGH |
| INV-ADMIN-001 through INV-ADMIN-005 | CRITICAL |
| INV-DATA-001 through INV-DATA-008 | CRITICAL |

---

**END OF INVARIANTS**
