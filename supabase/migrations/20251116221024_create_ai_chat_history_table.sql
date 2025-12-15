/*
  # Create AI Chat History Table

  1. New Tables
    - `ai_chat_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `message` (text) - User or AI message
      - `role` (text) - 'user' or 'assistant'
      - `created_at` (timestamptz)
      - `session_id` (text) - Group messages by session

  2. Security
    - Enable RLS on `ai_chat_history` table
    - Add policy for users to read their own chat history
    - Add policy for users to create their own chat messages

  3. Indexes
    - Index on user_id for efficient lookups
    - Index on session_id for session-based queries
    - Index on created_at for sorting

  4. Purpose
    - Persist AI chat conversations
    - Allow users to review past conversations
    - Provide context for future AI interactions
*/

CREATE TABLE IF NOT EXISTS ai_chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  session_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own chat history"
  ON ai_chat_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chat messages"
  ON ai_chat_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_chat_history_user_id ON ai_chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_history_session_id ON ai_chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_history_created_at ON ai_chat_history(created_at DESC);
