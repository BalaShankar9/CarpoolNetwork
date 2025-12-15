/*
  # Fix Booking Status Constraint and Unique Index

  1. Updates
    - Add 'rejected' to ride_bookings status CHECK constraint
    - Update unique partial index to explicitly exclude 'cancelled' AND 'rejected' statuses
    - These are terminal states where booking is no longer active

  2. Rationale
    - Frontend code uses 'rejected' status when driver rejects booking
    - Only active bookings (pending, confirmed, completed) should prevent duplicates
    - Cancelled and rejected bookings should allow re-booking

  3. Changes
    - Drop old CHECK constraint and create new one with 'rejected'
    - Drop old unique index and create new one with explicit active status list
*/

-- Drop existing unique index
DROP INDEX IF EXISTS idx_unique_active_booking_per_passenger;

-- Drop existing status CHECK constraint
ALTER TABLE ride_bookings
  DROP CONSTRAINT IF EXISTS ride_bookings_status_check;

-- Add new CHECK constraint that includes 'rejected'
ALTER TABLE ride_bookings
  ADD CONSTRAINT ride_bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'rejected'));

-- Create new unique index that explicitly lists active statuses
-- A passenger can only have ONE active booking per ride
-- (cancelled and rejected bookings don't count as active)
CREATE UNIQUE INDEX idx_unique_active_booking_per_passenger
  ON ride_bookings(ride_id, passenger_id)
  WHERE status IN ('pending', 'confirmed', 'completed');