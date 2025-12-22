/*
  # Add Admin Verification Policies

  1. Purpose
    - Allow admin users to view and manage pending verifications
    - Enable admins to approve/reject driver licenses and insurance

  2. Changes
    - Add admin SELECT policies for driver_licenses table
    - Add admin SELECT policies for vehicle_insurance table
    - Add admin UPDATE policies for verification management

  3. Security
    - Only users with is_admin = true can access verification data
    - Admins can view all pending verifications
    - Admins can approve/reject verifications
*/

-- Admin can view all driver licenses
DROP POLICY IF EXISTS "Admins can view all licenses" ON driver_licenses;
CREATE POLICY "Admins can view all licenses"
  ON driver_licenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admin can update any license for verification
DROP POLICY IF EXISTS "Admins can update licenses" ON driver_licenses;
CREATE POLICY "Admins can update licenses"
  ON driver_licenses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admin can view all vehicle insurance
DROP POLICY IF EXISTS "Admins can view all insurance" ON vehicle_insurance;
CREATE POLICY "Admins can view all insurance"
  ON vehicle_insurance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admin can update any insurance for verification
DROP POLICY IF EXISTS "Admins can update insurance" ON vehicle_insurance;
CREATE POLICY "Admins can update insurance"
  ON vehicle_insurance FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Add helpful comments
COMMENT ON POLICY "Admins can view all licenses" ON driver_licenses IS 'Allows admin users to view all driver licenses for verification purposes';
COMMENT ON POLICY "Admins can update licenses" ON driver_licenses IS 'Allows admin users to approve or reject driver license verifications';
COMMENT ON POLICY "Admins can view all insurance" ON vehicle_insurance IS 'Allows admin users to view all vehicle insurance for verification purposes';
COMMENT ON POLICY "Admins can update insurance" ON vehicle_insurance IS 'Allows admin users to approve or reject insurance verifications';
