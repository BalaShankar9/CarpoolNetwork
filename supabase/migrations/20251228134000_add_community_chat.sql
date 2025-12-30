/*
  # Add community live chat

  1. Tables
    - community_chat_messages
  2. RLS
    - Authenticated read/write with owner controls
*/

CREATE TABLE IF NOT EXISTS public.community_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 2000),
  type text NOT NULL DEFAULT 'TEXT' CHECK (type IN ('TEXT', 'SYSTEM')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_chat_messages_created_at
  ON public.community_chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_chat_messages_sender
  ON public.community_chat_messages(sender_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'community_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE community_chat_messages;
  END IF;
END $$;

ALTER TABLE public.community_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Community chat messages are readable" ON public.community_chat_messages;
CREATE POLICY "Community chat messages are readable"
  ON public.community_chat_messages FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can send community chat messages" ON public.community_chat_messages;
CREATE POLICY "Users can send community chat messages"
  ON public.community_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can delete own community chat messages" ON public.community_chat_messages;
CREATE POLICY "Users can delete own community chat messages"
  ON public.community_chat_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id OR (select is_admin()) = true);

GRANT SELECT, INSERT, DELETE ON public.community_chat_messages TO authenticated;
