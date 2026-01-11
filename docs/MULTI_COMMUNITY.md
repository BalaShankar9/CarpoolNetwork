# Multi-Community Architecture (Phase G)

> **Model**: Amazon-style isolated communities  
> **Principle**: Community boundaries are HARD isolation boundaries  
> **Status**: Production-ready extension to CarpoolNetwork

---

## Executive Summary

Multi-Community support transforms CarpoolNetwork from a single-tenant platform to a **federated community network**. Each community (employer, campus, organization) operates as an isolated unit with:

- **Data isolation**: Rides, bookings, messages stay within community
- **Role hierarchy**: Community Admins, Moderators, Members
- **Cross-community policies**: Explicit opt-in, not accidental bleed
- **Scalable operations**: Per-community monitoring, jobs, admin

This mirrors how Amazon Commute serves multiple warehouses/offices while maintaining corporate-level oversight.

---

## G1: Community as a First-Class Boundary

### What is a Community?

A community is an **organizational unit** that owns:
- Its member roster
- Its rides and bookings
- Its moderation policies
- Its reliability tracking (optionally isolated)

### Examples

| Community Type | Example | Use Case |
|----------------|---------|----------|
| Employer | "Amazon SEA" | Corporate campus commute |
| Campus | "UW Seattle" | University ride-sharing |
| Warehouse | "BFI4 Fulfillment" | Warehouse shift rides |
| Organization | "Seattle Tech Alliance" | Multi-company consortium |
| Neighborhood | "Capitol Hill Co-op" | Local community |

### Ownership Rules

```
┌─────────────────────────────────────────────────────────┐
│                      COMMUNITY                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  RIDES                                           │   │
│  │  - Belong to exactly ONE community              │   │
│  │  - Created by members only                      │   │
│  │  - Visible only within community (default)      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  BOOKINGS                                        │   │
│  │  - Tied to community via ride                   │   │
│  │  - Cannot cross community boundaries            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  MEMBERS                                         │   │
│  │  - Users can join MULTIPLE communities          │   │
│  │  - Membership grants access to community data   │   │
│  │  - Roles are PER-COMMUNITY                      │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Key Invariant

**INV-COMMUNITY-001**: A ride MUST have a community_id. A booking MUST inherit community scope from its ride.

```sql
-- This MUST fail:
INSERT INTO rides (driver_id, ...) VALUES (...);  -- Missing community_id

-- This MUST succeed:
INSERT INTO rides (driver_id, community_id, ...) VALUES (...);
```

---

## G2: Data Isolation & Authorization

### RLS Policy Architecture

Every table with community-scoped data has RLS policies that:
1. Check user's community membership
2. Verify user has required role
3. Deny access if community context missing

```sql
-- Example: Rides can only be viewed by community members
CREATE POLICY "Community members can view community rides"
ON rides FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM community_memberships cm
        WHERE cm.community_id = rides.community_id
          AND cm.user_id = auth.uid()
          AND cm.status = 'active'
    )
);
```

### Authorization Matrix

| Entity | View | Create | Edit | Delete |
|--------|------|--------|------|--------|
| Community | Members | Platform Admin | Community Admin | Platform Admin |
| Ride | Members | Members | Owner, Mods | Owner, Mods |
| Booking | Ride Members | Members | Parties, Mods | Parties, Mods |
| Membership | Members | Admins | Admins | Admins |

### Community Context Requirement

**All core actions require community context**:

```typescript
// BAD - No community context
const { data: rides } = await supabase
  .from('rides')
  .select('*');  // Will fail or return empty

// GOOD - Explicit community context
const { data: rides } = await supabase
  .from('rides')
  .select('*')
  .eq('community_id', activeCommunityId);
```

### Missing Context Behavior

If a user attempts an action without valid community membership:

| Scenario | Behavior |
|----------|----------|
| View rides, no community | Empty result (RLS filters) |
| Create ride, no membership | Error: "Join community first" |
| Book ride, wrong community | Error: "Not a member of this community" |
| Admin action, not admin | Error: "Insufficient permissions" |

---

## G3: Community Roles & Moderation

### Role Hierarchy

```
Platform Admin
    │
    ▼
Community Admin
    │
    ▼
Moderator
    │
    ▼
Member
```

### Role Powers

| Role | Scope | Powers |
|------|-------|--------|
| **Member** | Own data | Post rides, book rides, message, view community |
| **Moderator** | Community content | Edit/remove rides, handle reports, warn users |
| **Community Admin** | Community config | Manage memberships, set policies, promote mods |
| **Platform Admin** | System-wide | Create communities, cross-community ops, system health |

### Detailed Permissions

#### Member
- ✅ View all community rides
- ✅ Post own rides
- ✅ Book available rides
- ✅ Cancel own bookings
- ✅ Send messages within rides
- ✅ Report content
- ❌ Edit others' content
- ❌ Manage memberships

#### Moderator
- ✅ All Member powers
- ✅ Edit/remove any ride (with audit)
- ✅ Cancel any booking (with audit)
- ✅ View user reports
- ✅ Issue warnings
- ✅ Temporarily suspend members (24h max)
- ❌ Permanent bans
- ❌ Change community settings

#### Community Admin
- ✅ All Moderator powers
- ✅ Add/remove members
- ✅ Promote/demote moderators
- ✅ Set community policies
- ✅ Configure cross-community rules
- ✅ View community analytics
- ❌ Delete community
- ❌ Platform-level operations

#### Platform Admin
- ✅ All Community Admin powers (any community)
- ✅ Create/delete communities
- ✅ Cross-community queries
- ✅ System health operations
- ✅ Feature flag management
- ⚠️ Actions require extra audit logging

### Audit Trail

**All moderation actions logged**:

```sql
INSERT INTO community_audit_log (
    community_id,
    actor_id,
    actor_role,
    action,
    target_type,
    target_id,
    reason,
    details
) VALUES (
    'community-uuid',
    auth.uid(),
    'moderator',
    'ride_removed',
    'ride',
    'ride-uuid',
    'Violates community guidelines',
    '{"violation_type": "spam"}'::jsonb
);
```

---

## G4: Cross-Community Rules

### Default: Complete Isolation

By default, communities are **completely isolated**:
- No cross-visibility
- No cross-booking
- No shared data

### Cross-Community Policies

Communities can opt-in to controlled sharing:

| Policy | Effect | Use Case |
|--------|--------|----------|
| `visibility_only` | Rides visible, not bookable | Discovery phase |
| `approval_required` | Booking requires admin approval | Trusted partnerships |
| `mutual_access` | Full reciprocal access | Same organization |
| `none` (default) | Complete isolation | Separate organizations |

### Policy Configuration

```sql
CREATE TABLE community_partnerships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    community_a_id uuid NOT NULL REFERENCES communities(id),
    community_b_id uuid NOT NULL REFERENCES communities(id),
    
    -- Policy from A's perspective
    a_to_b_policy text NOT NULL DEFAULT 'none',
    -- Policy from B's perspective
    b_to_a_policy text NOT NULL DEFAULT 'none',
    
    -- Approval
    a_approved_at timestamptz,
    b_approved_at timestamptz,
    
    -- Status
    status text NOT NULL DEFAULT 'pending',
    
    CONSTRAINT valid_policy CHECK (
        a_to_b_policy IN ('none', 'visibility_only', 'approval_required', 'mutual_access')
        AND b_to_a_policy IN ('none', 'visibility_only', 'approval_required', 'mutual_access')
    ),
    CONSTRAINT different_communities CHECK (community_a_id != community_b_id),
    CONSTRAINT unique_partnership UNIQUE (community_a_id, community_b_id)
);
```

### Cross-Community Booking Flow

When `approval_required`:

```
1. User from Community A sees ride from Community B
2. User requests booking
3. Booking created with status = 'cross_community_pending'
4. Notification sent to Community B admin
5. Admin approves/denies
6. On approval: booking status → 'pending' (normal flow)
7. On denial: booking status → 'cancelled'
```

### Visibility Rules

```sql
-- Rides visible to user based on:
-- 1. Their own communities
-- 2. Partner communities with visibility_only or higher

CREATE POLICY "Cross-community ride visibility"
ON rides FOR SELECT
TO authenticated
USING (
    -- Direct membership
    EXISTS (
        SELECT 1 FROM community_memberships cm
        WHERE cm.community_id = rides.community_id
          AND cm.user_id = auth.uid()
          AND cm.status = 'active'
    )
    OR
    -- Partner community with visibility
    EXISTS (
        SELECT 1 FROM community_partnerships cp
        JOIN community_memberships cm ON (
            cm.community_id = cp.community_a_id OR cm.community_id = cp.community_b_id
        )
        WHERE cm.user_id = auth.uid()
          AND cm.status = 'active'
          AND cp.status = 'active'
          AND (
              (cp.community_a_id = rides.community_id AND cp.b_to_a_policy != 'none')
              OR (cp.community_b_id = rides.community_id AND cp.a_to_b_policy != 'none')
          )
    )
);
```

---

## G5: Multi-Community User Experience

### Current Community Context

Users always have an **active community context**:

```typescript
interface UserContext {
    userId: string;
    activeCommunityId: string;
    memberships: CommunityMembership[];
}
```

### UI Requirements

#### 1. Clear Community Indicator

```
┌─────────────────────────────────────────────────────────┐
│  🏢 Amazon SEA  ▼                    [Profile] [Logout] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Dashboard                                              │
│                                                         │
```

The community name is ALWAYS visible in header.

#### 2. Explicit Community Switching

```
┌─────────────────────────────────────────────────────────┐
│  Switch Community                                       │
├─────────────────────────────────────────────────────────┤
│  ● Amazon SEA           (Current)                       │
│  ○ Seattle Tech Alliance                                │
│  ○ UW Seattle Alumni                                    │
├─────────────────────────────────────────────────────────┤
│  [+ Join Another Community]                             │
└─────────────────────────────────────────────────────────┘
```

Switching requires explicit click, never automatic.

#### 3. Cross-Community Labels

When viewing partner community content:

```
┌─────────────────────────────────────────────────────────┐
│  🌐 From: Seattle Tech Alliance                         │
│                                                         │
│  Ride to Bellevue Tech Center                           │
│  Driver: Jane D.                                        │
│  Tomorrow 8:00 AM                                       │
│                                                         │
│  ⚠️ Cross-community booking - may require approval      │
│                                                         │
│  [Request to Join Ride]                                 │
└─────────────────────────────────────────────────────────┘
```

#### 4. No Silent Context Bleed

**FORBIDDEN behaviors**:
- ❌ Auto-switching community on notification click
- ❌ Showing mixed-community results without labels
- ❌ Creating content in wrong community
- ❌ Defaulting to "all communities" view

**REQUIRED behaviors**:
- ✅ Confirm before switching context
- ✅ Label every cross-community item
- ✅ Filter search to current community (with opt-in for cross)
- ✅ Validate community on create/book

---

## G6: Scaling Without Chaos

### Query Scoping

**All queries MUST be community-scoped**:

```sql
-- BAD (platform-wide scan)
SELECT COUNT(*) FROM rides WHERE status = 'active';

-- GOOD (community-scoped)
SELECT COUNT(*) FROM rides 
WHERE status = 'active' AND community_id = $1;
```

### Index Strategy

Community-scoped indexes for performance:

```sql
-- Composite index for community-scoped queries
CREATE INDEX idx_rides_community_status 
ON rides (community_id, status, departure_time);

-- Composite index for bookings
CREATE INDEX idx_bookings_community 
ON ride_bookings (ride_id, status);
-- (ride_id already contains community context)
```

### Background Job Boundaries

**Jobs run per-community**:

```sql
-- BAD (platform-wide)
SELECT expire_rides();

-- GOOD (community-scoped)
SELECT expire_rides_for_community(community_id)
FROM communities
WHERE is_active = true;
```

### Job Isolation

```sql
CREATE OR REPLACE FUNCTION expire_rides_for_community(p_community_id uuid)
RETURNS int AS $$
DECLARE
    v_expired int := 0;
BEGIN
    UPDATE rides
    SET status = 'completed'
    WHERE community_id = p_community_id
      AND status = 'active'
      AND departure_time < now() - interval '2 hours';
    
    GET DIAGNOSTICS v_expired = ROW_COUNT;
    
    -- Log per-community
    INSERT INTO community_job_log (community_id, job_name, status, details)
    VALUES (p_community_id, 'expire_rides', 'success', 
        jsonb_build_object('expired_count', v_expired));
    
    RETURN v_expired;
END;
$$ LANGUAGE plpgsql;
```

### Monitoring per Community

Admin dashboard shows **per-community metrics**:

| Metric | Platform | Community A | Community B |
|--------|----------|-------------|-------------|
| Active rides | 1,247 | 823 | 424 |
| Active users | 5,892 | 3,201 | 2,691 |
| Avg reliability | 0.82 | 0.85 | 0.78 |
| Job failures | 0 | 0 | 0 |

### Failure Containment

**Community failures don't cascade**:

| Failure | Impact | Containment |
|---------|--------|-------------|
| Community job fails | That community only | Other communities unaffected |
| High load on community | That community slower | Others at normal speed |
| Community admin mistake | That community | Other communities unaffected |
| RLS misconfiguration | That community data | Platform admin can fix |

---

## G7: Implementation Trade-offs

### Chosen: Community-ID on Rides

**Approach**: `community_id` column on `rides` table, inherited by bookings via foreign key.

**Pros**:
- Simple, clear ownership
- Fast queries (single join)
- Easy to understand

**Cons**:
- Ride cannot belong to multiple communities
- No "public" rides (by design)

### Alternative Rejected: Tag-Based Communities

**Approach**: Rides have tags, communities filter by tags.

**Why rejected**:
- Ambiguous ownership
- Complex queries
- Hard to enforce isolation

### Alternative Rejected: Separate Databases

**Approach**: Each community gets own database.

**Why rejected**:
- High operational cost
- No cross-community features possible
- User identity fragmentation

### Chosen: Membership Table (Not Claims)

**Approach**: `community_memberships` table with user_id, community_id, role.

**Alternative**: Store communities in auth claims.

**Why table approach**:
- Can query memberships in SQL
- Role changes don't require re-auth
- Easier audit trail

---

## Interview-Ready Explanation

### "How do you handle multi-tenancy?"

> "We use a **shared database with community-scoped RLS**. Every community-sensitive table has `community_id` column, and RLS policies check user membership before allowing access.
>
> The key insight is that **communities are boundaries, not tags**. A ride belongs to exactly one community. Users can belong to multiple, but they must explicitly switch context - no accidental cross-community operations.
>
> We learned from Amazon Commute that isolation must be **airtight** - a warehouse in Seattle should never accidentally see rides from a warehouse in Phoenix, even if the same user works at both."

### "How do you prevent data leakage?"

> "Three layers:
>
> 1. **RLS policies** on every table check community membership. Even direct SQL can't bypass this.
>
> 2. **Application context** requires active community selection. No 'show all' default.
>
> 3. **Audit logging** captures every cross-boundary access attempt, even failed ones.
>
> Cross-community access is **opt-in via partnerships** and requires admin approval on both sides."

### "How does this scale?"

> "We index by community first, so queries are scoped from the start. Background jobs run per-community, so one busy community doesn't block others.
>
> At Amazon scale (millions of users), you'd shard by community cluster. Our current design supports that - just route community ranges to different Supabase projects. The API contract stays the same."

---

## Security Checklist

### Before Multi-Community Launch

- [ ] All tables have community_id where needed
- [ ] All RLS policies check community membership
- [ ] All background jobs are community-scoped
- [ ] No platform-wide queries in user-facing code
- [ ] Community context required for all mutations
- [ ] Audit logging enabled for admin actions
- [ ] Cross-community policies default to 'none'
- [ ] Partnership approval requires both admins
- [ ] UI clearly shows current community
- [ ] Context switch requires confirmation

### Ongoing Monitoring

- [ ] Per-community health metrics
- [ ] Cross-community access attempts logged
- [ ] No membership without approval
- [ ] No orphaned rides (community deleted)
- [ ] Partnership policy respected

---

*Document Version: January 2026*
*Phase G Complete*
