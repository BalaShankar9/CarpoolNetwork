/*
  # Cleanup Duplicate Vehicle Policies

  1. Issue
    - Multiple duplicate policies exist for vehicles table
    - This can cause confusion and performance issues

  2. Changes
    - Remove older duplicate policies
    - Keep only one policy per operation type
    
  3. Security
    - Maintains same access control
    - Users can only manage their own vehicles
*/

-- Drop duplicate INSERT policies (keep the more descriptive one)
DROP POLICY IF EXISTS "Users can insert own vehicles" ON vehicles;

-- Drop duplicate SELECT policies (consolidate into one comprehensive policy)
DROP POLICY IF EXISTS "Users can view own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can view their own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can view vehicles associated with rides" ON vehicles;
DROP POLICY IF EXISTS "Users can view vehicles for active rides" ON vehicles;
DROP POLICY IF EXISTS "Users can view vehicles for their bookings" ON vehicles;

-- Drop duplicate UPDATE policies
DROP POLICY IF EXISTS "Users can update own vehicles" ON vehicles;

-- Drop duplicate DELETE policies
DROP POLICY IF EXISTS "Users can delete own vehicles" ON vehicles;

-- Create single, clear SELECT policy for vehicles
CREATE POLICY "Users can view vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (
    -- Own vehicles
    user_id = (SELECT auth.uid())
    OR
    -- Vehicles associated with active rides
    id IN (
      SELECT vehicle_id 
      FROM rides 
      WHERE status IN ('active', 'in_progress', 'completed')
    )
    OR
    -- Vehicles for rides they've booked
    id IN (
      SELECT r.vehicle_id
      FROM rides r
      INNER JOIN ride_requests rr ON r.id = rr.ride_id
      WHERE rr.rider_id = (SELECT auth.uid())
        AND rr.status = 'accepted'
    )
  );
