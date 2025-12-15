/*
  # Atomic Matching System Functions

  1. Core Functions
    - `driver_accept_ride_request` - Driver accepts a rider's request
    - `driver_decline_ride_request` - Driver declines a rider's request
    - `confirm_ride_request` - Rider confirms an accepted request (final booking)
    - `confirm_trip_offer` - Rider confirms a driver's offer

  2. Concurrency Safety
    - Row-level locks (FOR UPDATE) to prevent race conditions
    - Atomic seat allocation
    - Auto-cancel conflicting requests/offers

  3. Business Logic
    - Validates ownership and status transitions
    - Enforces seat availability
    - Creates conversations when confirmed
    - Auto-cancels competing requests for same trip context
    - Returns detailed success/failure reasons
*/

-- Function: Driver accepts a ride request
CREATE OR REPLACE FUNCTION driver_accept_ride_request(
  p_ride_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id uuid;
  v_ride_id uuid;
  v_current_status text;
BEGIN
  v_driver_id := auth.uid();
  
  IF v_driver_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_AUTHENTICATED');
  END IF;

  -- Get and lock the request
  SELECT rr.ride_id, rr.status
  INTO v_ride_id, v_current_status
  FROM ride_requests rr
  WHERE rr.id = p_ride_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'REQUEST_NOT_FOUND');
  END IF;

  -- Verify driver owns the ride
  IF NOT EXISTS (
    SELECT 1 FROM rides
    WHERE id = v_ride_id AND driver_id = v_driver_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_YOUR_RIDE');
  END IF;

  -- Only accept if pending
  IF v_current_status != 'PENDING_DRIVER' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INVALID_STATUS', 'current_status', v_current_status);
  END IF;

  -- Accept the request
  UPDATE ride_requests
  SET 
    status = 'ACCEPTED_BY_DRIVER',
    expires_at = now() + interval '15 minutes',
    updated_at = now()
  WHERE id = p_ride_request_id;

  -- Create notification for rider
  INSERT INTO notifications (user_id, type, title, message, data)
  SELECT 
    rider_id,
    'booking-confirmed',
    'Request Accepted',
    'The driver has accepted your ride request!',
    jsonb_build_object('ride_request_id', p_ride_request_id, 'ride_id', v_ride_id)
  FROM ride_requests
  WHERE id = p_ride_request_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Function: Driver declines a ride request
CREATE OR REPLACE FUNCTION driver_decline_ride_request(
  p_ride_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id uuid;
  v_ride_id uuid;
  v_current_status text;
BEGIN
  v_driver_id := auth.uid();
  
  IF v_driver_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_AUTHENTICATED');
  END IF;

  -- Get and lock the request
  SELECT rr.ride_id, rr.status
  INTO v_ride_id, v_current_status
  FROM ride_requests rr
  WHERE rr.id = p_ride_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'REQUEST_NOT_FOUND');
  END IF;

  -- Verify driver owns the ride
  IF NOT EXISTS (
    SELECT 1 FROM rides
    WHERE id = v_ride_id AND driver_id = v_driver_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_YOUR_RIDE');
  END IF;

  -- Only decline if pending
  IF v_current_status != 'PENDING_DRIVER' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INVALID_STATUS', 'current_status', v_current_status);
  END IF;

  -- Decline the request
  UPDATE ride_requests
  SET 
    status = 'DECLINED_BY_DRIVER',
    updated_at = now()
  WHERE id = p_ride_request_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Function: Rider confirms an accepted request (final booking)
CREATE OR REPLACE FUNCTION confirm_ride_request(
  p_ride_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rider_id uuid;
  v_ride_id uuid;
  v_driver_id uuid;
  v_seats_requested integer;
  v_available_seats integer;
  v_current_status text;
  v_ride_origin text;
  v_ride_destination text;
  v_ride_departure timestamp;
  v_booking_id uuid;
  v_conversation_id uuid;
BEGIN
  v_rider_id := auth.uid();
  
  IF v_rider_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_AUTHENTICATED');
  END IF;

  -- Get and lock the request
  SELECT rr.ride_id, rr.rider_id, rr.seats_requested, rr.status
  INTO v_ride_id, v_rider_id, v_seats_requested, v_current_status
  FROM ride_requests rr
  WHERE rr.id = p_ride_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'REQUEST_NOT_FOUND');
  END IF;

  -- Verify caller is the rider
  IF v_rider_id != auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_YOUR_REQUEST');
  END IF;

  -- Only confirm if accepted by driver
  IF v_current_status != 'ACCEPTED_BY_DRIVER' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_ACCEPTED', 'current_status', v_current_status);
  END IF;

  -- Lock the ride and check seats
  SELECT r.available_seats, r.driver_id, r.origin, r.destination, r.departure_time
  INTO v_available_seats, v_driver_id, v_ride_origin, v_ride_destination, v_ride_departure
  FROM rides r
  WHERE r.id = v_ride_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'RIDE_NOT_FOUND');
  END IF;

  -- Check if enough seats available
  IF v_available_seats < v_seats_requested THEN
    -- Mark as expired
    UPDATE ride_requests
    SET status = 'EXPIRED', updated_at = now()
    WHERE id = p_ride_request_id;
    
    RETURN jsonb_build_object('ok', false, 'reason', 'SEATS_FULL', 'available', v_available_seats, 'requested', v_seats_requested);
  END IF;

  -- SUCCESS PATH: Create booking
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
  )
  SELECT
    v_ride_id,
    v_rider_id,
    r.origin,
    r.origin_lat,
    r.origin_lng,
    r.destination,
    r.destination_lat,
    r.destination_lng,
    v_seats_requested,
    'confirmed'
  FROM rides r
  WHERE r.id = v_ride_id
  RETURNING id INTO v_booking_id;

  -- Update ride: decrement available_seats, increment seats_taken
  UPDATE rides
  SET 
    available_seats = available_seats - v_seats_requested,
    seats_taken = seats_taken + v_seats_requested,
    updated_at = now()
  WHERE id = v_ride_id;

  -- Mark this request as confirmed
  UPDATE ride_requests
  SET status = 'CONFIRMED', updated_at = now()
  WHERE id = p_ride_request_id;

  -- Auto-cancel rider's other requests for same trip context
  -- (same origin/destination, same day)
  UPDATE ride_requests rr
  SET status = 'CANCELLED_BY_RIDER', updated_at = now()
  WHERE rr.rider_id = v_rider_id
    AND rr.id != p_ride_request_id
    AND rr.status IN ('PENDING_DRIVER', 'ACCEPTED_BY_DRIVER')
    AND EXISTS (
      SELECT 1 FROM rides r
      WHERE r.id = rr.ride_id
        AND r.origin = v_ride_origin
        AND r.destination = v_ride_destination
        AND DATE(r.departure_time) = DATE(v_ride_departure)
    );

  -- Create conversation
  v_conversation_id := get_or_create_ride_conversation(v_ride_id, v_driver_id, v_rider_id);

  -- Create notifications
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    v_driver_id,
    'booking-confirmed',
    'Booking Confirmed',
    'A rider has confirmed their booking!',
    jsonb_build_object('booking_id', v_booking_id, 'ride_id', v_ride_id, 'rider_id', v_rider_id)
  );

  RETURN jsonb_build_object('ok', true, 'booking_id', v_booking_id, 'conversation_id', v_conversation_id);
END;
$$;

-- Function: Rider confirms a trip offer
CREATE OR REPLACE FUNCTION confirm_trip_offer(
  p_trip_offer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rider_id uuid;
  v_trip_request_id uuid;
  v_driver_id uuid;
  v_current_status text;
  v_trip_status text;
  v_conversation_id uuid;
BEGIN
  v_rider_id := auth.uid();
  
  IF v_rider_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_AUTHENTICATED');
  END IF;

  -- Get and lock the offer
  SELECT toff.trip_request_id, toff.driver_id, toff.status
  INTO v_trip_request_id, v_driver_id, v_current_status
  FROM trip_offers toff
  WHERE toff.id = p_trip_offer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'OFFER_NOT_FOUND');
  END IF;

  -- Verify caller owns the trip request
  SELECT tr.rider_id, tr.status
  INTO v_rider_id, v_trip_status
  FROM trip_requests tr
  WHERE tr.id = v_trip_request_id
  FOR UPDATE;

  IF v_rider_id != auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_YOUR_TRIP');
  END IF;

  -- Only confirm if trip is open and offer is offered
  IF v_trip_status != 'OPEN' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'TRIP_NOT_OPEN', 'trip_status', v_trip_status);
  END IF;

  IF v_current_status != 'OFFERED' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'OFFER_NOT_AVAILABLE', 'offer_status', v_current_status);
  END IF;

  -- Confirm the offer
  UPDATE trip_offers
  SET status = 'CONFIRMED', updated_at = now()
  WHERE id = p_trip_offer_id;

  -- Update trip request status
  UPDATE trip_requests
  SET status = 'CONFIRMED', updated_at = now()
  WHERE id = v_trip_request_id;

  -- Auto-decline all other offers for this trip
  UPDATE trip_offers
  SET status = 'DECLINED_BY_RIDER', updated_at = now()
  WHERE trip_request_id = v_trip_request_id
    AND id != p_trip_offer_id
    AND status = 'OFFERED';

  -- Create conversation
  v_conversation_id := get_or_create_trip_conversation(v_trip_request_id, v_rider_id, v_driver_id);

  -- Create notifications
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    v_driver_id,
    'booking-confirmed',
    'Trip Offer Accepted',
    'Your trip offer has been accepted!',
    jsonb_build_object('trip_offer_id', p_trip_offer_id, 'trip_request_id', v_trip_request_id)
  );

  RETURN jsonb_build_object('ok', true, 'conversation_id', v_conversation_id);
END;
$$;

-- Grant execute permissions
REVOKE ALL ON FUNCTION driver_accept_ride_request FROM PUBLIC;
GRANT EXECUTE ON FUNCTION driver_accept_ride_request TO authenticated;

REVOKE ALL ON FUNCTION driver_decline_ride_request FROM PUBLIC;
GRANT EXECUTE ON FUNCTION driver_decline_ride_request TO authenticated;

REVOKE ALL ON FUNCTION confirm_ride_request FROM PUBLIC;
GRANT EXECUTE ON FUNCTION confirm_ride_request TO authenticated;

REVOKE ALL ON FUNCTION confirm_trip_offer FROM PUBLIC;
GRANT EXECUTE ON FUNCTION confirm_trip_offer TO authenticated;
