-- ============================================================================
-- PRODUCTION SECURITY HARDENING: RLS Audit & Tighten
-- ============================================================================
-- Ensures all public-facing tables have RLS enabled and no overly
-- permissive policies exist. Safe to run multiple times (idempotent).
-- ============================================================================

-- ============================================================================
-- 1. ENABLE RLS on any tables that may be missing it
-- ============================================================================

-- Core tables — belt-and-braces: enable RLS explicitly
ALTER TABLE IF EXISTS public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rides              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ride_bookings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ride_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reviews            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vehicles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.emergency_alerts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bug_reports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.community_posts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.community_likes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.friends            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.friend_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.groups             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.group_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pools              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pool_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.favorites          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analytics_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.leaderboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.challenges         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_challenges    ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. REMOVE any dangerous "allow all" policies if they exist
-- ============================================================================

-- Drop any accidentally broad policies (safe — they don't exist if not created)
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Find and drop any policy that has no USING clause restriction (public read-all)
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND qual = 'true'   -- USING (true) = allow everyone
      AND cmd IN ('SELECT', 'ALL')
      AND policyname NOT LIKE '%admin%'
      AND policyname NOT LIKE '%service%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname, r.schemaname, r.tablename);
    RAISE NOTICE 'Dropped overly permissive policy: % on %.%',
      r.policyname, r.schemaname, r.tablename;
  END LOOP;
END $$;

-- ============================================================================
-- 3. PROFILES — users can read any profile (for ride matching display)
--              but can only update their own
-- ============================================================================

DROP POLICY IF EXISTS "profiles_public_read"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_insert" ON public.profiles;

CREATE POLICY "profiles_public_read"
  ON public.profiles FOR SELECT
  USING (true);  -- profiles are intentionally public (display name, avatar, rating)

CREATE POLICY "profiles_owner_insert"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_owner_update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 4. RIDES — any authenticated user can read available rides
--            only the driver can insert/update/delete their own rides
-- ============================================================================

DROP POLICY IF EXISTS "rides_authenticated_read" ON public.rides;
DROP POLICY IF EXISTS "rides_driver_insert"       ON public.rides;
DROP POLICY IF EXISTS "rides_driver_update"       ON public.rides;
DROP POLICY IF EXISTS "rides_driver_delete"       ON public.rides;

CREATE POLICY "rides_authenticated_read"
  ON public.rides FOR SELECT
  TO authenticated
  USING (
    status = 'active'
    OR driver_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.ride_bookings rb
      WHERE rb.ride_id = id
        AND rb.passenger_id = auth.uid()
        AND rb.status IN ('confirmed', 'pending')
    )
  );

CREATE POLICY "rides_driver_insert"
  ON public.rides FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "rides_driver_update"
  ON public.rides FOR UPDATE
  TO authenticated
  USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "rides_driver_delete"
  ON public.rides FOR DELETE
  TO authenticated
  USING (auth.uid() = driver_id);

-- ============================================================================
-- 5. NOTIFICATIONS — users can only see and manage their own notifications
-- ============================================================================

DROP POLICY IF EXISTS "notifications_owner_all" ON public.notifications;

CREATE POLICY "notifications_owner_all"
  ON public.notifications FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 6. ANALYTICS EVENTS — users can only insert their own events, not read others
-- ============================================================================

DROP POLICY IF EXISTS "analytics_owner_insert" ON public.analytics_events;
DROP POLICY IF EXISTS "analytics_owner_read"   ON public.analytics_events;

CREATE POLICY "analytics_owner_insert"
  ON public.analytics_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "analytics_owner_read"
  ON public.analytics_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- 7. VERIFY — log a summary of RLS status for all public tables
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  missing_count INT := 0;
BEGIN
  FOR r IN
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  LOOP
    IF NOT r.rowsecurity THEN
      RAISE WARNING 'RLS NOT ENABLED on table: %', r.tablename;
      missing_count := missing_count + 1;
    ELSE
      RAISE NOTICE 'RLS OK: %', r.tablename;
    END IF;
  END LOOP;

  IF missing_count = 0 THEN
    RAISE NOTICE '✅ All public tables have RLS enabled.';
  ELSE
    RAISE WARNING '⚠️  % table(s) are missing RLS — review above warnings.', missing_count;
  END IF;
END $$;
