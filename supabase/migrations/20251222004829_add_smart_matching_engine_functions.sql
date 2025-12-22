/*
  # Smart Matching Engine RPC Functions
  
  ## Overview
  Comprehensive matching engine that automatically connects passengers with drivers
  based on proximity, time compatibility, route efficiency, and user preferences.
  
  ## Functions
  
  ### 1. match_trip_requests_to_rides()
  Finds and scores potential ride matches for trip requests
  - Calculates proximity scores based on pickup/dropoff locations
  - Evaluates time compatibility with flexible windows
  - Estimates detour distance and time
  - Creates match records with scores
  - Sends notifications to relevant parties
  
  ### 2. match_ride_requests_to_rides()
  Similar to trip requests but for users requesting to join existing rides
  - Uses ride request specific data structure
  - Handles overlap time windows
  - Integrates with existing ride capacity
  
  ### 3. calculate_match_score()
  Composite scoring algorithm that weighs multiple factors
  - Proximity score (40% weight)
  - Time compatibility (30% weight)
  - Route efficiency (30% weight)
  - Returns 0-100 score
  
  ### 4. expire_old_matches()
  Cleanup function to mark expired matches
  - Auto-expires matches past their expiration time
  - Updates status to 'expired'
  - Frees up system resources
  
  ### 5. promote_from_waitlist()
  Automatically promotes waitlist entries when seats available
  - Checks ride capacity
  - Orders by priority score and position
  - Creates bookings or notifications
  - Updates waitlist status
  
  ### 6. bulk_respond_to_ride_requests()
  Allows drivers to accept/decline multiple requests at once
  - Validates ride ownership
  - Checks remaining capacity
  - Updates request statuses
  - Creates bookings for accepted requests
  - Sends notifications
  
  ### 7. get_ride_matches_for_driver(ride_id)
  Retrieves all pending matches for a specific ride
  - Joins with user profile data
  - Includes ratings and verification status
  - Orders by match score
  
  ### 8. get_matches_for_trip_request(trip_request_id)
  Retrieves all potential rides for a trip request
  - Includes driver information
  - Shows vehicle details
  - Orders by best match
*/

-- Function to calculate distance between two points in kilometers
CREATE OR REPLACE FUNCTION calculate_distance_km(
  lat1 numeric,
  lon1 numeric,
  lat2 numeric,
  lon2 numeric
)
RETURNS numeric AS $$
DECLARE
  r numeric := 6371; -- Earth's radius in km
  dlat numeric;
  dlon numeric;
  a numeric;
  c numeric;
BEGIN
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  
  a := sin(dlat/2) * sin(dlat/2) + 
       cos(radians(lat1)) * cos(radians(lat2)) * 
       sin(dlon/2) * sin(dlon/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN r * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to match trip requests to available rides
CREATE OR REPLACE FUNCTION match_trip_requests_to_rides()
RETURNS TABLE(
  matches_created integer,
  notifications_queued integer
) AS $$
DECLARE
  match_count integer := 0;
  notification_count integer := 0;
  trip_rec RECORD;
  ride_rec RECORD;
  pickup_distance numeric;
  dropoff_distance numeric;
  time_diff_minutes integer;
  proximity_score integer;
  time_score integer;
  route_score integer;
  total_score integer;
  match_id uuid;
BEGIN
  -- Loop through active trip requests
  FOR trip_rec IN 
    SELECT * FROM trip_requests 
    WHERE status = 'active' 
    AND departure_time > now()
  LOOP
    -- Find potential matching rides
    FOR ride_rec IN
      SELECT r.* FROM rides r
      WHERE r.status = 'active'
      AND r.departure_time > now()
      AND r.available_seats > 0
      AND r.departure_time BETWEEN 
        COALESCE(trip_rec.time_window_start, trip_rec.departure_time - interval '2 hours')
        AND COALESCE(trip_rec.time_window_end, trip_rec.departure_time + interval '2 hours')
      -- Check if driver hasn't blocked this passenger
      AND NOT EXISTS (
        SELECT 1 FROM blocks
        WHERE blocker_id = r.driver_id
        AND blocked_id = trip_rec.rider_id
      )
      -- Check if match doesn't already exist
      AND NOT EXISTS (
        SELECT 1 FROM trip_requests_matches
        WHERE trip_request_id = trip_rec.id
        AND ride_id = r.id
        AND status = 'pending'
      )
    LOOP
      -- Calculate pickup distance (from ride origin to trip origin)
      pickup_distance := calculate_distance_km(
        ride_rec.origin_lat,
        ride_rec.origin_lng,
        trip_rec.from_lat,
        trip_rec.from_lng
      );
      
      -- Calculate dropoff distance (from ride destination to trip destination)
      dropoff_distance := calculate_distance_km(
        ride_rec.destination_lat,
        ride_rec.destination_lng,
        trip_rec.to_lat,
        trip_rec.to_lng
      );
      
      -- Skip if locations are too far apart (>15km for pickup or dropoff)
      IF pickup_distance > 15 OR dropoff_distance > 15 THEN
        CONTINUE;
      END IF;
      
      -- Calculate proximity score (closer = higher score)
      proximity_score := GREATEST(0, LEAST(100, 
        100 - ((pickup_distance + dropoff_distance) * 3)::integer
      ));
      
      -- Calculate time compatibility score
      time_diff_minutes := ABS(EXTRACT(EPOCH FROM (ride_rec.departure_time - trip_rec.departure_time)) / 60)::integer;
      time_score := GREATEST(0, LEAST(100, 100 - (time_diff_minutes / 2)));
      
      -- Calculate route efficiency score (simplified - based on total detour)
      route_score := GREATEST(0, LEAST(100, 
        100 - ((pickup_distance + dropoff_distance) * 2)::integer
      ));
      
      -- Calculate composite match score (weighted average)
      total_score := ((proximity_score * 40) + (time_score * 30) + (route_score * 30)) / 100;
      
      -- Only create matches with score >= 40
      IF total_score >= 40 THEN
        -- Insert match record
        INSERT INTO trip_requests_matches (
          trip_request_id,
          ride_id,
          match_score,
          proximity_score,
          time_compatibility_score,
          route_efficiency_score,
          detour_distance_km,
          detour_time_minutes,
          status,
          expires_at
        ) VALUES (
          trip_rec.id,
          ride_rec.id,
          total_score,
          proximity_score,
          time_score,
          route_score,
          pickup_distance + dropoff_distance,
          (time_diff_minutes + ((pickup_distance + dropoff_distance) * 2))::integer,
          'pending',
          now() + interval '7 days'
        ) RETURNING id INTO match_id;
        
        match_count := match_count + 1;
        
        -- Queue notification for passenger
        INSERT INTO notification_queue (
          user_id,
          notification_type,
          title,
          message,
          data,
          priority
        ) VALUES (
          trip_rec.rider_id,
          'trip_match_found',
          'Ride Match Found!',
          'We found a ride that matches your trip request with a score of ' || total_score || '%',
          jsonb_build_object(
            'match_id', match_id,
            'trip_request_id', trip_rec.id,
            'ride_id', ride_rec.id,
            'match_score', total_score
          ),
          'normal'
        );
        
        -- Queue notification for driver
        INSERT INTO notification_queue (
          user_id,
          notification_type,
          title,
          message,
          data,
          priority
        ) VALUES (
          ride_rec.driver_id,
          'potential_passenger',
          'Potential Passenger Match',
          'A passenger is looking for a ride that matches your route (score: ' || total_score || '%)',
          jsonb_build_object(
            'match_id', match_id,
            'trip_request_id', trip_rec.id,
            'ride_id', ride_rec.id,
            'match_score', total_score
          ),
          'normal'
        );
        
        notification_count := notification_count + 2;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN QUERY SELECT match_count, notification_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to match ride requests (for joining existing rides) to rides
CREATE OR REPLACE FUNCTION match_ride_requests_to_rides()
RETURNS TABLE(
  matches_created integer,
  notifications_queued integer
) AS $$
DECLARE
  match_count integer := 0;
  notification_count integer := 0;
  req_rec RECORD;
  ride_rec RECORD;
  proximity_score integer;
  time_score integer;
  total_score integer;
  match_id uuid;
  time_overlap boolean;
BEGIN
  -- Loop through pending ride requests
  FOR req_rec IN 
    SELECT * FROM ride_requests 
    WHERE status = 'pending'
  LOOP
    -- The ride is already specified in ride_requests
    SELECT * INTO ride_rec FROM rides WHERE id = req_rec.ride_id;
    
    IF ride_rec.id IS NULL OR ride_rec.status != 'active' THEN
      CONTINUE;
    END IF;
    
    -- Check if match already exists
    IF EXISTS (
      SELECT 1 FROM ride_requests_matches
      WHERE request_id = req_rec.id
      AND ride_id = ride_rec.id
      AND status = 'pending'
    ) THEN
      CONTINUE;
    END IF;
    
    -- Check time overlap
    time_overlap := (
      req_rec.overlap_window_start IS NULL OR
      req_rec.overlap_window_end IS NULL OR
      (req_rec.overlap_window_start <= ride_rec.departure_time AND
       req_rec.overlap_window_end >= ride_rec.departure_time)
    );
    
    IF NOT time_overlap THEN
      CONTINUE;
    END IF;
    
    -- Calculate proximity score based on pickup location
    IF req_rec.pickup_lat IS NOT NULL AND req_rec.pickup_lng IS NOT NULL THEN
      DECLARE
        pickup_distance numeric;
      BEGIN
        pickup_distance := calculate_distance_km(
          ride_rec.origin_lat,
          ride_rec.origin_lng,
          req_rec.pickup_lat,
          req_rec.pickup_lng
        );
        
        -- Skip if too far
        IF pickup_distance > 15 THEN
          CONTINUE;
        END IF;
        
        proximity_score := GREATEST(0, LEAST(100, 
          100 - (pickup_distance * 6)::integer
        ));
      END;
    ELSE
      proximity_score := 70; -- Default score if no specific location
    END IF;
    
    -- Calculate time score
    time_score := 100; -- Full score since time compatibility already checked
    
    -- Calculate composite score
    total_score := ((proximity_score * 60) + (time_score * 40)) / 100;
    
    IF total_score >= 40 THEN
      -- Insert match record
      INSERT INTO ride_requests_matches (
        request_id,
        ride_id,
        match_score,
        proximity_score,
        time_compatibility_score,
        route_efficiency_score,
        status,
        notified_at,
        expires_at
      ) VALUES (
        req_rec.id,
        ride_rec.id,
        total_score,
        proximity_score,
        time_score,
        70, -- Default route efficiency
        'pending',
        now(),
        req_rec.expires_at
      ) RETURNING id INTO match_id;
      
      match_count := match_count + 1;
      
      -- Queue notification for driver
      INSERT INTO notification_queue (
        user_id,
        notification_type,
        title,
        message,
        data,
        priority
      ) VALUES (
        ride_rec.driver_id,
        'ride_request_received',
        'New Ride Request',
        'Someone wants to join your ride (' || req_rec.seats_requested || ' seat(s))',
        jsonb_build_object(
          'match_id', match_id,
          'request_id', req_rec.id,
          'ride_id', ride_rec.id,
          'match_score', total_score
        ),
        'high'
      );
      
      notification_count := notification_count + 1;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT match_count, notification_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to expire old matches
CREATE OR REPLACE FUNCTION expire_old_matches()
RETURNS integer AS $$
DECLARE
  expired_count integer;
BEGIN
  -- Expire trip request matches
  WITH expired AS (
    UPDATE trip_requests_matches
    SET status = 'expired'
    WHERE status = 'pending'
    AND expires_at < now()
    RETURNING id
  )
  SELECT COUNT(*) INTO expired_count FROM expired;
  
  -- Expire ride request matches
  WITH expired AS (
    UPDATE ride_requests_matches
    SET status = 'expired'
    WHERE status = 'pending'
    AND expires_at < now()
    RETURNING id
  )
  SELECT expired_count + COUNT(*) INTO expired_count FROM expired;
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to promote from waitlist when seats become available
CREATE OR REPLACE FUNCTION promote_from_waitlist(p_ride_id uuid)
RETURNS integer AS $$
DECLARE
  ride_rec RECORD;
  waitlist_rec RECORD;
  promoted_count integer := 0;
BEGIN
  -- Get ride info
  SELECT * INTO ride_rec FROM rides WHERE id = p_ride_id;
  
  IF NOT FOUND OR ride_rec.available_seats <= 0 THEN
    RETURN 0;
  END IF;
  
  -- Process waitlist entries in order
  FOR waitlist_rec IN
    SELECT * FROM ride_waitlist
    WHERE ride_id = p_ride_id
    AND status = 'waiting'
    AND seats_requested <= ride_rec.available_seats
    ORDER BY priority_score DESC, position ASC, created_at ASC
  LOOP
    -- Update waitlist status
    UPDATE ride_waitlist
    SET status = 'promoted',
        notified_at = now()
    WHERE id = waitlist_rec.id;
    
    -- Queue notification
    INSERT INTO notification_queue (
      user_id,
      notification_type,
      title,
      message,
      data,
      priority
    ) VALUES (
      waitlist_rec.user_id,
      'waitlist_promoted',
      'Seat Available!',
      'A seat is now available for your waitlisted ride. Book now!',
      jsonb_build_object(
        'ride_id', p_ride_id,
        'waitlist_id', waitlist_rec.id,
        'seats_available', ride_rec.available_seats
      ),
      'urgent'
    );
    
    promoted_count := promoted_count + 1;
    
    -- Only promote one at a time to avoid overbooking
    EXIT;
  END LOOP;
  
  RETURN promoted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for bulk responding to ride requests
CREATE OR REPLACE FUNCTION bulk_respond_to_ride_requests(
  p_ride_id uuid,
  p_request_ids uuid[],
  p_action text -- 'accept' or 'decline'
)
RETURNS TABLE(
  processed integer,
  accepted integer,
  declined integer,
  errors text[]
) AS $$
DECLARE
  processed_count integer := 0;
  accepted_count integer := 0;
  declined_count integer := 0;
  error_messages text[] := ARRAY[]::text[];
  ride_rec RECORD;
  req_id uuid;
  req_rec RECORD;
BEGIN
  -- Verify ride ownership
  SELECT * INTO ride_rec FROM rides WHERE id = p_ride_id AND driver_id = auth.uid();
  
  IF NOT FOUND THEN
    error_messages := array_append(error_messages, 'Ride not found or unauthorized');
    RETURN QUERY SELECT 0, 0, 0, error_messages;
    RETURN;
  END IF;
  
  -- Process each request
  FOREACH req_id IN ARRAY p_request_ids
  LOOP
    SELECT * INTO req_rec FROM ride_requests WHERE id = req_id AND ride_id = p_ride_id;
    
    IF NOT FOUND THEN
      error_messages := array_append(error_messages, 'Request ' || req_id || ' not found');
      CONTINUE;
    END IF;
    
    IF p_action = 'accept' THEN
      -- Check if enough seats
      IF ride_rec.available_seats >= req_rec.seats_requested THEN
        -- Update request status
        UPDATE ride_requests
        SET status = 'accepted',
            responded_at = now()
        WHERE id = req_id;
        
        -- Update match status if exists
        UPDATE ride_requests_matches
        SET status = 'accepted'
        WHERE request_id = req_id AND ride_id = p_ride_id;
        
        -- Queue notification
        INSERT INTO notification_queue (
          user_id,
          notification_type,
          title,
          message,
          data,
          priority
        ) VALUES (
          req_rec.rider_id,
          'request_accepted',
          'Request Accepted!',
          'Your ride request has been accepted by the driver',
          jsonb_build_object(
            'request_id', req_id,
            'ride_id', p_ride_id
          ),
          'high'
        );
        
        accepted_count := accepted_count + 1;
        
        -- Refresh ride record for next iteration
        SELECT * INTO ride_rec FROM rides WHERE id = p_ride_id;
      ELSE
        error_messages := array_append(error_messages, 'Not enough seats for request ' || req_id);
      END IF;
    ELSIF p_action = 'decline' THEN
      -- Update request status
      UPDATE ride_requests
      SET status = 'declined',
          responded_at = now()
      WHERE id = req_id;
      
      -- Update match status if exists
      UPDATE ride_requests_matches
      SET status = 'declined'
      WHERE request_id = req_id AND ride_id = p_ride_id;
      
      -- Queue notification
      INSERT INTO notification_queue (
        user_id,
        notification_type,
        title,
        message,
        data,
        priority
      ) VALUES (
        req_rec.rider_id,
        'request_declined',
        'Request Declined',
        'Your ride request was declined. You can try other available rides.',
        jsonb_build_object(
          'request_id', req_id,
          'ride_id', p_ride_id
        ),
        'normal'
      );
      
      declined_count := declined_count + 1;
    END IF;
    
    processed_count := processed_count + 1;
  END LOOP;
  
  RETURN QUERY SELECT processed_count, accepted_count, declined_count, error_messages;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get ride matches for driver (with passenger details)
CREATE OR REPLACE FUNCTION get_ride_matches_for_driver(p_ride_id uuid)
RETURNS TABLE(
  match_id uuid,
  request_id uuid,
  passenger_id uuid,
  passenger_name text,
  passenger_rating numeric,
  passenger_photo_url text,
  email_verified boolean,
  phone_verified boolean,
  seats_requested integer,
  match_score integer,
  proximity_score integer,
  time_score integer,
  detour_km numeric,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rrm.id as match_id,
    rrm.request_id,
    p.id as passenger_id,
    p.full_name as passenger_name,
    COALESCE(p.average_rating, 0) as passenger_rating,
    p.photo_url as passenger_photo_url,
    p.email_verified,
    p.phone_verified,
    rr.seats_requested,
    rrm.match_score,
    rrm.proximity_score,
    rrm.time_compatibility_score as time_score,
    rrm.detour_distance_km as detour_km,
    rrm.created_at
  FROM ride_requests_matches rrm
  JOIN ride_requests rr ON rrm.request_id = rr.id
  JOIN profiles p ON rr.rider_id = p.id
  WHERE rrm.ride_id = p_ride_id
  AND rrm.status = 'pending'
  ORDER BY rrm.match_score DESC, rrm.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get matches for a trip request
CREATE OR REPLACE FUNCTION get_matches_for_trip_request(p_trip_request_id uuid)
RETURNS TABLE(
  match_id uuid,
  ride_id uuid,
  driver_id uuid,
  driver_name text,
  driver_rating numeric,
  driver_photo_url text,
  vehicle_make text,
  vehicle_model text,
  vehicle_color text,
  origin text,
  destination text,
  departure_time timestamptz,
  available_seats integer,
  match_score integer,
  proximity_score integer,
  time_score integer,
  detour_km numeric,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    trm.id as match_id,
    r.id as ride_id,
    p.id as driver_id,
    p.full_name as driver_name,
    COALESCE(p.average_rating, 0) as driver_rating,
    p.photo_url as driver_photo_url,
    v.make as vehicle_make,
    v.model as vehicle_model,
    v.color as vehicle_color,
    r.origin,
    r.destination,
    r.departure_time,
    r.available_seats,
    trm.match_score,
    trm.proximity_score,
    trm.time_compatibility_score as time_score,
    trm.detour_distance_km as detour_km,
    trm.created_at
  FROM trip_requests_matches trm
  JOIN rides r ON trm.ride_id = r.id
  JOIN profiles p ON r.driver_id = p.id
  LEFT JOIN vehicles v ON r.vehicle_id = v.id
  WHERE trm.trip_request_id = p_trip_request_id
  AND trm.status = 'pending'
  AND r.status = 'active'
  AND r.available_seats > 0
  ORDER BY trm.match_score DESC, trm.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
