# Netlify Environment Setup Guide

## Overview

This application uses environment-based deployments to separate staging and production environments safely.

| Context | Branch | Environment | Banner | Supabase Database |
|---------|--------|-------------|--------|-------------------|
| Production | `main` | production | None | PRODUCTION |
| Deploy Preview | Any PR | staging | Amber "STAGING" | STAGING |
| Branch Deploy | Any branch | staging | Amber "STAGING" | STAGING |

---

## Step 1: Create Staging Supabase Project

### 1.1 Create New Project
1. Go to https://supabase.com/dashboard
2. Click **"New Project"**
3. Name: `carpool-network-staging`
4. Select **same region** as production
5. Generate strong database password
6. Save credentials securely
7. Wait for provisioning (2-3 minutes)

### 1.2 Apply All Migrations to Staging

You have two options:

#### Option A: Using Supabase Dashboard (Recommended)
1. Go to your staging project dashboard
2. Navigate to **SQL Editor**
3. Apply each migration file in order from `/supabase/migrations/`:
   - `20251018185942_create_core_schema.sql`
   - `20251018205840_add_vehicle_details.sql`
   - `20251020143600_add_vehicle_image_and_engine_fields.sql`
   - `20251020144500_add_mot_tax_fields.sql`
   - `20251020171021_create_vehicle_images_bucket.sql`
   - `20251115164524_fix_security_performance_issues_v2.sql`
   - `20251115180139_add_license_verification_system.sql`
   - `20251115180215_add_payment_system.sql`
   - `20251115180448_remove_insurance_and_payment_systems.sql`
   - `20251115212318_fix_vehicle_visibility_for_rides.sql`
   - `20251115214336_add_cancellation_tracking_system.sql`
   - `20251116192922_fix_vehicles_rls_for_bookings.sql`
   - `20251116192939_fix_rides_rls_for_bookings.sql`
   - `20251116193833_fix_infinite_recursion_in_rls_policies.sql`
   - `20251116215639_add_whatsapp_to_profiles.sql`
   - `20251116221024_create_ai_chat_history_table.sql`
   - `20251117012004_add_auto_profile_creation_trigger.sql`
   - `20251214193708_add_atomic_booking_rpc.sql`
   - `20251214200429_fix_booking_status_and_unique_constraint.sql`
   - `20251214200908_add_atomic_booking_operations.sql`
   - `20251214202053_enable_realtime_and_notification_triggers.sql`

#### Option B: Using Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to staging project
supabase link --project-ref <your-staging-project-ref>

# Push all migrations
supabase db push
```

### 1.3 Deploy Edge Functions to Staging

Deploy both edge functions to your staging project:

1. **gemini-proxy** - For AI chatbot functionality
2. **vehicle-lookup** - For DVLA vehicle data

You can use the Supabase dashboard or deploy via CLI.

### 1.4 Get Staging Credentials

1. In Supabase staging dashboard, go to **Settings** > **API**
2. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

---

## Step 2: Configure Netlify Environment Variables

### 2.1 Access Netlify Settings
1. Go to https://app.netlify.com
2. Select your site
3. Navigate to **Site configuration** > **Environment variables**

### 2.2 Add Production Variables

Add these variables with scope: **Production only**

| Variable Name | Value | Scope |
|---------------|-------|-------|
| `VITE_SUPABASE_URL` | `https://uqofmsreosfjflmgurzb.supabase.co` | Production |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Production |
| `VITE_GOOGLE_MAPS_API_KEY` | `AIzaSyDiqv8H6yGfUM5itzjpL1pU19I_veBIwHE` | Production |

**Steps:**
1. Click **Add a variable**
2. Key: `VITE_SUPABASE_URL`
3. Value: Production URL
4. Scopes: **Check "Production" only**
5. Click **Create variable**
6. Repeat for each variable

### 2.3 Add Staging Variables

Add these variables with scope: **Deploy previews** and **Branch deploys**

| Variable Name | Value | Scope |
|---------------|-------|-------|
| `VITE_SUPABASE_URL` | `https://[your-staging-ref].supabase.co` | Deploy Previews, Branch Deploys |
| `VITE_SUPABASE_ANON_KEY` | `[your-staging-anon-key]` | Deploy Previews, Branch Deploys |
| `VITE_GOOGLE_MAPS_API_KEY` | `AIzaSyDiqv8H6yGfUM5itzjpL1pU19I_veBIwHE` | Deploy Previews, Branch Deploys |

**Steps:**
1. Click **Add a variable**
2. Key: `VITE_SUPABASE_URL`
3. Value: Staging URL
4. Scopes: **Check "Deploy previews" and "Branch deploys"**
5. Click **Create variable**
6. Repeat for each variable

### 2.4 Verify Configuration

Your final setup should look like this in Netlify:

```
VITE_SUPABASE_URL
  Production: https://uqofmsreosfjflmgurzb.supabase.co
  Deploy Previews: https://[staging-ref].supabase.co
  Branch Deploys: https://[staging-ref].supabase.co

VITE_SUPABASE_ANON_KEY
  Production: eyJ... (production key)
  Deploy Previews: eyJ... (staging key)
  Branch Deploys: eyJ... (staging key)

VITE_GOOGLE_MAPS_API_KEY
  All contexts: AIzaSyDiqv8H6yGfUM5itzjpL1pU19I_veBIwHE
```

---

## Step 3: Test the Setup

### 3.1 Test Staging Deploy
1. Create a new branch: `git checkout -b test-env-setup`
2. Make a small change (e.g., add comment)
3. Push: `git push origin test-env-setup`
4. Create PR on GitHub
5. Netlify will create deploy preview
6. Check the preview URL:
   - ✅ Should see amber "STAGING" banner at top
   - ✅ Can sign up with test account
   - ✅ Data should go to staging database

### 3.2 Test Production Deploy
1. Merge PR to `main`
2. Netlify deploys to production
3. Check production URL:
   - ✅ Should see NO environment banner
   - ✅ Authentication works
   - ✅ Data goes to production database

---

## Step 4: Verify Database Separation

### 4.1 Check Staging Database
1. Go to staging Supabase dashboard
2. Open **Table Editor**
3. Look at `profiles` table
4. Should see only test accounts

### 4.2 Check Production Database
1. Go to production Supabase dashboard
2. Open **Table Editor**
3. Look at `profiles` table
4. Should see only real users (no test accounts)

---

## Troubleshooting

### Banner Not Showing in Staging
- Check Netlify build logs for `VITE_APP_ENV` value
- Verify `netlify.toml` has context configurations
- Clear Netlify cache and redeploy

### Wrong Database Connected
- Check Netlify environment variable scopes
- Ensure preview/branch deploys use staging credentials
- Verify production uses production credentials

### Build Failures
- Check all environment variables are set
- Verify variable names match exactly (case-sensitive)
- Check for typos in Supabase URLs/keys

### Edge Functions Not Working
- Ensure edge functions deployed to both environments
- Check CORS configuration in functions
- Verify function URLs match environment

---

## Security Checklist

- [ ] Staging and production use different Supabase projects
- [ ] Staging credentials NOT used in production
- [ ] Production credentials NOT used in staging/preview
- [ ] Environment variables scoped correctly in Netlify
- [ ] No secrets committed to repository
- [ ] `.env` file in `.gitignore`

---

## Quick Reference

### Current Production Setup
- **Supabase Project**: uqofmsreosfjflmgurzb
- **Project URL**: https://uqofmsreosfjflmgurzb.supabase.co
- **Edge Functions**: vehicle-lookup, gemini-proxy (both ACTIVE)
- **All 20 migrations**: ✅ Applied

### Environment Variables Reference

**Local Development** (`.env`):
```bash
VITE_SUPABASE_URL=https://uqofmsreosfjflmgurzb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_GOOGLE_MAPS_API_KEY=AIzaSy...
VITE_APP_ENV=development
```

**Production** (Netlify):
```bash
VITE_SUPABASE_URL=[production-url]
VITE_SUPABASE_ANON_KEY=[production-key]
VITE_GOOGLE_MAPS_API_KEY=[maps-key]
# VITE_APP_ENV=production (set automatically by netlify.toml)
```

**Staging** (Netlify Preview/Branch):
```bash
VITE_SUPABASE_URL=[staging-url]
VITE_SUPABASE_ANON_KEY=[staging-key]
VITE_GOOGLE_MAPS_API_KEY=[maps-key]
# VITE_APP_ENV=staging (set automatically by netlify.toml)
```
