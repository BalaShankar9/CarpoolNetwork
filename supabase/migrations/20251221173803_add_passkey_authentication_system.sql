/*
  # Passkey (WebAuthn) Authentication System

  1. New Tables
    - `passkey_credentials`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `credential_id` (text, unique) - WebAuthn credential ID
      - `public_key` (text) - COSE public key
      - `counter` (bigint) - Signature counter for replay protection
      - `device_name` (text) - User-friendly device name
      - `transports` (text[]) - Available authenticator transports
      - `created_at` (timestamptz)
      - `last_used_at` (timestamptz)

    - `passkey_challenges`
      - `id` (uuid, primary key)
      - `user_id` (uuid, nullable) - For login challenges without known user
      - `challenge` (text, unique) - Random challenge string
      - `type` (text) - 'registration' or 'authentication'
      - `created_at` (timestamptz)
      - `expires_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only access their own credentials
    - Challenges are managed by Edge Functions only
    - Auto-expire old challenges

  3. Indexes
    - Index on credential_id for fast lookup
    - Index on user_id for user credential listing
    - Index on challenge for verification
*/

-- Create passkey_credentials table
CREATE TABLE IF NOT EXISTS passkey_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id text NOT NULL UNIQUE,
  public_key text NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  device_name text NOT NULL,
  transports text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now()
);

-- Create passkey_challenges table
CREATE TABLE IF NOT EXISTS passkey_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('registration', 'authentication')),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '5 minutes')
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_passkey_credentials_user_id ON passkey_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_passkey_credentials_credential_id ON passkey_credentials(credential_id);
CREATE INDEX IF NOT EXISTS idx_passkey_challenges_challenge ON passkey_challenges(challenge);
CREATE INDEX IF NOT EXISTS idx_passkey_challenges_expires_at ON passkey_challenges(expires_at);

-- Enable RLS
ALTER TABLE passkey_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE passkey_challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for passkey_credentials

-- Users can view their own credentials
CREATE POLICY "Users can view own passkey credentials"
  ON passkey_credentials
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own credentials
CREATE POLICY "Users can delete own passkey credentials"
  ON passkey_credentials
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Only service role can insert (via Edge Functions)
CREATE POLICY "Service role can insert passkey credentials"
  ON passkey_credentials
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Only service role can update (via Edge Functions for counter)
CREATE POLICY "Service role can update passkey credentials"
  ON passkey_credentials
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for passkey_challenges

-- Only service role can manage challenges (via Edge Functions)
CREATE POLICY "Service role can manage passkey challenges"
  ON passkey_challenges
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to clean up expired challenges
CREATE OR REPLACE FUNCTION cleanup_expired_passkey_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM passkey_challenges
  WHERE expires_at < now();
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION cleanup_expired_passkey_challenges() TO service_role;

COMMENT ON TABLE passkey_credentials IS 'Stores WebAuthn passkey credentials for passwordless authentication';
COMMENT ON TABLE passkey_challenges IS 'Temporary storage for WebAuthn challenges during registration/authentication';
COMMENT ON FUNCTION cleanup_expired_passkey_challenges IS 'Removes expired passkey challenges';