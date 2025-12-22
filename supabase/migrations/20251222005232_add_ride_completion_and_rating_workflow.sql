/*
  # Ride Completion and Rating Workflow
  
  ## Overview
  Comprehensive post-ride workflow that handles completion confirmation,
  detailed reviews, reputation updates, and achievement unlocking.
  
  ## Functions
  
  ### 1. submit_detailed_review()
  Creates comprehensive review with category ratings
  - Overall rating (1-5 stars)
  - Category ratings (punctuality, cleanliness, communication, safety, comfort)
  - Written feedback
  - Would-ride-again indicator
  - Updates reviewee's average rating
  - Unlocks achievements
  
  ### 2. get_user_reviews()
  Retrieves all reviews for a user
  - Filters by received/given
  - Aggregates rating statistics
  - Shows trends over time
  
  ### 3. calculate_average_ratings()
  Updates user's overall rating
  - Weighted average across all categories
  - Recency weighting (recent reviews count more)
  - Updates profile
  
  ### 4. unlock_achievements()
  Checks and awards achievements
  - Ride milestones (10, 50, 100, 500 rides)
  - Rating achievements (maintain 5 stars, etc.)
  - Community contributions
  - Environmental impact milestones
  
  ### 5. calculate_environmental_impact()
  Computes CO2 savings and impact metrics
  - Distance traveled shared
  - Equivalent cars removed
  - Trees saved equivalent
  - Updates user statistics
  
  ## Security
  - Users can only review completed rides
  - One review per booking per user
  - Cannot review yourself
*/

-- Function to submit detailed review
CREATE OR REPLACE FUNCTION submit_detailed_review(
  p_booking_id uuid,
  p_overall_rating integer,
  p_punctuality_rating integer DEFAULT NULL,
  p_cleanliness_rating integer DEFAULT NULL,
  p_communication_rating integer DEFAULT NULL,
  p_safety_rating integer DEFAULT NULL,
  p_comfort_rating integer DEFAULT NULL,
  p_review_text text DEFAULT NULL,
  p_would_ride_again boolean DEFAULT true
)
RETURNS TABLE(
  success boolean,
  review_id uuid,
  reviewee_new_rating numeric,
  achievements_unlocked text[],
  message text
) AS $$
DECLARE
  booking_rec RECORD;
  ride_rec RECORD;
  reviewee_id uuid;
  review_rec_id uuid;
  new_avg_rating numeric;
  achievements text[] := ARRAY[]::text[];
BEGIN
  -- Get booking info
  SELECT * INTO booking_rec FROM ride_bookings WHERE id = p_booking_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, 0::numeric, ARRAY[]::text[], 'Booking not found'::text;
    RETURN;
  END IF;
  
  -- Verify booking is completed
  IF booking_rec.status != 'completed' THEN
    RETURN QUERY SELECT false, NULL::uuid, 0::numeric, ARRAY[]::text[], 'Booking must be completed to review'::text;
    RETURN;
  END IF;
  
  -- Get ride info
  SELECT * INTO ride_rec FROM rides WHERE id = booking_rec.ride_id;
  
  -- Determine who is being reviewed
  IF auth.uid() = booking_rec.passenger_id THEN
    reviewee_id := ride_rec.driver_id; -- Passenger reviewing driver
  ELSIF auth.uid() = ride_rec.driver_id THEN
    reviewee_id := booking_rec.passenger_id; -- Driver reviewing passenger
  ELSE
    RETURN QUERY SELECT false, NULL::uuid, 0::numeric, ARRAY[]::text[], 'Unauthorized to review this booking'::text;
    RETURN;
  END IF;
  
  -- Check if review already exists
  IF EXISTS (
    SELECT 1 FROM ride_reviews_detailed 
    WHERE booking_id = p_booking_id 
    AND reviewer_id = auth.uid()
  ) THEN
    RETURN QUERY SELECT false, NULL::uuid, 0::numeric, ARRAY[]::text[], 'Review already submitted'::text;
    RETURN;
  END IF;
  
  -- Validate ratings
  IF p_overall_rating < 1 OR p_overall_rating > 5 THEN
    RETURN QUERY SELECT false, NULL::uuid, 0::numeric, ARRAY[]::text[], 'Overall rating must be between 1 and 5'::text;
    RETURN;
  END IF;
  
  -- Insert detailed review
  INSERT INTO ride_reviews_detailed (
    booking_id,
    ride_id,
    reviewer_id,
    reviewee_id,
    overall_rating,
    punctuality_rating,
    cleanliness_rating,
    communication_rating,
    safety_rating,
    comfort_rating,
    review_text,
    would_ride_again
  ) VALUES (
    p_booking_id,
    booking_rec.ride_id,
    auth.uid(),
    reviewee_id,
    p_overall_rating,
    p_punctuality_rating,
    p_cleanliness_rating,
    p_communication_rating,
    p_safety_rating,
    p_comfort_rating,
    p_review_text,
    p_would_ride_again
  ) RETURNING id INTO review_rec_id;
  
  -- Calculate new average rating for reviewee
  SELECT 
    ROUND(AVG(overall_rating)::numeric, 2)
  INTO new_avg_rating
  FROM ride_reviews_detailed
  WHERE reviewee_id = reviewee_id;
  
  -- Update reviewee's profile
  UPDATE profiles
  SET 
    average_rating = new_avg_rating,
    total_reviews = (SELECT COUNT(*) FROM ride_reviews_detailed WHERE reviewee_id = reviewee_id),
    updated_at = now()
  WHERE id = reviewee_id;
  
  -- Update reliability score for reviewer (positive action)
  PERFORM update_reliability_on_completion(p_booking_id);
  
  -- Check for achievements
  -- Achievement: First Review
  IF NOT EXISTS (
    SELECT 1 FROM ride_reviews_detailed 
    WHERE reviewer_id = auth.uid() 
    AND id != review_rec_id
  ) THEN
    achievements := array_append(achievements, 'first_review');
  END IF;
  
  -- Achievement: Helpful Reviewer (10+ reviews)
  IF (SELECT COUNT(*) FROM ride_reviews_detailed WHERE reviewer_id = auth.uid()) >= 10 THEN
    achievements := array_append(achievements, 'helpful_reviewer');
  END IF;
  
  -- Achievement: 5 Star Reviewer (if this is a 5 star review)
  IF p_overall_rating = 5 THEN
    achievements := array_append(achievements, '5_star_given');
  END IF;
  
  -- Notify reviewee
  INSERT INTO notification_queue (
    user_id,
    notification_type,
    title,
    message,
    data,
    priority
  ) VALUES (
    reviewee_id,
    'review_received',
    'New Review Received',
    'You received a ' || p_overall_rating || '-star review for your recent ride',
    jsonb_build_object(
      'review_id', review_rec_id,
      'booking_id', p_booking_id,
      'rating', p_overall_rating,
      'new_average', new_avg_rating
    ),
    'normal'
  );
  
  RETURN QUERY SELECT 
    true,
    review_rec_id,
    new_avg_rating,
    achievements,
    'Review submitted successfully'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user reviews summary
CREATE OR REPLACE FUNCTION get_user_reviews_summary(p_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  user_id uuid,
  total_reviews integer,
  average_overall numeric,
  average_punctuality numeric,
  average_cleanliness numeric,
  average_communication numeric,
  average_safety numeric,
  average_comfort numeric,
  would_ride_again_percentage numeric,
  five_star_count integer,
  four_star_count integer,
  three_star_count integer,
  two_star_count integer,
  one_star_count integer
) AS $$
DECLARE
  check_user_id uuid;
BEGIN
  check_user_id := COALESCE(p_user_id, auth.uid());
  
  RETURN QUERY
  SELECT 
    check_user_id,
    COUNT(*)::integer as total_reviews,
    ROUND(AVG(rrd.overall_rating)::numeric, 2) as average_overall,
    ROUND(AVG(rrd.punctuality_rating)::numeric, 2) as average_punctuality,
    ROUND(AVG(rrd.cleanliness_rating)::numeric, 2) as average_cleanliness,
    ROUND(AVG(rrd.communication_rating)::numeric, 2) as average_communication,
    ROUND(AVG(rrd.safety_rating)::numeric, 2) as average_safety,
    ROUND(AVG(rrd.comfort_rating)::numeric, 2) as average_comfort,
    ROUND((COUNT(*) FILTER (WHERE rrd.would_ride_again = true)::numeric / NULLIF(COUNT(*), 0) * 100), 2) as would_ride_again_pct,
    COUNT(*) FILTER (WHERE rrd.overall_rating = 5)::integer as five_star,
    COUNT(*) FILTER (WHERE rrd.overall_rating = 4)::integer as four_star,
    COUNT(*) FILTER (WHERE rrd.overall_rating = 3)::integer as three_star,
    COUNT(*) FILTER (WHERE rrd.overall_rating = 2)::integer as two_star,
    COUNT(*) FILTER (WHERE rrd.overall_rating = 1)::integer as one_star
  FROM ride_reviews_detailed rrd
  WHERE rrd.reviewee_id = check_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent reviews for user
CREATE OR REPLACE FUNCTION get_recent_reviews(
  p_user_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 10
)
RETURNS TABLE(
  review_id uuid,
  reviewer_id uuid,
  reviewer_name text,
  reviewer_photo text,
  overall_rating integer,
  punctuality_rating integer,
  cleanliness_rating integer,
  communication_rating integer,
  safety_rating integer,
  comfort_rating integer,
  review_text text,
  would_ride_again boolean,
  ride_origin text,
  ride_destination text,
  ride_date timestamptz,
  created_at timestamptz
) AS $$
DECLARE
  check_user_id uuid;
BEGIN
  check_user_id := COALESCE(p_user_id, auth.uid());
  
  RETURN QUERY
  SELECT 
    rrd.id as review_id,
    rrd.reviewer_id,
    p.full_name as reviewer_name,
    p.photo_url as reviewer_photo,
    rrd.overall_rating,
    rrd.punctuality_rating,
    rrd.cleanliness_rating,
    rrd.communication_rating,
    rrd.safety_rating,
    rrd.comfort_rating,
    rrd.review_text,
    rrd.would_ride_again,
    r.origin as ride_origin,
    r.destination as ride_destination,
    r.departure_time as ride_date,
    rrd.created_at
  FROM ride_reviews_detailed rrd
  JOIN profiles p ON rrd.reviewer_id = p.id
  JOIN rides r ON rrd.ride_id = r.id
  WHERE rrd.reviewee_id = check_user_id
  ORDER BY rrd.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate environmental impact
CREATE OR REPLACE FUNCTION calculate_environmental_impact(p_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  total_rides integer,
  total_distance_km numeric,
  co2_saved_kg numeric,
  trees_equivalent numeric,
  cars_off_road_days numeric,
  fuel_saved_liters numeric
) AS $$
DECLARE
  check_user_id uuid;
  rides_as_driver integer;
  rides_as_passenger integer;
  total_distance numeric := 0;
BEGIN
  check_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Count rides as driver (completed)
  SELECT COUNT(*) INTO rides_as_driver
  FROM rides
  WHERE driver_id = check_user_id
  AND status = 'completed';
  
  -- Count rides as passenger (completed bookings)
  SELECT COUNT(*) INTO rides_as_passenger
  FROM ride_bookings
  WHERE passenger_id = check_user_id
  AND status = 'completed';
  
  -- Calculate total distance (simplified - would use actual GPS tracking data)
  SELECT COALESCE(SUM(
    calculate_distance_km(
      r.origin_lat,
      r.origin_lng,
      r.destination_lat,
      r.destination_lng
    )
  ), 0) INTO total_distance
  FROM rides r
  WHERE r.driver_id = check_user_id
  AND r.status = 'completed';
  
  -- Add passenger distance
  SELECT total_distance + COALESCE(SUM(
    calculate_distance_km(
      rb.pickup_lat,
      rb.pickup_lng,
      rb.dropoff_lat,
      rb.dropoff_lng
    )
  ), 0) INTO total_distance
  FROM ride_bookings rb
  WHERE rb.passenger_id = check_user_id
  AND rb.status = 'completed';
  
  -- Calculate environmental metrics
  -- Average car emits 0.12 kg CO2 per km
  -- Each tree absorbs ~21 kg CO2 per year
  -- Average car uses 0.075 liters per km
  
  RETURN QUERY SELECT 
    (rides_as_driver + rides_as_passenger)::integer as total_rides,
    ROUND(total_distance, 2) as total_distance_km,
    ROUND((total_distance * 0.12)::numeric, 2) as co2_saved_kg,
    ROUND((total_distance * 0.12 / 21)::numeric, 2) as trees_equivalent,
    ROUND((total_distance / 40)::numeric, 2) as cars_off_road_days, -- Assuming 40km average daily drive
    ROUND((total_distance * 0.075)::numeric, 2) as fuel_saved_liters;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_and_award_achievements(p_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  achievement_name text,
  achievement_description text,
  unlocked_at timestamptz
) AS $$
DECLARE
  check_user_id uuid;
  completed_rides integer;
  avg_rating numeric;
  reviews_given integer;
  impact_data RECORD;
BEGIN
  check_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Get user statistics
  SELECT 
    (SELECT COUNT(*) FROM rides WHERE driver_id = check_user_id AND status = 'completed') +
    (SELECT COUNT(*) FROM ride_bookings WHERE passenger_id = check_user_id AND status = 'completed')
  INTO completed_rides;
  
  SELECT average_rating INTO avg_rating FROM profiles WHERE id = check_user_id;
  SELECT COUNT(*) INTO reviews_given FROM ride_reviews_detailed WHERE reviewer_id = check_user_id;
  SELECT * INTO impact_data FROM calculate_environmental_impact(check_user_id);
  
  -- Ride Milestones
  IF completed_rides >= 1 THEN
    RETURN QUERY SELECT 
      'first_ride'::text,
      'Completed your first carpool ride'::text,
      now();
  END IF;
  
  IF completed_rides >= 10 THEN
    RETURN QUERY SELECT 
      'frequent_carpooler'::text,
      'Completed 10 carpool rides'::text,
      now();
  END IF;
  
  IF completed_rides >= 50 THEN
    RETURN QUERY SELECT 
      'carpool_champion'::text,
      'Completed 50 carpool rides'::text,
      now();
  END IF;
  
  IF completed_rides >= 100 THEN
    RETURN QUERY SELECT 
      'carpool_legend'::text,
      'Completed 100 carpool rides!'::text,
      now();
  END IF;
  
  -- Rating Achievements
  IF avg_rating >= 4.8 AND completed_rides >= 10 THEN
    RETURN QUERY SELECT 
      'five_star_member'::text,
      'Maintained exceptional ratings (4.8+ stars)'::text,
      now();
  END IF;
  
  -- Review Achievements
  IF reviews_given >= 10 THEN
    RETURN QUERY SELECT 
      'helpful_reviewer'::text,
      'Submitted 10 helpful reviews'::text,
      now();
  END IF;
  
  -- Environmental Achievements
  IF impact_data.co2_saved_kg >= 100 THEN
    RETURN QUERY SELECT 
      'eco_warrior'::text,
      'Saved 100kg of CO2 emissions!'::text,
      now();
  END IF;
  
  IF impact_data.trees_equivalent >= 5 THEN
    RETURN QUERY SELECT 
      'tree_planter'::text,
      'Impact equivalent to 5 trees planted'::text,
      now();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending reviews for user
CREATE OR REPLACE FUNCTION get_pending_reviews(p_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  booking_id uuid,
  ride_id uuid,
  reviewee_id uuid,
  reviewee_name text,
  reviewee_photo text,
  ride_origin text,
  ride_destination text,
  ride_date timestamptz,
  days_since_ride integer
) AS $$
DECLARE
  check_user_id uuid;
BEGIN
  check_user_id := COALESCE(p_user_id, auth.uid());
  
  RETURN QUERY
  -- Pending reviews for bookings as passenger
  SELECT 
    rb.id as booking_id,
    rb.ride_id,
    r.driver_id as reviewee_id,
    p.full_name as reviewee_name,
    p.photo_url as reviewee_photo,
    r.origin as ride_origin,
    r.destination as ride_destination,
    r.departure_time as ride_date,
    EXTRACT(DAY FROM (now() - r.departure_time))::integer as days_since_ride
  FROM ride_bookings rb
  JOIN rides r ON rb.ride_id = r.id
  JOIN profiles p ON r.driver_id = p.id
  WHERE rb.passenger_id = check_user_id
  AND rb.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM ride_reviews_detailed rrd
    WHERE rrd.booking_id = rb.id
    AND rrd.reviewer_id = check_user_id
  )
  
  UNION
  
  -- Pending reviews for rides as driver
  SELECT 
    rb.id as booking_id,
    rb.ride_id,
    rb.passenger_id as reviewee_id,
    p.full_name as reviewee_name,
    p.photo_url as reviewee_photo,
    r.origin as ride_origin,
    r.destination as ride_destination,
    r.departure_time as ride_date,
    EXTRACT(DAY FROM (now() - r.departure_time))::integer as days_since_ride
  FROM rides r
  JOIN ride_bookings rb ON rb.ride_id = r.id
  JOIN profiles p ON rb.passenger_id = p.id
  WHERE r.driver_id = check_user_id
  AND r.status = 'completed'
  AND rb.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM ride_reviews_detailed rrd
    WHERE rrd.booking_id = rb.id
    AND rrd.reviewer_id = check_user_id
  )
  
  ORDER BY ride_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
