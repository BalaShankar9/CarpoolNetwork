/*
  # Fix admin ops schema gaps and analytics permissions

  1. Profiles
    - Add missing status/verification columns used by admin tooling.
  2. Bulk operations
    - Align RLS policies to is_admin() instead of email domain.
  3. Analytics
    - Grant authenticated access to analytics views/functions when present.
*/

-- Add missing profile columns used by admin bulk operations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN status text DEFAULT 'active';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'verification_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN verification_status text DEFAULT 'unverified';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'verified_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN verified_at timestamptz;
  END IF;
END $$;

UPDATE profiles SET status = 'active' WHERE status IS NULL;
UPDATE profiles SET verification_status = 'unverified' WHERE verification_status IS NULL;

-- Align bulk operations policies with is_admin()
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bulk_operations'
  ) AND EXISTS (
    SELECT 1 FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace AND proname = 'is_admin'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage bulk operations" ON public.bulk_operations';
    EXECUTE 'CREATE POLICY "Admins can manage bulk operations" ON public.bulk_operations FOR ALL TO authenticated USING ((select is_admin()) = true)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bulk_operation_items'
  ) AND EXISTS (
    SELECT 1 FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace AND proname = 'is_admin'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can view bulk operation items" ON public.bulk_operation_items';
    EXECUTE 'CREATE POLICY "Admins can view bulk operation items" ON public.bulk_operation_items FOR ALL TO authenticated USING ((select is_admin()) = true)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'scheduled_operations'
  ) AND EXISTS (
    SELECT 1 FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace AND proname = 'is_admin'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage scheduled operations" ON public.scheduled_operations';
    EXECUTE 'CREATE POLICY "Admins can manage scheduled operations" ON public.scheduled_operations FOR ALL TO authenticated USING ((select is_admin()) = true)';
  END IF;
END $$;

-- Grant analytics views to authenticated users when present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'daily_metrics'
  ) THEN
    EXECUTE 'GRANT SELECT ON public.daily_metrics TO authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'ride_completion_stats'
  ) THEN
    EXECUTE 'GRANT SELECT ON public.ride_completion_stats TO authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'booking_success_metrics'
  ) THEN
    EXECUTE 'GRANT SELECT ON public.booking_success_metrics TO authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'popular_routes'
  ) THEN
    EXECUTE 'GRANT SELECT ON public.popular_routes TO authenticated';
  END IF;
END $$;

-- Grant analytics functions to authenticated users when present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace AND proname = 'get_user_growth'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_user_growth(integer) TO authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace AND proname = 'get_peak_times'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_peak_times() TO authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace AND proname = 'get_booking_funnel'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_booking_funnel(integer) TO authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace AND proname = 'get_geographic_distribution'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_geographic_distribution() TO authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace AND proname = 'get_period_comparison'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_period_comparison(date, date, date, date) TO authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace AND proname = 'get_retention_metrics'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_retention_metrics(date, date) TO authenticated';
  END IF;
END $$;
