# CARPOOL NETWORK - CANONICAL STATE MODEL

**Version:** 1.0
**Source of Truth:** AUDIT_BASELINE.md (January 11, 2026)
**Status:** NORMATIVE SPECIFICATION

---

## TABLE OF CONTENTS

1. [Rides State Model](#1-rides-state-model)
2. [Ride Bookings State Model](#2-ride-bookings-state-model)
3. [Notifications State Model](#3-notifications-state-model)
4. [Deprecated States](#4-deprecated-states)
5. [State Synchronization Rules](#5-state-synchronization-rules)

---

## 1. RIDES STATE MODEL

### 1.1 Canonical States

| State | Value | Description |
|-------|-------|-------------|
| ACTIVE | `'active'` | Ride is posted and accepting bookings |
| IN_PROGRESS | `'in-progress'` | Driver has started the ride |
| COMPLETED | `'completed'` | Ride has finished (terminal) |
| CANCELLED | `'cancelled'` | Driver cancelled the ride (terminal) |

**CANONICAL FORMAT:**
- All lowercase
- Hyphenated compound words: `'in-progress'` (NOT `'in_progress'`)
- British spelling: `'cancelled'` (NOT `'canceled'`)

### 1.2 State Transition Diagram

```
                              ┌─────────────────┐
                              │                 │
                              │     active      │
                              │                 │
                              └────────┬────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
           ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
           │               │  │               │  │               │
           │  in-progress  │  │   completed   │  │   cancelled   │
           │               │  │   (auto/     │  │    (driver)   │
           └───────┬───────┘  │    manual)    │  │               │
                   │          └───────────────┘  └───────────────┘
                   │                  ▲
                   │                  │
                   └──────────────────┘
```

### 1.3 Allowed Transitions

| From | To | Trigger | Actor |
|------|----|---------|-------|
| `'active'` | `'in-progress'` | Driver starts ride | Driver (manual) |
| `'active'` | `'completed'` | Departure time passed | System (auto-expiry) |
| `'active'` | `'cancelled'` | Driver cancels | Driver (manual) |
| `'in-progress'` | `'completed'` | Driver ends ride | Driver (manual) |
| `'in-progress'` | `'completed'` | Departure time passed | System (auto-expiry) |
| `'in-progress'` | `'cancelled'` | Driver cancels mid-ride | Driver (manual) |

### 1.4 Terminal States

| State | Terminal? | Notes |
|-------|-----------|-------|
| `'active'` | No | Can transition to any other state |
| `'in-progress'` | No | Can transition to completed or cancelled |
| `'completed'` | **YES** | No further transitions allowed |
| `'cancelled'` | **YES** | No further transitions allowed |

### 1.5 Database Constraint

```sql
-- CANONICAL: rides.status CHECK constraint
CHECK (status IN ('active', 'in-progress', 'completed', 'cancelled'))
DEFAULT 'active'
```

---

## 2. RIDE BOOKINGS STATE MODEL

### 2.1 Canonical States

| State | Value | Description |
|-------|-------|-------------|
| PENDING | `'pending'` | Awaiting driver confirmation |
| CONFIRMED | `'confirmed'` | Driver accepted the booking |
| COMPLETED | `'completed'` | Ride finished, booking fulfilled (terminal) |
| CANCELLED | `'cancelled'` | Cancelled by driver or passenger (terminal) |

**CANONICAL FORMAT:**
- All lowercase
- British spelling: `'cancelled'` (NOT `'canceled'`)

### 2.2 State Transition Diagram

```
                              ┌─────────────────┐
                              │                 │
                              │     pending     │
                              │                 │
                              └────────┬────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │                                     │
                    ▼                                     ▼
           ┌───────────────┐                     ┌───────────────┐
           │               │                     │               │
           │   confirmed   │                     │   cancelled   │
           │               │                     │ (by driver    │
           └───────┬───────┘                     │  or passenger)│
                   │                             └───────────────┘
                   │                                     ▲
                   ├──────────────────┐                  │
                   │                  │                  │
                   ▼                  └──────────────────┘
           ┌───────────────┐
           │               │
           │   completed   │
           │               │
           └───────────────┘
```

### 2.3 Allowed Transitions

| From | To | Trigger | Actor |
|------|----|---------|-------|
| `'pending'` | `'confirmed'` | Driver accepts | Driver |
| `'pending'` | `'cancelled'` | Driver declines | Driver |
| `'pending'` | `'cancelled'` | Passenger cancels | Passenger |
| `'confirmed'` | `'completed'` | Ride completes | System (auto-expiry) |
| `'confirmed'` | `'cancelled'` | Driver cancels booking | Driver |
| `'confirmed'` | `'cancelled'` | Passenger cancels booking | Passenger |

### 2.4 Terminal States

| State | Terminal? | Notes |
|-------|-----------|-------|
| `'pending'` | No | Can transition to confirmed or cancelled |
| `'confirmed'` | No | Can transition to completed or cancelled |
| `'completed'` | **YES** | No further transitions allowed |
| `'cancelled'` | **YES** | No further transitions allowed |

### 2.5 Database Constraint

```sql
-- CANONICAL: ride_bookings.status CHECK constraint
CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled'))
DEFAULT 'pending'
```

### 2.6 Seat Impact by State

| Transition | Seat Impact |
|------------|-------------|
| → `'pending'` (create) | `available_seats -= seats_requested` |
| `'pending'` → `'confirmed'` | No change (seats already reserved) |
| `'pending'` → `'cancelled'` | `available_seats += seats_requested` |
| `'confirmed'` → `'cancelled'` | `available_seats += seats_requested` |
| → `'completed'` | No change |

---

## 3. NOTIFICATIONS STATE MODEL

### 3.1 Canonical Notification Types

**CANONICAL: 12 types allowed by database CHECK constraint**

| Type | Value | Description | Recipient |
|------|-------|-------------|-----------|
| NEW_MESSAGE | `'NEW_MESSAGE'` | Direct message received | Message recipient |
| FRIEND_REQUEST | `'FRIEND_REQUEST'` | Friend request received | Request target |
| FRIEND_REQUEST_ACCEPTED | `'FRIEND_REQUEST_ACCEPTED'` | Friend request accepted | Request sender |
| FORUM_REPLY | `'FORUM_REPLY'` | Reply on forum post | Post author |
| FORUM_MENTION | `'FORUM_MENTION'` | Mentioned in forum | Mentioned user |
| RIDE_MATCH | `'RIDE_MATCH'` | Ride matched to request | Requestor |
| BOOKING_REQUEST | `'BOOKING_REQUEST'` | New booking request | Driver |
| BOOKING_CONFIRMED | `'BOOKING_CONFIRMED'` | Booking confirmed | Passenger |
| BOOKING_CANCELLED | `'BOOKING_CANCELLED'` | Booking cancelled | Passenger |
| REVIEW | `'REVIEW'` | Review received | Reviewee |
| SAFETY_ALERT | `'SAFETY_ALERT'` | Safety alert | Affected user |
| SYSTEM | `'SYSTEM'` | System notification | Target user |

**CANONICAL FORMAT:**
- UPPER_CASE with underscores
- NOT snake_case
- NOT lowercase

### 3.2 Database Constraint

```sql
-- CANONICAL: notifications.type CHECK constraint
CHECK (type IN (
  'NEW_MESSAGE',
  'FRIEND_REQUEST',
  'FRIEND_REQUEST_ACCEPTED',
  'FORUM_REPLY',
  'FORUM_MENTION',
  'RIDE_MATCH',
  'BOOKING_REQUEST',
  'BOOKING_CONFIRMED',
  'BOOKING_CANCELLED',
  'REVIEW',
  'SAFETY_ALERT',
  'SYSTEM'
))
```

### 3.3 Notification Read State

**CANONICAL: Use `read_at` timestamp (NOT `is_read` boolean)**

| Field | Type | Description |
|-------|------|-------------|
| `read_at` | `timestamptz NULL` | Timestamp when notification was read |

**Read status logic:**
```sql
-- Notification is read if read_at is NOT NULL
is_read = (read_at IS NOT NULL)
```

### 3.4 Notification Data Schema

```typescript
// CANONICAL: notifications.data JSONB structure by type

interface BookingNotificationData {
  booking_id: string;    // UUID
  ride_id: string;       // UUID
  passenger_id?: string; // For BOOKING_REQUEST
  driver_id?: string;    // For BOOKING_CONFIRMED/CANCELLED
  seats_requested?: number;
}

interface MessageNotificationData {
  message_id: string;
  sender_id: string;
  conversation_id?: string;
}

interface FriendNotificationData {
  request_id?: string;
  user_id: string;
  user_name?: string;
}

interface ReviewNotificationData {
  review_id: string;
  reviewer_id: string;
  ride_id: string;
  rating: number;
}

interface SystemNotificationData {
  action_url?: string;
  severity?: 'info' | 'warning' | 'error';
}
```

### 3.5 Notification Triggers

| Event | Notification Type | Trigger Function |
|-------|-------------------|------------------|
| Booking INSERT (status='pending') | `BOOKING_REQUEST` | `notify_driver_new_booking()` |
| Booking UPDATE (status→'confirmed') | `BOOKING_CONFIRMED` | `notify_passenger_booking_status()` |
| Booking UPDATE (status→'cancelled') | `BOOKING_CANCELLED` | `notify_passenger_booking_status()` |
| Message INSERT | `NEW_MESSAGE` | `notify_on_new_message()` |

---

## 4. DEPRECATED STATES

### 4.1 Deprecated Booking States

| Deprecated Value | Found In | Canonical Replacement |
|------------------|----------|----------------------|
| `'rejected'` | staging.sql:1657 | `'cancelled'` |
| `'declined'` | UI display text | `'cancelled'` |
| `'active'` | spec-audit-report | NOT VALID - remove |
| `'paid'` | spec-audit-report | NOT VALID - remove |

**CANONICAL DECISION:** When a driver declines a booking:
- Database status = `'cancelled'`
- UI may display "declined" as human-readable text
- `cancellation_reason` may contain "declined by driver"

```sql
-- DEPRECATED: Do NOT use these values
-- 'rejected' - Remove from staging.sql
-- 'declined' - UI text only, not a status
-- 'active' - Not a valid booking status
-- 'paid' - Not applicable (no payments)
```

### 4.2 Deprecated Notification Types

#### TypeScript-Only Types (NOT in DB constraint)

| Deprecated Type | Reason | Action |
|-----------------|--------|--------|
| `RIDE_STARTED` | Not in DB CHECK | Remove from TypeScript |
| `RIDE_LOCATION_UPDATE` | Not in DB CHECK | Remove from TypeScript |
| `RIDE_COMPLETED` | Not in DB CHECK | Remove from TypeScript |
| `RIDE_DELAYED` | Not in DB CHECK | Remove from TypeScript |
| `DRIVER_ARRIVING` | Not in DB CHECK | Remove from TypeScript |
| `ACHIEVEMENT_UNLOCKED` | Not in DB CHECK | Remove from TypeScript |
| `BADGE_EARNED` | Not in DB CHECK | Remove from TypeScript |
| `LEVEL_UP` | Not in DB CHECK | Remove from TypeScript |
| `ECO_MILESTONE` | Not in DB CHECK | Remove from TypeScript |
| `CO2_SAVED` | Not in DB CHECK | Remove from TypeScript |

**CANONICAL DECISION:** These 10 types are UNREACHABLE and should be removed from TypeScript definitions unless the database CHECK constraint is updated.

#### UI snake_case Types (Mapping Required)

| UI Type (deprecated) | Canonical DB Type |
|----------------------|-------------------|
| `ride_request` | `BOOKING_REQUEST` |
| `ride_confirmed` | `BOOKING_CONFIRMED` |
| `ride_cancelled` | `BOOKING_CANCELLED` |
| `ride_reminder` | `SYSTEM` (with data.type='reminder') |
| `message` | `NEW_MESSAGE` |
| `friend_request` | `FRIEND_REQUEST` |
| `friend_accepted` | `FRIEND_REQUEST_ACCEPTED` |
| `achievement` | **DEPRECATED** - not in DB |
| `milestone_reached` | **DEPRECATED** - not in DB |
| `challenge` | **DEPRECATED** - not in DB |
| `event` | `SYSTEM` (with data.type='event') |
| `waitlist_available` | `SYSTEM` (with data.type='waitlist') |
| `review` | `REVIEW` |
| `system` | `SYSTEM` |
| `promo` | `SYSTEM` (with data.type='promo') |

**CANONICAL DECISION:** UI must map display types from UPPER_CASE database types. Do NOT store snake_case in database.

### 4.3 Deprecated Notification Fields

| Field | Status | Replacement |
|-------|--------|-------------|
| `is_read` | **DEPRECATED** | Use `read_at IS NOT NULL` |
| `title` | **DEPRECATED** | Compute from `type` in application |
| `message` | **DEPRECATED** | Compute from `type` + `data` in application |

---

## 5. STATE SYNCHRONIZATION RULES

### 5.1 Ride ↔ Booking State Sync

| Ride State | Valid Booking States |
|------------|---------------------|
| `'active'` | `'pending'`, `'confirmed'` |
| `'in-progress'` | `'confirmed'` |
| `'completed'` | `'completed'` |
| `'cancelled'` | `'cancelled'`, `'completed'` |

**Auto-sync rule:** When ride transitions to `'completed'`:
```sql
UPDATE ride_bookings
SET status = 'completed'
WHERE ride_id = {ride_id}
  AND status IN ('pending', 'confirmed');
```

### 5.2 Booking State Validation

| Operation | Validation Rule |
|-----------|-----------------|
| Create booking | Ride must be `'active'` |
| Confirm booking | Booking must be `'pending'`, Ride must be `'active'` |
| Cancel booking | Booking must NOT be `'completed'` or `'cancelled'` |
| Complete booking | Ride must be `'completed'` |

### 5.3 Notification Creation Rules

| Booking Transition | Required Notification |
|--------------------|----------------------|
| → `'pending'` (create) | `BOOKING_REQUEST` to driver |
| `'pending'` → `'confirmed'` | `BOOKING_CONFIRMED` to passenger |
| Any → `'cancelled'` | `BOOKING_CANCELLED` to passenger |

### 5.4 State Invariants

```
INVARIANT 1: Booking on non-active ride
═══════════════════════════════════════
IF ride.status != 'active'
THEN new bookings MUST be rejected

INVARIANT 2: Terminal state immutability
════════════════════════════════════════
IF booking.status IN ('completed', 'cancelled')
THEN no further state changes allowed

IF ride.status IN ('completed', 'cancelled')
THEN no further state changes allowed

INVARIANT 3: Seat consistency
═════════════════════════════
FOR all rides:
  available_seats = total_seats - SUM(
    seats_requested
    FROM ride_bookings
    WHERE ride_id = ride.id
      AND status IN ('pending', 'confirmed')
  )

INVARIANT 4: Notification existence
═══════════════════════════════════
FOR every booking state change:
  MUST exist notification with:
    - user_id = affected_party
    - type = corresponding notification type
    - data.booking_id = booking.id
```

---

## APPENDIX: TYPE DEFINITIONS

### Canonical TypeScript Types

```typescript
// CANONICAL: Ride status type
type RideStatus = 'active' | 'in-progress' | 'completed' | 'cancelled';

// CANONICAL: Booking status type
type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

// CANONICAL: Notification type (matches DB constraint)
type NotificationType =
  | 'NEW_MESSAGE'
  | 'FRIEND_REQUEST'
  | 'FRIEND_REQUEST_ACCEPTED'
  | 'FORUM_REPLY'
  | 'FORUM_MENTION'
  | 'RIDE_MATCH'
  | 'BOOKING_REQUEST'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'REVIEW'
  | 'SAFETY_ALERT'
  | 'SYSTEM';

// DEPRECATED: Do NOT use these types
// type DeprecatedBookingStatus = 'rejected' | 'declined' | 'active' | 'paid';
// type DeprecatedNotificationType =
//   | 'RIDE_STARTED' | 'RIDE_LOCATION_UPDATE' | 'RIDE_COMPLETED'
//   | 'RIDE_DELAYED' | 'DRIVER_ARRIVING' | 'ACHIEVEMENT_UNLOCKED'
//   | 'BADGE_EARNED' | 'LEVEL_UP' | 'ECO_MILESTONE' | 'CO2_SAVED';
```

### UI Display Mapping

```typescript
// CANONICAL: Map DB status to UI display text
const BOOKING_STATUS_DISPLAY: Record<BookingStatus, string> = {
  'pending': 'Pending',
  'confirmed': 'Confirmed',
  'completed': 'Completed',
  'cancelled': 'Cancelled',
};

// For driver-declined bookings, check cancellation_reason
function getBookingDisplayStatus(
  status: BookingStatus,
  cancellationReason?: string
): string {
  if (status === 'cancelled' && cancellationReason?.includes('driver')) {
    return 'Declined';  // UI display only
  }
  return BOOKING_STATUS_DISPLAY[status];
}

// CANONICAL: Map DB notification type to UI display
const NOTIFICATION_TYPE_DISPLAY: Record<NotificationType, string> = {
  'NEW_MESSAGE': 'New Message',
  'FRIEND_REQUEST': 'Friend Request',
  'FRIEND_REQUEST_ACCEPTED': 'Friend Accepted',
  'FORUM_REPLY': 'Forum Reply',
  'FORUM_MENTION': 'Mentioned',
  'RIDE_MATCH': 'Ride Match',
  'BOOKING_REQUEST': 'Booking Request',
  'BOOKING_CONFIRMED': 'Booking Confirmed',
  'BOOKING_CANCELLED': 'Booking Cancelled',
  'REVIEW': 'New Review',
  'SAFETY_ALERT': 'Safety Alert',
  'SYSTEM': 'System',
};
```

---

**END OF STATE MODEL**
