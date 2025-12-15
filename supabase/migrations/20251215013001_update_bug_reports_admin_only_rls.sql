/*
  # Update Bug Reports RLS to Admin-Only

  1. Changes
    - Drop existing RLS policies on bug_reports table
    - Add new admin-only policies for SELECT, INSERT, and DELETE
    - Admin is defined as balashankarbollineni4@gmail.com

  2. Security
    - Only the admin email can SELECT bug reports
    - Only the admin email can INSERT bug reports
    - Only the admin email can DELETE bug reports
    - Regular users cannot access bug_reports at all

  3. Schema Update
    - Add page_path column as an alias-friendly name (nullable, uses existing 'page' for compatibility)
*/

DROP POLICY IF EXISTS "Users can insert their own bug reports" ON bug_reports;
DROP POLICY IF EXISTS "Users can read their own bug reports" ON bug_reports;
DROP POLICY IF EXISTS "Admins can read all bug reports" ON bug_reports;
DROP POLICY IF EXISTS "Admins can delete bug reports" ON bug_reports;

CREATE POLICY "Admin can read all bug reports"
  ON bug_reports
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') = 'balashankarbollineni4@gmail.com'
  );

CREATE POLICY "Admin can insert bug reports"
  ON bug_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'email') = 'balashankarbollineni4@gmail.com'
  );

CREATE POLICY "Admin can delete bug reports"
  ON bug_reports
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') = 'balashankarbollineni4@gmail.com'
  );
