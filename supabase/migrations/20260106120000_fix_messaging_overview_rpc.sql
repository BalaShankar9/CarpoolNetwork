/*
  # Messaging RPC + Realtime Alignment

  - Ensures core conversation-based messaging tables exist
  - Adds missing cache columns + indexes for conversation list performance
  - Provides no-arg get_conversations_overview() to satisfy PostgREST RPC lookup
  - Adds get_or_create_dm_conversation() and mark_conversation_read(p_conversation_id)
  - Keeps RLS strict and enables realtime publications for messaging tables
*/

-- Core tables (no-op if already present)
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('RIDE_MATCH', 'TRIP_MATCH', 'FRIENDS_DM')),
  ride_id uuid REFERENCES public.rides(id) ON DELETE CASCADE,
  trip_request_id uuid REFERENCES public.trip_requests(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_message_id uuid,
  last_message_at timestamptz,
  last_message_preview text,
  last_sender_id uuid,
  is_group boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('DRIVER', 'RIDER', 'FRIEND')),
  joined_at timestamptz DEFAULT now(),
  last_seen_at timestamptz,
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text,
  message_type text DEFAULT 'TEXT',
  created_at timestamptz DEFAULT now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  client_generated_id uuid,
  reply_to_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_message_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  last_read_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Cache + metadata columns (safe for existing tables)
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS last_message_id uuid,
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_message_preview text,
  ADD COLUMN IF NOT EXISTS last_sender_id uuid,
  ADD COLUMN IF NOT EXISTS is_group boolean DEFAULT false;

ALTER TABLE public.conversation_members
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS client_generated_id uuid,
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created
  ON public.chat_messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_members_user_id
  ON public.conversation_members (user_id);

CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at
  ON public.conversations (last_message_at DESC);

-- Conversation cache trigger on new messages
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_preview text;
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    v_preview := 'Message removed';
  ELSIF NEW.body IS NOT NULL AND NEW.body <> '' THEN
    v_preview := LEFT(NEW.body, 140);
  ELSIF NEW.message_type = 'IMAGE' THEN
    v_preview := 'Photo';
  ELSIF NEW.message_type = 'VIDEO' THEN
    v_preview := 'Video';
  ELSIF NEW.message_type = 'VOICE' THEN
    v_preview := 'Voice note';
  ELSIF NEW.message_type = 'FILE' THEN
    v_preview := 'File';
  ELSIF NEW.message_type = 'RIDE_CARD' THEN
    v_preview := 'Ride shared';
  ELSIF NEW.message_type = 'BOOKING_CARD' THEN
    v_preview := 'Booking shared';
  ELSIF NEW.message_type = 'SYSTEM' THEN
    v_preview := 'System message';
  ELSE
    v_preview := 'New message';
  END IF;

  UPDATE public.conversations
  SET last_message_id = NEW.id,
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

-- RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conversations'
      AND policyname = 'Users can view conversations they are members of'
  ) THEN
    CREATE POLICY "Users can view conversations they are members of"
      ON public.conversations FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.conversation_members cm
          WHERE cm.conversation_id = conversations.id
            AND cm.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conversation_members'
      AND policyname = 'Members can view conversation members'
  ) THEN
    CREATE POLICY "Members can view conversation members"
      ON public.conversation_members FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.conversation_members cm
          WHERE cm.conversation_id = conversation_members.conversation_id
            AND cm.user_id = auth.uid()
        )
      );
  END IF;
END $$;

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chat_messages'
      AND policyname = 'Members can read chat messages'
  ) THEN
    CREATE POLICY "Members can read chat messages"
      ON public.chat_messages FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.conversation_members cm
          WHERE cm.conversation_id = chat_messages.conversation_id
            AND cm.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chat_messages'
      AND policyname = 'Members can send chat messages'
  ) THEN
    CREATE POLICY "Members can send chat messages"
      ON public.chat_messages FOR INSERT
      TO authenticated
      WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.conversation_members cm
          WHERE cm.conversation_id = chat_messages.conversation_id
            AND cm.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'message_reads'
      AND policyname = 'Members can read conversation read state'
  ) THEN
    CREATE POLICY "Members can read conversation read state"
      ON public.message_reads FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.conversation_members cm
          WHERE cm.conversation_id = message_reads.conversation_id
            AND cm.user_id = auth.uid()
        )
      );
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
      ON public.message_reads FOR INSERT
      TO authenticated
      WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.conversation_members cm
          WHERE cm.conversation_id = message_reads.conversation_id
            AND cm.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'message_reads'
      AND policyname = 'Users can update own read state (update)'
  ) THEN
    CREATE POLICY "Users can update own read state (update)"
      ON public.message_reads FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- No-arg RPC to satisfy PostgREST schema cache expectations
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
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.type,
    c.ride_id,
    c.trip_request_id,
    c.created_at,
    c.updated_at,
    c.last_message_at,
    c.last_message_preview,
    c.last_sender_id,
    COALESCE(cs.pinned, false) AS pinned,
    COALESCE(cs.muted, false) AS muted,
    COALESCE(cs.archived, false) AS archived,
    COALESCE(unread.unread_count, 0) AS unread_count,
    jsonb_agg(
      jsonb_build_object(
        'user_id', cm.user_id,
        'role', cm.role,
        'last_seen_at', cm.last_seen_at,
        'profile', jsonb_build_object(
          'id', p.id,
          'full_name', p.full_name,
          'avatar_url', p.avatar_url,
          'profile_photo_url', p.profile_photo_url
        )
      )
    ) AS members,
    other.other_user_id,
    other.other_user_name,
    other.other_user_avatar_url
  FROM public.conversations c
  JOIN public.conversation_members cm
    ON cm.conversation_id = c.id
  JOIN public.profiles p
    ON p.id = cm.user_id
  LEFT JOIN public.conversation_settings cs
    ON cs.conversation_id = c.id
    AND cs.user_id = auth.uid()
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS unread_count
    FROM public.chat_messages m
    LEFT JOIN public.message_reads mr
      ON mr.conversation_id = c.id
      AND mr.user_id = auth.uid()
    WHERE m.conversation_id = c.id
      AND m.sender_id <> auth.uid()
      AND m.deleted_at IS NULL
      AND (mr.last_read_at IS NULL OR m.created_at > mr.last_read_at)
  ) unread ON TRUE
  LEFT JOIN LATERAL (
    SELECT p_other.id AS other_user_id,
           p_other.full_name AS other_user_name,
           COALESCE(p_other.profile_photo_url, p_other.avatar_url) AS other_user_avatar_url
    FROM public.conversation_members cm_other
    JOIN public.profiles p_other
      ON p_other.id = cm_other.user_id
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
  GROUP BY c.id, cs.pinned, cs.muted, cs.archived, unread.unread_count, other.other_user_id, other.other_user_name, other.other_user_avatar_url
  ORDER BY COALESCE(cs.pinned, false) DESC, c.last_message_at DESC NULLS LAST, c.updated_at DESC;
$$;

-- DM helper wrapper (auth.uid() + target)
CREATE OR REPLACE FUNCTION public.get_or_create_dm_conversation(
  target_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security TO off
AS $$
DECLARE
  v_conversation_id uuid;
  v_user_a uuid;
  v_user_b uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF target_user_id IS NULL OR target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Invalid target user';
  END IF;

  IF public.is_blocked(auth.uid(), target_user_id) THEN
    RAISE EXCEPTION 'User is blocked';
  END IF;

  v_user_a := LEAST(auth.uid(), target_user_id);
  v_user_b := GREATEST(auth.uid(), target_user_id);

  SELECT c.id INTO v_conversation_id
  FROM public.conversations c
  WHERE c.type = 'FRIENDS_DM'
    AND EXISTS (
      SELECT 1 FROM public.conversation_members cm1
      WHERE cm1.conversation_id = c.id
        AND cm1.user_id = v_user_a
    )
    AND EXISTS (
      SELECT 1 FROM public.conversation_members cm2
      WHERE cm2.conversation_id = c.id
        AND cm2.user_id = v_user_b
    )
    AND (
      SELECT COUNT(*) FROM public.conversation_members cmc
      WHERE cmc.conversation_id = c.id
    ) = 2
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations (type)
    VALUES ('FRIENDS_DM')
    RETURNING id INTO v_conversation_id;

    INSERT INTO public.conversation_members (conversation_id, user_id, role)
    VALUES
      (v_conversation_id, auth.uid(), 'FRIEND'),
      (v_conversation_id, target_user_id, 'FRIEND');
  END IF;

  RETURN v_conversation_id;
END;
$$;

-- Convenience read marker with a single parameter
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
  SELECT id, created_at
  INTO v_last_message_id, v_last_message_at
  FROM public.chat_messages
  WHERE conversation_id = p_conversation_id
    AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  INSERT INTO public.message_reads (conversation_id, user_id, last_read_message_id, last_read_at, updated_at)
  VALUES (p_conversation_id, auth.uid(), v_last_message_id, COALESCE(v_last_message_at, now()), now())
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET last_read_message_id = EXCLUDED.last_read_message_id,
                last_read_at = EXCLUDED.last_read_at,
                updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.get_conversations_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_conversations_overview() TO authenticated;
REVOKE ALL ON FUNCTION public.get_or_create_dm_conversation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_dm_conversation(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.mark_conversation_read(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid) TO authenticated;

-- Realtime publication updates
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
END $$;
