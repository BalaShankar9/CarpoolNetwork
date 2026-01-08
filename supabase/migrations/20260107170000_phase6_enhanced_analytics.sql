-- Phase 6: Enhanced Analytics Dashboard
-- Adds ride type analytics, community metrics, and driver performance tracking

-- =====================================================
-- 1. RIDE TYPE ANALYTICS
-- =====================================================

-- View: Ride distribution by type
CREATE OR REPLACE VIEW ride_type_distribution AS
SELECT 
  COALESCE(ride_type, 'one_time') as ride_type,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE status = 'active') as active_count,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
  ROUND((COUNT(*)::NUMERIC / NULLIF((SELECT COUNT(*) FROM rides), 0) * 100), 2) as percentage,
  ROUND(AVG(total_seats), 1) as avg_seats_offered
FROM rides
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY COALESCE(ride_type, 'one_time')
ORDER BY total_count DESC;

-- Function: Get ride type trends over time
CREATE OR REPLACE FUNCTION get_ride_type_trends(period_days INTEGER DEFAULT 30)
RETURNS TABLE (
  date DATE,
  ride_type TEXT,
  ride_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(r.created_at) as date,
    COALESCE(r.ride_type, 'one_time') as ride_type,
    COUNT(*) as ride_count
  FROM rides r
  WHERE r.created_at >= NOW() - (period_days || ' days')::INTERVAL
  GROUP BY DATE(r.created_at), COALESCE(r.ride_type, 'one_time')
  ORDER BY date, ride_type;
END;
$$;

-- Function: Get ride type performance metrics
CREATE OR REPLACE FUNCTION get_ride_type_performance()
RETURNS TABLE (
  ride_type TEXT,
  total_rides BIGINT,
  completion_rate NUMERIC,
  avg_booking_rate NUMERIC,
  avg_seats_filled NUMERIC,
  cancellation_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(r.ride_type, 'one_time') as ride_type,
    COUNT(DISTINCT r.id) as total_rides,
    ROUND((COUNT(*) FILTER (WHERE r.status = 'completed')::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2) as completion_rate,
    ROUND((COUNT(rb.id)::NUMERIC / NULLIF(COUNT(DISTINCT r.id), 0)), 2) as avg_booking_rate,
    ROUND(AVG(r.total_seats - r.available_seats), 2) as avg_seats_filled,
    ROUND((COUNT(*) FILTER (WHERE r.status = 'cancelled')::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2) as cancellation_rate
  FROM rides r
  LEFT JOIN ride_bookings rb ON r.id = rb.ride_id AND rb.status != 'cancelled'
  WHERE r.created_at >= NOW() - INTERVAL '30 days'
  GROUP BY COALESCE(r.ride_type, 'one_time')
  ORDER BY total_rides DESC;
END;
$$;

-- =====================================================
-- 2. COMMUNITY & CITY ANALYTICS
-- =====================================================

-- View: Users per city
CREATE OR REPLACE VIEW city_user_distribution AS
SELECT 
  COALESCE(city, home_city, 'Unknown') as city_name,
  COUNT(*) as user_count,
  COUNT(*) FILTER (WHERE EXISTS(SELECT 1 FROM vehicles v WHERE v.user_id = profiles.id AND v.is_active = true)) as driver_count,
  COUNT(*) - COUNT(*) FILTER (WHERE EXISTS(SELECT 1 FROM vehicles v WHERE v.user_id = profiles.id AND v.is_active = true)) as rider_count,
  ROUND((COUNT(*)::NUMERIC / NULLIF((SELECT COUNT(*) FROM profiles), 0) * 100), 2) as percentage
FROM profiles
WHERE city IS NOT NULL OR home_city IS NOT NULL
GROUP BY COALESCE(city, home_city, 'Unknown')
ORDER BY user_count DESC
LIMIT 50;

-- View: Rides per city (origin-based)
CREATE OR REPLACE VIEW city_ride_activity AS
SELECT 
  SPLIT_PART(r.origin, ',', -1) as city_name,
  COUNT(*) as total_rides,
  COUNT(*) FILTER (WHERE r.status = 'completed') as completed_rides,
  COUNT(DISTINCT r.driver_id) as unique_drivers,
  COUNT(DISTINCT rb.passenger_id) as unique_passengers,
  ROUND(AVG(r.total_seats), 1) as avg_seats
FROM rides r
LEFT JOIN ride_bookings rb ON r.id = rb.ride_id
WHERE r.created_at >= NOW() - INTERVAL '30 days'
  AND r.origin IS NOT NULL
GROUP BY SPLIT_PART(r.origin, ',', -1)
HAVING COUNT(*) >= 1
ORDER BY total_rides DESC
LIMIT 30;

-- Function: Get community growth by city
CREATE OR REPLACE FUNCTION get_community_growth(period_days INTEGER DEFAULT 30)
RETURNS TABLE (
  city TEXT,
  new_users BIGINT,
  new_drivers BIGINT,
  rides_created BIGINT,
  bookings_made BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH city_users AS (
    SELECT 
      COALESCE(city, home_city, 'Unknown') as city_name,
      COUNT(*) as new_users_count,
      COUNT(*) FILTER (WHERE EXISTS(SELECT 1 FROM vehicles v WHERE v.user_id = profiles.id)) as new_drivers_count
    FROM profiles
    WHERE created_at >= NOW() - (period_days || ' days')::INTERVAL
      AND (city IS NOT NULL OR home_city IS NOT NULL)
    GROUP BY COALESCE(city, home_city, 'Unknown')
  ),
  city_rides AS (
    SELECT 
      SPLIT_PART(origin, ',', -1) as city_name,
      COUNT(*) as rides_count
    FROM rides
    WHERE created_at >= NOW() - (period_days || ' days')::INTERVAL
      AND origin IS NOT NULL
    GROUP BY SPLIT_PART(origin, ',', -1)
  ),
  city_bookings AS (
    SELECT 
      SPLIT_PART(pickup_location, ',', -1) as city_name,
      COUNT(*) as bookings_count
    FROM ride_bookings
    WHERE created_at >= NOW() - (period_days || ' days')::INTERVAL
      AND pickup_location IS NOT NULL
    GROUP BY SPLIT_PART(pickup_location, ',', -1)
  )
  SELECT 
    COALESCE(cu.city_name, cr.city_name, cb.city_name) as city,
    COALESCE(cu.new_users_count, 0) as new_users,
    COALESCE(cu.new_drivers_count, 0) as new_drivers,
    COALESCE(cr.rides_count, 0) as rides_created,
    COALESCE(cb.bookings_count, 0) as bookings_made
  FROM city_users cu
  FULL OUTER JOIN city_rides cr ON cu.city_name = cr.city_name
  FULL OUTER JOIN city_bookings cb ON COALESCE(cu.city_name, cr.city_name) = cb.city_name
  WHERE COALESCE(cu.city_name, cr.city_name, cb.city_name) != 'Unknown'
  ORDER BY new_users DESC, rides_created DESC
  LIMIT 20;
END;
$$;

-- Function: Get city match rate (how often users find rides in their city)
CREATE OR REPLACE FUNCTION get_city_match_stats()
RETURNS TABLE (
  city TEXT,
  total_searches BIGINT,
  successful_matches BIGINT,
  match_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This uses ride bookings as proxy for successful searches
  RETURN QUERY
  SELECT 
    COALESCE(p.city, p.home_city, 'Unknown') as city,
    COUNT(DISTINCT rb.passenger_id) as total_searches,
    COUNT(DISTINCT CASE WHEN rb.status IN ('confirmed', 'completed') THEN rb.passenger_id END) as successful_matches,
    ROUND(
      (COUNT(DISTINCT CASE WHEN rb.status IN ('confirmed', 'completed') THEN rb.passenger_id END)::NUMERIC / 
       NULLIF(COUNT(DISTINCT rb.passenger_id), 0) * 100), 2
    ) as match_rate
  FROM ride_bookings rb
  JOIN profiles p ON rb.passenger_id = p.id
  WHERE rb.created_at >= NOW() - INTERVAL '30 days'
    AND (p.city IS NOT NULL OR p.home_city IS NOT NULL)
  GROUP BY COALESCE(p.city, p.home_city, 'Unknown')
  ORDER BY total_searches DESC
  LIMIT 20;
END;
$$;

-- =====================================================
-- 3. DRIVER PERFORMANCE ANALYTICS
-- =====================================================

-- View: Driver leaderboard
CREATE OR REPLACE VIEW driver_leaderboard AS
SELECT 
  p.id as driver_id,
  p.full_name,
  p.avatar_url,
  COALESCE(p.city, p.home_city) as city,
  COUNT(DISTINCT r.id) as total_rides_offered,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'completed') as completed_rides,
  COUNT(DISTINCT rb.id) FILTER (WHERE rb.status = 'confirmed') as total_passengers,
  ROUND(AVG(rev.rating), 2) as average_rating,
  COUNT(DISTINCT rev.id) as review_count,
  ROUND(
    (COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'completed')::NUMERIC / 
     NULLIF(COUNT(DISTINCT r.id), 0) * 100), 2
  ) as reliability_score
FROM profiles p
JOIN rides r ON p.id = r.driver_id
LEFT JOIN ride_bookings rb ON r.id = rb.ride_id
LEFT JOIN reviews rev ON p.id = rev.reviewee_id
WHERE r.created_at >= NOW() - INTERVAL '90 days'
GROUP BY p.id, p.full_name, p.avatar_url, COALESCE(p.city, p.home_city)
HAVING COUNT(DISTINCT r.id) >= 1
ORDER BY reliability_score DESC, completed_rides DESC, average_rating DESC NULLS LAST
LIMIT 100;

-- Function: Get driver performance by ride type
CREATE OR REPLACE FUNCTION get_driver_performance_by_type(p_driver_id UUID DEFAULT NULL)
RETURNS TABLE (
  driver_id UUID,
  ride_type TEXT,
  rides_offered BIGINT,
  rides_completed BIGINT,
  avg_rating NUMERIC,
  fill_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.driver_id,
    COALESCE(r.ride_type, 'one_time') as ride_type,
    COUNT(*) as rides_offered,
    COUNT(*) FILTER (WHERE r.status = 'completed') as rides_completed,
    ROUND(AVG(rev.rating), 2) as avg_rating,
    ROUND(AVG((r.total_seats - r.available_seats)::NUMERIC / NULLIF(r.total_seats, 0) * 100), 2) as fill_rate
  FROM rides r
  LEFT JOIN reviews rev ON r.driver_id = rev.reviewee_id
  WHERE r.created_at >= NOW() - INTERVAL '90 days'
    AND (p_driver_id IS NULL OR r.driver_id = p_driver_id)
  GROUP BY r.driver_id, COALESCE(r.ride_type, 'one_time')
  ORDER BY rides_offered DESC;
END;
$$;

-- =====================================================
-- 4. COMPREHENSIVE DASHBOARD STATS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
  stat_name TEXT,
  stat_value BIGINT,
  change_percent NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_period_start TIMESTAMPTZ := NOW() - INTERVAL '30 days';
  previous_period_start TIMESTAMPTZ := NOW() - INTERVAL '60 days';
  previous_period_end TIMESTAMPTZ := NOW() - INTERVAL '30 days';
BEGIN
  RETURN QUERY
  -- Total Users
  SELECT 'total_users'::TEXT, 
    COUNT(*)::BIGINT,
    ROUND(((COUNT(*) FILTER (WHERE created_at >= current_period_start) - 
            COUNT(*) FILTER (WHERE created_at >= previous_period_start AND created_at < previous_period_end))::NUMERIC / 
           NULLIF(COUNT(*) FILTER (WHERE created_at >= previous_period_start AND created_at < previous_period_end), 0) * 100), 2)
  FROM profiles
  
  UNION ALL
  -- Active Drivers
  SELECT 'active_drivers'::TEXT,
    COUNT(DISTINCT driver_id)::BIGINT,
    NULL::NUMERIC
  FROM rides
  WHERE created_at >= current_period_start
  
  UNION ALL
  -- Total Rides
  SELECT 'total_rides'::TEXT,
    COUNT(*)::BIGINT,
    ROUND(((COUNT(*) FILTER (WHERE created_at >= current_period_start) - 
            COUNT(*) FILTER (WHERE created_at >= previous_period_start AND created_at < previous_period_end))::NUMERIC / 
           NULLIF(COUNT(*) FILTER (WHERE created_at >= previous_period_start AND created_at < previous_period_end), 0) * 100), 2)
  FROM rides
  
  UNION ALL
  -- Completed Rides (last 30 days)
  SELECT 'completed_rides'::TEXT,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT,
    NULL::NUMERIC
  FROM rides
  WHERE created_at >= current_period_start
  
  UNION ALL
  -- Total Bookings
  SELECT 'total_bookings'::TEXT,
    COUNT(*)::BIGINT,
    ROUND(((COUNT(*) FILTER (WHERE created_at >= current_period_start) - 
            COUNT(*) FILTER (WHERE created_at >= previous_period_start AND created_at < previous_period_end))::NUMERIC / 
           NULLIF(COUNT(*) FILTER (WHERE created_at >= previous_period_start AND created_at < previous_period_end), 0) * 100), 2)
  FROM ride_bookings
  
  UNION ALL
  -- Confirmed Bookings (last 30 days)
  SELECT 'confirmed_bookings'::TEXT,
    COUNT(*) FILTER (WHERE status = 'confirmed')::BIGINT,
    NULL::NUMERIC
  FROM ride_bookings
  WHERE created_at >= current_period_start
  
  UNION ALL
  -- Pending Bookings
  SELECT 'pending_bookings'::TEXT,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT,
    NULL::NUMERIC
  FROM ride_bookings
  
  UNION ALL
  -- Active Cities
  SELECT 'active_cities'::TEXT,
    COUNT(DISTINCT COALESCE(city, home_city))::BIGINT,
    NULL::NUMERIC
  FROM profiles
  WHERE city IS NOT NULL OR home_city IS NOT NULL
  
  UNION ALL
  -- Daily Commute Rides
  SELECT 'daily_commute_rides'::TEXT,
    COUNT(*) FILTER (WHERE ride_type = 'daily_commute')::BIGINT,
    NULL::NUMERIC
  FROM rides
  WHERE created_at >= current_period_start
  
  UNION ALL
  -- Airport Transfer Rides
  SELECT 'airport_rides'::TEXT,
    COUNT(*) FILTER (WHERE ride_type = 'airport_transfer')::BIGINT,
    NULL::NUMERIC
  FROM rides
  WHERE created_at >= current_period_start
  
  UNION ALL
  -- Average Rating
  SELECT 'avg_platform_rating'::TEXT,
    ROUND(AVG(rating))::BIGINT,
    NULL::NUMERIC
  FROM reviews
  WHERE created_at >= current_period_start;
END;
$$;

-- =====================================================
-- 5. REAL-TIME ACTIVITY METRICS
-- =====================================================

CREATE OR REPLACE FUNCTION get_realtime_activity()
RETURNS TABLE (
  metric TEXT,
  count BIGINT,
  time_period TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  -- Active users in last hour
  SELECT 'active_users_1h'::TEXT, 
    COUNT(DISTINCT id)::BIGINT, 
    'Last Hour'::TEXT
  FROM profiles 
  WHERE last_active_at >= NOW() - INTERVAL '1 hour'
  
  UNION ALL
  -- Rides departing today
  SELECT 'rides_today'::TEXT,
    COUNT(*)::BIGINT,
    'Today'::TEXT
  FROM rides
  WHERE DATE(departure_time) = CURRENT_DATE
    AND status IN ('active', 'scheduled')
  
  UNION ALL
  -- New bookings last hour
  SELECT 'new_bookings_1h'::TEXT,
    COUNT(*)::BIGINT,
    'Last Hour'::TEXT
  FROM ride_bookings
  WHERE created_at >= NOW() - INTERVAL '1 hour'
  
  UNION ALL
  -- New users today
  SELECT 'new_users_today'::TEXT,
    COUNT(*)::BIGINT,
    'Today'::TEXT
  FROM profiles
  WHERE DATE(created_at) = CURRENT_DATE
  
  UNION ALL
  -- Messages sent last hour
  SELECT 'messages_1h'::TEXT,
    COUNT(*)::BIGINT,
    'Last Hour'::TEXT
  FROM messages
  WHERE created_at >= NOW() - INTERVAL '1 hour';
END;
$$;

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

GRANT SELECT ON ride_type_distribution TO authenticated;
GRANT SELECT ON city_user_distribution TO authenticated;
GRANT SELECT ON city_ride_activity TO authenticated;
GRANT SELECT ON driver_leaderboard TO authenticated;

GRANT EXECUTE ON FUNCTION get_ride_type_trends(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ride_type_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION get_community_growth(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_city_match_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_driver_performance_by_type(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_realtime_activity() TO authenticated;

-- =====================================================
-- 7. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_rides_ride_type_created ON rides(ride_type, created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_city_created ON profiles(city, created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_home_city_created ON profiles(home_city, created_at);
CREATE INDEX IF NOT EXISTS idx_rides_driver_status ON rides(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_passenger_status ON ride_bookings(passenger_id, status);
