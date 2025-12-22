/*
  # Phase Completion Features - Final Migration
  
  Adds all necessary database structures for Phase 1 and Phase 3 completion.
  
  ## New Tables
  1. leaderboard_cache - Performance cache for leaderboard rankings
  2. challenges - Seasonal challenges and competitions
  3. user_challenges - User progress on challenges
  4. notification_preferences - User notification settings
  
  ## Enhanced Tables
  - profiles: onboarding, leaderboard, accessibility, profile enhancements
  - saved_searches: alert functionality
  - notifications: categorization and actions
  
  ## Security
  - RLS enabled on all new tables
  - Users can only access their own data
*/

-- =============================================================================
-- Phase 1: Onboarding System
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completed boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_step') THEN
    ALTER TABLE profiles ADD COLUMN onboarding_step integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_skipped') THEN
    ALTER TABLE profiles ADD COLUMN onboarding_skipped boolean DEFAULT false;
  END IF;
END $$;

-- =============================================================================
-- Phase 3: Leaderboards
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'leaderboard_visible') THEN
    ALTER TABLE profiles ADD COLUMN leaderboard_visible boolean DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'leaderboard_display_name') THEN
    ALTER TABLE profiles ADD COLUMN leaderboard_display_name text;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS leaderboard_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  category text NOT NULL,
  region text,
  rank integer NOT NULL,
  score numeric NOT NULL,
  period text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, category, region, period)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'leaderboard_cache' AND rowsecurity = true) THEN
    ALTER TABLE leaderboard_cache ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DROP POLICY IF EXISTS "Leaderboard data is publicly viewable" ON leaderboard_cache;
CREATE POLICY "Leaderboard data is publicly viewable" ON leaderboard_cache FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = leaderboard_cache.user_id AND profiles.leaderboard_visible = true));

-- =============================================================================
-- Phase 3: Challenges
-- =============================================================================

CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  challenge_type text NOT NULL,
  target_value numeric NOT NULL,
  reward_type text NOT NULL,
  reward_value text,
  badge_icon text,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  is_seasonal boolean DEFAULT false,
  season_theme text,
  created_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'challenges' AND rowsecurity = true) THEN
    ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DROP POLICY IF EXISTS "Active challenges viewable by authenticated" ON challenges;
CREATE POLICY "Active challenges viewable by authenticated" ON challenges FOR SELECT TO authenticated
USING (is_active = true AND now() BETWEEN start_date AND end_date);

CREATE TABLE IF NOT EXISTS user_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id uuid REFERENCES challenges(id) ON DELETE CASCADE,
  progress numeric DEFAULT 0,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  reward_claimed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_challenges' AND rowsecurity = true) THEN
    ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DROP POLICY IF EXISTS "Users view own challenges" ON user_challenges;
DROP POLICY IF EXISTS "Users update own challenges" ON user_challenges;
DROP POLICY IF EXISTS "Users insert own challenges" ON user_challenges;

CREATE POLICY "Users view own challenges" ON user_challenges FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own challenges" ON user_challenges FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users insert own challenges" ON user_challenges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- Phase 3: Notification Preferences
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  ride_notifications boolean DEFAULT true,
  message_notifications boolean DEFAULT true,
  system_notifications boolean DEFAULT true,
  social_notifications boolean DEFAULT true,
  challenge_notifications boolean DEFAULT true,
  dnd_enabled boolean DEFAULT false,
  dnd_start_time time,
  dnd_end_time time,
  push_enabled boolean DEFAULT false,
  email_enabled boolean DEFAULT true,
  sms_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'notification_preferences' AND rowsecurity = true) THEN
    ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DROP POLICY IF EXISTS "Users view own notif prefs" ON notification_preferences;
DROP POLICY IF EXISTS "Users insert own notif prefs" ON notification_preferences;
DROP POLICY IF EXISTS "Users update own notif prefs" ON notification_preferences;

CREATE POLICY "Users view own notif prefs" ON notification_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own notif prefs" ON notification_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own notif prefs" ON notification_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- Profile Enhancements
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'profile_theme') THEN
    ALTER TABLE profiles ADD COLUMN profile_theme text DEFAULT 'default';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'about_me') THEN
    ALTER TABLE profiles ADD COLUMN about_me text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'interests_tags') THEN
    ALTER TABLE profiles ADD COLUMN interests_tags text[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'languages_spoken') THEN
    ALTER TABLE profiles ADD COLUMN languages_spoken text[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'travel_style') THEN
    ALTER TABLE profiles ADD COLUMN travel_style text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'fun_facts') THEN
    ALTER TABLE profiles ADD COLUMN fun_facts text[];
  END IF;
END $$;

-- =============================================================================
-- Accessibility
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'accessibility_high_contrast') THEN
    ALTER TABLE profiles ADD COLUMN accessibility_high_contrast boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'accessibility_font_size') THEN
    ALTER TABLE profiles ADD COLUMN accessibility_font_size text DEFAULT 'medium';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'accessibility_reduced_motion') THEN
    ALTER TABLE profiles ADD COLUMN accessibility_reduced_motion boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'accessibility_color_blind_mode') THEN
    ALTER TABLE profiles ADD COLUMN accessibility_color_blind_mode text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'accessibility_dyslexia_font') THEN
    ALTER TABLE profiles ADD COLUMN accessibility_dyslexia_font boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'accessibility_screen_reader') THEN
    ALTER TABLE profiles ADD COLUMN accessibility_screen_reader boolean DEFAULT false;
  END IF;
END $$;

-- =============================================================================
-- Saved Searches Enhancements
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saved_searches' AND column_name = 'alerts_enabled') THEN
    ALTER TABLE saved_searches ADD COLUMN alerts_enabled boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saved_searches' AND column_name = 'alert_frequency') THEN
    ALTER TABLE saved_searches ADD COLUMN alert_frequency text DEFAULT 'instant';
  END IF;
END $$;

-- =============================================================================
-- Notifications Enhancements
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'category') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'type') THEN
      ALTER TABLE notifications RENAME COLUMN type TO category;
    ELSE
      ALTER TABLE notifications ADD COLUMN category text NOT NULL DEFAULT 'system';
    END IF;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'priority') THEN
    ALTER TABLE notifications ADD COLUMN priority text DEFAULT 'normal';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'action_url') THEN
    ALTER TABLE notifications ADD COLUMN action_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'action_label') THEN
    ALTER TABLE notifications ADD COLUMN action_label text;
  END IF;
END $$;

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_user_id ON leaderboard_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_category_period ON leaderboard_cache(category, period);
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_rank ON leaderboard_cache(rank);

CREATE INDEX IF NOT EXISTS idx_challenges_active ON challenges(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_challenges_type ON challenges(challenge_type);

CREATE INDEX IF NOT EXISTS idx_user_challenges_user_id ON user_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_completed ON user_challenges(completed);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_alerts_enabled ON saved_searches(alerts_enabled);

CREATE INDEX IF NOT EXISTS idx_preference_profiles_user_id ON preference_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_preference_profiles_active ON preference_profiles(is_active);