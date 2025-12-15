/*
  # Fix Vehicle Visibility for Bookings

  ## Changes
  - Add RLS policy to allow passengers to view vehicle information for rides they have booked
  - This ensures the BookingDetails page can load vehicle information when displaying booking details

  ## Security
  - Policy only allows viewing vehicles for rides where the user has an active booking
  - Maintains data privacy while enabling necessary functionality
*/

-- Add policy for passengers to view vehicles for their bookings
CREATE POLICY "Users can view vehicles for their bookings"
  ON vehicles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM ride_bookings rb
      JOIN rides r ON r.id = rb.ride_id
      WHERE r.vehicle_id = vehicles.id
        AND rb.passenger_id = auth.uid()
    )
  );
