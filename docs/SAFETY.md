# Abuse & Misuse Safeguards

> **Phase E Documentation**: Community Protection Without Over-Engineering

---

## 1. Overview

This document describes the safeguards that protect the CarpoolNetwork community from abuse while maintaining:

- **No automatic bans** - Human-in-the-loop moderation
- **Full audit trail** - Every action is logged
- **Proportional response** - Warnings before restrictions
- **Appeal rights** - Users can contest decisions

---

## 2. Misuse Scenarios

### 2.1 Last-Minute Cancellations

**Definition**: Cancellation less than 2 hours before departure

**Impact**:
- Strands passengers with no alternatives
- Erodes platform trust
- Disrupts commute planning

**Detection**: Automatic via `cancel_booking_with_impact()` function

**Response**:
| Occurrence | Action |
|------------|--------|
| 1st | -15 reliability points, logged |
| 2nd in 30 days | Warning notification sent |
| 3rd in 30 days | Soft restriction (review required) |
| Continued | Human review triggered |

---

### 2.2 No-Shows

**Definition**: Neither party showed up for confirmed ride

**Impact**:
- Wasted time for counterparty
- Lost opportunity cost
- Trust damage

**Detection**: 
- Post-ride report via `ReportSystem` component
- Driver/passenger feedback after ride time passes

**Response**:
| Occurrence | Action |
|------------|--------|
| 1st | Warning notification, -10 reliability |
| 2nd in 30 days | -20 reliability, admin flagged |
| 3rd in 30 days | Temporary booking restriction |

---

### 2.3 Booking Spam

**Definition**: Creating many bookings without intent to ride

**Detection**:
- High booking-to-completion ratio
- Multiple bookings on overlapping rides
- Rapid booking/cancel cycles

**Thresholds**:
- More than 5 cancelled bookings in 7 days
- Completion ratio below 20% (after 10+ bookings)

**Response**:
- Admin flag for review
- Temporary cooldown period
- Account review required

---

### 2.4 Frequent Driver Cancellations

**Definition**: Driver cancelling rides after passengers book

**Impact**:
- Strands multiple passengers
- Higher trust damage than passenger cancellations

**Detection**: Tracked in `cancellation_history` with `user_role = 'driver'`

**Response**:
| Occurrence | Action |
|------------|--------|
| 1st | -20 reliability points |
| 2nd in 30 days | Warning + admin notification |
| 3rd in 30 days | Ride posting restriction |

---

### 2.5 Passenger Abuse of Cancel/Rebook

**Definition**: Repeatedly booking and cancelling to "hold" seats

**Detection**:
- Same passenger books/cancels same route multiple times
- Booking pattern analysis

**Response**:
- Rate limiting on booking same route
- Admin flag after 3rd cycle

---

## 3. Reliability Scoring System

### 3.1 Score Calculation

**Base Score**: 100 (new users)

**Score Factors**:
```sql
reliability_score = 100 
  - (cancellation_penalty)
  - (no_show_penalty)
  - (timing_penalty)
  + (completion_bonus)
```

| Factor | Impact |
|--------|--------|
| Completed ride | +2 points (cap at 100) |
| Cancelled 48+ hours before | -2 points |
| Cancelled 24-48 hours before | -5 points |
| Cancelled 2-24 hours before | -10 points |
| Cancelled <2 hours before | -15 points |
| No-show | -20 points |
| Reported for issues | -10 to -30 points |

### 3.2 Grace Period

New users get 5 "grace rides" with reduced penalties:
- First 5 rides: 50% penalty reduction
- Encourages trying the platform
- Still logged for patterns

### 3.3 Score Thresholds

| Score Range | Status | Impact |
|-------------|--------|--------|
| 90-100 | Excellent | Full access, trusted badge |
| 70-89 | Good | Full access |
| 50-69 | Fair | Admin monitoring |
| 30-49 | Poor | Review required for bookings |
| 0-29 | Critical | Booking restrictions |

---

## 4. Warning System

### 4.1 Warning Triggers

| Trigger | Warning Type |
|---------|--------------|
| 3+ cancellations in 30 days | Reliability warning |
| 2+ no-shows in 30 days | Behavior warning |
| Report received | Investigation notice |
| Score drops below 50 | Status warning |

### 4.2 Warning Notification

```typescript
// Notification content
{
  type: 'SYSTEM',
  title: '⚠️ Reliability Warning',
  message: 'You have cancelled 3 rides in the past 30 days. 
            Frequent cancellations may result in booking restrictions.',
  data: {
    reliability_score: 65,
    warning_count: 1
  }
}
```

### 4.3 Warning Escalation

```
Warning 1 → Notification only
Warning 2 → Admin notified, user counseled
Warning 3 → Temporary restriction, appeal available
```

---

## 5. Restriction Types

### 5.1 Restriction Categories

| Type | Duration | Effect |
|------|----------|--------|
| `warning` | N/A | Notification only |
| `review_required` | Until approved | New bookings need admin approval |
| `temporary_cooldown` | 24-72 hours | Cannot book/post new rides |
| `temporary_ban` | 7-30 days | Full platform restriction |

### 5.2 Restriction Data Model

```sql
-- booking_restrictions table
{
  user_id: uuid,
  restriction_type: 'temporary_ban' | 'warning' | 'review_required',
  reason: string,
  starts_at: timestamp,
  ends_at: timestamp,
  is_active: boolean,
  appeal_status: 'none' | 'pending' | 'approved' | 'denied',
  appeal_reason: string,
  reviewed_by: uuid
}
```

---

## 6. Human-in-the-Loop Moderation

### 6.1 Admin Visibility

Admins can view in `/admin/moderation`:
- All flagged users
- Recent restriction history
- Appeal queue
- Reliability trends

### 6.2 Review Process

```
1. System flags user based on thresholds
2. Admin reviews:
   - Cancellation history
   - Reliability score trend
   - Reports received
   - User's side of story (if appealed)
3. Admin decides:
   - Dismiss (false positive)
   - Issue warning
   - Apply restriction
   - Escalate to super admin
4. User notified of decision
```

### 6.3 No Automatic Bans

⚠️ **CRITICAL**: The system NEVER automatically bans users.

Even at critical reliability levels:
- User gets warning
- User gets temporary restriction
- Admin must manually review for permanent action

---

## 7. Appeal System

### 7.1 Appeal Rights

Users can appeal any restriction:
- Submit appeal reason via profile
- Admin reviews within 48 hours
- Decision communicated via notification

### 7.2 Appeal Statuses

| Status | Meaning |
|--------|---------|
| `none` | No appeal submitted |
| `pending` | Awaiting admin review |
| `approved` | Restriction lifted |
| `denied` | Restriction upheld |

### 7.3 Appeal UI

```typescript
// User can submit appeal from ReliabilityScoreDisplay component
<AppealButton 
  restrictionId={restriction.id}
  onSubmit={handleAppeal}
/>
```

---

## 8. Audit Trail

### 8.1 What's Logged

| Table | Records |
|-------|---------|
| `cancellation_history` | All cancellations with timing and reason |
| `reliability_scores` | Score changes and factors |
| `booking_restrictions` | All restrictions applied |
| `admin_audit_log` | Admin actions on restrictions |
| `moderation_reports` | User reports |

### 8.2 Retention

- Cancellation history: 2 years
- Reliability scores: Lifetime
- Restrictions: 2 years
- Admin actions: 5 years

---

## 9. Exemptions

### 9.1 Automatic Exemptions

Certain situations reduce or eliminate penalties:

| Situation | Exemption |
|-----------|-----------|
| Emergency (medical, family) | Full exemption if documented |
| Weather emergency | Full exemption |
| Driver cancelled first | Passengers exempt |
| System error | Full exemption |

### 9.2 Requesting Exemption

User provides reason in cancellation:
```typescript
await cancelBooking(bookingId, {
  reason: 'Medical emergency - hospital visit'
});
```

Keywords trigger exemption review:
- "emergency"
- "medical"
- "accident"
- "hospital"

---

## 10. Admin Queries

### View Flagged Users

```sql
SELECT p.full_name, p.email, rs.*
FROM reliability_scores rs
JOIN profiles p ON p.id = rs.user_id
WHERE rs.reliability_score < 50
   OR rs.warnings_count >= 2
ORDER BY rs.reliability_score ASC;
```

### Recent Cancellation Patterns

```sql
SELECT 
  user_id,
  COUNT(*) as cancellations,
  AVG(reliability_impact) as avg_impact,
  MIN(hours_before_departure) as worst_timing
FROM cancellation_history
WHERE created_at > now() - interval '30 days'
GROUP BY user_id
HAVING COUNT(*) >= 3
ORDER BY COUNT(*) DESC;
```

### Active Restrictions

```sql
SELECT br.*, p.full_name, p.email
FROM booking_restrictions br
JOIN profiles p ON p.id = br.user_id
WHERE br.is_active = true
  AND (br.ends_at IS NULL OR br.ends_at > now())
ORDER BY br.created_at DESC;
```

---

## 11. Monitoring Dashboard

### Key Metrics (Admin Dashboard)

| Metric | Healthy Threshold |
|--------|-------------------|
| Users with score <50 | < 5% of active users |
| Active restrictions | < 1% of active users |
| Cancellations this week | < 10% of bookings |
| Pending appeals | < 10 at any time |

### Alerts

- Daily: Users newly below score 50
- Weekly: Cancellation rate trend
- Immediate: Appeal queue > 10

---

*Document Version: Phase E - January 2026*
