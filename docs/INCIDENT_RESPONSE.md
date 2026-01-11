# Incident Response Guide

> **Phase E Documentation**: Calm Response When Things Go Wrong

---

## 1. Overview

This document defines how to detect, respond to, and recover from incidents in production. The goal is **calm, systematic response** - not panic.

### Incident Response Principles

1. **Assess before acting** - Understand scope before fixing
2. **Communicate early** - Users prefer knowing there's an issue
3. **Document as you go** - Future you will thank present you
4. **Test recovery** - Verify fixes in staging first when possible

---

## 2. Incident Classes

### Class 1: Data Integrity Issue

**Examples**:
- Seat counts out of sync
- Orphaned bookings on cancelled rides
- Invalid state values in database

**Severity**: High (affects correctness)

**Detection**:
```sql
SELECT check_system_invariants();
-- Returns violations if any exist
```

**Immediate Action**:
1. Run invariant check to scope the issue
2. Determine if it's isolated or widespread
3. Apply appropriate repair function

**Recovery**:
```sql
-- Seat mismatch
SELECT reconcile_seat_counts();

-- Orphaned bookings
SELECT expire_rides();

-- Invalid states
UPDATE rides SET status = 'cancelled' WHERE status NOT IN ('active', 'in-progress', 'completed', 'cancelled');
```

**User Communication**: None needed for silent fixes. If user-visible, email affected users.

---

### Class 2: Notification Failure

**Examples**:
- Booking notifications not delivered
- Push notifications failing
- Email delivery bouncing

**Severity**: Medium (affects user experience, not correctness)

**Detection**:
- User reports missing notifications
- Monitoring shows notification queue growing
- Email bounce rate increasing

**Immediate Action**:
1. Check `notification_queue` for pending notifications
2. Check Supabase Edge Function logs
3. Check email provider dashboard (if applicable)

**Recovery**:
```sql
-- Repair missing notifications
SELECT repair_missing_notifications();

-- Check for stuck queue items
SELECT * FROM notification_queue 
WHERE status = 'pending' 
AND created_at < now() - interval '1 hour';
```

**User Communication**: If widespread, post status update. Individual cases: apologize and provide status.

---

### Class 3: Booking Stuck

**Examples**:
- Booking shows "pending" indefinitely
- Can't confirm or cancel booking
- Ride appears full but shouldn't be

**Severity**: High (blocks user actions)

**Detection**:
- User support request
- Monitoring query finds old pending bookings

**Immediate Action**:
1. Identify specific booking(s)
2. Check booking state in database
3. Check related ride state

**Recovery**:
```sql
-- Unstick specific booking
UPDATE ride_bookings
SET updated_at = now()
WHERE id = 'booking-uuid';

-- If needs manual state change (with audit)
UPDATE ride_bookings
SET status = 'cancelled',
    cancellation_reason = 'Admin fix: stuck booking',
    cancelled_at = now()
WHERE id = 'booking-uuid';

-- Log admin action
INSERT INTO admin_audit_log (admin_id, admin_role, action, target_type, target_id, details)
VALUES (auth.uid(), 'super_admin', 'manual_booking_fix', 'booking', 'booking-uuid', 
        '{"reason": "Booking was stuck in pending state"}'::jsonb);
```

**User Communication**: Direct message to affected user with apology and resolution.

---

### Class 4: Admin Mistake

**Examples**:
- Wrong user restricted
- Incorrect data edit
- Feature flag toggled incorrectly

**Severity**: Variable (depends on impact)

**Detection**:
- Admin realizes mistake
- User reports unexpected restriction
- System behavior changes unexpectedly

**Immediate Action**:
1. Identify what was changed (check `admin_audit_log`)
2. Assess impact scope
3. Reverse if safe, escalate if complex

**Recovery**:
```sql
-- Check recent admin actions
SELECT * FROM admin_audit_log
ORDER BY created_at DESC
LIMIT 20;

-- Reverse restriction
UPDATE booking_restrictions
SET is_active = false,
    notes = 'Reversed by admin - applied in error'
WHERE id = 'restriction-uuid';

-- Reverse feature flag
UPDATE feature_flags
SET enabled = true  -- or original value
WHERE name = 'feature-name';
```

**User Communication**: Personal apology if user was affected. Be transparent about the error.

---

### Class 5: Performance Degradation

**Examples**:
- Pages loading slowly
- Database queries timing out
- API responses delayed

**Severity**: Medium to High (depends on duration)

**Detection**:
- Monitoring alerts
- User reports
- Error rate increasing

**Immediate Action**:
1. Check Supabase dashboard for database load
2. Check Netlify for build/deploy issues
3. Check external services (Google Maps, etc.)

**Recovery**:
- If database: Check for missing indexes, long-running queries
- If frontend: Check recent deployments, rollback if needed
- If external: Enable degraded mode, show user-friendly message

**User Communication**: Status page update if widespread. Individual response if isolated.

---

### Class 6: Authentication Failure

**Examples**:
- Users can't log in
- Sessions expiring unexpectedly
- Password reset failing

**Severity**: Critical (blocks all user actions)

**Detection**:
- Spike in support requests
- Monitoring shows auth errors
- Can't log in yourself

**Immediate Action**:
1. Check Supabase Auth service status
2. Check environment variables are correct
3. Check for recent auth config changes

**Recovery**:
- If Supabase issue: Wait for their fix, communicate to users
- If config issue: Restore correct config, redeploy
- If widespread: Consider maintenance mode

**User Communication**: Immediate status update. Frequent updates until resolved.

---

## 3. Rollback Strategies

### 3.1 App Rollback (Netlify Deployment)

**When**: Bad frontend code deployed, UI broken

**How**:
1. Go to Netlify Dashboard > Deploys
2. Find last known good deploy
3. Click "Publish deploy" on that version
4. Verify site is restored

**Time**: ~2 minutes

---

### 3.2 Config Rollback (Environment Variables)

**When**: Wrong environment variable set

**How**:
1. Go to Netlify > Site settings > Environment variables
2. Identify incorrect variable
3. Restore previous value
4. Trigger redeploy

**Time**: ~5 minutes (includes redeploy)

---

### 3.3 Feature Flag Disablement

**When**: New feature causing issues

**How**:
```sql
-- Disable feature immediately
UPDATE feature_flags
SET enabled = false
WHERE name = 'problematic-feature';
```

**Time**: Immediate (no redeploy needed)

---

### 3.4 Background Job Pause

**When**: Automated job causing issues

**How**:
```sql
-- If using pg_cron
SELECT cron.unschedule('job-name');

-- Or disable the function temporarily
-- (requires migration but immediate effect)
REVOKE EXECUTE ON FUNCTION expire_rides() FROM service_role;
```

**Time**: Immediate

**Resume**:
```sql
SELECT cron.schedule('expire-rides', '*/5 * * * *', $$SELECT expire_rides()$$);
-- Or
GRANT EXECUTE ON FUNCTION expire_rides() TO service_role;
```

---

### 3.5 Database Migration Rollback

**When**: Bad migration applied

**Complexity**: High - requires careful planning

**How**:
1. Write reverse migration
2. Test in staging
3. Apply to production during low-traffic period
4. Verify data integrity

**Note**: Some migrations (data deletions) are NOT reversible. Always backup first.

---

## 4. Detection Tools

### 4.1 Health Check Query

Run regularly or after any incident:

```sql
SELECT get_system_health_summary();
```

Returns:
- Counts of rides/bookings by status
- Expired active rides (should be 0)
- Seat mismatches (should be 0)
- Unresolved violations (should be 0)
- Recent job status

### 4.2 Invariant Check

```sql
SELECT check_system_invariants();
```

Returns list of any violated invariants with details.

### 4.3 Recent Errors Query

```sql
SELECT * FROM system_job_log
WHERE status = 'failed'
ORDER BY started_at DESC
LIMIT 10;
```

### 4.4 User Impact Query

```sql
-- Find users affected by stuck bookings
SELECT DISTINCT p.email, p.full_name
FROM ride_bookings rb
JOIN profiles p ON p.id = rb.passenger_id
WHERE rb.status = 'pending'
AND rb.created_at < now() - interval '24 hours';
```

---

## 5. Communication Templates

### 5.1 Status Page Update

```
[INVESTIGATING] We're looking into reports of [issue description].
Updates will be posted here.

[IDENTIFIED] We've identified the cause of [issue]. 
Working on a fix now. ETA: [time].

[FIXED] The issue with [description] has been resolved.
[Details of what happened and any user action needed].

[MONITORING] Fix deployed. We're monitoring to ensure stability.
```

### 5.2 Individual User Email

```
Subject: Issue with your [booking/ride/account] - Resolved

Hi [Name],

We noticed an issue affecting your [specific item] and wanted 
to let you know it's been fixed.

What happened: [Brief, non-technical explanation]

What we did: [Resolution]

What you need to do: [Any action required, or "Nothing - you're all set"]

We apologize for any inconvenience. If you have questions, 
reply to this email.

Best,
CarpoolNetwork Team
```

### 5.3 All-Users Notification (Major Incident)

```
Subject: Service Update - [Date]

Hi CarpoolNetwork Community,

Earlier today, we experienced [brief description of issue].
This affected [scope - e.g., "users trying to book rides"].

The issue is now resolved. [Brief explanation if appropriate]

We're taking steps to prevent this from happening again.

Thank you for your patience.

CarpoolNetwork Team
```

---

## 6. Post-Incident Process

### 6.1 Immediate (Within 1 hour of resolution)

- [ ] Verify fix is holding
- [ ] Communicate resolution to affected users
- [ ] Update status page

### 6.2 Same Day

- [ ] Document what happened in incident log
- [ ] Identify root cause
- [ ] List any follow-up actions needed

### 6.3 Within 1 Week

- [ ] Complete post-mortem document
- [ ] Implement preventive measures
- [ ] Update runbooks if needed
- [ ] Share learnings with team

### 6.4 Post-Mortem Template

```markdown
# Incident Post-Mortem: [Title]

**Date**: [Date]
**Duration**: [Start time] - [End time]
**Severity**: [Critical/High/Medium/Low]
**Author**: [Name]

## Summary
[1-2 sentence description]

## Impact
- Users affected: [Number/percentage]
- Features affected: [List]
- Data impact: [None/Temporary/Permanent]

## Timeline
- [Time]: [Event]
- [Time]: [Event]
- ...

## Root Cause
[Technical explanation]

## Resolution
[What fixed it]

## Prevention
[What we'll do to prevent recurrence]

## Lessons Learned
- [Learning 1]
- [Learning 2]
```

---

## 7. Emergency Contacts

### Internal

| Role | Contact | When to Escalate |
|------|---------|------------------|
| On-call Engineer | [TBD] | Any production issue |
| Tech Lead | [TBD] | Critical incidents, data loss |
| Product Owner | [TBD] | User-facing decisions |

### External

| Service | Support | SLA |
|---------|---------|-----|
| Supabase | support@supabase.io | 24h response |
| Netlify | support@netlify.com | Business hours |
| Google Maps | Cloud Console | Per plan |

---

## 8. Runbook Quick Reference

| Symptom | First Check | Quick Fix |
|---------|-------------|-----------|
| Seat counts wrong | `check_system_invariants()` | `reconcile_seat_counts()` |
| Rides not expiring | `system_job_log` for failures | `expire_rides()` manual run |
| Missing notifications | `notification_queue` status | `repair_missing_notifications()` |
| Can't log in | Supabase Auth dashboard | Check env vars |
| Slow pages | Supabase metrics | Check for missing indexes |
| Feature not working | `feature_flags` table | Toggle flag |

---

*Document Version: Phase E - January 2026*
