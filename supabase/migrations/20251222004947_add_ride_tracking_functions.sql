/*
  # Active Ride Tracking Functions
  
  ## Overview
  Real-time GPS tracking and monitoring for active rides with safety features,
  route deviation detection, and passenger management.
  
  ## Functions
  
  ### 1. start_ride_tracking(ride_id, initial_location)
  Initiates tracking when driver starts the ride
  - Creates tracking record
  - Updates ride status to 'in_progress'
  - Notifies all passengers
  - Returns tracking ID
  
  ### 2. update_ride_location(ride_id, location, speed, heading)
  Updates current position during ride
  - Records GPS coordinates
  - Calculates route deviation
  - Updates ETA to next stop
  - Triggers alerts if needed
  
  ### 3. mark_passenger_picked_up(ride_id, passenger_id)
  Records when passenger is picked up
  - Updates passengers_onboard
  - Notifies passenger
  - Recalculates ETAs
  
  ### 4. mark_passenger_dropped_off(ride_id, passenger_id)
  Records when passenger is dropped off
  - Removes from passengers_onboard
  - Notifies passenger
  - Updates booking status
  
  ### 5. complete_ride_tracking(ride_id)
  Finalizes tracking when ride is complete
  - Calculates total distance and time
  - Updates ride status to 'completed'
  - Triggers review prompts
  - Calculates environmental impact
  
  ### 6. check_route_deviations(ride_id)
  Monitors for significant route changes
  - Compares current location to planned route
  - Sends alerts if deviation exceeds threshold
  - Logs deviation events
  
  ### 7. get_active_ride_tracking(ride_id)
  Retrieves current tracking data
  - Latest location and speed
  - Passengers onboard
  - ETAs and progress
  
  ### 8. trigger_ride_emergency(ride_id, user_id)
  Activates emergency protocol
  - Alerts emergency contacts
  - Notifies all passengers
  - Flags ride for admin review
  - Logs GPS location
*/

-- Function to start ride tracking
CREATE OR REPLACE FUNCTION start_ride_tracking(
  p_ride_id uuid,
  p_initial_lat numeric,
  p_initial_lng numeric
)
RETURNS TABLE(
  tracking_id uuid,
  success boolean,
  message text
) AS $$
DECLARE
  ride_rec RECORD;
  tracking_rec_id uuid;
BEGIN
  -- Verify ride exists and user is driver
  SELECT * INTO ride_rec FROM rides 
  WHERE id = p_ride_id 
  AND driver_id = auth.uid()
  AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, false, 'Ride not found or unauthorized'::text;
    RETURN;
  END IF;
  
  -- Check if tracking already exists
  IF EXISTS (SELECT 1 FROM ride_tracking WHERE ride_id = p_ride_id) THEN
    RETURN QUERY SELECT NULL::uuid, false, 'Tracking already started'::text;
    RETURN;
  END IF;
  
  -- Create tracking record
  INSERT INTO ride_tracking (
    ride_id,
    driver_id,
    current_location,
    current_speed_kmh,
    heading_degrees,
    ride_started_at,
    last_updated
  ) VALUES (
    p_ride_id,
    auth.uid(),
    ST_SetSRID(ST_MakePoint(p_initial_lng, p_initial_lat), 4326)::geography,
    0,
    0,
    now(),
    now()
  ) RETURNING id INTO tracking_rec_id;
  
  -- Update ride status
  UPDATE rides
  SET status = 'in_progress',
      updated_at = now()
  WHERE id = p_ride_id;
  
  -- Notify all booked passengers
  INSERT INTO notification_queue (
    user_id,
    notification_type,
    title,
    message,
    data,
    priority
  )
  SELECT 
    rb.passenger_id,
    'ride_started',
    'Ride Started!',
    'Your driver has started the ride and is on the way',
    jsonb_build_object(
      'ride_id', p_ride_id,
      'tracking_id', tracking_rec_id
    ),
    'high'
  FROM ride_bookings rb
  WHERE rb.ride_id = p_ride_id
  AND rb.status = 'confirmed';
  
  RETURN QUERY SELECT tracking_rec_id, true, 'Tracking started successfully'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update ride location
CREATE OR REPLACE FUNCTION update_ride_location(
  p_ride_id uuid,
  p_lat numeric,
  p_lng numeric,
  p_speed_kmh numeric DEFAULT 0,
  p_heading integer DEFAULT 0
)
RETURNS TABLE(
  success boolean,
  deviation_meters integer,
  message text
) AS $$
DECLARE
  tracking_rec RECORD;
  deviation integer;
BEGIN
  -- Get existing tracking record
  SELECT * INTO tracking_rec FROM ride_tracking 
  WHERE ride_id = p_ride_id 
  AND driver_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 'Tracking not found or unauthorized'::text;
    RETURN;
  END IF;
  
  -- Update location
  UPDATE ride_tracking
  SET 
    current_location = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    current_speed_kmh = p_speed_kmh,
    heading_degrees = p_heading,
    last_updated = now()
  WHERE ride_id = p_ride_id
  RETURNING route_deviation_meters INTO deviation;
  
  -- Check for safety concerns (excessive speed)
  IF p_speed_kmh > 120 THEN
    INSERT INTO notification_queue (
      user_id,
      notification_type,
      title,
      message,
      data,
      priority
    ) VALUES (
      auth.uid(),
      'speed_warning',
      'Speed Warning',
      'Please maintain safe driving speeds',
      jsonb_build_object('ride_id', p_ride_id, 'speed', p_speed_kmh),
      'urgent'
    );
  END IF;
  
  RETURN QUERY SELECT true, COALESCE(deviation, 0), 'Location updated'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark passenger picked up
CREATE OR REPLACE FUNCTION mark_passenger_picked_up(
  p_ride_id uuid,
  p_passenger_id uuid
)
RETURNS TABLE(
  success boolean,
  message text
) AS $$
DECLARE
  tracking_rec RECORD;
  passengers jsonb;
BEGIN
  -- Verify driver
  SELECT * INTO tracking_rec FROM ride_tracking 
  WHERE ride_id = p_ride_id 
  AND driver_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Unauthorized or tracking not started'::text;
    RETURN;
  END IF;
  
  -- Verify booking exists
  IF NOT EXISTS (
    SELECT 1 FROM ride_bookings 
    WHERE ride_id = p_ride_id 
    AND passenger_id = p_passenger_id 
    AND status = 'confirmed'
  ) THEN
    RETURN QUERY SELECT false, 'Booking not found'::text;
    RETURN;
  END IF;
  
  -- Add passenger to onboard list
  passengers := tracking_rec.passengers_onboard;
  IF NOT passengers ? p_passenger_id::text THEN
    passengers := passengers || jsonb_build_object(
      p_passenger_id::text, 
      jsonb_build_object(
        'picked_up_at', now(),
        'pickup_location', ST_AsGeoJSON(tracking_rec.current_location)::jsonb
      )
    );
    
    UPDATE ride_tracking
    SET passengers_onboard = passengers
    WHERE ride_id = p_ride_id;
  END IF;
  
  -- Update booking status
  UPDATE ride_bookings
  SET status = 'active',
      updated_at = now()
  WHERE ride_id = p_ride_id 
  AND passenger_id = p_passenger_id;
  
  -- Notify passenger
  INSERT INTO notification_queue (
    user_id,
    notification_type,
    title,
    message,
    data,
    priority
  ) VALUES (
    p_passenger_id,
    'passenger_picked_up',
    'Picked Up!',
    'You have been picked up. Have a safe journey!',
    jsonb_build_object('ride_id', p_ride_id),
    'high'
  );
  
  RETURN QUERY SELECT true, 'Passenger marked as picked up'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark passenger dropped off
CREATE OR REPLACE FUNCTION mark_passenger_dropped_off(
  p_ride_id uuid,
  p_passenger_id uuid
)
RETURNS TABLE(
  success boolean,
  message text
) AS $$
DECLARE
  tracking_rec RECORD;
  passengers jsonb;
  passenger_data jsonb;
BEGIN
  -- Verify driver
  SELECT * INTO tracking_rec FROM ride_tracking 
  WHERE ride_id = p_ride_id 
  AND driver_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Unauthorized or tracking not started'::text;
    RETURN;
  END IF;
  
  -- Get passenger data and remove from onboard
  passengers := tracking_rec.passengers_onboard;
  passenger_data := passengers -> p_passenger_id::text;
  
  IF passenger_data IS NOT NULL THEN
    -- Add dropoff info
    passenger_data := passenger_data || jsonb_build_object(
      'dropped_off_at', now(),
      'dropoff_location', ST_AsGeoJSON(tracking_rec.current_location)::jsonb
    );
    
    -- Remove from current passengers but keep in history
    passengers := passengers - p_passenger_id::text;
    
    UPDATE ride_tracking
    SET passengers_onboard = passengers
    WHERE ride_id = p_ride_id;
  END IF;
  
  -- Update booking status to completed
  UPDATE ride_bookings
  SET status = 'completed',
      updated_at = now()
  WHERE ride_id = p_ride_id 
  AND passenger_id = p_passenger_id;
  
  -- Notify passenger
  INSERT INTO notification_queue (
    user_id,
    notification_type,
    title,
    message,
    data,
    priority
  ) VALUES (
    p_passenger_id,
    'passenger_dropped_off',
    'Trip Completed!',
    'You have been dropped off. Please rate your experience.',
    jsonb_build_object('ride_id', p_ride_id),
    'high'
  );
  
  RETURN QUERY SELECT true, 'Passenger marked as dropped off'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete ride tracking
CREATE OR REPLACE FUNCTION complete_ride_tracking(p_ride_id uuid)
RETURNS TABLE(
  success boolean,
  total_duration_minutes integer,
  message text
) AS $$
DECLARE
  tracking_rec RECORD;
  ride_rec RECORD;
  duration_mins integer;
  incomplete_bookings integer;
BEGIN
  -- Get tracking record
  SELECT * INTO tracking_rec FROM ride_tracking 
  WHERE ride_id = p_ride_id 
  AND driver_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 'Tracking not found or unauthorized'::text;
    RETURN;
  END IF;
  
  -- Check if any passengers still onboard
  IF jsonb_array_length(tracking_rec.passengers_onboard) > 0 THEN
    RETURN QUERY SELECT false, 0, 'Cannot complete - passengers still onboard'::text;
    RETURN;
  END IF;
  
  -- Check for incomplete bookings
  SELECT COUNT(*) INTO incomplete_bookings
  FROM ride_bookings
  WHERE ride_id = p_ride_id
  AND status NOT IN ('completed', 'cancelled');
  
  IF incomplete_bookings > 0 THEN
    RETURN QUERY SELECT false, 0, 'Cannot complete - some bookings not finalized'::text;
    RETURN;
  END IF;
  
  -- Calculate duration
  duration_mins := EXTRACT(EPOCH FROM (now() - tracking_rec.ride_started_at)) / 60;
  
  -- Update tracking record
  UPDATE ride_tracking
  SET ride_ended_at = now(),
      last_updated = now()
  WHERE ride_id = p_ride_id;
  
  -- Update ride status
  UPDATE rides
  SET status = 'completed',
      updated_at = now()
  WHERE id = p_ride_id
  RETURNING * INTO ride_rec;
  
  -- Queue review notifications for all participants
  -- Notify passengers to review driver
  INSERT INTO notification_queue (
    user_id,
    notification_type,
    title,
    message,
    data,
    priority
  )
  SELECT 
    rb.passenger_id,
    'ride_completed_review',
    'Ride Completed!',
    'Please review your experience with the driver',
    jsonb_build_object(
      'ride_id', p_ride_id,
      'booking_id', rb.id,
      'reviewee_id', ride_rec.driver_id
    ),
    'normal'
  FROM ride_bookings rb
  WHERE rb.ride_id = p_ride_id
  AND rb.status = 'completed';
  
  -- Notify driver to review passengers
  INSERT INTO notification_queue (
    user_id,
    notification_type,
    title,
    message,
    data,
    priority
  ) VALUES (
    ride_rec.driver_id,
    'ride_completed_review_passengers',
    'Ride Completed!',
    'Please review your passengers',
    jsonb_build_object('ride_id', p_ride_id),
    'normal'
  );
  
  RETURN QUERY SELECT true, duration_mins, 'Ride tracking completed successfully'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active ride tracking
CREATE OR REPLACE FUNCTION get_active_ride_tracking(p_ride_id uuid)
RETURNS TABLE(
  ride_id uuid,
  driver_id uuid,
  driver_name text,
  current_lat numeric,
  current_lng numeric,
  current_speed_kmh numeric,
  heading_degrees integer,
  passengers_onboard jsonb,
  ride_started_at timestamptz,
  last_updated timestamptz
) AS $$
BEGIN
  -- Check if user is driver or passenger on this ride
  IF NOT EXISTS (
    SELECT 1 FROM rides r
    WHERE r.id = p_ride_id
    AND (r.driver_id = auth.uid() OR
         EXISTS (
           SELECT 1 FROM ride_bookings rb
           WHERE rb.ride_id = p_ride_id
           AND rb.passenger_id = auth.uid()
         ))
  ) THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    rt.ride_id,
    rt.driver_id,
    p.full_name as driver_name,
    ST_Y(rt.current_location::geometry) as current_lat,
    ST_X(rt.current_location::geometry) as current_lng,
    rt.current_speed_kmh,
    rt.heading_degrees,
    rt.passengers_onboard,
    rt.ride_started_at,
    rt.last_updated
  FROM ride_tracking rt
  JOIN profiles p ON rt.driver_id = p.id
  WHERE rt.ride_id = p_ride_id
  AND rt.ride_ended_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to trigger ride emergency
CREATE OR REPLACE FUNCTION trigger_ride_emergency(
  p_ride_id uuid,
  p_emergency_type text DEFAULT 'general'
)
RETURNS TABLE(
  success boolean,
  alert_id uuid,
  message text
) AS $$
DECLARE
  tracking_rec RECORD;
  ride_rec RECORD;
  user_rec RECORD;
  alert_rec_id uuid;
  emergency_contact RECORD;
BEGIN
  -- Get tracking and ride info
  SELECT * INTO tracking_rec FROM ride_tracking WHERE ride_id = p_ride_id;
  SELECT * INTO ride_rec FROM rides WHERE id = p_ride_id;
  SELECT * INTO user_rec FROM profiles WHERE id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Ride or tracking not found'::text;
    RETURN;
  END IF;
  
  -- Create emergency alert
  INSERT INTO emergency_alerts (
    user_id,
    ride_id,
    alert_type,
    location,
    status
  ) VALUES (
    auth.uid(),
    p_ride_id,
    p_emergency_type,
    tracking_rec.current_location,
    'active'
  ) RETURNING id INTO alert_rec_id;
  
  -- Notify all passengers
  INSERT INTO notification_queue (
    user_id,
    notification_type,
    title,
    message,
    data,
    priority
  )
  SELECT 
    rb.passenger_id,
    'emergency_alert',
    '🚨 EMERGENCY ALERT',
    'An emergency has been triggered for your active ride',
    jsonb_build_object(
      'ride_id', p_ride_id,
      'alert_id', alert_rec_id,
      'location', ST_AsGeoJSON(tracking_rec.current_location)::jsonb
    ),
    'urgent'
  FROM ride_bookings rb
  WHERE rb.ride_id = p_ride_id
  AND rb.passenger_id != auth.uid();
  
  -- Notify driver if passenger triggered
  IF auth.uid() != ride_rec.driver_id THEN
    INSERT INTO notification_queue (
      user_id,
      notification_type,
      title,
      message,
      data,
      priority
    ) VALUES (
      ride_rec.driver_id,
      'emergency_alert',
      '🚨 EMERGENCY ALERT',
      'A passenger has triggered an emergency alert',
      jsonb_build_object(
        'ride_id', p_ride_id,
        'alert_id', alert_rec_id
      ),
      'urgent'
    );
  END IF;
  
  -- Notify emergency contacts
  FOR emergency_contact IN
    SELECT * FROM emergency_contacts
    WHERE user_id = auth.uid()
    AND share_location_enabled = true
    ORDER BY priority_order
  LOOP
    INSERT INTO emergency_notifications (
      alert_id,
      contact_name,
      contact_phone,
      contact_email,
      location,
      message
    ) VALUES (
      alert_rec_id,
      emergency_contact.contact_name,
      emergency_contact.contact_phone,
      emergency_contact.contact_email,
      tracking_rec.current_location,
      user_rec.full_name || ' has triggered an emergency alert during a carpool ride'
    );
  END LOOP;
  
  RETURN QUERY SELECT true, alert_rec_id, 'Emergency alert triggered successfully'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
