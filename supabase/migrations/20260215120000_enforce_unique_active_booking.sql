/*
  # Enforce Unique Active Booking Per Passenger Per Ride

  1. Preflight check
    - Abort if duplicate active bookings exist for ride_id/passenger_id
      where status != 'cancelled'

  2. Index
    - Create partial unique index on (ride_id, passenger_id)
      where status != 'cancelled'

  3. RPC
    - Update request_booking() to surface a friendly duplicate booking error
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM ride_bookings
    WHERE status != 'cancelled'
    GROUP BY ride_id, passenger_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Duplicate active bookings found for ride_id/passenger_id. Resolve conflicts before applying unique index.';
  END IF;
END $$;

DROP INDEX IF EXISTS idx_unique_active_booking_per_passenger;

CREATE UNIQUE INDEX idx_unique_active_booking_per_passenger
  ON ride_bookings(ride_id, passenger_id)
  WHERE status != 'cancelled';

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

  -- Create notification inside same transaction
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

  -- Verify notification was created
  IF v_notification_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create booking notification - transaction rolled back';
  END IF;

  -- Return the booking ID
  RETURN v_booking_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_booking FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_booking TO authenticated;
