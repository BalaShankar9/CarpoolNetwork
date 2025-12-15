/*
  # Fix Ride Availability Logic - Prevent Fully Booked Rides from Showing

  ## Problem
  Rides with 0 available seats are showing in "Available Rides" list.

  ## Solution
  1. Create a view that calculates available seats dynamically from bookings
  2. Add a function to recalculate and sync available_seats
  3. Add check constraint to prevent negative seats
  4. Add trigger to keep available_seats in sync

  ## Changes
  - View: `rides_with_calculated_seats` - Shows rides with real-time seat availability
  - Function: `recalculate_ride_seats` - Syncs available_seats with actual bookings
  - Constraint: Prevents available_seats from going negative
  - Trigger: Auto-syncs on booking status changes
*/

-- ============================================================================
-- VIEW: Calculate available seats from actual bookings
-- ============================================================================
CREATE OR REPLACE VIEW rides_with_calculated_seats AS
SELECT
  r.*,
  (
    r.total_seats - COALESCE(
      (
        SELECT SUM(rb.seats_requested)
        FROM ride_bookings rb
        WHERE rb.ride_id = r.id
        AND rb.status IN ('pending', 'confirmed', 'paid')
      ),
      0
    )
  ) AS calculated_available_seats
FROM rides r;

COMMENT ON VIEW rides_with_calculated_seats IS
'Shows rides with dynamically calculated available seats based on active bookings (pending, confirmed, paid)';

-- ============================================================================
-- FUNCTION: Recalculate and sync available_seats for a ride
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

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found';
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
'Recalculates and syncs available_seats for a ride based on actual active bookings';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION recalculate_ride_seats(uuid) TO authenticated;

-- ============================================================================
-- CONSTRAINT: Prevent negative available seats
-- ============================================================================
DO $$
BEGIN
  -- Drop constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'rides_available_seats_non_negative'
  ) THEN
    ALTER TABLE rides DROP CONSTRAINT rides_available_seats_non_negative;
  END IF;

  -- Add constraint to prevent negative seats
  ALTER TABLE rides
  ADD CONSTRAINT rides_available_seats_non_negative
  CHECK (available_seats >= 0);
END $$;

COMMENT ON CONSTRAINT rides_available_seats_non_negative ON rides IS
'Ensures available_seats never goes negative';

-- ============================================================================
-- TRIGGER: Auto-sync available_seats on booking changes
-- ============================================================================

-- Create trigger function
CREATE OR REPLACE FUNCTION trigger_sync_ride_seats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- On INSERT or UPDATE, recalculate seats for the affected ride
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM recalculate_ride_seats(NEW.ride_id);
    RETURN NEW;
  END IF;

  -- On DELETE, recalculate seats for the old ride
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_ride_seats(OLD.ride_id);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trg_sync_ride_seats_on_booking_change ON ride_bookings;

-- Create trigger on ride_bookings table
CREATE TRIGGER trg_sync_ride_seats_on_booking_change
  AFTER INSERT OR UPDATE OR DELETE ON ride_bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_ride_seats();

COMMENT ON TRIGGER trg_sync_ride_seats_on_booking_change ON ride_bookings IS
'Automatically syncs available_seats in rides table when bookings change';

-- ============================================================================
-- DATA MIGRATION: Sync existing rides
-- ============================================================================

-- Recalculate available_seats for all existing active rides
DO $$
DECLARE
  ride_record RECORD;
BEGIN
  FOR ride_record IN
    SELECT id FROM rides WHERE status = 'active'
  LOOP
    PERFORM recalculate_ride_seats(ride_record.id);
  END LOOP;
END $$;

-- ============================================================================
-- HELPER FUNCTION: Get truly available rides
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_available_rides(
  p_min_seats int DEFAULT 1,
  p_exclude_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  driver_id uuid,
  origin text,
  origin_lat double precision,
  origin_lng double precision,
  destination text,
  destination_lat double precision,
  destination_lng double precision,
  departure_time timestamptz,
  available_seats int,
  total_seats int,
  status text,
  notes text,
  estimated_distance double precision,
  estimated_duration double precision,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.driver_id,
    r.origin,
    r.origin_lat,
    r.origin_lng,
    r.destination,
    r.destination_lat,
    r.destination_lng,
    r.departure_time,
    r.available_seats,
    r.total_seats,
    r.status,
    r.notes,
    r.estimated_distance,
    r.estimated_duration,
    r.created_at,
    r.updated_at
  FROM rides r
  WHERE r.status = 'active'
  AND r.available_seats >= p_min_seats
  AND r.available_seats > 0
  AND r.departure_time >= now()
  AND (p_exclude_user_id IS NULL OR r.driver_id != p_exclude_user_id)
  ORDER BY r.departure_time ASC;
$$;

COMMENT ON FUNCTION get_available_rides IS
'Returns only truly available rides (status=active, available_seats > 0, future departure, not driver)';

GRANT EXECUTE ON FUNCTION get_available_rides(int, uuid) TO authenticated;