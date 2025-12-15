/*
================================================================================
  CARPOOL NETWORK - COMPLETE DATABASE MIGRATIONS
================================================================================

  This file contains ALL migrations in chronological order.

  HOW TO USE:
  1. Open Supabase Dashboard > SQL Editor
  2. Copy and paste this entire file
  3. Run the query

  Alternatively, run migrations one at a time from supabase/migrations/ folder.

  MIGRATIONS INCLUDED (22 total):
  - 20251018185942_create_core_schema.sql
  - 20251018205840_add_vehicle_details.sql
  - 20251020143600_add_vehicle_image_and_engine_fields.sql
  - 20251020144500_add_mot_tax_fields.sql
  - 20251020171021_create_vehicle_images_bucket.sql
  - 20251115164524_fix_security_performance_issues_v2.sql
  - 20251115180139_add_license_verification_system.sql
  - 20251115180215_add_payment_system.sql
  - 20251115180448_remove_insurance_and_payment_systems.sql
  - 20251115212318_fix_vehicle_visibility_for_rides.sql
  - 20251115214336_add_cancellation_tracking_system.sql
  - 20251116192922_fix_vehicles_rls_for_bookings.sql
  - 20251116192939_fix_rides_rls_for_bookings.sql
  - 20251116193833_fix_infinite_recursion_in_rls_policies.sql
  - 20251116215639_add_whatsapp_to_profiles.sql
  - 20251116221024_create_ai_chat_history_table.sql
  - 20251117012004_add_auto_profile_creation_trigger.sql
  - 20251214193708_add_atomic_booking_rpc.sql
  - 20251214200429_fix_booking_status_and_unique_constraint.sql
  - 20251214200908_add_atomic_booking_operations.sql
  - 20251214202053_enable_realtime_and_notification_triggers.sql
  - 20251214233123_add_beta_allowlist_table.sql

================================================================================
*/


-- ============================================================================
-- MIGRATION: 20251018185942_create_core_schema.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  avatar_url text,
  phone text,
  bio text,
  date_of_birth date,
  gender text CHECK (gender IN ('male', 'female', 'non-binary', 'prefer-not-to-say', NULL)),
  is_verified boolean DEFAULT false,
  verification_badge text CHECK (verification_badge IN ('email', 'phone', 'id', 'background-check', NULL)),
  total_rides_offered integer DEFAULT 0,
  total_rides_taken integer DEFAULT 0,
  average_rating numeric(3,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  music_preference text CHECK (music_preference IN ('none', 'quiet', 'moderate', 'loud', NULL)),
  temperature_preference text CHECK (temperature_preference IN ('cold', 'cool', 'moderate', 'warm', NULL)),
  conversation_level text CHECK (conversation_level IN ('quiet', 'moderate', 'chatty', NULL)),
  smoking_policy text CHECK (smoking_policy IN ('no-smoking', 'outside-only', 'allowed', NULL)) DEFAULT 'no-smoking',
  pets_allowed boolean DEFAULT false,
  max_detour_minutes integer DEFAULT 10,
  gender_preference text CHECK (gender_preference IN ('any', 'same', 'male', 'female', NULL)) DEFAULT 'any',
  auto_accept_rides boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  relationship text NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  color text NOT NULL,
  license_plate text NOT NULL,
  capacity integer NOT NULL CHECK (capacity > 0 AND capacity <= 8),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  origin text NOT NULL,
  origin_lat numeric(10,8) NOT NULL,
  origin_lng numeric(11,8) NOT NULL,
  destination text NOT NULL,
  destination_lat numeric(10,8) NOT NULL,
  destination_lng numeric(11,8) NOT NULL,
  departure_time timestamptz NOT NULL,
  available_seats integer NOT NULL,
  total_seats integer NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'in-progress', 'completed', 'cancelled')) DEFAULT 'active',
  is_recurring boolean DEFAULT false,
  recurrence_pattern jsonb,
  notes text,
  route_polyline text,
  estimated_duration integer,
  estimated_distance numeric(10,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ride_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  passenger_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pickup_location text NOT NULL,
  pickup_lat numeric(10,8) NOT NULL,
  pickup_lng numeric(11,8) NOT NULL,
  dropoff_location text NOT NULL,
  dropoff_lat numeric(10,8) NOT NULL,
  dropoff_lng numeric(11,8) NOT NULL,
  seats_requested integer NOT NULL DEFAULT 1,
  status text NOT NULL CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')) DEFAULT 'pending',
  pickup_order integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(ride_id, passenger_id)
);

CREATE TABLE IF NOT EXISTS ride_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  position integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(ride_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ride_id uuid REFERENCES rides(id) ON DELETE SET NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  review_type text NOT NULL CHECK (review_type IN ('driver', 'passenger')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(ride_id, reviewer_id, reviewee_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('ride-match', 'booking-request', 'booking-confirmed', 'booking-cancelled', 'message', 'review', 'safety-alert', 'system')),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS safety_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ride_id uuid REFERENCES rides(id) ON DELETE SET NULL,
  incident_type text NOT NULL CHECK (incident_type IN ('harassment', 'unsafe-driving', 'inappropriate-behavior', 'other')),
  description text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  status text NOT NULL CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS saved_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text NOT NULL,
  latitude numeric(10,8) NOT NULL,
  longitude numeric(11,8) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_is_active ON vehicles(is_active);
CREATE INDEX IF NOT EXISTS idx_rides_driver_id ON rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
CREATE INDEX IF NOT EXISTS idx_rides_departure_time ON rides(departure_time);
CREATE INDEX IF NOT EXISTS idx_rides_location ON rides(origin_lat, origin_lng, destination_lat, destination_lng);
CREATE INDEX IF NOT EXISTS idx_ride_bookings_ride_id ON ride_bookings(ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_bookings_passenger_id ON ride_bookings(passenger_id);
CREATE INDEX IF NOT EXISTS idx_ride_bookings_status ON ride_bookings(status);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_ride_id ON messages(ride_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_safety_reports_reported_user_id ON safety_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_saved_locations_user_id ON saved_locations(user_id);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own emergency contacts"
  ON emergency_contacts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vehicles"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vehicles"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own vehicles"
  ON vehicles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view active rides"
  ON rides FOR SELECT
  TO authenticated
  USING (status = 'active' OR driver_id = auth.uid());

CREATE POLICY "Users can insert own rides"
  ON rides FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can update own rides"
  ON rides FOR UPDATE
  TO authenticated
  USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can delete own rides"
  ON rides FOR DELETE
  TO authenticated
  USING (auth.uid() = driver_id);

CREATE POLICY "Users can view own bookings or bookings for their rides"
  ON ride_bookings FOR SELECT
  TO authenticated
  USING (
    auth.uid() = passenger_id OR
    EXISTS (SELECT 1 FROM rides WHERE rides.id = ride_bookings.ride_id AND rides.driver_id = auth.uid())
  );

CREATE POLICY "Users can insert own bookings"
  ON ride_bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = passenger_id);

CREATE POLICY "Users can update own bookings or driver can update bookings for their rides"
  ON ride_bookings FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = passenger_id OR
    EXISTS (SELECT 1 FROM rides WHERE rides.id = ride_bookings.ride_id AND rides.driver_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = passenger_id OR
    EXISTS (SELECT 1 FROM rides WHERE rides.id = ride_bookings.ride_id AND rides.driver_id = auth.uid())
  );

CREATE POLICY "Users can view waitlists for rides they're involved in"
  ON ride_waitlist FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM rides WHERE rides.id = ride_waitlist.ride_id AND rides.driver_id = auth.uid())
  );

CREATE POLICY "Users can insert themselves to waitlist"
  ON ride_waitlist FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove themselves from waitlist"
  ON ride_waitlist FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their messages"
  ON messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update message read status"
  ON messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create reviews for rides they participated in"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id AND
    (
      EXISTS (SELECT 1 FROM rides WHERE rides.id = reviews.ride_id AND rides.driver_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM ride_bookings WHERE ride_bookings.ride_id = reviews.ride_id AND ride_bookings.passenger_id = auth.uid())
    )
  );

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view own reports"
  ON safety_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY "Users can create safety reports"
  ON safety_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can manage own saved locations"
  ON saved_locations FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rides_updated_at BEFORE UPDATE ON rides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ride_bookings_updated_at BEFORE UPDATE ON ride_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- MIGRATION: 20251018205840_add_vehicle_details.sql
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'fuel_type'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN fuel_type text CHECK (fuel_type IN ('petrol', 'diesel', 'electric', 'hybrid', 'cng', 'lpg'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'registration_year'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN registration_year integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'vehicle_type'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN vehicle_type text CHECK (vehicle_type IN ('sedan', 'suv', 'hatchback', 'mpv', 'van', 'other'));
  END IF;
END $$;


-- ============================================================================
-- MIGRATION: 20251020143600_add_vehicle_image_and_engine_fields.sql
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'engine_capacity'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN engine_capacity integer;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN image_url text;
  END IF;
END $$;


-- ============================================================================
-- MIGRATION: 20251020144500_add_mot_tax_fields.sql
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'mot_status'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN mot_status text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'mot_expiry_date'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN mot_expiry_date date;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'tax_status'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN tax_status text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'tax_due_date'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN tax_due_date date;
  END IF;
END $$;


-- ============================================================================
-- MIGRATION: 20251020171021_create_vehicle_images_bucket.sql
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicle-images',
  'vehicle-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload vehicle images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vehicle-images' AND
  (storage.foldername(name))[1] = 'vehicles'
);

CREATE POLICY "Users can update vehicle images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'vehicle-images')
WITH CHECK (bucket_id = 'vehicle-images');

CREATE POLICY "Users can delete vehicle images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vehicle-images');

CREATE POLICY "Public can view vehicle images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'vehicle-images');


-- ============================================================================
-- MIGRATION: 20251115164524_fix_security_performance_issues_v2.sql
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user_id
ON emergency_contacts(user_id);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id
ON reviews(reviewer_id);

CREATE INDEX IF NOT EXISTS idx_ride_waitlist_user_id_fk
ON ride_waitlist(user_id);

CREATE INDEX IF NOT EXISTS idx_rides_vehicle_id
ON rides(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_safety_reports_reporter_id
ON safety_reports(reporter_id);

CREATE INDEX IF NOT EXISTS idx_safety_reports_ride_id_fk
ON safety_reports(ride_id);

DROP INDEX IF EXISTS idx_profiles_email;
DROP INDEX IF EXISTS idx_vehicles_is_active;
DROP INDEX IF EXISTS idx_rides_location;
DROP INDEX IF EXISTS idx_ride_bookings_ride_id;
DROP INDEX IF EXISTS idx_ride_bookings_status;
DROP INDEX IF EXISTS idx_messages_ride_id;
DROP INDEX IF EXISTS idx_messages_created_at;
DROP INDEX IF EXISTS idx_reviews_reviewee_id;
DROP INDEX IF EXISTS idx_notifications_user_id;
DROP INDEX IF EXISTS idx_notifications_is_read;
DROP INDEX IF EXISTS idx_safety_reports_reported_user_id;
DROP INDEX IF EXISTS idx_saved_locations_user_id;

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;

CREATE POLICY "Users can view own preferences"
ON user_preferences FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own preferences"
ON user_preferences FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own preferences"
ON user_preferences FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can manage own emergency contacts" ON emergency_contacts;

CREATE POLICY "Users can manage own emergency contacts"
ON emergency_contacts
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can insert own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can update own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can delete own vehicles" ON vehicles;

CREATE POLICY "Users can view own vehicles"
ON vehicles FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own vehicles"
ON vehicles FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own vehicles"
ON vehicles FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own vehicles"
ON vehicles FOR DELETE
TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own reports" ON safety_reports;
DROP POLICY IF EXISTS "Users can create safety reports" ON safety_reports;

CREATE POLICY "Users can view own reports"
ON safety_reports FOR SELECT
TO authenticated
USING (reporter_id = (SELECT auth.uid()));

CREATE POLICY "Users can create safety reports"
ON safety_reports FOR INSERT
TO authenticated
WITH CHECK (reporter_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Anyone can view active rides" ON rides;
DROP POLICY IF EXISTS "Users can insert own rides" ON rides;
DROP POLICY IF EXISTS "Drivers can update own rides" ON rides;
DROP POLICY IF EXISTS "Drivers can delete own rides" ON rides;

CREATE POLICY "Anyone can view active rides"
ON rides FOR SELECT
TO authenticated
USING (status = 'active');

CREATE POLICY "Users can insert own rides"
ON rides FOR INSERT
TO authenticated
WITH CHECK (driver_id = (SELECT auth.uid()));

CREATE POLICY "Drivers can update own rides"
ON rides FOR UPDATE
TO authenticated
USING (driver_id = (SELECT auth.uid()))
WITH CHECK (driver_id = (SELECT auth.uid()));

CREATE POLICY "Drivers can delete own rides"
ON rides FOR DELETE
TO authenticated
USING (driver_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own bookings or bookings for their rides" ON ride_bookings;
DROP POLICY IF EXISTS "Users can insert own bookings" ON ride_bookings;
DROP POLICY IF EXISTS "Users can update own bookings or driver can update bookings for" ON ride_bookings;

CREATE POLICY "Users can view own bookings or bookings for their rides"
ON ride_bookings FOR SELECT
TO authenticated
USING (
  passenger_id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM rides
    WHERE rides.id = ride_bookings.ride_id
    AND rides.driver_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can insert own bookings"
ON ride_bookings FOR INSERT
TO authenticated
WITH CHECK (passenger_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own bookings or driver can update bookings for"
ON ride_bookings FOR UPDATE
TO authenticated
USING (
  passenger_id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM rides
    WHERE rides.id = ride_bookings.ride_id
    AND rides.driver_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  passenger_id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM rides
    WHERE rides.id = ride_bookings.ride_id
    AND rides.driver_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;

CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view waitlists for rides they're involved in" ON ride_waitlist;
DROP POLICY IF EXISTS "Users can insert themselves to waitlist" ON ride_waitlist;
DROP POLICY IF EXISTS "Users can remove themselves from waitlist" ON ride_waitlist;

CREATE POLICY "Users can view waitlists for rides they're involved in"
ON ride_waitlist FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM rides
    WHERE rides.id = ride_waitlist.ride_id
    AND rides.driver_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can insert themselves to waitlist"
ON ride_waitlist FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can remove themselves from waitlist"
ON ride_waitlist FOR DELETE
TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Recipients can update message read status" ON messages;

CREATE POLICY "Users can view their messages"
ON messages FOR SELECT
TO authenticated
USING (
  sender_id = (SELECT auth.uid()) OR
  recipient_id = (SELECT auth.uid())
);

CREATE POLICY "Users can send messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (sender_id = (SELECT auth.uid()));

CREATE POLICY "Recipients can update message read status"
ON messages FOR UPDATE
TO authenticated
USING (recipient_id = (SELECT auth.uid()))
WITH CHECK (recipient_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create reviews for rides they participated in" ON reviews;

CREATE POLICY "Users can create reviews for rides they participated in"
ON reviews FOR INSERT
TO authenticated
WITH CHECK (
  reviewer_id = (SELECT auth.uid()) AND
  EXISTS (
    SELECT 1 FROM ride_bookings
    WHERE ride_bookings.ride_id = reviews.ride_id
    AND ride_bookings.passenger_id = (SELECT auth.uid())
    AND ride_bookings.status = 'completed'
  )
);

DROP POLICY IF EXISTS "Users can manage own saved locations" ON saved_locations;

CREATE POLICY "Users can manage own saved locations"
ON saved_locations
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    ALTER FUNCTION update_updated_at_column() SET search_path = '';
  END IF;
END $$;


-- ============================================================================
-- MIGRATION: 20251115180139_add_license_verification_system.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS driver_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  license_type text NOT NULL CHECK (license_type IN ('uk_full', 'uk_provisional', 'international')),
  license_number text NOT NULL,
  country_of_issue text NOT NULL,
  issue_date date NOT NULL,
  expiry_date date NOT NULL,
  verified boolean DEFAULT false,
  verified_at timestamptz,
  verification_method text CHECK (verification_method IN ('manual', 'dvla_api', 'document_upload', NULL)),
  is_banned boolean DEFAULT false,
  ban_check_date timestamptz,
  points integer DEFAULT 0 CHECK (points >= 0 AND points <= 12),
  categories text[] DEFAULT '{}',
  restrictions text,
  international_arrival_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS vehicle_insurance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  policy_number text NOT NULL,
  provider text NOT NULL,
  coverage_type text NOT NULL CHECK (coverage_type IN ('third_party', 'third_party_fire_theft', 'comprehensive')),
  start_date date NOT NULL,
  expiry_date date NOT NULL,
  verified boolean DEFAULT false,
  verified_at timestamptz,
  covers_ridesharing boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(vehicle_id)
);

CREATE TABLE IF NOT EXISTS license_verification_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES driver_licenses(id) ON DELETE CASCADE,
  attempt_type text NOT NULL CHECK (attempt_type IN ('initial', 'renewal', 'ban_check', 'manual_review')),
  status text NOT NULL CHECK (status IN ('success', 'failed', 'pending')) DEFAULT 'pending',
  error_message text,
  verified_data jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_licenses_user_id ON driver_licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_licenses_verified ON driver_licenses(verified);
CREATE INDEX IF NOT EXISTS idx_driver_licenses_expiry ON driver_licenses(expiry_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_insurance_vehicle_id ON vehicle_insurance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_insurance_expiry ON vehicle_insurance(expiry_date);
CREATE INDEX IF NOT EXISTS idx_license_verification_attempts_license_id ON license_verification_attempts(license_id);

ALTER TABLE driver_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_verification_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own license"
  ON driver_licenses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own license"
  ON driver_licenses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own license"
  ON driver_licenses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view insurance for own vehicles"
  ON vehicle_insurance FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = vehicle_insurance.vehicle_id AND vehicles.user_id = auth.uid())
  );

CREATE POLICY "Users can insert insurance for own vehicles"
  ON vehicle_insurance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = vehicle_insurance.vehicle_id AND vehicles.user_id = auth.uid())
  );

CREATE POLICY "Users can update insurance for own vehicles"
  ON vehicle_insurance FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = vehicle_insurance.vehicle_id AND vehicles.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = vehicle_insurance.vehicle_id AND vehicles.user_id = auth.uid())
  );

CREATE POLICY "Users can view own verification attempts"
  ON license_verification_attempts FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM driver_licenses WHERE driver_licenses.id = license_verification_attempts.license_id AND driver_licenses.user_id = auth.uid())
  );

CREATE TRIGGER update_driver_licenses_updated_at BEFORE UPDATE ON driver_licenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicle_insurance_updated_at BEFORE UPDATE ON vehicle_insurance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION is_international_license_valid(license_id uuid)
RETURNS boolean AS $$
DECLARE
  license_record RECORD;
BEGIN
  SELECT * INTO license_record FROM driver_licenses WHERE id = license_id;

  IF license_record.license_type != 'international' THEN
    RETURN true;
  END IF;

  IF license_record.international_arrival_date IS NULL THEN
    RETURN false;
  END IF;

  RETURN (CURRENT_DATE - license_record.international_arrival_date) <= 365;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION can_user_drive(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  license_record RECORD;
BEGIN
  SELECT * INTO license_record FROM driver_licenses WHERE user_id = p_user_id;

  IF license_record IS NULL THEN
    RETURN false;
  END IF;

  IF license_record.verified = false THEN
    RETURN false;
  END IF;

  IF license_record.is_banned = true THEN
    RETURN false;
  END IF;

  IF license_record.expiry_date < CURRENT_DATE THEN
    RETURN false;
  END IF;

  IF license_record.license_type = 'uk_provisional' THEN
    RETURN false;
  END IF;

  IF license_record.license_type = 'international' THEN
    IF NOT is_international_license_valid(license_record.id) THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- MIGRATION: 20251115180215_add_payment_system.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS ride_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  total_cost numeric(10,2) NOT NULL CHECK (total_cost >= 0),
  currency text NOT NULL DEFAULT 'GBP',
  cost_per_km numeric(10,2),
  fuel_cost numeric(10,2),
  toll_cost numeric(10,2),
  parking_cost numeric(10,2),
  other_costs numeric(10,2),
  cost_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(ride_id)
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES ride_bookings(id) ON DELETE CASCADE,
  payer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'GBP',
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')) DEFAULT 'pending',
  payment_method text CHECK (payment_method IN ('cash', 'bank_transfer', 'card', 'paypal', 'other', NULL)),
  transaction_reference text,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES ride_bookings(id) ON DELETE CASCADE,
  passenger_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_due numeric(10,2) NOT NULL CHECK (amount_due >= 0),
  distance_factor numeric(5,2),
  seats_factor integer DEFAULT 1,
  calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(ride_id, booking_id)
);

CREATE INDEX IF NOT EXISTS idx_ride_costs_ride_id ON ride_costs(ride_id);
CREATE INDEX IF NOT EXISTS idx_payments_ride_id ON payments(ride_id);
CREATE INDEX IF NOT EXISTS idx_payments_payer_id ON payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_payee_id ON payments(payee_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payment_splits_ride_id ON payment_splits(ride_id);
CREATE INDEX IF NOT EXISTS idx_payment_splits_passenger_id ON payment_splits(passenger_id);

ALTER TABLE ride_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view costs for rides they're involved in"
  ON ride_costs FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM rides WHERE rides.id = ride_costs.ride_id AND rides.driver_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM ride_bookings WHERE ride_bookings.ride_id = ride_costs.ride_id AND ride_bookings.passenger_id = auth.uid())
  );

CREATE POLICY "Drivers can insert costs for own rides"
  ON ride_costs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM rides WHERE rides.id = ride_costs.ride_id AND rides.driver_id = auth.uid())
  );

CREATE POLICY "Drivers can update costs for own rides"
  ON ride_costs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM rides WHERE rides.id = ride_costs.ride_id AND rides.driver_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM rides WHERE rides.id = ride_costs.ride_id AND rides.driver_id = auth.uid())
  );

CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (auth.uid() = payer_id OR auth.uid() = payee_id);

CREATE POLICY "Payers can insert payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = payer_id);

CREATE POLICY "Users can update own payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (auth.uid() = payer_id OR auth.uid() = payee_id)
  WITH CHECK (auth.uid() = payer_id OR auth.uid() = payee_id);

CREATE POLICY "Users can view splits for rides they're involved in"
  ON payment_splits FOR SELECT
  TO authenticated
  USING (
    auth.uid() = passenger_id OR
    EXISTS (SELECT 1 FROM rides WHERE rides.id = payment_splits.ride_id AND rides.driver_id = auth.uid())
  );

CREATE POLICY "Drivers can insert splits for own rides"
  ON payment_splits FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM rides WHERE rides.id = payment_splits.ride_id AND rides.driver_id = auth.uid())
  );

CREATE TRIGGER update_ride_costs_updated_at BEFORE UPDATE ON ride_costs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION calculate_payment_split(
  p_ride_id uuid,
  p_booking_id uuid
) RETURNS numeric AS $$
DECLARE
  total_cost numeric;
  total_distance numeric;
  booking_distance numeric;
  seats_requested integer;
  total_passengers integer;
  split_amount numeric;
BEGIN
  SELECT rc.total_cost INTO total_cost
  FROM ride_costs rc
  WHERE rc.ride_id = p_ride_id;

  IF total_cost IS NULL THEN
    RETURN 0;
  END IF;

  SELECT r.estimated_distance INTO total_distance
  FROM rides r
  WHERE r.id = p_ride_id;

  SELECT
    rb.seats_requested,
    ST_Distance(
      ST_MakePoint(rb.pickup_lng, rb.pickup_lat)::geography,
      ST_MakePoint(rb.dropoff_lng, rb.dropoff_lat)::geography
    ) / 1000 INTO seats_requested, booking_distance
  FROM ride_bookings rb
  WHERE rb.id = p_booking_id;

  SELECT COUNT(*)::integer INTO total_passengers
  FROM ride_bookings
  WHERE ride_id = p_ride_id AND status = 'confirmed';

  IF total_passengers = 0 THEN
    RETURN 0;
  END IF;

  split_amount := (total_cost / total_passengers) * seats_requested;

  IF total_distance > 0 AND booking_distance IS NOT NULL THEN
    split_amount := split_amount * (booking_distance / total_distance);
  END IF;

  RETURN ROUND(split_amount, 2);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auto_calculate_payment_splits()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO payment_splits (ride_id, booking_id, passenger_id, amount_due, seats_factor)
    SELECT
      rb.ride_id,
      rb.id,
      rb.passenger_id,
      calculate_payment_split(rb.ride_id, rb.id),
      rb.seats_requested
    FROM ride_bookings rb
    WHERE rb.ride_id = NEW.id AND rb.status = 'confirmed'
    ON CONFLICT (ride_id, booking_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_calculate_payment_splits
  AFTER UPDATE ON rides
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_payment_splits();


-- ============================================================================
-- MIGRATION: 20251115180448_remove_insurance_and_payment_systems.sql
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_auto_calculate_payment_splits ON rides;
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
DROP TRIGGER IF EXISTS update_ride_costs_updated_at ON ride_costs;
DROP TRIGGER IF EXISTS update_vehicle_insurance_updated_at ON vehicle_insurance;

DROP FUNCTION IF EXISTS auto_calculate_payment_splits();
DROP FUNCTION IF EXISTS calculate_payment_split(uuid, uuid);

DROP TABLE IF EXISTS license_verification_attempts;
DROP TABLE IF EXISTS payment_splits;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS ride_costs;
DROP TABLE IF EXISTS vehicle_insurance;


-- ============================================================================
-- MIGRATION: 20251115212318_fix_vehicle_visibility_for_rides.sql
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own vehicles" ON vehicles;

CREATE POLICY "Users can view own vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view vehicles for active rides"
  ON vehicles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rides
      WHERE rides.vehicle_id = vehicles.id
      AND rides.status = 'active'
    )
  );


-- ============================================================================
-- MIGRATION: 20251115214336_add_cancellation_tracking_system.sql
-- ============================================================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS total_bookings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancelled_bookings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_minute_cancellations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reliability_score DECIMAL(3,2) DEFAULT 5.00;

ALTER TABLE ride_bookings
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_last_minute_cancellation BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS booking_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES ride_bookings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE booking_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own booking history"
  ON booking_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own booking history"
  ON booking_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION calculate_reliability_score(user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  total_bookings INTEGER;
  cancelled_bookings INTEGER;
  last_minute_cancellations INTEGER;
  score DECIMAL;
BEGIN
  SELECT
    p.total_bookings,
    p.cancelled_bookings,
    p.last_minute_cancellations
  INTO total_bookings, cancelled_bookings, last_minute_cancellations
  FROM profiles p
  WHERE p.id = user_id;

  IF total_bookings = 0 THEN
    RETURN 5.00;
  END IF;

  score := 5.0 - (cancelled_bookings::DECIMAL / total_bookings * 2.0) - (last_minute_cancellations::DECIMAL / total_bookings * 1.0);

  IF score < 1.0 THEN
    score := 1.0;
  END IF;

  RETURN ROUND(score, 2);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_reliability_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET reliability_score = calculate_reliability_score(NEW.passenger_id)
  WHERE id = NEW.passenger_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_reliability_on_booking_change ON ride_bookings;
CREATE TRIGGER update_reliability_on_booking_change
  AFTER UPDATE OF status ON ride_bookings
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_reliability_score();

CREATE INDEX IF NOT EXISTS idx_booking_history_user_id ON booking_history(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_history_booking_id ON booking_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_ride_bookings_passenger_id ON ride_bookings(passenger_id);


-- ============================================================================
-- MIGRATION: 20251116192922_fix_vehicles_rls_for_bookings.sql
-- ============================================================================

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


-- ============================================================================
-- MIGRATION: 20251116192939_fix_rides_rls_for_bookings.sql
-- ============================================================================

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

CREATE POLICY "Drivers can view own rides"
  ON rides
  FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());


-- ============================================================================
-- MIGRATION: 20251116193833_fix_infinite_recursion_in_rls_policies.sql
-- ============================================================================

DROP POLICY IF EXISTS "Users can view rides they have booked" ON rides;
DROP POLICY IF EXISTS "Users can view vehicles for their bookings" ON vehicles;

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

CREATE POLICY "Users can view rides they have booked"
  ON rides
  FOR SELECT
  TO authenticated
  USING (user_has_booking_for_ride(id, auth.uid()));

CREATE POLICY "Users can view vehicles for their bookings"
  ON vehicles
  FOR SELECT
  TO authenticated
  USING (user_has_booking_for_vehicle(id, auth.uid()));


-- ============================================================================
-- MIGRATION: 20251116215639_add_whatsapp_to_profiles.sql
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'whatsapp_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN whatsapp_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'preferred_contact_method'
  ) THEN
    ALTER TABLE profiles ADD COLUMN preferred_contact_method text DEFAULT 'both' CHECK (preferred_contact_method IN ('in_app', 'whatsapp', 'both'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_whatsapp ON profiles(whatsapp_number) WHERE whatsapp_number IS NOT NULL;


-- ============================================================================
-- MIGRATION: 20251116221024_create_ai_chat_history_table.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  session_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own chat history"
  ON ai_chat_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chat messages"
  ON ai_chat_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_chat_history_user_id ON ai_chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_history_session_id ON ai_chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_history_created_at ON ai_chat_history(created_at DESC);


-- ============================================================================
-- MIGRATION: 20251117012004_add_auto_profile_creation_trigger.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ============================================================================
-- MIGRATION: 20251214193708_add_atomic_booking_rpc.sql
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_booking_per_passenger
  ON ride_bookings(ride_id, passenger_id)
  WHERE status != 'cancelled';

CREATE OR REPLACE FUNCTION public.request_booking(
  p_ride_id uuid,
  p_pickup_location text,
  p_pickup_lat double precision,
  p_pickup_lng double precision,
  p_dropoff_location text,
  p_dropoff_lat double precision,
  p_dropoff_lng double precision,
  p_seats_requested int
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
  v_available_seats int;
  v_ride_status text;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_seats_requested < 1 THEN
    RAISE EXCEPTION 'Must request at least 1 seat';
  END IF;

  SELECT available_seats, status
  INTO v_available_seats, v_ride_status
  FROM rides
  WHERE id = p_ride_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;

  IF v_ride_status != 'active' THEN
    RAISE EXCEPTION 'Ride is not active (status: %)', v_ride_status;
  END IF;

  IF v_available_seats < p_seats_requested THEN
    RAISE EXCEPTION 'Not enough seats available (available: %, requested: %)',
      v_available_seats, p_seats_requested;
  END IF;

  INSERT INTO ride_bookings (
    ride_id,
    passenger_id,
    pickup_location,
    pickup_lat,
    pickup_lng,
    dropoff_location,
    dropoff_lat,
    dropoff_lng,
    seats_requested,
    status
  ) VALUES (
    p_ride_id,
    v_user_id,
    p_pickup_location,
    p_pickup_lat,
    p_pickup_lng,
    p_dropoff_location,
    p_dropoff_lat,
    p_dropoff_lng,
    p_seats_requested,
    'pending'
  )
  RETURNING id INTO v_booking_id;

  UPDATE rides
  SET available_seats = available_seats - p_seats_requested
  WHERE id = p_ride_id;

  RETURN v_booking_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_booking FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_booking TO authenticated;


-- ============================================================================
-- MIGRATION: 20251214200429_fix_booking_status_and_unique_constraint.sql
-- ============================================================================

DROP INDEX IF EXISTS idx_unique_active_booking_per_passenger;

ALTER TABLE ride_bookings
  DROP CONSTRAINT IF EXISTS ride_bookings_status_check;

ALTER TABLE ride_bookings
  ADD CONSTRAINT ride_bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'rejected'));

CREATE UNIQUE INDEX idx_unique_active_booking_per_passenger
  ON ride_bookings(ride_id, passenger_id)
  WHERE status IN ('pending', 'confirmed', 'completed');


-- ============================================================================
-- MIGRATION: 20251214200908_add_atomic_booking_operations.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cancel_booking(
  p_booking_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
  v_ride record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_booking
  FROM ride_bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.passenger_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to cancel this booking';
  END IF;

  IF v_booking.status = 'cancelled' THEN
    RAISE EXCEPTION 'Booking is already cancelled';
  END IF;

  IF v_booking.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Cannot cancel booking with status: %', v_booking.status;
  END IF;

  SELECT * INTO v_ride
  FROM rides
  WHERE id = v_booking.ride_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;

  DECLARE
    v_is_last_minute boolean;
  BEGIN
    v_is_last_minute := (v_ride.departure_time - now()) <= interval '2 hours';
  END;

  UPDATE ride_bookings
  SET
    status = 'cancelled',
    cancellation_reason = p_reason,
    cancelled_at = now(),
    is_last_minute_cancellation = v_is_last_minute,
    updated_at = now()
  WHERE id = p_booking_id;

  UPDATE rides
  SET
    available_seats = LEAST(total_seats, available_seats + v_booking.seats_requested),
    updated_at = now()
  WHERE id = v_booking.ride_id;

  INSERT INTO booking_history (booking_id, user_id, action, reason)
  VALUES (p_booking_id, auth.uid(), 'cancelled', p_reason);

END;
$$;

CREATE OR REPLACE FUNCTION public.driver_decide_booking(
  p_booking_id uuid,
  p_decision text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
  v_ride record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_decision NOT IN ('confirmed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid decision. Must be ''confirmed'' or ''cancelled''';
  END IF;

  SELECT * INTO v_booking
  FROM ride_bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  SELECT * INTO v_ride
  FROM rides
  WHERE id = v_booking.ride_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;

  IF v_ride.driver_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to manage this booking';
  END IF;

  IF p_decision = 'confirmed' THEN
    IF v_booking.status != 'pending' THEN
      RAISE EXCEPTION 'Can only confirm pending bookings. Current status: %', v_booking.status;
    END IF;

    UPDATE ride_bookings
    SET
      status = 'confirmed',
      updated_at = now()
    WHERE id = p_booking_id;

    INSERT INTO booking_history (booking_id, user_id, action, reason)
    VALUES (p_booking_id, auth.uid(), 'confirmed', NULL);

  ELSIF p_decision = 'cancelled' THEN
    IF v_booking.status NOT IN ('pending', 'confirmed') THEN
      RAISE EXCEPTION 'Can only decline pending or confirmed bookings. Current status: %', v_booking.status;
    END IF;

    UPDATE ride_bookings
    SET
      status = 'cancelled',
      cancellation_reason = 'Declined by driver',
      cancelled_at = now(),
      is_last_minute_cancellation = false,
      updated_at = now()
    WHERE id = p_booking_id;

    UPDATE rides
    SET
      available_seats = LEAST(total_seats, available_seats + v_booking.seats_requested),
      updated_at = now()
    WHERE id = v_booking.ride_id;

    INSERT INTO booking_history (booking_id, user_id, action, reason)
    VALUES (p_booking_id, auth.uid(), 'declined', 'Declined by driver');

  END IF;

END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.driver_decide_booking(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.cancel_booking(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.driver_decide_booking(uuid, text) FROM PUBLIC;

COMMENT ON FUNCTION public.cancel_booking IS 'Allows passengers to cancel their own bookings with automatic seat restoration';
COMMENT ON FUNCTION public.driver_decide_booking IS 'Allows drivers to confirm or decline booking requests with automatic seat restoration on decline';


-- ============================================================================
-- MIGRATION: 20251214202053_enable_realtime_and_notification_triggers.sql
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'ride_bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ride_bookings;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION notify_driver_new_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id uuid;
  v_passenger_name text;
  v_ride_origin text;
  v_ride_destination text;
BEGIN
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT r.driver_id, r.origin, r.destination, p.full_name
  INTO v_driver_id, v_ride_origin, v_ride_destination, v_passenger_name
  FROM rides r
  JOIN profiles p ON p.id = NEW.passenger_id
  WHERE r.id = NEW.ride_id;

  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data,
    is_read,
    created_at
  ) VALUES (
    v_driver_id,
    'booking-request',
    'New Booking Request',
    v_passenger_name || ' wants to book your ride from ' || v_ride_origin || ' to ' || v_ride_destination,
    jsonb_build_object(
      'booking_id', NEW.id,
      'ride_id', NEW.ride_id,
      'passenger_id', NEW.passenger_id,
      'seats_requested', NEW.seats_requested
    ),
    false,
    now()
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_passenger_booking_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_name text;
  v_ride_origin text;
  v_ride_destination text;
  v_notification_type text;
  v_notification_title text;
  v_notification_message text;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT p.full_name, r.origin, r.destination
  INTO v_driver_name, v_ride_origin, v_ride_destination
  FROM rides r
  JOIN profiles p ON p.id = r.driver_id
  WHERE r.id = NEW.ride_id;

  IF NEW.status = 'confirmed' THEN
    v_notification_type := 'booking-confirmed';
    v_notification_title := 'Booking Confirmed';
    v_notification_message := v_driver_name || ' confirmed your booking for ' || v_ride_origin || ' to ' || v_ride_destination;

  ELSIF NEW.status = 'cancelled' THEN
    v_notification_type := 'booking-cancelled';
    v_notification_title := 'Booking Cancelled';
    IF NEW.cancellation_reason LIKE '%driver%' OR NEW.cancellation_reason LIKE '%Declined%' THEN
      v_notification_message := 'Your booking for ' || v_ride_origin || ' to ' || v_ride_destination || ' was declined';
    ELSE
      v_notification_message := 'Your booking for ' || v_ride_origin || ' to ' || v_ride_destination || ' was cancelled';
    END IF;

  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data,
    is_read,
    created_at
  ) VALUES (
    NEW.passenger_id,
    v_notification_type,
    v_notification_title,
    v_notification_message,
    jsonb_build_object(
      'booking_id', NEW.id,
      'ride_id', NEW.ride_id,
      'driver_id', (SELECT driver_id FROM rides WHERE id = NEW.ride_id),
      'old_status', OLD.status,
      'new_status', NEW.status
    ),
    false,
    now()
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_recipient_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name text;
  v_message_preview text;
BEGIN
  SELECT full_name INTO v_sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  v_message_preview := substring(NEW.content, 1, 50);
  IF length(NEW.content) > 50 THEN
    v_message_preview := v_message_preview || '...';
  END IF;

  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data,
    is_read,
    created_at
  ) VALUES (
    NEW.recipient_id,
    'message',
    'New Message from ' || v_sender_name,
    v_message_preview,
    jsonb_build_object(
      'message_id', NEW.id,
      'sender_id', NEW.sender_id,
      'ride_id', NEW.ride_id
    ),
    false,
    now()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_driver_new_booking ON ride_bookings;
DROP TRIGGER IF EXISTS trigger_notify_passenger_booking_status ON ride_bookings;
DROP TRIGGER IF EXISTS trigger_notify_recipient_new_message ON messages;

CREATE TRIGGER trigger_notify_driver_new_booking
  AFTER INSERT ON ride_bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_driver_new_booking();

CREATE TRIGGER trigger_notify_passenger_booking_status
  AFTER UPDATE ON ride_bookings
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_passenger_booking_status();

CREATE TRIGGER trigger_notify_recipient_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_recipient_new_message();

COMMENT ON FUNCTION notify_driver_new_booking() IS 'Automatically creates notification when passenger requests a ride booking';
COMMENT ON FUNCTION notify_passenger_booking_status() IS 'Automatically creates notification when driver confirms or declines a booking';
COMMENT ON FUNCTION notify_recipient_new_message() IS 'Automatically creates notification when user receives a new message';

COMMENT ON TRIGGER trigger_notify_driver_new_booking ON ride_bookings IS 'Notifies driver of new booking requests';
COMMENT ON TRIGGER trigger_notify_passenger_booking_status ON ride_bookings IS 'Notifies passenger when booking status changes';
COMMENT ON TRIGGER trigger_notify_recipient_new_message ON messages IS 'Notifies recipient of new messages';


-- ============================================================================
-- MIGRATION: 20251214233123_add_beta_allowlist_table.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS beta_allowlist (
  email text PRIMARY KEY,
  added_at timestamptz DEFAULT now(),
  added_by text
);

ALTER TABLE beta_allowlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can check if email is allowlisted"
  ON beta_allowlist
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated admins can insert allowlist entries"
  ON beta_allowlist
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'email' = 'admin@carpoolnetwork.co.uk'
  );

CREATE POLICY "Authenticated admins can delete allowlist entries"
  ON beta_allowlist
  FOR DELETE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'admin@carpoolnetwork.co.uk'
  );

CREATE OR REPLACE FUNCTION public.check_beta_allowlist(check_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM beta_allowlist WHERE lower(email) = lower(check_email)
  );
$$;

GRANT EXECUTE ON FUNCTION public.check_beta_allowlist(text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_beta_allowlist(text) TO authenticated;


-- ============================================================================
-- END OF ALL MIGRATIONS
-- ============================================================================
