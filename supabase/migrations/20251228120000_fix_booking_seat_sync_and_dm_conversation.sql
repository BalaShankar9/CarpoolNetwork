/*
  # Fix booking seat sync conflicts and add friends DM RPC

  1. Booking seat sync
    - Remove manual available_seats updates from booking RPCs.
    - Rely on recalculate_ride_seats trigger for consistency.

  2. Friends DM
    - Add get_or_create_friends_conversation() for secure DM creation.
*/

-- Ensure request_booking relies on seat sync trigger (avoid double-decrement)
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
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_seats_requested < 1 THEN
    RAISE EXCEPTION 'Must request at least 1 seat';
  END IF;

  SELECT available_seats, status
  INTO v_available_seats, v_ride_status
  FROM rides
  WHERE id = p_ride_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;

  IF v_ride_status != 'active' THEN
    RAISE EXCEPTION 'Ride is not active (status: %)', v_ride_status;
  END IF;

  IF v_available_seats < p_seats_requested THEN
    RAISE EXCEPTION 'Not enough seats available (available: %, requested: %)',
      v_available_seats, p_seats_requested;
  END IF;

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

  RETURN v_booking_id;
END;
$$;

-- Align cancel_booking with seat sync trigger (avoid double-increment)
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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_booking
  FROM ride_bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.passenger_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to cancel this booking';
  END IF;

  IF v_booking.status = 'cancelled' THEN
    RAISE EXCEPTION 'Booking is already cancelled';
  END IF;

  IF v_booking.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Cannot cancel booking with status: %', v_booking.status;
  END IF;

  SELECT * INTO v_ride
  FROM rides
  WHERE id = v_booking.ride_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;

  DECLARE
    v_is_last_minute boolean;
  BEGIN
    v_is_last_minute := (v_ride.departure_time - now()) <= interval '2 hours';
  END;

  UPDATE ride_bookings
  SET
    status = 'cancelled',
    cancellation_reason = p_reason,
    cancelled_at = now(),
    is_last_minute_cancellation = v_is_last_minute,
    updated_at = now()
  WHERE id = p_booking_id;

  INSERT INTO booking_history (booking_id, user_id, action, reason)
  VALUES (p_booking_id, auth.uid(), 'cancelled', p_reason);
END;
$$;

-- Align driver_decide_booking with seat sync trigger
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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_decision NOT IN ('confirmed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid decision. Must be ''confirmed'' or ''cancelled''';
  END IF;

  SELECT * INTO v_booking
  FROM ride_bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  SELECT * INTO v_ride
  FROM rides
  WHERE id = v_booking.ride_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;

  IF v_ride.driver_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to manage this booking';
  END IF;

  IF p_decision = 'confirmed' THEN
    IF v_booking.status != 'pending' THEN
      RAISE EXCEPTION 'Can only confirm pending bookings. Current status: %', v_booking.status;
    END IF;

    UPDATE ride_bookings
    SET
      status = 'confirmed',
      updated_at = now()
    WHERE id = p_booking_id;

    INSERT INTO booking_history (booking_id, user_id, action, reason)
    VALUES (p_booking_id, auth.uid(), 'confirmed', NULL);
  ELSIF p_decision = 'cancelled' THEN
    IF v_booking.status NOT IN ('pending', 'confirmed') THEN
      RAISE EXCEPTION 'Can only decline pending or confirmed bookings. Current status: %', v_booking.status;
    END IF;

    UPDATE ride_bookings
    SET
      status = 'cancelled',
      cancellation_reason = 'Declined by driver',
      cancelled_at = now(),
      is_last_minute_cancellation = false,
      updated_at = now()
    WHERE id = p_booking_id;

    INSERT INTO booking_history (booking_id, user_id, action, reason)
    VALUES (p_booking_id, auth.uid(), 'declined', 'Declined by driver');
  END IF;
END;
$$;

-- Align cancel_booking_with_impact with seat sync trigger
CREATE OR REPLACE FUNCTION public.cancel_booking_with_impact(
  p_booking_id uuid,
  p_reason text DEFAULT 'No reason provided'
)
RETURNS TABLE(
  success boolean,
  reliability_impact integer,
  new_reliability_score integer,
  warning_issued boolean,
  restriction_applied boolean,
  message text
) AS $$
DECLARE
  booking_rec RECORD;
  ride_rec RECORD;
  user_reliability RECORD;
  hours_before numeric;
  impact_score integer := 0;
  warning_issued boolean := false;
  restriction_applied boolean := false;
  new_score integer;
  is_exempt boolean := false;
BEGIN
  SELECT * INTO booking_rec FROM ride_bookings
  WHERE id = p_booking_id
  AND passenger_id = auth.uid()
  AND status IN ('pending', 'confirmed');

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 0, false, false, 'Booking not found or cannot be cancelled'::text;
    RETURN;
  END IF;

  SELECT * INTO ride_rec FROM rides WHERE id = booking_rec.ride_id;

  hours_before := EXTRACT(EPOCH FROM (ride_rec.departure_time - now())) / 3600;

  SELECT * INTO user_reliability FROM reliability_scores WHERE user_id = auth.uid();

  IF user_reliability.is_in_grace_period AND user_reliability.grace_rides_remaining > 0 THEN
    impact_score := impact_score / 2;
  END IF;

  IF hours_before < 0 THEN
    impact_score := 20;
    is_exempt := false;
  ELSIF hours_before < 2 THEN
    impact_score := 15;
    UPDATE reliability_scores
    SET last_minute_cancellations = last_minute_cancellations + 1
    WHERE user_id = auth.uid();
  ELSIF hours_before < 24 THEN
    impact_score := 10;
  ELSIF hours_before < 48 THEN
    impact_score := 5;
  ELSE
    impact_score := 2;
  END IF;

  IF p_reason ILIKE '%emergency%' OR p_reason ILIKE '%medical%' THEN
    is_exempt := true;
    impact_score := 0;
  END IF;

  UPDATE ride_bookings
  SET
    status = 'cancelled',
    cancellation_reason = p_reason,
    cancelled_at = now(),
    is_last_minute_cancellation = (hours_before < 2),
    updated_at = now()
  WHERE id = p_booking_id;

  INSERT INTO cancellation_history (
    user_id,
    ride_id,
    booking_id,
    cancellation_type,
    user_role,
    hours_before_departure,
    cancellation_reason,
    reliability_impact,
    is_exempt,
    exemption_reason
  ) VALUES (
    auth.uid(),
    booking_rec.ride_id,
    p_booking_id,
    'booking',
    'passenger',
    hours_before,
    p_reason,
    impact_score,
    is_exempt,
    CASE WHEN is_exempt THEN p_reason ELSE NULL END
  );

  IF NOT is_exempt THEN
    UPDATE reliability_scores
    SET
      reliability_score = GREATEST(0, reliability_score - impact_score),
      cancelled_rides = cancelled_rides + 1,
      cancellation_ratio = (cancelled_rides + 1)::numeric / NULLIF(total_rides, 0),
      last_updated = now()
    WHERE user_id = auth.uid()
    RETURNING reliability_score INTO new_score;
  ELSE
    SELECT reliability_score INTO new_score FROM reliability_scores WHERE user_id = auth.uid();
  END IF;

  IF (SELECT COUNT(*) FROM cancellation_history
      WHERE user_id = auth.uid()
      AND created_at > now() - interval '30 days') >= 3 THEN

    warning_issued := true;

    UPDATE reliability_scores
    SET
      warnings_count = warnings_count + 1,
      last_warning_at = now()
    WHERE user_id = auth.uid();

    INSERT INTO notification_queue (
      user_id,
      notification_type,
      title,
      message,
      data,
      priority
    ) VALUES (
      auth.uid(),
      'reliability_warning',
      'Reliability Warning',
      'You have cancelled ' || (SELECT warnings_count FROM reliability_scores WHERE user_id = auth.uid()) || ' rides in the past 30 days. Frequent cancellations may result in booking restrictions.',
      jsonb_build_object('reliability_score', new_score),
      'high'
    );
  END IF;

  IF new_score < 50 OR user_reliability.warnings_count >= 3 THEN
    restriction_applied := true;

    INSERT INTO booking_restrictions (
      user_id,
      restriction_type,
      reason,
      starts_at,
      ends_at
    ) VALUES (
      auth.uid(),
      'temporary_ban',
      'Reliability score below threshold or excessive cancellations',
      now(),
      now() + interval '7 days'
    );

    INSERT INTO notification_queue (
      user_id,
      notification_type,
      title,
      message,
      data,
      priority
    ) VALUES (
      auth.uid(),
      'booking_restricted',
      'Booking Restricted',
      'Your booking privileges have been temporarily restricted due to reliability concerns. This will be reviewed in 7 days.',
      jsonb_build_object('restriction_duration_days', 7, 'new_score', new_score),
      'urgent'
    );
  END IF;

  INSERT INTO notification_queue (
    user_id,
    notification_type,
    title,
    message,
    data,
    priority
  ) VALUES (
    ride_rec.driver_id,
    'booking_cancelled',
    'Booking Cancelled',
    'A passenger has cancelled their booking (' || booking_rec.seats_requested || ' seat(s) now available)',
    jsonb_build_object(
      'ride_id', booking_rec.ride_id,
      'booking_id', p_booking_id,
      'seats_freed', booking_rec.seats_requested
    ),
    'high'
  );

  PERFORM promote_from_waitlist(booking_rec.ride_id);

  RETURN QUERY SELECT
    true,
    impact_score,
    new_score,
    warning_issued,
    restriction_applied,
    'Booking cancelled successfully'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ride and trip conversation helpers with RLS bypass
CREATE OR REPLACE FUNCTION public.get_or_create_ride_conversation(
  p_ride_id uuid,
  p_driver_id uuid,
  p_rider_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security TO off
AS $$
DECLARE
  v_conversation_id uuid;
  v_ride_driver_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT driver_id INTO v_ride_driver_id
  FROM rides
  WHERE id = p_ride_id;

  IF v_ride_driver_id IS NULL THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;

  IF v_ride_driver_id <> p_driver_id THEN
    RAISE EXCEPTION 'Driver mismatch for ride';
  END IF;

  IF auth.uid() NOT IN (p_driver_id, p_rider_id) THEN
    RAISE EXCEPTION 'Not authorized to create this conversation';
  END IF;

  SELECT c.id INTO v_conversation_id
  FROM conversations c
  WHERE c.type = 'RIDE_MATCH'
    AND c.ride_id = p_ride_id
    AND EXISTS (
      SELECT 1 FROM conversation_members cm1
      WHERE cm1.conversation_id = c.id
        AND cm1.user_id = p_driver_id
    )
    AND EXISTS (
      SELECT 1 FROM conversation_members cm2
      WHERE cm2.conversation_id = c.id
        AND cm2.user_id = p_rider_id
    )
    AND (
      SELECT COUNT(*) FROM conversation_members cmc
      WHERE cmc.conversation_id = c.id
    ) = 2
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (type, ride_id)
    VALUES ('RIDE_MATCH', p_ride_id)
    RETURNING id INTO v_conversation_id;

    INSERT INTO conversation_members (conversation_id, user_id, role)
    VALUES
      (v_conversation_id, p_driver_id, 'DRIVER'),
      (v_conversation_id, p_rider_id, 'RIDER');
  END IF;

  RETURN v_conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_ride_conversation(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_ride_conversation(uuid, uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_or_create_trip_conversation(
  p_trip_request_id uuid,
  p_rider_id uuid,
  p_driver_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security TO off
AS $$
DECLARE
  v_conversation_id uuid;
  v_trip_rider_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT rider_id INTO v_trip_rider_id
  FROM trip_requests
  WHERE id = p_trip_request_id;

  IF v_trip_rider_id IS NULL THEN
    RAISE EXCEPTION 'Trip request not found';
  END IF;

  IF v_trip_rider_id <> p_rider_id THEN
    RAISE EXCEPTION 'Rider mismatch for trip request';
  END IF;

  IF auth.uid() NOT IN (p_rider_id, p_driver_id) THEN
    RAISE EXCEPTION 'Not authorized to create this conversation';
  END IF;

  SELECT c.id INTO v_conversation_id
  FROM conversations c
  WHERE c.type = 'TRIP_MATCH'
    AND c.trip_request_id = p_trip_request_id
    AND EXISTS (
      SELECT 1 FROM conversation_members cm1
      WHERE cm1.conversation_id = c.id
        AND cm1.user_id = p_rider_id
    )
    AND EXISTS (
      SELECT 1 FROM conversation_members cm2
      WHERE cm2.conversation_id = c.id
        AND cm2.user_id = p_driver_id
    )
    AND (
      SELECT COUNT(*) FROM conversation_members cmc
      WHERE cmc.conversation_id = c.id
    ) = 2
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (type, trip_request_id)
    VALUES ('TRIP_MATCH', p_trip_request_id)
    RETURNING id INTO v_conversation_id;

    INSERT INTO conversation_members (conversation_id, user_id, role)
    VALUES
      (v_conversation_id, p_rider_id, 'RIDER'),
      (v_conversation_id, p_driver_id, 'DRIVER');
  END IF;

  RETURN v_conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_trip_conversation(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_trip_conversation(uuid, uuid, uuid) TO authenticated;

-- Friends DM conversation helper
CREATE OR REPLACE FUNCTION public.get_or_create_friends_conversation(
  p_user_id_1 uuid,
  p_user_id_2 uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security TO off
AS $$
DECLARE
  v_conversation_id uuid;
  v_user_a uuid;
  v_user_b uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF auth.uid() NOT IN (p_user_id_1, p_user_id_2) THEN
    RAISE EXCEPTION 'Not authorized to create this conversation';
  END IF;

  v_user_a := LEAST(p_user_id_1, p_user_id_2);
  v_user_b := GREATEST(p_user_id_1, p_user_id_2);

  SELECT c.id INTO v_conversation_id
  FROM conversations c
  WHERE c.type = 'FRIENDS_DM'
  AND EXISTS (
    SELECT 1 FROM conversation_members cm1
    WHERE cm1.conversation_id = c.id
    AND cm1.user_id = v_user_a
  )
  AND EXISTS (
    SELECT 1 FROM conversation_members cm2
    WHERE cm2.conversation_id = c.id
    AND cm2.user_id = v_user_b
  )
  AND (
    SELECT COUNT(*) FROM conversation_members cmc
    WHERE cmc.conversation_id = c.id
  ) = 2
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (type)
    VALUES ('FRIENDS_DM')
    RETURNING id INTO v_conversation_id;

    INSERT INTO conversation_members (conversation_id, user_id, role)
    VALUES
      (v_conversation_id, p_user_id_1, 'FRIEND'),
      (v_conversation_id, p_user_id_2, 'FRIEND');
  END IF;

  RETURN v_conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_friends_conversation(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_friends_conversation(uuid, uuid) TO authenticated;
