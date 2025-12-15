/*
  # Complete Two-Way Matching System

  1. Schema Changes
    - Add `seats_taken` to `rides` table
    - Rename existing `ride_requests` to `trip_requests` (rider-posted trip requests)
    - Create new `ride_requests` table (requests for driver-posted rides)
    - Create `trip_offers` table (driver offers on trip requests)

  2. New Tables
    - `ride_requests` - Riders requesting specific driver-posted rides
      - Statuses: PENDING_DRIVER, DECLINED_BY_DRIVER, ACCEPTED_BY_DRIVER, CONFIRMED, CANCELLED_BY_RIDER, EXPIRED
    - `trip_offers` - Drivers offering on rider-posted trip requests  
      - Statuses: OFFERED, WITHDRAWN_BY_DRIVER, DECLINED_BY_RIDER, CONFIRMED, EXPIRED

  3. Security
    - Enable RLS on all new tables
    - Riders can create/view their own requests
    - Drivers can view requests for their rides and accept/decline
    - Riders can view/confirm offers on their trip requests
    - Drivers can create offers

  4. Constraints
    - Unique indexes to prevent duplicate requests/offers
    - Check constraints for valid seat counts
    - Expiry timestamps for time-limited acceptances
*/

-- First, rename existing ride_requests to trip_requests
ALTER TABLE IF EXISTS ride_requests RENAME TO trip_requests;

-- Update trip_requests columns to match new spec
DO $$
BEGIN
  -- Rename columns if they exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_requests' AND column_name = 'requester_id') THEN
    ALTER TABLE trip_requests RENAME COLUMN requester_id TO rider_id;
  END IF;

  -- Update status enum values for trip_requests
  ALTER TABLE trip_requests DROP CONSTRAINT IF EXISTS ride_requests_status_check;
  ALTER TABLE trip_requests DROP CONSTRAINT IF EXISTS trip_requests_status_check;
  ALTER TABLE trip_requests ADD CONSTRAINT trip_requests_status_check 
    CHECK (status IN ('OPEN', 'CONFIRMED', 'CANCELLED', 'EXPIRED'));

  -- Add time_window_end if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_requests' AND column_name = 'time_window_start') THEN
    ALTER TABLE trip_requests ADD COLUMN time_window_start timestamptz;
    UPDATE trip_requests SET time_window_start = departure_time;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_requests' AND column_name = 'time_window_end') THEN
    ALTER TABLE trip_requests ADD COLUMN time_window_end timestamptz;
    UPDATE trip_requests SET time_window_end = departure_time + interval '2 hours';
  END IF;

  -- Update default status to OPEN
  ALTER TABLE trip_requests ALTER COLUMN status SET DEFAULT 'OPEN';
  UPDATE trip_requests SET status = 'OPEN' WHERE status = 'pending';
END $$;

-- Add seats_taken to rides table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rides' AND column_name = 'seats_taken') THEN
    ALTER TABLE rides ADD COLUMN seats_taken integer DEFAULT 0 CHECK (seats_taken >= 0);
    
    -- Calculate seats_taken from existing bookings
    UPDATE rides r
    SET seats_taken = COALESCE((
      SELECT SUM(seats_requested)
      FROM ride_bookings rb
      WHERE rb.ride_id = r.id AND rb.status = 'confirmed'
    ), 0);
  END IF;
END $$;

-- Create new ride_requests table (for requesting driver-posted rides)
CREATE TABLE IF NOT EXISTS ride_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  rider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seats_requested integer NOT NULL DEFAULT 1 CHECK (seats_requested > 0 AND seats_requested <= 8),
  status text NOT NULL DEFAULT 'PENDING_DRIVER' CHECK (status IN (
    'PENDING_DRIVER',
    'DECLINED_BY_DRIVER', 
    'ACCEPTED_BY_DRIVER',
    'CONFIRMED',
    'CANCELLED_BY_RIDER',
    'EXPIRED'
  )),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(ride_id, rider_id)
);

-- Create indexes for ride_requests
CREATE INDEX IF NOT EXISTS idx_ride_requests_ride_id ON ride_requests(ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_rider_id ON ride_requests(rider_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_status ON ride_requests(status);
CREATE INDEX IF NOT EXISTS idx_ride_requests_expires_at ON ride_requests(expires_at) WHERE expires_at IS NOT NULL;

-- Create trip_offers table (drivers offering on trip requests)
CREATE TABLE IF NOT EXISTS trip_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_request_id uuid NOT NULL REFERENCES trip_requests(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ride_id uuid REFERENCES rides(id) ON DELETE SET NULL,
  price numeric(10,2),
  message text,
  status text NOT NULL DEFAULT 'OFFERED' CHECK (status IN (
    'OFFERED',
    'WITHDRAWN_BY_DRIVER',
    'DECLINED_BY_RIDER',
    'CONFIRMED',
    'EXPIRED'
  )),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(trip_request_id, driver_id)
);

-- Create indexes for trip_offers
CREATE INDEX IF NOT EXISTS idx_trip_offers_trip_request_id ON trip_offers(trip_request_id);
CREATE INDEX IF NOT EXISTS idx_trip_offers_driver_id ON trip_offers(driver_id);
CREATE INDEX IF NOT EXISTS idx_trip_offers_status ON trip_offers(status);

-- Enable RLS
ALTER TABLE ride_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_offers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ride_requests

-- Riders can view their own requests
CREATE POLICY "Riders can view own ride requests"
  ON ride_requests FOR SELECT
  TO authenticated
  USING (rider_id = auth.uid());

-- Drivers can view requests for their rides
CREATE POLICY "Drivers can view requests for their rides"
  ON ride_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rides
      WHERE rides.id = ride_requests.ride_id
      AND rides.driver_id = auth.uid()
    )
  );

-- Riders can create their own requests
CREATE POLICY "Riders can create ride requests"
  ON ride_requests FOR INSERT
  TO authenticated
  WITH CHECK (rider_id = auth.uid());

-- Riders can cancel their own requests
CREATE POLICY "Riders can cancel own requests"
  ON ride_requests FOR UPDATE
  TO authenticated
  USING (rider_id = auth.uid())
  WITH CHECK (
    rider_id = auth.uid() AND
    status IN ('CANCELLED_BY_RIDER')
  );

-- Drivers can update requests for their rides (accept/decline)
CREATE POLICY "Drivers can update requests for their rides"
  ON ride_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rides
      WHERE rides.id = ride_requests.ride_id
      AND rides.driver_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rides
      WHERE rides.id = ride_requests.ride_id
      AND rides.driver_id = auth.uid()
    )
  );

-- RLS Policies for trip_offers

-- Riders can view offers on their trip requests
CREATE POLICY "Riders can view offers on their trips"
  ON trip_offers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_requests
      WHERE trip_requests.id = trip_offers.trip_request_id
      AND trip_requests.rider_id = auth.uid()
    )
  );

-- Drivers can view their own offers
CREATE POLICY "Drivers can view own offers"
  ON trip_offers FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

-- Drivers can create offers
CREATE POLICY "Drivers can create offers"
  ON trip_offers FOR INSERT
  TO authenticated
  WITH CHECK (driver_id = auth.uid());

-- Drivers can update their own offers (withdraw)
CREATE POLICY "Drivers can update own offers"
  ON trip_offers FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (
    driver_id = auth.uid() AND
    status IN ('WITHDRAWN_BY_DRIVER', 'OFFERED')
  );

-- Riders can update offers on their trips (decline/confirm)
CREATE POLICY "Riders can update offers on their trips"
  ON trip_offers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_requests
      WHERE trip_requests.id = trip_offers.trip_request_id
      AND trip_requests.rider_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_requests
      WHERE trip_requests.id = trip_offers.trip_request_id
      AND trip_requests.rider_id = auth.uid()
    )
  );

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ride_requests_updated_at ON ride_requests;
CREATE TRIGGER update_ride_requests_updated_at
  BEFORE UPDATE ON ride_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trip_offers_updated_at ON trip_offers;
CREATE TRIGGER update_trip_offers_updated_at
  BEFORE UPDATE ON trip_offers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trip_requests_updated_at ON trip_requests;
CREATE TRIGGER update_trip_requests_updated_at
  BEFORE UPDATE ON trip_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
