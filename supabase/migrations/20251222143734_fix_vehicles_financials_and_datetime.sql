/*
  # Fix Vehicles RLS, Remove Financial Features, Add DateTime Time Type Support

  1. Fix Vehicle RLS Policies
    - Add missing INSERT policy for authenticated users
    - Add missing UPDATE policy for vehicle owners
    - Add missing DELETE policy for vehicle owners

  2. Add Time Type Support
    - Add time_type column to rides table ('depart' | 'arrive')
    - Add time_type column to trip_requests table ('depart' | 'arrive')
    - Create indexes for performance

  3. Remove All Financial Features
    - Drop payment_splits table
    - Drop payments table
    - Drop ride_costs table
    - Drop payout_requests table
    - Drop refund_requests table
    - Drop related functions and triggers
    - Remove price_per_seat column from rides

  4. Security
    - Maintain all existing security policies
    - Ensure vehicle operations work correctly
*/

-- ============================================================================
-- PART 1: FIX VEHICLES RLS POLICIES
-- ============================================================================

-- Drop existing restrictive policies that prevent INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Users can only view their own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can only view own or ride-associated vehicles" ON vehicles;

-- Create comprehensive CRUD policies for vehicles
CREATE POLICY "Users can view their own vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view vehicles associated with rides"
  ON vehicles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rides r
      WHERE r.vehicle_id = vehicles.id
      AND r.status IN ('active', 'completed')
    )
  );

CREATE POLICY "Users can insert their own vehicles"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own vehicles"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own vehicles"
  ON vehicles FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- PART 2: ADD TIME TYPE SUPPORT
-- ============================================================================

-- Add time_type to rides table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rides' AND column_name = 'time_type'
  ) THEN
    ALTER TABLE rides ADD COLUMN time_type text DEFAULT 'depart' CHECK (time_type IN ('depart', 'arrive'));
    COMMENT ON COLUMN rides.time_type IS 'Whether departure_time represents when driver departs or when they want to arrive';
  END IF;
END $$;

-- Add time_type to trip_requests table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_requests' AND column_name = 'time_type'
  ) THEN
    ALTER TABLE trip_requests ADD COLUMN time_type text DEFAULT 'depart' CHECK (time_type IN ('depart', 'arrive'));
    COMMENT ON COLUMN trip_requests.time_type IS 'Whether departure_time represents when requester wants to depart or arrive';
  END IF;
END $$;

-- Create indexes for time_type queries
CREATE INDEX IF NOT EXISTS idx_rides_time_type ON rides(time_type);
CREATE INDEX IF NOT EXISTS idx_trip_requests_time_type ON trip_requests(time_type);
CREATE INDEX IF NOT EXISTS idx_rides_time_type_departure ON rides(time_type, departure_time);
CREATE INDEX IF NOT EXISTS idx_trip_requests_time_type_departure ON trip_requests(time_type, departure_time);

-- ============================================================================
-- PART 3: REMOVE ALL FINANCIAL FEATURES
-- ============================================================================

-- Drop payment-related tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS payment_splits CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS ride_costs CASCADE;
DROP TABLE IF EXISTS payout_requests CASCADE;
DROP TABLE IF EXISTS refund_requests CASCADE;

-- Drop payment-related functions
DROP FUNCTION IF EXISTS calculate_payment_split CASCADE;
DROP FUNCTION IF EXISTS auto_calculate_payment_splits CASCADE;
DROP FUNCTION IF EXISTS process_ride_payment CASCADE;
DROP FUNCTION IF EXISTS calculate_ride_cost CASCADE;
DROP FUNCTION IF EXISTS split_payment_among_passengers CASCADE;

-- Remove price_per_seat column from rides
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rides' AND column_name = 'price_per_seat'
  ) THEN
    ALTER TABLE rides DROP COLUMN price_per_seat;
  END IF;
END $$;

-- ============================================================================
-- PART 4: INDEXES AND PERFORMANCE
-- ============================================================================

-- Ensure all critical indexes exist
CREATE INDEX IF NOT EXISTS idx_vehicles_user_active ON vehicles(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_rides_departure_time_status ON rides(departure_time, status);
CREATE INDEX IF NOT EXISTS idx_trip_requests_departure_status ON trip_requests(departure_time, status);
