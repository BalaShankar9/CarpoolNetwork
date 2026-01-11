# Production Launch Checklist

> **Phase E Documentation**: Day-1 Guarantee - Nothing Ships Without All Boxes Checked

---

## Instructions

- Every item must be **YES** before launch
- **NO** items block launch until resolved
- **N/A** is only acceptable where explicitly noted
- Sign-off required from designated reviewer

---

## 1. Environment & Configuration

| # | Check | Status | Verified By | Date |
|---|-------|--------|-------------|------|
| 1.1 | Production Supabase project is separate from staging | ☐ YES ☐ NO | | |
| 1.2 | `.env` file is in `.gitignore` | ☐ YES ☐ NO | | |
| 1.3 | No secrets in git history | ☐ YES ☐ NO | | |
| 1.4 | Service role key is NOT in any `VITE_` variable | ☐ YES ☐ NO | | |
| 1.5 | `VITE_APP_ENV=production` in Netlify production context | ☐ YES ☐ NO | | |
| 1.6 | Staging deploys use staging Supabase (not production) | ☐ YES ☐ NO | | |
| 1.7 | Google Maps API key has HTTP referrer restrictions | ☐ YES ☐ NO | | |
| 1.8 | All required environment variables documented | ☐ YES ☐ NO | | |

---

## 2. Database & Migrations

| # | Check | Status | Verified By | Date |
|---|-------|--------|-------------|------|
| 2.1 | All migrations applied to production | ☐ YES ☐ NO | | |
| 2.2 | RLS enabled on all tables | ☐ YES ☐ NO | | |
| 2.3 | No demo data in production database | ☐ YES ☐ NO | | |
| 2.4 | `check_system_invariants()` returns healthy | ☐ YES ☐ NO | | |
| 2.5 | Database backup configured | ☐ YES ☐ NO | | |
| 2.6 | Point-in-time recovery enabled | ☐ YES ☐ NO ☐ N/A | | |

**Verification Query**:
```sql
SELECT check_system_invariants();
-- Must return: {"healthy": true, "total_violations": 0}
```

---

## 3. Background Jobs

| # | Check | Status | Verified By | Date |
|---|-------|--------|-------------|------|
| 3.1 | `expire_rides()` scheduled (every 5 min) | ☐ YES ☐ NO | | |
| 3.2 | `reconcile_seat_counts()` scheduled (daily) | ☐ YES ☐ NO | | |
| 3.3 | `check_system_invariants()` scheduled (every 15 min) | ☐ YES ☐ NO | | |
| 3.4 | Jobs have run successfully at least once | ☐ YES ☐ NO | | |
| 3.5 | Job failure alerting configured | ☐ YES ☐ NO ☐ N/A | | |

**Verification Query**:
```sql
SELECT job_name, status, started_at 
FROM system_job_log 
WHERE started_at > now() - interval '1 hour'
ORDER BY started_at DESC;
```

---

## 4. Monitoring & Observability

| # | Check | Status | Verified By | Date |
|---|-------|--------|-------------|------|
| 4.1 | `get_system_health_summary()` accessible | ☐ YES ☐ NO | | |
| 4.2 | Admin dashboard shows system health | ☐ YES ☐ NO | | |
| 4.3 | Invariant violations logged to `invariant_violations` | ☐ YES ☐ NO | | |
| 4.4 | Admin audit log capturing actions | ☐ YES ☐ NO | | |
| 4.5 | Error tracking configured (if applicable) | ☐ YES ☐ NO ☐ N/A | | |

---

## 5. Admin Access

| # | Check | Status | Verified By | Date |
|---|-------|--------|-------------|------|
| 5.1 | At least one super_admin account exists | ☐ YES ☐ NO | | |
| 5.2 | Admin can access `/admin` dashboard | ☐ YES ☐ NO | | |
| 5.3 | Admin can view/manage users | ☐ YES ☐ NO | | |
| 5.4 | Admin can view/manage rides | ☐ YES ☐ NO | | |
| 5.5 | Admin can view/manage bookings | ☐ YES ☐ NO | | |
| 5.6 | Admin can run manual health checks | ☐ YES ☐ NO | | |

---

## 6. User Flows (Smoke Test)

| # | Check | Status | Verified By | Date |
|---|-------|--------|-------------|------|
| 6.1 | New user can sign up | ☐ YES ☐ NO | | |
| 6.2 | Email verification works | ☐ YES ☐ NO | | |
| 6.3 | User can complete profile | ☐ YES ☐ NO | | |
| 6.4 | Driver can add vehicle | ☐ YES ☐ NO | | |
| 6.5 | Driver can post ride | ☐ YES ☐ NO | | |
| 6.6 | Passenger can search rides | ☐ YES ☐ NO | | |
| 6.7 | Passenger can book ride | ☐ YES ☐ NO | | |
| 6.8 | Driver can confirm booking | ☐ YES ☐ NO | | |
| 6.9 | Both parties receive notifications | ☐ YES ☐ NO | | |
| 6.10 | User can cancel booking | ☐ YES ☐ NO | | |

---

## 7. Data Isolation

| # | Check | Status | Verified By | Date |
|---|-------|--------|-------------|------|
| 7.1 | No `is_demo = true` records in production | ☐ YES ☐ NO | | |
| 7.2 | No test email addresses in production profiles | ☐ YES ☐ NO | | |
| 7.3 | Seed scripts cannot run against production | ☐ YES ☐ NO | | |

**Verification Query**:
```sql
SELECT 
  (SELECT COUNT(*) FROM profiles WHERE is_demo = true) AS demo_profiles,
  (SELECT COUNT(*) FROM profiles WHERE email LIKE '%@carpoolnetwork.test') AS test_emails;
-- Both must be 0
```

---

## 8. Security

| # | Check | Status | Verified By | Date |
|---|-------|--------|-------------|------|
| 8.1 | HTTPS enforced (Netlify default) | ☐ YES ☐ NO | | |
| 8.2 | Security headers configured in `netlify.toml` | ☐ YES ☐ NO | | |
| 8.3 | Supabase RLS policies tested | ☐ YES ☐ NO | | |
| 8.4 | Password requirements enforced | ☐ YES ☐ NO | | |
| 8.5 | Rate limiting on auth endpoints (Supabase default) | ☐ YES ☐ NO | | |

---

## 9. Rollback Readiness

| # | Check | Status | Verified By | Date |
|---|-------|--------|-------------|------|
| 9.1 | Know how to rollback Netlify deployment | ☐ YES ☐ NO | | |
| 9.2 | Know how to disable feature flags | ☐ YES ☐ NO | | |
| 9.3 | Know how to pause background jobs | ☐ YES ☐ NO | | |
| 9.4 | Incident response doc reviewed | ☐ YES ☐ NO | | |
| 9.5 | Emergency contacts documented | ☐ YES ☐ NO | | |

---

## 10. Documentation

| # | Check | Status | Verified By | Date |
|---|-------|--------|-------------|------|
| 10.1 | `docs/ENVIRONMENT.md` complete | ☐ YES ☐ NO | | |
| 10.2 | `docs/OPERATIONS.md` complete | ☐ YES ☐ NO | | |
| 10.3 | `docs/INCIDENT_RESPONSE.md` complete | ☐ YES ☐ NO | | |
| 10.4 | `docs/FAILURE_MODES.md` complete | ☐ YES ☐ NO | | |
| 10.5 | `docs/SEEDING.md` complete | ☐ YES ☐ NO | | |
| 10.6 | Known limitations documented | ☐ YES ☐ NO | | |

---

## 11. Known Limitations (Document Before Launch)

List any known issues or limitations users should be aware of:

| Issue | Workaround | Timeline to Fix |
|-------|------------|-----------------|
| | | |
| | | |
| | | |

---

## 12. Final Sign-Off

### Pre-Launch Verification

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Engineering Lead | | | |
| Product Owner | | | |
| QA Lead | | | |

### Launch Authorization

> I confirm that all checklist items are complete (YES) or explicitly accepted (N/A), 
> and the system is ready for production users.

| Authorizer | Name | Signature | Date |
|------------|------|-----------|------|
| Launch Owner | | | |

---

## Post-Launch Verification (First 24 Hours)

| # | Check | Status | Verified By | Date |
|---|-------|--------|-------------|------|
| P.1 | First real user signed up successfully | ☐ YES ☐ NO | | |
| P.2 | Background jobs running without errors | ☐ YES ☐ NO | | |
| P.3 | No critical invariant violations | ☐ YES ☐ NO | | |
| P.4 | No user-reported critical issues | ☐ YES ☐ NO | | |
| P.5 | System health summary shows healthy | ☐ YES ☐ NO | | |

---

## Quick Commands Reference

```sql
-- Check system health
SELECT get_system_health_summary();

-- Verify no violations
SELECT check_system_invariants();

-- Verify no demo data
SELECT COUNT(*) FROM profiles WHERE is_demo = true;

-- Check recent job runs
SELECT * FROM system_job_log ORDER BY started_at DESC LIMIT 5;

-- Verify admin exists
SELECT email, admin_role FROM profiles WHERE admin_role = 'super_admin';
```

---

*Checklist Version: Phase E - January 2026*
