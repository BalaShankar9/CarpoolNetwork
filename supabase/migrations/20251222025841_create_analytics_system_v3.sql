/*
  # Advanced Analytics System - Phase 2
  
  Creates comprehensive analytics views and functions for the admin dashboard.
*/

-- Daily metrics aggregation
CREATE OR REPLACE VIEW daily_metrics AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as count,
  'rides' as metric_type
FROM rides
GROUP BY DATE(created_at)
UNION ALL
SELECT 
  DATE(created_at) as date,
  COUNT(*) as count,
  'bookings' as metric_type
FROM ride_bookings
GROUP BY DATE(created_at)
UNION ALL
SELECT 
  DATE(created_at) as date,
  COUNT(*) as count,
  'users' as metric_type
FROM profiles
GROUP BY DATE(created_at);

-- Ride completion analytics
CREATE OR REPLACE VIEW ride_completion_stats AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'completed') as completed_rides,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_rides,
  COUNT(*) FILTER (WHERE status = 'active') as active_rides,
  COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_rides,
  COUNT(*) as total_rides,
  ROUND((COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / NULLIF(COUNT(*), 0) * 100), 2) as completion_rate
FROM rides
WHERE created_at >= NOW() - INTERVAL '30 days';

-- Booking success metrics
CREATE OR REPLACE VIEW booking_success_metrics AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_bookings,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_bookings,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_bookings,
  COUNT(*) as total_bookings,
  ROUND((COUNT(*) FILTER (WHERE status = 'confirmed')::DECIMAL / NULLIF(COUNT(*), 0) * 100), 2) as confirmation_rate
FROM ride_bookings
WHERE created_at >= NOW() - INTERVAL '30 days';

-- Popular routes
CREATE OR REPLACE VIEW popular_routes AS
SELECT 
  origin,
  destination,
  COUNT(*) as ride_count,
  COUNT(DISTINCT driver_id) as unique_drivers,
  ROUND(AVG(available_seats), 1) as avg_seats
FROM rides
WHERE created_at >= NOW() - INTERVAL '30 days' AND origin IS NOT NULL AND destination IS NOT NULL
GROUP BY origin, destination
ORDER BY ride_count DESC
LIMIT 20;

-- Get user growth over time
CREATE OR REPLACE FUNCTION get_user_growth(period_days INTEGER DEFAULT 30)
RETURNS TABLE (date DATE, new_users BIGINT, cumulative_users BIGINT) AS $$
BEGIN
  RETURN QUERY
  WITH daily_signups AS (
    SELECT DATE(created_at) as signup_date, COUNT(*) as new_users
    FROM profiles
    WHERE created_at >= NOW() - (period_days || ' days')::INTERVAL
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at)
  )
  SELECT signup_date as date, new_users, SUM(new_users) OVER (ORDER BY signup_date) as cumulative_users
  FROM daily_signups;
END;
$$ LANGUAGE plpgsql;

-- Get ride statistics by time of day
CREATE OR REPLACE FUNCTION get_peak_times()
RETURNS TABLE (hour_of_day INTEGER, ride_count BIGINT, avg_seats NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(HOUR FROM departure_time)::INTEGER as hour_of_day,
    COUNT(*) as ride_count,
    ROUND(AVG(available_seats), 1) as avg_seats
  FROM rides
  WHERE departure_time >= NOW() - INTERVAL '30 days'
  GROUP BY EXTRACT(HOUR FROM departure_time)
  ORDER BY hour_of_day;
END;
$$ LANGUAGE plpgsql;

-- Get booking conversion funnel
CREATE OR REPLACE FUNCTION get_booking_funnel(period_days INTEGER DEFAULT 30)
RETURNS TABLE (stage TEXT, count BIGINT, percentage NUMERIC) AS $$
DECLARE
  total_rides BIGINT; total_bookings BIGINT; confirmed_bookings BIGINT; completed_rides BIGINT;
BEGIN
  SELECT COUNT(*) INTO total_rides FROM rides WHERE created_at >= NOW() - (period_days || ' days')::INTERVAL;
  SELECT COUNT(*) INTO total_bookings FROM ride_bookings WHERE created_at >= NOW() - (period_days || ' days')::INTERVAL;
  SELECT COUNT(*) INTO confirmed_bookings FROM ride_bookings WHERE status = 'confirmed' AND created_at >= NOW() - (period_days || ' days')::INTERVAL;
  SELECT COUNT(*) INTO completed_rides FROM rides WHERE status = 'completed' AND created_at >= NOW() - (period_days || ' days')::INTERVAL;

  RETURN QUERY
  SELECT 'Rides Posted'::TEXT, total_rides, 100.0
  UNION ALL SELECT 'Booking Requests'::TEXT, total_bookings, ROUND((total_bookings::NUMERIC / NULLIF(total_rides, 0) * 100), 2)
  UNION ALL SELECT 'Confirmed Bookings'::TEXT, confirmed_bookings, ROUND((confirmed_bookings::NUMERIC / NULLIF(total_bookings, 0) * 100), 2)
  UNION ALL SELECT 'Completed Rides'::TEXT, completed_rides, ROUND((completed_rides::NUMERIC / NULLIF(confirmed_bookings, 0) * 100), 2);
END;
$$ LANGUAGE plpgsql;

-- Get geographic distribution
CREATE OR REPLACE FUNCTION get_geographic_distribution()
RETURNS TABLE (location TEXT, ride_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  WITH origin_counts AS (
    SELECT origin as location, COUNT(*) as count FROM rides 
    WHERE created_at >= NOW() - INTERVAL '30 days' AND origin IS NOT NULL GROUP BY origin
  ),
  destination_counts AS (
    SELECT destination as location, COUNT(*) as count FROM rides 
    WHERE created_at >= NOW() - INTERVAL '30 days' AND destination IS NOT NULL GROUP BY destination
  )
  SELECT COALESCE(oc.location, dc.location) as location, COALESCE(oc.count, 0) + COALESCE(dc.count, 0) as ride_count
  FROM origin_counts oc
  FULL OUTER JOIN destination_counts dc ON oc.location = dc.location
  ORDER BY ride_count DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- Get retention metrics
CREATE OR REPLACE FUNCTION get_retention_metrics(cohort_start DATE DEFAULT CURRENT_DATE - INTERVAL '90 days', cohort_end DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (cohort_month TEXT, users_count BIGINT, retained_users BIGINT, retention_rate NUMERIC) AS $$
BEGIN
  RETURN QUERY
  WITH cohorts AS (
    SELECT TO_CHAR(created_at, 'YYYY-MM') as cohort, id as user_id
    FROM profiles WHERE created_at::DATE BETWEEN cohort_start AND cohort_end
  ),
  active_users AS (
    SELECT DISTINCT TO_CHAR(r.created_at, 'YYYY-MM') as activity_month, r.driver_id as user_id
    FROM rides r WHERE r.created_at >= cohort_start
    UNION
    SELECT DISTINCT TO_CHAR(rb.created_at, 'YYYY-MM') as activity_month, rb.passenger_id as user_id
    FROM ride_bookings rb WHERE rb.created_at >= cohort_start
  )
  SELECT 
    c.cohort as cohort_month,
    COUNT(DISTINCT c.user_id) as users_count,
    COUNT(DISTINCT au.user_id) as retained_users,
    ROUND((COUNT(DISTINCT au.user_id)::NUMERIC / NULLIF(COUNT(DISTINCT c.user_id), 0) * 100), 2) as retention_rate
  FROM cohorts c
  LEFT JOIN active_users au ON c.user_id = au.user_id AND au.activity_month > c.cohort
  GROUP BY c.cohort
  ORDER BY c.cohort DESC;
END;
$$ LANGUAGE plpgsql;

-- Get period comparison
CREATE OR REPLACE FUNCTION get_period_comparison(current_start DATE, current_end DATE, previous_start DATE, previous_end DATE)
RETURNS TABLE (metric TEXT, current_value BIGINT, previous_value BIGINT, change_percentage NUMERIC) AS $$
BEGIN
  RETURN QUERY
  WITH current_metrics AS (
    SELECT 
      COUNT(*) FILTER (WHERE created_at BETWEEN current_start AND current_end) as rides,
      COUNT(DISTINCT driver_id) FILTER (WHERE created_at BETWEEN current_start AND current_end) as drivers
    FROM rides
  ),
  previous_metrics AS (
    SELECT 
      COUNT(*) FILTER (WHERE created_at BETWEEN previous_start AND previous_end) as rides,
      COUNT(DISTINCT driver_id) FILTER (WHERE created_at BETWEEN previous_start AND previous_end) as drivers
    FROM rides
  )
  SELECT 'Total Rides'::TEXT, cm.rides, pm.rides, ROUND(((cm.rides - pm.rides)::NUMERIC / NULLIF(pm.rides, 0) * 100), 2)
  FROM current_metrics cm, previous_metrics pm
  UNION ALL
  SELECT 'Total Bookings'::TEXT, 
    (SELECT COUNT(*) FROM ride_bookings WHERE created_at BETWEEN current_start AND current_end),
    (SELECT COUNT(*) FROM ride_bookings WHERE created_at BETWEEN previous_start AND previous_end),
    ROUND((((SELECT COUNT(*) FROM ride_bookings WHERE created_at BETWEEN current_start AND current_end) - 
            (SELECT COUNT(*) FROM ride_bookings WHERE created_at BETWEEN previous_start AND previous_end))::NUMERIC / 
            NULLIF((SELECT COUNT(*) FROM ride_bookings WHERE created_at BETWEEN previous_start AND previous_end), 0) * 100), 2)
  UNION ALL
  SELECT 'New Users'::TEXT,
    (SELECT COUNT(*) FROM profiles WHERE created_at BETWEEN current_start AND current_end),
    (SELECT COUNT(*) FROM profiles WHERE created_at BETWEEN previous_start AND previous_end),
    ROUND((((SELECT COUNT(*) FROM profiles WHERE created_at BETWEEN current_start AND current_end) -
            (SELECT COUNT(*) FROM profiles WHERE created_at BETWEEN previous_start AND previous_end))::NUMERIC /
            NULLIF((SELECT COUNT(*) FROM profiles WHERE created_at BETWEEN previous_start AND previous_end), 0) * 100), 2);
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rides_created_at_status ON rides(created_at, status);
CREATE INDEX IF NOT EXISTS idx_rides_departure_time ON rides(departure_time);
CREATE INDEX IF NOT EXISTS idx_rides_locations ON rides(origin, destination);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at_status ON ride_bookings(created_at, status);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);
