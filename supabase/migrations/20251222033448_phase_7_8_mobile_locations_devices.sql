/*
  # Phase 7 & 8: Mobile Features & Real-time Tracking
*/

-- Push notification tokens
CREATE TABLE IF NOT EXISTS push_notification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL,
  device_type TEXT NOT NULL,
  platform TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_act ON push_notification_tokens(user_id) WHERE is_active;

-- Live locations for real-time tracking
CREATE TABLE IF NOT EXISTS live_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ride_id UUID REFERENCES rides(id) ON DELETE CASCADE,
  latitude NUMERIC(10, 8) NOT NULL,
  longitude NUMERIC(11, 8) NOT NULL,
  accuracy NUMERIC,
  speed NUMERIC,
  is_moving BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_live_locs_usr ON live_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_live_locs_rid ON live_locations(ride_id) WHERE ride_id IS NOT NULL;

-- Location history
CREATE TABLE IF NOT EXISTS location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ride_id UUID REFERENCES rides(id) ON DELETE CASCADE,
  latitude NUMERIC(10, 8) NOT NULL,
  longitude NUMERIC(11, 8) NOT NULL,
  speed NUMERIC,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loc_hist_usr ON location_history(user_id, recorded_at DESC);

-- Ride tracking sessions
CREATE TABLE IF NOT EXISTS ride_tracking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_status TEXT DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  total_distance_km NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_track_rid ON ride_tracking_sessions(ride_id);

-- Offline queue
CREATE TABLE IF NOT EXISTS offline_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_data JSONB NOT NULL,
  priority INTEGER DEFAULT 5,
  is_processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offq_usr ON offline_queue(user_id);

-- Device info
CREATE TABLE IF NOT EXISTS device_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  app_version TEXT,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

-- Feature flags
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key TEXT NOT NULL UNIQUE,
  flag_name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE push_notification_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_tokens_user" ON push_notification_tokens FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE live_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live_locs_user" ON live_locations FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loc_hist_user" ON location_history FOR SELECT TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE ride_tracking_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "track_sess_driver" ON ride_tracking_sessions FOR SELECT TO authenticated
  USING (driver_id = auth.uid());

ALTER TABLE offline_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offq_user" ON offline_queue FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE device_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "device_user" ON device_info FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flags_enabled" ON feature_flags FOR SELECT TO authenticated
  USING (is_enabled);

-- Functions
CREATE OR REPLACE FUNCTION update_live_location(
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_ride_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO live_locations (user_id, ride_id, latitude, longitude, updated_at, expires_at)
  VALUES (auth.uid(), p_ride_id, p_latitude, p_longitude, NOW(), NOW() + INTERVAL '5 minutes')
  ON CONFLICT (user_id)
  DO UPDATE SET
    ride_id = EXCLUDED.ride_id,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    updated_at = NOW(),
    expires_at = NOW() + INTERVAL '5 minutes';
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_feature_enabled(p_flag_key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM feature_flags WHERE flag_key = p_flag_key AND is_enabled = true);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION update_live_location TO authenticated;
GRANT EXECUTE ON FUNCTION is_feature_enabled TO authenticated;
