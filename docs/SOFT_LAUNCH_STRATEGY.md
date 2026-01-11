# Soft Launch Strategy

> **Purpose**: Controlled rollout to minimize risk and maximize learning  
> **Duration**: 5-7 days from initial deploy  
> **Goal**: Zero incidents, calm operations

---

## Launch Phases

### Phase 0: Pre-Launch (T-24h to T-0)

**Activities**:
- [ ] Complete all pre-flight checks
- [ ] Verify rollback procedures tested
- [ ] Confirm monitoring queries work
- [ ] Brief support team on new features
- [ ] Set up communication channel for launch

**Go/No-Go Criteria**:
- All invariants healthy
- No demo data in production
- At least 1 super_admin verified
- Monitoring queries return expected results

---

### Phase 1: Internal/Shadow (Day 0)

**Audience**: Internal team + 5-10 trusted beta users  
**Features Enabled**: All (but at safe defaults)

**Activities**:
- Deploy to production
- Restrict access via beta allowlist or internal community
- Run full smoke test suite manually
- Monitor continuously (every 15 minutes)

**Success Criteria**:
| Metric | Target | Action if Missed |
|--------|--------|------------------|
| System healthy | `true` | Investigate immediately |
| Smoke tests | 100% pass | Block wider rollout |
| Seat mismatches | 0 | Run repair, investigate |
| Job failures | 0 | Pause jobs, investigate |
| User complaints | 0 critical | Fix before proceeding |

**Duration**: 4-8 hours minimum

**Rollback Trigger**: Any critical issue → immediate rollback

---

### Phase 2: Single Community Pilot (Days 1-2)

**Audience**: One production community (~50-200 users)  
**Features Enabled**: All, with conservative weights

**Community Selection Criteria**:
- [ ] Engaged community admin willing to provide feedback
- [ ] Moderate activity level (not too quiet, not overwhelming)
- [ ] Mix of drivers and passengers
- [ ] History of responsible usage

**Smart Matching Configuration**:
```sql
-- Conservative weights for pilot
UPDATE feature_flags 
SET metadata = jsonb_set(metadata, '{weight_reliability}', '0.15')
WHERE flag_name = 'fair_matching';
```

**Daily Check-In**:
- Morning: Review overnight metrics
- Afternoon: Check with community admin for feedback
- Evening: Review day's data, prepare for next day

**Success Criteria**:
| Metric | Target | Action if Missed |
|--------|--------|------------------|
| System healthy | `true` for 48h | Pause expansion |
| Booking success rate | ≥ 95% | Investigate failures |
| Smart match acceptance | ≥ 30% | Review recommendations |
| Community isolation | 0 breaches | Critical - fix immediately |
| User satisfaction | No major complaints | Gather feedback, iterate |

**Duration**: 48 hours minimum

**Rollback Trigger**: 
- Any community isolation breach
- Invariant violations
- 3+ user complaints about same issue

---

### Phase 3: Gradual Community Expansion (Days 3-5)

**Audience**: Additional communities, one at a time  
**Features Enabled**: All

**Expansion Schedule**:
| Day | Communities Added | Total Active |
|-----|-------------------|--------------|
| 3 | +2 communities | 3 |
| 4 | +3 communities | 6 |
| 5 | +5 communities | 11 |

**Per-Community Onboarding**:
1. Enable community in feature flags
2. Notify community admin
3. Monitor first 4 hours closely
4. Check-in with admin after 24 hours

**Monitoring Cadence**:
- Hours 1-4: Every 15 minutes
- Hours 4-24: Every hour
- After 24h: Every 4 hours

**Success Criteria**: Same as Phase 2, per community

**Rollback Options**:
- Disable specific community if issues
- Keep other communities active if isolated

---

### Phase 4: General Availability (Day 5+)

**Audience**: All communities  
**Features Enabled**: All, with tuned weights

**GA Criteria**:
- [ ] 5+ days of stable operation
- [ ] No critical incidents
- [ ] Smart matching weights validated
- [ ] Community isolation verified
- [ ] Admin dashboard showing healthy metrics

**Weight Tuning Based on Data**:
```sql
-- Review matching effectiveness
SELECT 
  (SELECT AVG((route_similarity->>'score')::float) FROM (
    SELECT get_suggested_rides(...) -- sample queries
  ) samples) as avg_route_score,
  (SELECT AVG((driver_reliability->>'score')::float) FROM (...)) as avg_reliability
-- Adjust weights if scores too high or too low
```

**Post-GA Monitoring**:
- Weekly invariant audit
- Monthly fairness review (driver exposure distribution)
- Quarterly reliability score calibration

---

## Communication Plan

### Pre-Launch (T-24h)

**Internal**:
> "We're deploying CarpoolNetwork v2.0 tomorrow. Key features: Smart Matching (recommendations) and Multi-Community support. No action needed from users. Watch #launch-updates for status."

### Launch Start (T-0)

**Internal**:
> "Deploy started. Monitoring active. Will update in 30 minutes."

### Pilot Community

**To Community Admin**:
> "Your community has been selected for our pilot of new smart matching features. You'll see 'Recommended for You' rides based on route similarity and driver reliability. Everything is fully opt-in - you can still see all rides. Please share feedback via [channel]."

### Issue Detected

**Internal (Non-Critical)**:
> "Noticed [issue]. Investigating. No user impact expected. Will update in 15 minutes."

**Internal (Critical)**:
> "Critical issue: [description]. Initiating rollback. ETA: [time]. Will provide RCA within 24h."

**External (If User-Facing)**:
> "We're experiencing a brief issue with [feature]. Our team is working on it. Thank you for your patience."

### All Clear

**Internal**:
> "Launch complete. All systems healthy. Monitoring continues. Next update in [time]."

---

## Rollback Decision Matrix

| Severity | Examples | Response Time | Action |
|----------|----------|---------------|--------|
| **P0 - Critical** | Data loss, security breach, overbooking | Immediate | Full rollback |
| **P1 - High** | Feature broken for all users, invariant violations | 15 minutes | Disable feature |
| **P2 - Medium** | Feature degraded, minor UX issues | 1 hour | Investigate, patch |
| **P3 - Low** | Cosmetic issues, minor bugs | Next business day | Fix in next release |

### P0 Response Procedure

1. **Assess** (0-2 min): Confirm severity, scope
2. **Communicate** (2-5 min): Alert team, acknowledge issue
3. **Rollback** (5-10 min): Execute rollback procedure
4. **Verify** (10-15 min): Confirm rollback successful
5. **Communicate** (15-20 min): Update stakeholders
6. **RCA** (24h): Root cause analysis

---

## Feature-Specific Launch Notes

### Smart Matching (Phase F++)

**Initial State**: Enabled with conservative weights

**Observation Points**:
- Are recommendations relevant? (Check route_similarity scores)
- Are users clicking recommendations? (Track engagement)
- Is fairness working? (Check driver exposure distribution)

**Tuning Options**:
```sql
-- Increase/decrease reliability weight
UPDATE feature_flags 
SET metadata = jsonb_set(metadata, '{weight_reliability}', '"0.25"')
WHERE flag_name = 'fair_matching';

-- Adjust new user threshold
UPDATE feature_flags 
SET metadata = jsonb_set(metadata, '{new_user_threshold}', '"10"')
WHERE flag_name = 'reliability_scoring_v2';
```

### Multi-Community (Phase G)

**Initial State**: Enabled, cross-community disabled

**Observation Points**:
- Are communities correctly isolated? (Run isolation query)
- Can users switch communities? (Manual test)
- Are RLS policies working? (Check audit logs)

**Gradual Enable**:
```sql
-- After 1 week of stable operation, consider enabling cross-community
-- UPDATE feature_flags 
-- SET is_enabled = true 
-- WHERE flag_name = 'cross_community_visibility';
-- Only if specific partnership requests exist
```

---

## Post-Launch Review (Day 7)

### Metrics to Review

| Metric | Source | Target |
|--------|--------|--------|
| Uptime | Monitoring | 99.9%+ |
| Invariant violations | `check_system_invariants()` | 0 |
| Seat mismatches | Monitoring query | 0 |
| Smart match CTR | Analytics | >20% |
| User complaints | Support tickets | <5 |
| Rollbacks performed | Incident log | 0 |

### Questions to Answer

1. Did smart matching improve ride discovery?
2. Were recommendations explainable to users?
3. Did community isolation work as designed?
4. Were there any unexpected issues?
5. What would we do differently next time?

### Follow-Up Actions

- [ ] Adjust weights based on data
- [ ] Address any user feedback
- [ ] Document lessons learned
- [ ] Plan next feature iteration
- [ ] Archive launch documentation

---

## Appendix: Quick Reference Commands

### Enable Community for Pilot
```sql
-- Mark community as pilot
UPDATE communities 
SET settings = jsonb_set(settings, '{pilot_phase}', '"active"')
WHERE slug = 'pilot-community';
```

### Check Community Health
```sql
SELECT get_community_health('community-uuid');
```

### Emergency Feature Disable
```sql
UPDATE feature_flags SET is_enabled = false WHERE flag_name = 'smart_route_matching';
UPDATE feature_flags SET is_enabled = false WHERE flag_name = 'multi_community';
```

### Monitor All Communities
```sql
SELECT c.name, get_community_health(c.id)
FROM communities c
WHERE c.status = 'active';
```

---

*Last Updated: January 11, 2026*
