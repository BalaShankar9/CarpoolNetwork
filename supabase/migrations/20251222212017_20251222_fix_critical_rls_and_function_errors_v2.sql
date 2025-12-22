/*
  # Fix Critical RLS and Function Errors

  1. Issues Fixed
    - Fix infinite recursion in rides RLS policies
    - Fix get_smart_recommendations function (remove non-existent price_per_seat column)
    - Simplify circular dependencies between rides and ride_requests

  2. Changes
    - Recreate rides SELECT policies without circular dependencies
    - Update get_smart_recommendations function to use existing columns only
    
  3. Security
    - Maintain same access control logic without recursion
    - Ensure authenticated users can still view appropriate rides
*/

-- Drop existing problematic rides SELECT policies
DROP POLICY IF EXISTS "Anyone can view active rides" ON rides;
DROP POLICY IF EXISTS "Drivers can view own rides" ON rides;
DROP POLICY IF EXISTS "Users can view rides they have booked" ON rides;

-- Recreate rides SELECT policies without circular dependencies
CREATE POLICY "Users can view active rides"
  ON rides FOR SELECT
  TO authenticated
  USING (status = 'active' OR driver_id = (SELECT auth.uid()));

CREATE POLICY "Users can view booked rides"
  ON rides FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT ride_id 
      FROM ride_requests 
      WHERE rider_id = (SELECT auth.uid()) 
        AND status = 'accepted'
    )
  );

-- Drop and recreate get_smart_recommendations function
DROP FUNCTION IF EXISTS get_smart_recommendations(uuid, integer);

CREATE FUNCTION get_smart_recommendations(
  p_user_id uuid,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  recommendation_id uuid,
  ride_id uuid,
  driver_id uuid,
  score integer,
  reasoning jsonb,
  ride_details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clean up old recommendations
  DELETE FROM user_recommendations
  WHERE expires_at < NOW() 
     OR (dismissed = true AND created_at < NOW() - INTERVAL '30 days');

  -- Return recommendations with existing ride columns only
  RETURN QUERY
  SELECT 
    ur.id as recommendation_id,
    ur.ride_id,
    ur.driver_id,
    ur.score,
    ur.reasoning,
    jsonb_build_object(
      'origin', r.origin,
      'destination', r.destination,
      'departure_time', r.departure_time,
      'available_seats', r.available_seats,
      'estimated_distance', r.estimated_distance,
      'estimated_duration', r.estimated_duration
    ) as ride_details
  FROM user_recommendations ur
  LEFT JOIN rides r ON r.id = ur.ride_id
  WHERE ur.user_id = p_user_id
    AND NOT ur.dismissed
    AND NOT ur.converted
    AND ur.expires_at > NOW()
  ORDER BY ur.score DESC, ur.created_at DESC
  LIMIT p_limit;
END;
$$;
