/*
  # Fix Core Carpool Schema for Production (v2)

  1. Profile Enhancements
    - Add phone_e164 field (E.164 format) with graceful migration
    - Add privacy controls
    - Add location scope fields

  2. Rides Table Updates
    - Add OPEN/CLOSED status
    - Add city_area and location fields
    - Add price field

  3. Ride Requests Enhancements
    - Add pickup_point fields
    - Add overlap detection fields
    - Add contact unlock tracking

  4. Route Planning
    - Create ride_stops table

  5. Transaction Safety
    - Add atomic seat acceptance function

  6. Indexes and Performance
*/

-- 1. Profile Enhancements

-- Add phone_e164 field (will migrate existing phone data carefully)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone_e164'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_e164 TEXT;
    -- Try to copy valid E.164 phones, leave others as NULL
    UPDATE profiles 
    SET phone_e164 = phone 
    WHERE phone IS NOT NULL 
    AND phone ~ '^\+[1-9]\d{1,14}$'
    AND phone_e164 IS NULL;
  END IF;
END $$;

-- Add privacy settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'whatsapp_before_acceptance'
  ) THEN
    ALTER TABLE profiles ADD COLUMN whatsapp_before_acceptance BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'calls_allowed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN calls_allowed BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'home_city'
  ) THEN
    ALTER TABLE profiles ADD COLUMN home_city TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'current_browsing_city'
  ) THEN
    ALTER TABLE profiles ADD COLUMN current_browsing_city TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'location_mode'
  ) THEN
    ALTER TABLE profiles ADD COLUMN location_mode TEXT DEFAULT 'manual';
  END IF;
END $$;

-- Add constraint for location_mode
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_location_mode_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_location_mode_check 
  CHECK (location_mode IN ('gps', 'manual'));

-- 2. Rides Table Updates

-- Add new fields to rides
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rides' AND column_name = 'city_area'
  ) THEN
    ALTER TABLE rides ADD COLUMN city_area TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rides' AND column_name = 'start_point'
  ) THEN
    ALTER TABLE rides ADD COLUMN start_point TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rides' AND column_name = 'closed_at'
  ) THEN
    ALTER TABLE rides ADD COLUMN closed_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rides' AND column_name = 'price_per_seat'
  ) THEN
    ALTER TABLE rides ADD COLUMN price_per_seat NUMERIC(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rides' AND column_name = 'pickup_radius_km'
  ) THEN
    ALTER TABLE rides ADD COLUMN pickup_radius_km NUMERIC(5,2) DEFAULT 5.0;
  END IF;
END $$;

-- 3. Ride Requests Enhancements

-- Add pickup point and overlap tracking fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ride_requests' AND column_name = 'pickup_location'
  ) THEN
    ALTER TABLE ride_requests ADD COLUMN pickup_location TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ride_requests' AND column_name = 'pickup_lat'
  ) THEN
    ALTER TABLE ride_requests ADD COLUMN pickup_lat NUMERIC(10,8);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ride_requests' AND column_name = 'pickup_lng'
  ) THEN
    ALTER TABLE ride_requests ADD COLUMN pickup_lng NUMERIC(11,8);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ride_requests' AND column_name = 'responded_at'
  ) THEN
    ALTER TABLE ride_requests ADD COLUMN responded_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ride_requests' AND column_name = 'overlap_window_start'
  ) THEN
    ALTER TABLE ride_requests ADD COLUMN overlap_window_start TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ride_requests' AND column_name = 'overlap_window_end'
  ) THEN
    ALTER TABLE ride_requests ADD COLUMN overlap_window_end TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ride_requests' AND column_name = 'contact_unlocked_at'
  ) THEN
    ALTER TABLE ride_requests ADD COLUMN contact_unlocked_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ride_requests' AND column_name = 'whatsapp_unlocked'
  ) THEN
    ALTER TABLE ride_requests ADD COLUMN whatsapp_unlocked BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Auto-set overlap windows based on ride departure time
UPDATE ride_requests rr
SET 
  overlap_window_start = r.departure_time - INTERVAL '2 hours',
  overlap_window_end = r.departure_time + INTERVAL '4 hours'
FROM rides r
WHERE rr.ride_id = r.id
AND rr.overlap_window_start IS NULL;

-- 4. Create ride_stops table for route planning
CREATE TABLE IF NOT EXISTS ride_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  stop_order INTEGER NOT NULL CHECK (stop_order >= 0),
  stop_type TEXT NOT NULL CHECK (stop_type IN ('driver_start', 'pickup', 'destination')),
  location TEXT NOT NULL,
  lat NUMERIC(10,8) NOT NULL,
  lng NUMERIC(11,8) NOT NULL,
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ride_id, stop_order)
);

ALTER TABLE ride_stops ENABLE ROW LEVEL SECURITY;

-- RLS for ride_stops
CREATE POLICY "Anyone can view ride stops for their rides"
  ON ride_stops FOR SELECT
  TO authenticated
  USING (
    ride_id IN (
      SELECT id FROM rides WHERE driver_id = auth.uid()
    )
    OR ride_id IN (
      SELECT ride_id FROM ride_requests 
      WHERE rider_id = auth.uid() AND status = 'ACCEPTED_BY_DRIVER'
    )
  );

CREATE POLICY "Drivers can manage their ride stops"
  ON ride_stops FOR ALL
  TO authenticated
  USING (
    ride_id IN (SELECT id FROM rides WHERE driver_id = auth.uid())
  )
  WITH CHECK (
    ride_id IN (SELECT id FROM rides WHERE driver_id = auth.uid())
  );

-- 5. Create function for atomic seat acceptance
CREATE OR REPLACE FUNCTION accept_ride_request(
  request_id UUID,
  accepting_driver_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_ride_id UUID;
  v_rider_id UUID;
  v_seats_requested INTEGER;
  v_available_seats INTEGER;
  v_ride_status TEXT;
  v_request_status TEXT;
  v_pickup_location TEXT;
  v_overlap_exists BOOLEAN;
  v_result JSONB;
BEGIN
  -- Get request details
  SELECT ride_id, rider_id, seats_requested, status, pickup_location
  INTO v_ride_id, v_rider_id, v_seats_requested, v_request_status, v_pickup_location
  FROM ride_requests
  WHERE id = request_id;

  -- Validate request exists
  IF v_ride_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Request not found'
    );
  END IF;

  -- Validate already not accepted
  IF v_request_status != 'PENDING_DRIVER' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Request already processed'
    );
  END IF;

  -- Validate pickup location provided
  IF v_pickup_location IS NULL OR v_pickup_location = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Pickup location required before acceptance'
    );
  END IF;

  -- Get ride details with lock
  SELECT available_seats, status
  INTO v_available_seats, v_ride_status
  FROM rides
  WHERE id = v_ride_id AND driver_id = accepting_driver_id
  FOR UPDATE;

  -- Validate ride ownership
  IF v_available_seats IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ride not found or not owned by driver'
    );
  END IF;

  -- Validate ride status (allow both 'active' and 'open')
  IF v_ride_status NOT IN ('open', 'active') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ride is not accepting requests'
    );
  END IF;

  -- Validate seats available
  IF v_available_seats < v_seats_requested THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not enough seats available'
    );
  END IF;

  -- Check for overlapping accepted bookings for rider
  SELECT EXISTS (
    SELECT 1 FROM ride_requests rr
    JOIN rides r ON r.id = rr.ride_id
    WHERE rr.rider_id = v_rider_id
    AND rr.status = 'ACCEPTED_BY_DRIVER'
    AND rr.id != request_id
    AND rr.overlap_window_start IS NOT NULL
    AND rr.overlap_window_end IS NOT NULL
    AND (
      SELECT overlap_window_start FROM ride_requests WHERE id = request_id
    ) IS NOT NULL
    AND (
      SELECT overlap_window_end FROM ride_requests WHERE id = request_id
    ) IS NOT NULL
    AND (
      (rr.overlap_window_start, rr.overlap_window_end) OVERLAPS (
        (SELECT overlap_window_start FROM ride_requests WHERE id = request_id),
        (SELECT overlap_window_end FROM ride_requests WHERE id = request_id)
      )
    )
  ) INTO v_overlap_exists;

  IF v_overlap_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Rider already has an accepted booking at this time'
    );
  END IF;

  -- All checks passed, accept the request
  UPDATE ride_requests
  SET 
    status = 'ACCEPTED_BY_DRIVER',
    responded_at = now(),
    contact_unlocked_at = now(),
    whatsapp_unlocked = true,
    updated_at = now()
  WHERE id = request_id;

  -- Decrement available seats
  UPDATE rides
  SET 
    available_seats = available_seats - v_seats_requested,
    updated_at = now()
  WHERE id = v_ride_id;

  -- Auto-close ride if full
  UPDATE rides
  SET status = 'closed', closed_at = now()
  WHERE id = v_ride_id AND available_seats <= 0;

  RETURN jsonb_build_object(
    'success', true,
    'ride_id', v_ride_id,
    'rider_id', v_rider_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rides_city_area ON rides(city_area) WHERE status IN ('open', 'active');
CREATE INDEX IF NOT EXISTS idx_rides_departure_time ON rides(departure_time) WHERE status IN ('open', 'active');
CREATE INDEX IF NOT EXISTS idx_rides_driver_status ON rides(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_ride_requests_rider_status ON ride_requests(rider_id, status);
CREATE INDEX IF NOT EXISTS idx_ride_requests_ride_status ON ride_requests(ride_id, status);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_e164 ON profiles(phone_e164) WHERE phone_e164 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_blocked ON blocks(blocker_id, blocked_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created ON chat_messages(conversation_id, created_at DESC);

-- 7. Add unique constraint for active ride requests (prevent duplicates)
DROP INDEX IF EXISTS idx_unique_active_ride_request;
CREATE UNIQUE INDEX idx_unique_active_ride_request 
  ON ride_requests(ride_id, rider_id) 
  WHERE status IN ('PENDING_DRIVER', 'ACCEPTED_BY_DRIVER');
