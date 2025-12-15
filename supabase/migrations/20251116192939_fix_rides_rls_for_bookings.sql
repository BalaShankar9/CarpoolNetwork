/*
  # Fix Ride Visibility for Bookings

  ## Changes
  - Add RLS policy to allow passengers to view rides they have booked
  - Add RLS policy to allow drivers to view their own rides regardless of status
  - This ensures the BookingDetails and MyRides pages work correctly

  ## Security
  - Passengers can only view rides they have booked
  - Drivers can view their own rides
  - Maintains data privacy while enabling necessary functionality
*/

-- Allow passengers to view rides they have booked
CREATE POLICY "Users can view rides they have booked"
  ON rides
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM ride_bookings
      WHERE ride_bookings.ride_id = rides.id
        AND ride_bookings.passenger_id = auth.uid()
    )
  );

-- Allow drivers to view their own rides
CREATE POLICY "Drivers can view own rides"
  ON rides
  FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());
