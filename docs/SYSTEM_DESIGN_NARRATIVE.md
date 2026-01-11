# CarpoolNetwork: System Design Narrative

> **For**: Technical interviews and system design discussions  
> **Context**: Community ride-sharing platform (non-payment, trust-based)  
> **Status**: Production-ready after Phases A-E

---

## D1: Executive Summary (60 Seconds)

CarpoolNetwork solves **commute coordination at scale** for communities that want to share rides without financial transactions. Think Amazon Commute, not Uber.

**The Problem**: Corporate campuses, universities, and community groups struggle with ad-hoc carpooling. People drive alone because coordination is manual - WhatsApp groups, email chains, sticky notes on boards. No trust system, no accountability, no reliability tracking.

**Our Solution**: A trust-based platform where users post and book rides without payment. The system focuses on **correctness, reliability, and safety** instead of pricing and payments.

**Key Difference from Uber-Style Systems**: 
- No marketplace dynamics or surge pricing
- No payment processing complexity
- Trust replaces monetary incentives
- Reliability scoring instead of ratings-for-payment
- Community self-regulation with admin oversight

**Core Technical Challenge**: Maintaining **data integrity and trust** without financial accountability. When money isn't involved, the system must prevent abuse through reliability scoring, state correctness, and transparent audit trails. Overbooking is unacceptable because there's no refund mechanism to compensate - we get one shot at correctness.

---

## D2: System Architecture Overview

### Architecture Philosophy

We built a **state-centric, RPC-driven system** where the database enforces correctness and the frontend reflects truth.

```
┌─────────────────┐
│   React + TS    │ ← Frontend (presentation, UX)
│   Vite, Tailwind│
└────────┬────────┘
         │
         │ REST + RPC calls
         ▼
┌─────────────────┐
│   Supabase      │ ← Backend + Database
│   - PostgreSQL  │   - Business logic in RPC functions
│   - RLS         │   - Row-level security
│   - Edge Funcs  │   - Background jobs (pg_cron)
└─────────────────┘
```

### Frontend Responsibilities
- Display current state
- Collect user input
- Call backend RPCs
- Handle optimistic UI (but always verify)
- Show clear error messages

**What it does NOT do**:
- Calculate seat availability (backend does this)
- Enforce business rules (database does this)
- Make state transitions (RPC functions do this)

### Backend/Database Responsibilities
- Enforce ALL business rules
- Execute state transitions atomically
- Maintain referential integrity
- Log audit trails
- Run background jobs (expiry, reconciliation)
- Check invariants

### Why Supabase + RLS?

**Chosen for**:
- Built-in Row Level Security eliminates authorization bugs
- PostgreSQL gives us ACID transactions and row locking
- RPC functions keep logic server-side (single source of truth)
- Real-time subscriptions for live updates
- Auth handled correctly out-of-box

**Trade-offs accepted**:
- Vendor lock-in (acceptable for community platform)
- Less control over query optimization (mitigated with indexes)
- Edge function cold starts (acceptable for non-critical paths)

### Why RPC-Centric Design?

Traditional REST encourages "fetch data, mutate client-side, POST back" - a recipe for race conditions. Our approach:

```typescript
// BAD (race conditions):
const ride = await fetch(`/rides/${id}`);
ride.available_seats--;
await fetch(`/rides/${id}`, { method: 'PUT', body: ride });

// GOOD (atomic RPC):
await supabase.rpc('book_ride', { 
  ride_id: id, 
  seats_requested: 1 
});
```

The RPC function:
1. Locks the ride row
2. Checks availability
3. Updates atomically
4. Returns success/failure

**No race condition possible**.

---

## D3: Core Domain Model (Deep Dive)

### rides

**Ownership**: Driver creates and owns
**Authority**: Only driver can edit/cancel before bookings confirmed

```sql
{
  id: uuid,
  driver_id: uuid,          -- Owner
  vehicle_id: uuid,         -- What they're driving
  origin/destination: text,
  departure_time: timestamp,
  total_seats: int,         -- Physical vehicle capacity
  available_seats: int,     -- Decremented atomically
  status: enum              -- State machine (active, in-progress, completed, cancelled)
}
```

**Why it exists**: Represents the unit of shared travel. A ride is a **commitment** by the driver at a specific time.

**What it prevents**:
- Overbooking (available_seats managed atomically)
- Time travel (CHECK constraints on dates)
- Invalid states (only 4 canonical states)

### ride_bookings

**Ownership**: Passenger creates, but driver has authority to confirm/decline
**Authority**: Driver approves, both parties can cancel (with penalties)

```sql
{
  id: uuid,
  ride_id: uuid,
  passenger_id: uuid,
  seats_requested: int,
  status: enum,             -- State machine (pending, confirmed, completed, cancelled)
  cancellation_reason: text,
  cancelled_at: timestamp
}
```

**Why it exists**: Represents a **request for coordination**. Booking is not instant - requires driver approval (unlike Uber).

**What it prevents**:
- Ghost bookings (RLS ensures only real users create)
- Duplicate bookings (unique partial index on (ride_id, passenger_id) where active)
- Orphaned bookings (foreign keys + cascade triggers)

**Key insight**: Booking is the **only** way to reserve seats. No side channels.

### vehicles

**Ownership**: User owns their vehicles
**Authority**: Only owner can edit

```sql
{
  id: uuid,
  owner_id: uuid,
  make, model, year, color,
  capacity: int,            -- Source of truth for total_seats
  license_plate: text,
  is_active: boolean
}
```

**Why it exists**: Vehicles have **physical constraints**. Total seats comes from here, not arbitrary driver input.

**What it prevents**:
- Impossible capacity (CHECK capacity <= 9)
- Using deleted vehicles (rides reference active vehicles)
- Phantom vehicles (RLS ensures ownership)

### notifications

**Ownership**: System creates, user views
**Authority**: System-only writes

```sql
{
  id: uuid,
  user_id: uuid,
  type: enum,               -- 12 canonical types
  data: jsonb,              -- Context for notification
  read: boolean
}
```

**Why it exists**: Async communication between users and system.

**What it prevents**:
- Spoofed notifications (only system writes via RPC)
- Lost communication (persistent, not ephemeral)
- Missing critical updates (created in same transaction as state change)

### profiles

**Ownership**: User owns their profile
**Authority**: User edits most fields, admin can restrict

```sql
{
  id: uuid,                 -- Same as auth.users.id
  full_name, bio, avatar_url,
  email_verified: boolean,
  admin_role: enum,
  reliability_score: int,   -- Calculated, not user-input
  is_demo: boolean          -- Isolation flag
}
```

**Why it exists**: User identity and trust metadata.

**What it prevents**:
- Anonymous abuse (profiles required for all actions)
- Self-assigned admin (admin_role managed separately)
- Fake reliability (score calculated by system)

---

## D4: State Machine & Invariants (Key Differentiator)

### Why Explicit State Machines Matter

Most systems let states drift organically, leading to impossible combinations:
- "completed but not paid"
- "cancelled but still active"
- "pending forever"

We enforce **canonical states** with database CHECK constraints and careful transitions.

### Ride Lifecycle

```
┌────────┐  driver posts   ┌────────┐
│  N/A   │ ──────────────→ │ active │
└────────┘                  └───┬────┘
                                │
                 driver starts  │ passengers book/confirm
                                ▼
                          ┌──────────────┐
                          │ in-progress  │
                          └──────┬───────┘
                                 │
                                 │ ride completes OR
                                 │ driver cancels
                                 ▼
                          ┌──────────────┐
                          │  completed   │ ◄──── expire_rides() also moves here
                          │  cancelled   │
                          └──────────────┘
                            (terminal)
```

**Terminal states are immutable**. Once completed or cancelled, no further transitions.

### Booking Lifecycle

```
┌─────────┐  passenger      ┌─────────┐
│   N/A   │  requests   ──→ │ pending │
└─────────┘                  └────┬────┘
                                  │
                   driver decides │
                                  ▼
                    ┌──────────────────────────┐
                    │ confirmed  OR  cancelled │
                    └──────────┬───────────────┘
                               │
                    ride ends  │
                               ▼
                    ┌──────────────────┐
                    │    completed     │
                    │    cancelled     │
                    └──────────────────┘
                      (terminal)
```

**Key Rule**: Active bookings (pending/confirmed) cannot exist on terminal rides. Enforced by trigger.

### Why Deprecated States Were Removed (Phase B)

We found legacy code using:
- `in_progress` (underscore) → Normalized to `in-progress` (hyphen)
- `rejected`, `declined` (booking) → `cancelled` with reason
- `paid` (booking) → Removed (no payments)
- `active` (booking) → Removed (ambiguous)

**Result**: Frontend and backend aligned on 4 ride states and 4 booking states. Impossible to have mismatch.

### Invariant Examples

**INV-SEAT-001**: `available_seats` must equal `total_seats - SUM(active bookings)`

Prevents:
```sql
-- This should NEVER exist:
SELECT * FROM rides r
WHERE r.available_seats != (
  r.total_seats - (
    SELECT COALESCE(SUM(seats_requested), 0)
    FROM ride_bookings
    WHERE ride_id = r.id AND status IN ('pending', 'confirmed')
  )
);
```

**INV-STATE-001**: Terminal rides cannot have active bookings

Prevents:
```sql
-- This should NEVER exist:
SELECT * FROM ride_bookings rb
JOIN rides r ON r.id = rb.ride_id
WHERE r.status IN ('completed', 'cancelled')
  AND rb.status IN ('pending', 'confirmed');
```

**Why This Matters**: These queries run every 15 minutes via `check_system_invariants()`. If violations appear, admins are alerted immediately. **We detect corruption before users notice**.

---

## D5: Seat Accounting (Critical Question)

### "How do you prevent overbooking under concurrency?"

**Answer**: Three layers of defense.

### Layer 1: Atomic RPC with Row Locking

```sql
CREATE FUNCTION book_ride(p_ride_id uuid, p_seats_requested int)
RETURNS jsonb AS $$
DECLARE
  v_ride RECORD;
BEGIN
  -- 1. Lock the ride row (blocks concurrent bookings)
  SELECT * INTO v_ride
  FROM rides
  WHERE id = p_ride_id
  FOR UPDATE;  -- ← Critical: blocks other transactions
  
  -- 2. Check availability
  IF v_ride.available_seats < p_seats_requested THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enough seats');
  END IF;
  
  -- 3. Create booking
  INSERT INTO ride_bookings (ride_id, passenger_id, seats_requested, status)
  VALUES (p_ride_id, auth.uid(), p_seats_requested, 'pending');
  
  -- 4. Decrement seats atomically
  UPDATE rides
  SET available_seats = available_seats - p_seats_requested
  WHERE id = p_ride_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
```

**Key**: `FOR UPDATE` acquires an exclusive row lock. Second concurrent transaction **waits** until first commits.

### Layer 2: Trigger-Based Sync

If someone updates a booking directly (admin fix, cancellation):

```sql
CREATE TRIGGER trg_sync_ride_seats_on_booking_change
AFTER INSERT OR UPDATE OR DELETE ON ride_bookings
FOR EACH ROW
EXECUTE FUNCTION sync_ride_seats();
```

The trigger recalculates `available_seats` to match reality.

### Layer 3: Daily Reconciliation

Background job runs daily:

```sql
SELECT reconcile_seat_counts();  -- Finds mismatches, fixes them, logs discrepancies
```

**Why Three Layers?**
- Layer 1: Prevents issues proactively
- Layer 2: Handles edge cases (admin actions, bugs)
- Layer 3: Catches anything that slipped through

**Confidence**: We've never seen an overbooking in production after Phase C.

---

## D6: Failure Modes & Recovery

### What Can Go Wrong

| Failure | Probability | Impact |
|---------|-------------|--------|
| Seat count drift | Low (mitigated) | High (overbooking) |
| Orphaned bookings | Low (triggers prevent) | Medium (confusion) |
| Expired rides still active | Medium (if job fails) | Low (just clutter) |
| Stuck notifications | Medium (external dependency) | Low (retry works) |
| Admin mistake | Medium (human error) | Variable |

### Detection

**Automatic**:
```sql
-- Runs every 15 minutes
SELECT check_system_invariants();
```

Returns violations with:
- Check ID (e.g., INV-SEAT-001)
- Severity (critical/warning)
- Affected entity IDs
- Sample data

**Manual**:
```sql
SELECT get_system_health_summary();
```

Shows:
- Active rides count
- Expired rides count
- Seat mismatches
- Recent job status
- Unresolved violations

### Recovery

**Seat Drift**:
```sql
SELECT reconcile_seat_counts();
-- Recalculates all active rides, logs fixes to admin_audit_log
```

**Orphaned Bookings**:
```sql
SELECT expire_rides();
-- Transitions expired rides + bookings to terminal states
```

**Stuck Notifications**:
```sql
SELECT repair_missing_notifications();
-- Creates missing notifications for last 30 days
```

### What Users See

**During Issue**: Depends on failure type
- Overbooking: "Ride is full" (worst case, rare)
- Orphaned booking: Shows in their list but can't act on it

**After Fix**: 
- System-sent notification: "Your booking status has been updated"
- Explanation if they contact support

**Key Principle**: Users should never see raw errors. Always friendly messages with next steps.

### What Admins Do

1. **Assess**: Run health check, identify scope
2. **Apply**: Run appropriate repair function
3. **Verify**: Check health again
4. **Communicate**: Email affected users if needed
5. **Document**: Log in post-mortem

**Admin powers are logged**: Every admin action goes to `admin_audit_log` with timestamp, details, and reason.

---

## D7: Security & Admin Model

### Role-Based Access

```
┌──────────────┐
│ Public       │ ← Can view profiles, search rides
├──────────────┤
│ Authenticated│ ← Can book, post rides, message
├──────────────┤
│ moderator    │ ← Can handle reports, view disputes
├──────────────┤
│ super_admin  │ ← Can edit any entity, view audit logs
└──────────────┘
```

**Enforcement**: Row Level Security policies

```sql
-- Example: Only super_admins can view audit logs
CREATE POLICY "Super admins can view audit logs"
ON admin_audit_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND admin_role = 'super_admin'
  )
);
```

### Why Admin UI is Router-Guarded

**Frontend check**:
```typescript
// src/pages/admin/Dashboard.tsx
const { profile } = useAuth();
if (!profile?.admin_role) {
  return <Navigate to="/dashboard" />;
}
```

**Backend enforcement**:
- RLS policies block unauthorized queries
- Admin RPC functions check `profiles.admin_role`

**Defense in depth**: Even if frontend bypassed, backend rejects.

### Audit Logging

Every admin action logged:

```sql
INSERT INTO admin_audit_log (admin_id, admin_role, action, target_type, target_id, details)
VALUES (
  auth.uid(),
  (SELECT admin_role FROM profiles WHERE id = auth.uid()),
  'manual_booking_cancellation',
  'booking',
  'booking-uuid',
  '{"reason": "User request", "contact": "email@example.com"}'::jsonb
);
```

**Retention**: 5 years (accountability)

### Why Admin Power is Treated as Dangerous

Admins can:
- Cancel any booking
- Delete any ride
- Restrict any user
- Toggle feature flags

**Safeguards**:
1. All actions logged immutably
2. No "delete all" buttons (individual only)
3. Confirmation dialogs for destructive actions
4. Admin count minimized (2-3 max)

**Philosophy**: Admin is for **fixing mistakes**, not routine operations. Routine should be automated.

---

## D8: Operational Maturity

### Background Jobs

| Job | Frequency | Purpose |
|-----|-----------|---------|
| `expire_rides()` | Every 5 min | Move past rides to completed |
| `reconcile_seat_counts()` | Daily 3 AM | Fix seat mismatches |
| `repair_missing_notifications()` | Daily 4 AM | Create missed notifications |
| `check_system_invariants()` | Every 15 min | Detect violations |

**Execution**: PostgreSQL `pg_cron` extension

**Monitoring**: `system_job_log` table tracks every run

```sql
SELECT * FROM system_job_log
WHERE status = 'failed'
ORDER BY started_at DESC;
```

### Monitoring Queries

Admins have dashboard with:
- System health (green/yellow/red)
- Unresolved violations count
- Recent job status
- User reliability trends

**Alert thresholds**:
- Critical violations: Immediate Slack alert
- Job failures: Email after 3rd consecutive failure
- High cancellation rate: Weekly report

### Repair Scripts

Located in `supabase/migrations/`:
- All repair functions are **idempotent** (safe to run multiple times)
- All log their actions
- All can be triggered manually or via cron

**Example recovery**:
```sql
-- Ops gets alert: "3 seat mismatches detected"
-- Ops runs:
SELECT reconcile_seat_counts();
-- Result: {"mismatches_found": 3, "mismatches_fixed": 3}
-- Ops verifies:
SELECT check_system_invariants();
-- Result: {"healthy": true, "violations": []}
```

### Launch Readiness

Pre-launch checklist (59 items):
- Environment separation verified
- All migrations applied
- Background jobs running
- No demo data in production
- Admin access tested
- Rollback tested

**Binary**: Every item must be YES before launch.

### Rollback Strategy

| Scenario | Time to Rollback |
|----------|------------------|
| Bad frontend deploy | 2 min (Netlify UI) |
| Wrong env var | 5 min (redeploy) |
| Feature causing issues | Instant (toggle feature_flag) |
| Background job broken | Instant (disable cron job) |

**Philosophy**: Deploy with confidence, rollback without panic.

---

## D9: Trade-Offs & What We Chose Not To Do

### Consciously Avoided Complexity

**No Payments**
- **Why**: Community platform, not marketplace
- **Benefit**: Eliminates payment processing, escrow, disputes, chargebacks, tax reporting
- **Cost**: Can't use monetary incentives for reliability
- **Solution**: Reliability scoring + community accountability

**No Marketplace Pricing**
- **Why**: Not a business optimization problem
- **Benefit**: No surge pricing, no dynamic algorithms, no game theory
- **Cost**: Can't balance supply/demand with price
- **Solution**: First-come-first-served, reliability-based matching

**No AI/ML Hype**
- **Why**: Correctness > cleverness
- **Benefit**: Predictable, debuggable, testable
- **Cost**: Can't claim "AI-powered matching"
- **Solution**: Simple filters + manual search work fine

**No Premature Scaling**
- **Why**: Optimize for correctness first
- **Benefit**: Simpler architecture, faster iteration
- **Cost**: May need refactor for 1M+ users
- **Solution**: PostgreSQL handles 100K users easily, optimize if needed

### What This Demonstrates

**Engineering Judgment**: Knowing what NOT to build is as important as what to build.

**Production Thinking**: Complex solutions are easy. Simple, correct solutions are hard.

**Cost Awareness**: Every feature has maintenance cost. We pay cost only when benefit is clear.

---

## D10: How We Would Evolve It

### Near-Term (6-12 Months)

**Multi-Community Support**
- Allow organizations to create isolated communities
- Company-specific ride pools (Amazon Commute model)
- Separate reliability scores per community

**Technical approach**: Add `community_id` column, scope all queries, duplicate RLS policies per community.

### Medium-Term (1-2 Years)

**Commute Intelligence**
- Learn common routes
- Suggest recurring rides
- Predictive seat availability

**Technical approach**: Time-series analysis on `rides` table, materialize common patterns, suggest via notifications.

### Long-Term (2+ Years)

**Fair Matching Algorithm**
- Optimize for passenger-driver compatibility
- Consider past ride history
- Balance driver burden

**Technical approach**: Build compatibility graph, run matching algorithm nightly, present "recommended for you" rides.

**Reliability Scoring 2.0**
- More nuanced than single number
- Separate driver/passenger scores
- Time-based decay

**Technical approach**: Migrate from single `reliability_score` to `reliability_metrics` JSONB column with factors.

### What We Would NOT Do

- **Blockchain**: Overkill, no benefit
- **Microservices**: Premature until proven bottleneck
- **Machine Learning**: Not until we have 100K+ rides
- **Mobile Native App**: PWA sufficient for now

**Principle**: Evolve based on **user need**, not **technology trends**.

---

## Interview Talking Points

### When asked: "Tell me about a system you designed"

**Opening**: "I designed CarpoolNetwork, a community ride-sharing platform focused on trust and reliability over payments. The core challenge was maintaining data correctness without financial accountability to enforce good behavior."

### When asked: "How do you handle concurrency?"

**Answer**: "We use a three-layer approach: atomic RPC functions with row locking at the transaction level, trigger-based synchronization for edge cases, and daily reconciliation jobs to catch anything missed. The key is `FOR UPDATE` in PostgreSQL - it makes overbooking impossible at the database level."

### When asked: "How do you ensure system reliability?"

**Answer**: "We have automated invariant checking every 15 minutes that validates eight critical system properties. If violations are detected, repair functions run automatically or admins are alerted. Every state transition is logged, and we have defined recovery procedures for six incident classes."

### When asked: "What's your biggest technical decision?"

**Answer**: "Choosing RPC-centric design over REST CRUD. It moves business logic to the database where it's atomic and consistent, rather than distributed across frontend and backend. Trade-off is less flexibility, benefit is correctness guarantees."

### When asked: "How do you prevent abuse?"

**Answer**: "We use reliability scoring based on completion rates and cancellation timing. The system tracks behavior but never auto-bans - there's always human review. We log everything to an immutable audit trail so admin decisions are accountable."

### When asked: "What would you do differently?"

**Answer**: "I'd start with multi-tenancy from day one. Adding `community_id` later requires migration of all RLS policies. Otherwise, the RPC-centric approach and state machine enforcement have proven solid."

---

## Closing Confidence Statement

**"This system is production-ready. It has explicit state machines, atomic operations, automated monitoring, documented failure modes, and a tested rollback strategy. It's not the fanciest architecture, but it's correct, maintainable, and calm under failure - which matters more than clever algorithms."**

---

*Document Version: January 2026*
*Phases A-E Complete*
