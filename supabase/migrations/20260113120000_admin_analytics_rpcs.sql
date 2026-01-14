-- Admin Analytics RPC Functions
-- SECURITY: All functions check for admin role before returning data
-- Returns ONLY aggregated data - no personal information exposed

-- Helper function to verify admin status
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_is_admin boolean;
BEGIN
  SELECT COALESCE(p.is_admin, false) OR EXISTS (
    SELECT 1 FROM admin_roles ar WHERE ar.user_id = auth.uid()
  ) INTO user_is_admin
  FROM profiles p
  WHERE p.id = auth.uid();
  
  RETURN COALESCE(user_is_admin, false);
END;
$$;

-- Create system_events table for ops tracking if not exists
CREATE TABLE IF NOT EXISTS system_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  community_id uuid REFERENCES communities(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  context jsonb DEFAULT '{}'::jsonb,
  source text DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_system_events_created_at ON system_events(created_at);
CREATE INDEX IF NOT EXISTS idx_system_events_severity ON system_events(severity);
CREATE INDEX IF NOT EXISTS idx_system_events_community ON system_events(community_id) WHERE community_id IS NOT NULL;

-- RLS for system_events (admin only)
ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can read system_events" ON system_events;
CREATE POLICY "Admin can read system_events" ON system_events
  FOR SELECT
  USING (is_admin_user());

DROP POLICY IF EXISTS "System can insert events" ON system_events;
CREATE POLICY "System can insert events" ON system_events
  FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- admin_kpi_summary: Returns aggregate KPIs for dashboard
-- ============================================================
CREATE OR REPLACE FUNCTION admin_kpi_summary(
  start_ts timestamptz,
  end_ts timestamptz,
  p_community_id uuid DEFAULT NULL,
  p_segment text DEFAULT 'all',
  p_ride_type text DEFAULT NULL
)
RETURNS TABLE (
  active_users bigint,
  active_users_delta numeric,
  new_users bigint,
  new_users_delta numeric,
  rides_posted bigint,
  rides_posted_delta numeric,
  bookings_created bigint,
  bookings_created_delta numeric,
  completion_rate numeric,
  completion_rate_delta numeric,
  cancellation_rate numeric,
  cancellation_rate_delta numeric,
  fill_rate numeric,
  fill_rate_delta numeric,
  messages_sent bigint,
  messages_sent_delta numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  period_duration interval;
  prev_start timestamptz;
  prev_end timestamptz;
  curr_active bigint;
  prev_active bigint;
  curr_new_users bigint;
  prev_new_users bigint;
  curr_rides bigint;
  prev_rides bigint;
  curr_bookings bigint;
  prev_bookings bigint;
  curr_messages bigint;
  curr_completed bigint;
  curr_cancelled bigint;
  total_seats bigint;
  booked_seats bigint;
BEGIN
  -- Security check
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Calculate previous period
  period_duration := end_ts - start_ts;
  prev_end := start_ts;
  prev_start := prev_end - period_duration;
  
  -- Current period: Active users (drivers + passengers with activity)
  SELECT COUNT(DISTINCT user_id) INTO curr_active
  FROM (
    SELECT r.driver_id AS user_id FROM rides r
    WHERE r.created_at >= start_ts AND r.created_at <= end_ts
      AND (p_ride_type IS NULL OR r.ride_type = p_ride_type)
      AND (p_segment = 'all' OR p_segment = 'drivers')
    UNION
    SELECT rb.passenger_id AS user_id FROM ride_bookings rb
    WHERE rb.created_at >= start_ts AND rb.created_at <= end_ts
      AND (p_segment = 'all' OR p_segment = 'passengers')
  ) active;
  
  -- Previous period: Active users
  SELECT COUNT(DISTINCT user_id) INTO prev_active
  FROM (
    SELECT r.driver_id AS user_id FROM rides r
    WHERE r.created_at >= prev_start AND r.created_at <= prev_end
      AND (p_ride_type IS NULL OR r.ride_type = p_ride_type)
      AND (p_segment = 'all' OR p_segment = 'drivers')
    UNION
    SELECT rb.passenger_id AS user_id FROM ride_bookings rb
    WHERE rb.created_at >= prev_start AND rb.created_at <= prev_end
      AND (p_segment = 'all' OR p_segment = 'passengers')
  ) active;
  
  -- New users
  SELECT COUNT(*) INTO curr_new_users
  FROM profiles p
  WHERE p.created_at >= start_ts AND p.created_at <= end_ts;
  
  SELECT COUNT(*) INTO prev_new_users
  FROM profiles p
  WHERE p.created_at >= prev_start AND p.created_at <= prev_end;
  
  -- Rides posted
  SELECT COUNT(*) INTO curr_rides
  FROM rides r
  WHERE r.created_at >= start_ts AND r.created_at <= end_ts
    AND (p_ride_type IS NULL OR r.ride_type = p_ride_type);
    
  SELECT COUNT(*) INTO prev_rides
  FROM rides r
  WHERE r.created_at >= prev_start AND r.created_at <= prev_end
    AND (p_ride_type IS NULL OR r.ride_type = p_ride_type);
  
  -- Bookings created
  SELECT COUNT(*) INTO curr_bookings
  FROM ride_bookings rb
  WHERE rb.created_at >= start_ts AND rb.created_at <= end_ts;
  
  SELECT COUNT(*) INTO prev_bookings
  FROM ride_bookings rb
  WHERE rb.created_at >= prev_start AND rb.created_at <= prev_end;
  
  -- Messages sent
  SELECT COUNT(*) INTO curr_messages
  FROM chat_messages cm
  WHERE cm.created_at >= start_ts AND cm.created_at <= end_ts;
  
  -- Completion/cancellation stats
  SELECT 
    COALESCE(SUM(CASE WHEN rb.status = 'completed' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN rb.status = 'cancelled' THEN 1 ELSE 0 END), 0)
  INTO curr_completed, curr_cancelled
  FROM ride_bookings rb
  WHERE rb.created_at >= start_ts AND rb.created_at <= end_ts;
  
  -- Fill rate (seats booked / total seats available)
  SELECT 
    COALESCE(SUM(r.available_seats), 0),
    COALESCE(SUM(COALESCE(rb.total_booked, 0)), 0)
  INTO total_seats, booked_seats
  FROM rides r
  LEFT JOIN (
    SELECT ride_id, SUM(seats_booked) AS total_booked
    FROM ride_bookings
    WHERE status IN ('confirmed', 'completed')
    GROUP BY ride_id
  ) rb ON r.id = rb.ride_id
  WHERE r.created_at >= start_ts AND r.created_at <= end_ts
    AND (p_ride_type IS NULL OR r.ride_type = p_ride_type);

  RETURN QUERY SELECT
    curr_active AS active_users,
    CASE WHEN prev_active = 0 THEN 0 
         ELSE ROUND(((curr_active - prev_active)::numeric / prev_active) * 100, 1) 
    END AS active_users_delta,
    curr_new_users AS new_users,
    CASE WHEN prev_new_users = 0 THEN 0 
         ELSE ROUND(((curr_new_users - prev_new_users)::numeric / prev_new_users) * 100, 1) 
    END AS new_users_delta,
    curr_rides AS rides_posted,
    CASE WHEN prev_rides = 0 THEN 0 
         ELSE ROUND(((curr_rides - prev_rides)::numeric / prev_rides) * 100, 1) 
    END AS rides_posted_delta,
    curr_bookings AS bookings_created,
    CASE WHEN prev_bookings = 0 THEN 0 
         ELSE ROUND(((curr_bookings - prev_bookings)::numeric / prev_bookings) * 100, 1) 
    END AS bookings_created_delta,
    CASE WHEN (curr_completed + curr_cancelled) = 0 THEN 0 
         ELSE ROUND((curr_completed::numeric / (curr_completed + curr_cancelled)) * 100, 1)
    END AS completion_rate,
    0::numeric AS completion_rate_delta,
    CASE WHEN (curr_completed + curr_cancelled) = 0 THEN 0 
         ELSE ROUND((curr_cancelled::numeric / (curr_completed + curr_cancelled)) * 100, 1)
    END AS cancellation_rate,
    0::numeric AS cancellation_rate_delta,
    CASE WHEN total_seats = 0 THEN 0 
         ELSE ROUND((booked_seats::numeric / total_seats) * 100, 1)
    END AS fill_rate,
    0::numeric AS fill_rate_delta,
    curr_messages AS messages_sent,
    0::numeric AS messages_sent_delta;
END;
$$;

-- ============================================================
-- admin_timeseries: Returns time-bucketed metric data
-- ============================================================
CREATE OR REPLACE FUNCTION admin_timeseries(
  p_metric text,
  p_interval text,
  start_ts timestamptz,
  end_ts timestamptz,
  p_community_id uuid DEFAULT NULL,
  p_segment text DEFAULT 'all',
  p_ride_type text DEFAULT NULL
)
RETURNS TABLE (
  bucket_ts timestamptz,
  value bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Security check
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  IF p_metric = 'rides' THEN
    RETURN QUERY
    SELECT 
      date_trunc(p_interval, r.created_at) AS bucket_ts,
      COUNT(*)::bigint AS value
    FROM rides r
    WHERE r.created_at >= start_ts AND r.created_at <= end_ts
      AND (p_ride_type IS NULL OR r.ride_type = p_ride_type)
    GROUP BY date_trunc(p_interval, r.created_at)
    ORDER BY bucket_ts;
    
  ELSIF p_metric = 'bookings' THEN
    RETURN QUERY
    SELECT 
      date_trunc(p_interval, rb.created_at) AS bucket_ts,
      COUNT(*)::bigint AS value
    FROM ride_bookings rb
    WHERE rb.created_at >= start_ts AND rb.created_at <= end_ts
    GROUP BY date_trunc(p_interval, rb.created_at)
    ORDER BY bucket_ts;
    
  ELSIF p_metric = 'users' THEN
    RETURN QUERY
    SELECT 
      date_trunc(p_interval, p.created_at) AS bucket_ts,
      COUNT(*)::bigint AS value
    FROM profiles p
    WHERE p.created_at >= start_ts AND p.created_at <= end_ts
    GROUP BY date_trunc(p_interval, p.created_at)
    ORDER BY bucket_ts;
    
  ELSIF p_metric = 'messages' THEN
    RETURN QUERY
    SELECT 
      date_trunc(p_interval, cm.created_at) AS bucket_ts,
      COUNT(*)::bigint AS value
    FROM chat_messages cm
    WHERE cm.created_at >= start_ts AND cm.created_at <= end_ts
    GROUP BY date_trunc(p_interval, cm.created_at)
    ORDER BY bucket_ts;
    
  ELSIF p_metric = 'completion_rate' THEN
    RETURN QUERY
    SELECT 
      date_trunc(p_interval, rb.created_at) AS bucket_ts,
      CASE 
        WHEN COUNT(*) = 0 THEN 0
        ELSE (COUNT(*) FILTER (WHERE rb.status = 'completed') * 100 / COUNT(*))::bigint
      END AS value
    FROM ride_bookings rb
    WHERE rb.created_at >= start_ts AND rb.created_at <= end_ts
    GROUP BY date_trunc(p_interval, rb.created_at)
    ORDER BY bucket_ts;
  ELSE
    -- Return empty for unknown metrics
    RETURN;
  END IF;
END;
$$;

-- ============================================================
-- admin_top_routes: Returns most popular origin-destination pairs
-- ============================================================
CREATE OR REPLACE FUNCTION admin_top_routes(
  start_ts timestamptz,
  end_ts timestamptz,
  p_community_id uuid DEFAULT NULL,
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  origin_label text,
  destination_label text,
  rides bigint,
  bookings bigint,
  avg_fill numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Security check
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  RETURN QUERY
  SELECT 
    r.origin AS origin_label,
    r.destination AS destination_label,
    COUNT(DISTINCT r.id)::bigint AS rides,
    COUNT(rb.id)::bigint AS bookings,
    CASE 
      WHEN SUM(r.available_seats) = 0 THEN 0
      ELSE ROUND((SUM(COALESCE(rb.seats_booked, 0))::numeric / SUM(r.available_seats)) * 100, 1)
    END AS avg_fill
  FROM rides r
  LEFT JOIN ride_bookings rb ON rb.ride_id = r.id AND rb.status IN ('confirmed', 'completed')
  WHERE r.created_at >= start_ts AND r.created_at <= end_ts
  GROUP BY r.origin, r.destination
  ORDER BY rides DESC, bookings DESC
  LIMIT p_limit;
END;
$$;

-- ============================================================
-- admin_geo_distribution: Returns geographic breakdown
-- ============================================================
CREATE OR REPLACE FUNCTION admin_geo_distribution(
  start_ts timestamptz,
  end_ts timestamptz,
  p_community_id uuid DEFAULT NULL
)
RETURNS TABLE (
  area_label text,
  rides bigint,
  bookings bigint,
  users bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Security check
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Extract city from origin (simple split on comma)
  RETURN QUERY
  SELECT 
    COALESCE(SPLIT_PART(r.origin, ',', 1), 'Unknown') AS area_label,
    COUNT(DISTINCT r.id)::bigint AS rides,
    COUNT(DISTINCT rb.id)::bigint AS bookings,
    COUNT(DISTINCT r.driver_id)::bigint AS users
  FROM rides r
  LEFT JOIN ride_bookings rb ON rb.ride_id = r.id
  WHERE r.created_at >= start_ts AND r.created_at <= end_ts
  GROUP BY SPLIT_PART(r.origin, ',', 1)
  ORDER BY rides DESC
  LIMIT 20;
END;
$$;

-- ============================================================
-- admin_ops_health: Returns system health metrics
-- ============================================================
CREATE OR REPLACE FUNCTION admin_ops_health(
  start_ts timestamptz,
  end_ts timestamptz,
  p_community_id uuid DEFAULT NULL
)
RETURNS TABLE (
  job_failures bigint,
  notification_failures bigint,
  error_events bigint,
  avg_latency numeric,
  system_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  error_count bigint;
  warning_count bigint;
  critical_count bigint;
  status text;
BEGIN
  -- Security check
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Count events by severity
  SELECT 
    COALESCE(SUM(CASE WHEN se.severity = 'error' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN se.severity = 'warning' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN se.severity = 'critical' THEN 1 ELSE 0 END), 0)
  INTO error_count, warning_count, critical_count
  FROM system_events se
  WHERE se.created_at >= start_ts AND se.created_at <= end_ts
    AND (p_community_id IS NULL OR se.community_id = p_community_id);
  
  -- Determine system status
  IF critical_count > 0 THEN
    status := 'critical';
  ELSIF error_count > 10 OR warning_count > 50 THEN
    status := 'degraded';
  ELSE
    status := 'healthy';
  END IF;
  
  RETURN QUERY SELECT
    0::bigint AS job_failures,
    0::bigint AS notification_failures,
    error_count AS error_events,
    NULL::numeric AS avg_latency,
    status AS system_status;
END;
$$;

-- ============================================================
-- admin_user_segments: Returns user segment breakdown
-- ============================================================
CREATE OR REPLACE FUNCTION admin_user_segments(
  start_ts timestamptz,
  end_ts timestamptz
)
RETURNS TABLE (
  segment text,
  count bigint,
  percentage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_users bigint;
  drivers_count bigint;
  passengers_count bigint;
  both_count bigint;
  inactive_count bigint;
BEGIN
  -- Security check
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Total users
  SELECT COUNT(*) INTO total_users FROM profiles;
  
  -- Users who have posted rides
  SELECT COUNT(DISTINCT r.driver_id) INTO drivers_count
  FROM rides r
  WHERE r.created_at >= start_ts AND r.created_at <= end_ts;
  
  -- Users who have booked rides
  SELECT COUNT(DISTINCT rb.passenger_id) INTO passengers_count
  FROM ride_bookings rb
  WHERE rb.created_at >= start_ts AND rb.created_at <= end_ts;
  
  -- Users who have done both
  SELECT COUNT(*) INTO both_count
  FROM (
    SELECT driver_id FROM rides WHERE created_at >= start_ts AND created_at <= end_ts
    INTERSECT
    SELECT passenger_id FROM ride_bookings WHERE created_at >= start_ts AND created_at <= end_ts
  ) both_users;
  
  -- Inactive users
  inactive_count := total_users - drivers_count - passengers_count + both_count;
  
  RETURN QUERY
  SELECT 'Drivers Only'::text, 
         (drivers_count - both_count)::bigint,
         CASE WHEN total_users = 0 THEN 0 
              ELSE ROUND(((drivers_count - both_count)::numeric / total_users) * 100, 1) 
         END
  UNION ALL
  SELECT 'Passengers Only'::text,
         (passengers_count - both_count)::bigint,
         CASE WHEN total_users = 0 THEN 0 
              ELSE ROUND(((passengers_count - both_count)::numeric / total_users) * 100, 1) 
         END
  UNION ALL
  SELECT 'Both (Driver + Passenger)'::text,
         both_count,
         CASE WHEN total_users = 0 THEN 0 
              ELSE ROUND((both_count::numeric / total_users) * 100, 1) 
         END
  UNION ALL
  SELECT 'Inactive'::text,
         GREATEST(inactive_count, 0)::bigint,
         CASE WHEN total_users = 0 THEN 0 
              ELSE ROUND((GREATEST(inactive_count, 0)::numeric / total_users) * 100, 1) 
         END;
END;
$$;

-- Grant execute permissions to authenticated users (RPC checks admin internally)
GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_kpi_summary(timestamptz, timestamptz, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_timeseries(text, text, timestamptz, timestamptz, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_top_routes(timestamptz, timestamptz, uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_geo_distribution(timestamptz, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_ops_health(timestamptz, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_user_segments(timestamptz, timestamptz) TO authenticated;
