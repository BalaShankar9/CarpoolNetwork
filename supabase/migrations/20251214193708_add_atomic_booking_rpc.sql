/*
  # Add Atomic Booking System to Prevent Overbooking

  1. New Function
    - `request_booking` - Atomic function that handles ride booking in a single transaction
      - Locks ride row to prevent race conditions
      - Validates available seats, ride status, and seat request
      - Inserts booking record
      - Decrements available_seats atomically
      - Returns booking ID on success

  2. Constraints
    - Unique partial index on (ride_id, passenger_id) for non-cancelled bookings
      - Prevents double-booking by same user
      - Only applies to active bookings (not cancelled)

  3. Security
    - Function requires authentication (auth.uid() must exist)
    - SECURITY DEFINER to allow RLS bypass for atomic operations
    - GRANT EXECUTE to authenticated users only
    - REVOKE ALL from PUBLIC

  4. Error Handling
    - Raises exceptions for:
      - Unauthenticated users
      - Invalid seat requests (< 1)
      - Insufficient available seats
      - Inactive rides
      - Ride not found
*/

-- Create unique index to prevent double-booking by same passenger
-- Only applies to non-cancelled bookings
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_booking_per_passenger
  ON ride_bookings(ride_id, passenger_id)
  WHERE status != 'cancelled';

-- Create atomic booking function
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
  SELECT available_seats, status
  INTO v_available_seats, v_ride_status
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

  -- Return the booking ID
  RETURN v_booking_id;
END;
$$;

-- Set up permissions
REVOKE ALL ON FUNCTION public.request_booking FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_booking TO authenticated;