/*
  # Vehicle/Ride Deletion and Expired Ride Sync

  1. Functions
    - deactivate_vehicle: soft-delete a vehicle with active/future ride guardrails
    - delete_ride_for_driver: hard-delete a driver's ride with confirmed-passenger guard
    - sync_expired_ride_state: archive expired rides/bookings for the driver

  2. Security
    - SECURITY DEFINER with row_security off
    - auth.uid ownership checks enforced
*/

CREATE OR REPLACE FUNCTION public.deactivate_vehicle(
  p_vehicle_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security TO off
AS $$
DECLARE
  v_vehicle RECORD;
  v_has_active boolean;
  v_now timestamptz := now();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_vehicle FROM vehicles WHERE id = p_vehicle_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vehicle not found';
  END IF;

  IF v_vehicle.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to delete this vehicle';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM rides
    WHERE vehicle_id = p_vehicle_id
      AND driver_id = auth.uid()
      AND (
        (available_until IS NOT NULL AND available_until > v_now)
        OR (available_until IS NULL AND departure_time > v_now)
      )
      AND status NOT IN ('cancelled', 'completed')
  ) INTO v_has_active;

  IF v_has_active THEN
    RAISE EXCEPTION 'Vehicle is assigned to active or future rides';
  END IF;

  UPDATE vehicles
  SET is_active = false,
      updated_at = now()
  WHERE id = p_vehicle_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.deactivate_vehicle(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deactivate_vehicle(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_ride_for_driver(
  p_ride_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security TO off
AS $$
DECLARE
  v_ride RECORD;
  v_has_confirmed boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_ride FROM rides WHERE id = p_ride_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;

  IF v_ride.driver_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to delete this ride';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM ride_bookings
    WHERE ride_id = p_ride_id
      AND status IN ('confirmed', 'active')
  ) INTO v_has_confirmed;

  IF v_has_confirmed THEN
    RAISE EXCEPTION 'Cannot delete a ride with confirmed passengers';
  END IF;

  DELETE FROM rides WHERE id = p_ride_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_ride_for_driver(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_ride_for_driver(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_expired_ride_state()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security TO off
AS $$
DECLARE
  v_now timestamptz := now();
  v_updated_bookings integer;
  v_updated_rides integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  WITH expired_rides AS (
    SELECT id
    FROM rides
    WHERE driver_id = auth.uid()
      AND (
        (available_until IS NOT NULL AND available_until < v_now)
        OR (available_until IS NULL AND departure_time < v_now)
      )
      AND status NOT IN ('cancelled', 'completed')
  ),
  updated_bookings AS (
    UPDATE ride_bookings
    SET status = 'completed',
        updated_at = now()
    WHERE ride_id IN (SELECT id FROM expired_rides)
      AND status IN ('confirmed', 'pending', 'active')
    RETURNING id
  )
  SELECT COUNT(*) INTO v_updated_bookings FROM updated_bookings;

  UPDATE rides
  SET status = 'completed',
      updated_at = now()
  WHERE id IN (SELECT id FROM expired_rides)
    AND status NOT IN ('cancelled', 'completed');

  GET DIAGNOSTICS v_updated_rides = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'updated_bookings', v_updated_bookings,
    'updated_rides', v_updated_rides
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sync_expired_ride_state() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_expired_ride_state() TO authenticated;
