# Production Migration Checklist

This document provides SQL queries to verify that all required database objects exist before deploying to production.

## Quick Verification Commands

Run these in your Supabase SQL Editor to check schema status.

### 1. Check Required Tables

```sql
-- Verify all required tables exist
SELECT
  tablename,
  CASE WHEN tablename IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles',
    'rides',
    'ride_bookings',
    'vehicles',
    'chat_conversations',
    'chat_messages',
    'notifications',
    'user_preferences'
  )
ORDER BY tablename;

-- Alternative using to_regclass (returns NULL if missing)
SELECT
  'profiles' as table_name, to_regclass('public.profiles') IS NOT NULL as exists
UNION ALL SELECT 'rides', to_regclass('public.rides') IS NOT NULL
UNION ALL SELECT 'ride_bookings', to_regclass('public.ride_bookings') IS NOT NULL
UNION ALL SELECT 'vehicles', to_regclass('public.vehicles') IS NOT NULL
UNION ALL SELECT 'chat_conversations', to_regclass('public.chat_conversations') IS NOT NULL
UNION ALL SELECT 'chat_messages', to_regclass('public.chat_messages') IS NOT NULL
UNION ALL SELECT 'notifications', to_regclass('public.notifications') IS NOT NULL
UNION ALL SELECT 'user_preferences', to_regclass('public.user_preferences') IS NOT NULL;
```

### 2. Check Required Views

```sql
-- Check profile_public_v view exists
SELECT
  'profile_public_v' as view_name,
  to_regclass('public.profile_public_v') IS NOT NULL as exists;

-- List all views in public schema
SELECT table_name as view_name
FROM information_schema.views
WHERE table_schema = 'public';
```

### 3. Check Required Functions (RPCs)

```sql
-- Check required functions exist
SELECT
  routine_name,
  routine_type,
  'EXISTS' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_conversations_overview',
    'sync_expired_ride_state',
    'delete_ride_for_driver'
  );

-- Detailed function check with parameters
SELECT
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as returns,
  CASE WHEN p.proname IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_conversations_overview',
    'sync_expired_ride_state',
    'delete_ride_for_driver'
  );
```

### 4. Check Optional Objects

```sql
-- Check optional recurring_ride_patterns table
SELECT
  'recurring_ride_patterns' as table_name,
  to_regclass('public.recurring_ride_patterns') IS NOT NULL as exists,
  'OPTIONAL' as requirement;
```

## Full Health Check Query

Run this single query to check all required objects at once:

```sql
WITH required_checks AS (
  -- Tables
  SELECT 'table' as object_type, 'profiles' as object_name, 'REQUIRED' as requirement
  UNION ALL SELECT 'table', 'rides', 'REQUIRED'
  UNION ALL SELECT 'table', 'ride_bookings', 'REQUIRED'
  UNION ALL SELECT 'table', 'vehicles', 'REQUIRED'
  UNION ALL SELECT 'table', 'chat_conversations', 'REQUIRED'
  UNION ALL SELECT 'table', 'chat_messages', 'REQUIRED'
  UNION ALL SELECT 'table', 'notifications', 'REQUIRED'
  UNION ALL SELECT 'table', 'user_preferences', 'REQUIRED'
  UNION ALL SELECT 'table', 'recurring_ride_patterns', 'OPTIONAL'
  -- Views
  UNION ALL SELECT 'view', 'profile_public_v', 'REQUIRED'
  -- Functions
  UNION ALL SELECT 'function', 'get_conversations_overview', 'REQUIRED'
  UNION ALL SELECT 'function', 'sync_expired_ride_state', 'REQUIRED'
  UNION ALL SELECT 'function', 'delete_ride_for_driver', 'REQUIRED'
)
SELECT
  rc.object_type,
  rc.object_name,
  rc.requirement,
  CASE
    WHEN rc.object_type = 'table' AND to_regclass('public.' || rc.object_name) IS NOT NULL THEN 'EXISTS'
    WHEN rc.object_type = 'view' AND to_regclass('public.' || rc.object_name) IS NOT NULL THEN 'EXISTS'
    WHEN rc.object_type = 'function' AND EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = rc.object_name
    ) THEN 'EXISTS'
    ELSE 'MISSING'
  END as status
FROM required_checks rc
ORDER BY
  CASE rc.object_type WHEN 'table' THEN 1 WHEN 'view' THEN 2 WHEN 'function' THEN 3 END,
  rc.object_name;
```

## Common Issues and Fixes

### PGRST202 - Function Not Found

**Symptom**: Error code `PGRST202` with message "Could not find the function in the schema cache"

**Cause**: The function exists in the database but PostgREST hasn't loaded it into its cache.

**Fix**:
1. Go to Supabase Dashboard
2. Navigate to Settings -> API
3. Click "Reload schema cache"
4. Wait 30 seconds and retry

### PGRST204 - Table/View Not Found

**Symptom**: Error code `PGRST204` with message "Could not find relation"

**Cause**: The table or view doesn't exist in the database.

**Fix**:
1. Check if migrations have been applied: `supabase migration list`
2. Apply pending migrations: `supabase db push`
3. If using dashboard, run the migration SQL manually

### Missing profile_public_v View

**Symptom**: Public profile fetches fail with schema errors

**Fix**: Create the view with this SQL:

```sql
CREATE OR REPLACE VIEW public.profile_public_v AS
SELECT
  id,
  full_name,
  avatar_url,
  profile_photo_url,
  created_at,
  country,
  city,
  bio,
  trust_score,
  average_rating,
  reliability_score,
  total_rides_offered,
  total_rides_taken,
  profile_verified
FROM public.profiles
WHERE is_active = true OR is_active IS NULL;

-- Grant select to authenticated and anon roles
GRANT SELECT ON public.profile_public_v TO authenticated;
GRANT SELECT ON public.profile_public_v TO anon;
```

### Missing get_conversations_overview Function

**Symptom**: Messaging page shows "Messages are updating" error

**Fix**: Check supabase/migrations for the messaging functions migration and apply it.

## Pre-Deployment Checklist

Before deploying to production, verify:

- [ ] All required tables exist (run table check query)
- [ ] `profile_public_v` view exists
- [ ] `get_conversations_overview` function exists
- [ ] `sync_expired_ride_state` function exists
- [ ] `delete_ride_for_driver` function exists
- [ ] Schema cache has been reloaded after any migrations
- [ ] RLS policies are correctly configured
- [ ] Storage buckets exist (profile-images, vehicle-images, etc.)

## Automated Health Check

The app includes an automated schema health check in `src/lib/schemaHealthCheck.ts`.

In development mode, run:

```typescript
import { runSchemaHealthCheck, logSchemaHealth } from './lib/schemaHealthCheck';

const report = await runSchemaHealthCheck();
logSchemaHealth(report);

if (!report.healthy) {
  console.error('Schema issues detected:', report.missingItems);
}
```

## Contact

If migrations are missing or schema issues persist after following this guide:
1. Check the migration files in `supabase/migrations/`
2. Review the Supabase project logs for errors
3. Escalate to the platform team if database changes are needed
