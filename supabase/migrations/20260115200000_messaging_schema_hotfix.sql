/*
  # Messaging Schema Hotfix - P0 Production Fix
  
  This migration ensures all required messaging columns and tables exist,
  preventing "column does not exist" errors that cause blank messaging pages.

  ## Root Cause
  The production database is missing the `last_seen_at` column on `conversation_members`
  and/or the `conversation_settings` table, causing the `get_conversations_overview` RPC
  to fail with schema errors.

  ## Changes
  1. Add `last_seen_at` column to `conversation_members` (if missing)
  2. Add `last_read_at` column to `conversation_members` (if missing)
  3. Create `conversation_settings` table (if missing) for pinned/muted/archived
  4. Create `message_reads` table with proper schema (if missing)
  5. Add indexes for performance
  6. Create/update `get_conversations_overview` RPC with COALESCE defaults
  7. Create helper RPC for marking conversations read

  ## Safe Application
  All statements use IF NOT EXISTS or DO $$ blocks to be idempotent.
  Can be applied multiple times without error.
*/

-- ==============================================================
-- PART 1: Ensure conversation_members has required columns
-- ==============================================================

-- Add last_seen_at column (presence tracking)
ALTER TABLE public.conversation_members
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Add last_read_at column (read receipts fallback)
ALTER TABLE public.conversation_members
  ADD COLUMN IF NOT EXISTS last_read_at timestamptz;

-- Index for efficient presence queries
CREATE INDEX IF NOT EXISTS idx_conversation_members_last_seen
  ON public.conversation_members (conversation_id, last_seen_at DESC);

-- ==============================================================
-- PART 2: Ensure conversations table has cache columns
-- ==============================================================

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS last_message_id uuid,
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_message_preview text,
  ADD COLUMN IF NOT EXISTS last_sender_id uuid,
  ADD COLUMN IF NOT EXISTS is_group boolean DEFAULT false;

-- Index for sorting conversations by recent activity
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at
  ON public.conversations (last_message_at DESC NULLS LAST);

-- ==============================================================
-- PART 3: Create conversation_settings table (if missing)
-- ==============================================================

CREATE TABLE IF NOT EXISTS public.conversation_settings (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pinned boolean DEFAULT false,
  muted boolean DEFAULT false,
  archived boolean DEFAULT false,
  muted_until timestamptz,
  archived_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_settings_user
  ON public.conversation_settings (user_id);

CREATE INDEX IF NOT EXISTS idx_conversation_settings_archived
  ON public.conversation_settings (user_id) WHERE archived = true;

-- Enable RLS
ALTER TABLE public.conversation_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversation_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conversation_settings'
      AND policyname = 'Users can view own conversation settings'
  ) THEN
    CREATE POLICY "Users can view own conversation settings"
      ON public.conversation_settings FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conversation_settings'
      AND policyname = 'Users can insert own conversation settings'
  ) THEN
    CREATE POLICY "Users can insert own conversation settings"
      ON public.conversation_settings FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conversation_settings'
      AND policyname = 'Users can update own conversation settings'
  ) THEN
    CREATE POLICY "Users can update own conversation settings"
      ON public.conversation_settings FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conversation_settings'
      AND policyname = 'Users can delete own conversation settings'
  ) THEN
    CREATE POLICY "Users can delete own conversation settings"
      ON public.conversation_settings FOR DELETE
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- ==============================================================
-- PART 4: Ensure message_reads table exists with proper schema
-- ==============================================================

CREATE TABLE IF NOT EXISTS public.message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_message_id uuid,
  last_read_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_reads_conversation_user
  ON public.message_reads (conversation_id, user_id);

ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

-- RLS for message_reads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'message_reads'
      AND policyname = 'Users can view own read state'
  ) THEN
    CREATE POLICY "Users can view own read state"
      ON public.message_reads FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'message_reads'
      AND policyname = 'Users can upsert own read state'
  ) THEN
    CREATE POLICY "Users can upsert own read state"
      ON public.message_reads FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'message_reads'
      AND policyname = 'Users can update own read state'
  ) THEN
    CREATE POLICY "Users can update own read state"
      ON public.message_reads FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ==============================================================
-- PART 5: Ensure conversation_members has UPDATE policy for presence
-- ==============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conversation_members'
      AND policyname = 'Users can update own member presence'
  ) THEN
    CREATE POLICY "Users can update own member presence"
      ON public.conversation_members FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ==============================================================
-- PART 6: Create robust get_conversations_overview RPC
-- Uses COALESCE throughout to handle NULL values gracefully
-- ==============================================================

CREATE OR REPLACE FUNCTION public.get_conversations_overview()
RETURNS TABLE (
  id uuid,
  type text,
  ride_id uuid,
  trip_request_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  last_message_at timestamptz,
  last_message_preview text,
  last_sender_id uuid,
  pinned boolean,
  muted boolean,
  archived boolean,
  unread_count bigint,
  members jsonb,
  other_user_id uuid,
  other_user_name text,
  other_user_avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.type,
    c.ride_id,
    c.trip_request_id,
    c.created_at,
    COALESCE(c.updated_at, c.created_at) AS updated_at,
    c.last_message_at,
    COALESCE(c.last_message_preview, '') AS last_message_preview,
    c.last_sender_id,
    COALESCE(cs.pinned, false) AS pinned,
    COALESCE(cs.muted, false) AS muted,
    COALESCE(cs.archived, false) AS archived,
    COALESCE(unread.unread_count, 0) AS unread_count,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'user_id', cm.user_id,
          'role', COALESCE(cm.role, 'FRIEND'),
          'last_seen_at', cm.last_seen_at,
          'profile', jsonb_build_object(
            'id', p.id,
            'full_name', COALESCE(p.full_name, 'Unknown User'),
            'avatar_url', p.avatar_url,
            'profile_photo_url', p.profile_photo_url
          )
        )
      ) FILTER (WHERE cm.user_id IS NOT NULL),
      '[]'::jsonb
    ) AS members,
    other.other_user_id,
    COALESCE(other.other_user_name, 'Unknown') AS other_user_name,
    other.other_user_avatar_url
  FROM public.conversations c
  JOIN public.conversation_members cm ON cm.conversation_id = c.id
  JOIN public.profiles p ON p.id = cm.user_id
  LEFT JOIN public.conversation_settings cs
    ON cs.conversation_id = c.id AND cs.user_id = auth.uid()
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS unread_count
    FROM public.chat_messages m
    LEFT JOIN public.message_reads mr
      ON mr.conversation_id = c.id AND mr.user_id = auth.uid()
    WHERE m.conversation_id = c.id
      AND m.sender_id <> auth.uid()
      AND m.deleted_at IS NULL
      AND (mr.last_read_at IS NULL OR m.created_at > mr.last_read_at)
  ) unread ON TRUE
  LEFT JOIN LATERAL (
    SELECT
      p_other.id AS other_user_id,
      p_other.full_name AS other_user_name,
      COALESCE(p_other.profile_photo_url, p_other.avatar_url) AS other_user_avatar_url
    FROM public.conversation_members cm_other
    JOIN public.profiles p_other ON p_other.id = cm_other.user_id
    WHERE cm_other.conversation_id = c.id
      AND cm_other.user_id <> auth.uid()
    ORDER BY cm_other.joined_at NULLS LAST
    LIMIT 1
  ) other ON TRUE
  WHERE EXISTS (
    SELECT 1 FROM public.conversation_members cm_self
    WHERE cm_self.conversation_id = c.id
      AND cm_self.user_id = auth.uid()
  )
  GROUP BY c.id, cs.pinned, cs.muted, cs.archived, unread.unread_count,
           other.other_user_id, other.other_user_name, other.other_user_avatar_url
  ORDER BY COALESCE(cs.pinned, false) DESC,
           c.last_message_at DESC NULLS LAST,
           c.updated_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_conversations_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_conversations_overview() TO authenticated;

-- ==============================================================
-- PART 7: Create mark_conversation_read RPC with optional params
-- Handles both simple and detailed read marking
-- ==============================================================

-- Drop existing function with different signatures
DROP FUNCTION IF EXISTS public.mark_conversation_read(uuid);
DROP FUNCTION IF EXISTS public.mark_conversation_read(uuid, uuid, timestamptz);

-- Simple version: mark conversation read to latest message
CREATE OR REPLACE FUNCTION public.mark_conversation_read(
  p_conversation_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_message_id uuid;
  v_last_message_at timestamptz;
BEGIN
  -- Get latest message info
  SELECT id, created_at
  INTO v_last_message_id, v_last_message_at
  FROM public.chat_messages
  WHERE conversation_id = p_conversation_id
    AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  -- Upsert read state
  INSERT INTO public.message_reads (conversation_id, user_id, last_read_message_id, last_read_at, updated_at)
  VALUES (p_conversation_id, auth.uid(), v_last_message_id, COALESCE(v_last_message_at, now()), now())
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET
    last_read_message_id = EXCLUDED.last_read_message_id,
    last_read_at = EXCLUDED.last_read_at,
    updated_at = now();

  -- Also update last_seen_at on conversation_members (best effort)
  UPDATE public.conversation_members
  SET last_seen_at = now()
  WHERE conversation_id = p_conversation_id
    AND user_id = auth.uid();
END;
$$;

-- Detailed version: mark read with specific message info
CREATE OR REPLACE FUNCTION public.mark_conversation_read(
  p_conversation_id uuid,
  p_last_read_message_id uuid,
  p_last_read_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Upsert read state with provided values
  INSERT INTO public.message_reads (conversation_id, user_id, last_read_message_id, last_read_at, updated_at)
  VALUES (p_conversation_id, auth.uid(), p_last_read_message_id, COALESCE(p_last_read_at, now()), now())
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET
    last_read_message_id = EXCLUDED.last_read_message_id,
    last_read_at = EXCLUDED.last_read_at,
    updated_at = now();

  -- Also update last_seen_at on conversation_members (best effort)
  UPDATE public.conversation_members
  SET last_seen_at = now()
  WHERE conversation_id = p_conversation_id
    AND user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.mark_conversation_read(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.mark_conversation_read(uuid, uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid, uuid, timestamptz) TO authenticated;

-- ==============================================================
-- PART 8: Update conversation cache trigger
-- ==============================================================

CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_preview text;
BEGIN
  -- Build preview based on message type
  IF NEW.deleted_at IS NOT NULL THEN
    v_preview := 'Message removed';
  ELSIF NEW.body IS NOT NULL AND NEW.body <> '' THEN
    v_preview := LEFT(NEW.body, 140);
  ELSIF NEW.message_type = 'IMAGE' THEN
    v_preview := '📷 Photo';
  ELSIF NEW.message_type = 'VIDEO' THEN
    v_preview := '🎥 Video';
  ELSIF NEW.message_type = 'VOICE' THEN
    v_preview := '🎤 Voice note';
  ELSIF NEW.message_type = 'FILE' THEN
    v_preview := '📎 File';
  ELSIF NEW.message_type = 'RIDE_CARD' THEN
    v_preview := '🚗 Ride shared';
  ELSIF NEW.message_type = 'BOOKING_CARD' THEN
    v_preview := '📋 Booking shared';
  ELSIF NEW.message_type = 'SYSTEM' THEN
    v_preview := 'System message';
  ELSE
    v_preview := 'New message';
  END IF;

  -- Update conversation cache
  UPDATE public.conversations
  SET
    last_message_id = NEW.id,
    last_message_at = NEW.created_at,
    last_message_preview = v_preview,
    last_sender_id = NEW.sender_id,
    updated_at = now()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_messages_update_cache ON public.chat_messages;
CREATE TRIGGER trg_chat_messages_update_cache
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();

-- ==============================================================
-- PART 9: Realtime publications
-- ==============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'conversation_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'conversation_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_settings;
  END IF;
END $$;

-- ==============================================================
-- PART 10: Schema check helper function for diagnostics
-- ==============================================================

CREATE OR REPLACE FUNCTION public.check_messaging_schema()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb := '{}'::jsonb;
  v_exists boolean;
BEGIN
  -- Check conversation_members.last_seen_at exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'conversation_members'
      AND column_name = 'last_seen_at'
  ) INTO v_exists;
  result := result || jsonb_build_object('conversation_members_last_seen_at', v_exists);

  -- Check conversation_settings table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'conversation_settings'
  ) INTO v_exists;
  result := result || jsonb_build_object('conversation_settings_table', v_exists);

  -- Check message_reads table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'message_reads'
  ) INTO v_exists;
  result := result || jsonb_build_object('message_reads_table', v_exists);

  -- Check conversations cache columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'conversations'
      AND column_name = 'last_message_at'
  ) INTO v_exists;
  result := result || jsonb_build_object('conversations_last_message_at', v_exists);

  -- Add timestamp
  result := result || jsonb_build_object('checked_at', now());
  result := result || jsonb_build_object('schema_healthy', 
    (result->>'conversation_members_last_seen_at')::boolean AND
    (result->>'conversation_settings_table')::boolean AND
    (result->>'message_reads_table')::boolean AND
    (result->>'conversations_last_message_at')::boolean
  );

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.check_messaging_schema() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_messaging_schema() TO authenticated;

-- ==============================================================
-- DONE: Schema hotfix complete
-- ==============================================================

COMMENT ON FUNCTION public.get_conversations_overview() IS 
'Returns all conversations for the current user with member info, unread counts, and settings. Uses COALESCE to prevent NULL-related failures.';

COMMENT ON FUNCTION public.mark_conversation_read(uuid) IS 
'Marks a conversation as read to the latest message for the current user.';

COMMENT ON FUNCTION public.check_messaging_schema() IS 
'Diagnostic function to verify messaging schema is complete. Returns JSON with column/table existence checks.';
