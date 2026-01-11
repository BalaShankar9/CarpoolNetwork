/*
  # P0 ATOMICITY GUARANTEE: Booking + Notification Are Inseparable

  This migration ensures that booking creation and notification creation are ATOMIC.
  If notification fails, the entire transaction rolls back - booking does not persist.

  ## Changes:
  1. Disable existing trigger that creates BOOKING_REQUEST notifications
     - Trigger uses old schema (title, message, is_read) that was dropped
     - Trigger uses wrong type format ('booking-request' vs 'BOOKING_REQUEST')
     - Moving notification creation inside RPC for atomicity

  2. Update request_booking() RPC to:
     - Include notification INSERT inside the same transaction
     - Use correct notification schema (data jsonb only)
     - Use correct type 'BOOKING_REQUEST'
     - Raise exception if notification fails (transaction rollback)

  ## Guarantees:
  - If RPC succeeds → notification exists
  - If RPC fails → booking does not exist
  - Exactly ONE notification per booking (no duplicates)
*/

-- ============================================================================
-- STEP 1: Disable existing trigger to prevent double notifications
-- ============================================================================
-- P0 ATOMICITY GUARANTEE: Notification now created inside request_booking() RPC
-- This trigger used old schema and is being replaced by atomic RPC behavior
DROP TRIGGER IF EXISTS trigger_notify_driver_new_booking ON ride_bookings;

-- ============================================================================
-- STEP 2: Update request_booking() RPC with atomic notification INSERT
-- ============================================================================
CREATE OR REPLACE FUNCTION public.request_booking(
  p_ride_id uuid,
  p_pickup_location text,
  p_pickup_lat double precision,
  p_pickup_lng double precision,
  p_dropoff_location text,
  p_dropoff_lat double precision,
  p_dropoff_lng double precision,
  p_seats_requested int
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
  v_notification_id uuid;
  v_available_seats int;
  v_ride_status text;
  v_driver_id uuid;
  v_user_id uuid;
BEGIN
  -- P0 ATOMICITY GUARANTEE: booking + notification are inseparable
  -- All operations below are in a single transaction

  -- Require authentication
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate seats requested
  IF p_seats_requested < 1 THEN
    RAISE EXCEPTION 'Must request at least 1 seat';
  END IF;

  -- Lock the ride row for update (prevents concurrent bookings)
  SELECT available_seats, status, driver_id
  INTO v_available_seats, v_ride_status, v_driver_id
  FROM rides
  WHERE id = p_ride_id
  FOR UPDATE;

  -- Check if ride exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;

  -- Check if ride is active
  IF v_ride_status != 'active' THEN
    RAISE EXCEPTION 'Ride is not active (status: %)', v_ride_status;
  END IF;

  -- Check if enough seats available
  IF v_available_seats < p_seats_requested THEN
    RAISE EXCEPTION 'Not enough seats available (available: %, requested: %)',
      v_available_seats, p_seats_requested;
  END IF;

  -- Prevent booking own ride
  IF v_driver_id = v_user_id THEN
    RAISE EXCEPTION 'Cannot book your own ride';
  END IF;

  -- Insert booking record
  INSERT INTO ride_bookings (
    ride_id,
    passenger_id,
    pickup_location,
    pickup_lat,
    pickup_lng,
    dropoff_location,
    dropoff_lat,
    dropoff_lng,
    seats_requested,
    status
  ) VALUES (
    p_ride_id,
    v_user_id,
    p_pickup_location,
    p_pickup_lat,
    p_pickup_lng,
    p_dropoff_location,
    p_dropoff_lat,
    p_dropoff_lng,
    p_seats_requested,
    'pending'
  )
  RETURNING id INTO v_booking_id;

  -- Decrement available seats atomically
  UPDATE rides
  SET available_seats = available_seats - p_seats_requested
  WHERE id = p_ride_id;

  -- P0 ATOMICITY GUARANTEE: Create notification inside same transaction
  -- If this fails, entire transaction rolls back (booking won't persist)
  INSERT INTO notifications (
    user_id,
    type,
    data,
    created_at
  ) VALUES (
    v_driver_id,
    'BOOKING_REQUEST',
    jsonb_build_object(
      'booking_id', v_booking_id,
      'ride_id', p_ride_id,
      'passenger_id', v_user_id,
      'seats_requested', p_seats_requested
    ),
    now()
  )
  RETURNING id INTO v_notification_id;

  -- Verify notification was created (belt and suspenders)
  IF v_notification_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create booking notification - transaction rolled back';
  END IF;

  -- Return the booking ID
  RETURN v_booking_id;
END;
$$;

-- ============================================================================
-- STEP 3: Ensure permissions are correct
-- ============================================================================
REVOKE ALL ON FUNCTION public.request_booking FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_booking TO authenticated;

-- ============================================================================
-- STEP 4: Add helpful comments
-- ============================================================================
COMMENT ON FUNCTION public.request_booking IS
'P0 ATOMICITY GUARANTEE: Creates booking AND notification in single transaction.
If notification INSERT fails, booking does NOT persist.
If RPC succeeds, exactly ONE BOOKING_REQUEST notification exists for driver.
Replaces trigger-based notification which used deprecated schema.';
