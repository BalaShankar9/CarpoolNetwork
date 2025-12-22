/*
  # Add Two-Factor Authentication System

  1. New Tables
    - `two_factor_auth` - Stores 2FA settings and secrets per user
    - `two_factor_recovery_codes` - Backup recovery codes

  2. Fields
    - User 2FA enablement status
    - TOTP secret storage
    - Recovery codes (hashed)
    - Last used timestamp
    - Verification attempts tracking

  3. Security
    - RLS enabled on all tables
    - Users can only manage their own 2FA settings
    - Recovery codes are hashed before storage
    - Rate limiting on verification attempts

  4. Features
    - TOTP-based 2FA (compatible with Google Authenticator, Authy, etc.)
    - Recovery codes for account access
    - Audit trail of 2FA usage
*/

-- Two-factor authentication table
CREATE TABLE IF NOT EXISTS two_factor_auth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  enabled boolean DEFAULT false NOT NULL,
  secret text,
  verified_at timestamptz,
  last_used_at timestamptz,
  backup_codes_generated_at timestamptz,
  failed_attempts integer DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Recovery codes table (one-time use backup codes)
CREATE TABLE IF NOT EXISTS two_factor_recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used boolean DEFAULT false NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Two-factor authentication audit log
CREATE TABLE IF NOT EXISTS two_factor_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('enabled', 'disabled', 'verified', 'failed', 'recovery_used', 'codes_regenerated')),
  ip_address text,
  user_agent text,
  success boolean DEFAULT true,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_two_factor_auth_user_id ON two_factor_auth(user_id);
CREATE INDEX IF NOT EXISTS idx_two_factor_auth_enabled ON two_factor_auth(enabled);
CREATE INDEX IF NOT EXISTS idx_two_factor_recovery_codes_user_id ON two_factor_recovery_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_two_factor_recovery_codes_used ON two_factor_recovery_codes(used);
CREATE INDEX IF NOT EXISTS idx_two_factor_audit_log_user_id ON two_factor_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_two_factor_audit_log_created_at ON two_factor_audit_log(created_at);

-- Enable RLS
ALTER TABLE two_factor_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE two_factor_recovery_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE two_factor_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for two_factor_auth
CREATE POLICY "Users can view own 2FA settings"
  ON two_factor_auth FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own 2FA settings"
  ON two_factor_auth FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own 2FA settings"
  ON two_factor_auth FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own 2FA settings"
  ON two_factor_auth FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for two_factor_recovery_codes
CREATE POLICY "Users can view own recovery codes"
  ON two_factor_recovery_codes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own recovery codes"
  ON two_factor_recovery_codes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recovery codes"
  ON two_factor_recovery_codes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for two_factor_audit_log
CREATE POLICY "Users can view own 2FA audit log"
  ON two_factor_audit_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs"
  ON two_factor_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admin can view all 2FA settings
CREATE POLICY "Admins can view all 2FA settings"
  ON two_factor_auth FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admin can view all audit logs
CREATE POLICY "Admins can view all 2FA audit logs"
  ON two_factor_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Add triggers for updated_at
CREATE TRIGGER update_two_factor_auth_updated_at BEFORE UPDATE ON two_factor_auth
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check if user has 2FA enabled
CREATE OR REPLACE FUNCTION user_has_2fa_enabled(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  result boolean;
BEGIN
  SELECT enabled INTO result
  FROM two_factor_auth
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(result, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment failed 2FA attempts
CREATE OR REPLACE FUNCTION increment_2fa_failed_attempts(p_user_id uuid)
RETURNS void AS $$
DECLARE
  current_attempts integer;
BEGIN
  UPDATE two_factor_auth
  SET 
    failed_attempts = failed_attempts + 1,
    locked_until = CASE 
      WHEN failed_attempts + 1 >= 5 THEN now() + interval '15 minutes'
      ELSE locked_until
    END
  WHERE user_id = p_user_id
  RETURNING failed_attempts INTO current_attempts;

  INSERT INTO two_factor_audit_log (user_id, action, success)
  VALUES (p_user_id, 'failed', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset failed attempts on successful verification
CREATE OR REPLACE FUNCTION reset_2fa_failed_attempts(p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE two_factor_auth
  SET 
    failed_attempts = 0,
    locked_until = NULL,
    last_used_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO two_factor_audit_log (user_id, action, success)
  VALUES (p_user_id, 'verified', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if 2FA is locked
CREATE OR REPLACE FUNCTION is_2fa_locked(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  lock_time timestamptz;
BEGIN
  SELECT locked_until INTO lock_time
  FROM two_factor_auth
  WHERE user_id = p_user_id;
  
  RETURN lock_time IS NOT NULL AND lock_time > now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful comments
COMMENT ON TABLE two_factor_auth IS 'Stores two-factor authentication settings and secrets for users';
COMMENT ON TABLE two_factor_recovery_codes IS 'Stores one-time recovery codes for 2FA account access';
COMMENT ON TABLE two_factor_audit_log IS 'Audit trail of all 2FA-related actions';
COMMENT ON COLUMN two_factor_auth.secret IS 'TOTP secret (base32 encoded) - should be encrypted at application level';
COMMENT ON COLUMN two_factor_auth.locked_until IS 'Timestamp until which 2FA verification is locked after too many failed attempts';
COMMENT ON COLUMN two_factor_recovery_codes.code_hash IS 'Hashed recovery code (bcrypt or similar)';
