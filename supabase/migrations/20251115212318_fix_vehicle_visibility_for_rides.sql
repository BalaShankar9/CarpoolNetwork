/*
  # Fix Vehicle Visibility for Ride Details

  ## Changes
  - Add policy to allow viewing vehicle details for active rides
  - Users can now see vehicle information when viewing other users' rides

  ## Security
  - Only exposes vehicle info for active rides
  - Does not expose vehicles not associated with rides
*/

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view own vehicles" ON vehicles;

-- Add new policies
CREATE POLICY "Users can view own vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view vehicles for active rides"
  ON vehicles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rides
      WHERE rides.vehicle_id = vehicles.id
      AND rides.status = 'active'
    )
  );
