/*
  # Add Beta Allowlist Table for Private Beta Mode

  1. New Tables
    - `beta_allowlist`
      - `email` (text, primary key) - Email address allowed to sign up
      - `added_at` (timestamptz) - When the email was added to allowlist
      - `added_by` (text) - Admin who added the email

  2. Security
    - Enable RLS on `beta_allowlist` table
    - Public can check if their email is allowlisted (for signup validation)
    - Only admins can insert/delete entries

  3. Functions
    - `check_beta_allowlist(email)` - Public function to check if email is allowed
*/

CREATE TABLE IF NOT EXISTS beta_allowlist (
  email text PRIMARY KEY,
  added_at timestamptz DEFAULT now(),
  added_by text
);

ALTER TABLE beta_allowlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can check if email is allowlisted"
  ON beta_allowlist
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated admins can insert allowlist entries"
  ON beta_allowlist
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'email' = 'admin@carpoolnetwork.co.uk'
  );

CREATE POLICY "Authenticated admins can delete allowlist entries"
  ON beta_allowlist
  FOR DELETE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'admin@carpoolnetwork.co.uk'
  );

CREATE OR REPLACE FUNCTION public.check_beta_allowlist(check_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM beta_allowlist WHERE lower(email) = lower(check_email)
  );
$$;

GRANT EXECUTE ON FUNCTION public.check_beta_allowlist(text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_beta_allowlist(text) TO authenticated;