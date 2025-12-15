/*
  # Fix Infinite Recursion in RLS Policies

  ## Problem
  - Circular dependencies between ride_bookings, rides, and vehicles policies
  - ride_bookings policy checks rides
  - rides policy checks ride_bookings
  - vehicles policy checks both, creating infinite recursion

  ## Solution
  - Drop the problematic policies that cause recursion
  - Recreate with simpler, non-recursive logic
  - Use direct column checks instead of EXISTS subqueries where possible

  ## Changes
  1. Drop "Users can view rides they have booked" policy
  2. Drop "Users can view vehicles for their bookings" policy
  3. Recreate with security definer functions to break the recursion cycle
*/

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view rides they have booked" ON rides;
DROP POLICY IF EXISTS "Users can view vehicles for their bookings" ON vehicles;

-- Create a security definer function to check if user has a booking for a ride
CREATE OR REPLACE FUNCTION user_has_booking_for_ride(ride_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM ride_bookings
    WHERE ride_id = ride_uuid
      AND passenger_id = user_uuid
  );
$$;

-- Create a security definer function to check if user has a booking for a vehicle
CREATE OR REPLACE FUNCTION user_has_booking_for_vehicle(vehicle_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM rides r
    JOIN ride_bookings rb ON rb.ride_id = r.id
    WHERE r.vehicle_id = vehicle_uuid
      AND rb.passenger_id = user_uuid
  );
$$;

-- Recreate the rides policy using the security definer function
CREATE POLICY "Users can view rides they have booked"
  ON rides
  FOR SELECT
  TO authenticated
  USING (user_has_booking_for_ride(id, auth.uid()));

-- Recreate the vehicles policy using the security definer function
CREATE POLICY "Users can view vehicles for their bookings"
  ON vehicles
  FOR SELECT
  TO authenticated
  USING (user_has_booking_for_vehicle(id, auth.uid()));
