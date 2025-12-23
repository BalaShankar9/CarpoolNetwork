/*
  # Fix get_smart_recommendations Function Score Type

  1. Changes
    - Update get_smart_recommendations function to return NUMERIC for score column
    - This matches the user_recommendations table definition where score is NUMERIC
    
  2. Security
    - Maintain existing security definer and access controls
*/

-- Drop and recreate get_smart_recommendations function with correct score type
DROP FUNCTION IF EXISTS get_smart_recommendations(uuid, integer);

CREATE FUNCTION get_smart_recommendations(
  p_user_id uuid,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  recommendation_id uuid,
  ride_id uuid,
  driver_id uuid,
  score numeric,
  reasoning jsonb,
  ride_details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM user_recommendations
  WHERE expires_at < NOW() 
     OR (dismissed = true AND created_at < NOW() - INTERVAL '30 days');

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
