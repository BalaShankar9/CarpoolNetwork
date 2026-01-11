# CarpoolNetwork Failure Modes & Recovery Guide

> **Phase C Documentation**: Known failure modes and recovery procedures

---

## 1. State Corruption Failures

### F1: Seat Count Drift

**Symptoms**:
- Users see "No seats available" but ride shows available
- Overbooking: More passengers than seats
- Negative seat counts in database

**Causes**:
- Race condition during concurrent booking
- Booking update without seat trigger firing
- Manual database edits

**Detection**:
```sql
SELECT check_system_invariants();
-- Look for: INV-SEAT-001, INV-SEAT-002, INV-SEAT-003
```

**Recovery**:
```sql
-- Automatic fix
SELECT reconcile_seat_counts();

-- Manual fix for specific ride
UPDATE rides r
SET available_seats = r.total_seats - COALESCE((
  SELECT SUM(seats_requested)
  FROM ride_bookings rb
  WHERE rb.ride_id = r.id
  AND rb.status IN ('pending', 'confirmed')
), 0)
WHERE r.id = 'specific-ride-id';
```

**Prevention**:
- `trg_sync_ride_seats_on_booking_change` trigger handles normal operations
- Daily `reconcile_seat_counts()` catches drift
- `chk_seats_not_negative` constraint prevents negative values

---

### F2: Orphaned Active Bookings

**Symptoms**:
- User sees "confirmed" booking but ride is completed/cancelled
- Booking shows in pending state indefinitely

**Causes**:
- Ride cancellation didn't cascade to bookings
- Ride expiry job didn't run
- Manual ride status update without booking update

**Detection**:
```sql
SELECT check_system_invariants();
-- Look for: INV-STATE-001
```

**Recovery**:
```sql
-- Automatic fix
SELECT expire_rides();

-- Manual fix
UPDATE ride_bookings
SET status = 'cancelled',
    cancellation_reason = 'Ride was cancelled',
    cancelled_at = now()
WHERE ride_id = 'ride-id'
AND status IN ('pending', 'confirmed');
```

**Prevention**:
- `trg_cascade_ride_cancellation` trigger handles ride cancellation
- Every 5 minute `expire_rides()` job handles natural expiry

---

### F3: Invalid State Values

**Symptoms**:
- Filtering by status returns unexpected results
- UI shows "Unknown" or crashes on status display

**Causes**:
- Old code wrote deprecated state (e.g., 'in_progress')
- Manual database edit with typo
- Migration didn't complete

**Detection**:
```sql
SELECT check_system_invariants();
-- Look for: INV-STATE-002, INV-STATE-003
```

**Recovery**:
```sql
-- Fix rides with old 'in_progress' (underscore)
UPDATE rides SET status = 'in-progress' WHERE status = 'in_progress';

-- Fix bookings with deprecated states
UPDATE ride_bookings SET status = 'cancelled' WHERE status IN ('rejected', 'declined');
UPDATE ride_bookings SET status = 'completed' WHERE status = 'paid';
UPDATE ride_bookings SET status = 'confirmed' WHERE status = 'active';
```

**Prevention**:
- CHECK constraints on status columns enforce valid values
- Phase B migration cleaned up historical data

---

## 2. Notification Failures

### F4: Missing Notifications

**Symptoms**:
- User didn't receive expected notification
- Booking exists but no notification in user's inbox

**Causes**:
- Network error during notification creation
- Transaction rolled back after booking but before notification
- Notification service was down

**Detection**:
```sql
-- Find bookings without corresponding notifications
SELECT rb.id, rb.status, rb.created_at
FROM ride_bookings rb
WHERE NOT EXISTS (
  SELECT 1 FROM notifications n
  WHERE n.data->>'booking_id' = rb.id::text
)
AND rb.created_at > now() - interval '7 days';
```

**Recovery**:
```sql
SELECT repair_missing_notifications();
```

**Prevention**:
- Daily repair job catches missing notifications
- Notifications marked with `repaired: true` for audit

---

### F5: Duplicate Notifications

**Symptoms**:
- User receives same notification multiple times
- Notification list has duplicates

**Causes**:
- Notification created in trigger AND in application code
- Repair job ran while manual fix was applied
- Race condition during notification creation

**Detection**:
```sql
SELECT 
  user_id,
  type,
  data->>'booking_id' as booking_id,
  COUNT(*) as count
FROM notifications
WHERE data->>'booking_id' IS NOT NULL
GROUP BY user_id, type, data->>'booking_id'
HAVING COUNT(*) > 1;
```

**Recovery**:
```sql
-- Remove duplicate notifications, keeping the oldest
DELETE FROM notifications n1
USING notifications n2
WHERE n1.id > n2.id
  AND n1.user_id = n2.user_id
  AND n1.type = n2.type
  AND n1.data->>'booking_id' = n2.data->>'booking_id';
```

**Prevention**:
- Repair job uses `ON CONFLICT DO NOTHING`
- Application code checks for existing notification before creating

---

## 3. Concurrency Failures

### F6: Double Booking

**Symptoms**:
- Same passenger has multiple active bookings on same ride
- More seats booked than available

**Causes**:
- Race condition: Two booking requests processed simultaneously
- Missing unique constraint
- Constraint was disabled during maintenance

**Detection**:
```sql
SELECT check_system_invariants();
-- Look for: INV-UNIQUE-001
```

**Recovery**:
```sql
-- Cancel all but the earliest booking
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY ride_id, passenger_id ORDER BY created_at) as rn
  FROM ride_bookings
  WHERE status IN ('pending', 'confirmed')
)
UPDATE ride_bookings rb
SET status = 'cancelled',
    cancellation_reason = 'Duplicate booking removed'
FROM ranked
WHERE rb.id = ranked.id
AND ranked.rn > 1;
```

**Prevention**:
- Unique partial index on (ride_id, passenger_id) WHERE status IN ('pending', 'confirmed')
- Application-level check before creating booking

---

### F7: Lost Updates

**Symptoms**:
- Booking status appears to "revert" to earlier state
- Seat count doesn't reflect recent booking

**Causes**:
- Two processes updated same row simultaneously
- Optimistic locking conflict not handled

**Detection**:
- Usually detected by user reporting inconsistent state
- Compare `updated_at` with expected time

**Recovery**:
- Re-apply the intended update
- Run reconciliation jobs

**Prevention**:
- Use `FOR UPDATE` locks for critical operations
- Application uses optimistic locking with version check

---

## 4. Background Job Failures

### F8: Job Timeout/Deadlock

**Symptoms**:
- Job shows as 'running' for extended period
- `system_job_log` has 'failed' status with deadlock error

**Causes**:
- Large number of records to process
- Another long-running transaction holding locks
- Database under heavy load

**Detection**:
```sql
-- Check for stuck jobs
SELECT * FROM system_job_log
WHERE status = 'running'
AND started_at < now() - interval '10 minutes';

-- Check for failed jobs
SELECT * FROM system_job_log
WHERE status = 'failed'
ORDER BY started_at DESC
LIMIT 10;
```

**Recovery**:
```sql
-- Mark stuck job as failed
UPDATE system_job_log
SET status = 'failed',
    completed_at = now(),
    error_message = 'Manually marked as failed due to timeout'
WHERE status = 'running'
AND started_at < now() - interval '10 minutes';

-- Re-run the job
SELECT expire_rides(); -- or whichever job failed
```

**Prevention**:
- Jobs use `SKIP LOCKED` to avoid blocking
- Jobs process in batches
- Schedule during low-traffic periods

---

### F9: Job Not Running

**Symptoms**:
- Expired rides accumulating
- No recent entries in `system_job_log`

**Causes**:
- pg_cron extension not enabled
- Cron job was unscheduled
- Service role key expired
- External scheduler stopped

**Detection**:
```sql
-- Check last job runs
SELECT job_name, MAX(started_at) as last_run
FROM system_job_log
GROUP BY job_name;

-- Check pg_cron jobs
SELECT * FROM cron.job;
```

**Recovery**:
```sql
-- Re-schedule jobs
SELECT cron.schedule('expire-rides', '*/5 * * * *', $$SELECT expire_rides()$$);
SELECT cron.schedule('reconcile-seats', '0 3 * * *', $$SELECT reconcile_seat_counts()$$);
SELECT cron.schedule('repair-notifications', '0 4 * * *', $$SELECT repair_missing_notifications()$$);
SELECT cron.schedule('check-invariants', '*/15 * * * *', $$SELECT check_system_invariants()$$);
```

**Prevention**:
- Monitor job execution with alerting
- Check `get_system_health_summary()` includes recent job status

---

## 5. Data Integrity Failures

### F10: Constraint Violation on Insert/Update

**Symptoms**:
- Error: "violates check constraint"
- Application shows error creating/updating record

**Causes**:
- Attempting to set invalid status
- Attempting to set negative seats
- Data doesn't meet business rules

**Detection**:
- Error message identifies which constraint failed

**Recovery**:
- Fix the data to meet constraint requirements
- If constraint is wrong, update it (carefully!)

**Prevention**:
- Application validates data before database operation
- Clear error messages guide users

---

### F11: Foreign Key Orphans

**Symptoms**:
- Booking references non-existent ride
- Notification references non-existent user

**Causes**:
- Parent record deleted without cascading
- Data import skipped foreign key checks
- Database restored from partial backup

**Detection**:
```sql
-- Orphaned bookings
SELECT * FROM ride_bookings rb
WHERE NOT EXISTS (SELECT 1 FROM rides r WHERE r.id = rb.ride_id);

-- Orphaned notifications
SELECT * FROM notifications n
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = n.user_id);
```

**Recovery**:
```sql
-- Remove orphaned bookings
DELETE FROM ride_bookings rb
WHERE NOT EXISTS (SELECT 1 FROM rides r WHERE r.id = rb.ride_id);

-- Remove orphaned notifications
DELETE FROM notifications n
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = n.user_id);
```

**Prevention**:
- Foreign key constraints with ON DELETE CASCADE where appropriate
- Never disable foreign key checks in production

---

## 6. Performance Failures

### F12: Slow Queries

**Symptoms**:
- Pages loading slowly
- Database CPU high
- Timeouts in application

**Causes**:
- Missing indexes
- Full table scans on large tables
- Complex queries without optimization

**Detection**:
```sql
-- Find slow queries
SELECT query, calls, mean_time, total_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 20;
```

**Recovery**:
- Add missing indexes
- Optimize query structure
- Add pagination/limits

**Prevention**:
- Regular query performance review
- Indexes on frequently filtered columns
- EXPLAIN ANALYZE for complex queries

---

## Quick Reference: Recovery Commands

| Problem | Quick Fix Command |
|---------|-------------------|
| Seat mismatches | `SELECT reconcile_seat_counts();` |
| Expired rides not processing | `SELECT expire_rides();` |
| Missing notifications | `SELECT repair_missing_notifications();` |
| Unknown system state | `SELECT check_system_invariants();` |
| System health overview | `SELECT get_system_health_summary();` |

---

## Escalation Path

1. **Automatic**: Background jobs attempt self-healing
2. **Warning Alert**: Violations logged, admin notified
3. **Manual Intervention**: Admin runs recovery commands
4. **Engineering Escalation**: Code fix required
5. **Database Restore**: Last resort for corruption

---

*Document Version: Phase C - January 2026*
