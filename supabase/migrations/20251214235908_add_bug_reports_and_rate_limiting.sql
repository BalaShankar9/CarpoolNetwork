/*
  # Add Bug Reports Table and Rate Limiting

  1. New Tables
    - `bug_reports`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `text` (text, the feedback/bug report content)
      - `page` (text, the page URL where feedback was submitted)
      - `created_at` (timestamptz)
    - `rate_limits`
      - `id` (uuid, primary key)
      - `user_id` (uuid, nullable for anonymous actions)
      - `action_type` (text, e.g., 'signup', 'message', 'feedback')
      - `identifier` (text, email or IP for rate limiting)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `bug_reports` table
    - Users can only insert their own bug reports
    - Users can read their own bug reports
    - Enable RLS on `rate_limits` table
    - System can insert rate limit records

  3. Rate Limiting Functions
    - Function to check rate limits
    - Function to record actions for rate limiting
*/

CREATE TABLE IF NOT EXISTS bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  text text NOT NULL,
  page text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own bug reports"
  ON bug_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own bug reports"
  ON bug_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  identifier text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_action_created 
  ON rate_limits(identifier, action_type, created_at DESC);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can insert rate limit records"
  ON rate_limits
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier text,
  p_action_type text,
  p_max_requests integer,
  p_window_minutes integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_count integer;
BEGIN
  SELECT COUNT(*) INTO request_count
  FROM rate_limits
  WHERE identifier = p_identifier
    AND action_type = p_action_type
    AND created_at > NOW() - (p_window_minutes || ' minutes')::interval;
  
  RETURN request_count < p_max_requests;
END;
$$;

CREATE OR REPLACE FUNCTION record_rate_limit_action(
  p_user_id uuid,
  p_identifier text,
  p_action_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO rate_limits (user_id, identifier, action_type)
  VALUES (p_user_id, p_identifier, p_action_type);
  
  DELETE FROM rate_limits
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$;
