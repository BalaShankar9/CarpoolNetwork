/*
  # Real-Time Activity Monitor System - Phase 3

  Creates comprehensive activity tracking and real-time monitoring system.
  
  1. Tables
    - activity_logs: Central activity tracking table with realtime enabled
    - critical_alerts: High-priority events requiring immediate attention
    - activity_stats: Real-time aggregated statistics
    
  2. Functions
    - log_activity: Helper function to log activities
    - get_live_metrics: Real-time platform metrics
    - get_activity_feed: Paginated activity feed with filters
    
  3. Security
    - Admin-only access via RLS
    - Realtime enabled for instant updates
*/

-- ============================================================================
-- Activity Logs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_name TEXT,
  actor_email TEXT,
  target_type TEXT,
  target_id UUID,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_severity ON activity_logs(severity);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor ON activity_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_target ON activity_logs(target_type, target_id);

COMMENT ON TABLE activity_logs IS 'Comprehensive activity tracking for admin monitoring';
COMMENT ON COLUMN activity_logs.activity_type IS 'Type: user, ride, booking, payment, security, system';
COMMENT ON COLUMN activity_logs.severity IS 'Severity: info, warning, error, critical';

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;

-- ============================================================================
-- Critical Alerts Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS critical_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  status TEXT NOT NULL DEFAULT 'active',
  related_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  related_ride_id UUID REFERENCES rides(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}'::jsonb,
  acknowledged_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_critical_alerts_status ON critical_alerts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_critical_alerts_type ON critical_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_critical_alerts_severity ON critical_alerts(severity);

COMMENT ON TABLE critical_alerts IS 'High-priority events requiring immediate admin attention';
COMMENT ON COLUMN critical_alerts.alert_type IS 'Type: safety, fraud, abuse, system_failure, payment';
COMMENT ON COLUMN critical_alerts.status IS 'Status: active, acknowledged, resolved, dismissed';

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE critical_alerts;

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE critical_alerts ENABLE ROW LEVEL SECURITY;

-- Activity logs - admin only
CREATE POLICY "Admins can view all activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email IN (
        SELECT email FROM profiles 
        WHERE id = auth.uid() 
        AND email LIKE '%@admin.carpoolnetwork.co.uk'
      )
    )
  );

CREATE POLICY "Admins can insert activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email IN (
        SELECT email FROM profiles 
        WHERE id = auth.uid() 
        AND email LIKE '%@admin.carpoolnetwork.co.uk'
      )
    )
  );

-- Critical alerts - admin only
CREATE POLICY "Admins can view all critical alerts"
  ON critical_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email IN (
        SELECT email FROM profiles 
        WHERE id = auth.uid() 
        AND email LIKE '%@admin.carpoolnetwork.co.uk'
      )
    )
  );

CREATE POLICY "Admins can manage critical alerts"
  ON critical_alerts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email IN (
        SELECT email FROM profiles 
        WHERE id = auth.uid() 
        AND email LIKE '%@admin.carpoolnetwork.co.uk'
      )
    )
  );

-- ============================================================================
-- Functions
-- ============================================================================

-- Log activity helper function
CREATE OR REPLACE FUNCTION log_activity(
  p_activity_type TEXT,
  p_severity TEXT,
  p_action TEXT,
  p_description TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
  v_actor_name TEXT;
  v_actor_email TEXT;
BEGIN
  -- Get actor details
  SELECT full_name, email INTO v_actor_name, v_actor_email
  FROM profiles WHERE id = auth.uid();

  -- Insert activity log
  INSERT INTO activity_logs (
    activity_type, severity, actor_id, actor_name, actor_email,
    target_type, target_id, action, description, metadata
  )
  VALUES (
    p_activity_type, p_severity, auth.uid(), v_actor_name, v_actor_email,
    p_target_type, p_target_id, p_action, p_description, p_metadata
  )
  RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get live platform metrics
CREATE OR REPLACE FUNCTION get_live_metrics()
RETURNS TABLE (
  active_users BIGINT,
  online_drivers BIGINT,
  ongoing_rides BIGINT,
  pending_bookings BIGINT,
  active_alerts BIGINT,
  recent_activities BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(DISTINCT actor_id) FROM activity_logs WHERE created_at >= NOW() - INTERVAL '15 minutes')::BIGINT as active_users,
    (SELECT COUNT(DISTINCT driver_id) FROM rides WHERE status = 'active' AND departure_time <= NOW() AND departure_time >= NOW() - INTERVAL '2 hours')::BIGINT as online_drivers,
    (SELECT COUNT(*) FROM rides WHERE status = 'active')::BIGINT as ongoing_rides,
    (SELECT COUNT(*) FROM ride_bookings WHERE status = 'pending')::BIGINT as pending_bookings,
    (SELECT COUNT(*) FROM critical_alerts WHERE status = 'active')::BIGINT as active_alerts,
    (SELECT COUNT(*) FROM activity_logs WHERE created_at >= NOW() - INTERVAL '1 hour')::BIGINT as recent_activities;
END;
$$ LANGUAGE plpgsql;

-- Get activity feed with filters
CREATE OR REPLACE FUNCTION get_activity_feed(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_activity_type TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  activity_type TEXT,
  severity TEXT,
  actor_id UUID,
  actor_name TEXT,
  actor_email TEXT,
  target_type TEXT,
  target_id UUID,
  action TEXT,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id, al.activity_type, al.severity, al.actor_id, al.actor_name, al.actor_email,
    al.target_type, al.target_id, al.action, al.description, al.metadata, al.created_at
  FROM activity_logs al
  WHERE 
    (p_activity_type IS NULL OR al.activity_type = p_activity_type)
    AND (p_severity IS NULL OR al.severity = p_severity)
    AND (p_search IS NULL OR 
         al.description ILIKE '%' || p_search || '%' OR 
         al.actor_name ILIKE '%' || p_search || '%' OR
         al.action ILIKE '%' || p_search || '%')
    AND (p_start_date IS NULL OR al.created_at >= p_start_date)
    AND (p_end_date IS NULL OR al.created_at <= p_end_date)
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Activity statistics by type
CREATE OR REPLACE FUNCTION get_activity_stats(
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  activity_type TEXT,
  count BIGINT,
  critical_count BIGINT,
  warning_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.activity_type,
    COUNT(*)::BIGINT as count,
    COUNT(*) FILTER (WHERE al.severity = 'critical')::BIGINT as critical_count,
    COUNT(*) FILTER (WHERE al.severity = 'warning')::BIGINT as warning_count
  FROM activity_logs al
  WHERE al.created_at >= NOW() - (p_hours || ' hours')::INTERVAL
  GROUP BY al.activity_type
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Acknowledge critical alert
CREATE OR REPLACE FUNCTION acknowledge_alert(p_alert_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE critical_alerts
  SET 
    status = 'acknowledged',
    acknowledged_by = auth.uid(),
    acknowledged_at = NOW()
  WHERE id = p_alert_id AND status = 'active';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Resolve critical alert
CREATE OR REPLACE FUNCTION resolve_alert(p_alert_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE critical_alerts
  SET 
    status = 'resolved',
    resolved_at = NOW()
  WHERE id = p_alert_id AND status IN ('active', 'acknowledged');
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Triggers for Automatic Activity Logging
-- ============================================================================

-- Log new user registrations
CREATE OR REPLACE FUNCTION trigger_log_user_registration()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_logs (
    activity_type, severity, actor_id, actor_name, actor_email,
    target_type, target_id, action, description
  )
  VALUES (
    'user', 'info', NEW.id, NEW.full_name, NEW.email,
    'profile', NEW.id, 'registration', 'New user registered'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_user_registration ON profiles;
CREATE TRIGGER log_user_registration
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_user_registration();

-- Log new rides
CREATE OR REPLACE FUNCTION trigger_log_ride_creation()
RETURNS TRIGGER AS $$
DECLARE
  v_driver_name TEXT;
  v_driver_email TEXT;
BEGIN
  SELECT full_name, email INTO v_driver_name, v_driver_email
  FROM profiles WHERE id = NEW.driver_id;
  
  INSERT INTO activity_logs (
    activity_type, severity, actor_id, actor_name, actor_email,
    target_type, target_id, action, description, metadata
  )
  VALUES (
    'ride', 'info', NEW.driver_id, v_driver_name, v_driver_email,
    'ride', NEW.id, 'created', 
    'New ride posted: ' || NEW.origin || ' to ' || NEW.destination,
    jsonb_build_object(
      'origin', NEW.origin,
      'destination', NEW.destination,
      'departure_time', NEW.departure_time,
      'available_seats', NEW.available_seats
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_ride_creation ON rides;
CREATE TRIGGER log_ride_creation
  AFTER INSERT ON rides
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_ride_creation();

-- Log booking status changes
CREATE OR REPLACE FUNCTION trigger_log_booking_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_passenger_name TEXT;
  v_passenger_email TEXT;
BEGIN
  SELECT full_name, email INTO v_passenger_name, v_passenger_email
  FROM profiles WHERE id = NEW.passenger_id;
  
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO activity_logs (
      activity_type, severity, actor_id, actor_name, actor_email,
      target_type, target_id, action, description, metadata
    )
    VALUES (
      'booking', 'info', NEW.passenger_id, v_passenger_name, v_passenger_email,
      'booking', NEW.id, 'created', 
      'New booking request',
      jsonb_build_object('ride_id', NEW.ride_id, 'seats', NEW.seats_requested)
    );
  ELSIF (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
    INSERT INTO activity_logs (
      activity_type, 
      severity, 
      actor_id, actor_name, actor_email,
      target_type, target_id, action, description, metadata
    )
    VALUES (
      'booking', 
      CASE WHEN NEW.status = 'cancelled' THEN 'warning' ELSE 'info' END,
      NEW.passenger_id, v_passenger_name, v_passenger_email,
      'booking', NEW.id, 'status_changed', 
      'Booking status changed: ' || OLD.status || ' → ' || NEW.status,
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_booking_changes ON ride_bookings;
CREATE TRIGGER log_booking_changes
  AFTER INSERT OR UPDATE ON ride_bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_booking_changes();

-- Grant permissions
GRANT EXECUTE ON FUNCTION log_activity TO authenticated;
GRANT EXECUTE ON FUNCTION get_live_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_activity_feed TO authenticated;
GRANT EXECUTE ON FUNCTION get_activity_stats TO authenticated;
GRANT EXECUTE ON FUNCTION acknowledge_alert TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_alert TO authenticated;
