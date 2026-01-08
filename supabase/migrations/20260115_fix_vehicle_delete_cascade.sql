-- Fix: Vehicle delete cascade error
-- Problem: When deleting a vehicle, the ON DELETE CASCADE triggers booking deletion
-- which calls recalculate_ride_seats(), but the ride is already deleted by then
-- Solution: Make recalculate_ride_seats() gracefully handle non-existent rides

-- ============================================================================
-- FUNCTION: Recalculate and sync available_seats for a ride
-- Fixed to handle deleted rides gracefully during cascade operations
-- ============================================================================
CREATE OR REPLACE FUNCTION public.recalculate_ride_seats(p_ride_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_seats int;
  v_booked_seats int;
  v_new_available_seats int;
BEGIN
  -- Get total seats for the ride
  SELECT total_seats INTO v_total_seats
  FROM rides
  WHERE id = p_ride_id;

  -- If ride doesn't exist, just return silently
  -- This handles cascade delete operations where ride is deleted first
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calculate booked seats (only count active bookings)
  SELECT COALESCE(SUM(seats_requested), 0) INTO v_booked_seats
  FROM ride_bookings
  WHERE ride_id = p_ride_id
  AND status IN ('pending', 'confirmed', 'paid');

  -- Calculate new available seats
  v_new_available_seats := v_total_seats - v_booked_seats;

  -- Ensure it doesn't go negative
  v_new_available_seats := GREATEST(v_new_available_seats, 0);

  -- Update the ride
  UPDATE rides
  SET
    available_seats = v_new_available_seats,
    updated_at = now()
  WHERE id = p_ride_id;

END;
$$;

COMMENT ON FUNCTION recalculate_ride_seats IS
'Recalculates and syncs available_seats for a ride based on actual active bookings. Handles cascade deletions gracefully.';
