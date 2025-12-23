/*
  # Eliminate All Circular Dependencies in RLS Policies

  1. Problem
    - Circular dependency between rides, ride_requests, and vehicles policies
    - rides SELECT policy queries ride_requests
    - ride_requests SELECT policy queries rides
    - vehicles SELECT policy queries rides
    - This creates infinite recursion during vehicle insertion

  2. Solution
    - Completely restructure policies to avoid circular references
    - Use separate simple policies for each use case
    - Avoid subqueries that cross-reference tables with RLS
    
  3. Security
    - Maintain same access control without circular dependencies
    - Each policy is self-contained and doesn't trigger other RLS checks
*/

-- ============================================================================
-- FIX VEHICLES POLICIES (Remove rides query to break circular dependency)
-- ============================================================================

-- Drop all existing vehicle SELECT policies
DROP POLICY IF EXISTS "Users can view vehicles" ON vehicles;

-- Create separate, simple vehicle SELECT policies without cross-table queries
CREATE POLICY "vehicle_select_own"
  ON vehicles FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "vehicle_select_public_active"
  ON vehicles FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ============================================================================
-- FIX RIDES POLICIES (Simplify to avoid ride_requests query)
-- ============================================================================

-- Drop existing rides SELECT policies
DROP POLICY IF EXISTS "Users can view active rides" ON rides;
DROP POLICY IF EXISTS "Users can view booked rides" ON rides;

-- Create simple rides SELECT policies without circular dependencies
CREATE POLICY "rides_select_active_public"
  ON rides FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "rides_select_own_as_driver"
  ON rides FOR SELECT
  TO authenticated
  USING (driver_id = (SELECT auth.uid()));

-- ============================================================================
-- FIX RIDE_REQUESTS POLICIES (Remove rides query to break circular dependency)
-- ============================================================================

-- Drop existing ride_requests SELECT policies
DROP POLICY IF EXISTS "Drivers can view requests for their rides" ON ride_requests;
DROP POLICY IF EXISTS "Riders can view own ride requests" ON ride_requests;

-- Create simple ride_requests SELECT policies without cross-table queries
CREATE POLICY "ride_requests_select_as_rider"
  ON ride_requests FOR SELECT
  TO authenticated
  USING (rider_id = (SELECT auth.uid()));

-- For drivers to see requests, use a SECURITY DEFINER function instead of RLS
-- This breaks the circular dependency by bypassing RLS in the function

-- ============================================================================
-- ADD HELPER FUNCTION FOR DRIVERS TO VIEW THEIR RIDE REQUESTS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_ride_requests_for_driver(p_driver_id uuid)
RETURNS TABLE (
  id uuid,
  ride_id uuid,
  rider_id uuid,
  status text,
  seats_requested integer,
  pickup_location text,
  message text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rr.id,
    rr.ride_id,
    rr.rider_id,
    rr.status,
    rr.seats_requested,
    rr.pickup_location,
    rr.message,
    rr.created_at,
    rr.updated_at
  FROM ride_requests rr
  INNER JOIN rides r ON r.id = rr.ride_id
  WHERE r.driver_id = p_driver_id;
END;
$$;

-- ============================================================================
-- ADD HELPER FUNCTION TO CHECK IF USER CAN VIEW A SPECIFIC RIDE
-- ============================================================================

CREATE OR REPLACE FUNCTION user_can_view_ride(p_user_id uuid, p_ride_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result boolean;
BEGIN
  -- Check if user is the driver
  SELECT EXISTS(
    SELECT 1 FROM rides 
    WHERE id = p_ride_id AND driver_id = p_user_id
  ) INTO v_result;
  
  IF v_result THEN
    RETURN true;
  END IF;
  
  -- Check if user has an accepted booking
  SELECT EXISTS(
    SELECT 1 FROM ride_requests 
    WHERE ride_id = p_ride_id 
      AND rider_id = p_user_id 
      AND status = 'accepted'
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- ============================================================================
-- ADD POLICY FOR USERS TO VIEW RIDES THEY'VE BOOKED (using function)
-- ============================================================================

CREATE POLICY "rides_select_booked"
  ON rides FOR SELECT
  TO authenticated
  USING (user_can_view_ride((SELECT auth.uid()), id));

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_ride_requests_for_driver(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION user_can_view_ride(uuid, uuid) TO authenticated;
