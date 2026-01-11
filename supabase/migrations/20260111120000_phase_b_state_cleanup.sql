-- ============================================================================
-- PHASE B: STATE CLEANUP & NORMALISATION
-- Date: 2026-01-11
-- Purpose: Remove deprecated states, normalise values, align DB/backend/frontend
-- ============================================================================

-- ============================================================================
-- B1: BOOKING STATE CLEANUP
-- Canonical states: pending, confirmed, completed, cancelled
-- Deprecated states being removed: rejected, declined, active, paid
-- ============================================================================

-- Step 1: Migrate deprecated booking states to canonical values
UPDATE ride_bookings
SET status = 'cancelled',
    cancellation_reason = COALESCE(cancellation_reason, 'Migrated from rejected state'),
    updated_at = now()
WHERE status = 'rejected';

UPDATE ride_bookings
SET status = 'cancelled',
    cancellation_reason = COALESCE(cancellation_reason, 'Migrated from declined state'),
    updated_at = now()
WHERE status = 'declined';

-- Remove any 'active' or 'paid' booking states (should not exist, but cleanup)
UPDATE ride_bookings
SET status = 'confirmed',
    updated_at = now()
WHERE status = 'active';

UPDATE ride_bookings
SET status = 'completed',
    updated_at = now()
WHERE status = 'paid';

-- Step 2: Drop old constraint and add canonical CHECK constraint
ALTER TABLE ride_bookings DROP CONSTRAINT IF EXISTS ride_bookings_status_check;

ALTER TABLE ride_bookings
  ADD CONSTRAINT ride_bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled'));

-- Step 3: Update partial unique index to use only canonical active states
DROP INDEX IF EXISTS idx_unique_active_booking_per_passenger;

CREATE UNIQUE INDEX idx_unique_active_booking_per_passenger
  ON ride_bookings(ride_id, passenger_id)
  WHERE status IN ('pending', 'confirmed');

-- ============================================================================
-- B2: RIDE STATE NORMALISATION
-- Canonical states: active, in-progress, completed, cancelled
-- Normalisation: lowercase, hyphenated, British spelling
-- ============================================================================

-- Step 1: Migrate legacy ride state values
UPDATE rides
SET status = 'in-progress',
    updated_at = now()
WHERE status = 'in_progress';

UPDATE rides
SET status = 'cancelled',
    updated_at = now()
WHERE status = 'canceled';

-- Step 2: Verify and recreate CHECK constraint with canonical values
ALTER TABLE rides DROP CONSTRAINT IF EXISTS rides_status_check;

ALTER TABLE rides
  ADD CONSTRAINT rides_status_check
  CHECK (status IN ('active', 'in-progress', 'completed', 'cancelled'));

-- ============================================================================
-- B3: NOTIFICATION TYPE CLEANUP
-- Canonical types (12 total, UPPER_CASE):
--   NEW_MESSAGE, FRIEND_REQUEST, FRIEND_REQUEST_ACCEPTED, FORUM_REPLY,
--   FORUM_MENTION, RIDE_MATCH, BOOKING_REQUEST, BOOKING_CONFIRMED,
--   BOOKING_CANCELLED, REVIEW, SAFETY_ALERT, SYSTEM
-- ============================================================================

-- Step 1: Migrate any legacy snake_case/lowercase notification types to canonical
UPDATE notifications SET type = 'NEW_MESSAGE' WHERE type IN ('message', 'new_message');
UPDATE notifications SET type = 'FRIEND_REQUEST' WHERE type IN ('friend-request', 'friend_request');
UPDATE notifications SET type = 'FRIEND_REQUEST_ACCEPTED' WHERE type IN ('friend-accepted', 'friend_accepted', 'friend_request_accepted');
UPDATE notifications SET type = 'RIDE_MATCH' WHERE type IN ('ride-match', 'ride_match');
UPDATE notifications SET type = 'BOOKING_REQUEST' WHERE type IN ('booking-request', 'booking_request', 'ride_request');
UPDATE notifications SET type = 'BOOKING_CONFIRMED' WHERE type IN ('booking-confirmed', 'booking_confirmed', 'ride_confirmed');
UPDATE notifications SET type = 'BOOKING_CANCELLED' WHERE type IN ('booking-cancelled', 'booking_cancelled', 'ride_cancelled');
UPDATE notifications SET type = 'REVIEW' WHERE type = 'review';
UPDATE notifications SET type = 'SAFETY_ALERT' WHERE type IN ('safety-alert', 'safety_alert');
UPDATE notifications SET type = 'SYSTEM' WHERE type IN ('system', 'info', 'success', 'warning', 'error');

-- Step 2: Map deprecated notification types to SYSTEM
UPDATE notifications 
SET type = 'SYSTEM',
    data = jsonb_set(
      COALESCE(data, '{}'::jsonb),
      '{original_type}',
      to_jsonb(type)
    )
WHERE type IN (
  'RIDE_STARTED', 'RIDE_LOCATION_UPDATE', 'RIDE_COMPLETED', 'RIDE_DELAYED', 
  'DRIVER_ARRIVING', 'ACHIEVEMENT_UNLOCKED', 'BADGE_EARNED', 'LEVEL_UP',
  'ECO_MILESTONE', 'CO2_SAVED',
  'ride_started', 'ride_completed', 'ride_delayed', 'driver_arriving',
  'achievement_unlocked', 'badge_earned', 'level_up', 'eco_milestone', 'co2_saved',
  'achievement', 'milestone_reached', 'challenge', 'event', 'waitlist_available', 'promo'
);

-- Step 3: Drop old constraints and add canonical CHECK
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_category_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'NEW_MESSAGE',
    'FRIEND_REQUEST',
    'FRIEND_REQUEST_ACCEPTED',
    'FORUM_REPLY',
    'FORUM_MENTION',
    'RIDE_MATCH',
    'BOOKING_REQUEST',
    'BOOKING_CONFIRMED',
    'BOOKING_CANCELLED',
    'REVIEW',
    'SAFETY_ALERT',
    'SYSTEM'
  ));

-- Step 4: Remove deprecated is_read column if still exists (use read_at instead)
ALTER TABLE notifications DROP COLUMN IF EXISTS is_read;

-- Step 5: Remove deprecated title and message columns (compute in app from type + data)
ALTER TABLE notifications DROP COLUMN IF EXISTS title;
ALTER TABLE notifications DROP COLUMN IF EXISTS message;

-- Step 6: Update category column if exists to match type constraints
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'category'
  ) THEN
    UPDATE notifications SET category = type WHERE category IS NOT NULL;
    
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_category_check
      CHECK (category IN (
        'NEW_MESSAGE',
        'FRIEND_REQUEST',
        'FRIEND_REQUEST_ACCEPTED',
        'FORUM_REPLY',
        'FORUM_MENTION',
        'RIDE_MATCH',
        'BOOKING_REQUEST',
        'BOOKING_CONFIRMED',
        'BOOKING_CANCELLED',
        'REVIEW',
        'SAFETY_ALERT',
        'SYSTEM'
      ));
  END IF;
END $$;

-- ============================================================================
-- B4: TERMINAL STATE AUTO-SYNCHRONISATION
-- When ride enters terminal state, sync all bookings accordingly
-- ============================================================================

-- Update sync_expired_ride_state to use canonical states only
CREATE OR REPLACE FUNCTION public.sync_expired_ride_state()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security TO off
AS $$
DECLARE
  v_now timestamptz := now();
  v_updated_bookings integer;
  v_updated_rides integer;
  v_ride_ids uuid[];
  v_ride record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Find expired rides for the authenticated user
  SELECT array_agg(id) INTO v_ride_ids
  FROM rides
  WHERE driver_id = auth.uid()
    AND (
      (available_until IS NOT NULL AND available_until < v_now)
      OR (available_until IS NULL AND departure_time < v_now)
    )
    AND status NOT IN ('cancelled', 'completed');

  -- Exit early if no expired rides
  IF v_ride_ids IS NULL OR array_length(v_ride_ids, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'updated_bookings', 0,
      'updated_rides', 0
    );
  END IF;

  -- Update bookings to completed (canonical states only: pending, confirmed -> completed)
  WITH updated_bookings AS (
    UPDATE ride_bookings
    SET status = 'completed',
        updated_at = now()
    WHERE ride_id = ANY(v_ride_ids)
      AND status IN ('pending', 'confirmed')
    RETURNING id, passenger_id, ride_id
  )
  SELECT COUNT(*) INTO v_updated_bookings FROM updated_bookings;

  -- Create notifications for affected passengers
  INSERT INTO notifications (user_id, type, data)
  SELECT 
    rb.passenger_id,
    'BOOKING_CONFIRMED',
    jsonb_build_object(
      'booking_id', rb.id,
      'ride_id', rb.ride_id,
      'message', 'Your ride has been completed'
    )
  FROM ride_bookings rb
  WHERE rb.ride_id = ANY(v_ride_ids)
    AND rb.status = 'completed'
    AND rb.updated_at >= v_now - interval '1 second';

  -- Update rides to completed
  UPDATE rides
  SET status = 'completed',
      updated_at = now()
  WHERE id = ANY(v_ride_ids)
    AND status NOT IN ('cancelled', 'completed');

  GET DIAGNOSTICS v_updated_rides = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'updated_bookings', v_updated_bookings,
    'updated_rides', v_updated_rides
  );
END;
$$;

-- Create function to handle ride cancellation cascade
CREATE OR REPLACE FUNCTION public.cascade_ride_cancellation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When ride status changes to 'cancelled', cancel all non-terminal bookings
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Update all pending/confirmed bookings to cancelled
    UPDATE ride_bookings
    SET status = 'cancelled',
        cancellation_reason = COALESCE(cancellation_reason, 'Ride cancelled by driver'),
        cancelled_at = now(),
        updated_at = now()
    WHERE ride_id = NEW.id
      AND status IN ('pending', 'confirmed');
    
    -- Create notifications for affected passengers
    INSERT INTO notifications (user_id, type, data)
    SELECT 
      passenger_id,
      'BOOKING_CANCELLED',
      jsonb_build_object(
        'booking_id', id,
        'ride_id', NEW.id,
        'message', 'Your booking has been cancelled because the ride was cancelled'
      )
    FROM ride_bookings
    WHERE ride_id = NEW.id
      AND status = 'cancelled'
      AND cancelled_at >= now() - interval '1 second';
  END IF;

  -- When ride status changes to 'completed', complete all non-terminal bookings
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE ride_bookings
    SET status = 'completed',
        updated_at = now()
    WHERE ride_id = NEW.id
      AND status IN ('pending', 'confirmed');
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for ride cancellation cascade
DROP TRIGGER IF EXISTS trigger_cascade_ride_state ON rides;
CREATE TRIGGER trigger_cascade_ride_state
  AFTER UPDATE OF status ON rides
  FOR EACH ROW
  WHEN (NEW.status IN ('cancelled', 'completed') AND OLD.status NOT IN ('cancelled', 'completed'))
  EXECUTE FUNCTION cascade_ride_cancellation();

-- ============================================================================
-- VALIDATION QUERIES (run these to verify cleanup)
-- ============================================================================

-- Verify no deprecated booking states exist
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM ride_bookings
  WHERE status NOT IN ('pending', 'confirmed', 'completed', 'cancelled');
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'VALIDATION FAILED: % bookings have non-canonical status', v_count;
  END IF;
  
  RAISE NOTICE 'VALIDATION PASSED: All booking states are canonical';
END $$;

-- Verify no deprecated ride states exist
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM rides
  WHERE status NOT IN ('active', 'in-progress', 'completed', 'cancelled');
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'VALIDATION FAILED: % rides have non-canonical status', v_count;
  END IF;
  
  RAISE NOTICE 'VALIDATION PASSED: All ride states are canonical';
END $$;

-- Verify no deprecated notification types exist
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM notifications
  WHERE type NOT IN (
    'NEW_MESSAGE', 'FRIEND_REQUEST', 'FRIEND_REQUEST_ACCEPTED',
    'FORUM_REPLY', 'FORUM_MENTION', 'RIDE_MATCH',
    'BOOKING_REQUEST', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED',
    'REVIEW', 'SAFETY_ALERT', 'SYSTEM'
  );
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'VALIDATION FAILED: % notifications have non-canonical type', v_count;
  END IF;
  
  RAISE NOTICE 'VALIDATION PASSED: All notification types are canonical';
END $$;

-- Verify terminal state consistency: no active bookings on terminal rides
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM ride_bookings rb
  JOIN rides r ON r.id = rb.ride_id
  WHERE r.status IN ('completed', 'cancelled')
    AND rb.status IN ('pending', 'confirmed');
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'VALIDATION FAILED: % bookings are active on terminal rides', v_count;
  END IF;
  
  RAISE NOTICE 'VALIDATION PASSED: No active bookings on terminal rides';
END $$;

COMMENT ON FUNCTION public.sync_expired_ride_state() IS 'Phase B: Syncs expired rides and bookings to completed state';
COMMENT ON FUNCTION public.cascade_ride_cancellation() IS 'Phase B: Cascades ride terminal state changes to bookings';
