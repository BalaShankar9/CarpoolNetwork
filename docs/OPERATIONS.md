# CarpoolNetwork Operations Manual

> **Phase C Documentation**: Reliability, Automation, and Confidence Hardening

## Overview

This document describes the automated background jobs, monitoring systems, and operational procedures for maintaining system health.

---

## 1. Automated Background Jobs

### 1.1 Ride Expiry (`expire_rides`)

**Purpose**: Automatically transitions expired rides and their bookings to terminal states.

**Frequency**: Every 5 minutes (recommended)

**What it does**:
1. Finds rides where `departure_time` or `available_until` has passed
2. Updates all `pending`/`confirmed` bookings to `completed`
3. Creates notifications for affected passengers
4. Updates rides to `completed` status
5. Logs all actions to `system_job_log`

**Safety features**:
- Uses `FOR UPDATE SKIP LOCKED` for concurrent safety
- Idempotent - safe to run multiple times
- Logs all operations for audit trail

**Manual execution**:
```sql
SELECT expire_rides();
```

**Expected output**:
```json
{
  "success": true,
  "rides_expired": 5,
  "bookings_completed": 12,
  "notifications_created": 12
}
```

---

### 1.2 Seat Reconciliation (`reconcile_seat_counts`)

**Purpose**: Fixes any mismatches between `available_seats` and actual booking counts.

**Frequency**: Daily at 3 AM (recommended)

**What it does**:
1. Calculates expected `available_seats` based on `pending`/`confirmed` bookings
2. Compares with stored `available_seats` value
3. Logs discrepancies to `admin_audit_log`
4. Auto-fixes mismatched values

**Manual execution**:
```sql
SELECT reconcile_seat_counts();
```

**Expected output**:
```json
{
  "success": true,
  "mismatches_found": 3,
  "mismatches_fixed": 3
}
```

---

### 1.3 Notification Repair (`repair_missing_notifications`)

**Purpose**: Creates missing notifications for booking state changes.

**Frequency**: Daily at 4 AM (recommended)

**What it does**:
1. Finds bookings missing `BOOKING_REQUEST` notifications
2. Finds confirmed bookings missing `BOOKING_CONFIRMED` notifications
3. Finds cancelled bookings missing `BOOKING_CANCELLED` notifications
4. Creates missing notifications with `repaired: true` flag
5. Only repairs bookings from the last 30 days

**Manual execution**:
```sql
SELECT repair_missing_notifications();
```

**Expected output**:
```json
{
  "success": true,
  "booking_requests_created": 2,
  "confirmations_created": 5,
  "cancellations_created": 1,
  "total_notifications_created": 8
}
```

---

### 1.4 Invariant Check (`check_system_invariants`)

**Purpose**: Validates all critical system invariants and logs violations.

**Frequency**: Every 15 minutes (recommended)

**What it checks**:

| Check ID | Name | Severity | Description |
|----------|------|----------|-------------|
| INV-SEAT-001 | seat_mismatch | Critical | `available_seats` doesn't match booking sum |
| INV-SEAT-002 | negative_seats | Critical | `available_seats < 0` |
| INV-SEAT-003 | seat_overflow | Critical | `available_seats > total_seats` |
| INV-STATE-001 | active_booking_on_terminal_ride | Critical | Active booking on completed/cancelled ride |
| INV-STATE-002 | invalid_ride_status | Critical | Ride status not in canonical set |
| INV-STATE-003 | invalid_booking_status | Critical | Booking status not in canonical set |
| INV-UNIQUE-001 | duplicate_active_bookings | Critical | Same passenger has multiple active bookings |
| INV-TIME-001 | expired_active_ride | Warning | Ride past expiry but still active |

**Manual execution**:
```sql
SELECT check_system_invariants();
```

**Expected output (healthy system)**:
```json
{
  "success": true,
  "healthy": true,
  "total_violations": 0,
  "violations": []
}
```

**Expected output (with violations)**:
```json
{
  "success": true,
  "healthy": false,
  "total_violations": 2,
  "violations": [
    {
      "check": "INV-SEAT-001",
      "name": "seat_mismatch",
      "severity": "critical",
      "ride_id": "abc-123",
      "current": 2,
      "expected": 1
    }
  ]
}
```

---

## 2. Scheduling Setup

### Option A: Supabase pg_cron (Recommended)

```sql
-- Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Ride expiry: every 5 minutes
SELECT cron.schedule('expire-rides', '*/5 * * * *', $$SELECT expire_rides()$$);

-- Seat reconciliation: daily at 3 AM UTC
SELECT cron.schedule('reconcile-seats', '0 3 * * *', $$SELECT reconcile_seat_counts()$$);

-- Notification repair: daily at 4 AM UTC
SELECT cron.schedule('repair-notifications', '0 4 * * *', $$SELECT repair_missing_notifications()$$);

-- Invariant check: every 15 minutes
SELECT cron.schedule('check-invariants', '*/15 * * * *', $$SELECT check_system_invariants()$$);
```

**View scheduled jobs**:
```sql
SELECT * FROM cron.job;
```

**Remove a job**:
```sql
SELECT cron.unschedule('expire-rides');
```

### Option B: External Scheduler

Use GitHub Actions, AWS Lambda, or any scheduler to call the Supabase REST API:

```bash
# Example: Call expire_rides
curl -X POST 'https://YOUR-PROJECT.supabase.co/rest/v1/rpc/expire_rides' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

---

## 3. Monitoring & Alerting

### 3.1 Quick Health Check

```sql
SELECT get_system_health_summary();
```

Returns:
```json
{
  "timestamp": "2026-01-11T12:00:00Z",
  "total_rides": 1250,
  "active_rides": 45,
  "in_progress_rides": 3,
  "total_bookings": 3200,
  "pending_bookings": 12,
  "confirmed_bookings": 28,
  "expired_active_rides": 0,
  "seat_mismatches": 0,
  "unresolved_violations": 0,
  "recent_job_status": [...]
}
```

### 3.2 View Job History

```sql
-- Last 20 jobs
SELECT 
  job_name,
  status,
  started_at,
  completed_at,
  records_processed,
  error_message
FROM system_job_log
ORDER BY started_at DESC
LIMIT 20;
```

### 3.3 View Unresolved Violations

```sql
SELECT * FROM invariant_violations
WHERE resolved_at IS NULL
ORDER BY 
  CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
  detected_at DESC;
```

### 3.4 Mark Violation Resolved

```sql
UPDATE invariant_violations
SET resolved_at = now(), notes = 'Fixed manually by admin'
WHERE id = 'violation-uuid';
```

---

## 4. Emergency Procedures

### 4.1 If Jobs Are Failing

1. Check recent job status:
   ```sql
   SELECT * FROM system_job_log 
   WHERE status = 'failed' 
   ORDER BY started_at DESC;
   ```

2. Check the error message in `error_message` column

3. Common issues:
   - **Lock timeout**: Another process has locked the rows. Usually self-resolving.
   - **Permission denied**: Service role key may be invalid
   - **Connection issues**: Database may be under heavy load

### 4.2 If Invariant Violations Are Found

**Critical violations require immediate action:**

1. **seat_mismatch**: Run `SELECT reconcile_seat_counts();`
2. **negative_seats / seat_overflow**: Run reconciliation, then investigate the ride
3. **active_booking_on_terminal_ride**: Run `SELECT expire_rides();`
4. **invalid_*_status**: Data corruption - investigate and fix manually

**Warning violations can be scheduled:**

1. **expired_active_ride**: Run `SELECT expire_rides();`

### 4.3 Manual Ride Expiry

If automatic expiry isn't running, expire rides manually:

```sql
-- Expire a specific ride
UPDATE rides SET status = 'completed', updated_at = now() WHERE id = 'ride-uuid';

-- Update its bookings
UPDATE ride_bookings 
SET status = 'completed', updated_at = now() 
WHERE ride_id = 'ride-uuid' AND status IN ('pending', 'confirmed');
```

### 4.4 Manual Seat Fix

```sql
-- Calculate correct available seats
SELECT 
  r.id,
  r.total_seats,
  r.available_seats AS current,
  r.total_seats - COALESCE(SUM(CASE WHEN rb.status IN ('pending', 'confirmed') THEN rb.seats_requested ELSE 0 END), 0) AS should_be
FROM rides r
LEFT JOIN ride_bookings rb ON rb.ride_id = r.id
WHERE r.id = 'ride-uuid'
GROUP BY r.id;

-- Fix it
UPDATE rides
SET available_seats = (calculated_value_from_above)
WHERE id = 'ride-uuid';
```

---

## 5. Canonical States Reference

### Ride States
| State | Description | Terminal? |
|-------|-------------|-----------|
| `active` | Available for booking | No |
| `in-progress` | Currently happening | No |
| `completed` | Finished successfully | Yes |
| `cancelled` | Cancelled by driver | Yes |

### Booking States
| State | Description | Terminal? | Display Name |
|-------|-------------|-----------|--------------|
| `pending` | Awaiting driver approval | No | Pending |
| `confirmed` | Approved by driver | No | Confirmed |
| `completed` | Ride finished | Yes | Completed |
| `cancelled` | Cancelled | Yes | Cancelled/Declined* |

*"Declined" is display-only when `cancellation_reason` contains 'driver declined'

### Notification Types
```
NEW_MESSAGE, FRIEND_REQUEST, FRIEND_REQUEST_ACCEPTED,
FORUM_REPLY, FORUM_MENTION, RIDE_MATCH, BOOKING_REQUEST,
BOOKING_CONFIRMED, BOOKING_CANCELLED, REVIEW, SAFETY_ALERT, SYSTEM
```

---

## 6. Audit Trail

All automated actions are logged to:

1. **`system_job_log`**: Job execution history
   - Job name, status, duration, records processed, errors

2. **`admin_audit_log`**: Individual data changes
   - Used by `reconcile_seat_counts` to log discrepancies

3. **`invariant_violations`**: Detected problems
   - Violation type, severity, sample data, resolution status

---

## 7. Performance Considerations

- **expire_rides**: Uses `SKIP LOCKED` to avoid blocking other operations
- **reconcile_seat_counts**: Only processes active/in-progress rides
- **repair_missing_notifications**: Limited to last 30 days
- **check_system_invariants**: Returns max 10 samples per check type

For large deployments (>100K rides), consider:
1. Running jobs during off-peak hours
2. Adding more restrictive date filters
3. Processing in batches

---

*Document Version: Phase C - January 2026*
