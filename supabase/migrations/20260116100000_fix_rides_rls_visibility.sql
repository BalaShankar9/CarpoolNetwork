-- ============================================================================
-- FIX RIDES RLS VISIBILITY
-- ============================================================================
-- Problem: user_can_view_ride() function checks ride_requests table with 
--          rider_id and status='accepted', but the actual booking system uses
--          ride_bookings table with passenger_id and status='confirmed'
--
-- This migration fixes the function to check the correct table and columns.
-- ============================================================================

-- Drop and recreate the function with correct logic
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
  
  -- Check if user has a confirmed or completed booking (using ride_bookings table)
  SELECT EXISTS(
    SELECT 1 FROM ride_bookings 
    WHERE ride_id = p_ride_id 
      AND passenger_id = p_user_id 
      AND status IN ('confirmed', 'completed', 'pending')
  ) INTO v_result;
  
  IF v_result THEN
    RETURN true;
  END IF;
  
  -- Also check ride_requests for legacy compatibility (if table exists)
  -- This handles cases where ride_requests might be used in some flows
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'ride_requests'
  ) THEN
    SELECT EXISTS(
      SELECT 1 FROM ride_requests 
      WHERE ride_id = p_ride_id 
        AND rider_id = p_user_id 
        AND status IN ('accepted', 'pending')
    ) INTO v_result;
    
    IF v_result THEN
      RETURN true;
    END IF;
  END IF;
  
  RETURN false;
END;
$$;

-- Ensure the function is accessible
GRANT EXECUTE ON FUNCTION user_can_view_ride(uuid, uuid) TO authenticated;

-- ============================================================================
-- REFRESH SCHEMA CACHE
-- ============================================================================
-- Signal PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICATION COMMENTS
-- ============================================================================
COMMENT ON FUNCTION user_can_view_ride(uuid, uuid) IS 
'Checks if a user can view a specific ride. Returns true if:
1. User is the driver of the ride
2. User has a booking (pending, confirmed, or completed) in ride_bookings
3. User has a request (accepted or pending) in ride_requests (legacy)

Fixed in migration 20260116100000 to use ride_bookings instead of ride_requests.';
