-- ============================================================================
-- PHASE E: PRODUCTION LAUNCH READINESS - DEMO DATA SUPPORT
-- Date: 2026-01-11
-- Purpose: Add is_demo columns for safe demo data isolation
-- ============================================================================

-- ============================================================================
-- 1. Add is_demo columns to relevant tables
-- ============================================================================

-- Profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_profiles_is_demo ON profiles(is_demo) WHERE is_demo = true;

-- Vehicles
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_vehicles_is_demo ON vehicles(is_demo) WHERE is_demo = true;

-- Rides
ALTER TABLE rides ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_rides_is_demo ON rides(is_demo) WHERE is_demo = true;

-- Ride Bookings
ALTER TABLE ride_bookings ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_bookings_is_demo ON ride_bookings(is_demo) WHERE is_demo = true;

-- Reviews
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_reviews_is_demo ON reviews(is_demo) WHERE is_demo = true;

-- ============================================================================
-- 2. Production Guard Function
-- ============================================================================

-- Function to check if we're in production (blocks demo operations)
CREATE OR REPLACE FUNCTION is_production_environment()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- Check for production markers
  -- This can be set via Supabase project settings or custom config
  RETURN current_setting('app.environment', true) = 'production'
         OR current_database() LIKE '%prod%';
END;
$$;

-- ============================================================================
-- 3. Demo Data Cleanup Function (for staging/dev only)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_demo_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_reviews integer := 0;
  v_deleted_bookings integer := 0;
  v_deleted_rides integer := 0;
  v_deleted_vehicles integer := 0;
  v_deleted_profiles integer := 0;
BEGIN
  -- Guard: Never run in production
  IF is_production_environment() THEN
    RAISE EXCEPTION 'Cannot cleanup demo data in production environment';
  END IF;

  -- Delete in dependency order
  DELETE FROM reviews WHERE is_demo = true;
  GET DIAGNOSTICS v_deleted_reviews = ROW_COUNT;

  DELETE FROM ride_bookings WHERE is_demo = true;
  GET DIAGNOSTICS v_deleted_bookings = ROW_COUNT;

  DELETE FROM rides WHERE is_demo = true;
  GET DIAGNOSTICS v_deleted_rides = ROW_COUNT;

  DELETE FROM vehicles WHERE is_demo = true;
  GET DIAGNOSTICS v_deleted_vehicles = ROW_COUNT;

  -- Delete demo user notifications first
  DELETE FROM notifications WHERE user_id IN (SELECT id FROM profiles WHERE is_demo = true);

  DELETE FROM profiles WHERE is_demo = true;
  GET DIAGNOSTICS v_deleted_profiles = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'deleted', jsonb_build_object(
      'profiles', v_deleted_profiles,
      'vehicles', v_deleted_vehicles,
      'rides', v_deleted_rides,
      'bookings', v_deleted_bookings,
      'reviews', v_deleted_reviews
    )
  );
END;
$$;

COMMENT ON FUNCTION cleanup_demo_data() IS 
'Phase E: Removes all demo data (is_demo=true). Blocked in production.';

-- Only allow in non-production
REVOKE ALL ON FUNCTION cleanup_demo_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_demo_data() TO authenticated;

-- ============================================================================
-- 4. Demo Data Verification Query
-- ============================================================================

CREATE OR REPLACE FUNCTION verify_no_demo_data()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_demo_counts jsonb;
BEGIN
  SELECT jsonb_build_object(
    'profiles', (SELECT COUNT(*) FROM profiles WHERE is_demo = true),
    'vehicles', (SELECT COUNT(*) FROM vehicles WHERE is_demo = true),
    'rides', (SELECT COUNT(*) FROM rides WHERE is_demo = true),
    'bookings', (SELECT COUNT(*) FROM ride_bookings WHERE is_demo = true),
    'reviews', (SELECT COUNT(*) FROM reviews WHERE is_demo = true)
  ) INTO v_demo_counts;

  RETURN jsonb_build_object(
    'clean', (
      (v_demo_counts->>'profiles')::int = 0 AND
      (v_demo_counts->>'vehicles')::int = 0 AND
      (v_demo_counts->>'rides')::int = 0 AND
      (v_demo_counts->>'bookings')::int = 0 AND
      (v_demo_counts->>'reviews')::int = 0
    ),
    'counts', v_demo_counts
  );
END;
$$;

COMMENT ON FUNCTION verify_no_demo_data() IS 
'Phase E: Verifies no demo data exists. Run before production launch.';

GRANT EXECUTE ON FUNCTION verify_no_demo_data() TO authenticated;

-- ============================================================================
-- 5. Enhanced Health Check (add demo data check)
-- ============================================================================

-- Add demo data check to system health
CREATE OR REPLACE FUNCTION get_system_health_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security TO off
STABLE
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'timestamp', now(),
    'environment', COALESCE(current_setting('app.environment', true), 'unknown'),
    'total_rides', (SELECT COUNT(*) FROM rides WHERE is_demo = false OR is_demo IS NULL),
    'active_rides', (SELECT COUNT(*) FROM rides WHERE status = 'active' AND (is_demo = false OR is_demo IS NULL)),
    'in_progress_rides', (SELECT COUNT(*) FROM rides WHERE status = 'in-progress' AND (is_demo = false OR is_demo IS NULL)),
    'total_bookings', (SELECT COUNT(*) FROM ride_bookings WHERE is_demo = false OR is_demo IS NULL),
    'pending_bookings', (SELECT COUNT(*) FROM ride_bookings WHERE status = 'pending' AND (is_demo = false OR is_demo IS NULL)),
    'confirmed_bookings', (SELECT COUNT(*) FROM ride_bookings WHERE status = 'confirmed' AND (is_demo = false OR is_demo IS NULL)),
    'expired_active_rides', (
      SELECT COUNT(*)
      FROM rides
      WHERE (
        (available_until IS NOT NULL AND available_until < now())
        OR (available_until IS NULL AND departure_time < now())
      )
      AND status IN ('active', 'in-progress')
      AND (is_demo = false OR is_demo IS NULL)
    ),
    'seat_mismatches', (
      SELECT COUNT(*)
      FROM (
        SELECT r.id
        FROM rides r
        LEFT JOIN ride_bookings rb ON rb.ride_id = r.id AND (rb.is_demo = false OR rb.is_demo IS NULL)
        WHERE r.status IN ('active', 'in-progress')
        AND (r.is_demo = false OR r.is_demo IS NULL)
        GROUP BY r.id, r.available_seats, r.total_seats
        HAVING r.available_seats != (
          r.total_seats - COALESCE(SUM(
            CASE WHEN rb.status IN ('pending', 'confirmed') 
            THEN rb.seats_requested ELSE 0 END
          ), 0)
        )
      ) mismatches
    ),
    'demo_data_present', (
      SELECT EXISTS (SELECT 1 FROM profiles WHERE is_demo = true LIMIT 1)
    ),
    'recent_job_status', (
      SELECT jsonb_agg(jsonb_build_object(
        'job_name', job_name,
        'status', status,
        'completed_at', completed_at,
        'records_processed', records_processed
      ) ORDER BY started_at DESC)
      FROM (
        SELECT DISTINCT ON (job_name) *
        FROM system_job_log
        WHERE started_at > now() - interval '24 hours'
        ORDER BY job_name, started_at DESC
      ) recent_jobs
    ),
    'unresolved_violations', (
      SELECT COUNT(*) FROM invariant_violations WHERE resolved_at IS NULL
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- 6. Pre-Launch Verification Function
-- ============================================================================

CREATE OR REPLACE FUNCTION run_prelaunch_checks()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_health jsonb;
  v_invariants jsonb;
  v_demo_check jsonb;
  v_all_passed boolean := true;
  v_issues text[] := '{}';
BEGIN
  -- Run health summary
  SELECT get_system_health_summary() INTO v_health;
  
  -- Run invariant check
  SELECT check_system_invariants() INTO v_invariants;
  
  -- Run demo data check
  SELECT verify_no_demo_data() INTO v_demo_check;
  
  -- Check for issues
  IF (v_health->>'expired_active_rides')::int > 0 THEN
    v_all_passed := false;
    v_issues := array_append(v_issues, 'Expired active rides exist');
  END IF;
  
  IF (v_health->>'seat_mismatches')::int > 0 THEN
    v_all_passed := false;
    v_issues := array_append(v_issues, 'Seat count mismatches exist');
  END IF;
  
  IF (v_health->>'demo_data_present')::boolean THEN
    v_all_passed := false;
    v_issues := array_append(v_issues, 'Demo data present in database');
  END IF;
  
  IF NOT (v_invariants->>'healthy')::boolean THEN
    v_all_passed := false;
    v_issues := array_append(v_issues, 'System invariant violations detected');
  END IF;
  
  IF (v_health->>'unresolved_violations')::int > 0 THEN
    v_all_passed := false;
    v_issues := array_append(v_issues, 'Unresolved invariant violations exist');
  END IF;

  RETURN jsonb_build_object(
    'ready_for_launch', v_all_passed,
    'checks_passed', CASE WHEN v_all_passed THEN 'ALL' ELSE array_length(v_issues, 1)::text || ' FAILED' END,
    'issues', v_issues,
    'health_summary', v_health,
    'invariant_check', v_invariants,
    'demo_data_check', v_demo_check,
    'checked_at', now()
  );
END;
$$;

COMMENT ON FUNCTION run_prelaunch_checks() IS 
'Phase E: Comprehensive pre-launch verification. Returns ready_for_launch: true/false.';

GRANT EXECUTE ON FUNCTION run_prelaunch_checks() TO authenticated;

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
  v_check jsonb;
BEGIN
  -- Run pre-launch checks
  SELECT run_prelaunch_checks() INTO v_check;
  
  RAISE NOTICE 'Pre-launch check result: %', v_check->>'ready_for_launch';
  
  IF NOT (v_check->>'ready_for_launch')::boolean THEN
    RAISE NOTICE 'Issues found: %', v_check->>'issues';
  END IF;
END $$;
