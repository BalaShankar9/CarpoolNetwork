/*
  # Futuristic Messaging Upgrade

  - Extends chat_messages for modern messaging features
  - Adds reactions, blocks, conversation settings, and message deletions
  - Reworks message_reads for conversation-level read state
  - Adds conversation caches for fast list rendering
  - Tightens RLS for chat safety
  - Enables realtime for new chat tables
*/

-- Conversations cache fields
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS last_message_id uuid,
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_message_preview text,
  ADD COLUMN IF NOT EXISTS last_sender_id uuid;

-- Conversation members presence metadata
ALTER TABLE public.conversation_members
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Blocks (needed for helper + RLS)
CREATE TABLE IF NOT EXISTS public.blocks (
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id
  ON public.blocks (blocked_id);

-- Normalize chat_messages columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'message_type'
  ) THEN
    ALTER TABLE public.chat_messages RENAME COLUMN type TO message_type;
  END IF;
END $$;

-- Block helper
CREATE OR REPLACE FUNCTION public.is_blocked(p_user_id uuid, p_other_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocks b
    WHERE (b.blocker_id = p_user_id AND b.blocked_id = p_other_user_id)
       OR (b.blocker_id = p_other_user_id AND b.blocked_id = p_user_id)
  );
$$;

REVOKE ALL ON FUNCTION public.is_blocked(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_blocked(uuid, uuid) TO authenticated;

-- Updated DM helper with block checks
CREATE OR REPLACE FUNCTION public.get_or_create_friends_conversation(
  p_user_id_1 uuid,
  p_user_id_2 uuid
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

  IF auth.uid() NOT IN (p_user_id_1, p_user_id_2) THEN
    RAISE EXCEPTION 'Not authorized to create this conversation';
  END IF;

  IF public.is_blocked(p_user_id_1, p_user_id_2) THEN
    RAISE EXCEPTION 'User is blocked';
  END IF;

  v_user_a := LEAST(p_user_id_1, p_user_id_2);
  v_user_b := GREATEST(p_user_id_1, p_user_id_2);

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
      (v_conversation_id, p_user_id_1, 'FRIEND'),
      (v_conversation_id, p_user_id_2, 'FRIEND');
  END IF;

  RETURN v_conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_friends_conversation(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_friends_conversation(uuid, uuid) TO authenticated;

-- Update ride/trip conversation helpers with block checks
CREATE OR REPLACE FUNCTION public.get_or_create_ride_conversation(
  p_ride_id uuid,
  p_driver_id uuid,
  p_rider_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security TO off
AS $$
DECLARE
  v_conversation_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF auth.uid() NOT IN (p_driver_id, p_rider_id) THEN
    RAISE EXCEPTION 'Not authorized to create this conversation';
  END IF;

  IF public.is_blocked(p_driver_id, p_rider_id) THEN
    RAISE EXCEPTION 'User is blocked';
  END IF;

  SELECT id INTO v_conversation_id
  FROM public.conversations
  WHERE type = 'RIDE_MATCH' AND ride_id = p_ride_id
  AND EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = conversations.id
    AND user_id = p_rider_id
  )
  AND EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = conversations.id
    AND user_id = p_driver_id
  )
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations (type, ride_id)
    VALUES ('RIDE_MATCH', p_ride_id)
    RETURNING id INTO v_conversation_id;

    INSERT INTO public.conversation_members (conversation_id, user_id, role)
    VALUES
      (v_conversation_id, p_driver_id, 'DRIVER'),
      (v_conversation_id, p_rider_id, 'RIDER');
  END IF;

  RETURN v_conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_ride_conversation(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_ride_conversation(uuid, uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_or_create_trip_conversation(
  p_trip_request_id uuid,
  p_rider_id uuid,
  p_driver_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security TO off
AS $$
DECLARE
  v_conversation_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF auth.uid() NOT IN (p_driver_id, p_rider_id) THEN
    RAISE EXCEPTION 'Not authorized to create this conversation';
  END IF;

  IF public.is_blocked(p_driver_id, p_rider_id) THEN
    RAISE EXCEPTION 'User is blocked';
  END IF;

  SELECT id INTO v_conversation_id
  FROM public.conversations
  WHERE type = 'TRIP_MATCH' AND trip_request_id = p_trip_request_id
  AND EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = conversations.id
    AND user_id = p_driver_id
  )
  AND EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = conversations.id
    AND user_id = p_rider_id
  )
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations (type, trip_request_id)
    VALUES ('TRIP_MATCH', p_trip_request_id)
    RETURNING id INTO v_conversation_id;

    INSERT INTO public.conversation_members (conversation_id, user_id, role)
    VALUES
      (v_conversation_id, p_rider_id, 'RIDER'),
      (v_conversation_id, p_driver_id, 'DRIVER');
  END IF;

  RETURN v_conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_trip_conversation(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_trip_conversation(uuid, uuid, uuid) TO authenticated;

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS client_generated_id uuid,
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'TEXT';

-- Normalize existing message_type values before adding constraint
UPDATE public.chat_messages
SET message_type = UPPER(message_type)
WHERE message_type IS NOT NULL;

UPDATE public.chat_messages
SET message_type = 'TEXT'
WHERE message_type IS NULL
  OR message_type NOT IN ('TEXT','IMAGE','VIDEO','FILE','VOICE','SYSTEM','RIDE_CARD','BOOKING_CARD');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chat_messages_message_type_check'
  ) THEN
    ALTER TABLE public.chat_messages
      ADD CONSTRAINT chat_messages_message_type_check
      CHECK (message_type IN ('TEXT','IMAGE','VIDEO','FILE','VOICE','SYSTEM','RIDE_CARD','BOOKING_CARD'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS chat_messages_client_generated_id_key
  ON public.chat_messages (client_generated_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created
  ON public.chat_messages (conversation_id, created_at DESC);

-- Reactions
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id
  ON public.message_reactions (message_id);

-- Message deletions (delete for me)
CREATE TABLE IF NOT EXISTS public.message_deletions (
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

-- Conversation settings (pinned/muted/archived)
CREATE TABLE IF NOT EXISTS public.conversation_settings (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pinned boolean DEFAULT false,
  muted boolean DEFAULT false,
  archived boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_settings_user
  ON public.conversation_settings (user_id);

-- Blocks
-- (moved above for helper usage)

-- Rework message_reads to store conversation read state
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'message_reads' AND column_name = 'message_id'
  ) THEN
    ALTER TABLE public.message_reads RENAME TO message_reads_legacy;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_message_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  last_read_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_reads_conversation_user
  ON public.message_reads (conversation_id, user_id);

-- Update conversation cache on new messages
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

-- Messaging helper functions
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
  members jsonb
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
    ) AS members
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
  WHERE EXISTS (
    SELECT 1 FROM public.conversation_members cm_self
    WHERE cm_self.conversation_id = c.id
      AND cm_self.user_id = auth.uid()
  )
  GROUP BY c.id, cs.pinned, cs.muted, cs.archived, unread.unread_count
  ORDER BY COALESCE(cs.pinned, false) DESC, c.last_message_at DESC NULLS LAST, c.updated_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_total_unread_messages()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(unread_count), 0)::bigint
  FROM public.get_conversations_overview();
$$;

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
  INSERT INTO public.message_reads (conversation_id, user_id, last_read_message_id, last_read_at, updated_at)
  VALUES (p_conversation_id, auth.uid(), p_last_read_message_id, p_last_read_at, now())
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET last_read_message_id = EXCLUDED.last_read_message_id,
                last_read_at = EXCLUDED.last_read_at,
                updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.get_conversations_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_conversations_overview() TO authenticated;
REVOKE ALL ON FUNCTION public.get_total_unread_messages() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_total_unread_messages() TO authenticated;
REVOKE ALL ON FUNCTION public.mark_conversation_read(uuid, uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid, uuid, timestamptz) TO authenticated;

-- Storage policy for message attachments (user-media bucket)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Conversation members can read message attachments'
  ) THEN
    CREATE POLICY "Conversation members can read message attachments"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'user-media' AND
        (storage.foldername(name))[1] = 'users' AND
        (storage.foldername(name))[3] = 'messages' AND
        EXISTS (
          SELECT 1 FROM public.conversation_members cm
          WHERE cm.conversation_id::text = (storage.foldername(name))[4]
            AND cm.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Ensure bucket accepts more media types for messaging
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg','image/jpg','image/png','image/webp','image/gif',
  'video/mp4','video/webm','video/quicktime',
  'audio/mpeg','audio/mp3','audio/wav','audio/webm','audio/ogg',
  'application/pdf','text/plain','application/zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]
WHERE id = 'user-media';

-- Enable RLS on new tables
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_deletions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

-- Tighten RLS policies
DROP POLICY IF EXISTS "Users can be added to conversations" ON public.conversation_members;
DROP POLICY IF EXISTS "Users can view members of their conversations" ON public.conversation_members;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can edit own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view read receipts in their conversations" ON public.message_reads;
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.message_reads;

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

CREATE POLICY "Users can update own member presence"
  ON public.conversation_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Inserts are handled by RPCs; avoid arbitrary membership inserts

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
    AND NOT EXISTS (
      SELECT 1
      FROM public.blocks b
      JOIN public.conversation_members cm_other
        ON cm_other.conversation_id = chat_messages.conversation_id
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = cm_other.user_id)
         OR (b.blocker_id = cm_other.user_id AND b.blocked_id = auth.uid())
    )
  );

CREATE POLICY "Senders can edit/delete recent messages"
  ON public.chat_messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (
    sender_id = auth.uid()
    AND now() - created_at <= interval '15 minutes'
  );

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

CREATE POLICY "Users can update own read state (update)"
  ON public.message_reads FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members can read reactions"
  ON public.message_reactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages m
      JOIN public.conversation_members cm
        ON cm.conversation_id = m.conversation_id
      WHERE m.id = message_reactions.message_id
        AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can react in conversations"
  ON public.message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chat_messages m
      JOIN public.conversation_members cm
        ON cm.conversation_id = m.conversation_id
      WHERE m.id = message_reactions.message_id
        AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove own reactions"
  ON public.message_reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Members can read message deletions"
  ON public.message_deletions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages m
      JOIN public.conversation_members cm
        ON cm.conversation_id = m.conversation_id
      WHERE m.id = message_deletions.message_id
        AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can hide messages for themselves"
  ON public.message_deletions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chat_messages m
      JOIN public.conversation_members cm
        ON cm.conversation_id = m.conversation_id
      WHERE m.id = message_deletions.message_id
        AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can unhide messages for themselves"
  ON public.message_deletions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own conversation settings"
  ON public.conversation_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = conversation_settings.conversation_id
        AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upsert own conversation settings"
  ON public.conversation_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = conversation_settings.conversation_id
        AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own conversation settings"
  ON public.conversation_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage blocks"
  ON public.blocks FOR SELECT
  TO authenticated
  USING (blocker_id = auth.uid() OR blocked_id = auth.uid());

CREATE POLICY "Users can create blocks"
  ON public.blocks FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can remove own blocks"
  ON public.blocks FOR DELETE
  TO authenticated
  USING (blocker_id = auth.uid());

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
      AND tablename = 'message_reads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reads;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'message_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
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
