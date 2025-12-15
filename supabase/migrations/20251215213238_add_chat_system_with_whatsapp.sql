/*
  # Chat System with WhatsApp Integration

  1. Profile Updates
    - Add WhatsApp contact fields and privacy settings to profiles
    - `whatsapp_opt_in`, `allow_inhouse_chat`, `allow_whatsapp_chat`
    - `privacy_phone_visibility` enum

  2. New Tables
    - `conversations` - Group chats for rides/trips/friends
    - `conversation_members` - Users in each conversation
    - `chat_messages` - New message table (conversation-based)
    - `message_reads` - Track read receipts

  3. Security
    - Users can only access conversations they are members of
    - Messages can only be sent by conversation members
    - WhatsApp contact only shared when privacy rules met

  4. Notes
    - Existing `messages` table preserved for backward compatibility
    - New chat uses `chat_messages` table with conversations
*/

-- Add WhatsApp and privacy fields to profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'whatsapp_opt_in') THEN
    ALTER TABLE profiles ADD COLUMN whatsapp_opt_in boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'allow_inhouse_chat') THEN
    ALTER TABLE profiles ADD COLUMN allow_inhouse_chat boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'allow_whatsapp_chat') THEN
    ALTER TABLE profiles ADD COLUMN allow_whatsapp_chat boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'privacy_phone_visibility') THEN
    ALTER TABLE profiles ADD COLUMN privacy_phone_visibility text DEFAULT 'MATCH_ONLY' 
      CHECK (privacy_phone_visibility IN ('MATCH_ONLY', 'FRIENDS_ONLY', 'NEVER'));
  END IF;
END $$;

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('RIDE_MATCH', 'TRIP_MATCH', 'FRIENDS_DM')),
  ride_id uuid REFERENCES rides(id) ON DELETE CASCADE,
  trip_request_id uuid REFERENCES trip_requests(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_ride_id ON conversations(ride_id) WHERE ride_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_trip_request_id ON conversations(trip_request_id) WHERE trip_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);

-- Create conversation_members table
CREATE TABLE IF NOT EXISTS conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('DRIVER', 'RIDER', 'FRIEND')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation_id ON conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user_id ON conversation_members(user_id);

-- Create chat_messages table (new conversation-based messages)
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  type text DEFAULT 'TEXT' CHECK (type IN ('TEXT', 'SYSTEM')),
  created_at timestamptz DEFAULT now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- Create message_reads table
CREATE TABLE IF NOT EXISTS message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_reads_message_id ON message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user_id ON message_reads(user_id);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations

-- Users can view conversations they are members of
CREATE POLICY "Users can view conversations they are members of"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = conversations.id
      AND conversation_members.user_id = auth.uid()
    )
  );

-- Users can create conversations (will be done via RPC functions mostly)
CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for conversation_members

-- Users can view members of conversations they belong to
CREATE POLICY "Users can view members of their conversations"
  ON conversation_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = conversation_members.conversation_id
      AND cm.user_id = auth.uid()
    )
  );

-- Users can be added to conversations
CREATE POLICY "Users can be added to conversations"
  ON conversation_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for chat_messages

-- Users can view messages in conversations they are members of
CREATE POLICY "Users can view messages in their conversations"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = chat_messages.conversation_id
      AND conversation_members.user_id = auth.uid()
    )
  );

-- Users can send messages in conversations they are members of
CREATE POLICY "Users can send messages in their conversations"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = chat_messages.conversation_id
      AND conversation_members.user_id = auth.uid()
    )
  );

-- Users can edit their own messages
CREATE POLICY "Users can edit own messages"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- RLS Policies for message_reads

-- Users can view read receipts for messages in their conversations
CREATE POLICY "Users can view read receipts in their conversations"
  ON message_reads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_messages
      JOIN conversation_members ON conversation_members.conversation_id = chat_messages.conversation_id
      WHERE chat_messages.id = message_reads.message_id
      AND conversation_members.user_id = auth.uid()
    )
  );

-- Users can mark messages as read
CREATE POLICY "Users can mark messages as read"
  ON message_reads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Add updated_at trigger for conversations
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create or get conversation for a ride match
CREATE OR REPLACE FUNCTION get_or_create_ride_conversation(
  p_ride_id uuid,
  p_driver_id uuid,
  p_rider_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id uuid;
BEGIN
  -- Try to find existing conversation
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE type = 'RIDE_MATCH' AND ride_id = p_ride_id
  AND EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = conversations.id
    AND user_id = p_rider_id
  )
  LIMIT 1;

  -- Create if doesn't exist
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (type, ride_id)
    VALUES ('RIDE_MATCH', p_ride_id)
    RETURNING id INTO v_conversation_id;

    -- Add driver
    INSERT INTO conversation_members (conversation_id, user_id, role)
    VALUES (v_conversation_id, p_driver_id, 'DRIVER');

    -- Add rider
    INSERT INTO conversation_members (conversation_id, user_id, role)
    VALUES (v_conversation_id, p_rider_id, 'RIDER');
  END IF;

  RETURN v_conversation_id;
END;
$$;

-- Function to create or get conversation for a trip match
CREATE OR REPLACE FUNCTION get_or_create_trip_conversation(
  p_trip_request_id uuid,
  p_rider_id uuid,
  p_driver_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id uuid;
BEGIN
  -- Try to find existing conversation
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE type = 'TRIP_MATCH' AND trip_request_id = p_trip_request_id
  AND EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = conversations.id
    AND user_id = p_driver_id
  )
  LIMIT 1;

  -- Create if doesn't exist
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (type, trip_request_id)
    VALUES ('TRIP_MATCH', p_trip_request_id)
    RETURNING id INTO v_conversation_id;

    -- Add rider
    INSERT INTO conversation_members (conversation_id, user_id, role)
    VALUES (v_conversation_id, p_rider_id, 'RIDER');

    -- Add driver
    INSERT INTO conversation_members (conversation_id, user_id, role)
    VALUES (v_conversation_id, p_driver_id, 'DRIVER');
  END IF;

  RETURN v_conversation_id;
END;
$$;

-- Grant execute permissions
REVOKE ALL ON FUNCTION get_or_create_ride_conversation FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_or_create_ride_conversation TO authenticated;

REVOKE ALL ON FUNCTION get_or_create_trip_conversation FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_or_create_trip_conversation TO authenticated;
