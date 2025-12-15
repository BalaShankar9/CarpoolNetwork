# Release Checklist

## Environment Overview

| Environment | Branch | Supabase Project | Banner |
|-------------|--------|------------------|--------|
| Development | Local | STAGING | Orange "DEVELOPMENT" |
| Staging | Any PR/branch | STAGING | Amber "STAGING" |
| Production | main | PRODUCTION | None |

---

## Pre-Release Checklist

### 1. Code Quality
- [ ] All TypeScript errors resolved (`npm run typecheck`)
- [ ] Build succeeds without warnings (`npm run build`)
- [ ] No console.log statements in production code
- [ ] No hardcoded API keys or secrets

### 2. Testing in Staging
- [ ] Feature works correctly in staging environment
- [ ] Real-time updates function properly
- [ ] Authentication flows work (sign up, sign in, sign out)
- [ ] All critical user flows tested:
  - [ ] Post a ride
  - [ ] Search and book a ride
  - [ ] Driver accepts/declines booking
  - [ ] Send and receive messages
  - [ ] Profile updates save correctly

### 3. Database Migrations
- [ ] All new migrations applied to staging first
- [ ] Migration tested thoroughly in staging
- [ ] Migration SQL reviewed for data safety
- [ ] RLS policies verified and tested
- [ ] No destructive operations (DROP, DELETE) without backup

### 4. Performance
- [ ] Bundle size acceptable (< 500KB gzipped)
- [ ] No obvious performance regressions
- [ ] Images optimized
- [ ] API calls minimized

---

## Deployment Steps

### Deploy to Staging (Automatic)
1. Push to any branch or create PR
2. Netlify creates deploy preview automatically
3. Preview uses STAGING Supabase database
4. Amber "STAGING" banner visible

### Deploy to Production
1. Complete all checklist items above
2. Merge PR to `main` branch
3. Netlify deploys to production automatically
4. Production uses PRODUCTION Supabase database
5. No environment banner visible

---

## Post-Release Verification

### Immediate Checks (within 5 minutes)
- [ ] Production site loads correctly
- [ ] No environment banner showing
- [ ] User can sign in
- [ ] Real-time features working

### Extended Checks (within 1 hour)
- [ ] Monitor error tracking for new errors
- [ ] Verify critical user flows work
- [ ] Check database for any anomalies
- [ ] Review Supabase dashboard for errors

---

## Rollback Procedure

### If Issues Found:
1. **Don't panic** - most issues can be fixed forward
2. Revert the PR on GitHub
3. Netlify will automatically redeploy previous version
4. If database migration caused issue:
   - Create new migration to reverse changes
   - Never manually edit production database

### Rollback Contacts:
- Primary: [Add contact]
- Secondary: [Add contact]

---

## Environment Variables

### Required for Production (set in Netlify UI):
```
VITE_SUPABASE_URL=[production-url]
VITE_SUPABASE_ANON_KEY=[production-anon-key]
VITE_GOOGLE_MAPS_API_KEY=[maps-api-key]
```

### Required for Staging (set in Netlify UI):
```
VITE_SUPABASE_URL=[staging-url]
VITE_SUPABASE_ANON_KEY=[staging-anon-key]
VITE_GOOGLE_MAPS_API_KEY=[maps-api-key]
```

### Automatically Set by netlify.toml:
```
VITE_APP_ENV=production (for main branch)
VITE_APP_ENV=staging (for preview/branch deploys)
```

---

## Setting Up Staging Supabase Project

### Step 1: Create New Supabase Project
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Name it: `carpool-network-staging`
4. Select same region as production
5. Generate a strong database password
6. Wait for project to provision

### Step 2: Apply Migrations
Run all migrations from `/supabase/migrations/` in order:
1. `20251018185942_create_core_schema.sql`
2. `20251018205840_add_vehicle_details.sql`
3. ... (all subsequent migrations)

### Step 3: Configure Edge Functions
Deploy all edge functions to staging project using Supabase CLI or dashboard.

### Step 4: Set Netlify Environment Variables
1. Go to Netlify site settings > Environment Variables
2. Add staging variables with "Deploy Previews" scope:
   - `VITE_SUPABASE_URL` = staging project URL
   - `VITE_SUPABASE_ANON_KEY` = staging anon key

---

## Database Sync (Optional)

To sync production schema to staging:
1. Export production schema (not data): `pg_dump --schema-only`
2. Apply to staging database
3. Generate test data for staging

**Never sync production data to staging** - use anonymized/fake data.

---

## Emergency Contacts

| Role | Contact |
|------|---------|
| DevOps | [Add] |
| Backend | [Add] |
| Frontend | [Add] |
| Database | [Add] |
