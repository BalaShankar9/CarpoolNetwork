/*
  # Fix Bug Reports RLS Policies and Admin Function

  1. Changes
    - Update is_admin() function to properly check admin email
    - Drop redundant "Admin can insert bug reports" policy
    - Keep "All authenticated users can submit bug reports" policy for inserts
    - Keep admin-only policies for SELECT and DELETE

  2. Security
    - All authenticated users can submit bug reports (INSERT)
    - Only admin can view all bug reports (SELECT)
    - Only admin can delete bug reports (DELETE)
    
  3. Notes
    - Fixes "Unknown error" in diagnostics database write test
    - is_admin() function now properly identifies admin users
*/

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    auth.jwt() ->> 'email' = 'balashankarbollineni4@gmail.com'
    OR auth.jwt() ->> 'email' LIKE '%@carpoolnetwork.co.uk';
$$;

DROP POLICY IF EXISTS "Admin can insert bug reports" ON bug_reports;