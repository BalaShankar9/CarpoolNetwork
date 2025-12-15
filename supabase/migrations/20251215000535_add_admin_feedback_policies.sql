/*
  # Add Admin Policies for Bug Reports

  1. Changes
    - Add policy for admins to read all bug reports
    - Add policy for admins to delete bug reports
    - Create admin check function

  2. Security
    - Admin email is checked via auth.jwt() metadata
    - Only admins can view and delete all bug reports
*/

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    WHERE auth.jwt() ->> 'email' = current_setting('app.admin_email', true)
    OR auth.jwt() ->> 'email' LIKE '%@carpoolnetwork.co.uk'
  );
$$;

CREATE POLICY "Admins can read all bug reports"
  ON bug_reports
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'email' LIKE '%@carpoolnetwork.co.uk'
    OR auth.uid() = user_id
  );

CREATE POLICY "Admins can delete bug reports"
  ON bug_reports
  FOR DELETE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' LIKE '%@carpoolnetwork.co.uk'
  );
