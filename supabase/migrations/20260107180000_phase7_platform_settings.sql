-- Phase 7: Platform Settings & System Health
-- Global configuration, feature flags, and system monitoring

-- =====================================================
-- 1. PLATFORM SETTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  setting_type TEXT NOT NULL CHECK (setting_type IN ('boolean', 'number', 'string', 'json', 'array')),
  category TEXT NOT NULL CHECK (category IN ('features', 'limits', 'security', 'notifications', 'maintenance', 'integrations')),
  description TEXT,
  is_public BOOLEAN DEFAULT false, -- Can non-admin users view this setting?
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default platform settings
INSERT INTO platform_settings (setting_key, setting_value, setting_type, category, description, is_public) VALUES
  -- Feature Flags
  ('features.messaging_enabled', 'true', 'boolean', 'features', 'Enable in-app messaging between users', true),
  ('features.ride_types_enabled', 'true', 'boolean', 'features', 'Enable ride type categorization', true),
  ('features.recurring_rides_enabled', 'true', 'boolean', 'features', 'Enable recurring/scheduled rides', true),
  ('features.reviews_enabled', 'true', 'boolean', 'features', 'Enable user reviews and ratings', true),
  ('features.community_posts_enabled', 'true', 'boolean', 'features', 'Enable community forum posts', true),
  ('features.face_verification_required', 'false', 'boolean', 'features', 'Require face verification for all users', true),
  
  -- Limits & Restrictions
  ('limits.max_active_rides_per_user', '10', 'number', 'limits', 'Maximum active rides a user can post', false),
  ('limits.max_bookings_per_day', '20', 'number', 'limits', 'Maximum bookings a user can make per day', false),
  ('limits.default_search_radius_km', '50', 'number', 'limits', 'Default search radius in kilometers', true),
  ('limits.max_search_radius_km', '200', 'number', 'limits', 'Maximum allowed search radius', true),
  ('limits.min_ride_notice_hours', '2', 'number', 'limits', 'Minimum hours before departure to post ride', true),
  ('limits.max_seats_per_ride', '8', 'number', 'limits', 'Maximum seats allowed per ride', true),
  
  -- Security & Rate Limiting
  ('security.rate_limit_requests_per_minute', '60', 'number', 'security', 'API requests per minute per user', false),
  ('security.login_attempts_before_lockout', '5', 'number', 'security', 'Failed login attempts before account lockout', false),
  ('security.lockout_duration_minutes', '30', 'number', 'security', 'Account lockout duration in minutes', false),
  ('security.session_timeout_hours', '168', 'number', 'security', 'User session timeout (hours)', false),
  ('security.require_email_verification', 'true', 'boolean', 'security', 'Require email verification to use platform', true),
  
  -- Notifications
  ('notifications.email_enabled', 'true', 'boolean', 'notifications', 'Enable email notifications', false),
  ('notifications.push_enabled', 'true', 'boolean', 'notifications', 'Enable push notifications', false),
  ('notifications.ride_reminder_hours', '2', 'number', 'notifications', 'Send ride reminder X hours before departure', true),
  ('notifications.inactive_user_days', '30', 'number', 'notifications', 'Days before marking user as inactive', false),
  
  -- Maintenance
  ('maintenance.mode_enabled', 'false', 'boolean', 'maintenance', 'Enable maintenance mode (blocks all users except admins)', false),
  ('maintenance.message', '"Platform maintenance in progress. We''ll be back soon!"', 'string', 'maintenance', 'Message to show during maintenance', false),
  ('maintenance.allowed_ips', '[]', 'array', 'maintenance', 'IP addresses allowed during maintenance', false),
  
  -- Integrations
  ('integrations.google_maps_enabled', 'true', 'boolean', 'integrations', 'Enable Google Maps integration', false),
  ('integrations.sms_enabled', 'false', 'boolean', 'integrations', 'Enable SMS notifications', false),
  ('integrations.analytics_enabled', 'true', 'boolean', 'integrations', 'Enable analytics tracking', false)
ON CONFLICT (setting_key) DO NOTHING;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON platform_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_platform_settings_category ON platform_settings(category);

-- =====================================================
-- 2. SYSTEM HEALTH MONITORING
-- =====================================================

-- Function: Get database statistics
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS TABLE (
  metric TEXT,
  value BIGINT,
  unit TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  -- Total users
  SELECT 'total_users'::TEXT, COUNT(*)::BIGINT, 'count'::TEXT FROM profiles
  UNION ALL
  -- Total rides
  SELECT 'total_rides'::TEXT, COUNT(*)::BIGINT, 'count'::TEXT FROM rides
  UNION ALL
  -- Total bookings
  SELECT 'total_bookings'::TEXT, COUNT(*)::BIGINT, 'count'::TEXT FROM ride_bookings
  UNION ALL
  -- Total messages
  SELECT 'total_messages'::TEXT, COUNT(*)::BIGINT, 'count'::TEXT FROM messages
  UNION ALL
  -- Active rides (next 7 days)
  SELECT 'active_rides_7d'::TEXT, 
    COUNT(*)::BIGINT, 
    'count'::TEXT 
  FROM rides 
  WHERE departure_time BETWEEN NOW() AND NOW() + INTERVAL '7 days'
    AND status IN ('active', 'scheduled')
  UNION ALL
  -- Database size estimate (sum of all tables)
  SELECT 'database_size'::TEXT,
    (SELECT SUM(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename)))::BIGINT
     FROM pg_tables WHERE schemaname = 'public'),
    'bytes'::TEXT;
END;
$$;

-- Function: Get system performance metrics
CREATE OR REPLACE FUNCTION get_system_performance()
RETURNS TABLE (
  metric TEXT,
  value NUMERIC,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  avg_response_time NUMERIC;
  error_rate NUMERIC;
  active_connections INT;
BEGIN
  -- Calculate average API response time (last hour)
  -- This is a placeholder - you'd integrate with actual logging
  avg_response_time := 150.5;
  
  -- Calculate error rate
  error_rate := 0.5;
  
  -- Get active database connections
  SELECT COUNT(*) INTO active_connections
  FROM pg_stat_activity
  WHERE state = 'active';
  
  RETURN QUERY
  SELECT 'avg_response_time'::TEXT, 
    avg_response_time, 
    CASE 
      WHEN avg_response_time < 200 THEN 'good'::TEXT
      WHEN avg_response_time < 500 THEN 'warning'::TEXT
      ELSE 'critical'::TEXT
    END
  UNION ALL
  SELECT 'error_rate'::TEXT,
    error_rate,
    CASE
      WHEN error_rate < 1 THEN 'good'::TEXT
      WHEN error_rate < 5 THEN 'warning'::TEXT
      ELSE 'critical'::TEXT
    END
  UNION ALL
  SELECT 'active_connections'::TEXT,
    active_connections::NUMERIC,
    CASE
      WHEN active_connections < 50 THEN 'good'::TEXT
      WHEN active_connections < 80 THEN 'warning'::TEXT
      ELSE 'critical'::TEXT
    END;
END;
$$;

-- Function: Get recent errors and warnings
CREATE OR REPLACE FUNCTION get_recent_errors(hours_back INTEGER DEFAULT 24)
RETURNS TABLE (
  error_type TEXT,
  error_count BIGINT,
  last_occurrence TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This queries admin action logs for failed actions
  RETURN QUERY
  SELECT 
    action_type::TEXT,
    COUNT(*)::BIGINT as error_count,
    MAX(created_at) as last_occurrence
  FROM admin_action_logs
  WHERE created_at >= NOW() - (hours_back || ' hours')::INTERVAL
    AND action_type LIKE '%_failed' OR action_type LIKE '%_error'
  GROUP BY action_type
  ORDER BY error_count DESC
  LIMIT 20;
END;
$$;

-- Function: Get platform health score
CREATE OR REPLACE FUNCTION get_platform_health_score()
RETURNS TABLE (
  overall_score INTEGER,
  status TEXT,
  details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  score INTEGER := 100;
  health_details JSONB := '{}';
  active_users_24h INTEGER;
  error_count_24h INTEGER;
  failed_rides INTEGER;
BEGIN
  -- Check active users in last 24 hours
  SELECT COUNT(DISTINCT id) INTO active_users_24h
  FROM profiles
  WHERE last_active_at >= NOW() - INTERVAL '24 hours';
  
  health_details := jsonb_set(health_details, '{active_users_24h}', to_jsonb(active_users_24h));
  
  -- Check error count (actions with 'failed' or 'error' in name)
  SELECT COUNT(*) INTO error_count_24h
  FROM admin_action_logs
  WHERE created_at >= NOW() - INTERVAL '24 hours'
    AND (action_type LIKE '%_failed' OR action_type LIKE '%_error');
  
  health_details := jsonb_set(health_details, '{errors_24h}', to_jsonb(error_count_24h));
  
  IF error_count_24h > 100 THEN
    score := score - 20;
  ELSIF error_count_24h > 50 THEN
    score := score - 10;
  END IF;
  
  -- Check failed/cancelled rides
  SELECT COUNT(*) INTO failed_rides
  FROM rides
  WHERE created_at >= NOW() - INTERVAL '24 hours'
    AND status = 'cancelled';
  
  health_details := jsonb_set(health_details, '{cancelled_rides_24h}', to_jsonb(failed_rides));
  
  IF failed_rides > 50 THEN
    score := score - 15;
  ELSIF failed_rides > 20 THEN
    score := score - 5;
  END IF;
  
  -- Return result
  RETURN QUERY
  SELECT 
    score,
    CASE 
      WHEN score >= 90 THEN 'excellent'::TEXT
      WHEN score >= 70 THEN 'good'::TEXT
      WHEN score >= 50 THEN 'fair'::TEXT
      ELSE 'poor'::TEXT
    END,
    health_details;
END;
$$;

-- =====================================================
-- 3. AUTOMATED TASKS TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS automated_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_name TEXT UNIQUE NOT NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('cleanup', 'notification', 'report', 'backup', 'maintenance')),
  schedule_cron TEXT, -- Cron expression for scheduling
  enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT CHECK (last_run_status IN ('success', 'failed', 'running')),
  last_run_duration_ms INTEGER,
  last_error TEXT,
  run_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default automated tasks
INSERT INTO automated_tasks (task_name, task_type, schedule_cron, enabled) VALUES
  ('cleanup_old_notifications', 'cleanup', '0 2 * * *', true), -- Daily at 2 AM
  ('cleanup_expired_rides', 'cleanup', '0 3 * * *', true), -- Daily at 3 AM
  ('send_ride_reminders', 'notification', '*/30 * * * *', true), -- Every 30 minutes
  ('send_inactive_user_emails', 'notification', '0 10 * * 1', true), -- Mondays at 10 AM
  ('generate_weekly_report', 'report', '0 9 * * 1', true), -- Mondays at 9 AM
  ('update_user_statistics', 'maintenance', '0 4 * * *', true) -- Daily at 4 AM
ON CONFLICT (task_name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_automated_tasks_enabled ON automated_tasks(enabled, last_run_at);

-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

-- Function: Get platform setting
CREATE OR REPLACE FUNCTION get_platform_setting(p_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT setting_value INTO result
  FROM platform_settings
  WHERE setting_key = p_key;
  
  RETURN COALESCE(result, 'null'::JSONB);
END;
$$;

-- Function: Update platform setting (admin only)
CREATE OR REPLACE FUNCTION update_platform_setting(
  p_key TEXT,
  p_value JSONB,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT EXISTS(
    SELECT 1 FROM profiles
    WHERE id = p_user_id AND is_admin = true
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only administrators can update platform settings';
  END IF;
  
  -- Update setting
  UPDATE platform_settings
  SET setting_value = p_value,
      updated_by = p_user_id,
      updated_at = NOW()
  WHERE setting_key = p_key;
  
  -- Log the change
  INSERT INTO admin_action_logs (
    admin_id,
    admin_email,
    action_type,
    resource_type,
    resource_id,
    new_state
  ) 
  SELECT
    p_user_id,
    email,
    'update_setting',
    'platform_setting',
    gen_random_uuid(), -- Use UUID instead of text key
    jsonb_build_object('setting_key', p_key, 'new_value', p_value)
  FROM profiles
  WHERE id = p_user_id;
  
  RETURN true;
END;
$$;

-- =====================================================
-- 5. RLS POLICIES
-- =====================================================

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE automated_tasks ENABLE ROW LEVEL SECURITY;

-- Platform settings: Admins can view all, users can view public settings
CREATE POLICY "Admin full access to platform settings"
  ON platform_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Users can view public settings"
  ON platform_settings FOR SELECT
  USING (is_public = true);

-- Automated tasks: Admin only
CREATE POLICY "Admin full access to automated tasks"
  ON automated_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

GRANT SELECT ON platform_settings TO authenticated;
GRANT SELECT ON automated_tasks TO authenticated;

GRANT EXECUTE ON FUNCTION get_platform_setting(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_platform_setting(TEXT, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_database_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_errors(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_health_score() TO authenticated;

-- =====================================================
-- 7. INDEXES
-- =====================================================

-- Index for error tracking (already created in admin_action_logs migration)
-- CREATE INDEX IF NOT EXISTS idx_admin_logs_action_type ON admin_action_logs(action_type);

-- Note: Profiles table index removed - last_active_at column may not exist in all schemas
