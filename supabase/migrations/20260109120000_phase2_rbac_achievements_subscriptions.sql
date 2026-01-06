-- ================================================
-- Phase 2: RBAC, Achievements, and Subscriptions
-- Migration: 20260109120000
-- ================================================

-- =============================================
-- 1. ADMIN ROLE ENUM
-- =============================================
DO $$ BEGIN
  CREATE TYPE admin_role AS ENUM ('super_admin', 'admin', 'moderator', 'analyst');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add admin_role column to profiles if not exists
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN admin_role admin_role DEFAULT NULL;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Migrate existing admins to 'admin' role
UPDATE profiles
SET admin_role = 'admin'
WHERE is_admin = true AND admin_role IS NULL;

-- =============================================
-- 2. ADMIN PERMISSIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role admin_role NOT NULL,
  permission TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, permission)
);

-- Insert default permissions (skip if already exists)
INSERT INTO admin_permissions (role, permission) VALUES
-- Super Admin - everything
('super_admin', 'users.view'),
('super_admin', 'users.edit'),
('super_admin', 'users.suspend'),
('super_admin', 'users.delete'),
('super_admin', 'admins.view'),
('super_admin', 'admins.create'),
('super_admin', 'admins.edit'),
('super_admin', 'admins.delete'),
('super_admin', 'safety.view'),
('super_admin', 'safety.investigate'),
('super_admin', 'safety.resolve'),
('super_admin', 'safety.escalate'),
('super_admin', 'verification.view'),
('super_admin', 'verification.approve'),
('super_admin', 'verification.reject'),
('super_admin', 'analytics.view'),
('super_admin', 'analytics.export'),
('super_admin', 'system.settings'),
('super_admin', 'system.diagnostics'),
('super_admin', 'system.bulk_operations'),
-- Admin
('admin', 'users.view'),
('admin', 'users.edit'),
('admin', 'users.suspend'),
('admin', 'admins.view'),
('admin', 'safety.view'),
('admin', 'safety.investigate'),
('admin', 'safety.resolve'),
('admin', 'verification.view'),
('admin', 'verification.approve'),
('admin', 'verification.reject'),
('admin', 'analytics.view'),
-- Moderator
('moderator', 'users.view'),
('moderator', 'safety.view'),
('moderator', 'safety.investigate'),
('moderator', 'verification.view'),
('moderator', 'verification.approve'),
('moderator', 'verification.reject'),
-- Analyst
('analyst', 'users.view'),
('analyst', 'safety.view'),
('analyst', 'analytics.view'),
('analyst', 'analytics.export')
ON CONFLICT (role, permission) DO NOTHING;

-- =============================================
-- 3. ADMIN AUDIT LOG TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  admin_role admin_role NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit log
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action);

-- =============================================
-- 4. USER ACHIEVEMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  notified BOOLEAN DEFAULT false,
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);

-- =============================================
-- 5. FEATURE FLAGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert subscription feature flag (disabled by default)
INSERT INTO feature_flags (name, enabled, description)
VALUES ('subscriptions', false, 'Premium subscription system - hidden until launch')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- 6. SUBSCRIPTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('trial', 'active', 'cancelled', 'expired', 'past_due')),
  plan TEXT NOT NULL DEFAULT 'premium',
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Add is_premium column to profiles if not exists
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN is_premium BOOLEAN DEFAULT false;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- =============================================
-- 7. RECURRING RIDE PATTERNS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS recurring_ride_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  origin TEXT NOT NULL,
  origin_lat DECIMAL(10, 8),
  origin_lng DECIMAL(11, 8),
  destination TEXT NOT NULL,
  destination_lat DECIMAL(10, 8),
  destination_lng DECIMAL(11, 8),
  departure_time TIME NOT NULL,
  available_seats INTEGER NOT NULL,
  notes TEXT,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('daily', 'weekly', 'monthly')),
  days_of_week INTEGER[],
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
  start_date DATE NOT NULL,
  end_date DATE,
  max_occurrences INTEGER,
  occurrences_created INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_patterns_driver ON recurring_ride_patterns(driver_id);
CREATE INDEX IF NOT EXISTS idx_recurring_patterns_active ON recurring_ride_patterns(is_active) WHERE is_active = true;

-- Add recurring pattern reference to rides table
DO $$ BEGIN
  ALTER TABLE rides ADD COLUMN recurring_pattern_id UUID REFERENCES recurring_ride_patterns(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE rides ADD COLUMN is_recurring_instance BOOLEAN DEFAULT false;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- =============================================
-- 8. ENABLE RLS ON NEW TABLES
-- =============================================
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_ride_patterns ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 9. RLS POLICIES
-- =============================================

-- Admin Permissions: Admins can read
DROP POLICY IF EXISTS "Admins can read permissions" ON admin_permissions;
CREATE POLICY "Admins can read permissions" ON admin_permissions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND admin_role IS NOT NULL)
  );

-- Audit Log: Admins can insert and view
DROP POLICY IF EXISTS "Admins can insert audit logs" ON admin_audit_log;
CREATE POLICY "Admins can insert audit logs" ON admin_audit_log
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND admin_role IS NOT NULL)
  );

DROP POLICY IF EXISTS "Admins can view audit logs" ON admin_audit_log;
CREATE POLICY "Admins can view audit logs" ON admin_audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND admin_role IS NOT NULL)
  );

-- User Achievements: Users can view own, system can insert
DROP POLICY IF EXISTS "Users can view own achievements" ON user_achievements;
CREATE POLICY "Users can view own achievements" ON user_achievements
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can insert achievements" ON user_achievements;
CREATE POLICY "Authenticated users can insert achievements" ON user_achievements
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Feature Flags: Anyone can read
DROP POLICY IF EXISTS "Anyone can read feature flags" ON feature_flags;
CREATE POLICY "Anyone can read feature flags" ON feature_flags
  FOR SELECT USING (true);

-- Subscriptions: Users can view own
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own subscription" ON subscriptions;
CREATE POLICY "Users can insert own subscription" ON subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own subscription" ON subscriptions;
CREATE POLICY "Users can update own subscription" ON subscriptions
  FOR UPDATE USING (user_id = auth.uid());

-- Recurring Patterns: Drivers can manage own
DROP POLICY IF EXISTS "Drivers can view own patterns" ON recurring_ride_patterns;
CREATE POLICY "Drivers can view own patterns" ON recurring_ride_patterns
  FOR SELECT USING (driver_id = auth.uid());

DROP POLICY IF EXISTS "Drivers can insert own patterns" ON recurring_ride_patterns;
CREATE POLICY "Drivers can insert own patterns" ON recurring_ride_patterns
  FOR INSERT WITH CHECK (driver_id = auth.uid());

DROP POLICY IF EXISTS "Drivers can update own patterns" ON recurring_ride_patterns;
CREATE POLICY "Drivers can update own patterns" ON recurring_ride_patterns
  FOR UPDATE USING (driver_id = auth.uid());

DROP POLICY IF EXISTS "Drivers can delete own patterns" ON recurring_ride_patterns;
CREATE POLICY "Drivers can delete own patterns" ON recurring_ride_patterns
  FOR DELETE USING (driver_id = auth.uid());

-- =============================================
-- 10. HELPER FUNCTION: Check admin permission
-- =============================================
CREATE OR REPLACE FUNCTION has_admin_permission(user_id UUID, required_permission TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles p
    JOIN admin_permissions ap ON p.admin_role = ap.role
    WHERE p.id = user_id AND ap.permission = required_permission
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 11. FUNCTION: Generate recurring ride instances
-- =============================================
CREATE OR REPLACE FUNCTION generate_recurring_rides(
  p_pattern_id UUID,
  p_days_ahead INTEGER DEFAULT 14
)
RETURNS INTEGER AS $$
DECLARE
  v_pattern RECORD;
  v_ride_date DATE;
  v_end_bound DATE;
  v_rides_created INTEGER := 0;
  v_day_num INTEGER;
BEGIN
  -- Get the pattern
  SELECT * INTO v_pattern
  FROM recurring_ride_patterns
  WHERE id = p_pattern_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Calculate end bound
  v_end_bound := LEAST(
    COALESCE(v_pattern.end_date, CURRENT_DATE + p_days_ahead),
    CURRENT_DATE + p_days_ahead
  );

  -- Start from today or pattern start date
  v_ride_date := GREATEST(v_pattern.start_date, CURRENT_DATE);

  WHILE v_ride_date <= v_end_bound LOOP
    -- Check max occurrences
    IF v_pattern.max_occurrences IS NOT NULL AND
       v_pattern.occurrences_created >= v_pattern.max_occurrences THEN
      EXIT;
    END IF;

    -- Check if date matches pattern
    CASE v_pattern.pattern_type
      WHEN 'daily' THEN
        -- Always matches
        NULL;
      WHEN 'weekly' THEN
        v_day_num := EXTRACT(DOW FROM v_ride_date)::INTEGER;
        IF NOT (v_day_num = ANY(v_pattern.days_of_week)) THEN
          v_ride_date := v_ride_date + 1;
          CONTINUE;
        END IF;
      WHEN 'monthly' THEN
        IF EXTRACT(DAY FROM v_ride_date)::INTEGER != v_pattern.day_of_month THEN
          v_ride_date := v_ride_date + 1;
          CONTINUE;
        END IF;
    END CASE;

    -- Check if ride already exists
    IF NOT EXISTS (
      SELECT 1 FROM rides
      WHERE recurring_pattern_id = p_pattern_id
      AND DATE(departure_time) = v_ride_date
    ) THEN
      -- Create ride instance
      INSERT INTO rides (
        driver_id, vehicle_id, origin, origin_lat, origin_lng,
        destination, destination_lat, destination_lng,
        departure_time, available_seats, total_seats, notes,
        recurring_pattern_id, is_recurring_instance, is_recurring, status
      ) VALUES (
        v_pattern.driver_id, v_pattern.vehicle_id, v_pattern.origin,
        v_pattern.origin_lat, v_pattern.origin_lng, v_pattern.destination,
        v_pattern.destination_lat, v_pattern.destination_lng,
        (v_ride_date + v_pattern.departure_time)::TIMESTAMPTZ,
        v_pattern.available_seats, v_pattern.available_seats, v_pattern.notes,
        p_pattern_id, true, true, 'scheduled'
      );

      v_rides_created := v_rides_created + 1;

      UPDATE recurring_ride_patterns
      SET occurrences_created = occurrences_created + 1,
          updated_at = NOW()
      WHERE id = p_pattern_id;
    END IF;

    v_ride_date := v_ride_date + 1;
  END LOOP;

  RETURN v_rides_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION generate_recurring_rides TO authenticated;
GRANT EXECUTE ON FUNCTION has_admin_permission TO authenticated;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
