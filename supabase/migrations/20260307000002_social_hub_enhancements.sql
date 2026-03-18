/*
  # Social Hub Enhancements

  New tables for the Social Hub redesign:

  1. user_presence  — live online/idle/offline indicators
  2. activity_reactions — emoji reactions on feed items
  3. ride_stories — photo + caption attached to completed rides (24h expiry)
  4. social_waves — lightweight pings between users

  All tables have:
  - RLS enabled with appropriate policies
  - Indexes for common query patterns
  - Realtime publication where needed

  This migration is idempotent: every statement uses IF NOT EXISTS /
  IF EXISTS guards so it can be applied repeatedly without error.
*/

-- ============================================================================
-- 1. User Presence
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_presence (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'idle', 'offline')),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE user_presence IS 'Tracks user online/idle/offline status for the Social Hub.';

-- Fast lookup for online users (partial index)
CREATE INDEX IF NOT EXISTS idx_user_presence_status_online
  ON user_presence(status) WHERE status = 'online';

-- RLS
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read presence (needed for friend lists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_presence' AND policyname = 'Users can read any presence'
  ) THEN
    CREATE POLICY "Users can read any presence"
      ON user_presence FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

-- Users can insert their own presence row
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_presence' AND policyname = 'Users can insert own presence'
  ) THEN
    CREATE POLICY "Users can insert own presence"
      ON user_presence FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Users can update their own presence row
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_presence' AND policyname = 'Users can update own presence'
  ) THEN
    CREATE POLICY "Users can update own presence"
      ON user_presence FOR UPDATE TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Realtime publication
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_presence'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
  END IF;
END $$;


-- ============================================================================
-- 2. Activity Reactions
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type text NOT NULL,
  activity_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (emoji IN ('celebrate', 'love', 'fire', 'car', 'leaf')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(activity_type, activity_id, user_id)
);

COMMENT ON TABLE activity_reactions IS 'Emoji reactions on activity feed items.';

-- Lookup by activity
CREATE INDEX IF NOT EXISTS idx_activity_reactions_lookup
  ON activity_reactions(activity_type, activity_id);

-- Lookup by user
CREATE INDEX IF NOT EXISTS idx_activity_reactions_user
  ON activity_reactions(user_id);

-- RLS
ALTER TABLE activity_reactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'activity_reactions' AND policyname = 'Users can read reactions'
  ) THEN
    CREATE POLICY "Users can read reactions"
      ON activity_reactions FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'activity_reactions' AND policyname = 'Users can add reactions'
  ) THEN
    CREATE POLICY "Users can add reactions"
      ON activity_reactions FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'activity_reactions' AND policyname = 'Users can remove own reactions'
  ) THEN
    CREATE POLICY "Users can remove own reactions"
      ON activity_reactions FOR DELETE TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;


-- ============================================================================
-- 3. Ride Stories
-- ============================================================================

CREATE TABLE IF NOT EXISTS ride_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  caption text CHECK (length(caption) <= 280),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

COMMENT ON TABLE ride_stories IS 'Ephemeral ride stories (photo + caption), auto-expire in 24h.';

-- Lookup by user, most recent first
CREATE INDEX IF NOT EXISTS idx_ride_stories_user
  ON ride_stories(user_id, created_at DESC);

-- Index on expires_at for expiry filtering (now() is not immutable, so no partial index)
CREATE INDEX IF NOT EXISTS idx_ride_stories_expires
  ON ride_stories(expires_at);

-- RLS
ALTER TABLE ride_stories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ride_stories' AND policyname = 'Users can read non-expired stories'
  ) THEN
    CREATE POLICY "Users can read non-expired stories"
      ON ride_stories FOR SELECT TO authenticated
      USING (expires_at > now());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ride_stories' AND policyname = 'Users can create own stories'
  ) THEN
    CREATE POLICY "Users can create own stories"
      ON ride_stories FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ride_stories' AND policyname = 'Users can delete own stories'
  ) THEN
    CREATE POLICY "Users can delete own stories"
      ON ride_stories FOR DELETE TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Realtime publication
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'ride_stories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ride_stories;
  END IF;
END $$;


-- ============================================================================
-- 4. Social Waves
-- ============================================================================

CREATE TABLE IF NOT EXISTS social_waves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_user_id != to_user_id)
);

COMMENT ON TABLE social_waves IS 'Lightweight social pings ("waves") between users.';

-- Incoming waves for a user, most recent first
CREATE INDEX IF NOT EXISTS idx_social_waves_to
  ON social_waves(to_user_id, created_at DESC);

-- Index on created_at for cleanup queries (now() is not immutable, so no partial index)
CREATE INDEX IF NOT EXISTS idx_social_waves_created
  ON social_waves(created_at);

-- RLS
ALTER TABLE social_waves ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'social_waves' AND policyname = 'Users can read own waves'
  ) THEN
    CREATE POLICY "Users can read own waves"
      ON social_waves FOR SELECT TO authenticated
      USING (to_user_id = auth.uid() OR from_user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'social_waves' AND policyname = 'Users can send waves'
  ) THEN
    CREATE POLICY "Users can send waves"
      ON social_waves FOR INSERT TO authenticated
      WITH CHECK (from_user_id = auth.uid());
  END IF;
END $$;

-- Realtime publication
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'social_waves'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE social_waves;
  END IF;
END $$;
