/*
  # Add Secure Admin System

  1. Changes
    - Add is_admin column to profiles table
    - Set specific user as admin (balashankarbollineni4@gmail.com)
    - Update is_admin() function to check profile column instead of email domain
    - Create helper function to manage admin status

  2. Security
    - Removes email domain-based admin access (major security vulnerability)
    - Only explicitly granted users have admin access
    - Admin status stored in database, not inferred from email
    - Prevents unauthorized admin access through fake email signups

  3. Notes
    - Critical security fix: prevents anyone from signing up with @carpoolnetwork.co.uk and getting admin
    - Admin status must be explicitly granted
    - Initial admin: balashankarbollineni4@gmail.com
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT false NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;

UPDATE profiles 
SET is_admin = true 
WHERE email = 'balashankarbollineni4@gmail.com';

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION set_admin(target_user_id uuid, admin_status boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can modify admin status';
  END IF;
  
  UPDATE profiles
  SET is_admin = admin_status
  WHERE id = target_user_id;
END;
$$;