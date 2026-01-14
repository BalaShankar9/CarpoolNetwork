# Production Deployment Runbook

> **Date**: January 14, 2026  
> **Status**: READY FOR EXECUTION  
> **Owner**: Release Manager  
> **Rollback Ready**: Yes

---

## CRITICAL: Environment Variable Verification (UPDATED 2026-01-14)

Before any deployment, verify these **required** environment variables are set in Netlify:

### Required Environment Variables

| Variable | Required | Purpose | How to Verify |
|----------|----------|---------|---------------|
| `VITE_SUPABASE_URL` | ✅ CRITICAL | Supabase project URL | Netlify Dashboard → Site settings → Environment variables |
| `VITE_SUPABASE_ANON_KEY` | ✅ CRITICAL | Supabase anonymous key | Netlify Dashboard → Site settings → Environment variables |
| `VITE_GOOGLE_MAPS_API_KEY` | Optional | Google Maps integration | Maps won't work if missing |
| `VITE_SENTRY_DSN` | Optional | Error tracking | Sentry won't initialize if missing |
| `VITE_GA4_MEASUREMENT_ID` | Optional | Analytics | Analytics disabled if missing |

### Verification Checklist

```bash
# In Netlify Dashboard: Site settings → Environment variables
# Verify ALL of these are set (not empty):
- [ ] VITE_SUPABASE_URL starts with "https://" and ends with "supabase.co"
- [ ] VITE_SUPABASE_ANON_KEY is a valid JWT (starts with "eyJ")
- [ ] No trailing whitespace or quotes around values
```

### What Happens If Environment Variables Are Missing

If `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` are missing:
1. The app will NOT crash (fixed 2026-01-14)
2. A user-friendly error page will be displayed
3. Users will see "Unable to Start Application" with retry options
4. The error will indicate it's a configuration issue

---

## Service Worker Status

**Current Status**: DISABLED (as of 2026-01-14)

The service worker has been temporarily disabled to prevent stale cache issues after deployments.

### Why It's Disabled

A race condition was causing blank screens:
1. `index.html` unregisters service workers on load
2. `pwaService.ts` was re-registering the SW immediately
3. Old cached chunks would be served, causing ChunkLoadError

### Re-enabling Service Worker (Future)

To re-enable the service worker:
1. Implement proper cache versioning in `public/sw.js`
2. Remove the unregister code from `index.html`
3. Set `SW_ENABLED = true` in `src/services/pwaService.ts`
4. Ensure `netlify.toml` has no-cache headers for `sw.js`

---

## Pre-Flight Checklist (STOP IF ANY FAILS)

### 1. Environment Verification

```bash
# Verify we're deploying to correct environment
echo $VITE_APP_ENV  # Must be "production"
echo $VITE_SUPABASE_URL  # Must be production Supabase URL
```

| Check | Command/Action | Expected | Actual | ✓ |
|-------|---------------|----------|--------|---|
| Production env var set | `echo $VITE_APP_ENV` | `production` | | ☐ |
| Production Supabase URL | `echo $VITE_SUPABASE_URL` | `https://<prod>.supabase.co` | | ☐ |
| No secrets in git | `git log --oneline -p | grep -i "supabase\|secret\|key" | head -5` | No matches | | ☐ |
| Service role NOT in VITE_ | `grep "VITE_.*SERVICE" .env*` | No matches | | ☐ |

### 2. Database Migration Status

Run in Supabase SQL Editor (Production):

```sql
-- Check all Phase migrations are present
SELECT COUNT(*) as migration_count 
FROM (VALUES 
  ('20260111120000_phase_b_state_cleanup'),
  ('20260111130000_phase_c_reliability_automation'),
  ('20260111140000_phase_e_launch_readiness'),
  ('20260111150000_phase_fpp_smart_intelligence'),
  ('20260111160000_phase_g_multi_community')
) AS required(name)
WHERE NOT EXISTS (
  SELECT 1 FROM _supabase_migrations WHERE name LIKE required.name || '%'
);
-- Expected: 0 (all migrations applied)
```

| Check | Query | Expected | Actual | ✓ |
|-------|-------|----------|--------|---|
| Phase B migration | See above | Applied | | ☐ |
| Phase C migration | See above | Applied | | ☐ |
| Phase E migration | See above | Applied | | ☐ |
| Phase F++ migration | See above | Applied | | ☐ |
| Phase G migration | See above | Applied | | ☐ |

### 3. Invariant Verification

```sql
-- CRITICAL: Run before ANY deployment step
SELECT * FROM check_system_invariants();
```

| Invariant | Expected | Actual | ✓ |
|-----------|----------|--------|---|
| healthy | `true` | | ☐ |
| total_violations | `0` | | ☐ |
| seat_mismatches | `0` | | ☐ |
| orphaned_bookings | `0` | | ☐ |
| invalid_states | `0` | | ☐ |

**⚠️ STOP HERE IF ANY VIOLATIONS EXIST**

### 4. No Demo Data in Production

```sql
SELECT * FROM verify_no_demo_data();
-- Expected: {"clean": true, "counts": {...all zeros...}}
```

| Check | Expected | Actual | ✓ |
|-------|----------|--------|---|
| Demo data clean | `true` | | ☐ |

### 5. Feature Flags (Safe Defaults)

```sql
-- Verify feature flags exist with safe defaults
SELECT flag_name, is_enabled, metadata 
FROM feature_flags 
WHERE flag_name IN (
  'smart_route_matching',
  'commute_clustering', 
  'reliability_scoring_v2',
  'fair_matching',
  'multi_community',
  'cross_community_visibility'
)
ORDER BY flag_name;
```

| Flag | Default | Safe for Launch | ✓ |
|------|---------|-----------------|---|
| `smart_route_matching` | `true` | Yes (advisory only) | ☐ |
| `commute_clustering` | `true` | Yes (advisory only) | ☐ |
| `reliability_scoring_v2` | `true` | Yes (advisory only) | ☐ |
| `fair_matching` | `true` | Yes (advisory only) | ☐ |
| `multi_community` | `true` | Yes (with default community) | ☐ |
| `cross_community_visibility` | `false` | Yes (isolated by default) | ☐ |

### 6. Admin Access Verification

```sql
-- Verify at least one super_admin exists
SELECT id, full_name, email, admin_role 
FROM profiles 
WHERE admin_role = 'super_admin';
-- Expected: At least 1 row
```

| Check | Expected | Actual | ✓ |
|-------|----------|--------|---|
| Super admin exists | ≥ 1 | | ☐ |
| Admin can access /admin | Manual test | | ☐ |
| Non-admin blocked from /admin | Manual test | | ☐ |

### 7. Background Jobs Ready

```sql
-- Verify jobs are runnable (dry run)
SELECT 'expire_rides' as job, (SELECT COUNT(*) FROM rides WHERE status = 'active' AND departure_time < now()) as pending;
SELECT 'reconcile_seats' as job, (SELECT get_system_health_summary()->>'active_rides') as active_rides;
```

| Job | Runnable | Last Success | ✓ |
|-----|----------|--------------|---|
| `expire_rides()` | Yes | | ☐ |
| `reconcile_seat_counts()` | Yes | | ☐ |
| `check_system_invariants()` | Yes | | ☐ |
| `refresh_reliability_cache()` | Yes | | ☐ |

---

## Deployment Sequence (STRICT ORDER)

### Phase 1: Database (FIRST)

**Time**: ~5 minutes  
**Risk**: Low (additive migrations only)  
**Rollback**: Feature flags

```bash
# 1. Apply any pending migrations via Supabase Dashboard or CLI
supabase db push --linked

# 2. Verify migrations applied
supabase db status
```

**Post-Database Verification**:
```sql
-- Run immediately after migration
SELECT * FROM check_system_invariants();
-- Must return healthy: true

SELECT * FROM verify_no_demo_data();
-- Must return clean: true
```

| Check | Expected | Actual | ✓ |
|-------|----------|--------|---|
| Migrations applied | Success | | ☐ |
| Invariants healthy | `true` | | ☐ |
| No demo data | `true` | | ☐ |
| No lock timeout errors | None | | ☐ |

### Phase 2: Backend Logic (Supabase Functions)

**Time**: ~2 minutes  
**Risk**: Low (functions are versioned)  
**Rollback**: Redeploy previous version

```bash
# 1. Deploy edge functions if any
supabase functions deploy

# 2. Enable background job schedules (if using pg_cron)
# Run in SQL Editor:
```

```sql
-- Enable scheduled jobs (adjust cron expressions as needed)
-- SELECT cron.schedule('expire-rides', '*/5 * * * *', 'SELECT expire_rides()');
-- SELECT cron.schedule('reconcile-seats', '0 3 * * *', 'SELECT reconcile_seat_counts()');
-- SELECT cron.schedule('check-invariants', '*/15 * * * *', 'SELECT check_system_invariants()');
-- SELECT cron.schedule('refresh-reliability', '0 * * * *', 'SELECT refresh_reliability_cache()');
```

**Post-Backend Verification**:
```sql
-- Test each job manually
SELECT expire_rides();
SELECT reconcile_seat_counts();
SELECT check_system_invariants();

-- Check job log
SELECT * FROM system_job_log ORDER BY started_at DESC LIMIT 5;
```

| Check | Expected | Actual | ✓ |
|-------|----------|--------|---|
| Edge functions deployed | Success | | ☐ |
| Jobs scheduled | Configured | | ☐ |
| Manual job test | Success | | ☐ |

### Phase 3: Frontend (LAST)

**Time**: ~3 minutes  
**Risk**: Low (static deployment)  
**Rollback**: Netlify instant rollback

```bash
# 1. Build with production config
npm run build

# 2. Deploy to Netlify
netlify deploy --prod

# Or via Netlify UI:
# - Trigger deploy from main branch
```

**Post-Frontend Verification**:
- [ ] App loads at production URL
- [ ] No console errors
- [ ] Community context loads correctly
- [ ] Smart matching recommendations visible

---

## Smoke Tests (REQUIRED)

### Test 1: Authentication

| Step | Action | Expected | Actual | ✓ |
|------|--------|----------|--------|---|
| 1.1 | Navigate to app | Login page loads | | ☐ |
| 1.2 | Login with test account | Dashboard loads | | ☐ |
| 1.3 | Logout | Returns to login | | ☐ |
| 1.4 | Refresh page | Session restored | | ☐ |

### Test 2: Core Ride Flow

| Step | Action | Expected | Actual | ✓ |
|------|--------|----------|--------|---|
| 2.1 | Create new ride | Ride created, shows in list | | ☐ |
| 2.2 | View ride details | All fields displayed | | ☐ |
| 2.3 | Request booking (different user) | Booking created as 'pending' | | ☐ |
| 2.4 | Accept booking (driver) | Status → 'confirmed', seats decremented | | ☐ |
| 2.5 | Cancel booking | Status → 'cancelled', seats restored | | ☐ |
| 2.6 | Verify seats | `available_seats` correct | | ☐ |

### Test 3: Smart Matching

| Step | Action | Expected | Actual | ✓ |
|------|--------|----------|--------|---|
| 3.1 | Search for rides | Recommendations section visible | | ☐ |
| 3.2 | View recommendation | Explanation text shown | | ☐ |
| 3.3 | Disable `smart_route_matching` flag | Recommendations disappear | | ☐ |
| 3.4 | Re-enable flag | Recommendations return | | ☐ |

### Test 4: Multi-Community

| Step | Action | Expected | Actual | ✓ |
|------|--------|----------|--------|---|
| 4.1 | View current community | Community name displayed | | ☐ |
| 4.2 | Switch community | Context updates | | ☐ |
| 4.3 | Create ride in Community A | Ride belongs to A only | | ☐ |
| 4.4 | Switch to Community B | Ride from A NOT visible | | ☐ |

### Test 5: Admin Access

| Step | Action | Expected | Actual | ✓ |
|------|--------|----------|--------|---|
| 5.1 | Login as admin | Admin dashboard accessible | | ☐ |
| 5.2 | View system health | Health metrics displayed | | ☐ |
| 5.3 | View users | User list loads | | ☐ |
| 5.4 | Logout, login as non-admin | `/admin` blocked | | ☐ |
| 5.5 | Check audit log | Admin actions logged | | ☐ |

---

## Post-Deploy Monitoring (First 24 Hours)

### Monitoring Queries (Run every 15-30 minutes)

```sql
-- 1. System Health (should be all green)
SELECT * FROM get_system_health_summary();

-- 2. Invariant Check (should be healthy: true)
SELECT * FROM check_system_invariants();

-- 3. Seat Mismatches (should be 0)
SELECT r.id, r.total_seats, r.available_seats,
       r.total_seats - COALESCE(SUM(rb.seats_requested), 0) as expected_available
FROM rides r
LEFT JOIN ride_bookings rb ON rb.ride_id = r.id AND rb.status IN ('pending', 'confirmed')
WHERE r.status IN ('active', 'in-progress')
GROUP BY r.id
HAVING r.available_seats != r.total_seats - COALESCE(SUM(rb.seats_requested), 0);
-- Expected: 0 rows

-- 4. Bookings Without Notification (should be 0)
SELECT rb.id, rb.passenger_id, rb.status, rb.created_at
FROM ride_bookings rb
WHERE rb.created_at > now() - interval '1 hour'
  AND NOT EXISTS (
    SELECT 1 FROM notifications n 
    WHERE n.user_id = rb.passenger_id 
      AND n.created_at > rb.created_at - interval '1 minute'
  );
-- Expected: 0 rows

-- 5. Community Isolation Check (should be 0)
SELECT r.id as ride_id, r.community_id as ride_community,
       rb.id as booking_id, p.id as passenger_id
FROM ride_bookings rb
JOIN rides r ON r.id = rb.ride_id
JOIN profiles p ON p.id = rb.passenger_id
WHERE r.community_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM community_memberships cm
    WHERE cm.user_id = p.id 
      AND cm.community_id = r.community_id
      AND cm.status = 'active'
  );
-- Expected: 0 rows (no cross-community bookings)

-- 6. Job Status (should all be 'completed')
SELECT job_name, status, started_at, completed_at, error_message
FROM system_job_log
WHERE started_at > now() - interval '1 hour'
ORDER BY started_at DESC;
```

### Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Invariant violations | 1+ | Any | Run `reconcile_seat_counts()` |
| Seat mismatches | 1+ | 5+ | Investigate, repair |
| Job failures | 1 | 3 consecutive | Disable job, investigate |
| Community breaches | ANY | ANY | Immediate investigation |
| Missing notifications | 5+ | 10+ | Run `repair_missing_notifications()` |

---

## Rollback Procedures

### Rollback Level 1: Feature Flags (Instant)

```sql
-- Disable smart matching
UPDATE feature_flags SET is_enabled = false WHERE flag_name = 'smart_route_matching';

-- Disable all intelligence features
UPDATE feature_flags SET is_enabled = false 
WHERE flag_name IN ('smart_route_matching', 'commute_clustering', 'reliability_scoring_v2', 'fair_matching');

-- Disable cross-community features
UPDATE feature_flags SET is_enabled = false WHERE flag_name = 'cross_community_visibility';
```

### Rollback Level 2: Frontend (2 minutes)

```bash
# Via Netlify Dashboard:
# 1. Go to Deploys
# 2. Click previous successful deploy
# 3. Click "Publish deploy"

# Or via CLI:
netlify rollback
```

### Rollback Level 3: Backend Jobs (Instant)

```sql
-- Pause background jobs (if using pg_cron)
-- SELECT cron.unschedule('expire-rides');
-- SELECT cron.unschedule('reconcile-seats');
-- SELECT cron.unschedule('check-invariants');

-- Or disable via feature flag
UPDATE feature_flags SET is_enabled = false WHERE flag_name = 'background_jobs_enabled';
```

### Rollback Level 4: Database (CAREFUL)

**⚠️ Only if absolutely necessary - consult team first**

```sql
-- Our migrations are additive, so rollback means:
-- 1. Disable new features via flags (above)
-- 2. Data remains safe
-- 3. Schema changes are backward-compatible
```

**DO NOT** run destructive rollback unless data integrity is at risk.

---

## Soft Launch Strategy

### Day 0: Internal Only

- Deploy to production
- Only internal/trusted users access
- Monitor all metrics
- Fix any issues found

### Day 1-2: Single Community Pilot

- Enable for one community only
- Full monitoring
- Gather feedback
- Adjust weights if needed

### Day 3-5: Gradual Expansion

- Add communities one at a time
- Each community gets 24h observation
- Continue monitoring

### Day 5+: General Availability

- All communities enabled
- Smart matching weights tuned
- Fairness metrics verified
- Full production mode

---

## Emergency Contacts

| Role | Contact | When to Escalate |
|------|---------|------------------|
| Release Manager | [Name] | Any blocker |
| Platform Admin | [Name] | Admin access issues |
| Database Admin | [Name] | Migration failures, data issues |
| On-Call Engineer | [Name] | Production incidents |

---

## Sign-Off

| Phase | Verified By | Date | Signature |
|-------|-------------|------|-----------|
| Pre-Flight Complete | | | |
| Database Deployed | | | |
| Backend Deployed | | | |
| Frontend Deployed | | | |
| Smoke Tests Passed | | | |
| Monitoring Active | | | |

---

**Deployment Status**: ☐ NOT STARTED | ☐ IN PROGRESS | ☐ COMPLETE | ☐ ROLLED BACK

---

*Last Updated: January 11, 2026*
