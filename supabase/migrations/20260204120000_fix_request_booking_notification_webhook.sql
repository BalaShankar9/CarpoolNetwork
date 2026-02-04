/*
  # Fix request_booking() - Make notification insert best-effort

  Production has a database webhook/trigger on `notifications` that is misconfigured and can throw:
    "Unexpected operation type: notification_created"

  That exception aborts the whole `request_booking` transaction, preventing ride requests.

  This migration updates `public.request_booking(...)` so the notification INSERT is best-effort:
  - Booking + seat decrement remain atomic.
  - Notification creation is attempted, but failures are swallowed to avoid blocking bookings.
*/

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
  v_available_seats int;
  v_ride_status text;
  v_driver_id uuid;
  v_user_id uuid;
BEGIN
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
  BEGIN
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
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'You have already requested this ride' USING ERRCODE = '23505';
  END;

  -- Decrement available seats atomically
  UPDATE rides
  SET available_seats = available_seats - p_seats_requested
  WHERE id = p_ride_id;

  -- Best-effort notification (do not block booking if notifications webhook is misconfigured)
  BEGIN
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
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Intentionally swallow to keep booking flow reliable.
      NULL;
  END;

  RETURN v_booking_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_booking FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_booking TO authenticated;

