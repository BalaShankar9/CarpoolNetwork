/*
  # Add Atomic Booking Operations with Seat Restoration

  1. New Functions
    - `cancel_booking(p_booking_id, p_reason)` - Passenger cancels their booking
      - Validates passenger owns the booking
      - Prevents double-cancellation
      - Restores seats to ride (never exceeds total_seats)
      - Tracks last-minute cancellations (< 2 hours before departure)
      - Records history
    
    - `driver_decide_booking(p_booking_id, p_decision)` - Driver confirms or declines
      - Validates driver owns the ride
      - 'confirmed': pending -> confirmed (no seat change, already reserved)
      - 'cancelled': pending/confirmed -> cancelled + restore seats
      - Records history

  2. Security
    - Both functions are SECURITY DEFINER with explicit search_path
    - Row-level locking (FOR UPDATE) prevents race conditions
    - Permission checks ensure only authorized users can act
    - Granted to authenticated role only

  3. Seat Restoration Logic
    - Uses LEAST(total_seats, available_seats + seats_requested)
    - Prevents available_seats from exceeding total_seats
    - Applied atomically within transaction

  4. Error Handling
    - Raises exceptions for invalid states (already cancelled, not authorized, etc.)
    - Frontend can catch and display user-friendly messages
*/

-- ============================================================================
-- FUNCTION: cancel_booking
-- PURPOSE: Passenger cancels their own booking with seat restoration
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cancel_booking(
  p_booking_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
  v_ride record;
BEGIN
  -- Require authenticated user
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Lock booking row and get data
  SELECT * INTO v_booking
  FROM ride_bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  -- Check if booking exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Verify passenger owns this booking
  IF v_booking.passenger_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to cancel this booking';
  END IF;

  -- Prevent double-cancellation
  IF v_booking.status = 'cancelled' THEN
    RAISE EXCEPTION 'Booking is already cancelled';
  END IF;

  -- Only allow cancelling pending or confirmed bookings
  IF v_booking.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Cannot cancel booking with status: %', v_booking.status;
  END IF;

  -- Lock ride row and get data
  SELECT * INTO v_ride
  FROM rides
  WHERE id = v_booking.ride_id
  FOR UPDATE;

  -- Check if ride exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;

  -- Determine if this is a last-minute cancellation (< 2 hours before departure)
  DECLARE
    v_is_last_minute boolean;
  BEGIN
    v_is_last_minute := (v_ride.departure_time - now()) <= interval '2 hours';
  END;

  -- Update booking to cancelled status
  UPDATE ride_bookings
  SET 
    status = 'cancelled',
    cancellation_reason = p_reason,
    cancelled_at = now(),
    is_last_minute_cancellation = v_is_last_minute,
    updated_at = now()
  WHERE id = p_booking_id;

  -- Restore seats to ride (never exceed total_seats)
  UPDATE rides
  SET 
    available_seats = LEAST(total_seats, available_seats + v_booking.seats_requested),
    updated_at = now()
  WHERE id = v_booking.ride_id;

  -- Record in booking history
  INSERT INTO booking_history (booking_id, user_id, action, reason)
  VALUES (p_booking_id, auth.uid(), 'cancelled', p_reason);

END;
$$;

-- ============================================================================
-- FUNCTION: driver_decide_booking
-- PURPOSE: Driver confirms or declines a booking request
-- ============================================================================
CREATE OR REPLACE FUNCTION public.driver_decide_booking(
  p_booking_id uuid,
  p_decision text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
  v_ride record;
BEGIN
  -- Require authenticated user
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate decision parameter
  IF p_decision NOT IN ('confirmed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid decision. Must be ''confirmed'' or ''cancelled''';
  END IF;

  -- Lock booking row and get data
  SELECT * INTO v_booking
  FROM ride_bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  -- Check if booking exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Lock ride row and get data
  SELECT * INTO v_ride
  FROM rides
  WHERE id = v_booking.ride_id
  FOR UPDATE;

  -- Check if ride exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;

  -- Verify driver owns this ride
  IF v_ride.driver_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to manage this booking';
  END IF;

  -- Handle CONFIRM decision
  IF p_decision = 'confirmed' THEN
    -- Can only confirm pending bookings
    IF v_booking.status != 'pending' THEN
      RAISE EXCEPTION 'Can only confirm pending bookings. Current status: %', v_booking.status;
    END IF;

    -- Update booking to confirmed
    UPDATE ride_bookings
    SET 
      status = 'confirmed',
      updated_at = now()
    WHERE id = p_booking_id;

    -- Record in booking history
    INSERT INTO booking_history (booking_id, user_id, action, reason)
    VALUES (p_booking_id, auth.uid(), 'confirmed', NULL);

  -- Handle DECLINE decision (driver cancels the booking)
  ELSIF p_decision = 'cancelled' THEN
    -- Can decline pending or confirmed bookings
    IF v_booking.status NOT IN ('pending', 'confirmed') THEN
      RAISE EXCEPTION 'Can only decline pending or confirmed bookings. Current status: %', v_booking.status;
    END IF;

    -- Update booking to cancelled
    UPDATE ride_bookings
    SET 
      status = 'cancelled',
      cancellation_reason = 'Declined by driver',
      cancelled_at = now(),
      is_last_minute_cancellation = false,
      updated_at = now()
    WHERE id = p_booking_id;

    -- Restore seats to ride (never exceed total_seats)
    UPDATE rides
    SET 
      available_seats = LEAST(total_seats, available_seats + v_booking.seats_requested),
      updated_at = now()
    WHERE id = v_booking.ride_id;

    -- Record in booking history
    INSERT INTO booking_history (booking_id, user_id, action, reason)
    VALUES (p_booking_id, auth.uid(), 'declined', 'Declined by driver');

  END IF;

END;
$$;

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

-- Grant execute permissions to authenticated users only
GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.driver_decide_booking(uuid, text) TO authenticated;

-- Revoke from public for security
REVOKE ALL ON FUNCTION public.cancel_booking(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.driver_decide_booking(uuid, text) FROM PUBLIC;

-- Add helpful comments
COMMENT ON FUNCTION public.cancel_booking IS 'Allows passengers to cancel their own bookings with automatic seat restoration';
COMMENT ON FUNCTION public.driver_decide_booking IS 'Allows drivers to confirm or decline booking requests with automatic seat restoration on decline';