-- ============================================================================
-- PHASE C: RELIABILITY, AUTOMATION, AND CONFIDENCE HARDENING
-- Date: 2026-01-11
-- Purpose: Automatic expiry, self-healing repair jobs, invariant monitoring
-- ============================================================================

-- ============================================================================
-- C1: AUTOMATIC RIDE EXPIRY & STATE SYNC
-- ============================================================================

-- Create a system audit log table for automated jobs (separate from admin audit)
CREATE TABLE IF NOT EXISTS system_job_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL CHECK (status IN ('running', 'completed', 'failed')) DEFAULT 'running',
  records_processed integer DEFAULT 0,
  errors_encountered integer DEFAULT 0,
  details jsonb DEFAULT '{}',
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_system_job_log_job_name ON system_job_log(job_name);
CREATE INDEX IF NOT EXISTS idx_system_job_log_started_at ON system_job_log(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_job_log_status ON system_job_log(status);

-- ============================================================================
-- FUNCTION: expire_rides()
-- Idempotent, safe for concurrent execution, cron-ready
-- Transitions expired rides and their bookings to terminal states
-- ============================================================================
CREATE OR REPLACE FUNCTION public.expire_rides()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security TO off
AS $$
DECLARE
  v_now timestamptz := now();
  v_job_id uuid;
  v_expired_rides uuid[];
  v_updated_rides integer := 0;
  v_updated_bookings integer := 0;
  v_notifications_created integer := 0;
  v_ride record;
BEGIN
  -- Log job start
  INSERT INTO system_job_log (job_name, status, details)
  VALUES ('expire_rides', 'running', jsonb_build_object('started_at', v_now))
  RETURNING id INTO v_job_id;

  BEGIN
    -- Find all expired rides that need processing
    -- Using FOR UPDATE SKIP LOCKED for concurrent safety
    SELECT array_agg(id) INTO v_expired_rides
    FROM (
      SELECT id
      FROM rides
      WHERE (
        (available_until IS NOT NULL AND available_until < v_now)
        OR (available_until IS NULL AND departure_time < v_now)
      )
      AND status IN ('active', 'in-progress')
      FOR UPDATE SKIP LOCKED
    ) expired;

    -- Exit early if nothing to process
    IF v_expired_rides IS NULL OR array_length(v_expired_rides, 1) IS NULL THEN
      UPDATE system_job_log
      SET status = 'completed',
          completed_at = now(),
          records_processed = 0,
          details = jsonb_build_object(
            'started_at', v_now,
            'message', 'No expired rides found'
          )
      WHERE id = v_job_id;

      RETURN jsonb_build_object(
        'success', true,
        'rides_expired', 0,
        'bookings_completed', 0,
        'notifications_created', 0
      );
    END IF;

    -- Update all pending/confirmed bookings on expired rides to completed
    WITH completed_bookings AS (
      UPDATE ride_bookings
      SET status = 'completed',
          updated_at = now()
      WHERE ride_id = ANY(v_expired_rides)
        AND status IN ('pending', 'confirmed')
      RETURNING id, passenger_id, ride_id
    )
    SELECT COUNT(*) INTO v_updated_bookings FROM completed_bookings;

    -- Create BOOKING_CONFIRMED notifications for completed bookings
    INSERT INTO notifications (user_id, type, data)
    SELECT 
      rb.passenger_id,
      'BOOKING_CONFIRMED',
      jsonb_build_object(
        'booking_id', rb.id,
        'ride_id', rb.ride_id,
        'message', 'Your ride has been completed',
        'auto_completed', true
      )
    FROM ride_bookings rb
    WHERE rb.ride_id = ANY(v_expired_rides)
      AND rb.status = 'completed'
      AND rb.updated_at >= v_now - interval '5 seconds';

    GET DIAGNOSTICS v_notifications_created = ROW_COUNT;

    -- Update all expired rides to completed
    UPDATE rides
    SET status = 'completed',
        updated_at = now()
    WHERE id = ANY(v_expired_rides)
      AND status IN ('active', 'in-progress');

    GET DIAGNOSTICS v_updated_rides = ROW_COUNT;

    -- Log successful completion
    UPDATE system_job_log
    SET status = 'completed',
        completed_at = now(),
        records_processed = v_updated_rides + v_updated_bookings,
        details = jsonb_build_object(
          'started_at', v_now,
          'rides_expired', v_updated_rides,
          'bookings_completed', v_updated_bookings,
          'notifications_created', v_notifications_created,
          'ride_ids', v_expired_rides
        )
    WHERE id = v_job_id;

    RETURN jsonb_build_object(
      'success', true,
      'rides_expired', v_updated_rides,
      'bookings_completed', v_updated_bookings,
      'notifications_created', v_notifications_created
    );

  EXCEPTION WHEN OTHERS THEN
    -- Log failure
    UPDATE system_job_log
    SET status = 'failed',
        completed_at = now(),
        error_message = SQLERRM,
        details = jsonb_build_object(
          'started_at', v_now,
          'error', SQLERRM,
          'error_detail', SQLSTATE
        )
    WHERE id = v_job_id;

    RAISE;
  END;
END;
$$;

COMMENT ON FUNCTION expire_rides() IS 
'Phase C: Automatically expires rides past their departure_time or available_until. 
Idempotent, concurrent-safe (uses SKIP LOCKED), logs to system_job_log.
Can be called manually or via cron scheduler.';

-- Grant execute to service role for cron execution
REVOKE ALL ON FUNCTION public.expire_rides() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_rides() TO service_role;

-- Also allow authenticated users (admins) to trigger manually
GRANT EXECUTE ON FUNCTION public.expire_rides() TO authenticated;

-- ============================================================================
-- C2: REPAIR & RECONCILIATION JOBS
-- ============================================================================

-- ============================================================================
-- FUNCTION: reconcile_seat_counts()
-- Recalculates available_seats for all rides, logs and fixes mismatches
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reconcile_seat_counts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security TO off
AS $$
DECLARE
  v_now timestamptz := now();
  v_job_id uuid;
  v_mismatches_found integer := 0;
  v_mismatches_fixed integer := 0;
  v_mismatch record;
BEGIN
  -- Log job start
  INSERT INTO system_job_log (job_name, status, details)
  VALUES ('reconcile_seat_counts', 'running', jsonb_build_object('started_at', v_now))
  RETURNING id INTO v_job_id;

  BEGIN
    -- Find and fix all seat count mismatches
    FOR v_mismatch IN
      SELECT 
        r.id AS ride_id,
        r.total_seats,
        r.available_seats AS current_available,
        r.total_seats - COALESCE(SUM(
          CASE WHEN rb.status IN ('pending', 'confirmed') 
          THEN rb.seats_requested ELSE 0 END
        ), 0) AS calculated_available,
        r.driver_id
      FROM rides r
      LEFT JOIN ride_bookings rb ON rb.ride_id = r.id
      WHERE r.status IN ('active', 'in-progress')
      GROUP BY r.id
      HAVING r.available_seats != (
        r.total_seats - COALESCE(SUM(
          CASE WHEN rb.status IN ('pending', 'confirmed') 
          THEN rb.seats_requested ELSE 0 END
        ), 0)
      )
    LOOP
      v_mismatches_found := v_mismatches_found + 1;

      -- Log the discrepancy to admin audit
      INSERT INTO admin_audit_log (admin_id, admin_role, action, target_type, target_id, details)
      VALUES (
        NULL, -- System action, no admin
        'super_admin', -- Use highest role for system actions
        'seat_reconciliation',
        'ride',
        v_mismatch.ride_id,
        jsonb_build_object(
          'previous_available', v_mismatch.current_available,
          'calculated_available', v_mismatch.calculated_available,
          'total_seats', v_mismatch.total_seats,
          'driver_id', v_mismatch.driver_id,
          'reconciled_at', v_now
        )
      );

      -- Fix the mismatch
      UPDATE rides
      SET available_seats = GREATEST(0, LEAST(v_mismatch.calculated_available, v_mismatch.total_seats)),
          updated_at = now()
      WHERE id = v_mismatch.ride_id;

      v_mismatches_fixed := v_mismatches_fixed + 1;
    END LOOP;

    -- Log successful completion
    UPDATE system_job_log
    SET status = 'completed',
        completed_at = now(),
        records_processed = v_mismatches_found,
        details = jsonb_build_object(
          'started_at', v_now,
          'mismatches_found', v_mismatches_found,
          'mismatches_fixed', v_mismatches_fixed
        )
    WHERE id = v_job_id;

    RETURN jsonb_build_object(
      'success', true,
      'mismatches_found', v_mismatches_found,
      'mismatches_fixed', v_mismatches_fixed
    );

  EXCEPTION WHEN OTHERS THEN
    UPDATE system_job_log
    SET status = 'failed',
        completed_at = now(),
        error_message = SQLERRM
    WHERE id = v_job_id;
    RAISE;
  END;
END;
$$;

COMMENT ON FUNCTION reconcile_seat_counts() IS 
'Phase C: Reconciles available_seats with actual bookings. Finds and fixes mismatches. 
Logs discrepancies to admin_audit_log. Idempotent and safe to run repeatedly.';

REVOKE ALL ON FUNCTION public.reconcile_seat_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reconcile_seat_counts() TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_seat_counts() TO authenticated;

-- ============================================================================
-- FUNCTION: repair_missing_notifications()
-- Finds bookings missing required notifications and creates them
-- ============================================================================
CREATE OR REPLACE FUNCTION public.repair_missing_notifications()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security TO off
AS $$
DECLARE
  v_now timestamptz := now();
  v_job_id uuid;
  v_missing_booking_requests integer := 0;
  v_missing_confirmations integer := 0;
  v_missing_cancellations integer := 0;
  v_total_created integer := 0;
BEGIN
  -- Log job start
  INSERT INTO system_job_log (job_name, status, details)
  VALUES ('repair_missing_notifications', 'running', jsonb_build_object('started_at', v_now))
  RETURNING id INTO v_job_id;

  BEGIN
    -- Find bookings missing BOOKING_REQUEST notification to driver
    -- (Every booking should have notified the driver when created)
    WITH missing_requests AS (
      SELECT DISTINCT
        rb.id AS booking_id,
        rb.ride_id,
        r.driver_id,
        rb.passenger_id,
        rb.seats_requested,
        rb.created_at
      FROM ride_bookings rb
      JOIN rides r ON r.id = rb.ride_id
      WHERE NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = r.driver_id
          AND n.type = 'BOOKING_REQUEST'
          AND n.data->>'booking_id' = rb.id::text
      )
      -- Only repair recent bookings (last 30 days) to avoid noise
      AND rb.created_at > now() - interval '30 days'
    ),
    inserted_requests AS (
      INSERT INTO notifications (user_id, type, data, created_at)
      SELECT 
        driver_id,
        'BOOKING_REQUEST',
        jsonb_build_object(
          'booking_id', booking_id,
          'ride_id', ride_id,
          'passenger_id', passenger_id,
          'seats_requested', seats_requested,
          'repaired', true,
          'original_time', created_at
        ),
        created_at -- Use original booking time
      FROM missing_requests
      ON CONFLICT DO NOTHING
      RETURNING id
    )
    SELECT COUNT(*) INTO v_missing_booking_requests FROM inserted_requests;

    -- Find confirmed bookings missing BOOKING_CONFIRMED notification to passenger
    WITH missing_confirmations AS (
      SELECT DISTINCT
        rb.id AS booking_id,
        rb.ride_id,
        rb.passenger_id,
        r.driver_id,
        rb.updated_at
      FROM ride_bookings rb
      JOIN rides r ON r.id = rb.ride_id
      WHERE rb.status IN ('confirmed', 'completed')
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.user_id = rb.passenger_id
            AND n.type = 'BOOKING_CONFIRMED'
            AND n.data->>'booking_id' = rb.id::text
        )
        AND rb.updated_at > now() - interval '30 days'
    ),
    inserted_confirmations AS (
      INSERT INTO notifications (user_id, type, data, created_at)
      SELECT 
        passenger_id,
        'BOOKING_CONFIRMED',
        jsonb_build_object(
          'booking_id', booking_id,
          'ride_id', ride_id,
          'driver_id', driver_id,
          'repaired', true
        ),
        updated_at
      FROM missing_confirmations
      ON CONFLICT DO NOTHING
      RETURNING id
    )
    SELECT COUNT(*) INTO v_missing_confirmations FROM inserted_confirmations;

    -- Find cancelled bookings missing BOOKING_CANCELLED notification to passenger
    WITH missing_cancellations AS (
      SELECT DISTINCT
        rb.id AS booking_id,
        rb.ride_id,
        rb.passenger_id,
        rb.cancellation_reason,
        rb.cancelled_at
      FROM ride_bookings rb
      WHERE rb.status = 'cancelled'
        AND rb.cancelled_at IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.user_id = rb.passenger_id
            AND n.type = 'BOOKING_CANCELLED'
            AND n.data->>'booking_id' = rb.id::text
        )
        AND rb.cancelled_at > now() - interval '30 days'
    ),
    inserted_cancellations AS (
      INSERT INTO notifications (user_id, type, data, created_at)
      SELECT 
        passenger_id,
        'BOOKING_CANCELLED',
        jsonb_build_object(
          'booking_id', booking_id,
          'ride_id', ride_id,
          'cancellation_reason', cancellation_reason,
          'repaired', true
        ),
        cancelled_at
      FROM missing_cancellations
      ON CONFLICT DO NOTHING
      RETURNING id
    )
    SELECT COUNT(*) INTO v_missing_cancellations FROM inserted_cancellations;

    v_total_created := v_missing_booking_requests + v_missing_confirmations + v_missing_cancellations;

    -- Log successful completion
    UPDATE system_job_log
    SET status = 'completed',
        completed_at = now(),
        records_processed = v_total_created,
        details = jsonb_build_object(
          'started_at', v_now,
          'booking_requests_created', v_missing_booking_requests,
          'confirmations_created', v_missing_confirmations,
          'cancellations_created', v_missing_cancellations,
          'total_notifications_created', v_total_created
        )
    WHERE id = v_job_id;

    RETURN jsonb_build_object(
      'success', true,
      'booking_requests_created', v_missing_booking_requests,
      'confirmations_created', v_missing_confirmations,
      'cancellations_created', v_missing_cancellations,
      'total_notifications_created', v_total_created
    );

  EXCEPTION WHEN OTHERS THEN
    UPDATE system_job_log
    SET status = 'failed',
        completed_at = now(),
        error_message = SQLERRM
    WHERE id = v_job_id;
    RAISE;
  END;
END;
$$;

COMMENT ON FUNCTION repair_missing_notifications() IS 
'Phase C: Finds and creates missing booking notifications. 
Only repairs last 30 days. Marks repaired notifications with repaired=true. 
Idempotent (uses ON CONFLICT DO NOTHING).';

REVOKE ALL ON FUNCTION public.repair_missing_notifications() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.repair_missing_notifications() TO service_role;
GRANT EXECUTE ON FUNCTION public.repair_missing_notifications() TO authenticated;

-- ============================================================================
-- C3: INVARIANT MONITORING & ALERTING
-- ============================================================================

-- Create invariant violations table for tracking issues
CREATE TABLE IF NOT EXISTS invariant_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_name text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('critical', 'warning', 'info')) DEFAULT 'warning',
  violation_count integer NOT NULL DEFAULT 0,
  sample_data jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  auto_resolved boolean DEFAULT false,
  notes text
);

CREATE INDEX IF NOT EXISTS idx_invariant_violations_check_name ON invariant_violations(check_name);
CREATE INDEX IF NOT EXISTS idx_invariant_violations_severity ON invariant_violations(severity);
CREATE INDEX IF NOT EXISTS idx_invariant_violations_detected_at ON invariant_violations(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_invariant_violations_unresolved ON invariant_violations(resolved_at) WHERE resolved_at IS NULL;

-- ============================================================================
-- FUNCTION: check_system_invariants()
-- Comprehensive invariant check that returns violations
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_system_invariants()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security TO off
AS $$
DECLARE
  v_now timestamptz := now();
  v_job_id uuid;
  v_violations jsonb := '[]'::jsonb;
  v_total_violations integer := 0;
  v_check record;
BEGIN
  -- Log job start
  INSERT INTO system_job_log (job_name, status, details)
  VALUES ('check_system_invariants', 'running', jsonb_build_object('started_at', v_now))
  RETURNING id INTO v_job_id;

  BEGIN
    -- ========================================
    -- CHECK 1: Seat Mismatches (INV-SEAT-001)
    -- ========================================
    FOR v_check IN
      SELECT 
        r.id AS ride_id,
        r.available_seats,
        r.total_seats,
        r.total_seats - COALESCE(SUM(
          CASE WHEN rb.status IN ('pending', 'confirmed') 
          THEN rb.seats_requested ELSE 0 END
        ), 0) AS expected_available
      FROM rides r
      LEFT JOIN ride_bookings rb ON rb.ride_id = r.id
      WHERE r.status IN ('active', 'in-progress')
      GROUP BY r.id
      HAVING r.available_seats != (
        r.total_seats - COALESCE(SUM(
          CASE WHEN rb.status IN ('pending', 'confirmed') 
          THEN rb.seats_requested ELSE 0 END
        ), 0)
      )
      LIMIT 10
    LOOP
      v_violations := v_violations || jsonb_build_object(
        'check', 'INV-SEAT-001',
        'name', 'seat_mismatch',
        'severity', 'critical',
        'ride_id', v_check.ride_id,
        'current', v_check.available_seats,
        'expected', v_check.expected_available
      );
      v_total_violations := v_total_violations + 1;
    END LOOP;

    -- ========================================
    -- CHECK 2: Negative Available Seats (INV-SEAT-002)
    -- ========================================
    FOR v_check IN
      SELECT id, available_seats
      FROM rides
      WHERE available_seats < 0
      LIMIT 10
    LOOP
      v_violations := v_violations || jsonb_build_object(
        'check', 'INV-SEAT-002',
        'name', 'negative_seats',
        'severity', 'critical',
        'ride_id', v_check.id,
        'available_seats', v_check.available_seats
      );
      v_total_violations := v_total_violations + 1;
    END LOOP;

    -- ========================================
    -- CHECK 3: Overflow Seats (INV-SEAT-003)
    -- ========================================
    FOR v_check IN
      SELECT id, available_seats, total_seats
      FROM rides
      WHERE available_seats > total_seats
      LIMIT 10
    LOOP
      v_violations := v_violations || jsonb_build_object(
        'check', 'INV-SEAT-003',
        'name', 'seat_overflow',
        'severity', 'critical',
        'ride_id', v_check.id,
        'available_seats', v_check.available_seats,
        'total_seats', v_check.total_seats
      );
      v_total_violations := v_total_violations + 1;
    END LOOP;

    -- ========================================
    -- CHECK 4: Active Bookings on Terminal Rides
    -- ========================================
    FOR v_check IN
      SELECT 
        rb.id AS booking_id,
        rb.ride_id,
        rb.status AS booking_status,
        r.status AS ride_status
      FROM ride_bookings rb
      JOIN rides r ON r.id = rb.ride_id
      WHERE r.status IN ('completed', 'cancelled')
        AND rb.status IN ('pending', 'confirmed')
      LIMIT 10
    LOOP
      v_violations := v_violations || jsonb_build_object(
        'check', 'INV-STATE-001',
        'name', 'active_booking_on_terminal_ride',
        'severity', 'critical',
        'booking_id', v_check.booking_id,
        'ride_id', v_check.ride_id,
        'booking_status', v_check.booking_status,
        'ride_status', v_check.ride_status
      );
      v_total_violations := v_total_violations + 1;
    END LOOP;

    -- ========================================
    -- CHECK 5: Invalid Ride States
    -- ========================================
    FOR v_check IN
      SELECT id, status
      FROM rides
      WHERE status NOT IN ('active', 'in-progress', 'completed', 'cancelled')
      LIMIT 10
    LOOP
      v_violations := v_violations || jsonb_build_object(
        'check', 'INV-STATE-002',
        'name', 'invalid_ride_status',
        'severity', 'critical',
        'ride_id', v_check.id,
        'status', v_check.status
      );
      v_total_violations := v_total_violations + 1;
    END LOOP;

    -- ========================================
    -- CHECK 6: Invalid Booking States
    -- ========================================
    FOR v_check IN
      SELECT id, status
      FROM ride_bookings
      WHERE status NOT IN ('pending', 'confirmed', 'completed', 'cancelled')
      LIMIT 10
    LOOP
      v_violations := v_violations || jsonb_build_object(
        'check', 'INV-STATE-003',
        'name', 'invalid_booking_status',
        'severity', 'critical',
        'booking_id', v_check.id,
        'status', v_check.status
      );
      v_total_violations := v_total_violations + 1;
    END LOOP;

    -- ========================================
    -- CHECK 7: Duplicate Active Bookings (Same passenger, same ride)
    -- ========================================
    FOR v_check IN
      SELECT 
        ride_id,
        passenger_id,
        COUNT(*) as booking_count,
        array_agg(id) as booking_ids
      FROM ride_bookings
      WHERE status IN ('pending', 'confirmed')
      GROUP BY ride_id, passenger_id
      HAVING COUNT(*) > 1
      LIMIT 10
    LOOP
      v_violations := v_violations || jsonb_build_object(
        'check', 'INV-UNIQUE-001',
        'name', 'duplicate_active_bookings',
        'severity', 'critical',
        'ride_id', v_check.ride_id,
        'passenger_id', v_check.passenger_id,
        'booking_count', v_check.booking_count,
        'booking_ids', v_check.booking_ids
      );
      v_total_violations := v_total_violations + 1;
    END LOOP;

    -- ========================================
    -- CHECK 8: Expired Active Rides (Warning)
    -- ========================================
    FOR v_check IN
      SELECT 
        id,
        departure_time,
        available_until,
        status,
        EXTRACT(EPOCH FROM (v_now - COALESCE(available_until, departure_time))) / 3600 AS hours_overdue
      FROM rides
      WHERE (
        (available_until IS NOT NULL AND available_until < v_now)
        OR (available_until IS NULL AND departure_time < v_now)
      )
      AND status IN ('active', 'in-progress')
      ORDER BY departure_time ASC
      LIMIT 10
    LOOP
      v_violations := v_violations || jsonb_build_object(
        'check', 'INV-TIME-001',
        'name', 'expired_active_ride',
        'severity', 'warning',
        'ride_id', v_check.id,
        'departure_time', v_check.departure_time,
        'hours_overdue', round(v_check.hours_overdue::numeric, 2)
      );
      v_total_violations := v_total_violations + 1;
    END LOOP;

    -- Log violations if any critical ones found
    IF v_total_violations > 0 THEN
      INSERT INTO invariant_violations (check_name, severity, violation_count, sample_data)
      SELECT 
        'system_invariant_check',
        CASE 
          WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(v_violations) v WHERE v->>'severity' = 'critical')
          THEN 'critical'
          ELSE 'warning'
        END,
        v_total_violations,
        v_violations;
    END IF;

    -- Log successful completion
    UPDATE system_job_log
    SET status = 'completed',
        completed_at = now(),
        records_processed = v_total_violations,
        details = jsonb_build_object(
          'started_at', v_now,
          'total_violations', v_total_violations,
          'violations', v_violations
        )
    WHERE id = v_job_id;

    RETURN jsonb_build_object(
      'success', true,
      'healthy', v_total_violations = 0,
      'total_violations', v_total_violations,
      'violations', v_violations
    );

  EXCEPTION WHEN OTHERS THEN
    UPDATE system_job_log
    SET status = 'failed',
        completed_at = now(),
        error_message = SQLERRM
    WHERE id = v_job_id;
    RAISE;
  END;
END;
$$;

COMMENT ON FUNCTION check_system_invariants() IS 
'Phase C: Comprehensive system health check. Validates all critical invariants:
- Seat accounting (mismatches, negative, overflow)
- State consistency (terminal rides with active bookings)
- Valid states only
- No duplicate bookings
Logs violations to invariant_violations table.';

REVOKE ALL ON FUNCTION public.check_system_invariants() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_system_invariants() TO service_role;
GRANT EXECUTE ON FUNCTION public.check_system_invariants() TO authenticated;

-- ============================================================================
-- FUNCTION: get_system_health_summary()
-- Quick health check for dashboards
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_system_health_summary()
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
    'total_rides', (SELECT COUNT(*) FROM rides),
    'active_rides', (SELECT COUNT(*) FROM rides WHERE status = 'active'),
    'in_progress_rides', (SELECT COUNT(*) FROM rides WHERE status = 'in-progress'),
    'total_bookings', (SELECT COUNT(*) FROM ride_bookings),
    'pending_bookings', (SELECT COUNT(*) FROM ride_bookings WHERE status = 'pending'),
    'confirmed_bookings', (SELECT COUNT(*) FROM ride_bookings WHERE status = 'confirmed'),
    'expired_active_rides', (
      SELECT COUNT(*)
      FROM rides
      WHERE (
        (available_until IS NOT NULL AND available_until < now())
        OR (available_until IS NULL AND departure_time < now())
      )
      AND status IN ('active', 'in-progress')
    ),
    'seat_mismatches', (
      SELECT COUNT(*)
      FROM (
        SELECT r.id
        FROM rides r
        LEFT JOIN ride_bookings rb ON rb.ride_id = r.id
        WHERE r.status IN ('active', 'in-progress')
        GROUP BY r.id, r.available_seats, r.total_seats
        HAVING r.available_seats != (
          r.total_seats - COALESCE(SUM(
            CASE WHEN rb.status IN ('pending', 'confirmed') 
            THEN rb.seats_requested ELSE 0 END
          ), 0)
        )
      ) mismatches
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

COMMENT ON FUNCTION get_system_health_summary() IS 
'Phase C: Quick system health summary for dashboards and monitoring.';

REVOKE ALL ON FUNCTION public.get_system_health_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_system_health_summary() TO authenticated;

-- ============================================================================
-- CRON SCHEDULING DOCUMENTATION
-- ============================================================================

/*
SCHEDULING INSTRUCTIONS FOR SUPABASE:

These functions are designed to be run periodically. Here's how to set them up:

1. USING SUPABASE CRON (pg_cron extension):

   -- Enable pg_cron if not already enabled
   CREATE EXTENSION IF NOT EXISTS pg_cron;

   -- Schedule ride expiry every 5 minutes
   SELECT cron.schedule(
     'expire-rides',
     '*/5 * * * *',  -- Every 5 minutes
     $$SELECT expire_rides()$$
   );

   -- Schedule seat reconciliation daily at 3 AM
   SELECT cron.schedule(
     'reconcile-seats',
     '0 3 * * *',  -- Daily at 3:00 AM
     $$SELECT reconcile_seat_counts()$$
   );

   -- Schedule notification repair daily at 4 AM
   SELECT cron.schedule(
     'repair-notifications',
     '0 4 * * *',  -- Daily at 4:00 AM
     $$SELECT repair_missing_notifications()$$
   );

   -- Schedule invariant check every 15 minutes
   SELECT cron.schedule(
     'check-invariants',
     '*/15 * * * *',  -- Every 15 minutes
     $$SELECT check_system_invariants()$$
   );

2. USING EXTERNAL SCHEDULER (e.g., GitHub Actions, AWS Lambda):

   Call the Supabase REST API:
   
   POST /rest/v1/rpc/expire_rides
   POST /rest/v1/rpc/reconcile_seat_counts
   POST /rest/v1/rpc/repair_missing_notifications
   POST /rest/v1/rpc/check_system_invariants

   With headers:
   - apikey: <your-anon-key>
   - Authorization: Bearer <your-service-role-key>

3. VIEWING JOB HISTORY:

   SELECT * FROM system_job_log 
   ORDER BY started_at DESC 
   LIMIT 50;

4. VIEWING VIOLATIONS:

   SELECT * FROM invariant_violations 
   WHERE resolved_at IS NULL 
   ORDER BY detected_at DESC;

*/

-- ============================================================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================================================

ALTER TABLE system_job_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE invariant_violations ENABLE ROW LEVEL SECURITY;

-- Only admins can view job logs
DROP POLICY IF EXISTS "Admins can view job logs" ON system_job_log;
CREATE POLICY "Admins can view job logs" ON system_job_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.is_admin = true OR profiles.admin_role IS NOT NULL)
    )
  );

-- Only admins can view invariant violations
DROP POLICY IF EXISTS "Admins can view violations" ON invariant_violations;
CREATE POLICY "Admins can view violations" ON invariant_violations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.is_admin = true OR profiles.admin_role IS NOT NULL)
    )
  );

-- Admins can update violations (mark resolved)
DROP POLICY IF EXISTS "Admins can update violations" ON invariant_violations;
CREATE POLICY "Admins can update violations" ON invariant_violations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.is_admin = true OR profiles.admin_role IS NOT NULL)
    )
  );

-- Service role can do everything
DROP POLICY IF EXISTS "Service role full access to job logs" ON system_job_log;
CREATE POLICY "Service role full access to job logs" ON system_job_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to violations" ON invariant_violations;
CREATE POLICY "Service role full access to violations" ON invariant_violations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- VALIDATION: Run initial checks
-- ============================================================================

DO $$
DECLARE
  v_result jsonb;
BEGIN
  -- Run initial invariant check
  SELECT check_system_invariants() INTO v_result;
  
  IF (v_result->>'healthy')::boolean THEN
    RAISE NOTICE 'PHASE C VALIDATION: System is healthy, no invariant violations found';
  ELSE
    RAISE WARNING 'PHASE C VALIDATION: Found % invariant violations. Review with: SELECT * FROM invariant_violations WHERE resolved_at IS NULL', 
      v_result->>'total_violations';
  END IF;
END $$;

COMMENT ON TABLE system_job_log IS 'Phase C: Audit log for automated background jobs';
COMMENT ON TABLE invariant_violations IS 'Phase C: Tracked invariant violations for monitoring';
