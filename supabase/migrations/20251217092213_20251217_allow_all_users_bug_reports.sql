/*
  # Allow All Authenticated Users to Submit Bug Reports

  1. Changes
    - Add policy to allow all authenticated users to INSERT bug reports
    - Keep admin-only policies for SELECT and DELETE
    - This enables the feedback/bug reporting feature for all users

  2. Security
    - All authenticated users can submit bug reports (INSERT)
    - Only admin can view all bug reports (SELECT)
    - Only admin can delete bug reports (DELETE)
    - Users cannot update existing bug reports

  3. Notes
    - This change enables the feedback button for all users
    - Admin dashboard at /admin/bugs will show all submitted reports
*/

CREATE POLICY "All authenticated users can submit bug reports"
  ON bug_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
  );