-- Location & Ride Types Enhancement
-- Makes city required for community matching and adds ride types

-- =====================================================
-- 1. ADD RIDE TYPE TO RIDES TABLE
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rides' AND column_name = 'ride_type'
  ) THEN
    ALTER TABLE rides ADD COLUMN ride_type TEXT DEFAULT 'one_time' 
      CHECK (ride_type IN ('daily_commute', 'one_time', 'airport_transfer', 'moving_help', 'long_distance', 'flexible'));
  END IF;

  -- Add flexible availability dates
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rides' AND column_name = 'available_until'
  ) THEN
    ALTER TABLE rides ADD COLUMN available_until TIMESTAMPTZ;
  END IF;

  -- Add radius for flexible matching
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rides' AND column_name = 'pickup_radius_km'
  ) THEN
    ALTER TABLE rides ADD COLUMN pickup_radius_km INTEGER DEFAULT 10;
  END IF;
END $$;

-- =====================================================
-- 2. ENHANCE PROFILES FOR LOCATION MATCHING
-- =====================================================
DO $$
BEGIN
  -- Work location fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'work_city'
  ) THEN
    ALTER TABLE profiles ADD COLUMN work_city TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'work_location_lat'
  ) THEN
    ALTER TABLE profiles ADD COLUMN work_location_lat DOUBLE PRECISION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'work_location_lng'
  ) THEN
    ALTER TABLE profiles ADD COLUMN work_location_lng DOUBLE PRECISION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'work_address'
  ) THEN
    ALTER TABLE profiles ADD COLUMN work_address TEXT;
  END IF;

  -- Home location coordinates
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'home_location_lat'
  ) THEN
    ALTER TABLE profiles ADD COLUMN home_location_lat DOUBLE PRECISION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'home_location_lng'
  ) THEN
    ALTER TABLE profiles ADD COLUMN home_location_lng DOUBLE PRECISION;
  END IF;

  -- Service radius for matching
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'service_radius_km'
  ) THEN
    ALTER TABLE profiles ADD COLUMN service_radius_km INTEGER DEFAULT 50;
  END IF;

  -- Preferred ride types (JSON array)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'preferred_ride_types'
  ) THEN
    ALTER TABLE profiles ADD COLUMN preferred_ride_types TEXT[] DEFAULT ARRAY['daily_commute', 'one_time']::TEXT[];
  END IF;
END $$;

-- Create indexes for location-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_home_city ON profiles(home_city);
CREATE INDEX IF NOT EXISTS idx_profiles_work_city ON profiles(work_city);
CREATE INDEX IF NOT EXISTS idx_rides_ride_type ON rides(ride_type);
CREATE INDEX IF NOT EXISTS idx_rides_available_until ON rides(available_until) WHERE available_until IS NOT NULL;

-- =====================================================
-- 3. ADD RIDE TYPE TO RECURRING PATTERNS (if table exists)
-- =====================================================
DO $$
BEGIN
  -- Only add column if the table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'recurring_ride_patterns'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'recurring_ride_patterns' AND column_name = 'ride_type'
    ) THEN
      ALTER TABLE recurring_ride_patterns ADD COLUMN ride_type TEXT DEFAULT 'daily_commute'
        CHECK (ride_type IN ('daily_commute', 'one_time', 'airport_transfer', 'moving_help', 'long_distance', 'flexible'));
    END IF;
  END IF;
END $$;

-- =====================================================
-- 4. FUNCTION TO SEARCH RIDES BY LOCATION AND TYPE
-- =====================================================
CREATE OR REPLACE FUNCTION search_rides_enhanced(
  p_origin_lat DOUBLE PRECISION,
  p_origin_lng DOUBLE PRECISION,
  p_dest_lat DOUBLE PRECISION DEFAULT NULL,
  p_dest_lng DOUBLE PRECISION DEFAULT NULL,
  p_ride_types TEXT[] DEFAULT NULL,
  p_radius_km INTEGER DEFAULT 50,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_include_recurring BOOLEAN DEFAULT true,
  p_include_flexible BOOLEAN DEFAULT true,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  driver_id UUID,
  origin TEXT,
  destination TEXT,
  departure_time TIMESTAMPTZ,
  available_seats INTEGER,
  ride_type TEXT,
  is_recurring BOOLEAN,
  distance_from_origin_km DOUBLE PRECISION,
  driver_name TEXT,
  driver_avatar TEXT,
  driver_rating DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.driver_id,
    r.origin,
    r.destination,
    r.departure_time,
    r.available_seats,
    COALESCE(r.ride_type, 'one_time') as ride_type,
    COALESCE(r.is_recurring, false) as is_recurring,
    -- Haversine distance calculation
    (6371 * acos(
      cos(radians(p_origin_lat)) * cos(radians(r.origin_lat)) *
      cos(radians(r.origin_lng) - radians(p_origin_lng)) +
      sin(radians(p_origin_lat)) * sin(radians(r.origin_lat))
    )) as distance_from_origin_km,
    p.full_name as driver_name,
    p.avatar_url as driver_avatar,
    (SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews WHERE reviewee_id = r.driver_id) as driver_rating
  FROM rides r
  JOIN profiles p ON r.driver_id = p.id
  WHERE r.status IN ('active', 'pending')
    AND r.available_seats > 0
    -- Location filter
    AND (6371 * acos(
      cos(radians(p_origin_lat)) * cos(radians(r.origin_lat)) *
      cos(radians(r.origin_lng) - radians(p_origin_lng)) +
      sin(radians(p_origin_lat)) * sin(radians(r.origin_lat))
    )) <= p_radius_km
    -- Ride type filter
    AND (p_ride_types IS NULL OR COALESCE(r.ride_type, 'one_time') = ANY(p_ride_types))
    -- Date filter
    AND (p_date_from IS NULL OR r.departure_time >= p_date_from)
    AND (p_date_to IS NULL OR r.departure_time <= p_date_to)
    -- Include recurring based on flag
    AND (p_include_recurring = true OR COALESCE(r.is_recurring, false) = false)
    -- Include flexible rides if within availability window
    AND (
      r.ride_type != 'flexible' 
      OR p_include_flexible = false 
      OR r.available_until IS NULL 
      OR r.available_until >= NOW()
    )
  ORDER BY r.departure_time ASC, distance_from_origin_km ASC
  LIMIT p_limit;
END;
$$;

-- =====================================================
-- 5. FUNCTION TO GET USERS IN SAME AREA
-- =====================================================
CREATE OR REPLACE FUNCTION get_nearby_users(
  p_city TEXT,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  avatar_url TEXT,
  city TEXT,
  is_driver BOOLEAN,
  rating DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.avatar_url,
    COALESCE(p.city, p.home_city) as city,
    EXISTS(SELECT 1 FROM vehicles v WHERE v.user_id = p.id AND v.is_active = true) as is_driver,
    (SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews WHERE reviewee_id = p.id) as rating
  FROM profiles p
  WHERE (
    LOWER(p.city) = LOWER(p_city)
    OR LOWER(p.home_city) = LOWER(p_city)
    OR LOWER(p.work_city) = LOWER(p_city)
  )
  AND p.id != auth.uid()
  ORDER BY p.last_active_at DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION search_rides_enhanced(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TEXT[], INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, BOOLEAN, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_nearby_users(TEXT, INTEGER) TO authenticated;

-- =====================================================
-- 7. UPDATE EXISTING RIDES TO HAVE DEFAULT TYPE
-- =====================================================
UPDATE rides 
SET ride_type = CASE 
  WHEN is_recurring = true THEN 'daily_commute'
  ELSE 'one_time'
END
WHERE ride_type IS NULL;

-- =====================================================
-- 8. COMMENT ON COLUMNS
-- =====================================================
COMMENT ON COLUMN rides.ride_type IS 'Type of ride: daily_commute, one_time, airport_transfer, moving_help, long_distance, flexible';
COMMENT ON COLUMN rides.available_until IS 'For flexible rides, when the offer expires (null = indefinite)';
COMMENT ON COLUMN rides.pickup_radius_km IS 'How far driver is willing to deviate for pickup';
COMMENT ON COLUMN profiles.service_radius_km IS 'Maximum radius user is willing to travel for rides';
COMMENT ON COLUMN profiles.preferred_ride_types IS 'Array of ride types user is interested in';
