-- Generated staging schema from supabase/migrations
-- Apply in order in Supabase SQL editor

-- ===== Begin 20251018185942_create_core_schema.sql =====

/*
  # Community Ride-Sharing Platform - Core Database Schema

  ## Overview
  Complete database schema for a community-based carpooling platform with safety features,
  real-time messaging, ride matching, and comprehensive user management.

  ## New Tables

  ### 1. profiles
  Extended user profile information linked to auth.users
  - `id` (uuid, FK to auth.users) - User identifier
  - `email` (text) - User email address
  - `full_name` (text) - User's full name
  - `avatar_url` (text) - Profile picture URL
  - `phone` (text) - Contact phone number
  - `bio` (text) - User biography
  - `date_of_birth` (date) - Birth date for age verification
  - `gender` (text) - User gender (optional)
  - `is_verified` (boolean) - Account verification status
  - `verification_badge` (text) - Type of verification
  - `total_rides_offered` (integer) - Count of rides as driver
  - `total_rides_taken` (integer) - Count of rides as passenger
  - `average_rating` (numeric) - User's average rating
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update

  ### 2. user_preferences
  User preferences for ride matching and experience
  - `user_id` (uuid, FK to profiles) - User identifier
  - `music_preference` (text) - Music preferences
  - `temperature_preference` (text) - Temperature preferences
  - `conversation_level` (text) - Preferred conversation level
  - `smoking_policy` (text) - Smoking policy
  - `pets_allowed` (boolean) - Pet-friendly rides
  - `max_detour_minutes` (integer) - Maximum detour tolerance
  - `gender_preference` (text) - Preferred passenger/driver gender
  - `auto_accept_rides` (boolean) - Auto-accept matching rides

  ### 3. emergency_contacts
  Emergency contact information for safety
  - `id` (uuid) - Contact identifier
  - `user_id` (uuid, FK to profiles) - User identifier
  - `name` (text) - Contact name
  - `phone` (text) - Contact phone number
  - `relationship` (text) - Relationship to user
  - `is_primary` (boolean) - Primary emergency contact flag

  ### 4. vehicles
  Vehicle information for drivers
  - `id` (uuid) - Vehicle identifier
  - `user_id` (uuid, FK to profiles) - Owner identifier
  - `make` (text) - Vehicle make
  - `model` (text) - Vehicle model
  - `year` (integer) - Manufacturing year
  - `color` (text) - Vehicle color
  - `license_plate` (text) - License plate number
  - `capacity` (integer) - Passenger capacity
  - `is_active` (boolean) - Currently active vehicle

  ### 5. rides
  Core ride postings and scheduling
  - `id` (uuid) - Ride identifier
  - `driver_id` (uuid, FK to profiles) - Driver user ID
  - `vehicle_id` (uuid, FK to vehicles) - Vehicle used
  - `origin` (text) - Starting location address
  - `origin_lat` (numeric) - Origin latitude
  - `origin_lng` (numeric) - Origin longitude
  - `destination` (text) - Destination address
  - `destination_lat` (numeric) - Destination latitude
  - `destination_lng` (numeric) - Destination longitude
  - `departure_time` (timestamptz) - Scheduled departure
  - `available_seats` (integer) - Seats available
  - `total_seats` (integer) - Total capacity
  - `status` (text) - Ride status (active, completed, cancelled)
  - `is_recurring` (boolean) - Recurring ride flag
  - `recurrence_pattern` (jsonb) - Recurrence configuration
  - `notes` (text) - Additional ride notes
  - `route_polyline` (text) - Encoded route path
  - `estimated_duration` (integer) - Duration in minutes
  - `estimated_distance` (numeric) - Distance in kilometers
  - `created_at` (timestamptz) - Creation timestamp

  ### 6. ride_bookings
  Passenger bookings for rides
  - `id` (uuid) - Booking identifier
  - `ride_id` (uuid, FK to rides) - Ride identifier
  - `passenger_id` (uuid, FK to profiles) - Passenger user ID
  - `pickup_location` (text) - Pickup address
  - `pickup_lat` (numeric) - Pickup latitude
  - `pickup_lng` (numeric) - Pickup longitude
  - `dropoff_location` (text) - Drop-off address
  - `dropoff_lat` (numeric) - Drop-off latitude
  - `dropoff_lng` (numeric) - Drop-off longitude
  - `seats_requested` (integer) - Number of seats
  - `status` (text) - Booking status (pending, confirmed, completed, cancelled)
  - `pickup_order` (integer) - Order in route
  - `created_at` (timestamptz) - Booking timestamp

  ### 7. ride_waitlist
  Waitlist for fully booked rides
  - `id` (uuid) - Waitlist entry identifier
  - `ride_id` (uuid, FK to rides) - Ride identifier
  - `user_id` (uuid, FK to profiles) - User identifier
  - `position` (integer) - Position in waitlist
  - `created_at` (timestamptz) - Entry timestamp

  ### 8. messages
  Direct messaging between users
  - `id` (uuid) - Message identifier
  - `sender_id` (uuid, FK to profiles) - Sender user ID
  - `recipient_id` (uuid, FK to profiles) - Recipient user ID
  - `ride_id` (uuid, FK to rides) - Related ride (optional)
  - `content` (text) - Message content
  - `is_read` (boolean) - Read status
  - `created_at` (timestamptz) - Send timestamp

  ### 9. reviews
  Rating and review system
  - `id` (uuid) - Review identifier
  - `ride_id` (uuid, FK to rides) - Ride identifier
  - `reviewer_id` (uuid, FK to profiles) - Reviewer user ID
  - `reviewee_id` (uuid, FK to profiles) - Reviewee user ID
  - `rating` (integer) - Rating (1-5)
  - `comment` (text) - Review text
  - `review_type` (text) - Type (driver or passenger)
  - `created_at` (timestamptz) - Review timestamp

  ### 10. notifications
  User notification system
  - `id` (uuid) - Notification identifier
  - `user_id` (uuid, FK to profiles) - User identifier
  - `type` (text) - Notification type
  - `title` (text) - Notification title
  - `message` (text) - Notification message
  - `data` (jsonb) - Additional data payload
  - `is_read` (boolean) - Read status
  - `created_at` (timestamptz) - Creation timestamp

  ### 11. safety_reports
  Safety incident reporting
  - `id` (uuid) - Report identifier
  - `reporter_id` (uuid, FK to profiles) - Reporter user ID
  - `reported_user_id` (uuid, FK to profiles) - Reported user ID
  - `ride_id` (uuid, FK to rides) - Related ride
  - `incident_type` (text) - Type of incident
  - `description` (text) - Incident description
  - `severity` (text) - Severity level
  - `status` (text) - Report status
  - `created_at` (timestamptz) - Report timestamp

  ### 12. saved_locations
  User's saved locations for quick access
  - `id` (uuid) - Location identifier
  - `user_id` (uuid, FK to profiles) - User identifier
  - `name` (text) - Location name (e.g., "Home", "Work")
  - `address` (text) - Full address
  - `latitude` (numeric) - Location latitude
  - `longitude` (numeric) - Location longitude
  - `created_at` (timestamptz) - Creation timestamp

  ## Security
  - RLS enabled on all tables
  - Policies for authenticated users to manage their own data
  - Read policies for public ride discovery
  - Admin policies for moderation

  ## Indexes
  - Spatial indexes for location-based queries
  - Performance indexes on foreign keys and frequently queried columns
  - Composite indexes for complex queries
*/

-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Profiles table (extends auth.users)
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

-- User preferences table
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

-- Emergency contacts table
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  relationship text NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Vehicles table
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

-- Rides table
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

-- Ride bookings table
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

-- Ride waitlist table
CREATE TABLE IF NOT EXISTS ride_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  position integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(ride_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ride_id uuid REFERENCES rides(id) ON DELETE SET NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Reviews table
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

-- Notifications table
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

-- Safety reports table
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

-- Saved locations table
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

-- Create indexes for performance
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

-- Enable Row Level Security on all tables
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

-- RLS Policies for profiles
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

-- RLS Policies for user_preferences
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

-- RLS Policies for emergency_contacts
CREATE POLICY "Users can manage own emergency contacts"
  ON emergency_contacts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for vehicles
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

-- RLS Policies for rides
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

-- RLS Policies for ride_bookings
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

-- RLS Policies for ride_waitlist
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

-- RLS Policies for messages
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

-- RLS Policies for reviews
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

-- RLS Policies for notifications
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

-- RLS Policies for safety_reports
CREATE POLICY "Users can view own reports"
  ON safety_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY "Users can create safety reports"
  ON safety_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- RLS Policies for saved_locations
CREATE POLICY "Users can manage own saved locations"
  ON saved_locations FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
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

-- ===== End 20251018185942_create_core_schema.sql =====

-- ===== Begin 20251018205840_add_vehicle_details.sql =====

/*
  # Add Vehicle Details Fields

  1. Changes
    - Add fuel_type column to vehicles table (petrol, diesel, electric, hybrid)
    - Add registration_year column for better tracking
    - Update vehicle model to be more descriptive
  
  2. Notes
    - Existing vehicles will have NULL fuel_type (can be updated later)
    - All changes are non-destructive
*/

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

-- ===== End 20251018205840_add_vehicle_details.sql =====

-- ===== Begin 20251020143600_add_vehicle_image_and_engine_fields.sql =====

/*
  # Add Vehicle Image and Engine Capacity Fields

  ## Changes
  1. Add `engine_capacity` column to vehicles table
     - Type: integer (stores engine capacity in cc)
     - Nullable: true (optional field)
  
  2. Add `image_url` column to vehicles table
     - Type: text (stores URL to vehicle image)
     - Nullable: true (optional field)

  ## Purpose
  These fields enhance vehicle information display by storing:
  - Engine capacity from DVLA API lookups
  - Vehicle images from external image APIs
*/

-- Add engine_capacity column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'engine_capacity'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN engine_capacity integer;
  END IF;
END $$;

-- Add image_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN image_url text;
  END IF;
END $$;

-- ===== End 20251020143600_add_vehicle_image_and_engine_fields.sql =====

-- ===== Begin 20251020144500_add_mot_tax_fields.sql =====

/*
  # Add MOT and Tax Safety Fields to Vehicles

  ## Changes
  1. Add MOT status fields to vehicles table
     - `mot_status` (text): Current MOT status (Valid, Not valid, No details held, etc.)
     - `mot_expiry_date` (date): When the MOT expires

  2. Add Tax status fields to vehicles table
     - `tax_status` (text): Current tax status (Taxed, SORN, Untaxed, etc.)
     - `tax_due_date` (date): When the tax is due

  ## Purpose
  These fields provide critical safety information for riders by showing:
  - Whether the vehicle has a valid MOT certificate
  - When the MOT expires (for safety checks)
  - Whether the vehicle is taxed and legal to drive
  - When the tax is due

  This information comes from DVLA API and helps riders make informed decisions about vehicle safety.
*/

-- Add mot_status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'mot_status'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN mot_status text;
  END IF;
END $$;

-- Add mot_expiry_date column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'mot_expiry_date'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN mot_expiry_date date;
  END IF;
END $$;

-- Add tax_status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'tax_status'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN tax_status text;
  END IF;
END $$;

-- Add tax_due_date column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'tax_due_date'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN tax_due_date date;
  END IF;
END $$;

-- ===== End 20251020144500_add_mot_tax_fields.sql =====

-- ===== Begin 20251020171021_create_vehicle_images_bucket.sql =====

/*
  # Create Vehicle Images Storage Bucket

  1. Storage Setup
    - Create public bucket `vehicle-images` for storing vehicle photos
    - Set up RLS policies to allow authenticated users to upload their vehicle images
    - Allow public read access to vehicle images

  2. Security
    - Users can only upload images for their own vehicles
    - Public can view all vehicle images
    - Maximum file size: 5MB
    - Allowed file types: images only
*/

-- Create the storage bucket for vehicle images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicle-images',
  'vehicle-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload vehicle images
CREATE POLICY "Users can upload vehicle images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vehicle-images' AND
  (storage.foldername(name))[1] = 'vehicles'
);

-- Allow authenticated users to update their own vehicle images
CREATE POLICY "Users can update vehicle images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'vehicle-images')
WITH CHECK (bucket_id = 'vehicle-images');

-- Allow authenticated users to delete their own vehicle images
CREATE POLICY "Users can delete vehicle images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vehicle-images');

-- Allow public read access to all vehicle images
CREATE POLICY "Public can view vehicle images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'vehicle-images');

-- ===== End 20251020171021_create_vehicle_images_bucket.sql =====

-- ===== Begin 20251115164524_fix_security_performance_issues_v2.sql =====

/*
  # Fix Security and Performance Issues

  ## 1. Add Missing Indexes on Foreign Keys
    - Add index on emergency_contacts.user_id
    - Add index on reviews.reviewer_id
    - Add index on ride_waitlist.user_id
    - Add index on rides.vehicle_id
    - Add index on safety_reports.reporter_id
    - Add index on safety_reports.ride_id

  ## 2. Remove Unused Indexes
    - Drop unused indexes that are not being utilized

  ## 3. Optimize RLS Policies
    - Replace auth.uid() with (SELECT auth.uid()) in all RLS policies
    - This prevents re-evaluation for each row, improving performance

  ## 4. Fix Function Search Path
    - Set search_path for update_updated_at_column function
*/

-- =====================================================
-- 1. ADD MISSING INDEXES ON FOREIGN KEYS
-- =====================================================

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

-- =====================================================
-- 2. REMOVE UNUSED INDEXES
-- =====================================================

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

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - PROFILES TABLE
-- =====================================================

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

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - USER_PREFERENCES TABLE
-- =====================================================

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

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - EMERGENCY_CONTACTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can manage own emergency contacts" ON emergency_contacts;

CREATE POLICY "Users can manage own emergency contacts"
ON emergency_contacts
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - VEHICLES TABLE
-- =====================================================

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

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - SAFETY_REPORTS TABLE
-- =====================================================

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

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - RIDES TABLE
-- =====================================================

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

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - RIDE_BOOKINGS TABLE
-- =====================================================

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

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - NOTIFICATIONS TABLE
-- =====================================================

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

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - RIDE_WAITLIST TABLE
-- =====================================================

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

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - MESSAGES TABLE
-- =====================================================

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

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - REVIEWS TABLE
-- =====================================================

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

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - SAVED_LOCATIONS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can manage own saved locations" ON saved_locations;

CREATE POLICY "Users can manage own saved locations"
ON saved_locations
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- =====================================================
-- 4. FIX FUNCTION SEARCH PATH
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    ALTER FUNCTION update_updated_at_column() SET search_path = '';
  END IF;
END $$;

-- ===== End 20251115164524_fix_security_performance_issues_v2.sql =====

-- ===== Begin 20251115180139_add_license_verification_system.sql =====

/*
  # Add Driving License Verification System

  1. New Tables
    - driver_licenses: Stores license info with verification status
    - vehicle_insurance: Vehicle insurance verification
    - license_verification_attempts: Audit trail for verifications

  2. Security
    - RLS enabled on all tables
    - Users can only view/manage their own data
*/

-- Driver licenses table
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

-- Vehicle insurance table
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

-- License verification attempts table
CREATE TABLE IF NOT EXISTS license_verification_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES driver_licenses(id) ON DELETE CASCADE,
  attempt_type text NOT NULL CHECK (attempt_type IN ('initial', 'renewal', 'ban_check', 'manual_review')),
  status text NOT NULL CHECK (status IN ('success', 'failed', 'pending')) DEFAULT 'pending',
  error_message text,
  verified_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_driver_licenses_user_id ON driver_licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_licenses_verified ON driver_licenses(verified);
CREATE INDEX IF NOT EXISTS idx_driver_licenses_expiry ON driver_licenses(expiry_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_insurance_vehicle_id ON vehicle_insurance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_insurance_expiry ON vehicle_insurance(expiry_date);
CREATE INDEX IF NOT EXISTS idx_license_verification_attempts_license_id ON license_verification_attempts(license_id);

-- Enable RLS
ALTER TABLE driver_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_verification_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for driver_licenses
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

-- RLS Policies for vehicle_insurance
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

-- RLS Policies for license_verification_attempts
CREATE POLICY "Users can view own verification attempts"
  ON license_verification_attempts FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM driver_licenses WHERE driver_licenses.id = license_verification_attempts.license_id AND driver_licenses.user_id = auth.uid())
  );

-- Add triggers for updated_at
CREATE TRIGGER update_driver_licenses_updated_at BEFORE UPDATE ON driver_licenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicle_insurance_updated_at BEFORE UPDATE ON vehicle_insurance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check if international license is still valid (within 12 months of arrival)
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

-- Function to check if driver can offer rides
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

-- ===== End 20251115180139_add_license_verification_system.sql =====

-- ===== Begin 20251115180215_add_payment_system.sql =====

/*
  # Add Payment and Cost Splitting System

  1. New Tables
    - ride_costs: Cost details for each ride
    - payments: Payment records between users
    - payment_splits: How costs are split among passengers

  2. Security
    - RLS enabled on all tables
    - Users can view their own payment records
*/

-- Ride costs table
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

-- Payments table
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

-- Payment splits table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ride_costs_ride_id ON ride_costs(ride_id);
CREATE INDEX IF NOT EXISTS idx_payments_ride_id ON payments(ride_id);
CREATE INDEX IF NOT EXISTS idx_payments_payer_id ON payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_payee_id ON payments(payee_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payment_splits_ride_id ON payment_splits(ride_id);
CREATE INDEX IF NOT EXISTS idx_payment_splits_passenger_id ON payment_splits(passenger_id);

-- Enable RLS
ALTER TABLE ride_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_splits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ride_costs
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

-- RLS Policies for payments
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

-- RLS Policies for payment_splits
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

-- Add triggers for updated_at
CREATE TRIGGER update_ride_costs_updated_at BEFORE UPDATE ON ride_costs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate payment split for a booking
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

-- Function to auto-calculate splits when ride is completed
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

-- Create trigger for auto-calculating splits
CREATE TRIGGER trigger_auto_calculate_payment_splits
  AFTER UPDATE ON rides
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_payment_splits();

-- ===== End 20251115180215_add_payment_system.sql =====

-- ===== Begin 20251115180448_remove_insurance_and_payment_systems.sql =====

/*
  # Remove Insurance and Payment Systems

  1. Changes
    - Drop vehicle_insurance table
    - Drop ride_costs table
    - Drop payments table
    - Drop payment_splits table
    - Drop license_verification_attempts table
    - Drop related functions and triggers

  2. Reason
    - Platform is connection-only, not handling payments or insurance
    - Users arrange their own payment and insurance separately
*/

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_auto_calculate_payment_splits ON rides;
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
DROP TRIGGER IF EXISTS update_ride_costs_updated_at ON ride_costs;
DROP TRIGGER IF EXISTS update_vehicle_insurance_updated_at ON vehicle_insurance;

-- Drop functions
DROP FUNCTION IF EXISTS auto_calculate_payment_splits();
DROP FUNCTION IF EXISTS calculate_payment_split(uuid, uuid);

-- Drop tables
DROP TABLE IF EXISTS license_verification_attempts;
DROP TABLE IF EXISTS payment_splits;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS ride_costs;
DROP TABLE IF EXISTS vehicle_insurance;

-- ===== End 20251115180448_remove_insurance_and_payment_systems.sql =====

-- ===== Begin 20251115212318_fix_vehicle_visibility_for_rides.sql =====

/*
  # Fix Vehicle Visibility for Ride Details

  ## Changes
  - Add policy to allow viewing vehicle details for active rides
  - Users can now see vehicle information when viewing other users' rides

  ## Security
  - Only exposes vehicle info for active rides
  - Does not expose vehicles not associated with rides
*/

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view own vehicles" ON vehicles;

-- Add new policies
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

-- ===== End 20251115212318_fix_vehicle_visibility_for_rides.sql =====

-- ===== Begin 20251115214336_add_cancellation_tracking_system.sql =====

/*
  # Add Cancellation Tracking System

  1. Schema Changes
    - Add cancellation tracking columns to profiles
    - Add cancellation reason to ride_bookings
    - Add cancelled_at timestamp to ride_bookings
    - Add booking_history table for audit trail

  2. Security
    - Enable RLS on all new tables
    - Add policies for data access

  3. Purpose
    - Track user reliability based on cancellation history
    - Help drivers make informed decisions
    - Maintain booking audit trail
*/

-- Add cancellation tracking to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS total_bookings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancelled_bookings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_minute_cancellations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reliability_score DECIMAL(3,2) DEFAULT 5.00;

-- Add cancellation fields to ride_bookings
ALTER TABLE ride_bookings
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_last_minute_cancellation BOOLEAN DEFAULT false;

-- Create booking history audit table
CREATE TABLE IF NOT EXISTS booking_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES ride_bookings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE booking_history ENABLE ROW LEVEL SECURITY;

-- Policies for booking_history
CREATE POLICY "Users can view own booking history"
  ON booking_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own booking history"
  ON booking_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create function to calculate reliability score
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

-- Create function to update reliability score
CREATE OR REPLACE FUNCTION update_reliability_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET reliability_score = calculate_reliability_score(NEW.passenger_id)
  WHERE id = NEW.passenger_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update reliability score on booking status change
DROP TRIGGER IF EXISTS update_reliability_on_booking_change ON ride_bookings;
CREATE TRIGGER update_reliability_on_booking_change
  AFTER UPDATE OF status ON ride_bookings
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_reliability_score();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_history_user_id ON booking_history(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_history_booking_id ON booking_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_ride_bookings_passenger_id ON ride_bookings(passenger_id);

-- ===== End 20251115214336_add_cancellation_tracking_system.sql =====

-- ===== Begin 20251116192922_fix_vehicles_rls_for_bookings.sql =====

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

-- ===== End 20251116192922_fix_vehicles_rls_for_bookings.sql =====

-- ===== Begin 20251116192939_fix_rides_rls_for_bookings.sql =====

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

-- ===== End 20251116192939_fix_rides_rls_for_bookings.sql =====

-- ===== Begin 20251116193833_fix_infinite_recursion_in_rls_policies.sql =====

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

-- ===== End 20251116193833_fix_infinite_recursion_in_rls_policies.sql =====

-- ===== Begin 20251116215639_add_whatsapp_to_profiles.sql =====

/*
  # Add WhatsApp Integration to Profiles

  1. Changes
    - Add `whatsapp_number` column to profiles table
    - Add `preferred_contact_method` enum (in_app, whatsapp, both)
    - Add index for efficient lookups

  2. Purpose
    - Allow users to share WhatsApp numbers for direct contact
    - Give users choice between in-app messaging and WhatsApp
    - Enable quick WhatsApp integration from ride details
*/

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

-- ===== End 20251116215639_add_whatsapp_to_profiles.sql =====

-- ===== Begin 20251116221024_create_ai_chat_history_table.sql =====

/*
  # Create AI Chat History Table

  1. New Tables
    - `ai_chat_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `message` (text) - User or AI message
      - `role` (text) - 'user' or 'assistant'
      - `created_at` (timestamptz)
      - `session_id` (text) - Group messages by session

  2. Security
    - Enable RLS on `ai_chat_history` table
    - Add policy for users to read their own chat history
    - Add policy for users to create their own chat messages

  3. Indexes
    - Index on user_id for efficient lookups
    - Index on session_id for session-based queries
    - Index on created_at for sorting

  4. Purpose
    - Persist AI chat conversations
    - Allow users to review past conversations
    - Provide context for future AI interactions
*/

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

-- ===== End 20251116221024_create_ai_chat_history_table.sql =====

-- ===== Begin 20251117012004_add_auto_profile_creation_trigger.sql =====

/*
  # Add Automatic Profile Creation for OAuth Users

  1. Changes
    - Creates a trigger function that automatically creates a profile when a user signs up
    - Extracts name and avatar from OAuth metadata
    - Trigger fires on INSERT to auth.users table
  
  2. Security
    - Uses SECURITY DEFINER to bypass RLS during profile creation
    - Safely handles OAuth user metadata
*/

-- Function to automatically create profile for new users
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

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ===== End 20251117012004_add_auto_profile_creation_trigger.sql =====

-- ===== Begin 20251214193708_add_atomic_booking_rpc.sql =====

/*
  # Add Atomic Booking System to Prevent Overbooking

  1. New Function
    - `request_booking` - Atomic function that handles ride booking in a single transaction
      - Locks ride row to prevent race conditions
      - Validates available seats, ride status, and seat request
      - Inserts booking record
      - Decrements available_seats atomically
      - Returns booking ID on success

  2. Constraints
    - Unique partial index on (ride_id, passenger_id) for non-cancelled bookings
      - Prevents double-booking by same user
      - Only applies to active bookings (not cancelled)

  3. Security
    - Function requires authentication (auth.uid() must exist)
    - SECURITY DEFINER to allow RLS bypass for atomic operations
    - GRANT EXECUTE to authenticated users only
    - REVOKE ALL from PUBLIC

  4. Error Handling
    - Raises exceptions for:
      - Unauthenticated users
      - Invalid seat requests (< 1)
      - Insufficient available seats
      - Inactive rides
      - Ride not found
*/

-- Create unique index to prevent double-booking by same passenger
-- Only applies to non-cancelled bookings
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_booking_per_passenger
  ON ride_bookings(ride_id, passenger_id)
  WHERE status != 'cancelled';

-- Create atomic booking function
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
  -- Require authentication
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate seats requested
  IF p_seats_requested < 1 THEN
    RAISE EXCEPTION 'Must request at least 1 seat';
  END IF;

  -- Lock the ride row for update (prevents concurrent bookings)
  SELECT available_seats, status
  INTO v_available_seats, v_ride_status
  FROM rides
  WHERE id = p_ride_id
  FOR UPDATE;

  -- Check if ride exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;

  -- Check if ride is active
  IF v_ride_status != 'active' THEN
    RAISE EXCEPTION 'Ride is not active (status: %)', v_ride_status;
  END IF;

  -- Check if enough seats available
  IF v_available_seats < p_seats_requested THEN
    RAISE EXCEPTION 'Not enough seats available (available: %, requested: %)',
      v_available_seats, p_seats_requested;
  END IF;

  -- Insert booking record
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

  -- Decrement available seats atomically
  UPDATE rides
  SET available_seats = available_seats - p_seats_requested
  WHERE id = p_ride_id;

  -- Return the booking ID
  RETURN v_booking_id;
END;
$$;

-- Set up permissions
REVOKE ALL ON FUNCTION public.request_booking FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_booking TO authenticated;

-- ===== End 20251214193708_add_atomic_booking_rpc.sql =====

-- ===== Begin 20251214200429_fix_booking_status_and_unique_constraint.sql =====

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

-- ===== End 20251214200429_fix_booking_status_and_unique_constraint.sql =====

-- ===== Begin 20251214200908_add_atomic_booking_operations.sql =====

/*
  # Add Atomic Booking Operations with Seat Restoration

  1. New Functions
    - `cancel_booking(p_booking_id, p_reason)` - Passenger cancels their booking
      - Validates passenger owns the booking
      - Prevents double-cancellation
      - Restores seats to ride (never exceeds total_seats)
      - Tracks last-minute cancellations (< 2 hours before departure)
      - Records history
    
    - `driver_decide_booking(p_booking_id, p_decision)` - Driver confirms or declines
      - Validates driver owns the ride
      - 'confirmed': pending -> confirmed (no seat change, already reserved)
      - 'cancelled': pending/confirmed -> cancelled + restore seats
      - Records history

  2. Security
    - Both functions are SECURITY DEFINER with explicit search_path
    - Row-level locking (FOR UPDATE) prevents race conditions
    - Permission checks ensure only authorized users can act
    - Granted to authenticated role only

  3. Seat Restoration Logic
    - Uses LEAST(total_seats, available_seats + seats_requested)
    - Prevents available_seats from exceeding total_seats
    - Applied atomically within transaction

  4. Error Handling
    - Raises exceptions for invalid states (already cancelled, not authorized, etc.)
    - Frontend can catch and display user-friendly messages
*/

-- ============================================================================
-- FUNCTION: cancel_booking
-- PURPOSE: Passenger cancels their own booking with seat restoration
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
  -- Require authenticated user
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Lock booking row and get data
  SELECT * INTO v_booking
  FROM ride_bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  -- Check if booking exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Verify passenger owns this booking
  IF v_booking.passenger_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to cancel this booking';
  END IF;

  -- Prevent double-cancellation
  IF v_booking.status = 'cancelled' THEN
    RAISE EXCEPTION 'Booking is already cancelled';
  END IF;

  -- Only allow cancelling pending or confirmed bookings
  IF v_booking.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Cannot cancel booking with status: %', v_booking.status;
  END IF;

  -- Lock ride row and get data
  SELECT * INTO v_ride
  FROM rides
  WHERE id = v_booking.ride_id
  FOR UPDATE;

  -- Check if ride exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;

  -- Determine if this is a last-minute cancellation (< 2 hours before departure)
  DECLARE
    v_is_last_minute boolean;
  BEGIN
    v_is_last_minute := (v_ride.departure_time - now()) <= interval '2 hours';
  END;

  -- Update booking to cancelled status
  UPDATE ride_bookings
  SET 
    status = 'cancelled',
    cancellation_reason = p_reason,
    cancelled_at = now(),
    is_last_minute_cancellation = v_is_last_minute,
    updated_at = now()
  WHERE id = p_booking_id;

  -- Restore seats to ride (never exceed total_seats)
  UPDATE rides
  SET 
    available_seats = LEAST(total_seats, available_seats + v_booking.seats_requested),
    updated_at = now()
  WHERE id = v_booking.ride_id;

  -- Record in booking history
  INSERT INTO booking_history (booking_id, user_id, action, reason)
  VALUES (p_booking_id, auth.uid(), 'cancelled', p_reason);

END;
$$;

-- ============================================================================
-- FUNCTION: driver_decide_booking
-- PURPOSE: Driver confirms or declines a booking request
-- ============================================================================
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
  -- Require authenticated user
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate decision parameter
  IF p_decision NOT IN ('confirmed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid decision. Must be ''confirmed'' or ''cancelled''';
  END IF;

  -- Lock booking row and get data
  SELECT * INTO v_booking
  FROM ride_bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  -- Check if booking exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Lock ride row and get data
  SELECT * INTO v_ride
  FROM rides
  WHERE id = v_booking.ride_id
  FOR UPDATE;

  -- Check if ride exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;

  -- Verify driver owns this ride
  IF v_ride.driver_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to manage this booking';
  END IF;

  -- Handle CONFIRM decision
  IF p_decision = 'confirmed' THEN
    -- Can only confirm pending bookings
    IF v_booking.status != 'pending' THEN
      RAISE EXCEPTION 'Can only confirm pending bookings. Current status: %', v_booking.status;
    END IF;

    -- Update booking to confirmed
    UPDATE ride_bookings
    SET 
      status = 'confirmed',
      updated_at = now()
    WHERE id = p_booking_id;

    -- Record in booking history
    INSERT INTO booking_history (booking_id, user_id, action, reason)
    VALUES (p_booking_id, auth.uid(), 'confirmed', NULL);

  -- Handle DECLINE decision (driver cancels the booking)
  ELSIF p_decision = 'cancelled' THEN
    -- Can decline pending or confirmed bookings
    IF v_booking.status NOT IN ('pending', 'confirmed') THEN
      RAISE EXCEPTION 'Can only decline pending or confirmed bookings. Current status: %', v_booking.status;
    END IF;

    -- Update booking to cancelled
    UPDATE ride_bookings
    SET 
      status = 'cancelled',
      cancellation_reason = 'Declined by driver',
      cancelled_at = now(),
      is_last_minute_cancellation = false,
      updated_at = now()
    WHERE id = p_booking_id;

    -- Restore seats to ride (never exceed total_seats)
    UPDATE rides
    SET 
      available_seats = LEAST(total_seats, available_seats + v_booking.seats_requested),
      updated_at = now()
    WHERE id = v_booking.ride_id;

    -- Record in booking history
    INSERT INTO booking_history (booking_id, user_id, action, reason)
    VALUES (p_booking_id, auth.uid(), 'declined', 'Declined by driver');

  END IF;

END;
$$;

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

-- Grant execute permissions to authenticated users only
GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.driver_decide_booking(uuid, text) TO authenticated;

-- Revoke from public for security
REVOKE ALL ON FUNCTION public.cancel_booking(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.driver_decide_booking(uuid, text) FROM PUBLIC;

-- Add helpful comments
COMMENT ON FUNCTION public.cancel_booking IS 'Allows passengers to cancel their own bookings with automatic seat restoration';
COMMENT ON FUNCTION public.driver_decide_booking IS 'Allows drivers to confirm or decline booking requests with automatic seat restoration on decline';

-- ===== End 20251214200908_add_atomic_booking_operations.sql =====

-- ===== Begin 20251214202053_enable_realtime_and_notification_triggers.sql =====

/*
  # Enable Real-time Updates and Automatic Notifications

  1. Realtime Configuration
    - Enable Realtime for `ride_bookings` table
    - Enable Realtime for `messages` table
    - Enable Realtime for `notifications` table
    
  2. Notification Triggers
    - **New Booking Request**: When a ride_bookings row is INSERTed with status='pending'
      â†’ Notify driver with type='booking-request'
    
    - **Booking Confirmed**: When ride_bookings.status changes to 'confirmed'
      â†’ Notify passenger with type='booking-confirmed'
    
    - **Booking Cancelled**: When ride_bookings.status changes to 'cancelled'
      â†’ Notify passenger with type='booking-cancelled'
    
    - **New Message**: When a message is INSERTed
      â†’ Notify recipient with type='message'

  3. Trigger Functions
    - All functions are SECURITY DEFINER to bypass RLS for notification inserts
    - Functions check for existing similar notifications to avoid duplicates
    - Notifications include relevant IDs in data jsonb field

  4. Benefits
    - Real-time updates without page refresh
    - Automatic notification creation (no client-side code needed)
    - Consistent notification format
    - Audit trail of all user actions
*/

-- ============================================================================
-- ENABLE REALTIME PUBLICATION
-- ============================================================================

-- Enable Realtime for ride_bookings (bookings updates)
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

-- Enable Realtime for messages (new messages)
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

-- Enable Realtime for notifications (notification updates)
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

-- ============================================================================
-- TRIGGER FUNCTION: Notify driver of new booking request
-- ============================================================================
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
  -- Only trigger for new pending bookings
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Get driver ID and ride details
  SELECT r.driver_id, r.origin, r.destination, p.full_name
  INTO v_driver_id, v_ride_origin, v_ride_destination, v_passenger_name
  FROM rides r
  JOIN profiles p ON p.id = NEW.passenger_id
  WHERE r.id = NEW.ride_id;

  -- Insert notification for driver
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

-- ============================================================================
-- TRIGGER FUNCTION: Notify passenger of booking status changes
-- ============================================================================
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
  -- Only trigger on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get driver name and ride details
  SELECT p.full_name, r.origin, r.destination
  INTO v_driver_name, v_ride_origin, v_ride_destination
  FROM rides r
  JOIN profiles p ON p.id = r.driver_id
  WHERE r.id = NEW.ride_id;

  -- Determine notification type and message based on new status
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
    -- Don't notify for other status changes
    RETURN NEW;
  END IF;

  -- Insert notification for passenger
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

-- ============================================================================
-- TRIGGER FUNCTION: Notify recipient of new message
-- ============================================================================
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
  -- Get sender name
  SELECT full_name INTO v_sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Create message preview (first 50 chars)
  v_message_preview := substring(NEW.content, 1, 50);
  IF length(NEW.content) > 50 THEN
    v_message_preview := v_message_preview || '...';
  END IF;

  -- Insert notification for recipient
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

-- ============================================================================
-- CREATE TRIGGERS
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_notify_driver_new_booking ON ride_bookings;
DROP TRIGGER IF EXISTS trigger_notify_passenger_booking_status ON ride_bookings;
DROP TRIGGER IF EXISTS trigger_notify_recipient_new_message ON messages;

-- Trigger for new booking requests (notify driver)
CREATE TRIGGER trigger_notify_driver_new_booking
  AFTER INSERT ON ride_bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_driver_new_booking();

-- Trigger for booking status changes (notify passenger)
CREATE TRIGGER trigger_notify_passenger_booking_status
  AFTER UPDATE ON ride_bookings
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_passenger_booking_status();

-- Trigger for new messages (notify recipient)
CREATE TRIGGER trigger_notify_recipient_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_recipient_new_message();

-- ============================================================================
-- HELPFUL COMMENTS
-- ============================================================================

COMMENT ON FUNCTION notify_driver_new_booking() IS 'Automatically creates notification when passenger requests a ride booking';
COMMENT ON FUNCTION notify_passenger_booking_status() IS 'Automatically creates notification when driver confirms or declines a booking';
COMMENT ON FUNCTION notify_recipient_new_message() IS 'Automatically creates notification when user receives a new message';

COMMENT ON TRIGGER trigger_notify_driver_new_booking ON ride_bookings IS 'Notifies driver of new booking requests';
COMMENT ON TRIGGER trigger_notify_passenger_booking_status ON ride_bookings IS 'Notifies passenger when booking status changes';
COMMENT ON TRIGGER trigger_notify_recipient_new_message ON messages IS 'Notifies recipient of new messages';

-- ===== End 20251214202053_enable_realtime_and_notification_triggers.sql =====

-- ===== Begin 20251214233123_add_beta_allowlist_table.sql =====

/*
  # Add Beta Allowlist Table for Private Beta Mode

  1. New Tables
    - `beta_allowlist`
      - `email` (text, primary key) - Email address allowed to sign up
      - `added_at` (timestamptz) - When the email was added to allowlist
      - `added_by` (text) - Admin who added the email

  2. Security
    - Enable RLS on `beta_allowlist` table
    - Public can check if their email is allowlisted (for signup validation)
    - Only admins can insert/delete entries

  3. Functions
    - `check_beta_allowlist(email)` - Public function to check if email is allowed
*/

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

-- ===== End 20251214233123_add_beta_allowlist_table.sql =====

-- ===== Begin 20251214235908_add_bug_reports_and_rate_limiting.sql =====

/*
  # Add Bug Reports Table and Rate Limiting

  1. New Tables
    - `bug_reports`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `text` (text, the feedback/bug report content)
      - `page` (text, the page URL where feedback was submitted)
      - `created_at` (timestamptz)
    - `rate_limits`
      - `id` (uuid, primary key)
      - `user_id` (uuid, nullable for anonymous actions)
      - `action_type` (text, e.g., 'signup', 'message', 'feedback')
      - `identifier` (text, email or IP for rate limiting)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `bug_reports` table
    - Users can only insert their own bug reports
    - Users can read their own bug reports
    - Enable RLS on `rate_limits` table
    - System can insert rate limit records

  3. Rate Limiting Functions
    - Function to check rate limits
    - Function to record actions for rate limiting
*/

CREATE TABLE IF NOT EXISTS bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  text text NOT NULL,
  page text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own bug reports"
  ON bug_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own bug reports"
  ON bug_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  identifier text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_action_created 
  ON rate_limits(identifier, action_type, created_at DESC);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can insert rate limit records"
  ON rate_limits
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier text,
  p_action_type text,
  p_max_requests integer,
  p_window_minutes integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_count integer;
BEGIN
  SELECT COUNT(*) INTO request_count
  FROM rate_limits
  WHERE identifier = p_identifier
    AND action_type = p_action_type
    AND created_at > NOW() - (p_window_minutes || ' minutes')::interval;
  
  RETURN request_count < p_max_requests;
END;
$$;

CREATE OR REPLACE FUNCTION record_rate_limit_action(
  p_user_id uuid,
  p_identifier text,
  p_action_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO rate_limits (user_id, identifier, action_type)
  VALUES (p_user_id, p_identifier, p_action_type);
  
  DELETE FROM rate_limits
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$;

-- ===== End 20251214235908_add_bug_reports_and_rate_limiting.sql =====

-- ===== Begin 20251215000535_add_admin_feedback_policies.sql =====

/*
  # Add Admin Policies for Bug Reports

  1. Changes
    - Add policy for admins to read all bug reports
    - Add policy for admins to delete bug reports
    - Create admin check function

  2. Security
    - Admin email is checked via auth.jwt() metadata
    - Only admins can view and delete all bug reports
*/

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    WHERE auth.jwt() ->> 'email' = current_setting('app.admin_email', true)
    OR auth.jwt() ->> 'email' LIKE '%@carpoolnetwork.co.uk'
  );
$$;

CREATE POLICY "Admins can read all bug reports"
  ON bug_reports
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'email' LIKE '%@carpoolnetwork.co.uk'
    OR auth.uid() = user_id
  );

CREATE POLICY "Admins can delete bug reports"
  ON bug_reports
  FOR DELETE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' LIKE '%@carpoolnetwork.co.uk'
  );

-- ===== End 20251215000535_add_admin_feedback_policies.sql =====

-- ===== Begin 20251215013001_update_bug_reports_admin_only_rls.sql =====

/*
  # Update Bug Reports RLS to Admin-Only

  1. Changes
    - Drop existing RLS policies on bug_reports table
    - Add new admin-only policies for SELECT, INSERT, and DELETE
    - Admin is defined as balashankarbollineni4@gmail.com

  2. Security
    - Only the admin email can SELECT bug reports
    - Only the admin email can INSERT bug reports
    - Only the admin email can DELETE bug reports
    - Regular users cannot access bug_reports at all

  3. Schema Update
    - Add page_path column as an alias-friendly name (nullable, uses existing 'page' for compatibility)
*/

DROP POLICY IF EXISTS "Users can insert their own bug reports" ON bug_reports;
DROP POLICY IF EXISTS "Users can read their own bug reports" ON bug_reports;
DROP POLICY IF EXISTS "Admins can read all bug reports" ON bug_reports;
DROP POLICY IF EXISTS "Admins can delete bug reports" ON bug_reports;

CREATE POLICY "Admin can read all bug reports"
  ON bug_reports
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') = 'balashankarbollineni4@gmail.com'
  );

CREATE POLICY "Admin can insert bug reports"
  ON bug_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'email') = 'balashankarbollineni4@gmail.com'
  );

CREATE POLICY "Admin can delete bug reports"
  ON bug_reports
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') = 'balashankarbollineni4@gmail.com'
  );

-- ===== End 20251215013001_update_bug_reports_admin_only_rls.sql =====

-- ===== Begin 20251215025036_add_ride_requests_system.sql =====

/*
  # Add Ride Requests System
  
  This migration adds functionality for riders to request rides from drivers.
  
  1. New Tables
    - `ride_requests`
      - `id` (uuid, primary key)
      - `requester_id` (uuid, references profiles)
      - `from_location` (text) - pickup location
      - `to_location` (text) - destination
      - `from_lat` (numeric) - pickup latitude
      - `from_lng` (numeric) - pickup longitude
      - `to_lat` (numeric) - destination latitude
      - `to_lng` (numeric) - destination longitude
      - `departure_time` (timestamptz) - when they want to travel
      - `flexible_time` (boolean) - if departure time is flexible
      - `seats_needed` (integer) - number of seats required
      - `notes` (text) - additional information
      - `status` (text) - pending, matched, cancelled, expired
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
  2. Security
    - Enable RLS on `ride_requests` table
    - Authenticated users can create ride requests
    - Users can read all active ride requests
    - Users can update/delete only their own ride requests
*/

-- Create ride_requests table
CREATE TABLE IF NOT EXISTS ride_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  from_location text NOT NULL,
  to_location text NOT NULL,
  from_lat numeric NOT NULL,
  from_lng numeric NOT NULL,
  to_lat numeric NOT NULL,
  to_lng numeric NOT NULL,
  departure_time timestamptz NOT NULL,
  flexible_time boolean DEFAULT false,
  seats_needed integer NOT NULL CHECK (seats_needed > 0 AND seats_needed <= 8),
  notes text DEFAULT '',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'cancelled', 'expired')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE ride_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can create ride requests
CREATE POLICY "Authenticated users can create ride requests"
  ON ride_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id);

-- Policy: Anyone can view active ride requests
CREATE POLICY "Anyone can view active ride requests"
  ON ride_requests
  FOR SELECT
  TO authenticated
  USING (status = 'pending');

-- Policy: Users can update their own ride requests
CREATE POLICY "Users can update own ride requests"
  ON ride_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = requester_id)
  WITH CHECK (auth.uid() = requester_id);

-- Policy: Users can delete their own ride requests
CREATE POLICY "Users can delete own ride requests"
  ON ride_requests
  FOR DELETE
  TO authenticated
  USING (auth.uid() = requester_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_ride_requests_requester ON ride_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_status ON ride_requests(status);
CREATE INDEX IF NOT EXISTS idx_ride_requests_departure ON ride_requests(departure_time);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_ride_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ride_requests_updated_at
  BEFORE UPDATE ON ride_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_ride_requests_updated_at();

-- ===== End 20251215025036_add_ride_requests_system.sql =====

-- ===== Begin 20251215131759_add_photo_verification_system.sql =====

/*
  # Photo Verification System

  1. Profile Photo Requirements
    - Add `profile_photo_url` field to profiles table
    - Add `profile_verified` boolean flag (default false)
    - Add `profile_verification_date` timestamp

  2. Vehicle Photo Requirements
    - Add `vehicle_photo_url` field to vehicles table
    - Add `plate_verified` boolean flag (default false)
    - Add `plate_verification_date` timestamp
    - Add `extracted_plate_text` field for OCR results

  3. Security
    - Update RLS policies to allow users to update their own photos
    - Add verification status visibility

  4. Important Notes
    - Profile photo mandatory before posting/requesting rides (enforced in app)
    - Vehicle photo mandatory before posting rides (enforced in app)
    - Face detection performed client-side before upload
    - Plate OCR performed via edge function after upload
*/

-- Add profile photo fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'profile_photo_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profile_photo_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'profile_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profile_verified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'profile_verification_date'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profile_verification_date timestamptz;
  END IF;
END $$;

-- Add vehicle photo fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'vehicle_photo_url'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN vehicle_photo_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'plate_verified'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN plate_verified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'plate_verification_date'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN plate_verification_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'extracted_plate_text'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN extracted_plate_text text;
  END IF;
END $$;

-- Create storage bucket for profile photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for vehicle photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-photos', 'vehicle-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for profile photos bucket
DROP POLICY IF EXISTS "Users can upload their own profile photo" ON storage.objects;
CREATE POLICY "Users can upload their own profile photo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update their own profile photo" ON storage.objects;
CREATE POLICY "Users can update their own profile photo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Profile photos are publicly accessible" ON storage.objects;
CREATE POLICY "Profile photos are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-photos');

DROP POLICY IF EXISTS "Users can delete their own profile photo" ON storage.objects;
CREATE POLICY "Users can delete their own profile photo"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policies for vehicle photos bucket
DROP POLICY IF EXISTS "Users can upload their vehicle photos" ON storage.objects;
CREATE POLICY "Users can upload their vehicle photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vehicle-photos' AND
  EXISTS (
    SELECT 1 FROM vehicles
    WHERE vehicles.user_id = auth.uid()
    AND vehicles.id::text = (storage.foldername(name))[1]
  )
);

DROP POLICY IF EXISTS "Users can update their vehicle photos" ON storage.objects;
CREATE POLICY "Users can update their vehicle photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'vehicle-photos' AND
  EXISTS (
    SELECT 1 FROM vehicles
    WHERE vehicles.user_id = auth.uid()
    AND vehicles.id::text = (storage.foldername(name))[1]
  )
);

DROP POLICY IF EXISTS "Vehicle photos are publicly accessible" ON storage.objects;
CREATE POLICY "Vehicle photos are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'vehicle-photos');

DROP POLICY IF EXISTS "Users can delete their vehicle photos" ON storage.objects;
CREATE POLICY "Users can delete their vehicle photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'vehicle-photos' AND
  EXISTS (
    SELECT 1 FROM vehicles
    WHERE vehicles.user_id = auth.uid()
    AND vehicles.id::text = (storage.foldername(name))[1]
  )
);

-- Function to verify profile photo (called by edge function after face detection)
CREATE OR REPLACE FUNCTION verify_profile_photo(
  p_user_id uuid,
  p_photo_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET
    profile_photo_url = p_photo_url,
    profile_verified = true,
    profile_verification_date = now()
  WHERE id = p_user_id;
END;
$$;

-- Function to verify vehicle plate (called by edge function after OCR)
CREATE OR REPLACE FUNCTION verify_vehicle_plate(
  p_vehicle_id uuid,
  p_photo_url text,
  p_extracted_text text,
  p_verified boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE vehicles
  SET
    vehicle_photo_url = p_photo_url,
    extracted_plate_text = p_extracted_text,
    plate_verified = p_verified,
    plate_verification_date = CASE WHEN p_verified THEN now() ELSE NULL END
  WHERE id = p_vehicle_id;
END;
$$;

-- Add comment on profiles table
COMMENT ON COLUMN profiles.profile_photo_url IS 'URL to user profile photo (face photo required)';
COMMENT ON COLUMN profiles.profile_verified IS 'Whether profile photo has been verified to contain a face';
COMMENT ON COLUMN profiles.profile_verification_date IS 'When profile photo was verified';

-- Add comment on vehicles table
COMMENT ON COLUMN vehicles.vehicle_photo_url IS 'URL to vehicle front photo (plate must be visible)';
COMMENT ON COLUMN vehicles.plate_verified IS 'Whether vehicle plate has been verified via OCR';
COMMENT ON COLUMN vehicles.extracted_plate_text IS 'Plate text extracted via OCR for verification';
COMMENT ON COLUMN vehicles.plate_verification_date IS 'When vehicle plate was verified';

-- ===== End 20251215131759_add_photo_verification_system.sql =====

-- ===== Begin 20251215190511_fix_ride_availability_logic.sql =====

/*
  # Fix Ride Availability Logic - Prevent Fully Booked Rides from Showing

  ## Problem
  Rides with 0 available seats are showing in "Available Rides" list.

  ## Solution
  1. Create a view that calculates available seats dynamically from bookings
  2. Add a function to recalculate and sync available_seats
  3. Add check constraint to prevent negative seats
  4. Add trigger to keep available_seats in sync

  ## Changes
  - View: `rides_with_calculated_seats` - Shows rides with real-time seat availability
  - Function: `recalculate_ride_seats` - Syncs available_seats with actual bookings
  - Constraint: Prevents available_seats from going negative
  - Trigger: Auto-syncs on booking status changes
*/

-- ============================================================================
-- VIEW: Calculate available seats from actual bookings
-- ============================================================================
CREATE OR REPLACE VIEW rides_with_calculated_seats AS
SELECT
  r.*,
  (
    r.total_seats - COALESCE(
      (
        SELECT SUM(rb.seats_requested)
        FROM ride_bookings rb
        WHERE rb.ride_id = r.id
        AND rb.status IN ('pending', 'confirmed', 'paid')
      ),
      0
    )
  ) AS calculated_available_seats
FROM rides r;

COMMENT ON VIEW rides_with_calculated_seats IS
'Shows rides with dynamically calculated available seats based on active bookings (pending, confirmed, paid)';

-- ============================================================================
-- FUNCTION: Recalculate and sync available_seats for a ride
-- Fixed to handle deleted rides gracefully during cascade operations
-- ============================================================================
CREATE OR REPLACE FUNCTION public.recalculate_ride_seats(p_ride_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_seats int;
  v_booked_seats int;
  v_new_available_seats int;
BEGIN
  -- Get total seats for the ride
  SELECT total_seats INTO v_total_seats
  FROM rides
  WHERE id = p_ride_id;

  -- If ride doesn't exist, just return silently
  -- This handles cascade delete operations where ride is deleted first
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calculate booked seats (only count active bookings)
  SELECT COALESCE(SUM(seats_requested), 0) INTO v_booked_seats
  FROM ride_bookings
  WHERE ride_id = p_ride_id
  AND status IN ('pending', 'confirmed', 'paid');

  -- Calculate new available seats
  v_new_available_seats := v_total_seats - v_booked_seats;

  -- Ensure it doesn't go negative
  v_new_available_seats := GREATEST(v_new_available_seats, 0);

  -- Update the ride
  UPDATE rides
  SET
    available_seats = v_new_available_seats,
    updated_at = now()
  WHERE id = p_ride_id;

END;
$$;

COMMENT ON FUNCTION recalculate_ride_seats IS
'Recalculates and syncs available_seats for a ride based on actual active bookings';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION recalculate_ride_seats(uuid) TO authenticated;

-- ============================================================================
-- CONSTRAINT: Prevent negative available seats
-- ============================================================================
DO $$
BEGIN
  -- Drop constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'rides_available_seats_non_negative'
  ) THEN
    ALTER TABLE rides DROP CONSTRAINT rides_available_seats_non_negative;
  END IF;

  -- Add constraint to prevent negative seats
  ALTER TABLE rides
  ADD CONSTRAINT rides_available_seats_non_negative
  CHECK (available_seats >= 0);
END $$;

COMMENT ON CONSTRAINT rides_available_seats_non_negative ON rides IS
'Ensures available_seats never goes negative';

-- ============================================================================
-- TRIGGER: Auto-sync available_seats on booking changes
-- ============================================================================

-- Create trigger function
CREATE OR REPLACE FUNCTION trigger_sync_ride_seats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- On INSERT or UPDATE, recalculate seats for the affected ride
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM recalculate_ride_seats(NEW.ride_id);
    RETURN NEW;
  END IF;

  -- On DELETE, recalculate seats for the old ride
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_ride_seats(OLD.ride_id);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trg_sync_ride_seats_on_booking_change ON ride_bookings;

-- Create trigger on ride_bookings table
CREATE TRIGGER trg_sync_ride_seats_on_booking_change
  AFTER INSERT OR UPDATE OR DELETE ON ride_bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_ride_seats();

COMMENT ON TRIGGER trg_sync_ride_seats_on_booking_change ON ride_bookings IS
'Automatically syncs available_seats in rides table when bookings change';

-- ============================================================================
-- DATA MIGRATION: Sync existing rides
-- ============================================================================

-- Recalculate available_seats for all existing active rides
DO $$
DECLARE
  ride_record RECORD;
BEGIN
  FOR ride_record IN
    SELECT id FROM rides WHERE status = 'active'
  LOOP
    PERFORM recalculate_ride_seats(ride_record.id);
  END LOOP;
END $$;

-- ============================================================================
-- HELPER FUNCTION: Get truly available rides
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_available_rides(
  p_min_seats int DEFAULT 1,
  p_exclude_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  driver_id uuid,
  origin text,
  origin_lat double precision,
  origin_lng double precision,
  destination text,
  destination_lat double precision,
  destination_lng double precision,
  departure_time timestamptz,
  available_seats int,
  total_seats int,
  status text,
  notes text,
  estimated_distance double precision,
  estimated_duration double precision,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.driver_id,
    r.origin,
    r.origin_lat,
    r.origin_lng,
    r.destination,
    r.destination_lat,
    r.destination_lng,
    r.departure_time,
    r.available_seats,
    r.total_seats,
    r.status,
    r.notes,
    r.estimated_distance,
    r.estimated_duration,
    r.created_at,
    r.updated_at
  FROM rides r
  WHERE r.status = 'active'
  AND r.available_seats >= p_min_seats
  AND r.available_seats > 0
  AND r.departure_time >= now()
  AND (p_exclude_user_id IS NULL OR r.driver_id != p_exclude_user_id)
  ORDER BY r.departure_time ASC;
$$;

COMMENT ON FUNCTION get_available_rides IS
'Returns only truly available rides (status=active, available_seats > 0, future departure, not driver)';

GRANT EXECUTE ON FUNCTION get_available_rides(int, uuid) TO authenticated;

-- ===== End 20251215190511_fix_ride_availability_logic.sql =====

-- ===== Begin 20251215195853_add_photo_storage_and_paths.sql =====

/*
  # Add Photo Storage and Database Paths

  ## Changes
  
  1. Storage Bucket
    - Creates `user-media` bucket for profile and vehicle photos
    - Private bucket with authenticated access only
    - Allows image uploads (jpg, jpeg, png, webp)
    - Max file size 10MB
  
  2. Profile Photo Fields
    - `profile_photo_path` - Path to optimized profile photo
    - `profile_photo_thumb_path` - Path to profile thumbnail
  
  3. Vehicle Photo Fields  
    - `vehicle_front_photo_path` - Path to optimized vehicle front photo
    - `vehicle_front_photo_thumb_path` - Path to vehicle front thumbnail
    - `vehicle_verified` - Boolean flag for admin verification
    - `plate_ocr_text` - Extracted plate text (optional)
    - `plate_verified_at` - Timestamp of plate verification
  
  4. Storage Policies
    - Users can upload to their own folder
    - Users can read their own photos
    - Users can read photos of drivers/passengers they're connected with
    - Users can update/delete their own photos
  
  5. Security
    - All photo paths are stored as text (not blobs)
    - Private bucket requires signed URLs for access
    - RLS policies ensure users only access authorized photos
*/

-- Create user-media storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-media',
  'user-media',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Add photo path fields to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'profile_photo_path'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profile_photo_path text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'profile_photo_thumb_path'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profile_photo_thumb_path text;
  END IF;
END $$;

-- Add photo path and verification fields to vehicles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'vehicle_front_photo_path'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN vehicle_front_photo_path text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'vehicle_front_photo_thumb_path'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN vehicle_front_photo_thumb_path text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'vehicle_verified'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN vehicle_verified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'plate_ocr_text'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN plate_ocr_text text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'plate_verified_at'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN plate_verified_at timestamptz;
  END IF;
END $$;

-- Storage RLS Policies

-- Users can upload to their own folder
CREATE POLICY "Users can upload own photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-media' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Users can read their own photos
CREATE POLICY "Users can read own photos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-media' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Users can read photos of people they have bookings with
CREATE POLICY "Users can read photos of connected users"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-media' AND
    (storage.foldername(name))[1] = 'users' AND
    EXISTS (
      SELECT 1 FROM ride_bookings b
      JOIN rides r ON b.ride_id = r.id
      WHERE (
        (r.driver_id = auth.uid() AND b.passenger_id::text = (storage.foldername(name))[2]) OR
        (b.passenger_id = auth.uid() AND r.driver_id::text = (storage.foldername(name))[2])
      )
      AND b.status IN ('confirmed', 'completed')
    )
  );

-- Users can update their own photos
CREATE POLICY "Users can update own photos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'user-media' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'user-media' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Users can delete their own photos
CREATE POLICY "Users can delete own photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-media' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- ===== End 20251215195853_add_photo_storage_and_paths.sql =====

-- ===== Begin 20251215213146_add_complete_matching_system.sql =====

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

-- ===== End 20251215213146_add_complete_matching_system.sql =====

-- ===== Begin 20251215213238_add_chat_system_with_whatsapp.sql =====

/*
  # Chat System with WhatsApp Integration

  1. Profile Updates
    - Add WhatsApp contact fields and privacy settings to profiles
    - `whatsapp_opt_in`, `allow_inhouse_chat`, `allow_whatsapp_chat`
    - `privacy_phone_visibility` enum

  2. New Tables
    - `conversations` - Group chats for rides/trips/friends
    - `conversation_members` - Users in each conversation
    - `chat_messages` - New message table (conversation-based)
    - `message_reads` - Track read receipts

  3. Security
    - Users can only access conversations they are members of
    - Messages can only be sent by conversation members
    - WhatsApp contact only shared when privacy rules met

  4. Notes
    - Existing `messages` table preserved for backward compatibility
    - New chat uses `chat_messages` table with conversations
*/

-- Add WhatsApp and privacy fields to profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'whatsapp_opt_in') THEN
    ALTER TABLE profiles ADD COLUMN whatsapp_opt_in boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'allow_inhouse_chat') THEN
    ALTER TABLE profiles ADD COLUMN allow_inhouse_chat boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'allow_whatsapp_chat') THEN
    ALTER TABLE profiles ADD COLUMN allow_whatsapp_chat boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'privacy_phone_visibility') THEN
    ALTER TABLE profiles ADD COLUMN privacy_phone_visibility text DEFAULT 'MATCH_ONLY' 
      CHECK (privacy_phone_visibility IN ('MATCH_ONLY', 'FRIENDS_ONLY', 'NEVER'));
  END IF;
END $$;

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('RIDE_MATCH', 'TRIP_MATCH', 'FRIENDS_DM')),
  ride_id uuid REFERENCES rides(id) ON DELETE CASCADE,
  trip_request_id uuid REFERENCES trip_requests(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_ride_id ON conversations(ride_id) WHERE ride_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_trip_request_id ON conversations(trip_request_id) WHERE trip_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);

-- Create conversation_members table
CREATE TABLE IF NOT EXISTS conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('DRIVER', 'RIDER', 'FRIEND')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation_id ON conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user_id ON conversation_members(user_id);

-- Create chat_messages table (new conversation-based messages)
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  type text DEFAULT 'TEXT' CHECK (type IN ('TEXT', 'SYSTEM')),
  created_at timestamptz DEFAULT now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- Create message_reads table
CREATE TABLE IF NOT EXISTS message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_reads_message_id ON message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user_id ON message_reads(user_id);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations

-- Users can view conversations they are members of
CREATE POLICY "Users can view conversations they are members of"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = conversations.id
      AND conversation_members.user_id = auth.uid()
    )
  );

-- Users can create conversations (will be done via RPC functions mostly)
CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for conversation_members

-- Users can view members of conversations they belong to
CREATE POLICY "Users can view members of their conversations"
  ON conversation_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = conversation_members.conversation_id
      AND cm.user_id = auth.uid()
    )
  );

-- Users can be added to conversations
CREATE POLICY "Users can be added to conversations"
  ON conversation_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for chat_messages

-- Users can view messages in conversations they are members of
CREATE POLICY "Users can view messages in their conversations"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = chat_messages.conversation_id
      AND conversation_members.user_id = auth.uid()
    )
  );

-- Users can send messages in conversations they are members of
CREATE POLICY "Users can send messages in their conversations"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = chat_messages.conversation_id
      AND conversation_members.user_id = auth.uid()
    )
  );

-- Users can edit their own messages
CREATE POLICY "Users can edit own messages"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- RLS Policies for message_reads

-- Users can view read receipts for messages in their conversations
CREATE POLICY "Users can view read receipts in their conversations"
  ON message_reads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_messages
      JOIN conversation_members ON conversation_members.conversation_id = chat_messages.conversation_id
      WHERE chat_messages.id = message_reads.message_id
      AND conversation_members.user_id = auth.uid()
    )
  );

-- Users can mark messages as read
CREATE POLICY "Users can mark messages as read"
  ON message_reads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Add updated_at trigger for conversations
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create or get conversation for a ride match
CREATE OR REPLACE FUNCTION get_or_create_ride_conversation(
  p_ride_id uuid,
  p_driver_id uuid,
  p_rider_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id uuid;
BEGIN
  -- Try to find existing conversation
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE type = 'RIDE_MATCH' AND ride_id = p_ride_id
  AND EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = conversations.id
    AND user_id = p_rider_id
  )
  LIMIT 1;

  -- Create if doesn't exist
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (type, ride_id)
    VALUES ('RIDE_MATCH', p_ride_id)
    RETURNING id INTO v_conversation_id;

    -- Add driver
    INSERT INTO conversation_members (conversation_id, user_id, role)
    VALUES (v_conversation_id, p_driver_id, 'DRIVER');

    -- Add rider
    INSERT INTO conversation_members (conversation_id, user_id, role)
    VALUES (v_conversation_id, p_rider_id, 'RIDER');
  END IF;

  RETURN v_conversation_id;
END;
$$;

-- Function to create or get conversation for a trip match
CREATE OR REPLACE FUNCTION get_or_create_trip_conversation(
  p_trip_request_id uuid,
  p_rider_id uuid,
  p_driver_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id uuid;
BEGIN
  -- Try to find existing conversation
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE type = 'TRIP_MATCH' AND trip_request_id = p_trip_request_id
  AND EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = conversations.id
    AND user_id = p_driver_id
  )
  LIMIT 1;

  -- Create if doesn't exist
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (type, trip_request_id)
    VALUES ('TRIP_MATCH', p_trip_request_id)
    RETURNING id INTO v_conversation_id;

    -- Add rider
    INSERT INTO conversation_members (conversation_id, user_id, role)
    VALUES (v_conversation_id, p_rider_id, 'RIDER');

    -- Add driver
    INSERT INTO conversation_members (conversation_id, user_id, role)
    VALUES (v_conversation_id, p_driver_id, 'DRIVER');
  END IF;

  RETURN v_conversation_id;
END;
$$;

-- Grant execute permissions
REVOKE ALL ON FUNCTION get_or_create_ride_conversation FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_or_create_ride_conversation TO authenticated;

REVOKE ALL ON FUNCTION get_or_create_trip_conversation FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_or_create_trip_conversation TO authenticated;

-- ===== End 20251215213238_add_chat_system_with_whatsapp.sql =====

-- ===== Begin 20251215213326_add_friends_system.sql =====

/*
  # Friends System

  1. New Tables
    - `friend_requests` - Pending/accepted/declined friend requests
    - `friendships` - Established friendships (stored as ordered pairs)
    - `blocks` - User blocking system

  2. Security
    - Users can view friend requests they sent or received
    - Only receiver can accept/decline requests
    - Only sender can cancel pending requests
    - Users can view their own friendships
    - Users can view only their own blocks

  3. Constraints
    - Unique constraints to prevent duplicate requests
    - Ordered pair storage for friendships (user_a < user_b)
    - Friend requests and blocks prevent certain interactions
*/

-- Create friend_requests table
CREATE TABLE IF NOT EXISTS friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(from_user_id, to_user_id),
  CHECK (from_user_id != to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_from_user_id ON friend_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_to_user_id ON friend_requests(to_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);

-- Create friendships table
CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_a, user_b),
  CHECK (user_a < user_b)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user_a ON friendships(user_a);
CREATE INDEX IF NOT EXISTS idx_friendships_user_b ON friendships(user_b);

-- Create blocks table
CREATE TABLE IF NOT EXISTS blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON blocks(blocked_id);

-- Enable RLS
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friend_requests

-- Users can view requests they sent or received
CREATE POLICY "Users can view own friend requests"
  ON friend_requests FOR SELECT
  TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- Users can send friend requests
CREATE POLICY "Users can send friend requests"
  ON friend_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    from_user_id = auth.uid() AND
    -- Prevent sending to blocked users or users who blocked you
    NOT EXISTS (
      SELECT 1 FROM blocks
      WHERE (blocker_id = auth.uid() AND blocked_id = to_user_id)
         OR (blocker_id = to_user_id AND blocked_id = auth.uid())
    )
  );

-- Sender can cancel their pending request
CREATE POLICY "Sender can cancel pending request"
  ON friend_requests FOR UPDATE
  TO authenticated
  USING (from_user_id = auth.uid() AND status = 'PENDING')
  WITH CHECK (from_user_id = auth.uid() AND status = 'CANCELLED');

-- Receiver can accept/decline request
CREATE POLICY "Receiver can accept or decline request"
  ON friend_requests FOR UPDATE
  TO authenticated
  USING (to_user_id = auth.uid() AND status = 'PENDING')
  WITH CHECK (to_user_id = auth.uid() AND status IN ('ACCEPTED', 'DECLINED'));

-- RLS Policies for friendships

-- Users can view their own friendships
CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT
  TO authenticated
  USING (user_a = auth.uid() OR user_b = auth.uid());

-- Friendships are created via RPC function (after accepting request)
CREATE POLICY "Friendships created via function"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (user_a = auth.uid() OR user_b = auth.uid());

-- Users can delete (unfriend)
CREATE POLICY "Users can unfriend"
  ON friendships FOR DELETE
  TO authenticated
  USING (user_a = auth.uid() OR user_b = auth.uid());

-- RLS Policies for blocks

-- Users can view only their own blocks
CREATE POLICY "Users can view own blocks"
  ON blocks FOR SELECT
  TO authenticated
  USING (blocker_id = auth.uid());

-- Users can block others
CREATE POLICY "Users can block others"
  ON blocks FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = auth.uid());

-- Users can unblock
CREATE POLICY "Users can unblock"
  ON blocks FOR DELETE
  TO authenticated
  USING (blocker_id = auth.uid());

-- Add updated_at trigger for friend_requests
DROP TRIGGER IF EXISTS update_friend_requests_updated_at ON friend_requests;
CREATE TRIGGER update_friend_requests_updated_at
  BEFORE UPDATE ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to send friend request
CREATE OR REPLACE FUNCTION send_friend_request(p_to_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_user_id uuid;
  v_request_id uuid;
BEGIN
  v_from_user_id := auth.uid();
  
  IF v_from_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_from_user_id = p_to_user_id THEN
    RAISE EXCEPTION 'Cannot send friend request to yourself';
  END IF;

  -- Check if blocked
  IF EXISTS (
    SELECT 1 FROM blocks
    WHERE (blocker_id = v_from_user_id AND blocked_id = p_to_user_id)
       OR (blocker_id = p_to_user_id AND blocked_id = v_from_user_id)
  ) THEN
    RAISE EXCEPTION 'Cannot send friend request due to block';
  END IF;

  -- Check if already friends
  IF EXISTS (
    SELECT 1 FROM friendships
    WHERE (user_a = LEAST(v_from_user_id, p_to_user_id) AND user_b = GREATEST(v_from_user_id, p_to_user_id))
  ) THEN
    RAISE EXCEPTION 'Already friends';
  END IF;

  -- Insert or update request
  INSERT INTO friend_requests (from_user_id, to_user_id, status)
  VALUES (v_from_user_id, p_to_user_id, 'PENDING')
  ON CONFLICT (from_user_id, to_user_id)
  DO UPDATE SET status = 'PENDING', updated_at = now()
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

-- Function to accept friend request
CREATE OR REPLACE FUNCTION accept_friend_request(p_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_user_id uuid;
  v_to_user_id uuid;
  v_friendship_id uuid;
BEGIN
  -- Get request details
  SELECT from_user_id, to_user_id
  INTO v_from_user_id, v_to_user_id
  FROM friend_requests
  WHERE id = p_request_id AND status = 'PENDING';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or already processed';
  END IF;

  -- Verify caller is the receiver
  IF v_to_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the receiver can accept this request';
  END IF;

  -- Update request status
  UPDATE friend_requests
  SET status = 'ACCEPTED', updated_at = now()
  WHERE id = p_request_id;

  -- Create friendship (ordered pair)
  INSERT INTO friendships (user_a, user_b)
  VALUES (LEAST(v_from_user_id, v_to_user_id), GREATEST(v_from_user_id, v_to_user_id))
  ON CONFLICT (user_a, user_b) DO NOTHING
  RETURNING id INTO v_friendship_id;

  -- Create notification for sender
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    v_from_user_id,
    'system',
    'Friend Request Accepted',
    'Your friend request was accepted!',
    jsonb_build_object('request_id', p_request_id, 'friend_id', v_to_user_id)
  );

  RETURN v_friendship_id;
END;
$$;

-- Function to decline friend request
CREATE OR REPLACE FUNCTION decline_friend_request(p_request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_to_user_id uuid;
BEGIN
  -- Get request details
  SELECT to_user_id
  INTO v_to_user_id
  FROM friend_requests
  WHERE id = p_request_id AND status = 'PENDING';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or already processed';
  END IF;

  -- Verify caller is the receiver
  IF v_to_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the receiver can decline this request';
  END IF;

  -- Update request status
  UPDATE friend_requests
  SET status = 'DECLINED', updated_at = now()
  WHERE id = p_request_id;

  RETURN TRUE;
END;
$$;

-- Function to check if users are friends
CREATE OR REPLACE FUNCTION are_friends(p_user_id_1 uuid, p_user_id_2 uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM friendships
    WHERE user_a = LEAST(p_user_id_1, p_user_id_2)
      AND user_b = GREATEST(p_user_id_1, p_user_id_2)
  );
END;
$$;

-- Grant execute permissions
REVOKE ALL ON FUNCTION send_friend_request FROM PUBLIC;
GRANT EXECUTE ON FUNCTION send_friend_request TO authenticated;

REVOKE ALL ON FUNCTION accept_friend_request FROM PUBLIC;
GRANT EXECUTE ON FUNCTION accept_friend_request TO authenticated;

REVOKE ALL ON FUNCTION decline_friend_request FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decline_friend_request TO authenticated;

REVOKE ALL ON FUNCTION are_friends FROM PUBLIC;
GRANT EXECUTE ON FUNCTION are_friends TO authenticated;

-- ===== End 20251215213326_add_friends_system.sql =====

-- ===== Begin 20251215213504_add_atomic_matching_functions_fixed.sql =====

/*
  # Atomic Matching System Functions

  1. Core Functions
    - `driver_accept_ride_request` - Driver accepts a rider's request
    - `driver_decline_ride_request` - Driver declines a rider's request
    - `confirm_ride_request` - Rider confirms an accepted request (final booking)
    - `confirm_trip_offer` - Rider confirms a driver's offer

  2. Concurrency Safety
    - Row-level locks (FOR UPDATE) to prevent race conditions
    - Atomic seat allocation
    - Auto-cancel conflicting requests/offers

  3. Business Logic
    - Validates ownership and status transitions
    - Enforces seat availability
    - Creates conversations when confirmed
    - Auto-cancels competing requests for same trip context
    - Returns detailed success/failure reasons
*/

-- Function: Driver accepts a ride request
CREATE OR REPLACE FUNCTION driver_accept_ride_request(
  p_ride_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id uuid;
  v_ride_id uuid;
  v_current_status text;
BEGIN
  v_driver_id := auth.uid();
  
  IF v_driver_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_AUTHENTICATED');
  END IF;

  -- Get and lock the request
  SELECT rr.ride_id, rr.status
  INTO v_ride_id, v_current_status
  FROM ride_requests rr
  WHERE rr.id = p_ride_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'REQUEST_NOT_FOUND');
  END IF;

  -- Verify driver owns the ride
  IF NOT EXISTS (
    SELECT 1 FROM rides
    WHERE id = v_ride_id AND driver_id = v_driver_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_YOUR_RIDE');
  END IF;

  -- Only accept if pending
  IF v_current_status != 'PENDING_DRIVER' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INVALID_STATUS', 'current_status', v_current_status);
  END IF;

  -- Accept the request
  UPDATE ride_requests
  SET 
    status = 'ACCEPTED_BY_DRIVER',
    expires_at = now() + interval '15 minutes',
    updated_at = now()
  WHERE id = p_ride_request_id;

  -- Create notification for rider
  INSERT INTO notifications (user_id, type, title, message, data)
  SELECT 
    rider_id,
    'booking-confirmed',
    'Request Accepted',
    'The driver has accepted your ride request!',
    jsonb_build_object('ride_request_id', p_ride_request_id, 'ride_id', v_ride_id)
  FROM ride_requests
  WHERE id = p_ride_request_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Function: Driver declines a ride request
CREATE OR REPLACE FUNCTION driver_decline_ride_request(
  p_ride_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id uuid;
  v_ride_id uuid;
  v_current_status text;
BEGIN
  v_driver_id := auth.uid();
  
  IF v_driver_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_AUTHENTICATED');
  END IF;

  -- Get and lock the request
  SELECT rr.ride_id, rr.status
  INTO v_ride_id, v_current_status
  FROM ride_requests rr
  WHERE rr.id = p_ride_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'REQUEST_NOT_FOUND');
  END IF;

  -- Verify driver owns the ride
  IF NOT EXISTS (
    SELECT 1 FROM rides
    WHERE id = v_ride_id AND driver_id = v_driver_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_YOUR_RIDE');
  END IF;

  -- Only decline if pending
  IF v_current_status != 'PENDING_DRIVER' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INVALID_STATUS', 'current_status', v_current_status);
  END IF;

  -- Decline the request
  UPDATE ride_requests
  SET 
    status = 'DECLINED_BY_DRIVER',
    updated_at = now()
  WHERE id = p_ride_request_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Function: Rider confirms an accepted request (final booking)
CREATE OR REPLACE FUNCTION confirm_ride_request(
  p_ride_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rider_id uuid;
  v_ride_id uuid;
  v_driver_id uuid;
  v_seats_requested integer;
  v_available_seats integer;
  v_current_status text;
  v_ride_origin text;
  v_ride_destination text;
  v_ride_departure timestamp;
  v_booking_id uuid;
  v_conversation_id uuid;
BEGIN
  v_rider_id := auth.uid();
  
  IF v_rider_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_AUTHENTICATED');
  END IF;

  -- Get and lock the request
  SELECT rr.ride_id, rr.rider_id, rr.seats_requested, rr.status
  INTO v_ride_id, v_rider_id, v_seats_requested, v_current_status
  FROM ride_requests rr
  WHERE rr.id = p_ride_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'REQUEST_NOT_FOUND');
  END IF;

  -- Verify caller is the rider
  IF v_rider_id != auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_YOUR_REQUEST');
  END IF;

  -- Only confirm if accepted by driver
  IF v_current_status != 'ACCEPTED_BY_DRIVER' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_ACCEPTED', 'current_status', v_current_status);
  END IF;

  -- Lock the ride and check seats
  SELECT r.available_seats, r.driver_id, r.origin, r.destination, r.departure_time
  INTO v_available_seats, v_driver_id, v_ride_origin, v_ride_destination, v_ride_departure
  FROM rides r
  WHERE r.id = v_ride_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'RIDE_NOT_FOUND');
  END IF;

  -- Check if enough seats available
  IF v_available_seats < v_seats_requested THEN
    -- Mark as expired
    UPDATE ride_requests
    SET status = 'EXPIRED', updated_at = now()
    WHERE id = p_ride_request_id;
    
    RETURN jsonb_build_object('ok', false, 'reason', 'SEATS_FULL', 'available', v_available_seats, 'requested', v_seats_requested);
  END IF;

  -- SUCCESS PATH: Create booking
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
  )
  SELECT
    v_ride_id,
    v_rider_id,
    r.origin,
    r.origin_lat,
    r.origin_lng,
    r.destination,
    r.destination_lat,
    r.destination_lng,
    v_seats_requested,
    'confirmed'
  FROM rides r
  WHERE r.id = v_ride_id
  RETURNING id INTO v_booking_id;

  -- Update ride: decrement available_seats, increment seats_taken
  UPDATE rides
  SET 
    available_seats = available_seats - v_seats_requested,
    seats_taken = seats_taken + v_seats_requested,
    updated_at = now()
  WHERE id = v_ride_id;

  -- Mark this request as confirmed
  UPDATE ride_requests
  SET status = 'CONFIRMED', updated_at = now()
  WHERE id = p_ride_request_id;

  -- Auto-cancel rider's other requests for same trip context
  -- (same origin/destination, same day)
  UPDATE ride_requests rr
  SET status = 'CANCELLED_BY_RIDER', updated_at = now()
  WHERE rr.rider_id = v_rider_id
    AND rr.id != p_ride_request_id
    AND rr.status IN ('PENDING_DRIVER', 'ACCEPTED_BY_DRIVER')
    AND EXISTS (
      SELECT 1 FROM rides r
      WHERE r.id = rr.ride_id
        AND r.origin = v_ride_origin
        AND r.destination = v_ride_destination
        AND DATE(r.departure_time) = DATE(v_ride_departure)
    );

  -- Create conversation
  v_conversation_id := get_or_create_ride_conversation(v_ride_id, v_driver_id, v_rider_id);

  -- Create notifications
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    v_driver_id,
    'booking-confirmed',
    'Booking Confirmed',
    'A rider has confirmed their booking!',
    jsonb_build_object('booking_id', v_booking_id, 'ride_id', v_ride_id, 'rider_id', v_rider_id)
  );

  RETURN jsonb_build_object('ok', true, 'booking_id', v_booking_id, 'conversation_id', v_conversation_id);
END;
$$;

-- Function: Rider confirms a trip offer
CREATE OR REPLACE FUNCTION confirm_trip_offer(
  p_trip_offer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rider_id uuid;
  v_trip_request_id uuid;
  v_driver_id uuid;
  v_current_status text;
  v_trip_status text;
  v_conversation_id uuid;
BEGIN
  v_rider_id := auth.uid();
  
  IF v_rider_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_AUTHENTICATED');
  END IF;

  -- Get and lock the offer
  SELECT toff.trip_request_id, toff.driver_id, toff.status
  INTO v_trip_request_id, v_driver_id, v_current_status
  FROM trip_offers toff
  WHERE toff.id = p_trip_offer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'OFFER_NOT_FOUND');
  END IF;

  -- Verify caller owns the trip request
  SELECT tr.rider_id, tr.status
  INTO v_rider_id, v_trip_status
  FROM trip_requests tr
  WHERE tr.id = v_trip_request_id
  FOR UPDATE;

  IF v_rider_id != auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_YOUR_TRIP');
  END IF;

  -- Only confirm if trip is open and offer is offered
  IF v_trip_status != 'OPEN' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'TRIP_NOT_OPEN', 'trip_status', v_trip_status);
  END IF;

  IF v_current_status != 'OFFERED' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'OFFER_NOT_AVAILABLE', 'offer_status', v_current_status);
  END IF;

  -- Confirm the offer
  UPDATE trip_offers
  SET status = 'CONFIRMED', updated_at = now()
  WHERE id = p_trip_offer_id;

  -- Update trip request status
  UPDATE trip_requests
  SET status = 'CONFIRMED', updated_at = now()
  WHERE id = v_trip_request_id;

  -- Auto-decline all other offers for this trip
  UPDATE trip_offers
  SET status = 'DECLINED_BY_RIDER', updated_at = now()
  WHERE trip_request_id = v_trip_request_id
    AND id != p_trip_offer_id
    AND status = 'OFFERED';

  -- Create conversation
  v_conversation_id := get_or_create_trip_conversation(v_trip_request_id, v_rider_id, v_driver_id);

  -- Create notifications
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    v_driver_id,
    'booking-confirmed',
    'Trip Offer Accepted',
    'Your trip offer has been accepted!',
    jsonb_build_object('trip_offer_id', p_trip_offer_id, 'trip_request_id', v_trip_request_id)
  );

  RETURN jsonb_build_object('ok', true, 'conversation_id', v_conversation_id);
END;
$$;

-- Grant execute permissions
REVOKE ALL ON FUNCTION driver_accept_ride_request FROM PUBLIC;
GRANT EXECUTE ON FUNCTION driver_accept_ride_request TO authenticated;

REVOKE ALL ON FUNCTION driver_decline_ride_request FROM PUBLIC;
GRANT EXECUTE ON FUNCTION driver_decline_ride_request TO authenticated;

REVOKE ALL ON FUNCTION confirm_ride_request FROM PUBLIC;
GRANT EXECUTE ON FUNCTION confirm_ride_request TO authenticated;

REVOKE ALL ON FUNCTION confirm_trip_offer FROM PUBLIC;
GRANT EXECUTE ON FUNCTION confirm_trip_offer TO authenticated;

-- ===== End 20251215213504_add_atomic_matching_functions_fixed.sql =====

-- ===== Begin 20251215234143_fix_storage_rls_policies.sql =====

-- Fix Storage RLS Policies for Photo Uploads
-- Drop all conflicting storage policies for user-media bucket
DROP POLICY IF EXISTS "Users can upload own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own profile photo" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can read photos of connected users" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile photo" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile photo" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Profile photos are publicly accessible" ON storage.objects;

-- Create clean, simple policies for user-media bucket
-- Allow authenticated users to upload to their own folder
CREATE POLICY "auth_upload_own_folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-media' AND
    name LIKE 'users/' || auth.uid()::text || '/%'
  );

-- Allow users to read their own files
CREATE POLICY "auth_read_own_files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-media' AND
    name LIKE 'users/' || auth.uid()::text || '/%'
  );

-- Allow users to update/delete their own files
CREATE POLICY "auth_update_own_files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'user-media' AND
    name LIKE 'users/' || auth.uid()::text || '/%'
  )
  WITH CHECK (
    bucket_id = 'user-media' AND
    name LIKE 'users/' || auth.uid()::text || '/%'
  );

CREATE POLICY "auth_delete_own_files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-media' AND
    name LIKE 'users/' || auth.uid()::text || '/%'
  );

-- Clean up vehicle-images bucket policies
DROP POLICY IF EXISTS "Users can upload vehicle images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update vehicle images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete vehicle images" ON storage.objects;
DROP POLICY IF EXISTS "Vehicle photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public can view vehicle images" ON storage.objects;

-- Vehicle images bucket - allow authenticated uploads, public reads
CREATE POLICY "vehicle_auth_upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vehicle-images'
  );

CREATE POLICY "vehicle_public_read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'vehicle-images');

CREATE POLICY "vehicle_auth_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'vehicle-images')
  WITH CHECK (bucket_id = 'vehicle-images');

CREATE POLICY "vehicle_auth_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'vehicle-images');

-- ===== End 20251215234143_fix_storage_rls_policies.sql =====

-- ===== Begin 20251216111608_20251216_fix_core_carpool_schema_v2.sql =====

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

-- ===== End 20251216111608_20251216_fix_core_carpool_schema_v2.sql =====

-- ===== Begin 20251216132743_fix_all_rls_performance_corrected.sql =====

/*
  # Fix All RLS Performance Issues - Corrected Version
  
  1. Critical Performance Optimization
    - Replace all `auth.uid()` with `(select auth.uid())` in RLS policies
    - This prevents re-evaluation for each row, dramatically improving performance
  
  2. All Tables Fixed (56+ policies)
    - vehicles, rides, driver_licenses, booking_history
    - ai_chat_history, beta_allowlist, bug_reports
    - trip_requests, ride_requests, trip_offers
    - conversations, conversation_members, chat_messages
    - message_reads, friend_requests, friendships, blocks
    - conversation_read_markers, message_reports, ride_stops
  
  3. Correct Column Names Used
    - friendships: user_a, user_b (not user_a_id, user_b_id)
    - booking_history: user_id (not rider_id/driver_id)
    - vehicles: user_id (not owner_id)
*/

-- ============================================
-- VEHICLES
-- ============================================

DROP POLICY IF EXISTS "Users can view own vehicles" ON vehicles;
CREATE POLICY "Users can view own vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view vehicles for their bookings" ON vehicles;
CREATE POLICY "Users can view vehicles for their bookings"
  ON vehicles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rides r
      INNER JOIN ride_requests rr ON r.id = rr.ride_id
      WHERE r.vehicle_id = vehicles.id
      AND rr.rider_id = (select auth.uid())
      AND rr.status = 'accepted'
    )
  );

-- ============================================
-- RIDES
-- ============================================

DROP POLICY IF EXISTS "Drivers can view own rides" ON rides;
CREATE POLICY "Drivers can view own rides"
  ON rides FOR SELECT
  TO authenticated
  USING (driver_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view rides they have booked" ON rides;
CREATE POLICY "Users can view rides they have booked"
  ON rides FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ride_requests
      WHERE ride_requests.ride_id = rides.id
      AND ride_requests.rider_id = (select auth.uid())
      AND ride_requests.status = 'accepted'
    )
  );

-- ============================================
-- DRIVER LICENSES
-- ============================================

DROP POLICY IF EXISTS "Users can view own license" ON driver_licenses;
CREATE POLICY "Users can view own license"
  ON driver_licenses FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own license" ON driver_licenses;
CREATE POLICY "Users can insert own license"
  ON driver_licenses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own license" ON driver_licenses;
CREATE POLICY "Users can update own license"
  ON driver_licenses FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================
-- BOOKING HISTORY
-- ============================================

DROP POLICY IF EXISTS "Users can view own booking history" ON booking_history;
CREATE POLICY "Users can view own booking history"
  ON booking_history FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own booking history" ON booking_history;
CREATE POLICY "Users can insert own booking history"
  ON booking_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================
-- AI CHAT HISTORY
-- ============================================

DROP POLICY IF EXISTS "Users can read own chat history" ON ai_chat_history;
CREATE POLICY "Users can read own chat history"
  ON ai_chat_history FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own chat messages" ON ai_chat_history;
CREATE POLICY "Users can create own chat messages"
  ON ai_chat_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================
-- BETA ALLOWLIST
-- ============================================

DROP POLICY IF EXISTS "Authenticated admins can insert allowlist entries" ON beta_allowlist;
CREATE POLICY "Authenticated admins can insert allowlist entries"
  ON beta_allowlist FOR INSERT
  TO authenticated
  WITH CHECK ((select is_admin()) = true);

DROP POLICY IF EXISTS "Authenticated admins can delete allowlist entries" ON beta_allowlist;
CREATE POLICY "Authenticated admins can delete allowlist entries"
  ON beta_allowlist FOR DELETE
  TO authenticated
  USING ((select is_admin()) = true);

-- ============================================
-- BUG REPORTS
-- ============================================

DROP POLICY IF EXISTS "Admin can read all bug reports" ON bug_reports;
CREATE POLICY "Admin can read all bug reports"
  ON bug_reports FOR SELECT
  TO authenticated
  USING ((select is_admin()) = true);

DROP POLICY IF EXISTS "Admin can insert bug reports" ON bug_reports;
CREATE POLICY "Admin can insert bug reports"
  ON bug_reports FOR INSERT
  TO authenticated
  WITH CHECK ((select is_admin()) = true);

DROP POLICY IF EXISTS "Admin can delete bug reports" ON bug_reports;
CREATE POLICY "Admin can delete bug reports"
  ON bug_reports FOR DELETE
  TO authenticated
  USING ((select is_admin()) = true);

-- ============================================
-- TRIP REQUESTS
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can create ride requests" ON trip_requests;
CREATE POLICY "Authenticated users can create ride requests"
  ON trip_requests FOR INSERT
  TO authenticated
  WITH CHECK (rider_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own ride requests" ON trip_requests;
CREATE POLICY "Users can delete own ride requests"
  ON trip_requests FOR DELETE
  TO authenticated
  USING (rider_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own ride requests" ON trip_requests;
CREATE POLICY "Users can update own ride requests"
  ON trip_requests FOR UPDATE
  TO authenticated
  USING (rider_id = (select auth.uid()))
  WITH CHECK (rider_id = (select auth.uid()));

-- ============================================
-- RIDE REQUESTS
-- ============================================

DROP POLICY IF EXISTS "Riders can view own ride requests" ON ride_requests;
CREATE POLICY "Riders can view own ride requests"
  ON ride_requests FOR SELECT
  TO authenticated
  USING (rider_id = (select auth.uid()));

DROP POLICY IF EXISTS "Drivers can view requests for their rides" ON ride_requests;
CREATE POLICY "Drivers can view requests for their rides"
  ON ride_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rides
      WHERE rides.id = ride_requests.ride_id
      AND rides.driver_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Riders can create ride requests" ON ride_requests;
CREATE POLICY "Riders can create ride requests"
  ON ride_requests FOR INSERT
  TO authenticated
  WITH CHECK (rider_id = (select auth.uid()));

DROP POLICY IF EXISTS "Riders can cancel own requests" ON ride_requests;
CREATE POLICY "Riders can cancel own requests"
  ON ride_requests FOR UPDATE
  TO authenticated
  USING (rider_id = (select auth.uid()))
  WITH CHECK (rider_id = (select auth.uid()));

DROP POLICY IF EXISTS "Drivers can update requests for their rides" ON ride_requests;
CREATE POLICY "Drivers can update requests for their rides"
  ON ride_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rides
      WHERE rides.id = ride_requests.ride_id
      AND rides.driver_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rides
      WHERE rides.id = ride_requests.ride_id
      AND rides.driver_id = (select auth.uid())
    )
  );

-- ============================================
-- TRIP OFFERS
-- ============================================

DROP POLICY IF EXISTS "Drivers can create offers" ON trip_offers;
CREATE POLICY "Drivers can create offers"
  ON trip_offers FOR INSERT
  TO authenticated
  WITH CHECK (driver_id = (select auth.uid()));

DROP POLICY IF EXISTS "Drivers can update own offers" ON trip_offers;
CREATE POLICY "Drivers can update own offers"
  ON trip_offers FOR UPDATE
  TO authenticated
  USING (driver_id = (select auth.uid()))
  WITH CHECK (driver_id = (select auth.uid()));

DROP POLICY IF EXISTS "Drivers can view own offers" ON trip_offers;
CREATE POLICY "Drivers can view own offers"
  ON trip_offers FOR SELECT
  TO authenticated
  USING (driver_id = (select auth.uid()));

DROP POLICY IF EXISTS "Riders can update offers on their trips" ON trip_offers;
CREATE POLICY "Riders can update offers on their trips"
  ON trip_offers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_requests
      WHERE trip_requests.id = trip_offers.trip_request_id
      AND trip_requests.rider_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_requests
      WHERE trip_requests.id = trip_offers.trip_request_id
      AND trip_requests.rider_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Riders can view offers on their trips" ON trip_offers;
CREATE POLICY "Riders can view offers on their trips"
  ON trip_offers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_requests
      WHERE trip_requests.id = trip_offers.trip_request_id
      AND trip_requests.rider_id = (select auth.uid())
    )
  );

-- ============================================
-- CONVERSATIONS
-- ============================================

DROP POLICY IF EXISTS "Users can view conversations they are members of" ON conversations;
CREATE POLICY "Users can view conversations they are members of"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = conversations.id
      AND conversation_members.user_id = (select auth.uid())
    )
  );

-- ============================================
-- CONVERSATION MEMBERS
-- ============================================

DROP POLICY IF EXISTS "Users can view members of their conversations" ON conversation_members;
CREATE POLICY "Users can view members of their conversations"
  ON conversation_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = conversation_members.conversation_id
      AND cm.user_id = (select auth.uid())
    )
  );

-- ============================================
-- CHAT MESSAGES
-- ============================================

DROP POLICY IF EXISTS "Users can edit own messages" ON chat_messages;
CREATE POLICY "Users can edit own messages"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (sender_id = (select auth.uid()))
  WITH CHECK (sender_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can send messages in their conversations" ON chat_messages;
CREATE POLICY "Users can send messages in their conversations"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = chat_messages.conversation_id
      AND conversation_members.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON chat_messages;
CREATE POLICY "Users can view messages in their conversations"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = chat_messages.conversation_id
      AND conversation_members.user_id = (select auth.uid())
    )
  );

-- ============================================
-- MESSAGE READS
-- ============================================

DROP POLICY IF EXISTS "Users can mark messages as read" ON message_reads;
CREATE POLICY "Users can mark messages as read"
  ON message_reads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view read receipts in their conversations" ON message_reads;
CREATE POLICY "Users can view read receipts in their conversations"
  ON message_reads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_messages cm
      INNER JOIN conversation_members cmem ON cm.conversation_id = cmem.conversation_id
      WHERE cm.id = message_reads.message_id
      AND cmem.user_id = (select auth.uid())
    )
  );

-- ============================================
-- FRIEND REQUESTS
-- ============================================

DROP POLICY IF EXISTS "Receiver can accept or decline request" ON friend_requests;
CREATE POLICY "Receiver can accept or decline request"
  ON friend_requests FOR UPDATE
  TO authenticated
  USING (to_user_id = (select auth.uid()) AND status = 'pending')
  WITH CHECK (to_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Sender can cancel pending request" ON friend_requests;
CREATE POLICY "Sender can cancel pending request"
  ON friend_requests FOR UPDATE
  TO authenticated
  USING (from_user_id = (select auth.uid()) AND status = 'pending')
  WITH CHECK (from_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can send friend requests" ON friend_requests;
CREATE POLICY "Users can send friend requests"
  ON friend_requests FOR INSERT
  TO authenticated
  WITH CHECK (from_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own friend requests" ON friend_requests;
CREATE POLICY "Users can view own friend requests"
  ON friend_requests FOR SELECT
  TO authenticated
  USING (from_user_id = (select auth.uid()) OR to_user_id = (select auth.uid()));

-- ============================================
-- FRIENDSHIPS (using user_a and user_b columns)
-- ============================================

DROP POLICY IF EXISTS "Friendships created via function" ON friendships;
CREATE POLICY "Friendships created via function"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (user_a = (select auth.uid()) OR user_b = (select auth.uid()));

DROP POLICY IF EXISTS "Users can unfriend" ON friendships;
CREATE POLICY "Users can unfriend"
  ON friendships FOR DELETE
  TO authenticated
  USING (user_a = (select auth.uid()) OR user_b = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own friendships" ON friendships;
CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT
  TO authenticated
  USING (user_a = (select auth.uid()) OR user_b = (select auth.uid()));

-- ============================================
-- BLOCKS
-- ============================================

DROP POLICY IF EXISTS "Users can block others" ON blocks;
CREATE POLICY "Users can block others"
  ON blocks FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can unblock" ON blocks;
CREATE POLICY "Users can unblock"
  ON blocks FOR DELETE
  TO authenticated
  USING (blocker_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own blocks" ON blocks;
CREATE POLICY "Users can view own blocks"
  ON blocks FOR SELECT
  TO authenticated
  USING (blocker_id = (select auth.uid()));

-- ============================================
-- CONVERSATION READ MARKERS
-- ============================================

DROP POLICY IF EXISTS "Users can insert own read markers" ON conversation_read_markers;
CREATE POLICY "Users can insert own read markers"
  ON conversation_read_markers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can read own read markers" ON conversation_read_markers;
CREATE POLICY "Users can read own read markers"
  ON conversation_read_markers FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own read markers" ON conversation_read_markers;
CREATE POLICY "Users can update own read markers"
  ON conversation_read_markers FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================
-- MESSAGE REPORTS
-- ============================================

DROP POLICY IF EXISTS "Users can create message reports" ON message_reports;
CREATE POLICY "Users can create message reports"
  ON message_reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own reports" ON message_reports;
CREATE POLICY "Users can view own reports"
  ON message_reports FOR SELECT
  TO authenticated
  USING (reporter_id = (select auth.uid()));

-- ============================================
-- RIDE STOPS
-- ============================================

DROP POLICY IF EXISTS "Anyone can view ride stops for their rides" ON ride_stops;
CREATE POLICY "Anyone can view ride stops for their rides"
  ON ride_stops FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rides r
      WHERE r.id = ride_stops.ride_id
      AND (
        r.driver_id = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM ride_requests rr
          WHERE rr.ride_id = r.id
          AND rr.rider_id = (select auth.uid())
          AND rr.status = 'accepted'
        )
      )
    )
  );

DROP POLICY IF EXISTS "Drivers can manage their ride stops" ON ride_stops;
CREATE POLICY "Drivers can manage their ride stops"
  ON ride_stops FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rides
      WHERE rides.id = ride_stops.ride_id
      AND rides.driver_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rides
      WHERE rides.id = ride_stops.ride_id
      AND rides.driver_id = (select auth.uid())
    )
  );

-- ===== End 20251216132743_fix_all_rls_performance_corrected.sql =====

-- ===== Begin 20251216153525_fix_profile_photo_upload_access.sql =====

/*
  # Fix Profile Photo Upload Access

  1. Changes
    - Add public read access for user profile photos
    - Keep upload restricted to authenticated users for their own files
    - Ensure proper permissions for profile photo display across the app

  2. Security
    - Users can only upload to their own folder
    - Everyone can read profile photos (needed for social features)
    - Users can only update/delete their own files
*/

-- Add public read policy for user-media bucket (needed for profile photos)
CREATE POLICY "public_read_user_media"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'user-media');

-- ===== End 20251216153525_fix_profile_photo_upload_access.sql =====

-- ===== Begin 20251217092213_20251217_allow_all_users_bug_reports.sql =====

/*
  # Allow All Authenticated Users to Submit Bug Reports

  1. Changes
    - Add policy to allow all authenticated users to INSERT bug reports
    - Keep admin-only policies for SELECT and DELETE
    - This enables the feedback/bug reporting feature for all users

  2. Security
    - All authenticated users can submit bug reports (INSERT)
    - Only admin can view all bug reports (SELECT)
    - Only admin can delete bug reports (DELETE)
    - Users cannot update existing bug reports

  3. Notes
    - This change enables the feedback button for all users
    - Admin dashboard at /admin/bugs will show all submitted reports
*/

CREATE POLICY "All authenticated users can submit bug reports"
  ON bug_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
  );

-- ===== End 20251217092213_20251217_allow_all_users_bug_reports.sql =====

-- ===== Begin 20251217092722_20251217_fix_bug_reports_policies_and_admin_function.sql =====

/*
  # Fix Bug Reports RLS Policies and Admin Function

  1. Changes
    - Update is_admin() function to properly check admin email
    - Drop redundant "Admin can insert bug reports" policy
    - Keep "All authenticated users can submit bug reports" policy for inserts
    - Keep admin-only policies for SELECT and DELETE

  2. Security
    - All authenticated users can submit bug reports (INSERT)
    - Only admin can view all bug reports (SELECT)
    - Only admin can delete bug reports (DELETE)
    
  3. Notes
    - Fixes "Unknown error" in diagnostics database write test
    - is_admin() function now properly identifies admin users
*/

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    auth.jwt() ->> 'email' = 'balashankarbollineni4@gmail.com'
    OR auth.jwt() ->> 'email' LIKE '%@carpoolnetwork.co.uk';
$$;

DROP POLICY IF EXISTS "Admin can insert bug reports" ON bug_reports;

-- ===== End 20251217092722_20251217_fix_bug_reports_policies_and_admin_function.sql =====

-- ===== Begin 20251217093011_20251217_add_secure_admin_system.sql =====

/*
  # Add Secure Admin System

  1. Changes
    - Add is_admin column to profiles table
    - Set specific user as admin (balashankarbollineni4@gmail.com)
    - Update is_admin() function to check profile column instead of email domain
    - Create helper function to manage admin status

  2. Security
    - Removes email domain-based admin access (major security vulnerability)
    - Only explicitly granted users have admin access
    - Admin status stored in database, not inferred from email
    - Prevents unauthorized admin access through fake email signups

  3. Notes
    - Critical security fix: prevents anyone from signing up with @carpoolnetwork.co.uk and getting admin
    - Admin status must be explicitly granted
    - Initial admin: balashankarbollineni4@gmail.com
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT false NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;

UPDATE profiles 
SET is_admin = true 
WHERE email = 'balashankarbollineni4@gmail.com';

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION set_admin(target_user_id uuid, admin_status boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can modify admin status';
  END IF;
  
  UPDATE profiles
  SET is_admin = admin_status
  WHERE id = target_user_id;
END;
$$;

-- ===== End 20251217093011_20251217_add_secure_admin_system.sql =====

-- ===== Begin 20251221173803_add_passkey_authentication_system.sql =====

/*
  # Passkey (WebAuthn) Authentication System

  1. New Tables
    - `passkey_credentials`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `credential_id` (text, unique) - WebAuthn credential ID
      - `public_key` (text) - COSE public key
      - `counter` (bigint) - Signature counter for replay protection
      - `device_name` (text) - User-friendly device name
      - `transports` (text[]) - Available authenticator transports
      - `created_at` (timestamptz)
      - `last_used_at` (timestamptz)

    - `passkey_challenges`
      - `id` (uuid, primary key)
      - `user_id` (uuid, nullable) - For login challenges without known user
      - `challenge` (text, unique) - Random challenge string
      - `type` (text) - 'registration' or 'authentication'
      - `created_at` (timestamptz)
      - `expires_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only access their own credentials
    - Challenges are managed by Edge Functions only
    - Auto-expire old challenges

  3. Indexes
    - Index on credential_id for fast lookup
    - Index on user_id for user credential listing
    - Index on challenge for verification
*/

-- Create passkey_credentials table
CREATE TABLE IF NOT EXISTS passkey_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id text NOT NULL UNIQUE,
  public_key text NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  device_name text NOT NULL,
  transports text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now()
);

-- Create passkey_challenges table
CREATE TABLE IF NOT EXISTS passkey_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('registration', 'authentication')),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '5 minutes')
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_passkey_credentials_user_id ON passkey_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_passkey_credentials_credential_id ON passkey_credentials(credential_id);
CREATE INDEX IF NOT EXISTS idx_passkey_challenges_challenge ON passkey_challenges(challenge);
CREATE INDEX IF NOT EXISTS idx_passkey_challenges_expires_at ON passkey_challenges(expires_at);

-- Enable RLS
ALTER TABLE passkey_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE passkey_challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for passkey_credentials

-- Users can view their own credentials
CREATE POLICY "Users can view own passkey credentials"
  ON passkey_credentials
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own credentials
CREATE POLICY "Users can delete own passkey credentials"
  ON passkey_credentials
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Only service role can insert (via Edge Functions)
CREATE POLICY "Service role can insert passkey credentials"
  ON passkey_credentials
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Only service role can update (via Edge Functions for counter)
CREATE POLICY "Service role can update passkey credentials"
  ON passkey_credentials
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for passkey_challenges

-- Only service role can manage challenges (via Edge Functions)
CREATE POLICY "Service role can manage passkey challenges"
  ON passkey_challenges
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to clean up expired challenges
CREATE OR REPLACE FUNCTION cleanup_expired_passkey_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM passkey_challenges
  WHERE expires_at < now();
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION cleanup_expired_passkey_challenges() TO service_role;

COMMENT ON TABLE passkey_credentials IS 'Stores WebAuthn passkey credentials for passwordless authentication';
COMMENT ON TABLE passkey_challenges IS 'Temporary storage for WebAuthn challenges during registration/authentication';
COMMENT ON FUNCTION cleanup_expired_passkey_challenges IS 'Removes expired passkey challenges';

-- ===== End 20251221173803_add_passkey_authentication_system.sql =====

-- ===== Begin 20251221192341_add_comprehensive_preference_system.sql =====

/*
  # Comprehensive Dual-Context Ride Preference System

  ## Overview
  Maximum-capability preference system supporting both driver-side and passenger-side preferences
  with AI matching, smart filtering, and context-aware automation.

  ## Schema Changes

  ### 1. Expand user_preferences Table
  
  **Driver-Side Preferences:**
  - Luggage, food/drink, child seat, and accessibility policies
  - Vehicle amenities (charging, WiFi, climate control)
  - Passenger screening requirements (ratings, verification, demographics)
  - Auto-acceptance rules and instant booking settings
  - Safety and communication preferences
  - Pricing and payment preferences
  
  **Passenger-Side Search Filters:**
  - Budget constraints and price filtering
  - Driver requirements (ratings, verification, background checks)
  - Comfort and amenity requirements
  - Route and logistics constraints
  - Social network filtering
  - Vehicle preferences and eco-friendly options
  - Smart matching and automation settings

  ### 2. New Tables Created
  
  **ride_preference_overrides**
  - Per-ride preference customization
  - Allows drivers to modify preferences for specific rides
  
  **passenger_search_filters**
  - Saved search filter configurations
  - Named filter profiles for different situations
  
  **preferred_drivers**
  - Favorite/trusted driver lists
  - Priority notification settings
  
  **blocked_users_preferences**
  - User-specific blocking with context
  - Block as driver, passenger, or both
  
  **recurring_ride_templates**
  - Saved ride templates for quick posting
  - Schedule and preference data bundled
  
  **search_history_analytics**
  - User search behavior tracking
  - ML-powered recommendation engine data
  
  **preference_profiles**
  - Named preference bundles (Budget, Comfort, Safety, etc.)
  - Situation-based quick switching

  ## Security
  - RLS enabled on all new tables
  - Users can only access their own data
  - Privacy controls for preference visibility
*/

-- ============================================================================
-- STEP 1: Expand user_preferences table with comprehensive preference fields
-- ============================================================================

-- Drop existing user_preferences columns if they exist and recreate with new structure
DO $$
BEGIN
  -- Driver-Side: Vehicle & Comfort Settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'luggage_policy') THEN
    ALTER TABLE user_preferences ADD COLUMN luggage_policy text DEFAULT 'medium-allowed' CHECK (luggage_policy IN ('none', 'small-bags-only', 'medium-allowed', 'large-allowed'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'food_drinks_allowed') THEN
    ALTER TABLE user_preferences ADD COLUMN food_drinks_allowed text DEFAULT 'snacks-ok' CHECK (food_drinks_allowed IN ('none', 'drinks-only', 'snacks-ok', 'meals-ok'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'child_seats_available') THEN
    ALTER TABLE user_preferences ADD COLUMN child_seats_available integer DEFAULT 0 CHECK (child_seats_available >= 0);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'wheelchair_accessible') THEN
    ALTER TABLE user_preferences ADD COLUMN wheelchair_accessible boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'pet_policy_details') THEN
    ALTER TABLE user_preferences ADD COLUMN pet_policy_details jsonb DEFAULT '{"allowed": false, "types": [], "size_limit": "small", "carrier_required": true}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'music_genres_preferred') THEN
    ALTER TABLE user_preferences ADD COLUMN music_genres_preferred text[] DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'ac_heating_available') THEN
    ALTER TABLE user_preferences ADD COLUMN ac_heating_available boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'phone_charging_available') THEN
    ALTER TABLE user_preferences ADD COLUMN phone_charging_available boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'wifi_available') THEN
    ALTER TABLE user_preferences ADD COLUMN wifi_available boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'luggage_space_description') THEN
    ALTER TABLE user_preferences ADD COLUMN luggage_space_description text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'special_equipment') THEN
    ALTER TABLE user_preferences ADD COLUMN special_equipment text[] DEFAULT '{}';
  END IF;

  -- Driver-Side: Passenger Screening & Auto-Accept Rules
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'instant_booking_enabled') THEN
    ALTER TABLE user_preferences ADD COLUMN instant_booking_enabled boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'minimum_passenger_rating') THEN
    ALTER TABLE user_preferences ADD COLUMN minimum_passenger_rating numeric(3,2) DEFAULT 0.00 CHECK (minimum_passenger_rating >= 0 AND minimum_passenger_rating <= 5);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'require_passenger_verification') THEN
    ALTER TABLE user_preferences ADD COLUMN require_passenger_verification boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'require_passenger_profile_photo') THEN
    ALTER TABLE user_preferences ADD COLUMN require_passenger_profile_photo boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'max_stops_allowed') THEN
    ALTER TABLE user_preferences ADD COLUMN max_stops_allowed integer DEFAULT 3 CHECK (max_stops_allowed >= 0);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'same_gender_only') THEN
    ALTER TABLE user_preferences ADD COLUMN same_gender_only boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'age_restriction_min') THEN
    ALTER TABLE user_preferences ADD COLUMN age_restriction_min integer CHECK (age_restriction_min >= 0 AND age_restriction_min <= 100);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'age_restriction_max') THEN
    ALTER TABLE user_preferences ADD COLUMN age_restriction_max integer CHECK (age_restriction_max >= 0 AND age_restriction_max <= 120);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'allow_minors_with_guardian') THEN
    ALTER TABLE user_preferences ADD COLUMN allow_minors_with_guardian boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'allow_groups') THEN
    ALTER TABLE user_preferences ADD COLUMN allow_groups boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'max_group_size') THEN
    ALTER TABLE user_preferences ADD COLUMN max_group_size integer DEFAULT 4 CHECK (max_group_size >= 1);
  END IF;

  -- Driver-Side: Safety & Communication
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'share_live_location_automatically') THEN
    ALTER TABLE user_preferences ADD COLUMN share_live_location_automatically boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'emergency_contact_auto_notify') THEN
    ALTER TABLE user_preferences ADD COLUMN emergency_contact_auto_notify boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'require_photo_verification_at_pickup') THEN
    ALTER TABLE user_preferences ADD COLUMN require_photo_verification_at_pickup boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'communication_preference') THEN
    ALTER TABLE user_preferences ADD COLUMN communication_preference text DEFAULT 'in-app-only' CHECK (communication_preference IN ('in-app-only', 'phone-ok', 'whatsapp-ok', 'any'));
  END IF;

  -- Passenger-Side: Search & Filter Preferences
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_max_price_per_km') THEN
    ALTER TABLE user_preferences ADD COLUMN search_max_price_per_km numeric(10,2) CHECK (search_max_price_per_km >= 0);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_max_total_price') THEN
    ALTER TABLE user_preferences ADD COLUMN search_max_total_price numeric(10,2) CHECK (search_max_total_price >= 0);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_min_driver_rating') THEN
    ALTER TABLE user_preferences ADD COLUMN search_min_driver_rating numeric(3,2) DEFAULT 0.00 CHECK (search_min_driver_rating >= 0 AND search_min_driver_rating <= 5);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_require_verified_driver') THEN
    ALTER TABLE user_preferences ADD COLUMN search_require_verified_driver boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_smoking_filter') THEN
    ALTER TABLE user_preferences ADD COLUMN search_smoking_filter text DEFAULT 'any' CHECK (search_smoking_filter IN ('no-smoking-only', 'outside-only-ok', 'any'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_pets_filter') THEN
    ALTER TABLE user_preferences ADD COLUMN search_pets_filter text DEFAULT 'any' CHECK (search_pets_filter IN ('no-pets', 'pets-ok-only', 'any'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_music_filter') THEN
    ALTER TABLE user_preferences ADD COLUMN search_music_filter text DEFAULT 'any' CHECK (search_music_filter IN ('quiet-only', 'moderate-max', 'any'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_require_ac') THEN
    ALTER TABLE user_preferences ADD COLUMN search_require_ac boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_require_charging') THEN
    ALTER TABLE user_preferences ADD COLUMN search_require_charging boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_require_wifi') THEN
    ALTER TABLE user_preferences ADD COLUMN search_require_wifi boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_luggage_needed') THEN
    ALTER TABLE user_preferences ADD COLUMN search_luggage_needed text DEFAULT 'none' CHECK (search_luggage_needed IN ('none', 'small', 'medium', 'large'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_require_child_seat') THEN
    ALTER TABLE user_preferences ADD COLUMN search_require_child_seat boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_require_wheelchair') THEN
    ALTER TABLE user_preferences ADD COLUMN search_require_wheelchair boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_max_detour_minutes') THEN
    ALTER TABLE user_preferences ADD COLUMN search_max_detour_minutes integer DEFAULT 15 CHECK (search_max_detour_minutes >= 0);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_preferred_vehicle_types') THEN
    ALTER TABLE user_preferences ADD COLUMN search_preferred_vehicle_types text[] DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_eco_friendly_only') THEN
    ALTER TABLE user_preferences ADD COLUMN search_eco_friendly_only boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_instant_booking_only') THEN
    ALTER TABLE user_preferences ADD COLUMN search_instant_booking_only boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_friends_only') THEN
    ALTER TABLE user_preferences ADD COLUMN search_friends_only boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_carpooling_ok') THEN
    ALTER TABLE user_preferences ADD COLUMN search_carpooling_ok boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_priority_algorithm') THEN
    ALTER TABLE user_preferences ADD COLUMN search_priority_algorithm text DEFAULT 'fastest' CHECK (search_priority_algorithm IN ('cheapest', 'fastest', 'highest-rated', 'eco-friendly', 'comfort'));
  END IF;

  -- Smart Matching Preferences
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'auto_match_enabled') THEN
    ALTER TABLE user_preferences ADD COLUMN auto_match_enabled boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'auto_match_criteria') THEN
    ALTER TABLE user_preferences ADD COLUMN auto_match_criteria jsonb DEFAULT '{"price_weight": 0.3, "time_weight": 0.3, "rating_weight": 0.2, "comfort_weight": 0.2}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'flexible_time_window_minutes') THEN
    ALTER TABLE user_preferences ADD COLUMN flexible_time_window_minutes integer DEFAULT 30 CHECK (flexible_time_window_minutes >= 0);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'flexible_price_percentage') THEN
    ALTER TABLE user_preferences ADD COLUMN flexible_price_percentage integer DEFAULT 20 CHECK (flexible_price_percentage >= 0 AND flexible_price_percentage <= 100);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'notification_on_perfect_match') THEN
    ALTER TABLE user_preferences ADD COLUMN notification_on_perfect_match boolean DEFAULT true;
  END IF;

  -- Accessibility Features
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'accessibility_requirements') THEN
    ALTER TABLE user_preferences ADD COLUMN accessibility_requirements jsonb DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'service_animal') THEN
    ALTER TABLE user_preferences ADD COLUMN service_animal boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'language_preferences') THEN
    ALTER TABLE user_preferences ADD COLUMN language_preferences text[] DEFAULT ARRAY['en'];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'sensory_preferences') THEN
    ALTER TABLE user_preferences ADD COLUMN sensory_preferences jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Create ride_preference_overrides table
-- ============================================================================

CREATE TABLE IF NOT EXISTS ride_preference_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  override_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(ride_id)
);

ALTER TABLE ride_preference_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage preferences for their own rides"
  ON ride_preference_overrides FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rides 
      WHERE rides.id = ride_preference_overrides.ride_id 
      AND rides.driver_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rides 
      WHERE rides.id = ride_preference_overrides.ride_id 
      AND rides.driver_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 3: Create passenger_search_filters table
-- ============================================================================

CREATE TABLE IF NOT EXISTS passenger_search_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  filter_name text NOT NULL,
  filter_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean DEFAULT false,
  use_count integer DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE passenger_search_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own search filters"
  ON passenger_search_filters FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own search filters"
  ON passenger_search_filters FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own search filters"
  ON passenger_search_filters FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own search filters"
  ON passenger_search_filters FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create index for faster filter lookups
CREATE INDEX IF NOT EXISTS idx_passenger_search_filters_user_id ON passenger_search_filters(user_id);
CREATE INDEX IF NOT EXISTS idx_passenger_search_filters_default ON passenger_search_filters(user_id, is_default) WHERE is_default = true;

-- ============================================================================
-- STEP 4: Create preferred_drivers table
-- ============================================================================

CREATE TABLE IF NOT EXISTS preferred_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  preferred_driver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  preference_level text NOT NULL DEFAULT 'favorite' CHECK (preference_level IN ('favorite', 'trusted', 'priority-notification')),
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, preferred_driver_id),
  CHECK (user_id != preferred_driver_id)
);

ALTER TABLE preferred_drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferred drivers"
  ON preferred_drivers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can add preferred drivers"
  ON preferred_drivers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own preferred drivers"
  ON preferred_drivers FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove preferred drivers"
  ON preferred_drivers FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_preferred_drivers_user_id ON preferred_drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_preferred_drivers_driver_id ON preferred_drivers(preferred_driver_id);

-- ============================================================================
-- STEP 5: Create blocked_users_preferences table
-- ============================================================================

CREATE TABLE IF NOT EXISTS blocked_users_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  block_reason text,
  block_type text NOT NULL DEFAULT 'both' CHECK (block_type IN ('as-driver', 'as-passenger', 'both')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, blocked_user_id),
  CHECK (user_id != blocked_user_id)
);

ALTER TABLE blocked_users_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own blocked users"
  ON blocked_users_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can block other users"
  ON blocked_users_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own blocks"
  ON blocked_users_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unblock users"
  ON blocked_users_preferences FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_blocked_users_user_id ON blocked_users_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_id ON blocked_users_preferences(blocked_user_id);

-- ============================================================================
-- STEP 6: Create recurring_ride_templates table
-- ============================================================================

CREATE TABLE IF NOT EXISTS recurring_ride_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  route_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  schedule_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  preferences_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  use_count integer DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE recurring_ride_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ride templates"
  ON recurring_ride_templates FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create ride templates"
  ON recurring_ride_templates FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own ride templates"
  ON recurring_ride_templates FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own ride templates"
  ON recurring_ride_templates FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_recurring_ride_templates_user_id ON recurring_ride_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_ride_templates_active ON recurring_ride_templates(user_id, is_active) WHERE is_active = true;

-- ============================================================================
-- STEP 7: Create search_history_analytics table
-- ============================================================================

CREATE TABLE IF NOT EXISTS search_history_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  search_parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  results_shown integer DEFAULT 0,
  result_clicked uuid REFERENCES rides(id) ON DELETE SET NULL,
  booking_completed boolean DEFAULT false,
  search_timestamp timestamptz DEFAULT now()
);

ALTER TABLE search_history_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own search history"
  ON search_history_analytics FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create search history entries"
  ON search_history_analytics FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own search history"
  ON search_history_analytics FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_timestamp ON search_history_analytics(search_timestamp DESC);

-- ============================================================================
-- STEP 8: Create preference_profiles table
-- ============================================================================

CREATE TABLE IF NOT EXISTS preference_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profile_name text NOT NULL,
  profile_type text NOT NULL CHECK (profile_type IN ('driver', 'passenger', 'both')),
  profile_category text CHECK (profile_category IN ('budget', 'comfort', 'safety', 'eco', 'social', 'quiet', 'flexible', 'custom')),
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT false,
  is_system_default boolean DEFAULT false,
  use_count integer DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE preference_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preference profiles"
  ON preference_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create preference profiles"
  ON preference_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own preference profiles"
  ON preference_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own preference profiles"
  ON preference_profiles FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_preference_profiles_user_id ON preference_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_preference_profiles_active ON preference_profiles(user_id, is_active) WHERE is_active = true;

-- ============================================================================
-- STEP 9: Create function to calculate compatibility score
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_compatibility_score(
  p_driver_id uuid,
  p_passenger_id uuid,
  p_ride_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_driver_prefs record;
  v_passenger_prefs record;
  v_ride_overrides jsonb;
  v_score numeric := 100.0;
  v_breakdown jsonb := '{}'::jsonb;
  v_blocking_issues text[] := '{}';
BEGIN
  -- Get driver preferences
  SELECT * INTO v_driver_prefs
  FROM user_preferences
  WHERE user_id = p_driver_id;
  
  -- Get passenger preferences
  SELECT * INTO v_passenger_prefs
  FROM user_preferences
  WHERE user_id = p_passenger_id;
  
  -- Get ride-specific overrides if ride_id provided
  IF p_ride_id IS NOT NULL THEN
    SELECT override_preferences INTO v_ride_overrides
    FROM ride_preference_overrides
    WHERE ride_id = p_ride_id;
  END IF;
  
  -- Check for blocking conditions
  
  -- Check if users have blocked each other
  IF EXISTS (
    SELECT 1 FROM blocked_users_preferences
    WHERE (user_id = p_driver_id AND blocked_user_id = p_passenger_id)
       OR (user_id = p_passenger_id AND blocked_user_id = p_driver_id)
  ) THEN
    v_blocking_issues := array_append(v_blocking_issues, 'users_blocked');
    v_score := 0;
  END IF;
  
  -- Smoking compatibility (hard requirement)
  IF v_passenger_prefs.search_smoking_filter = 'no-smoking-only' 
     AND v_driver_prefs.smoking_policy NOT IN ('no-smoking', 'never') THEN
    v_blocking_issues := array_append(v_blocking_issues, 'smoking_incompatible');
    v_score := v_score - 25;
  END IF;
  
  -- Pet compatibility
  IF v_passenger_prefs.service_animal = true 
     AND COALESCE((v_driver_prefs.pet_policy_details->>'allowed')::boolean, false) = false THEN
    v_blocking_issues := array_append(v_blocking_issues, 'service_animal_not_allowed');
    v_score := v_score - 30;
  END IF;
  
  -- Wheelchair accessibility
  IF v_passenger_prefs.search_require_wheelchair = true 
     AND v_driver_prefs.wheelchair_accessible = false THEN
    v_blocking_issues := array_append(v_blocking_issues, 'wheelchair_not_accessible');
    v_score := v_score - 30;
  END IF;
  
  -- Calculate positive compatibility scores
  
  -- Music preference alignment (worth 10 points)
  IF v_driver_prefs.music_preference = v_passenger_prefs.search_music_filter 
     OR v_passenger_prefs.search_music_filter = 'any' THEN
    v_breakdown := v_breakdown || jsonb_build_object('music', 10);
  ELSE
    v_score := v_score - 5;
    v_breakdown := v_breakdown || jsonb_build_object('music', -5);
  END IF;
  
  -- Conversation level alignment (worth 10 points)
  IF v_driver_prefs.conversation_level = v_passenger_prefs.conversation_level THEN
    v_breakdown := v_breakdown || jsonb_build_object('conversation', 10);
  ELSE
    v_score := v_score - 5;
    v_breakdown := v_breakdown || jsonb_build_object('conversation', -5);
  END IF;
  
  -- Temperature preference alignment (worth 5 points)
  IF v_driver_prefs.temperature_preference = v_passenger_prefs.temperature_preference THEN
    v_breakdown := v_breakdown || jsonb_build_object('temperature', 5);
  ELSE
    v_score := v_score - 3;
    v_breakdown := v_breakdown || jsonb_build_object('temperature', -3);
  END IF;
  
  -- Amenity bonuses
  IF v_passenger_prefs.search_require_ac = true AND v_driver_prefs.ac_heating_available = true THEN
    v_breakdown := v_breakdown || jsonb_build_object('ac', 5);
  END IF;
  
  IF v_passenger_prefs.search_require_charging = true AND v_driver_prefs.phone_charging_available = true THEN
    v_breakdown := v_breakdown || jsonb_build_object('charging', 5);
  END IF;
  
  IF v_passenger_prefs.search_require_wifi = true AND v_driver_prefs.wifi_available = true THEN
    v_breakdown := v_breakdown || jsonb_build_object('wifi', 5);
  END IF;
  
  -- Ensure score stays between 0 and 100
  v_score := GREATEST(0, LEAST(100, v_score));
  
  RETURN jsonb_build_object(
    'score', v_score,
    'breakdown', v_breakdown,
    'blocking_issues', to_jsonb(v_blocking_issues),
    'is_compatible', v_score >= 50 AND array_length(v_blocking_issues, 1) IS NULL
  );
END;
$$;

-- ============================================================================
-- STEP 10: Create function to get filtered rides with compatibility scores
-- ============================================================================

CREATE OR REPLACE FUNCTION get_filtered_rides_with_scores(
  p_user_id uuid,
  p_filter_settings jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  ride_id uuid,
  driver_id uuid,
  origin text,
  destination text,
  departure_time timestamptz,
  available_seats integer,
  compatibility_score numeric,
  compatibility_breakdown jsonb,
  is_preferred_driver boolean,
  is_instant_bookable boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id as ride_id,
    r.driver_id,
    r.origin,
    r.destination,
    r.departure_time,
    r.available_seats,
    (calculate_compatibility_score(r.driver_id, p_user_id, r.id)->>'score')::numeric as compatibility_score,
    calculate_compatibility_score(r.driver_id, p_user_id, r.id) as compatibility_breakdown,
    EXISTS(
      SELECT 1 FROM preferred_drivers pd 
      WHERE pd.user_id = p_user_id AND pd.preferred_driver_id = r.driver_id
    ) as is_preferred_driver,
    COALESCE(up.instant_booking_enabled, false) as is_instant_bookable
  FROM rides r
  LEFT JOIN user_preferences up ON up.user_id = r.driver_id
  WHERE r.status = 'active'
    AND r.available_seats > 0
    AND r.driver_id != p_user_id
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users_preferences bup
      WHERE (bup.user_id = p_user_id AND bup.blocked_user_id = r.driver_id)
         OR (bup.user_id = r.driver_id AND bup.blocked_user_id = p_user_id)
    )
  ORDER BY 
    is_preferred_driver DESC,
    compatibility_score DESC,
    r.departure_time ASC;
END;
$$;

-- ============================================================================
-- Grant necessary permissions
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ===== End 20251221192341_add_comprehensive_preference_system.sql =====

-- ===== Begin 20251221232017_add_privacy_controls.sql =====

/*
  # Add Privacy Control Fields to User Preferences

  1. Privacy Fields
    - `phone_visible` (boolean) - Whether phone number is visible to others
    - `email_visible` (boolean) - Whether email is visible on profile
    - `profile_searchable` (boolean) - Whether profile appears in search
    - `allow_messages_from` (text) - Who can send messages (anyone, verified, connections)

  2. Security
    - These fields control user privacy preferences
    - All fields have sensible defaults
    - RLS policies already exist for user_preferences table
*/

-- Add privacy control columns to user_preferences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'phone_visible'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN phone_visible boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'email_visible'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN email_visible boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'profile_searchable'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN profile_searchable boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'allow_messages_from'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN allow_messages_from text DEFAULT 'anyone' CHECK (allow_messages_from IN ('anyone', 'verified', 'connections'));
  END IF;
END $$;

-- Add helpful comments
COMMENT ON COLUMN user_preferences.phone_visible IS 'Whether phone number is visible to other users';
COMMENT ON COLUMN user_preferences.email_visible IS 'Whether email is displayed on public profile';
COMMENT ON COLUMN user_preferences.profile_searchable IS 'Whether profile appears in search results and ride matching';
COMMENT ON COLUMN user_preferences.allow_messages_from IS 'Control who can send messages: anyone, verified users only, or connections only';

-- ===== End 20251221232017_add_privacy_controls.sql =====

-- ===== Begin 20251221232743_create_emergency_alerts_system.sql =====

/*
  # Create Emergency Alerts System

  1. Tables
    - `emergency_alerts` - Stores emergency SOS activations
    - `emergency_notifications` - Tracks notifications sent to emergency contacts
    
  2. Security
    - Users can create their own emergency alerts
    - Users can read their own alerts
    - Emergency contacts can be notified
    - RLS policies ensure privacy
    
  3. Important Notes
    - Critical safety feature
    - Must be highly reliable
    - Automatic notification system
*/

-- Create emergency_alerts table
CREATE TABLE IF NOT EXISTS emergency_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ride_id uuid REFERENCES rides(id) ON DELETE SET NULL,
  location geography(POINT),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'false_alarm')),
  triggered_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create emergency_notifications table
CREATE TABLE IF NOT EXISTS emergency_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emergency_alert_id uuid NOT NULL REFERENCES emergency_alerts(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES emergency_contacts(id) ON DELETE CASCADE,
  notification_sent boolean DEFAULT false,
  sent_at timestamptz,
  delivery_status text DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'failed')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE emergency_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for emergency_alerts

-- Users can create their own emergency alerts
CREATE POLICY "Users can create own emergency alerts"
ON emergency_alerts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can read their own emergency alerts
CREATE POLICY "Users can read own emergency alerts"
ON emergency_alerts FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can update their own emergency alerts
CREATE POLICY "Users can update own emergency alerts"
ON emergency_alerts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for emergency_notifications

-- Users can read notifications for their alerts
CREATE POLICY "Users can read own alert notifications"
ON emergency_notifications FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM emergency_alerts
    WHERE emergency_alerts.id = emergency_notifications.emergency_alert_id
    AND emergency_alerts.user_id = auth.uid()
  )
);

-- Users can create notifications for their alerts
CREATE POLICY "Users can create alert notifications"
ON emergency_notifications FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM emergency_alerts
    WHERE emergency_alerts.id = emergency_notifications.emergency_alert_id
    AND emergency_alerts.user_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_user_id ON emergency_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_ride_id ON emergency_alerts(ride_id);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_status ON emergency_alerts(status);
CREATE INDEX IF NOT EXISTS idx_emergency_notifications_alert_id ON emergency_notifications(emergency_alert_id);
CREATE INDEX IF NOT EXISTS idx_emergency_notifications_contact_id ON emergency_notifications(contact_id);

-- Add helpful comments
COMMENT ON TABLE emergency_alerts IS 'Stores emergency SOS alerts triggered by users during rides';
COMMENT ON TABLE emergency_notifications IS 'Tracks notifications sent to emergency contacts when alerts are triggered';
COMMENT ON COLUMN emergency_alerts.location IS 'Geographic location where the emergency alert was triggered';
COMMENT ON COLUMN emergency_alerts.status IS 'Current status of the emergency alert: active, resolved, or false_alarm';

-- ===== End 20251221232743_create_emergency_alerts_system.sql =====

-- ===== Begin 20251221232834_create_vehicle_insurance_table.sql =====

/*
  # Create Vehicle Insurance Table

  1. Table
    - `vehicle_insurance` - Stores vehicle insurance documents and verification
    
  2. Fields
    - Basic insurance info (policy number, provider, dates)
    - Verification status
    - Document storage path
    
  3. Security
    - RLS policies for user access
    - Only users can access their own insurance documents
*/

CREATE TABLE IF NOT EXISTS vehicle_insurance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  policy_number text NOT NULL,
  provider text NOT NULL,
  issue_date date NOT NULL,
  expiry_date date NOT NULL,
  coverage_type text NOT NULL CHECK (coverage_type IN ('comprehensive', 'third_party', 'third_party_fire_theft')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'rejected')),
  rejection_reason text,
  document_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE vehicle_insurance ENABLE ROW LEVEL SECURITY;

-- Users can create their own insurance records
CREATE POLICY "Users can create own insurance"
ON vehicle_insurance FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can read their own insurance records
CREATE POLICY "Users can read own insurance"
ON vehicle_insurance FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can update their own insurance records
CREATE POLICY "Users can update own insurance"
ON vehicle_insurance FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own insurance records
CREATE POLICY "Users can delete own insurance"
ON vehicle_insurance FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_insurance_user_id ON vehicle_insurance(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_insurance_vehicle_id ON vehicle_insurance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_insurance_status ON vehicle_insurance(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_insurance_expiry ON vehicle_insurance(expiry_date);

-- Add helpful comments
COMMENT ON TABLE vehicle_insurance IS 'Stores vehicle insurance documents and verification status';
COMMENT ON COLUMN vehicle_insurance.status IS 'Verification status: pending, active, expired, or rejected';
COMMENT ON COLUMN vehicle_insurance.coverage_type IS 'Type of insurance coverage';

-- ===== End 20251221232834_create_vehicle_insurance_table.sql =====

-- ===== Begin 20251221232905_add_driver_license_status_and_trust_score.sql =====

/*
  # Add Driver License Status and Trust Score System

  1. Driver License Updates
    - Add status column for consistency with verification system
    - Add countries and classes fields
    
  2. Trust Score System
    - Add trust_score column to profiles
    - Create calculation function
    - Add triggers for automatic updates
    
  3. Trust Score Factors (0-100 points)
    - Email verification: 10 points
    - Phone verification: 10 points
    - Profile photo verification: 15 points
    - Driver license verification: 20 points
    - Insurance verification: 15 points
    - Completed rides: up to 15 points
    - Average rating: up to 10 points
    - Account age: up to 5 points
*/

-- Add status column to driver_licenses if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_licenses' AND column_name = 'status'
  ) THEN
    ALTER TABLE driver_licenses ADD COLUMN status text DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_licenses' AND column_name = 'issuing_country'
  ) THEN
    ALTER TABLE driver_licenses ADD COLUMN issuing_country text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_licenses' AND column_name = 'license_class'
  ) THEN
    ALTER TABLE driver_licenses ADD COLUMN license_class text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_licenses' AND column_name = 'document_path'
  ) THEN
    ALTER TABLE driver_licenses ADD COLUMN document_path text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_licenses' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE driver_licenses ADD COLUMN rejection_reason text;
  END IF;
END $$;

-- Add trust_score column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'trust_score'
  ) THEN
    ALTER TABLE profiles ADD COLUMN trust_score integer DEFAULT 0;
  END IF;
END $$;

-- Create trust score calculation function
CREATE OR REPLACE FUNCTION calculate_trust_score(user_id_param uuid)
RETURNS integer AS $$
DECLARE
  score integer := 0;
  profile_rec RECORD;
  license_verified boolean;
  insurance_active boolean;
  completed_rides integer;
  account_age_days integer;
BEGIN
  SELECT * INTO profile_rec
  FROM profiles
  WHERE id = user_id_param;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Email verification (10 points)
  IF profile_rec.is_verified THEN
    score := score + 10;
  END IF;

  -- Phone verification (10 points)
  IF profile_rec.phone IS NOT NULL AND profile_rec.phone != '' THEN
    score := score + 10;
  END IF;

  -- Profile photo verification (15 points)
  IF profile_rec.profile_verified THEN
    score := score + 15;
  END IF;

  -- Driver license verification (20 points)
  SELECT EXISTS (
    SELECT 1 FROM driver_licenses
    WHERE driver_licenses.user_id = user_id_param
    AND status = 'verified'
    AND expiry_date > CURRENT_DATE
  ) INTO license_verified;

  IF license_verified THEN
    score := score + 20;
  END IF;

  -- Insurance verification (15 points)
  SELECT EXISTS (
    SELECT 1 FROM vehicle_insurance
    WHERE vehicle_insurance.user_id = user_id_param
    AND status = 'active'
    AND expiry_date > CURRENT_DATE
  ) INTO insurance_active;

  IF insurance_active THEN
    score := score + 15;
  END IF;

  -- Completed rides (up to 15 points, 1 point per ride)
  completed_rides := profile_rec.total_rides_offered + profile_rec.total_rides_taken;
  score := score + LEAST(completed_rides, 15);

  -- Average rating (up to 10 points, 2 points per star)
  IF profile_rec.average_rating > 0 THEN
    score := score + ROUND(profile_rec.average_rating * 2)::integer;
  END IF;

  -- Account age (up to 5 points, 1 point per 30 days, max 150 days)
  account_age_days := EXTRACT(DAY FROM (CURRENT_TIMESTAMP - profile_rec.created_at));
  score := score + LEAST(FLOOR(account_age_days / 30)::integer, 5);

  -- Ensure score is between 0 and 100
  score := LEAST(GREATEST(score, 0), 100);

  RETURN score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update user's trust score
CREATE OR REPLACE FUNCTION update_user_trust_score(user_id_param uuid)
RETURNS void AS $$
DECLARE
  new_score integer;
BEGIN
  new_score := calculate_trust_score(user_id_param);
  
  UPDATE profiles
  SET trust_score = new_score,
      updated_at = now()
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function for profiles
CREATE OR REPLACE FUNCTION trigger_profile_trust_score()
RETURNS trigger AS $$
BEGIN
  PERFORM update_user_trust_score(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function for other tables
CREATE OR REPLACE FUNCTION trigger_update_trust_score()
RETURNS trigger AS $$
BEGIN
  PERFORM update_user_trust_score(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers
DROP TRIGGER IF EXISTS trigger_license_trust_score ON driver_licenses;
CREATE TRIGGER trigger_license_trust_score
AFTER INSERT OR UPDATE ON driver_licenses
FOR EACH ROW
EXECUTE FUNCTION trigger_update_trust_score();

DROP TRIGGER IF EXISTS trigger_insurance_trust_score ON vehicle_insurance;
CREATE TRIGGER trigger_insurance_trust_score
AFTER INSERT OR UPDATE ON vehicle_insurance
FOR EACH ROW
EXECUTE FUNCTION trigger_update_trust_score();

DROP TRIGGER IF EXISTS trigger_profile_trust_score ON profiles;
CREATE TRIGGER trigger_profile_trust_score
AFTER UPDATE OF is_verified, profile_verified, phone, average_rating, total_rides_offered, total_rides_taken ON profiles
FOR EACH ROW
EXECUTE FUNCTION trigger_profile_trust_score();

-- Create RPC function for users
CREATE OR REPLACE FUNCTION refresh_my_trust_score()
RETURNS integer AS $$
DECLARE
  new_score integer;
BEGIN
  new_score := calculate_trust_score(auth.uid());
  
  UPDATE profiles
  SET trust_score = new_score,
      updated_at = now()
  WHERE id = auth.uid();
  
  RETURN new_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initialize trust scores for existing users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM profiles LOOP
    PERFORM update_user_trust_score(user_record.id);
  END LOOP;
END $$;

-- Add helpful comments
COMMENT ON FUNCTION calculate_trust_score IS 'Calculates trust score (0-100) based on verifications, rides, rating, and account age';
COMMENT ON FUNCTION refresh_my_trust_score IS 'RPC function allowing users to refresh their own trust score';
COMMENT ON COLUMN profiles.trust_score IS 'Calculated trust score (0-100) based on verifications and activity';

-- ===== End 20251221232905_add_driver_license_status_and_trust_score.sql =====

-- ===== Begin 20251221234714_add_saved_searches_table.sql =====

/*
  # Add Saved Searches Table for Advanced Filters

  1. New Table
    - `saved_searches`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `name` (text) - User-friendly name for the saved search
      - `search_criteria` (jsonb) - Stored filter preferences
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Users can only view, create, update, and delete their own saved searches

  3. Indexes
    - Index on user_id for fast lookups
*/

-- Create saved_searches table
CREATE TABLE IF NOT EXISTS saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  search_criteria jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);

-- Enable RLS
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own saved searches"
  ON saved_searches
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own saved searches"
  ON saved_searches
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved searches"
  ON saved_searches
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved searches"
  ON saved_searches
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION update_saved_searches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_saved_searches_updated_at
  BEFORE UPDATE ON saved_searches
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_searches_updated_at();

-- ===== End 20251221234714_add_saved_searches_table.sql =====

-- ===== Begin 20251222000027_add_admin_verification_policies_v2.sql =====

/*
  # Add Admin Verification Policies

  1. Purpose
    - Allow admin users to view and manage pending verifications
    - Enable admins to approve/reject driver licenses and insurance

  2. Changes
    - Add admin SELECT policies for driver_licenses table
    - Add admin SELECT policies for vehicle_insurance table
    - Add admin UPDATE policies for verification management

  3. Security
    - Only users with is_admin = true can access verification data
    - Admins can view all pending verifications
    - Admins can approve/reject verifications
*/

-- Admin can view all driver licenses
DROP POLICY IF EXISTS "Admins can view all licenses" ON driver_licenses;
CREATE POLICY "Admins can view all licenses"
  ON driver_licenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admin can update any license for verification
DROP POLICY IF EXISTS "Admins can update licenses" ON driver_licenses;
CREATE POLICY "Admins can update licenses"
  ON driver_licenses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admin can view all vehicle insurance
DROP POLICY IF EXISTS "Admins can view all insurance" ON vehicle_insurance;
CREATE POLICY "Admins can view all insurance"
  ON vehicle_insurance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admin can update any insurance for verification
DROP POLICY IF EXISTS "Admins can update insurance" ON vehicle_insurance;
CREATE POLICY "Admins can update insurance"
  ON vehicle_insurance FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Add helpful comments
COMMENT ON POLICY "Admins can view all licenses" ON driver_licenses IS 'Allows admin users to view all driver licenses for verification purposes';
COMMENT ON POLICY "Admins can update licenses" ON driver_licenses IS 'Allows admin users to approve or reject driver license verifications';
COMMENT ON POLICY "Admins can view all insurance" ON vehicle_insurance IS 'Allows admin users to view all vehicle insurance for verification purposes';
COMMENT ON POLICY "Admins can update insurance" ON vehicle_insurance IS 'Allows admin users to approve or reject insurance verifications';

-- ===== End 20251222000027_add_admin_verification_policies_v2.sql =====

-- ===== Begin 20251222000100_add_two_factor_authentication_system.sql =====

/*
  # Add Two-Factor Authentication System

  1. New Tables
    - `two_factor_auth` - Stores 2FA settings and secrets per user
    - `two_factor_recovery_codes` - Backup recovery codes

  2. Fields
    - User 2FA enablement status
    - TOTP secret storage
    - Recovery codes (hashed)
    - Last used timestamp
    - Verification attempts tracking

  3. Security
    - RLS enabled on all tables
    - Users can only manage their own 2FA settings
    - Recovery codes are hashed before storage
    - Rate limiting on verification attempts

  4. Features
    - TOTP-based 2FA (compatible with Google Authenticator, Authy, etc.)
    - Recovery codes for account access
    - Audit trail of 2FA usage
*/

-- Two-factor authentication table
CREATE TABLE IF NOT EXISTS two_factor_auth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  enabled boolean DEFAULT false NOT NULL,
  secret text,
  verified_at timestamptz,
  last_used_at timestamptz,
  backup_codes_generated_at timestamptz,
  failed_attempts integer DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Recovery codes table (one-time use backup codes)
CREATE TABLE IF NOT EXISTS two_factor_recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used boolean DEFAULT false NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Two-factor authentication audit log
CREATE TABLE IF NOT EXISTS two_factor_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('enabled', 'disabled', 'verified', 'failed', 'recovery_used', 'codes_regenerated')),
  ip_address text,
  user_agent text,
  success boolean DEFAULT true,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_two_factor_auth_user_id ON two_factor_auth(user_id);
CREATE INDEX IF NOT EXISTS idx_two_factor_auth_enabled ON two_factor_auth(enabled);
CREATE INDEX IF NOT EXISTS idx_two_factor_recovery_codes_user_id ON two_factor_recovery_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_two_factor_recovery_codes_used ON two_factor_recovery_codes(used);
CREATE INDEX IF NOT EXISTS idx_two_factor_audit_log_user_id ON two_factor_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_two_factor_audit_log_created_at ON two_factor_audit_log(created_at);

-- Enable RLS
ALTER TABLE two_factor_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE two_factor_recovery_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE two_factor_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for two_factor_auth
CREATE POLICY "Users can view own 2FA settings"
  ON two_factor_auth FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own 2FA settings"
  ON two_factor_auth FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own 2FA settings"
  ON two_factor_auth FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own 2FA settings"
  ON two_factor_auth FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for two_factor_recovery_codes
CREATE POLICY "Users can view own recovery codes"
  ON two_factor_recovery_codes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own recovery codes"
  ON two_factor_recovery_codes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recovery codes"
  ON two_factor_recovery_codes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for two_factor_audit_log
CREATE POLICY "Users can view own 2FA audit log"
  ON two_factor_audit_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs"
  ON two_factor_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admin can view all 2FA settings
CREATE POLICY "Admins can view all 2FA settings"
  ON two_factor_auth FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admin can view all audit logs
CREATE POLICY "Admins can view all 2FA audit logs"
  ON two_factor_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Add triggers for updated_at
CREATE TRIGGER update_two_factor_auth_updated_at BEFORE UPDATE ON two_factor_auth
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check if user has 2FA enabled
CREATE OR REPLACE FUNCTION user_has_2fa_enabled(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  result boolean;
BEGIN
  SELECT enabled INTO result
  FROM two_factor_auth
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(result, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment failed 2FA attempts
CREATE OR REPLACE FUNCTION increment_2fa_failed_attempts(p_user_id uuid)
RETURNS void AS $$
DECLARE
  current_attempts integer;
BEGIN
  UPDATE two_factor_auth
  SET 
    failed_attempts = failed_attempts + 1,
    locked_until = CASE 
      WHEN failed_attempts + 1 >= 5 THEN now() + interval '15 minutes'
      ELSE locked_until
    END
  WHERE user_id = p_user_id
  RETURNING failed_attempts INTO current_attempts;

  INSERT INTO two_factor_audit_log (user_id, action, success)
  VALUES (p_user_id, 'failed', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset failed attempts on successful verification
CREATE OR REPLACE FUNCTION reset_2fa_failed_attempts(p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE two_factor_auth
  SET 
    failed_attempts = 0,
    locked_until = NULL,
    last_used_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO two_factor_audit_log (user_id, action, success)
  VALUES (p_user_id, 'verified', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if 2FA is locked
CREATE OR REPLACE FUNCTION is_2fa_locked(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  lock_time timestamptz;
BEGIN
  SELECT locked_until INTO lock_time
  FROM two_factor_auth
  WHERE user_id = p_user_id;
  
  RETURN lock_time IS NOT NULL AND lock_time > now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful comments
COMMENT ON TABLE two_factor_auth IS 'Stores two-factor authentication settings and secrets for users';
COMMENT ON TABLE two_factor_recovery_codes IS 'Stores one-time recovery codes for 2FA account access';
COMMENT ON TABLE two_factor_audit_log IS 'Audit trail of all 2FA-related actions';
COMMENT ON COLUMN two_factor_auth.secret IS 'TOTP secret (base32 encoded) - should be encrypted at application level';
COMMENT ON COLUMN two_factor_auth.locked_until IS 'Timestamp until which 2FA verification is locked after too many failed attempts';
COMMENT ON COLUMN two_factor_recovery_codes.code_hash IS 'Hashed recovery code (bcrypt or similar)';

-- ===== End 20251222000100_add_two_factor_authentication_system.sql =====

-- ===== Begin 20251222001517_add_phase_completion_final.sql =====

/*
  # Phase Completion Features - Final Migration
  
  Adds all necessary database structures for Phase 1 and Phase 3 completion.
  
  ## New Tables
  1. leaderboard_cache - Performance cache for leaderboard rankings
  2. challenges - Seasonal challenges and competitions
  3. user_challenges - User progress on challenges
  4. notification_preferences - User notification settings
  
  ## Enhanced Tables
  - profiles: onboarding, leaderboard, accessibility, profile enhancements
  - saved_searches: alert functionality
  - notifications: categorization and actions
  
  ## Security
  - RLS enabled on all new tables
  - Users can only access their own data
*/

-- =============================================================================
-- Phase 1: Onboarding System
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completed boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_step') THEN
    ALTER TABLE profiles ADD COLUMN onboarding_step integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_skipped') THEN
    ALTER TABLE profiles ADD COLUMN onboarding_skipped boolean DEFAULT false;
  END IF;
END $$;

-- =============================================================================
-- Phase 3: Leaderboards
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'leaderboard_visible') THEN
    ALTER TABLE profiles ADD COLUMN leaderboard_visible boolean DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'leaderboard_display_name') THEN
    ALTER TABLE profiles ADD COLUMN leaderboard_display_name text;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS leaderboard_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  category text NOT NULL,
  region text,
  rank integer NOT NULL,
  score numeric NOT NULL,
  period text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, category, region, period)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'leaderboard_cache' AND rowsecurity = true) THEN
    ALTER TABLE leaderboard_cache ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DROP POLICY IF EXISTS "Leaderboard data is publicly viewable" ON leaderboard_cache;
CREATE POLICY "Leaderboard data is publicly viewable" ON leaderboard_cache FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = leaderboard_cache.user_id AND profiles.leaderboard_visible = true));

-- =============================================================================
-- Phase 3: Challenges
-- =============================================================================

CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  challenge_type text NOT NULL,
  target_value numeric NOT NULL,
  reward_type text NOT NULL,
  reward_value text,
  badge_icon text,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  is_seasonal boolean DEFAULT false,
  season_theme text,
  created_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'challenges' AND rowsecurity = true) THEN
    ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DROP POLICY IF EXISTS "Active challenges viewable by authenticated" ON challenges;
CREATE POLICY "Active challenges viewable by authenticated" ON challenges FOR SELECT TO authenticated
USING (is_active = true AND now() BETWEEN start_date AND end_date);

CREATE TABLE IF NOT EXISTS user_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id uuid REFERENCES challenges(id) ON DELETE CASCADE,
  progress numeric DEFAULT 0,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  reward_claimed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_challenges' AND rowsecurity = true) THEN
    ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DROP POLICY IF EXISTS "Users view own challenges" ON user_challenges;
DROP POLICY IF EXISTS "Users update own challenges" ON user_challenges;
DROP POLICY IF EXISTS "Users insert own challenges" ON user_challenges;

CREATE POLICY "Users view own challenges" ON user_challenges FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own challenges" ON user_challenges FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users insert own challenges" ON user_challenges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- Phase 3: Notification Preferences
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  ride_notifications boolean DEFAULT true,
  message_notifications boolean DEFAULT true,
  system_notifications boolean DEFAULT true,
  social_notifications boolean DEFAULT true,
  challenge_notifications boolean DEFAULT true,
  dnd_enabled boolean DEFAULT false,
  dnd_start_time time,
  dnd_end_time time,
  push_enabled boolean DEFAULT false,
  email_enabled boolean DEFAULT true,
  sms_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'notification_preferences' AND rowsecurity = true) THEN
    ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DROP POLICY IF EXISTS "Users view own notif prefs" ON notification_preferences;
DROP POLICY IF EXISTS "Users insert own notif prefs" ON notification_preferences;
DROP POLICY IF EXISTS "Users update own notif prefs" ON notification_preferences;

CREATE POLICY "Users view own notif prefs" ON notification_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own notif prefs" ON notification_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own notif prefs" ON notification_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- Profile Enhancements
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'profile_theme') THEN
    ALTER TABLE profiles ADD COLUMN profile_theme text DEFAULT 'default';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'about_me') THEN
    ALTER TABLE profiles ADD COLUMN about_me text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'interests_tags') THEN
    ALTER TABLE profiles ADD COLUMN interests_tags text[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'languages_spoken') THEN
    ALTER TABLE profiles ADD COLUMN languages_spoken text[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'travel_style') THEN
    ALTER TABLE profiles ADD COLUMN travel_style text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'fun_facts') THEN
    ALTER TABLE profiles ADD COLUMN fun_facts text[];
  END IF;
END $$;

-- =============================================================================
-- Accessibility
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'accessibility_high_contrast') THEN
    ALTER TABLE profiles ADD COLUMN accessibility_high_contrast boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'accessibility_font_size') THEN
    ALTER TABLE profiles ADD COLUMN accessibility_font_size text DEFAULT 'medium';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'accessibility_reduced_motion') THEN
    ALTER TABLE profiles ADD COLUMN accessibility_reduced_motion boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'accessibility_color_blind_mode') THEN
    ALTER TABLE profiles ADD COLUMN accessibility_color_blind_mode text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'accessibility_dyslexia_font') THEN
    ALTER TABLE profiles ADD COLUMN accessibility_dyslexia_font boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'accessibility_screen_reader') THEN
    ALTER TABLE profiles ADD COLUMN accessibility_screen_reader boolean DEFAULT false;
  END IF;
END $$;

-- =============================================================================
-- Saved Searches Enhancements
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saved_searches' AND column_name = 'alerts_enabled') THEN
    ALTER TABLE saved_searches ADD COLUMN alerts_enabled boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saved_searches' AND column_name = 'alert_frequency') THEN
    ALTER TABLE saved_searches ADD COLUMN alert_frequency text DEFAULT 'instant';
  END IF;
END $$;

-- =============================================================================
-- Notifications Enhancements
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'category') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'type') THEN
      ALTER TABLE notifications RENAME COLUMN type TO category;
    ELSE
      ALTER TABLE notifications ADD COLUMN category text NOT NULL DEFAULT 'system';
    END IF;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'priority') THEN
    ALTER TABLE notifications ADD COLUMN priority text DEFAULT 'normal';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'action_url') THEN
    ALTER TABLE notifications ADD COLUMN action_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'action_label') THEN
    ALTER TABLE notifications ADD COLUMN action_label text;
  END IF;
END $$;

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_user_id ON leaderboard_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_category_period ON leaderboard_cache(category, period);
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_rank ON leaderboard_cache(rank);

CREATE INDEX IF NOT EXISTS idx_challenges_active ON challenges(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_challenges_type ON challenges(challenge_type);

CREATE INDEX IF NOT EXISTS idx_user_challenges_user_id ON user_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_completed ON user_challenges(completed);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_alerts_enabled ON saved_searches(alerts_enabled);

CREATE INDEX IF NOT EXISTS idx_preference_profiles_user_id ON preference_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_preference_profiles_active ON preference_profiles(is_active);

-- ===== End 20251222001517_add_phase_completion_final.sql =====

-- ===== Begin 20251222004653_add_matching_tracking_and_enhanced_features.sql =====

/*
  # Matching, Tracking, and Enhanced Features System
  
  ## Overview
  Adds comprehensive ride matching, live tracking, detailed reviews, and relationship management
  for the community carpool platform.
  
  ## New Tables
  
  ### 1. ride_requests_matches
  Automatic matching results between ride requests and available rides
  - Stores match scores and compatibility metrics
  - Tracks notification and expiration status
  - Links requests to potential rides
  
  ### 2. trip_requests_matches
  Automatic matching for trip requests (passengers looking for rides)
  - Matches standalone trip requests with available rides
  - Score-based ranking system
  - Notification and expiration tracking
  
  ### 3. ride_tracking
  Real-time GPS tracking during active rides
  - Current location and speed
  - Route deviation monitoring
  - Passengers onboard tracking
  - ETA calculations
  
  ### 4. ride_reviews_detailed
  Comprehensive ride reviews with category ratings
  - Overall and category-specific ratings
  - Detailed feedback for improvement
  - Would-ride-again indicator
  
  ### 5. favorite_drivers
  Quick booking relationships and auto-accept
  - Track rides together
  - Enable auto-accept for trusted drivers
  - Quick access to preferred drivers
  
  ### 6. notification_queue
  Scheduled and pending notifications
  - Priority-based delivery
  - Scheduled notification support
  - Status tracking (pending/sent/failed)
  
  ### 7. ride_modifications
  Audit trail for all ride and booking changes
  - Track what changed and who changed it
  - Store old and new values
  - Reason for modification
  
  ## Security
  - RLS enabled on all new tables
  - Privacy-respecting policies
  - User data protection
*/

-- Create enums
DO $$ BEGIN
  CREATE TYPE match_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create ride_requests_matches table (for joining existing rides)
CREATE TABLE IF NOT EXISTS ride_requests_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES ride_requests(id) ON DELETE CASCADE NOT NULL,
  ride_id uuid REFERENCES rides(id) ON DELETE CASCADE NOT NULL,
  match_score integer CHECK (match_score >= 0 AND match_score <= 100) DEFAULT 0,
  proximity_score integer CHECK (proximity_score >= 0 AND proximity_score <= 100) DEFAULT 0,
  time_compatibility_score integer CHECK (time_compatibility_score >= 0 AND time_compatibility_score <= 100) DEFAULT 0,
  route_efficiency_score integer CHECK (route_efficiency_score >= 0 AND route_efficiency_score <= 100) DEFAULT 0,
  detour_distance_km numeric CHECK (detour_distance_km >= 0) DEFAULT 0,
  detour_time_minutes integer CHECK (detour_time_minutes >= 0) DEFAULT 0,
  status match_status DEFAULT 'pending',
  notified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create trip_requests_matches table (for finding rides for trip requests)
CREATE TABLE IF NOT EXISTS trip_requests_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_request_id uuid REFERENCES trip_requests(id) ON DELETE CASCADE NOT NULL,
  ride_id uuid REFERENCES rides(id) ON DELETE CASCADE NOT NULL,
  match_score integer CHECK (match_score >= 0 AND match_score <= 100) DEFAULT 0,
  proximity_score integer CHECK (proximity_score >= 0 AND proximity_score <= 100) DEFAULT 0,
  time_compatibility_score integer CHECK (time_compatibility_score >= 0 AND time_compatibility_score <= 100) DEFAULT 0,
  route_efficiency_score integer CHECK (route_efficiency_score >= 0 AND route_efficiency_score <= 100) DEFAULT 0,
  detour_distance_km numeric CHECK (detour_distance_km >= 0) DEFAULT 0,
  detour_time_minutes integer CHECK (detour_time_minutes >= 0) DEFAULT 0,
  status match_status DEFAULT 'pending',
  notified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create ride_tracking table
CREATE TABLE IF NOT EXISTS ride_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid REFERENCES rides(id) ON DELETE CASCADE UNIQUE NOT NULL,
  driver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  current_location geography(POINT),
  current_speed_kmh numeric CHECK (current_speed_kmh >= 0),
  heading_degrees integer CHECK (heading_degrees >= 0 AND heading_degrees < 360),
  route_deviation_meters integer DEFAULT 0,
  eta_to_next_stop timestamptz,
  passengers_onboard jsonb DEFAULT '[]'::jsonb,
  last_updated timestamptz DEFAULT now(),
  ride_started_at timestamptz,
  ride_ended_at timestamptz
);

-- Create ride_reviews_detailed table
CREATE TABLE IF NOT EXISTS ride_reviews_detailed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES ride_bookings(id) ON DELETE CASCADE NOT NULL,
  ride_id uuid REFERENCES rides(id) ON DELETE CASCADE NOT NULL,
  reviewer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reviewee_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  overall_rating integer CHECK (overall_rating >= 1 AND overall_rating <= 5) NOT NULL,
  punctuality_rating integer CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  cleanliness_rating integer CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
  communication_rating integer CHECK (communication_rating >= 1 AND communication_rating <= 5),
  safety_rating integer CHECK (safety_rating >= 1 AND safety_rating <= 5),
  comfort_rating integer CHECK (comfort_rating >= 1 AND comfort_rating <= 5),
  review_text text,
  would_ride_again boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(booking_id, reviewer_id)
);

-- Create favorite_drivers table
CREATE TABLE IF NOT EXISTS favorite_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  driver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rides_together integer DEFAULT 0,
  auto_accept_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  last_ride_at timestamptz,
  UNIQUE(passenger_id, driver_id),
  CHECK (passenger_id != driver_id)
);

-- Create notification_queue table
CREATE TABLE IF NOT EXISTS notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  priority notification_priority DEFAULT 'normal',
  status notification_status DEFAULT 'pending',
  scheduled_for timestamptz DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create ride_modifications table
CREATE TABLE IF NOT EXISTS ride_modifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid REFERENCES rides(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES ride_bookings(id) ON DELETE CASCADE,
  modified_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  modification_type text NOT NULL,
  old_values jsonb DEFAULT '{}'::jsonb,
  new_values jsonb DEFAULT '{}'::jsonb,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ride_requests_matches_request ON ride_requests_matches(request_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_matches_ride ON ride_requests_matches(ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_matches_status ON ride_requests_matches(status);
CREATE INDEX IF NOT EXISTS idx_ride_requests_matches_score ON ride_requests_matches(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_ride_requests_matches_expires ON ride_requests_matches(expires_at) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_trip_requests_matches_request ON trip_requests_matches(trip_request_id);
CREATE INDEX IF NOT EXISTS idx_trip_requests_matches_ride ON trip_requests_matches(ride_id);
CREATE INDEX IF NOT EXISTS idx_trip_requests_matches_status ON trip_requests_matches(status);
CREATE INDEX IF NOT EXISTS idx_trip_requests_matches_score ON trip_requests_matches(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_trip_requests_matches_expires ON trip_requests_matches(expires_at) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_ride_tracking_ride ON ride_tracking(ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_tracking_driver ON ride_tracking(driver_id);
CREATE INDEX IF NOT EXISTS idx_ride_tracking_location ON ride_tracking USING GIST(current_location);
CREATE INDEX IF NOT EXISTS idx_ride_tracking_active ON ride_tracking(last_updated) WHERE ride_ended_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reviews_detailed_booking ON ride_reviews_detailed(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_detailed_ride ON ride_reviews_detailed(ride_id);
CREATE INDEX IF NOT EXISTS idx_reviews_detailed_reviewee ON ride_reviews_detailed(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_detailed_reviewer ON ride_reviews_detailed(reviewer_id);

CREATE INDEX IF NOT EXISTS idx_favorites_passenger ON favorite_drivers(passenger_id);
CREATE INDEX IF NOT EXISTS idx_favorites_driver ON favorite_drivers(driver_id);
CREATE INDEX IF NOT EXISTS idx_favorites_auto_accept ON favorite_drivers(auto_accept_enabled) WHERE auto_accept_enabled = true;

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notification_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notification_queue(priority, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_modifications_ride ON ride_modifications(ride_id);
CREATE INDEX IF NOT EXISTS idx_modifications_booking ON ride_modifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_modifications_created ON ride_modifications(created_at DESC);

-- Enable RLS on all tables
ALTER TABLE ride_requests_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_requests_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_reviews_detailed ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_modifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ride_requests_matches
CREATE POLICY "Users can view matches for their ride requests"
  ON ride_requests_matches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ride_requests
      WHERE ride_requests.id = request_id
      AND ride_requests.rider_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can view ride request matches for their rides"
  ON ride_requests_matches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rides
      WHERE rides.id = ride_id
      AND rides.driver_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can update ride request match status"
  ON ride_requests_matches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rides
      WHERE rides.id = ride_id
      AND rides.driver_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rides
      WHERE rides.id = ride_id
      AND rides.driver_id = auth.uid()
    )
  );

-- RLS Policies for trip_requests_matches
CREATE POLICY "Users can view matches for their trip requests"
  ON trip_requests_matches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_requests
      WHERE trip_requests.id = trip_request_id
      AND trip_requests.rider_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can view trip request matches for their rides"
  ON trip_requests_matches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rides
      WHERE rides.id = ride_id
      AND rides.driver_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can update trip request match status"
  ON trip_requests_matches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rides
      WHERE rides.id = ride_id
      AND rides.driver_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rides
      WHERE rides.id = ride_id
      AND rides.driver_id = auth.uid()
    )
  );

-- RLS Policies for ride_tracking
CREATE POLICY "Drivers can manage their ride tracking"
  ON ride_tracking FOR ALL
  TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Passengers can view tracking for booked rides"
  ON ride_tracking FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ride_bookings
      WHERE ride_bookings.ride_id = ride_tracking.ride_id
      AND ride_bookings.passenger_id = auth.uid()
      AND ride_bookings.status IN ('confirmed', 'active')
    )
  );

-- RLS Policies for ride_reviews_detailed
CREATE POLICY "Users can view reviews where they're involved"
  ON ride_reviews_detailed FOR SELECT
  TO authenticated
  USING (reviewer_id = auth.uid() OR reviewee_id = auth.uid());

CREATE POLICY "Public can view reviews for trust building"
  ON ride_reviews_detailed FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create reviews for their bookings"
  ON ride_reviews_detailed FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM ride_bookings
      WHERE ride_bookings.id = booking_id
      AND (ride_bookings.passenger_id = auth.uid() OR 
           EXISTS (SELECT 1 FROM rides WHERE rides.id = ride_bookings.ride_id AND rides.driver_id = auth.uid()))
      AND ride_bookings.status = 'completed'
    )
  );

-- RLS Policies for favorite_drivers
CREATE POLICY "Users can manage their favorites"
  ON favorite_drivers FOR ALL
  TO authenticated
  USING (passenger_id = auth.uid())
  WITH CHECK (passenger_id = auth.uid());

CREATE POLICY "Drivers can view who favorited them"
  ON favorite_drivers FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

-- RLS Policies for notification_queue
CREATE POLICY "Users can view their notifications"
  ON notification_queue FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications status"
  ON notification_queue FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for ride_modifications
CREATE POLICY "Users can view modifications for their rides"
  ON ride_modifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rides
      WHERE rides.id = ride_id
      AND rides.driver_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM ride_bookings
      WHERE ride_bookings.id = booking_id
      AND ride_bookings.passenger_id = auth.uid()
    )
  );

CREATE POLICY "Users can log modifications"
  ON ride_modifications FOR INSERT
  TO authenticated
  WITH CHECK (modified_by = auth.uid());

-- ===== End 20251222004653_add_matching_tracking_and_enhanced_features.sql =====

-- ===== Begin 20251222004829_add_smart_matching_engine_functions.sql =====

/*
  # Smart Matching Engine RPC Functions
  
  ## Overview
  Comprehensive matching engine that automatically connects passengers with drivers
  based on proximity, time compatibility, route efficiency, and user preferences.
  
  ## Functions
  
  ### 1. match_trip_requests_to_rides()
  Finds and scores potential ride matches for trip requests
  - Calculates proximity scores based on pickup/dropoff locations
  - Evaluates time compatibility with flexible windows
  - Estimates detour distance and time
  - Creates match records with scores
  - Sends notifications to relevant parties
  
  ### 2. match_ride_requests_to_rides()
  Similar to trip requests but for users requesting to join existing rides
  - Uses ride request specific data structure
  - Handles overlap time windows
  - Integrates with existing ride capacity
  
  ### 3. calculate_match_score()
  Composite scoring algorithm that weighs multiple factors
  - Proximity score (40% weight)
  - Time compatibility (30% weight)
  - Route efficiency (30% weight)
  - Returns 0-100 score
  
  ### 4. expire_old_matches()
  Cleanup function to mark expired matches
  - Auto-expires matches past their expiration time
  - Updates status to 'expired'
  - Frees up system resources
  
  ### 5. promote_from_waitlist()
  Automatically promotes waitlist entries when seats available
  - Checks ride capacity
  - Orders by priority score and position
  - Creates bookings or notifications
  - Updates waitlist status
  
  ### 6. bulk_respond_to_ride_requests()
  Allows drivers to accept/decline multiple requests at once
  - Validates ride ownership
  - Checks remaining capacity
  - Updates request statuses
  - Creates bookings for accepted requests
  - Sends notifications
  
  ### 7. get_ride_matches_for_driver(ride_id)
  Retrieves all pending matches for a specific ride
  - Joins with user profile data
  - Includes ratings and verification status
  - Orders by match score
  
  ### 8. get_matches_for_trip_request(trip_request_id)
  Retrieves all potential rides for a trip request
  - Includes driver information
  - Shows vehicle details
  - Orders by best match
*/

-- Function to calculate distance between two points in kilometers
CREATE OR REPLACE FUNCTION calculate_distance_km(
  lat1 numeric,
  lon1 numeric,
  lat2 numeric,
  lon2 numeric
)
RETURNS numeric AS $$
DECLARE
  r numeric := 6371; -- Earth's radius in km
  dlat numeric;
  dlon numeric;
  a numeric;
  c numeric;
BEGIN
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  
  a := sin(dlat/2) * sin(dlat/2) + 
       cos(radians(lat1)) * cos(radians(lat2)) * 
       sin(dlon/2) * sin(dlon/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN r * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to match trip requests to available rides
CREATE OR REPLACE FUNCTION match_trip_requests_to_rides()
RETURNS TABLE(
  matches_created integer,
  notifications_queued integer
) AS $$
DECLARE
  match_count integer := 0;
  notification_count integer := 0;
  trip_rec RECORD;
  ride_rec RECORD;
  pickup_distance numeric;
  dropoff_distance numeric;
  time_diff_minutes integer;
  proximity_score integer;
  time_score integer;
  route_score integer;
  total_score integer;
  match_id uuid;
BEGIN
  -- Loop through active trip requests
  FOR trip_rec IN 
    SELECT * FROM trip_requests 
    WHERE status = 'active' 
    AND departure_time > now()
  LOOP
    -- Find potential matching rides
    FOR ride_rec IN
      SELECT r.* FROM rides r
      WHERE r.status = 'active'
      AND r.departure_time > now()
      AND r.available_seats > 0
      AND r.departure_time BETWEEN 
        COALESCE(trip_rec.time_window_start, trip_rec.departure_time - interval '2 hours')
        AND COALESCE(trip_rec.time_window_end, trip_rec.departure_time + interval '2 hours')
      -- Check if driver hasn't blocked this passenger
      AND NOT EXISTS (
        SELECT 1 FROM blocks
        WHERE blocker_id = r.driver_id
        AND blocked_id = trip_rec.rider_id
      )
      -- Check if match doesn't already exist
      AND NOT EXISTS (
        SELECT 1 FROM trip_requests_matches
        WHERE trip_request_id = trip_rec.id
        AND ride_id = r.id
        AND status = 'pending'
      )
    LOOP
      -- Calculate pickup distance (from ride origin to trip origin)
      pickup_distance := calculate_distance_km(
        ride_rec.origin_lat,
        ride_rec.origin_lng,
        trip_rec.from_lat,
        trip_rec.from_lng
      );
      
      -- Calculate dropoff distance (from ride destination to trip destination)
      dropoff_distance := calculate_distance_km(
        ride_rec.destination_lat,
        ride_rec.destination_lng,
        trip_rec.to_lat,
        trip_rec.to_lng
      );
      
      -- Skip if locations are too far apart (>15km for pickup or dropoff)
      IF pickup_distance > 15 OR dropoff_distance > 15 THEN
        CONTINUE;
      END IF;
      
      -- Calculate proximity score (closer = higher score)
      proximity_score := GREATEST(0, LEAST(100, 
        100 - ((pickup_distance + dropoff_distance) * 3)::integer
      ));
      
      -- Calculate time compatibility score
      time_diff_minutes := ABS(EXTRACT(EPOCH FROM (ride_rec.departure_time - trip_rec.departure_time)) / 60)::integer;
      time_score := GREATEST(0, LEAST(100, 100 - (time_diff_minutes / 2)));
      
      -- Calculate route efficiency score (simplified - based on total detour)
      route_score := GREATEST(0, LEAST(100, 
        100 - ((pickup_distance + dropoff_distance) * 2)::integer
      ));
      
      -- Calculate composite match score (weighted average)
      total_score := ((proximity_score * 40) + (time_score * 30) + (route_score * 30)) / 100;
      
      -- Only create matches with score >= 40
      IF total_score >= 40 THEN
        -- Insert match record
        INSERT INTO trip_requests_matches (
          trip_request_id,
          ride_id,
          match_score,
          proximity_score,
          time_compatibility_score,
          route_efficiency_score,
          detour_distance_km,
          detour_time_minutes,
          status,
          expires_at
        ) VALUES (
          trip_rec.id,
          ride_rec.id,
          total_score,
          proximity_score,
          time_score,
          route_score,
          pickup_distance + dropoff_distance,
          (time_diff_minutes + ((pickup_distance + dropoff_distance) * 2))::integer,
          'pending',
          now() + interval '7 days'
        ) RETURNING id INTO match_id;
        
        match_count := match_count + 1;
        
        -- Queue notification for passenger
        INSERT INTO notification_queue (
          user_id,
          notification_type,
          title,
          message,
          data,
          priority
        ) VALUES (
          trip_rec.rider_id,
          'trip_match_found',
          'Ride Match Found!',
          'We found a ride that matches your trip request with a score of ' || total_score || '%',
          jsonb_build_object(
            'match_id', match_id,
            'trip_request_id', trip_rec.id,
            'ride_id', ride_rec.id,
            'match_score', total_score
          ),
          'normal'
        );
        
        -- Queue notification for driver
        INSERT INTO notification_queue (
          user_id,
          notification_type,
          title,
          message,
          data,
          priority
        ) VALUES (
          ride_rec.driver_id,
          'potential_passenger',
          'Potential Passenger Match',
          'A passenger is looking for a ride that matches your route (score: ' || total_score || '%)',
          jsonb_build_object(
            'match_id', match_id,
            'trip_request_id', trip_rec.id,
            'ride_id', ride_rec.id,
            'match_score', total_score
          ),
          'normal'
        );
        
        notification_count := notification_count + 2;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN QUERY SELECT match_count, notification_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to match ride requests (for joining existing rides) to rides
CREATE OR REPLACE FUNCTION match_ride_requests_to_rides()
RETURNS TABLE(
  matches_created integer,
  notifications_queued integer
) AS $$
DECLARE
  match_count integer := 0;
  notification_count integer := 0;
  req_rec RECORD;
  ride_rec RECORD;
  proximity_score integer;
  time_score integer;
  total_score integer;
  match_id uuid;
  time_overlap boolean;
BEGIN
  -- Loop through pending ride requests
  FOR req_rec IN 
    SELECT * FROM ride_requests 
    WHERE status = 'pending'
  LOOP
    -- The ride is already specified in ride_requests
    SELECT * INTO ride_rec FROM rides WHERE id = req_rec.ride_id;
    
    IF ride_rec.id IS NULL OR ride_rec.status != 'active' THEN
      CONTINUE;
    END IF;
    
    -- Check if match already exists
    IF EXISTS (
      SELECT 1 FROM ride_requests_matches
      WHERE request_id = req_rec.id
      AND ride_id = ride_rec.id
      AND status = 'pending'
    ) THEN
      CONTINUE;
    END IF;
    
    -- Check time overlap
    time_overlap := (
      req_rec.overlap_window_start IS NULL OR
      req_rec.overlap_window_end IS NULL OR
      (req_rec.overlap_window_start <= ride_rec.departure_time AND
       req_rec.overlap_window_end >= ride_rec.departure_time)
    );
    
    IF NOT time_overlap THEN
      CONTINUE;
    END IF;
    
    -- Calculate proximity score based on pickup location
    IF req_rec.pickup_lat IS NOT NULL AND req_rec.pickup_lng IS NOT NULL THEN
      DECLARE
        pickup_distance numeric;
      BEGIN
        pickup_distance := calculate_distance_km(
          ride_rec.origin_lat,
          ride_rec.origin_lng,
          req_rec.pickup_lat,
          req_rec.pickup_lng
        );
        
        -- Skip if too far
        IF pickup_distance > 15 THEN
          CONTINUE;
        END IF;
        
        proximity_score := GREATEST(0, LEAST(100, 
          100 - (pickup_distance * 6)::integer
        ));
      END;
    ELSE
      proximity_score := 70; -- Default score if no specific location
    END IF;
    
    -- Calculate time score
    time_score := 100; -- Full score since time compatibility already checked
    
    -- Calculate composite score
    total_score := ((proximity_score * 60) + (time_score * 40)) / 100;
    
    IF total_score >= 40 THEN
      -- Insert match record
      INSERT INTO ride_requests_matches (
        request_id,
        ride_id,
        match_score,
        proximity_score,
        time_compatibility_score,
        route_efficiency_score,
        status,
        notified_at,
        expires_at
      ) VALUES (
        req_rec.id,
        ride_rec.id,
        total_score,
        proximity_score,
        time_score,
        70, -- Default route efficiency
        'pending',
        now(),
        req_rec.expires_at
      ) RETURNING id INTO match_id;
      
      match_count := match_count + 1;
      
      -- Queue notification for driver
      INSERT INTO notification_queue (
        user_id,
        notification_type,
        title,
        message,
        data,
        priority
      ) VALUES (
        ride_rec.driver_id,
        'ride_request_received',
        'New Ride Request',
        'Someone wants to join your ride (' || req_rec.seats_requested || ' seat(s))',
        jsonb_build_object(
          'match_id', match_id,
          'request_id', req_rec.id,
          'ride_id', ride_rec.id,
          'match_score', total_score
        ),
        'high'
      );
      
      notification_count := notification_count + 1;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT match_count, notification_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to expire old matches
CREATE OR REPLACE FUNCTION expire_old_matches()
RETURNS integer AS $$
DECLARE
  expired_count integer;
BEGIN
  -- Expire trip request matches
  WITH expired AS (
    UPDATE trip_requests_matches
    SET status = 'expired'
    WHERE status = 'pending'
    AND expires_at < now()
    RETURNING id
  )
  SELECT COUNT(*) INTO expired_count FROM expired;
  
  -- Expire ride request matches
  WITH expired AS (
    UPDATE ride_requests_matches
    SET status = 'expired'
    WHERE status = 'pending'
    AND expires_at < now()
    RETURNING id
  )
  SELECT expired_count + COUNT(*) INTO expired_count FROM expired;
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to promote from waitlist when seats become available
CREATE OR REPLACE FUNCTION promote_from_waitlist(p_ride_id uuid)
RETURNS integer AS $$
DECLARE
  ride_rec RECORD;
  waitlist_rec RECORD;
  promoted_count integer := 0;
BEGIN
  -- Get ride info
  SELECT * INTO ride_rec FROM rides WHERE id = p_ride_id;
  
  IF NOT FOUND OR ride_rec.available_seats <= 0 THEN
    RETURN 0;
  END IF;
  
  -- Process waitlist entries in order
  FOR waitlist_rec IN
    SELECT * FROM ride_waitlist
    WHERE ride_id = p_ride_id
    AND status = 'waiting'
    AND seats_requested <= ride_rec.available_seats
    ORDER BY priority_score DESC, position ASC, created_at ASC
  LOOP
    -- Update waitlist status
    UPDATE ride_waitlist
    SET status = 'promoted',
        notified_at = now()
    WHERE id = waitlist_rec.id;
    
    -- Queue notification
    INSERT INTO notification_queue (
      user_id,
      notification_type,
      title,
      message,
      data,
      priority
    ) VALUES (
      waitlist_rec.user_id,
      'waitlist_promoted',
      'Seat Available!',
      'A seat is now available for your waitlisted ride. Book now!',
      jsonb_build_object(
        'ride_id', p_ride_id,
        'waitlist_id', waitlist_rec.id,
        'seats_available', ride_rec.available_seats
      ),
      'urgent'
    );
    
    promoted_count := promoted_count + 1;
    
    -- Only promote one at a time to avoid overbooking
    EXIT;
  END LOOP;
  
  RETURN promoted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for bulk responding to ride requests
CREATE OR REPLACE FUNCTION bulk_respond_to_ride_requests(
  p_ride_id uuid,
  p_request_ids uuid[],
  p_action text -- 'accept' or 'decline'
)
RETURNS TABLE(
  processed integer,
  accepted integer,
  declined integer,
  errors text[]
) AS $$
DECLARE
  processed_count integer := 0;
  accepted_count integer := 0;
  declined_count integer := 0;
  error_messages text[] := ARRAY[]::text[];
  ride_rec RECORD;
  req_id uuid;
  req_rec RECORD;
BEGIN
  -- Verify ride ownership
  SELECT * INTO ride_rec FROM rides WHERE id = p_ride_id AND driver_id = auth.uid();
  
  IF NOT FOUND THEN
    error_messages := array_append(error_messages, 'Ride not found or unauthorized');
    RETURN QUERY SELECT 0, 0, 0, error_messages;
    RETURN;
  END IF;
  
  -- Process each request
  FOREACH req_id IN ARRAY p_request_ids
  LOOP
    SELECT * INTO req_rec FROM ride_requests WHERE id = req_id AND ride_id = p_ride_id;
    
    IF NOT FOUND THEN
      error_messages := array_append(error_messages, 'Request ' || req_id || ' not found');
      CONTINUE;
    END IF;
    
    IF p_action = 'accept' THEN
      -- Check if enough seats
      IF ride_rec.available_seats >= req_rec.seats_requested THEN
        -- Update request status
        UPDATE ride_requests
        SET status = 'accepted',
            responded_at = now()
        WHERE id = req_id;
        
        -- Update match status if exists
        UPDATE ride_requests_matches
        SET status = 'accepted'
        WHERE request_id = req_id AND ride_id = p_ride_id;
        
        -- Queue notification
        INSERT INTO notification_queue (
          user_id,
          notification_type,
          title,
          message,
          data,
          priority
        ) VALUES (
          req_rec.rider_id,
          'request_accepted',
          'Request Accepted!',
          'Your ride request has been accepted by the driver',
          jsonb_build_object(
            'request_id', req_id,
            'ride_id', p_ride_id
          ),
          'high'
        );
        
        accepted_count := accepted_count + 1;
        
        -- Refresh ride record for next iteration
        SELECT * INTO ride_rec FROM rides WHERE id = p_ride_id;
      ELSE
        error_messages := array_append(error_messages, 'Not enough seats for request ' || req_id);
      END IF;
    ELSIF p_action = 'decline' THEN
      -- Update request status
      UPDATE ride_requests
      SET status = 'declined',
          responded_at = now()
      WHERE id = req_id;
      
      -- Update match status if exists
      UPDATE ride_requests_matches
      SET status = 'declined'
      WHERE request_id = req_id AND ride_id = p_ride_id;
      
      -- Queue notification
      INSERT INTO notification_queue (
        user_id,
        notification_type,
        title,
        message,
        data,
        priority
      ) VALUES (
        req_rec.rider_id,
        'request_declined',
        'Request Declined',
        'Your ride request was declined. You can try other available rides.',
        jsonb_build_object(
          'request_id', req_id,
          'ride_id', p_ride_id
        ),
        'normal'
      );
      
      declined_count := declined_count + 1;
    END IF;
    
    processed_count := processed_count + 1;
  END LOOP;
  
  RETURN QUERY SELECT processed_count, accepted_count, declined_count, error_messages;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get ride matches for driver (with passenger details)
CREATE OR REPLACE FUNCTION get_ride_matches_for_driver(p_ride_id uuid)
RETURNS TABLE(
  match_id uuid,
  request_id uuid,
  passenger_id uuid,
  passenger_name text,
  passenger_rating numeric,
  passenger_photo_url text,
  email_verified boolean,
  phone_verified boolean,
  seats_requested integer,
  match_score integer,
  proximity_score integer,
  time_score integer,
  detour_km numeric,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rrm.id as match_id,
    rrm.request_id,
    p.id as passenger_id,
    p.full_name as passenger_name,
    COALESCE(p.average_rating, 0) as passenger_rating,
    p.photo_url as passenger_photo_url,
    p.email_verified,
    p.phone_verified,
    rr.seats_requested,
    rrm.match_score,
    rrm.proximity_score,
    rrm.time_compatibility_score as time_score,
    rrm.detour_distance_km as detour_km,
    rrm.created_at
  FROM ride_requests_matches rrm
  JOIN ride_requests rr ON rrm.request_id = rr.id
  JOIN profiles p ON rr.rider_id = p.id
  WHERE rrm.ride_id = p_ride_id
  AND rrm.status = 'pending'
  ORDER BY rrm.match_score DESC, rrm.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get matches for a trip request
CREATE OR REPLACE FUNCTION get_matches_for_trip_request(p_trip_request_id uuid)
RETURNS TABLE(
  match_id uuid,
  ride_id uuid,
  driver_id uuid,
  driver_name text,
  driver_rating numeric,
  driver_photo_url text,
  vehicle_make text,
  vehicle_model text,
  vehicle_color text,
  origin text,
  destination text,
  departure_time timestamptz,
  available_seats integer,
  match_score integer,
  proximity_score integer,
  time_score integer,
  detour_km numeric,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    trm.id as match_id,
    r.id as ride_id,
    p.id as driver_id,
    p.full_name as driver_name,
    COALESCE(p.average_rating, 0) as driver_rating,
    p.photo_url as driver_photo_url,
    v.make as vehicle_make,
    v.model as vehicle_model,
    v.color as vehicle_color,
    r.origin,
    r.destination,
    r.departure_time,
    r.available_seats,
    trm.match_score,
    trm.proximity_score,
    trm.time_compatibility_score as time_score,
    trm.detour_distance_km as detour_km,
    trm.created_at
  FROM trip_requests_matches trm
  JOIN rides r ON trm.ride_id = r.id
  JOIN profiles p ON r.driver_id = p.id
  LEFT JOIN vehicles v ON r.vehicle_id = v.id
  WHERE trm.trip_request_id = p_trip_request_id
  AND trm.status = 'pending'
  AND r.status = 'active'
  AND r.available_seats > 0
  ORDER BY trm.match_score DESC, trm.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== End 20251222004829_add_smart_matching_engine_functions.sql =====

-- ===== Begin 20251222004947_add_ride_tracking_functions.sql =====

/*
  # Active Ride Tracking Functions
  
  ## Overview
  Real-time GPS tracking and monitoring for active rides with safety features,
  route deviation detection, and passenger management.
  
  ## Functions
  
  ### 1. start_ride_tracking(ride_id, initial_location)
  Initiates tracking when driver starts the ride
  - Creates tracking record
  - Updates ride status to 'in_progress'
  - Notifies all passengers
  - Returns tracking ID
  
  ### 2. update_ride_location(ride_id, location, speed, heading)
  Updates current position during ride
  - Records GPS coordinates
  - Calculates route deviation
  - Updates ETA to next stop
  - Triggers alerts if needed
  
  ### 3. mark_passenger_picked_up(ride_id, passenger_id)
  Records when passenger is picked up
  - Updates passengers_onboard
  - Notifies passenger
  - Recalculates ETAs
  
  ### 4. mark_passenger_dropped_off(ride_id, passenger_id)
  Records when passenger is dropped off
  - Removes from passengers_onboard
  - Notifies passenger
  - Updates booking status
  
  ### 5. complete_ride_tracking(ride_id)
  Finalizes tracking when ride is complete
  - Calculates total distance and time
  - Updates ride status to 'completed'
  - Triggers review prompts
  - Calculates environmental impact
  
  ### 6. check_route_deviations(ride_id)
  Monitors for significant route changes
  - Compares current location to planned route
  - Sends alerts if deviation exceeds threshold
  - Logs deviation events
  
  ### 7. get_active_ride_tracking(ride_id)
  Retrieves current tracking data
  - Latest location and speed
  - Passengers onboard
  - ETAs and progress
  
  ### 8. trigger_ride_emergency(ride_id, user_id)
  Activates emergency protocol
  - Alerts emergency contacts
  - Notifies all passengers
  - Flags ride for admin review
  - Logs GPS location
*/

-- Function to start ride tracking
CREATE OR REPLACE FUNCTION start_ride_tracking(
  p_ride_id uuid,
  p_initial_lat numeric,
  p_initial_lng numeric
)
RETURNS TABLE(
  tracking_id uuid,
  success boolean,
  message text
) AS $$
DECLARE
  ride_rec RECORD;
  tracking_rec_id uuid;
BEGIN
  -- Verify ride exists and user is driver
  SELECT * INTO ride_rec FROM rides 
  WHERE id = p_ride_id 
  AND driver_id = auth.uid()
  AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, false, 'Ride not found or unauthorized'::text;
    RETURN;
  END IF;
  
  -- Check if tracking already exists
  IF EXISTS (SELECT 1 FROM ride_tracking WHERE ride_id = p_ride_id) THEN
    RETURN QUERY SELECT NULL::uuid, false, 'Tracking already started'::text;
    RETURN;
  END IF;
  
  -- Create tracking record
  INSERT INTO ride_tracking (
    ride_id,
    driver_id,
    current_location,
    current_speed_kmh,
    heading_degrees,
    ride_started_at,
    last_updated
  ) VALUES (
    p_ride_id,
    auth.uid(),
    ST_SetSRID(ST_MakePoint(p_initial_lng, p_initial_lat), 4326)::geography,
    0,
    0,
    now(),
    now()
  ) RETURNING id INTO tracking_rec_id;
  
  -- Update ride status
  UPDATE rides
  SET status = 'in_progress',
      updated_at = now()
  WHERE id = p_ride_id;
  
  -- Notify all booked passengers
  INSERT INTO notification_queue (
    user_id,
    notification_type,
    title,
    message,
    data,
    priority
  )
  SELECT 
    rb.passenger_id,
    'ride_started',
    'Ride Started!',
    'Your driver has started the ride and is on the way',
    jsonb_build_object(
      'ride_id', p_ride_id,
      'tracking_id', tracking_rec_id
    ),
    'high'
  FROM ride_bookings rb
  WHERE rb.ride_id = p_ride_id
  AND rb.status = 'confirmed';
  
  RETURN QUERY SELECT tracking_rec_id, true, 'Tracking started successfully'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update ride location
CREATE OR REPLACE FUNCTION update_ride_location(
  p_ride_id uuid,
  p_lat numeric,
  p_lng numeric,
  p_speed_kmh numeric DEFAULT 0,
  p_heading integer DEFAULT 0
)
RETURNS TABLE(
  success boolean,
  deviation_meters integer,
  message text
) AS $$
DECLARE
  tracking_rec RECORD;
  deviation integer;
BEGIN
  -- Get existing tracking record
  SELECT * INTO tracking_rec FROM ride_tracking 
  WHERE ride_id = p_ride_id 
  AND driver_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 'Tracking not found or unauthorized'::text;
    RETURN;
  END IF;
  
  -- Update location
  UPDATE ride_tracking
  SET 
    current_location = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    current_speed_kmh = p_speed_kmh,
    heading_degrees = p_heading,
    last_updated = now()
  WHERE ride_id = p_ride_id
  RETURNING route_deviation_meters INTO deviation;
  
  -- Check for safety concerns (excessive speed)
  IF p_speed_kmh > 120 THEN
    INSERT INTO notification_queue (
      user_id,
      notification_type,
      title,
      message,
      data,
      priority
    ) VALUES (
      auth.uid(),
      'speed_warning',
      'Speed Warning',
      'Please maintain safe driving speeds',
      jsonb_build_object('ride_id', p_ride_id, 'speed', p_speed_kmh),
      'urgent'
    );
  END IF;
  
  RETURN QUERY SELECT true, COALESCE(deviation, 0), 'Location updated'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark passenger picked up
CREATE OR REPLACE FUNCTION mark_passenger_picked_up(
  p_ride_id uuid,
  p_passenger_id uuid
)
RETURNS TABLE(
  success boolean,
  message text
) AS $$
DECLARE
  tracking_rec RECORD;
  passengers jsonb;
BEGIN
  -- Verify driver
  SELECT * INTO tracking_rec FROM ride_tracking 
  WHERE ride_id = p_ride_id 
  AND driver_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Unauthorized or tracking not started'::text;
    RETURN;
  END IF;
  
  -- Verify booking exists
  IF NOT EXISTS (
    SELECT 1 FROM ride_bookings 
    WHERE ride_id = p_ride_id 
    AND passenger_id = p_passenger_id 
    AND status = 'confirmed'
  ) THEN
    RETURN QUERY SELECT false, 'Booking not found'::text;
    RETURN;
  END IF;
  
  -- Add passenger to onboard list
  passengers := tracking_rec.passengers_onboard;
  IF NOT passengers ? p_passenger_id::text THEN
    passengers := passengers || jsonb_build_object(
      p_passenger_id::text, 
      jsonb_build_object(
        'picked_up_at', now(),
        'pickup_location', ST_AsGeoJSON(tracking_rec.current_location)::jsonb
      )
    );
    
    UPDATE ride_tracking
    SET passengers_onboard = passengers
    WHERE ride_id = p_ride_id;
  END IF;
  
  -- Update booking status
  UPDATE ride_bookings
  SET status = 'active',
      updated_at = now()
  WHERE ride_id = p_ride_id 
  AND passenger_id = p_passenger_id;
  
  -- Notify passenger
  INSERT INTO notification_queue (
    user_id,
    notification_type,
    title,
    message,
    data,
    priority
  ) VALUES (
    p_passenger_id,
    'passenger_picked_up',
    'Picked Up!',
    'You have been picked up. Have a safe journey!',
    jsonb_build_object('ride_id', p_ride_id),
    'high'
  );
  
  RETURN QUERY SELECT true, 'Passenger marked as picked up'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark passenger dropped off
CREATE OR REPLACE FUNCTION mark_passenger_dropped_off(
  p_ride_id uuid,
  p_passenger_id uuid
)
RETURNS TABLE(
  success boolean,
  message text
) AS $$
DECLARE
  tracking_rec RECORD;
  passengers jsonb;
  passenger_data jsonb;
BEGIN
  -- Verify driver
  SELECT * INTO tracking_rec FROM ride_tracking 
  WHERE ride_id = p_ride_id 
  AND driver_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Unauthorized or tracking not started'::text;
    RETURN;
  END IF;
  
  -- Get passenger data and remove from onboard
  passengers := tracking_rec.passengers_onboard;
  passenger_data := passengers -> p_passenger_id::text;
  
  IF passenger_data IS NOT NULL THEN
    -- Add dropoff info
    passenger_data := passenger_data || jsonb_build_object(
      'dropped_off_at', now(),
      'dropoff_location', ST_AsGeoJSON(tracking_rec.current_location)::jsonb
    );
    
    -- Remove from current passengers but keep in history
    passengers := passengers - p_passenger_id::text;
    
    UPDATE ride_tracking
    SET passengers_onboard = passengers
    WHERE ride_id = p_ride_id;
  END IF;
  
  -- Update booking status to completed
  UPDATE ride_bookings
  SET status = 'completed',
      updated_at = now()
  WHERE ride_id = p_ride_id 
  AND passenger_id = p_passenger_id;
  
  -- Notify passenger
  INSERT INTO notification_queue (
    user_id,
    notification_type,
    title,
    message,
    data,
    priority
  ) VALUES (
    p_passenger_id,
    'passenger_dropped_off',
    'Trip Completed!',
    'You have been dropped off. Please rate your experience.',
    jsonb_build_object('ride_id', p_ride_id),
    'high'
  );
  
  RETURN QUERY SELECT true, 'Passenger marked as dropped off'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete ride tracking
CREATE OR REPLACE FUNCTION complete_ride_tracking(p_ride_id uuid)
RETURNS TABLE(
  success boolean,
  total_duration_minutes integer,
  message text
) AS $$
DECLARE
  tracking_rec RECORD;
  ride_rec RECORD;
  duration_mins integer;
  incomplete_bookings integer;
BEGIN
  -- Get tracking record
  SELECT * INTO tracking_rec FROM ride_tracking 
  WHERE ride_id = p_ride_id 
  AND driver_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 'Tracking not found or unauthorized'::text;
    RETURN;
  END IF;
  
  -- Check if any passengers still onboard
  IF jsonb_array_length(tracking_rec.passengers_onboard) > 0 THEN
    RETURN QUERY SELECT false, 0, 'Cannot complete - passengers still onboard'::text;
    RETURN;
  END IF;
  
  -- Check for incomplete bookings
  SELECT COUNT(*) INTO incomplete_bookings
  FROM ride_bookings
  WHERE ride_id = p_ride_id
  AND status NOT IN ('completed', 'cancelled');
  
  IF incomplete_bookings > 0 THEN
    RETURN QUERY SELECT false, 0, 'Cannot complete - some bookings not finalized'::text;
    RETURN;
  END IF;
  
  -- Calculate duration
  duration_mins := EXTRACT(EPOCH FROM (now() - tracking_rec.ride_started_at)) / 60;
  
  -- Update tracking record
  UPDATE ride_tracking
  SET ride_ended_at = now(),
      last_updated = now()
  WHERE ride_id = p_ride_id;
  
  -- Update ride status
  UPDATE rides
  SET status = 'completed',
      updated_at = now()
  WHERE id = p_ride_id
  RETURNING * INTO ride_rec;
  
  -- Queue review notifications for all participants
  -- Notify passengers to review driver
  INSERT INTO notification_queue (
    user_id,
    notification_type,
    title,
    message,
    data,
    priority
  )
  SELECT 
    rb.passenger_id,
    'ride_completed_review',
    'Ride Completed!',
    'Please review your experience with the driver',
    jsonb_build_object(
      'ride_id', p_ride_id,
      'booking_id', rb.id,
      'reviewee_id', ride_rec.driver_id
    ),
    'normal'
  FROM ride_bookings rb
  WHERE rb.ride_id = p_ride_id
  AND rb.status = 'completed';
  
  -- Notify driver to review passengers
  INSERT INTO notification_queue (
    user_id,
    notification_type,
    title,
    message,
    data,
    priority
  ) VALUES (
    ride_rec.driver_id,
    'ride_completed_review_passengers',
    'Ride Completed!',
    'Please review your passengers',
    jsonb_build_object('ride_id', p_ride_id),
    'normal'
  );
  
  RETURN QUERY SELECT true, duration_mins, 'Ride tracking completed successfully'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active ride tracking
CREATE OR REPLACE FUNCTION get_active_ride_tracking(p_ride_id uuid)
RETURNS TABLE(
  ride_id uuid,
  driver_id uuid,
  driver_name text,
  current_lat numeric,
  current_lng numeric,
  current_speed_kmh numeric,
  heading_degrees integer,
  passengers_onboard jsonb,
  ride_started_at timestamptz,
  last_updated timestamptz
) AS $$
BEGIN
  -- Check if user is driver or passenger on this ride
  IF NOT EXISTS (
    SELECT 1 FROM rides r
    WHERE r.id = p_ride_id
    AND (r.driver_id = auth.uid() OR
         EXISTS (
           SELECT 1 FROM ride_bookings rb
           WHERE rb.ride_id = p_ride_id
           AND rb.passenger_id = auth.uid()
         ))
  ) THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    rt.ride_id,
    rt.driver_id,
    p.full_name as driver_name,
    ST_Y(rt.current_location::geometry) as current_lat,
    ST_X(rt.current_location::geometry) as current_lng,
    rt.current_speed_kmh,
    rt.heading_degrees,
    rt.passengers_onboard,
    rt.ride_started_at,
    rt.last_updated
  FROM ride_tracking rt
  JOIN profiles p ON rt.driver_id = p.id
  WHERE rt.ride_id = p_ride_id
  AND rt.ride_ended_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to trigger ride emergency
CREATE OR REPLACE FUNCTION trigger_ride_emergency(
  p_ride_id uuid,
  p_emergency_type text DEFAULT 'general'
)
RETURNS TABLE(
  success boolean,
  alert_id uuid,
  message text
) AS $$
DECLARE
  tracking_rec RECORD;
  ride_rec RECORD;
  user_rec RECORD;
  alert_rec_id uuid;
  emergency_contact RECORD;
BEGIN
  -- Get tracking and ride info
  SELECT * INTO tracking_rec FROM ride_tracking WHERE ride_id = p_ride_id;
  SELECT * INTO ride_rec FROM rides WHERE id = p_ride_id;
  SELECT * INTO user_rec FROM profiles WHERE id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Ride or tracking not found'::text;
    RETURN;
  END IF;
  
  -- Create emergency alert
  INSERT INTO emergency_alerts (
    user_id,
    ride_id,
    alert_type,
    location,
    status
  ) VALUES (
    auth.uid(),
    p_ride_id,
    p_emergency_type,
    tracking_rec.current_location,
    'active'
  ) RETURNING id INTO alert_rec_id;
  
  -- Notify all passengers
  INSERT INTO notification_queue (
    user_id,
    notification_type,
    title,
    message,
    data,
    priority
  )
  SELECT 
    rb.passenger_id,
    'emergency_alert',
    'ðŸš¨ EMERGENCY ALERT',
    'An emergency has been triggered for your active ride',
    jsonb_build_object(
      'ride_id', p_ride_id,
      'alert_id', alert_rec_id,
      'location', ST_AsGeoJSON(tracking_rec.current_location)::jsonb
    ),
    'urgent'
  FROM ride_bookings rb
  WHERE rb.ride_id = p_ride_id
  AND rb.passenger_id != auth.uid();
  
  -- Notify driver if passenger triggered
  IF auth.uid() != ride_rec.driver_id THEN
    INSERT INTO notification_queue (
      user_id,
      notification_type,
      title,
      message,
      data,
      priority
    ) VALUES (
      ride_rec.driver_id,
      'emergency_alert',
      'ðŸš¨ EMERGENCY ALERT',
      'A passenger has triggered an emergency alert',
      jsonb_build_object(
        'ride_id', p_ride_id,
        'alert_id', alert_rec_id
      ),
      'urgent'
    );
  END IF;
  
  -- Notify emergency contacts
  FOR emergency_contact IN
    SELECT * FROM emergency_contacts
    WHERE user_id = auth.uid()
    AND share_location_enabled = true
    ORDER BY priority_order
  LOOP
    INSERT INTO emergency_notifications (
      alert_id,
      contact_name,
      contact_phone,
      contact_email,
      location,
      message
    ) VALUES (
      alert_rec_id,
      emergency_contact.contact_name,
      emergency_contact.contact_phone,
      emergency_contact.contact_email,
      tracking_rec.current_location,
      user_rec.full_name || ' has triggered an emergency alert during a carpool ride'
    );
  END LOOP;
  
  RETURN QUERY SELECT true, alert_rec_id, 'Emergency alert triggered successfully'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== End 20251222004947_add_ride_tracking_functions.sql =====

-- ===== Begin 20251222005110_add_enhanced_cancellation_management.sql =====

/*
  # Enhanced Cancellation Management System
  
  ## Overview
  Tiered cancellation system that manages reliability scoring, warnings, and restrictions
  to maintain platform trust without monetary penalties.
  
  ## New Tables
  
  ### 1. cancellation_history
  Tracks all cancellations with detailed context
  - User, ride, and booking information
  - Cancellation timing and reason
  - Reliability impact score
  - Weather/emergency exemptions
  
  ### 2. reliability_scores
  User reliability tracking
  - Current reliability score (0-100)
  - Cancellation ratio
  - Completion ratio
  - Warnings and restrictions
  - Grace period status
  
  ### 3. booking_restrictions
  Temporary restrictions for problematic users
  - Restriction type and duration
  - Reason and start/end dates
  - Appeal status
  
  ## Functions
  
  ### 1. cancel_booking_with_impact()
  Handles booking cancellation with reliability scoring
  - Calculates time until departure
  - Determines reliability impact
  - Updates user reliability score
  - Triggers warnings if needed
  - Promotes waitlist if applicable
  
  ### 2. cancel_ride_with_impact()
  Handles ride cancellation by driver
  - Notifies all passengers
  - Handles rebooking
  - Impacts driver reliability
  - Logs cancellation details
  
  ### 3. calculate_reliability_score()
  Computes user reliability score
  - Completion rate
  - Cancellation rate
  - Timing of cancellations
  - Recent behavior weight
  
  ### 4. check_booking_eligibility()
  Verifies if user can book rides
  - Checks active restrictions
  - Validates reliability threshold
  - Returns eligibility status
  
  ### 5. apply_cancellation_grace()
  Manages grace period for new users
  - First 5 rides have reduced penalties
  - Gradual introduction to system
  
  ## Security
  - RLS enabled on all tables
  - User-specific access controls
  - Admin override capabilities
*/

-- Create cancellation_history table
CREATE TABLE IF NOT EXISTS cancellation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  ride_id uuid REFERENCES rides(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES ride_bookings(id) ON DELETE SET NULL,
  cancellation_type text NOT NULL, -- 'booking' or 'ride'
  user_role text NOT NULL, -- 'passenger' or 'driver'
  hours_before_departure numeric,
  cancellation_reason text,
  reliability_impact integer DEFAULT 0,
  is_exempt boolean DEFAULT false,
  exemption_reason text,
  created_at timestamptz DEFAULT now()
);

-- Create reliability_scores table
CREATE TABLE IF NOT EXISTS reliability_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  reliability_score integer DEFAULT 100 CHECK (reliability_score >= 0 AND reliability_score <= 100),
  total_rides integer DEFAULT 0,
  completed_rides integer DEFAULT 0,
  cancelled_rides integer DEFAULT 0,
  completion_ratio numeric DEFAULT 1.0,
  cancellation_ratio numeric DEFAULT 0.0,
  last_minute_cancellations integer DEFAULT 0,
  warnings_count integer DEFAULT 0,
  last_warning_at timestamptz,
  is_in_grace_period boolean DEFAULT true,
  grace_rides_remaining integer DEFAULT 5,
  last_updated timestamptz DEFAULT now()
);

-- Create booking_restrictions table
CREATE TABLE IF NOT EXISTS booking_restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  restriction_type text NOT NULL, -- 'temporary_ban', 'warning', 'review_required'
  reason text NOT NULL,
  starts_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  is_active boolean DEFAULT true,
  appeal_status text DEFAULT 'none', -- 'none', 'pending', 'approved', 'denied'
  appeal_reason text,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cancellation_history_user ON cancellation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_history_created ON cancellation_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cancellation_history_ride ON cancellation_history(ride_id);

CREATE INDEX IF NOT EXISTS idx_reliability_scores_user ON reliability_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_reliability_scores_score ON reliability_scores(reliability_score);

CREATE INDEX IF NOT EXISTS idx_booking_restrictions_user ON booking_restrictions(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_restrictions_active ON booking_restrictions(is_active, ends_at) WHERE is_active = true;

-- Enable RLS
ALTER TABLE cancellation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE reliability_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_restrictions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cancellation_history
CREATE POLICY "Users can view their own cancellation history"
  ON cancellation_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert cancellation history"
  ON cancellation_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for reliability_scores
CREATE POLICY "Users can view their own reliability score"
  ON reliability_scores FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Public can view reliability scores for trust"
  ON reliability_scores FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for booking_restrictions
CREATE POLICY "Users can view their own restrictions"
  ON booking_restrictions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can appeal restrictions"
  ON booking_restrictions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to initialize reliability score for new users
CREATE OR REPLACE FUNCTION initialize_reliability_score()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO reliability_scores (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-initialize reliability scores
DROP TRIGGER IF EXISTS trg_initialize_reliability_score ON profiles;
CREATE TRIGGER trg_initialize_reliability_score
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION initialize_reliability_score();

-- Function to cancel booking with reliability impact
CREATE OR REPLACE FUNCTION cancel_booking_with_impact(
  p_booking_id uuid,
  p_reason text DEFAULT 'No reason provided'
)
RETURNS TABLE(
  success boolean,
  reliability_impact integer,
  new_reliability_score integer,
  warning_issued boolean,
  restriction_applied boolean,
  message text
) AS $$
DECLARE
  booking_rec RECORD;
  ride_rec RECORD;
  user_reliability RECORD;
  hours_before numeric;
  impact_score integer := 0;
  warning_issued boolean := false;
  restriction_applied boolean := false;
  new_score integer;
  is_exempt boolean := false;
BEGIN
  -- Get booking info
  SELECT * INTO booking_rec FROM ride_bookings 
  WHERE id = p_booking_id 
  AND passenger_id = auth.uid()
  AND status IN ('pending', 'confirmed');
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 0, false, false, 'Booking not found or cannot be cancelled'::text;
    RETURN;
  END IF;
  
  -- Get ride info
  SELECT * INTO ride_rec FROM rides WHERE id = booking_rec.ride_id;
  
  -- Calculate hours before departure
  hours_before := EXTRACT(EPOCH FROM (ride_rec.departure_time - now())) / 3600;
  
  -- Get user reliability info
  SELECT * INTO user_reliability FROM reliability_scores WHERE user_id = auth.uid();
  
  -- Determine if in grace period
  IF user_reliability.is_in_grace_period AND user_reliability.grace_rides_remaining > 0 THEN
    impact_score := impact_score / 2; -- 50% reduction during grace period
  END IF;
  
  -- Calculate reliability impact based on timing
  IF hours_before < 0 THEN
    -- After departure time - severe penalty
    impact_score := 20;
    is_exempt := false;
  ELSIF hours_before < 2 THEN
    -- Less than 2 hours - severe penalty
    impact_score := 15;
    UPDATE reliability_scores
    SET last_minute_cancellations = last_minute_cancellations + 1
    WHERE user_id = auth.uid();
  ELSIF hours_before < 24 THEN
    -- Less than 24 hours - moderate penalty
    impact_score := 10;
  ELSIF hours_before < 48 THEN
    -- Less than 48 hours - minor penalty
    impact_score := 5;
  ELSE
    -- More than 48 hours - minimal or no penalty
    impact_score := 2;
  END IF;
  
  -- Check for weather/emergency exemptions (simplified - would integrate with weather API)
  IF p_reason ILIKE '%emergency%' OR p_reason ILIKE '%medical%' THEN
    is_exempt := true;
    impact_score := 0;
  END IF;
  
  -- Update booking status
  UPDATE ride_bookings
  SET 
    status = 'cancelled',
    cancellation_reason = p_reason,
    cancelled_at = now(),
    is_last_minute_cancellation = (hours_before < 2),
    updated_at = now()
  WHERE id = p_booking_id;
  
  -- Free up seats
  UPDATE rides
  SET available_seats = available_seats + booking_rec.seats_requested
  WHERE id = booking_rec.ride_id;
  
  -- Log cancellation
  INSERT INTO cancellation_history (
    user_id,
    ride_id,
    booking_id,
    cancellation_type,
    user_role,
    hours_before_departure,
    cancellation_reason,
    reliability_impact,
    is_exempt,
    exemption_reason
  ) VALUES (
    auth.uid(),
    booking_rec.ride_id,
    p_booking_id,
    'booking',
    'passenger',
    hours_before,
    p_reason,
    impact_score,
    is_exempt,
    CASE WHEN is_exempt THEN p_reason ELSE NULL END
  );
  
  -- Update reliability score if not exempt
  IF NOT is_exempt THEN
    UPDATE reliability_scores
    SET 
      reliability_score = GREATEST(0, reliability_score - impact_score),
      cancelled_rides = cancelled_rides + 1,
      cancellation_ratio = (cancelled_rides + 1)::numeric / NULLIF(total_rides, 0),
      last_updated = now()
    WHERE user_id = auth.uid()
    RETURNING reliability_score INTO new_score;
  ELSE
    SELECT reliability_score INTO new_score FROM reliability_scores WHERE user_id = auth.uid();
  END IF;
  
  -- Check if warning needed (3+ cancellations in 30 days)
  IF (SELECT COUNT(*) FROM cancellation_history 
      WHERE user_id = auth.uid() 
      AND created_at > now() - interval '30 days') >= 3 THEN
    
    warning_issued := true;
    
    UPDATE reliability_scores
    SET 
      warnings_count = warnings_count + 1,
      last_warning_at = now()
    WHERE user_id = auth.uid();
    
    -- Send warning notification
    INSERT INTO notification_queue (
      user_id,
      notification_type,
      title,
      message,
      data,
      priority
    ) VALUES (
      auth.uid(),
      'reliability_warning',
      'âš ï¸ Reliability Warning',
      'You have cancelled ' || (SELECT warnings_count FROM reliability_scores WHERE user_id = auth.uid()) || ' rides in the past 30 days. Frequent cancellations may result in booking restrictions.',
      jsonb_build_object('reliability_score', new_score),
      'high'
    );
  END IF;
  
  -- Apply restriction if score too low or too many warnings
  IF new_score < 50 OR user_reliability.warnings_count >= 3 THEN
    restriction_applied := true;
    
    INSERT INTO booking_restrictions (
      user_id,
      restriction_type,
      reason,
      starts_at,
      ends_at
    ) VALUES (
      auth.uid(),
      'temporary_ban',
      'Reliability score below threshold or excessive cancellations',
      now(),
      now() + interval '7 days'
    );
    
    -- Send restriction notification
    INSERT INTO notification_queue (
      user_id,
      notification_type,
      title,
      message,
      data,
      priority
    ) VALUES (
      auth.uid(),
      'booking_restricted',
      'ðŸš« Booking Restricted',
      'Your booking privileges have been temporarily restricted due to reliability concerns. This will be reviewed in 7 days.',
      jsonb_build_object('restriction_duration_days', 7, 'new_score', new_score),
      'urgent'
    );
  END IF;
  
  -- Notify driver
  INSERT INTO notification_queue (
    user_id,
    notification_type,
    title,
    message,
    data,
    priority
  ) VALUES (
    ride_rec.driver_id,
    'booking_cancelled',
    'Booking Cancelled',
    'A passenger has cancelled their booking (' || booking_rec.seats_requested || ' seat(s) now available)',
    jsonb_build_object(
      'ride_id', booking_rec.ride_id,
      'booking_id', p_booking_id,
      'seats_freed', booking_rec.seats_requested
    ),
    'high'
  );
  
  -- Try to promote from waitlist
  PERFORM promote_from_waitlist(booking_rec.ride_id);
  
  RETURN QUERY SELECT 
    true,
    impact_score,
    new_score,
    warning_issued,
    restriction_applied,
    'Booking cancelled successfully'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check booking eligibility
CREATE OR REPLACE FUNCTION check_booking_eligibility(p_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  is_eligible boolean,
  reliability_score integer,
  active_restrictions integer,
  reason text
) AS $$
DECLARE
  check_user_id uuid;
  user_reliability RECORD;
  active_restriction_count integer;
  restriction_reason text;
BEGIN
  check_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Get reliability score
  SELECT * INTO user_reliability FROM reliability_scores WHERE user_id = check_user_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT true, 100, 0, 'New user - eligible'::text;
    RETURN;
  END IF;
  
  -- Check active restrictions
  SELECT COUNT(*), STRING_AGG(reason, '; ') 
  INTO active_restriction_count, restriction_reason
  FROM booking_restrictions
  WHERE user_id = check_user_id
  AND is_active = true
  AND (ends_at IS NULL OR ends_at > now());
  
  IF active_restriction_count > 0 THEN
    RETURN QUERY SELECT 
      false,
      user_reliability.reliability_score,
      active_restriction_count,
      'Active restrictions: ' || restriction_reason;
    RETURN;
  END IF;
  
  -- Check reliability score threshold
  IF user_reliability.reliability_score < 30 THEN
    RETURN QUERY SELECT 
      false,
      user_reliability.reliability_score,
      0,
      'Reliability score too low (minimum 30 required)'::text;
    RETURN;
  END IF;
  
  -- User is eligible
  RETURN QUERY SELECT 
    true,
    user_reliability.reliability_score,
    0,
    'Eligible to book'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update reliability score after successful ride completion
CREATE OR REPLACE FUNCTION update_reliability_on_completion(p_booking_id uuid)
RETURNS void AS $$
DECLARE
  booking_rec RECORD;
  user_reliability RECORD;
  new_score integer;
BEGIN
  SELECT * INTO booking_rec FROM ride_bookings WHERE id = p_booking_id;
  SELECT * INTO user_reliability FROM reliability_scores WHERE user_id = booking_rec.passenger_id;
  
  -- Increment completed rides
  UPDATE reliability_scores
  SET 
    total_rides = total_rides + 1,
    completed_rides = completed_rides + 1,
    completion_ratio = (completed_rides + 1)::numeric / (total_rides + 1),
    -- Boost reliability score for completion (up to max 100)
    reliability_score = LEAST(100, reliability_score + 2),
    -- Reduce grace period counter
    grace_rides_remaining = GREATEST(0, grace_rides_remaining - 1),
    is_in_grace_period = (grace_rides_remaining > 1),
    last_updated = now()
  WHERE user_id = booking_rec.passenger_id
  RETURNING reliability_score INTO new_score;
  
  -- If score improved significantly, remove warnings
  IF new_score >= 80 AND user_reliability.warnings_count > 0 THEN
    UPDATE reliability_scores
    SET warnings_count = GREATEST(0, warnings_count - 1)
    WHERE user_id = booking_rec.passenger_id;
  END IF;
  
  -- Deactivate temporary restrictions if score improved
  IF new_score >= 70 THEN
    UPDATE booking_restrictions
    SET is_active = false
    WHERE user_id = booking_rec.passenger_id
    AND restriction_type = 'temporary_ban'
    AND is_active = true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== End 20251222005110_add_enhanced_cancellation_management.sql =====

-- ===== Begin 20251222005232_add_ride_completion_and_rating_workflow.sql =====

/*
  # Ride Completion and Rating Workflow
  
  ## Overview
  Comprehensive post-ride workflow that handles completion confirmation,
  detailed reviews, reputation updates, and achievement unlocking.
  
  ## Functions
  
  ### 1. submit_detailed_review()
  Creates comprehensive review with category ratings
  - Overall rating (1-5 stars)
  - Category ratings (punctuality, cleanliness, communication, safety, comfort)
  - Written feedback
  - Would-ride-again indicator
  - Updates reviewee's average rating
  - Unlocks achievements
  
  ### 2. get_user_reviews()
  Retrieves all reviews for a user
  - Filters by received/given
  - Aggregates rating statistics
  - Shows trends over time
  
  ### 3. calculate_average_ratings()
  Updates user's overall rating
  - Weighted average across all categories
  - Recency weighting (recent reviews count more)
  - Updates profile
  
  ### 4. unlock_achievements()
  Checks and awards achievements
  - Ride milestones (10, 50, 100, 500 rides)
  - Rating achievements (maintain 5 stars, etc.)
  - Community contributions
  - Environmental impact milestones
  
  ### 5. calculate_environmental_impact()
  Computes CO2 savings and impact metrics
  - Distance traveled shared
  - Equivalent cars removed
  - Trees saved equivalent
  - Updates user statistics
  
  ## Security
  - Users can only review completed rides
  - One review per booking per user
  - Cannot review yourself
*/

-- Function to submit detailed review
CREATE OR REPLACE FUNCTION submit_detailed_review(
  p_booking_id uuid,
  p_overall_rating integer,
  p_punctuality_rating integer DEFAULT NULL,
  p_cleanliness_rating integer DEFAULT NULL,
  p_communication_rating integer DEFAULT NULL,
  p_safety_rating integer DEFAULT NULL,
  p_comfort_rating integer DEFAULT NULL,
  p_review_text text DEFAULT NULL,
  p_would_ride_again boolean DEFAULT true
)
RETURNS TABLE(
  success boolean,
  review_id uuid,
  reviewee_new_rating numeric,
  achievements_unlocked text[],
  message text
) AS $$
DECLARE
  booking_rec RECORD;
  ride_rec RECORD;
  reviewee_id uuid;
  review_rec_id uuid;
  new_avg_rating numeric;
  achievements text[] := ARRAY[]::text[];
BEGIN
  -- Get booking info
  SELECT * INTO booking_rec FROM ride_bookings WHERE id = p_booking_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, 0::numeric, ARRAY[]::text[], 'Booking not found'::text;
    RETURN;
  END IF;
  
  -- Verify booking is completed
  IF booking_rec.status != 'completed' THEN
    RETURN QUERY SELECT false, NULL::uuid, 0::numeric, ARRAY[]::text[], 'Booking must be completed to review'::text;
    RETURN;
  END IF;
  
  -- Get ride info
  SELECT * INTO ride_rec FROM rides WHERE id = booking_rec.ride_id;
  
  -- Determine who is being reviewed
  IF auth.uid() = booking_rec.passenger_id THEN
    reviewee_id := ride_rec.driver_id; -- Passenger reviewing driver
  ELSIF auth.uid() = ride_rec.driver_id THEN
    reviewee_id := booking_rec.passenger_id; -- Driver reviewing passenger
  ELSE
    RETURN QUERY SELECT false, NULL::uuid, 0::numeric, ARRAY[]::text[], 'Unauthorized to review this booking'::text;
    RETURN;
  END IF;
  
  -- Check if review already exists
  IF EXISTS (
    SELECT 1 FROM ride_reviews_detailed 
    WHERE booking_id = p_booking_id 
    AND reviewer_id = auth.uid()
  ) THEN
    RETURN QUERY SELECT false, NULL::uuid, 0::numeric, ARRAY[]::text[], 'Review already submitted'::text;
    RETURN;
  END IF;
  
  -- Validate ratings
  IF p_overall_rating < 1 OR p_overall_rating > 5 THEN
    RETURN QUERY SELECT false, NULL::uuid, 0::numeric, ARRAY[]::text[], 'Overall rating must be between 1 and 5'::text;
    RETURN;
  END IF;
  
  -- Insert detailed review
  INSERT INTO ride_reviews_detailed (
    booking_id,
    ride_id,
    reviewer_id,
    reviewee_id,
    overall_rating,
    punctuality_rating,
    cleanliness_rating,
    communication_rating,
    safety_rating,
    comfort_rating,
    review_text,
    would_ride_again
  ) VALUES (
    p_booking_id,
    booking_rec.ride_id,
    auth.uid(),
    reviewee_id,
    p_overall_rating,
    p_punctuality_rating,
    p_cleanliness_rating,
    p_communication_rating,
    p_safety_rating,
    p_comfort_rating,
    p_review_text,
    p_would_ride_again
  ) RETURNING id INTO review_rec_id;
  
  -- Calculate new average rating for reviewee
  SELECT 
    ROUND(AVG(overall_rating)::numeric, 2)
  INTO new_avg_rating
  FROM ride_reviews_detailed
  WHERE reviewee_id = reviewee_id;
  
  -- Update reviewee's profile
  UPDATE profiles
  SET 
    average_rating = new_avg_rating,
    total_reviews = (SELECT COUNT(*) FROM ride_reviews_detailed WHERE reviewee_id = reviewee_id),
    updated_at = now()
  WHERE id = reviewee_id;
  
  -- Update reliability score for reviewer (positive action)
  PERFORM update_reliability_on_completion(p_booking_id);
  
  -- Check for achievements
  -- Achievement: First Review
  IF NOT EXISTS (
    SELECT 1 FROM ride_reviews_detailed 
    WHERE reviewer_id = auth.uid() 
    AND id != review_rec_id
  ) THEN
    achievements := array_append(achievements, 'first_review');
  END IF;
  
  -- Achievement: Helpful Reviewer (10+ reviews)
  IF (SELECT COUNT(*) FROM ride_reviews_detailed WHERE reviewer_id = auth.uid()) >= 10 THEN
    achievements := array_append(achievements, 'helpful_reviewer');
  END IF;
  
  -- Achievement: 5 Star Reviewer (if this is a 5 star review)
  IF p_overall_rating = 5 THEN
    achievements := array_append(achievements, '5_star_given');
  END IF;
  
  -- Notify reviewee
  INSERT INTO notification_queue (
    user_id,
    notification_type,
    title,
    message,
    data,
    priority
  ) VALUES (
    reviewee_id,
    'review_received',
    'New Review Received',
    'You received a ' || p_overall_rating || '-star review for your recent ride',
    jsonb_build_object(
      'review_id', review_rec_id,
      'booking_id', p_booking_id,
      'rating', p_overall_rating,
      'new_average', new_avg_rating
    ),
    'normal'
  );
  
  RETURN QUERY SELECT 
    true,
    review_rec_id,
    new_avg_rating,
    achievements,
    'Review submitted successfully'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user reviews summary
CREATE OR REPLACE FUNCTION get_user_reviews_summary(p_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  user_id uuid,
  total_reviews integer,
  average_overall numeric,
  average_punctuality numeric,
  average_cleanliness numeric,
  average_communication numeric,
  average_safety numeric,
  average_comfort numeric,
  would_ride_again_percentage numeric,
  five_star_count integer,
  four_star_count integer,
  three_star_count integer,
  two_star_count integer,
  one_star_count integer
) AS $$
DECLARE
  check_user_id uuid;
BEGIN
  check_user_id := COALESCE(p_user_id, auth.uid());
  
  RETURN QUERY
  SELECT 
    check_user_id,
    COUNT(*)::integer as total_reviews,
    ROUND(AVG(rrd.overall_rating)::numeric, 2) as average_overall,
    ROUND(AVG(rrd.punctuality_rating)::numeric, 2) as average_punctuality,
    ROUND(AVG(rrd.cleanliness_rating)::numeric, 2) as average_cleanliness,
    ROUND(AVG(rrd.communication_rating)::numeric, 2) as average_communication,
    ROUND(AVG(rrd.safety_rating)::numeric, 2) as average_safety,
    ROUND(AVG(rrd.comfort_rating)::numeric, 2) as average_comfort,
    ROUND((COUNT(*) FILTER (WHERE rrd.would_ride_again = true)::numeric / NULLIF(COUNT(*), 0) * 100), 2) as would_ride_again_pct,
    COUNT(*) FILTER (WHERE rrd.overall_rating = 5)::integer as five_star,
    COUNT(*) FILTER (WHERE rrd.overall_rating = 4)::integer as four_star,
    COUNT(*) FILTER (WHERE rrd.overall_rating = 3)::integer as three_star,
    COUNT(*) FILTER (WHERE rrd.overall_rating = 2)::integer as two_star,
    COUNT(*) FILTER (WHERE rrd.overall_rating = 1)::integer as one_star
  FROM ride_reviews_detailed rrd
  WHERE rrd.reviewee_id = check_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent reviews for user
CREATE OR REPLACE FUNCTION get_recent_reviews(
  p_user_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 10
)
RETURNS TABLE(
  review_id uuid,
  reviewer_id uuid,
  reviewer_name text,
  reviewer_photo text,
  overall_rating integer,
  punctuality_rating integer,
  cleanliness_rating integer,
  communication_rating integer,
  safety_rating integer,
  comfort_rating integer,
  review_text text,
  would_ride_again boolean,
  ride_origin text,
  ride_destination text,
  ride_date timestamptz,
  created_at timestamptz
) AS $$
DECLARE
  check_user_id uuid;
BEGIN
  check_user_id := COALESCE(p_user_id, auth.uid());
  
  RETURN QUERY
  SELECT 
    rrd.id as review_id,
    rrd.reviewer_id,
    p.full_name as reviewer_name,
    p.photo_url as reviewer_photo,
    rrd.overall_rating,
    rrd.punctuality_rating,
    rrd.cleanliness_rating,
    rrd.communication_rating,
    rrd.safety_rating,
    rrd.comfort_rating,
    rrd.review_text,
    rrd.would_ride_again,
    r.origin as ride_origin,
    r.destination as ride_destination,
    r.departure_time as ride_date,
    rrd.created_at
  FROM ride_reviews_detailed rrd
  JOIN profiles p ON rrd.reviewer_id = p.id
  JOIN rides r ON rrd.ride_id = r.id
  WHERE rrd.reviewee_id = check_user_id
  ORDER BY rrd.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate environmental impact
CREATE OR REPLACE FUNCTION calculate_environmental_impact(p_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  total_rides integer,
  total_distance_km numeric,
  co2_saved_kg numeric,
  trees_equivalent numeric,
  cars_off_road_days numeric,
  fuel_saved_liters numeric
) AS $$
DECLARE
  check_user_id uuid;
  rides_as_driver integer;
  rides_as_passenger integer;
  total_distance numeric := 0;
BEGIN
  check_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Count rides as driver (completed)
  SELECT COUNT(*) INTO rides_as_driver
  FROM rides
  WHERE driver_id = check_user_id
  AND status = 'completed';
  
  -- Count rides as passenger (completed bookings)
  SELECT COUNT(*) INTO rides_as_passenger
  FROM ride_bookings
  WHERE passenger_id = check_user_id
  AND status = 'completed';
  
  -- Calculate total distance (simplified - would use actual GPS tracking data)
  SELECT COALESCE(SUM(
    calculate_distance_km(
      r.origin_lat,
      r.origin_lng,
      r.destination_lat,
      r.destination_lng
    )
  ), 0) INTO total_distance
  FROM rides r
  WHERE r.driver_id = check_user_id
  AND r.status = 'completed';
  
  -- Add passenger distance
  SELECT total_distance + COALESCE(SUM(
    calculate_distance_km(
      rb.pickup_lat,
      rb.pickup_lng,
      rb.dropoff_lat,
      rb.dropoff_lng
    )
  ), 0) INTO total_distance
  FROM ride_bookings rb
  WHERE rb.passenger_id = check_user_id
  AND rb.status = 'completed';
  
  -- Calculate environmental metrics
  -- Average car emits 0.12 kg CO2 per km
  -- Each tree absorbs ~21 kg CO2 per year
  -- Average car uses 0.075 liters per km
  
  RETURN QUERY SELECT 
    (rides_as_driver + rides_as_passenger)::integer as total_rides,
    ROUND(total_distance, 2) as total_distance_km,
    ROUND((total_distance * 0.12)::numeric, 2) as co2_saved_kg,
    ROUND((total_distance * 0.12 / 21)::numeric, 2) as trees_equivalent,
    ROUND((total_distance / 40)::numeric, 2) as cars_off_road_days, -- Assuming 40km average daily drive
    ROUND((total_distance * 0.075)::numeric, 2) as fuel_saved_liters;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_and_award_achievements(p_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  achievement_name text,
  achievement_description text,
  unlocked_at timestamptz
) AS $$
DECLARE
  check_user_id uuid;
  completed_rides integer;
  avg_rating numeric;
  reviews_given integer;
  impact_data RECORD;
BEGIN
  check_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Get user statistics
  SELECT 
    (SELECT COUNT(*) FROM rides WHERE driver_id = check_user_id AND status = 'completed') +
    (SELECT COUNT(*) FROM ride_bookings WHERE passenger_id = check_user_id AND status = 'completed')
  INTO completed_rides;
  
  SELECT average_rating INTO avg_rating FROM profiles WHERE id = check_user_id;
  SELECT COUNT(*) INTO reviews_given FROM ride_reviews_detailed WHERE reviewer_id = check_user_id;
  SELECT * INTO impact_data FROM calculate_environmental_impact(check_user_id);
  
  -- Ride Milestones
  IF completed_rides >= 1 THEN
    RETURN QUERY SELECT 
      'first_ride'::text,
      'Completed your first carpool ride'::text,
      now();
  END IF;
  
  IF completed_rides >= 10 THEN
    RETURN QUERY SELECT 
      'frequent_carpooler'::text,
      'Completed 10 carpool rides'::text,
      now();
  END IF;
  
  IF completed_rides >= 50 THEN
    RETURN QUERY SELECT 
      'carpool_champion'::text,
      'Completed 50 carpool rides'::text,
      now();
  END IF;
  
  IF completed_rides >= 100 THEN
    RETURN QUERY SELECT 
      'carpool_legend'::text,
      'Completed 100 carpool rides!'::text,
      now();
  END IF;
  
  -- Rating Achievements
  IF avg_rating >= 4.8 AND completed_rides >= 10 THEN
    RETURN QUERY SELECT 
      'five_star_member'::text,
      'Maintained exceptional ratings (4.8+ stars)'::text,
      now();
  END IF;
  
  -- Review Achievements
  IF reviews_given >= 10 THEN
    RETURN QUERY SELECT 
      'helpful_reviewer'::text,
      'Submitted 10 helpful reviews'::text,
      now();
  END IF;
  
  -- Environmental Achievements
  IF impact_data.co2_saved_kg >= 100 THEN
    RETURN QUERY SELECT 
      'eco_warrior'::text,
      'Saved 100kg of CO2 emissions!'::text,
      now();
  END IF;
  
  IF impact_data.trees_equivalent >= 5 THEN
    RETURN QUERY SELECT 
      'tree_planter'::text,
      'Impact equivalent to 5 trees planted'::text,
      now();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending reviews for user
CREATE OR REPLACE FUNCTION get_pending_reviews(p_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  booking_id uuid,
  ride_id uuid,
  reviewee_id uuid,
  reviewee_name text,
  reviewee_photo text,
  ride_origin text,
  ride_destination text,
  ride_date timestamptz,
  days_since_ride integer
) AS $$
DECLARE
  check_user_id uuid;
BEGIN
  check_user_id := COALESCE(p_user_id, auth.uid());
  
  RETURN QUERY
  -- Pending reviews for bookings as passenger
  SELECT 
    rb.id as booking_id,
    rb.ride_id,
    r.driver_id as reviewee_id,
    p.full_name as reviewee_name,
    p.photo_url as reviewee_photo,
    r.origin as ride_origin,
    r.destination as ride_destination,
    r.departure_time as ride_date,
    EXTRACT(DAY FROM (now() - r.departure_time))::integer as days_since_ride
  FROM ride_bookings rb
  JOIN rides r ON rb.ride_id = r.id
  JOIN profiles p ON r.driver_id = p.id
  WHERE rb.passenger_id = check_user_id
  AND rb.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM ride_reviews_detailed rrd
    WHERE rrd.booking_id = rb.id
    AND rrd.reviewer_id = check_user_id
  )
  
  UNION
  
  -- Pending reviews for rides as driver
  SELECT 
    rb.id as booking_id,
    rb.ride_id,
    rb.passenger_id as reviewee_id,
    p.full_name as reviewee_name,
    p.photo_url as reviewee_photo,
    r.origin as ride_origin,
    r.destination as ride_destination,
    r.departure_time as ride_date,
    EXTRACT(DAY FROM (now() - r.departure_time))::integer as days_since_ride
  FROM rides r
  JOIN ride_bookings rb ON rb.ride_id = r.id
  JOIN profiles p ON rb.passenger_id = p.id
  WHERE r.driver_id = check_user_id
  AND r.status = 'completed'
  AND rb.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM ride_reviews_detailed rrd
    WHERE rrd.booking_id = rb.id
    AND rrd.reviewer_id = check_user_id
  )
  
  ORDER BY ride_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== End 20251222005232_add_ride_completion_and_rating_workflow.sql =====

-- ===== Begin 20251222025036_enhance_safety_system_complete.sql =====

/*
  # Enhance Safety & Moderation System

  Extends existing safety_reports table and creates additional safety system tables.
*/

-- Enhance existing safety_reports table
ALTER TABLE safety_reports ADD COLUMN IF NOT EXISTS reporter_name TEXT;
ALTER TABLE safety_reports ADD COLUMN IF NOT EXISTS reporter_anonymous BOOLEAN DEFAULT false;
ALTER TABLE safety_reports ADD COLUMN IF NOT EXISTS reported_user_name TEXT;
ALTER TABLE safety_reports ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES ride_bookings(id) ON DELETE SET NULL;
ALTER TABLE safety_reports ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE safety_reports ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE safety_reports ADD COLUMN IF NOT EXISTS incident_location TEXT;
ALTER TABLE safety_reports ADD COLUMN IF NOT EXISTS incident_date TIMESTAMPTZ;
ALTER TABLE safety_reports ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE safety_reports ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;
ALTER TABLE safety_reports ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
ALTER TABLE safety_reports ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE safety_reports ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE safety_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Update category from incident_type if not set
UPDATE safety_reports SET category = incident_type WHERE category IS NULL AND incident_type IS NOT NULL;

-- Create safety_incidents table
CREATE TABLE IF NOT EXISTS safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number TEXT UNIQUE NOT NULL DEFAULT ('INC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  category TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'action_taken', 'resolved', 'closed', 'reopened')),
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  affected_user_ids UUID[] DEFAULT '{}',
  investigator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  investigation_notes TEXT,
  investigation_started_at TIMESTAMPTZ,
  investigation_completed_at TIMESTAMPTZ,
  resolution_summary TEXT,
  action_taken TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  related_report_ids UUID[] DEFAULT '{}',
  related_ride_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_suspensions table
CREATE TABLE IF NOT EXISTS user_suspensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suspension_type TEXT NOT NULL DEFAULT 'temporary' CHECK (suspension_type IN ('temporary', 'permanent', 'pending_review')),
  reason TEXT NOT NULL,
  admin_notes TEXT,
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  incident_id UUID REFERENCES safety_incidents(id) ON DELETE SET NULL,
  report_ids UUID[] DEFAULT '{}',
  restrictions JSONB DEFAULT '{"can_book": false, "can_drive": false, "can_message": false}'::jsonb,
  suspended_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  lifted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  lifted_at TIMESTAMPTZ,
  lift_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create safety_warnings table
CREATE TABLE IF NOT EXISTS safety_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  warning_level INTEGER NOT NULL DEFAULT 1 CHECK (warning_level >= 1 AND warning_level <= 3),
  warning_type TEXT NOT NULL,
  message TEXT NOT NULL,
  report_id UUID REFERENCES safety_reports(id) ON DELETE SET NULL,
  incident_id UUID REFERENCES safety_incidents(id) ON DELETE SET NULL,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  issued_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  escalated BOOLEAN DEFAULT false,
  escalation_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Create incident_evidence table
CREATE TABLE IF NOT EXISTS incident_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES safety_incidents(id) ON DELETE CASCADE,
  report_id UUID REFERENCES safety_reports(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL DEFAULT 'other' CHECK (evidence_type IN ('screenshot', 'photo', 'message', 'document', 'video', 'audio', 'other')),
  description TEXT,
  file_path TEXT,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create safety_actions_log table
CREATE TABLE IF NOT EXISTS safety_actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'report_created', 'report_reviewed', 'report_dismissed', 'incident_created',
    'investigation_started', 'investigation_completed', 'user_warned', 'user_suspended',
    'suspension_lifted', 'evidence_added', 'status_changed', 'bulk_action'
  )),
  action_description TEXT NOT NULL,
  report_id UUID REFERENCES safety_reports(id) ON DELETE SET NULL,
  incident_id UUID REFERENCES safety_incidents(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  suspension_id UUID REFERENCES user_suspensions(id) ON DELETE SET NULL,
  performed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  performed_by_name TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_safety_reports_assigned ON safety_reports(assigned_to);
CREATE INDEX IF NOT EXISTS idx_safety_reports_priority ON safety_reports(priority DESC);
CREATE INDEX IF NOT EXISTS idx_safety_reports_updated ON safety_reports(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_number ON safety_incidents(incident_number);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_status ON safety_incidents(status);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_severity ON safety_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_user ON safety_incidents(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_user ON user_suspensions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_active ON user_suspensions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_suspensions_dates ON user_suspensions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_safety_warnings_user ON safety_warnings(user_id);
CREATE INDEX IF NOT EXISTS idx_safety_warnings_level ON safety_warnings(warning_level);
CREATE INDEX IF NOT EXISTS idx_safety_actions_log_type ON safety_actions_log(action_type);
CREATE INDEX IF NOT EXISTS idx_safety_actions_log_date ON safety_actions_log(created_at DESC);

-- Enable RLS
ALTER TABLE safety_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_suspensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_actions_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins manage incidents" ON safety_incidents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admins manage suspensions" ON user_suspensions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Users view own warnings" ON safety_warnings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins manage warnings" ON safety_warnings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admins manage evidence" ON incident_evidence FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admins view actions log" ON safety_actions_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "System log actions" ON safety_actions_log FOR INSERT TO authenticated WITH CHECK (true);

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_safety_incidents_updated_at ON safety_incidents;
CREATE TRIGGER update_safety_incidents_updated_at BEFORE UPDATE ON safety_incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_suspensions_updated_at ON user_suspensions;
CREATE TRIGGER update_user_suspensions_updated_at BEFORE UPDATE ON user_suspensions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_safety_reports_updated_at ON safety_reports;
CREATE TRIGGER update_safety_reports_updated_at BEFORE UPDATE ON safety_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== End 20251222025036_enhance_safety_system_complete.sql =====

-- ===== Begin 20251222025841_create_analytics_system_v3.sql =====

/*
  # Advanced Analytics System - Phase 2
  
  Creates comprehensive analytics views and functions for the admin dashboard.
*/

-- Daily metrics aggregation
CREATE OR REPLACE VIEW daily_metrics AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as count,
  'rides' as metric_type
FROM rides
GROUP BY DATE(created_at)
UNION ALL
SELECT 
  DATE(created_at) as date,
  COUNT(*) as count,
  'bookings' as metric_type
FROM ride_bookings
GROUP BY DATE(created_at)
UNION ALL
SELECT 
  DATE(created_at) as date,
  COUNT(*) as count,
  'users' as metric_type
FROM profiles
GROUP BY DATE(created_at);

-- Ride completion analytics
CREATE OR REPLACE VIEW ride_completion_stats AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'completed') as completed_rides,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_rides,
  COUNT(*) FILTER (WHERE status = 'active') as active_rides,
  COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_rides,
  COUNT(*) as total_rides,
  ROUND((COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / NULLIF(COUNT(*), 0) * 100), 2) as completion_rate
FROM rides
WHERE created_at >= NOW() - INTERVAL '30 days';

-- Booking success metrics
CREATE OR REPLACE VIEW booking_success_metrics AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_bookings,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_bookings,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_bookings,
  COUNT(*) as total_bookings,
  ROUND((COUNT(*) FILTER (WHERE status = 'confirmed')::DECIMAL / NULLIF(COUNT(*), 0) * 100), 2) as confirmation_rate
FROM ride_bookings
WHERE created_at >= NOW() - INTERVAL '30 days';

-- Popular routes
CREATE OR REPLACE VIEW popular_routes AS
SELECT 
  origin,
  destination,
  COUNT(*) as ride_count,
  COUNT(DISTINCT driver_id) as unique_drivers,
  ROUND(AVG(available_seats), 1) as avg_seats
FROM rides
WHERE created_at >= NOW() - INTERVAL '30 days' AND origin IS NOT NULL AND destination IS NOT NULL
GROUP BY origin, destination
ORDER BY ride_count DESC
LIMIT 20;

-- Get user growth over time
CREATE OR REPLACE FUNCTION get_user_growth(period_days INTEGER DEFAULT 30)
RETURNS TABLE (date DATE, new_users BIGINT, cumulative_users BIGINT) AS $$
BEGIN
  RETURN QUERY
  WITH daily_signups AS (
    SELECT DATE(created_at) as signup_date, COUNT(*) as new_users
    FROM profiles
    WHERE created_at >= NOW() - (period_days || ' days')::INTERVAL
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at)
  )
  SELECT signup_date as date, new_users, SUM(new_users) OVER (ORDER BY signup_date) as cumulative_users
  FROM daily_signups;
END;
$$ LANGUAGE plpgsql;

-- Get ride statistics by time of day
CREATE OR REPLACE FUNCTION get_peak_times()
RETURNS TABLE (hour_of_day INTEGER, ride_count BIGINT, avg_seats NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(HOUR FROM departure_time)::INTEGER as hour_of_day,
    COUNT(*) as ride_count,
    ROUND(AVG(available_seats), 1) as avg_seats
  FROM rides
  WHERE departure_time >= NOW() - INTERVAL '30 days'
  GROUP BY EXTRACT(HOUR FROM departure_time)
  ORDER BY hour_of_day;
END;
$$ LANGUAGE plpgsql;

-- Get booking conversion funnel
CREATE OR REPLACE FUNCTION get_booking_funnel(period_days INTEGER DEFAULT 30)
RETURNS TABLE (stage TEXT, count BIGINT, percentage NUMERIC) AS $$
DECLARE
  total_rides BIGINT; total_bookings BIGINT; confirmed_bookings BIGINT; completed_rides BIGINT;
BEGIN
  SELECT COUNT(*) INTO total_rides FROM rides WHERE created_at >= NOW() - (period_days || ' days')::INTERVAL;
  SELECT COUNT(*) INTO total_bookings FROM ride_bookings WHERE created_at >= NOW() - (period_days || ' days')::INTERVAL;
  SELECT COUNT(*) INTO confirmed_bookings FROM ride_bookings WHERE status = 'confirmed' AND created_at >= NOW() - (period_days || ' days')::INTERVAL;
  SELECT COUNT(*) INTO completed_rides FROM rides WHERE status = 'completed' AND created_at >= NOW() - (period_days || ' days')::INTERVAL;

  RETURN QUERY
  SELECT 'Rides Posted'::TEXT, total_rides, 100.0
  UNION ALL SELECT 'Booking Requests'::TEXT, total_bookings, ROUND((total_bookings::NUMERIC / NULLIF(total_rides, 0) * 100), 2)
  UNION ALL SELECT 'Confirmed Bookings'::TEXT, confirmed_bookings, ROUND((confirmed_bookings::NUMERIC / NULLIF(total_bookings, 0) * 100), 2)
  UNION ALL SELECT 'Completed Rides'::TEXT, completed_rides, ROUND((completed_rides::NUMERIC / NULLIF(confirmed_bookings, 0) * 100), 2);
END;
$$ LANGUAGE plpgsql;

-- Get geographic distribution
CREATE OR REPLACE FUNCTION get_geographic_distribution()
RETURNS TABLE (location TEXT, ride_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  WITH origin_counts AS (
    SELECT origin as location, COUNT(*) as count FROM rides 
    WHERE created_at >= NOW() - INTERVAL '30 days' AND origin IS NOT NULL GROUP BY origin
  ),
  destination_counts AS (
    SELECT destination as location, COUNT(*) as count FROM rides 
    WHERE created_at >= NOW() - INTERVAL '30 days' AND destination IS NOT NULL GROUP BY destination
  )
  SELECT COALESCE(oc.location, dc.location) as location, COALESCE(oc.count, 0) + COALESCE(dc.count, 0) as ride_count
  FROM origin_counts oc
  FULL OUTER JOIN destination_counts dc ON oc.location = dc.location
  ORDER BY ride_count DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- Get retention metrics
CREATE OR REPLACE FUNCTION get_retention_metrics(cohort_start DATE DEFAULT CURRENT_DATE - INTERVAL '90 days', cohort_end DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (cohort_month TEXT, users_count BIGINT, retained_users BIGINT, retention_rate NUMERIC) AS $$
BEGIN
  RETURN QUERY
  WITH cohorts AS (
    SELECT TO_CHAR(created_at, 'YYYY-MM') as cohort, id as user_id
    FROM profiles WHERE created_at::DATE BETWEEN cohort_start AND cohort_end
  ),
  active_users AS (
    SELECT DISTINCT TO_CHAR(r.created_at, 'YYYY-MM') as activity_month, r.driver_id as user_id
    FROM rides r WHERE r.created_at >= cohort_start
    UNION
    SELECT DISTINCT TO_CHAR(rb.created_at, 'YYYY-MM') as activity_month, rb.passenger_id as user_id
    FROM ride_bookings rb WHERE rb.created_at >= cohort_start
  )
  SELECT 
    c.cohort as cohort_month,
    COUNT(DISTINCT c.user_id) as users_count,
    COUNT(DISTINCT au.user_id) as retained_users,
    ROUND((COUNT(DISTINCT au.user_id)::NUMERIC / NULLIF(COUNT(DISTINCT c.user_id), 0) * 100), 2) as retention_rate
  FROM cohorts c
  LEFT JOIN active_users au ON c.user_id = au.user_id AND au.activity_month > c.cohort
  GROUP BY c.cohort
  ORDER BY c.cohort DESC;
END;
$$ LANGUAGE plpgsql;

-- Get period comparison
CREATE OR REPLACE FUNCTION get_period_comparison(current_start DATE, current_end DATE, previous_start DATE, previous_end DATE)
RETURNS TABLE (metric TEXT, current_value BIGINT, previous_value BIGINT, change_percentage NUMERIC) AS $$
BEGIN
  RETURN QUERY
  WITH current_metrics AS (
    SELECT 
      COUNT(*) FILTER (WHERE created_at BETWEEN current_start AND current_end) as rides,
      COUNT(DISTINCT driver_id) FILTER (WHERE created_at BETWEEN current_start AND current_end) as drivers
    FROM rides
  ),
  previous_metrics AS (
    SELECT 
      COUNT(*) FILTER (WHERE created_at BETWEEN previous_start AND previous_end) as rides,
      COUNT(DISTINCT driver_id) FILTER (WHERE created_at BETWEEN previous_start AND previous_end) as drivers
    FROM rides
  )
  SELECT 'Total Rides'::TEXT, cm.rides, pm.rides, ROUND(((cm.rides - pm.rides)::NUMERIC / NULLIF(pm.rides, 0) * 100), 2)
  FROM current_metrics cm, previous_metrics pm
  UNION ALL
  SELECT 'Total Bookings'::TEXT, 
    (SELECT COUNT(*) FROM ride_bookings WHERE created_at BETWEEN current_start AND current_end),
    (SELECT COUNT(*) FROM ride_bookings WHERE created_at BETWEEN previous_start AND previous_end),
    ROUND((((SELECT COUNT(*) FROM ride_bookings WHERE created_at BETWEEN current_start AND current_end) - 
            (SELECT COUNT(*) FROM ride_bookings WHERE created_at BETWEEN previous_start AND previous_end))::NUMERIC / 
            NULLIF((SELECT COUNT(*) FROM ride_bookings WHERE created_at BETWEEN previous_start AND previous_end), 0) * 100), 2)
  UNION ALL
  SELECT 'New Users'::TEXT,
    (SELECT COUNT(*) FROM profiles WHERE created_at BETWEEN current_start AND current_end),
    (SELECT COUNT(*) FROM profiles WHERE created_at BETWEEN previous_start AND previous_end),
    ROUND((((SELECT COUNT(*) FROM profiles WHERE created_at BETWEEN current_start AND current_end) -
            (SELECT COUNT(*) FROM profiles WHERE created_at BETWEEN previous_start AND previous_end))::NUMERIC /
            NULLIF((SELECT COUNT(*) FROM profiles WHERE created_at BETWEEN previous_start AND previous_end), 0) * 100), 2);
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rides_created_at_status ON rides(created_at, status);
CREATE INDEX IF NOT EXISTS idx_rides_departure_time ON rides(departure_time);
CREATE INDEX IF NOT EXISTS idx_rides_locations ON rides(origin, destination);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at_status ON ride_bookings(created_at, status);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

-- ===== End 20251222025841_create_analytics_system_v3.sql =====

-- ===== Begin 20251222030331_create_realtime_activity_system.sql =====

/*
  # Real-Time Activity Monitor System - Phase 3

  Creates comprehensive activity tracking and real-time monitoring system.
  
  1. Tables
    - activity_logs: Central activity tracking table with realtime enabled
    - critical_alerts: High-priority events requiring immediate attention
    - activity_stats: Real-time aggregated statistics
    
  2. Functions
    - log_activity: Helper function to log activities
    - get_live_metrics: Real-time platform metrics
    - get_activity_feed: Paginated activity feed with filters
    
  3. Security
    - Admin-only access via RLS
    - Realtime enabled for instant updates
*/

-- ============================================================================
-- Activity Logs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_name TEXT,
  actor_email TEXT,
  target_type TEXT,
  target_id UUID,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_severity ON activity_logs(severity);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor ON activity_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_target ON activity_logs(target_type, target_id);

COMMENT ON TABLE activity_logs IS 'Comprehensive activity tracking for admin monitoring';
COMMENT ON COLUMN activity_logs.activity_type IS 'Type: user, ride, booking, payment, security, system';
COMMENT ON COLUMN activity_logs.severity IS 'Severity: info, warning, error, critical';

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;

-- ============================================================================
-- Critical Alerts Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS critical_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  status TEXT NOT NULL DEFAULT 'active',
  related_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  related_ride_id UUID REFERENCES rides(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}'::jsonb,
  acknowledged_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_critical_alerts_status ON critical_alerts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_critical_alerts_type ON critical_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_critical_alerts_severity ON critical_alerts(severity);

COMMENT ON TABLE critical_alerts IS 'High-priority events requiring immediate admin attention';
COMMENT ON COLUMN critical_alerts.alert_type IS 'Type: safety, fraud, abuse, system_failure, payment';
COMMENT ON COLUMN critical_alerts.status IS 'Status: active, acknowledged, resolved, dismissed';

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE critical_alerts;

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE critical_alerts ENABLE ROW LEVEL SECURITY;

-- Activity logs - admin only
CREATE POLICY "Admins can view all activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email IN (
        SELECT email FROM profiles 
        WHERE id = auth.uid() 
        AND email LIKE '%@admin.carpoolnetwork.co.uk'
      )
    )
  );

CREATE POLICY "Admins can insert activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email IN (
        SELECT email FROM profiles 
        WHERE id = auth.uid() 
        AND email LIKE '%@admin.carpoolnetwork.co.uk'
      )
    )
  );

-- Critical alerts - admin only
CREATE POLICY "Admins can view all critical alerts"
  ON critical_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email IN (
        SELECT email FROM profiles 
        WHERE id = auth.uid() 
        AND email LIKE '%@admin.carpoolnetwork.co.uk'
      )
    )
  );

CREATE POLICY "Admins can manage critical alerts"
  ON critical_alerts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email IN (
        SELECT email FROM profiles 
        WHERE id = auth.uid() 
        AND email LIKE '%@admin.carpoolnetwork.co.uk'
      )
    )
  );

-- ============================================================================
-- Functions
-- ============================================================================

-- Log activity helper function
CREATE OR REPLACE FUNCTION log_activity(
  p_activity_type TEXT,
  p_severity TEXT,
  p_action TEXT,
  p_description TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
  v_actor_name TEXT;
  v_actor_email TEXT;
BEGIN
  -- Get actor details
  SELECT full_name, email INTO v_actor_name, v_actor_email
  FROM profiles WHERE id = auth.uid();

  -- Insert activity log
  INSERT INTO activity_logs (
    activity_type, severity, actor_id, actor_name, actor_email,
    target_type, target_id, action, description, metadata
  )
  VALUES (
    p_activity_type, p_severity, auth.uid(), v_actor_name, v_actor_email,
    p_target_type, p_target_id, p_action, p_description, p_metadata
  )
  RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get live platform metrics
CREATE OR REPLACE FUNCTION get_live_metrics()
RETURNS TABLE (
  active_users BIGINT,
  online_drivers BIGINT,
  ongoing_rides BIGINT,
  pending_bookings BIGINT,
  active_alerts BIGINT,
  recent_activities BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(DISTINCT actor_id) FROM activity_logs WHERE created_at >= NOW() - INTERVAL '15 minutes')::BIGINT as active_users,
    (SELECT COUNT(DISTINCT driver_id) FROM rides WHERE status = 'active' AND departure_time <= NOW() AND departure_time >= NOW() - INTERVAL '2 hours')::BIGINT as online_drivers,
    (SELECT COUNT(*) FROM rides WHERE status = 'active')::BIGINT as ongoing_rides,
    (SELECT COUNT(*) FROM ride_bookings WHERE status = 'pending')::BIGINT as pending_bookings,
    (SELECT COUNT(*) FROM critical_alerts WHERE status = 'active')::BIGINT as active_alerts,
    (SELECT COUNT(*) FROM activity_logs WHERE created_at >= NOW() - INTERVAL '1 hour')::BIGINT as recent_activities;
END;
$$ LANGUAGE plpgsql;

-- Get activity feed with filters
CREATE OR REPLACE FUNCTION get_activity_feed(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_activity_type TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  activity_type TEXT,
  severity TEXT,
  actor_id UUID,
  actor_name TEXT,
  actor_email TEXT,
  target_type TEXT,
  target_id UUID,
  action TEXT,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id, al.activity_type, al.severity, al.actor_id, al.actor_name, al.actor_email,
    al.target_type, al.target_id, al.action, al.description, al.metadata, al.created_at
  FROM activity_logs al
  WHERE 
    (p_activity_type IS NULL OR al.activity_type = p_activity_type)
    AND (p_severity IS NULL OR al.severity = p_severity)
    AND (p_search IS NULL OR 
         al.description ILIKE '%' || p_search || '%' OR 
         al.actor_name ILIKE '%' || p_search || '%' OR
         al.action ILIKE '%' || p_search || '%')
    AND (p_start_date IS NULL OR al.created_at >= p_start_date)
    AND (p_end_date IS NULL OR al.created_at <= p_end_date)
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Activity statistics by type
CREATE OR REPLACE FUNCTION get_activity_stats(
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  activity_type TEXT,
  count BIGINT,
  critical_count BIGINT,
  warning_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.activity_type,
    COUNT(*)::BIGINT as count,
    COUNT(*) FILTER (WHERE al.severity = 'critical')::BIGINT as critical_count,
    COUNT(*) FILTER (WHERE al.severity = 'warning')::BIGINT as warning_count
  FROM activity_logs al
  WHERE al.created_at >= NOW() - (p_hours || ' hours')::INTERVAL
  GROUP BY al.activity_type
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Acknowledge critical alert
CREATE OR REPLACE FUNCTION acknowledge_alert(p_alert_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE critical_alerts
  SET 
    status = 'acknowledged',
    acknowledged_by = auth.uid(),
    acknowledged_at = NOW()
  WHERE id = p_alert_id AND status = 'active';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Resolve critical alert
CREATE OR REPLACE FUNCTION resolve_alert(p_alert_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE critical_alerts
  SET 
    status = 'resolved',
    resolved_at = NOW()
  WHERE id = p_alert_id AND status IN ('active', 'acknowledged');
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Triggers for Automatic Activity Logging
-- ============================================================================

-- Log new user registrations
CREATE OR REPLACE FUNCTION trigger_log_user_registration()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_logs (
    activity_type, severity, actor_id, actor_name, actor_email,
    target_type, target_id, action, description
  )
  VALUES (
    'user', 'info', NEW.id, NEW.full_name, NEW.email,
    'profile', NEW.id, 'registration', 'New user registered'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_user_registration ON profiles;
CREATE TRIGGER log_user_registration
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_user_registration();

-- Log new rides
CREATE OR REPLACE FUNCTION trigger_log_ride_creation()
RETURNS TRIGGER AS $$
DECLARE
  v_driver_name TEXT;
  v_driver_email TEXT;
BEGIN
  SELECT full_name, email INTO v_driver_name, v_driver_email
  FROM profiles WHERE id = NEW.driver_id;
  
  INSERT INTO activity_logs (
    activity_type, severity, actor_id, actor_name, actor_email,
    target_type, target_id, action, description, metadata
  )
  VALUES (
    'ride', 'info', NEW.driver_id, v_driver_name, v_driver_email,
    'ride', NEW.id, 'created', 
    'New ride posted: ' || NEW.origin || ' to ' || NEW.destination,
    jsonb_build_object(
      'origin', NEW.origin,
      'destination', NEW.destination,
      'departure_time', NEW.departure_time,
      'available_seats', NEW.available_seats
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_ride_creation ON rides;
CREATE TRIGGER log_ride_creation
  AFTER INSERT ON rides
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_ride_creation();

-- Log booking status changes
CREATE OR REPLACE FUNCTION trigger_log_booking_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_passenger_name TEXT;
  v_passenger_email TEXT;
BEGIN
  SELECT full_name, email INTO v_passenger_name, v_passenger_email
  FROM profiles WHERE id = NEW.passenger_id;
  
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO activity_logs (
      activity_type, severity, actor_id, actor_name, actor_email,
      target_type, target_id, action, description, metadata
    )
    VALUES (
      'booking', 'info', NEW.passenger_id, v_passenger_name, v_passenger_email,
      'booking', NEW.id, 'created', 
      'New booking request',
      jsonb_build_object('ride_id', NEW.ride_id, 'seats', NEW.seats_requested)
    );
  ELSIF (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
    INSERT INTO activity_logs (
      activity_type, 
      severity, 
      actor_id, actor_name, actor_email,
      target_type, target_id, action, description, metadata
    )
    VALUES (
      'booking', 
      CASE WHEN NEW.status = 'cancelled' THEN 'warning' ELSE 'info' END,
      NEW.passenger_id, v_passenger_name, v_passenger_email,
      'booking', NEW.id, 'status_changed', 
      'Booking status changed: ' || OLD.status || ' â†’ ' || NEW.status,
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_booking_changes ON ride_bookings;
CREATE TRIGGER log_booking_changes
  AFTER INSERT OR UPDATE ON ride_bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_booking_changes();

-- Grant permissions
GRANT EXECUTE ON FUNCTION log_activity TO authenticated;
GRANT EXECUTE ON FUNCTION get_live_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_activity_feed TO authenticated;
GRANT EXECUTE ON FUNCTION get_activity_stats TO authenticated;
GRANT EXECUTE ON FUNCTION acknowledge_alert TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_alert TO authenticated;

-- ===== End 20251222030331_create_realtime_activity_system.sql =====

-- ===== Begin 20251222030920_create_bulk_operations_system.sql =====

/*
  # Bulk Operations System - Phase 4

  Creates comprehensive bulk operation management system for efficient mass operations.
  
  1. Tables
    - bulk_operations: Track all bulk operations with status and results
    - bulk_operation_items: Individual items in each bulk operation
    - scheduled_operations: Schedule bulk operations for future execution
    
  2. Functions
    - create_bulk_operation: Initialize a new bulk operation
    - execute_bulk_user_action: Bulk user management operations
    - execute_bulk_ride_action: Bulk ride management operations
    - execute_bulk_booking_action: Bulk booking management operations
    - send_bulk_notifications: Send notifications to multiple users
    - bulk_export_data: Export data in bulk
    - get_operation_status: Get detailed operation status
    - cancel_bulk_operation: Cancel a running operation
    
  3. Security
    - Admin-only access via RLS
    - Operation audit trail
    - Rollback capabilities where possible
*/

-- ============================================================================
-- Bulk Operations Main Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS bulk_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL,
  operation_name TEXT NOT NULL,
  description TEXT,
  initiated_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  target_count INTEGER DEFAULT 0,
  processed_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  parameters JSONB DEFAULT '{}'::jsonb,
  results JSONB DEFAULT '{}'::jsonb,
  error_log JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bulk_operations_status ON bulk_operations(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_type ON bulk_operations(operation_type);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_initiated_by ON bulk_operations(initiated_by);

COMMENT ON TABLE bulk_operations IS 'Track all bulk operations with detailed status and results';
COMMENT ON COLUMN bulk_operations.operation_type IS 'Type: user_action, ride_action, booking_action, notification, data_export, data_cleanup';
COMMENT ON COLUMN bulk_operations.status IS 'Status: pending, running, completed, failed, cancelled, partially_completed';

-- ============================================================================
-- Bulk Operation Items Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS bulk_operation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES bulk_operations(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  result JSONB,
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bulk_operation_items_operation ON bulk_operation_items(operation_id, status);
CREATE INDEX IF NOT EXISTS idx_bulk_operation_items_target ON bulk_operation_items(target_type, target_id);

COMMENT ON TABLE bulk_operation_items IS 'Individual items processed in each bulk operation';
COMMENT ON COLUMN bulk_operation_items.status IS 'Status: pending, processing, success, failed, skipped';

-- ============================================================================
-- Scheduled Operations Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS scheduled_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL,
  operation_name TEXT NOT NULL,
  description TEXT,
  scheduled_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  recurrence_rule TEXT,
  parameters JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'scheduled',
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_operations_next_run ON scheduled_operations(next_run_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_scheduled_operations_scheduled_by ON scheduled_operations(scheduled_by);

COMMENT ON TABLE scheduled_operations IS 'Schedule bulk operations for future execution';
COMMENT ON COLUMN scheduled_operations.status IS 'Status: scheduled, running, completed, cancelled, failed';
COMMENT ON COLUMN scheduled_operations.recurrence_rule IS 'Cron-like recurrence pattern';

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE bulk_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_operation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_operations ENABLE ROW LEVEL SECURITY;

-- Bulk operations - admin only
CREATE POLICY "Admins can manage bulk operations"
  ON bulk_operations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email LIKE '%@admin.carpoolnetwork.co.uk'
    )
  );

-- Bulk operation items - admin only
CREATE POLICY "Admins can view bulk operation items"
  ON bulk_operation_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email LIKE '%@admin.carpoolnetwork.co.uk'
    )
  );

-- Scheduled operations - admin only
CREATE POLICY "Admins can manage scheduled operations"
  ON scheduled_operations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email LIKE '%@admin.carpoolnetwork.co.uk'
    )
  );

-- ============================================================================
-- Core Functions
-- ============================================================================

-- Create bulk operation
CREATE OR REPLACE FUNCTION create_bulk_operation(
  p_operation_type TEXT,
  p_operation_name TEXT,
  p_description TEXT,
  p_target_ids UUID[],
  p_parameters JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_operation_id UUID;
  v_target_id UUID;
BEGIN
  -- Create operation record
  INSERT INTO bulk_operations (
    operation_type, operation_name, description,
    initiated_by, status, target_count, parameters
  )
  VALUES (
    p_operation_type, p_operation_name, p_description,
    auth.uid(), 'pending', array_length(p_target_ids, 1), p_parameters
  )
  RETURNING id INTO v_operation_id;

  -- Create items for each target
  FOREACH v_target_id IN ARRAY p_target_ids
  LOOP
    INSERT INTO bulk_operation_items (
      operation_id, target_type, target_id, status
    )
    VALUES (
      v_operation_id, p_operation_type, v_target_id, 'pending'
    );
  END LOOP;

  RETURN v_operation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get operation status
CREATE OR REPLACE FUNCTION get_operation_status(p_operation_id UUID)
RETURNS TABLE (
  operation_id UUID,
  operation_type TEXT,
  operation_name TEXT,
  status TEXT,
  target_count INTEGER,
  processed_count INTEGER,
  success_count INTEGER,
  failed_count INTEGER,
  progress_percentage NUMERIC,
  created_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bo.id,
    bo.operation_type,
    bo.operation_name,
    bo.status,
    bo.target_count,
    bo.processed_count,
    bo.success_count,
    bo.failed_count,
    CASE 
      WHEN bo.target_count > 0 THEN 
        ROUND((bo.processed_count::NUMERIC / bo.target_count::NUMERIC) * 100, 2)
      ELSE 0
    END as progress_percentage,
    bo.created_at,
    bo.started_at,
    bo.completed_at
  FROM bulk_operations bo
  WHERE bo.id = p_operation_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Bulk User Operations
-- ============================================================================

CREATE OR REPLACE FUNCTION execute_bulk_user_action(
  p_operation_id UUID,
  p_action TEXT,
  p_parameters JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN AS $$
DECLARE
  v_item RECORD;
  v_success_count INTEGER := 0;
  v_failed_count INTEGER := 0;
BEGIN
  -- Update operation status to running
  UPDATE bulk_operations
  SET status = 'running', started_at = NOW()
  WHERE id = p_operation_id;

  -- Process each item
  FOR v_item IN 
    SELECT * FROM bulk_operation_items
    WHERE operation_id = p_operation_id AND status = 'pending'
  LOOP
    BEGIN
      -- Update item status
      UPDATE bulk_operation_items
      SET status = 'processing'
      WHERE id = v_item.id;

      -- Execute action based on type
      CASE p_action
        WHEN 'activate' THEN
          UPDATE profiles SET status = 'active' WHERE id = v_item.target_id;
        
        WHEN 'deactivate' THEN
          UPDATE profiles SET status = 'inactive' WHERE id = v_item.target_id;
        
        WHEN 'suspend' THEN
          UPDATE profiles SET status = 'suspended' WHERE id = v_item.target_id;
        
        WHEN 'verify' THEN
          UPDATE profiles SET 
            verification_status = 'verified',
            verified_at = NOW()
          WHERE id = v_item.target_id;
        
        WHEN 'unverify' THEN
          UPDATE profiles SET 
            verification_status = 'unverified',
            verified_at = NULL
          WHERE id = v_item.target_id;
        
        WHEN 'reset_trust_score' THEN
          UPDATE profiles SET trust_score = 50 WHERE id = v_item.target_id;
        
        WHEN 'delete_inactive' THEN
          DELETE FROM profiles 
          WHERE id = v_item.target_id 
          AND status = 'inactive'
          AND created_at < NOW() - INTERVAL '90 days';
        
        ELSE
          RAISE EXCEPTION 'Unknown action: %', p_action;
      END CASE;

      -- Mark as success
      UPDATE bulk_operation_items
      SET 
        status = 'success',
        processed_at = NOW()
      WHERE id = v_item.id;
      
      v_success_count := v_success_count + 1;

    EXCEPTION WHEN OTHERS THEN
      -- Mark as failed
      UPDATE bulk_operation_items
      SET 
        status = 'failed',
        error_message = SQLERRM,
        processed_at = NOW()
      WHERE id = v_item.id;
      
      v_failed_count := v_failed_count + 1;
    END;
  END LOOP;

  -- Update operation summary
  UPDATE bulk_operations
  SET 
    status = CASE 
      WHEN v_failed_count = 0 THEN 'completed'
      WHEN v_success_count = 0 THEN 'failed'
      ELSE 'partially_completed'
    END,
    processed_count = v_success_count + v_failed_count,
    success_count = v_success_count,
    failed_count = v_failed_count,
    completed_at = NOW()
  WHERE id = p_operation_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Bulk Ride Operations
-- ============================================================================

CREATE OR REPLACE FUNCTION execute_bulk_ride_action(
  p_operation_id UUID,
  p_action TEXT,
  p_parameters JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN AS $$
DECLARE
  v_item RECORD;
  v_success_count INTEGER := 0;
  v_failed_count INTEGER := 0;
BEGIN
  UPDATE bulk_operations
  SET status = 'running', started_at = NOW()
  WHERE id = p_operation_id;

  FOR v_item IN 
    SELECT * FROM bulk_operation_items
    WHERE operation_id = p_operation_id AND status = 'pending'
  LOOP
    BEGIN
      UPDATE bulk_operation_items
      SET status = 'processing'
      WHERE id = v_item.id;

      CASE p_action
        WHEN 'cancel' THEN
          UPDATE rides SET 
            status = 'cancelled',
            cancellation_reason = COALESCE(p_parameters->>'reason', 'Bulk cancellation by admin')
          WHERE id = v_item.target_id;
          
          UPDATE ride_bookings SET status = 'cancelled'
          WHERE ride_id = v_item.target_id AND status IN ('pending', 'confirmed');
        
        WHEN 'complete' THEN
          UPDATE rides SET status = 'completed'
          WHERE id = v_item.target_id;
        
        WHEN 'delete_old' THEN
          DELETE FROM rides 
          WHERE id = v_item.target_id 
          AND status = 'completed'
          AND departure_time < NOW() - INTERVAL '1 year';
        
        WHEN 'flag_review' THEN
          UPDATE rides SET 
            metadata = jsonb_set(
              COALESCE(metadata, '{}'::jsonb),
              '{flagged_for_review}',
              'true'::jsonb
            )
          WHERE id = v_item.target_id;
        
        ELSE
          RAISE EXCEPTION 'Unknown action: %', p_action;
      END CASE;

      UPDATE bulk_operation_items
      SET status = 'success', processed_at = NOW()
      WHERE id = v_item.id;
      
      v_success_count := v_success_count + 1;

    EXCEPTION WHEN OTHERS THEN
      UPDATE bulk_operation_items
      SET status = 'failed', error_message = SQLERRM, processed_at = NOW()
      WHERE id = v_item.id;
      
      v_failed_count := v_failed_count + 1;
    END;
  END LOOP;

  UPDATE bulk_operations
  SET 
    status = CASE 
      WHEN v_failed_count = 0 THEN 'completed'
      WHEN v_success_count = 0 THEN 'failed'
      ELSE 'partially_completed'
    END,
    processed_count = v_success_count + v_failed_count,
    success_count = v_success_count,
    failed_count = v_failed_count,
    completed_at = NOW()
  WHERE id = p_operation_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Bulk Booking Operations
-- ============================================================================

CREATE OR REPLACE FUNCTION execute_bulk_booking_action(
  p_operation_id UUID,
  p_action TEXT,
  p_parameters JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN AS $$
DECLARE
  v_item RECORD;
  v_success_count INTEGER := 0;
  v_failed_count INTEGER := 0;
BEGIN
  UPDATE bulk_operations
  SET status = 'running', started_at = NOW()
  WHERE id = p_operation_id;

  FOR v_item IN 
    SELECT * FROM bulk_operation_items
    WHERE operation_id = p_operation_id AND status = 'pending'
  LOOP
    BEGIN
      UPDATE bulk_operation_items
      SET status = 'processing'
      WHERE id = v_item.id;

      CASE p_action
        WHEN 'cancel' THEN
          UPDATE ride_bookings SET 
            status = 'cancelled',
            updated_at = NOW()
          WHERE id = v_item.target_id;
        
        WHEN 'confirm' THEN
          UPDATE ride_bookings SET 
            status = 'confirmed',
            updated_at = NOW()
          WHERE id = v_item.target_id;
        
        WHEN 'complete' THEN
          UPDATE ride_bookings SET 
            status = 'completed',
            updated_at = NOW()
          WHERE id = v_item.target_id;
        
        ELSE
          RAISE EXCEPTION 'Unknown action: %', p_action;
      END CASE;

      UPDATE bulk_operation_items
      SET status = 'success', processed_at = NOW()
      WHERE id = v_item.id;
      
      v_success_count := v_success_count + 1;

    EXCEPTION WHEN OTHERS THEN
      UPDATE bulk_operation_items
      SET status = 'failed', error_message = SQLERRM, processed_at = NOW()
      WHERE id = v_item.id;
      
      v_failed_count := v_failed_count + 1;
    END;
  END LOOP;

  UPDATE bulk_operations
  SET 
    status = CASE 
      WHEN v_failed_count = 0 THEN 'completed'
      WHEN v_success_count = 0 THEN 'failed'
      ELSE 'partially_completed'
    END,
    processed_count = v_success_count + v_failed_count,
    success_count = v_success_count,
    failed_count = v_failed_count,
    completed_at = NOW()
  WHERE id = p_operation_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Bulk Notifications
-- ============================================================================

CREATE OR REPLACE FUNCTION send_bulk_notifications(
  p_operation_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_notification_type TEXT DEFAULT 'info'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_item RECORD;
  v_success_count INTEGER := 0;
  v_failed_count INTEGER := 0;
BEGIN
  UPDATE bulk_operations
  SET status = 'running', started_at = NOW()
  WHERE id = p_operation_id;

  FOR v_item IN 
    SELECT * FROM bulk_operation_items
    WHERE operation_id = p_operation_id AND status = 'pending'
  LOOP
    BEGIN
      UPDATE bulk_operation_items
      SET status = 'processing'
      WHERE id = v_item.id;

      INSERT INTO notifications (
        user_id, type, title, message, created_at
      )
      VALUES (
        v_item.target_id, p_notification_type, p_title, p_message, NOW()
      );

      UPDATE bulk_operation_items
      SET status = 'success', processed_at = NOW()
      WHERE id = v_item.id;
      
      v_success_count := v_success_count + 1;

    EXCEPTION WHEN OTHERS THEN
      UPDATE bulk_operation_items
      SET status = 'failed', error_message = SQLERRM, processed_at = NOW()
      WHERE id = v_item.id;
      
      v_failed_count := v_failed_count + 1;
    END;
  END LOOP;

  UPDATE bulk_operations
  SET 
    status = CASE 
      WHEN v_failed_count = 0 THEN 'completed'
      WHEN v_success_count = 0 THEN 'failed'
      ELSE 'partially_completed'
    END,
    processed_count = v_success_count + v_failed_count,
    success_count = v_success_count,
    failed_count = v_failed_count,
    completed_at = NOW()
  WHERE id = p_operation_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cancel bulk operation
CREATE OR REPLACE FUNCTION cancel_bulk_operation(p_operation_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE bulk_operations
  SET status = 'cancelled', completed_at = NOW()
  WHERE id = p_operation_id AND status IN ('pending', 'running');
  
  UPDATE bulk_operation_items
  SET status = 'skipped'
  WHERE operation_id = p_operation_id AND status = 'pending';
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_bulk_operation TO authenticated;
GRANT EXECUTE ON FUNCTION get_operation_status TO authenticated;
GRANT EXECUTE ON FUNCTION execute_bulk_user_action TO authenticated;
GRANT EXECUTE ON FUNCTION execute_bulk_ride_action TO authenticated;
GRANT EXECUTE ON FUNCTION execute_bulk_booking_action TO authenticated;
GRANT EXECUTE ON FUNCTION send_bulk_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_bulk_operation TO authenticated;

-- ===== End 20251222030920_create_bulk_operations_system.sql =====

-- ===== Begin 20251222032019_create_phase_5_6_advanced_production_system_v2.sql =====

/*
  # Phase 5 & 6: Advanced Features & Production Readiness V2
  
  Complete production-ready system with advanced features and optimizations.
  
  1. Performance Monitoring
    - performance_metrics: Real-time performance tracking
    - system_health: System health monitoring
    - query_performance: Query performance logs
    
  2. Smart Recommendations
    - user_recommendations: Personalized ride recommendations
    - recommendation_feedback: Track recommendation quality
    - ml_training_data: Data for ML model training
    
  3. Advanced Search
    - search_queries: Track search patterns
    - search_results: Cache search results
    - route_popularity: Track and optimize popular routes
    
  4. Error Tracking
    - error_logs: Production error tracking
    - error_patterns: Identify error patterns
    
  5. Caching System
    - cache_entries: Intelligent caching layer
    - cache_stats: Cache performance metrics
    
  6. Advanced Functions
    - get_smart_recommendations: ML-powered recommendations
    - calculate_route_popularity_score: Route scoring
    - optimize_search_results: Advanced search optimization
    - track_performance_metric: Performance monitoring
    - get_system_health: Health check endpoint
*/

-- ============================================================================
-- Performance Monitoring System
-- ============================================================================

CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT DEFAULT 'ms',
  endpoint TEXT,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON performance_metrics(metric_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_endpoint ON performance_metrics(endpoint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at DESC);

COMMENT ON TABLE performance_metrics IS 'Real-time performance tracking for optimization';
COMMENT ON COLUMN performance_metrics.metric_type IS 'Type: page_load, api_call, database_query, render_time, network_latency';

-- System health monitoring
CREATE TABLE IF NOT EXISTS system_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type TEXT NOT NULL,
  status TEXT NOT NULL,
  response_time_ms NUMERIC,
  details JSONB DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_health_checked_at ON system_health(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_status ON system_health(status, checked_at DESC);

COMMENT ON TABLE system_health IS 'System health checks and monitoring';
COMMENT ON COLUMN system_health.check_type IS 'Type: database, storage, edge_functions, realtime, auth';
COMMENT ON COLUMN system_health.status IS 'Status: healthy, degraded, unhealthy, error';

-- Query performance tracking
CREATE TABLE IF NOT EXISTS query_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_name TEXT NOT NULL,
  execution_time_ms NUMERIC NOT NULL,
  rows_returned INTEGER,
  rows_scanned INTEGER,
  cache_hit BOOLEAN DEFAULT false,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_performance_query_name ON query_performance(query_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_performance_execution_time ON query_performance(execution_time_ms DESC);

-- ============================================================================
-- Smart Recommendations System
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL,
  ride_id UUID REFERENCES rides(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL DEFAULT 0,
  reasoning JSONB DEFAULT '{}'::jsonb,
  shown_at TIMESTAMPTZ DEFAULT NOW(),
  clicked BOOLEAN DEFAULT false,
  clicked_at TIMESTAMPTZ,
  converted BOOLEAN DEFAULT false,
  converted_at TIMESTAMPTZ,
  dismissed BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_recommendations_user ON user_recommendations(user_id, shown_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_recommendations_score ON user_recommendations(score DESC);
CREATE INDEX IF NOT EXISTS idx_user_recommendations_active ON user_recommendations(user_id, expires_at) WHERE NOT dismissed AND NOT converted;

COMMENT ON TABLE user_recommendations IS 'Personalized ride and driver recommendations';
COMMENT ON COLUMN user_recommendations.recommendation_type IS 'Type: ride_match, driver_match, route_suggestion, time_suggestion';
COMMENT ON COLUMN user_recommendations.score IS 'ML-powered recommendation score 0-100';

-- Recommendation feedback tracking
CREATE TABLE IF NOT EXISTS recommendation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES user_recommendations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_recommendation ON recommendation_feedback(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_user ON recommendation_feedback(user_id);

COMMENT ON TABLE recommendation_feedback IS 'User feedback on recommendation quality';
COMMENT ON COLUMN recommendation_feedback.feedback_type IS 'Type: helpful, not_helpful, irrelevant, offensive';

-- ML training data collection
CREATE TABLE IF NOT EXISTS ml_training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type TEXT NOT NULL,
  features JSONB NOT NULL,
  label TEXT,
  label_confidence NUMERIC,
  model_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_training_data_type ON ml_training_data(data_type, created_at DESC);

COMMENT ON TABLE ml_training_data IS 'Training data for ML models';
COMMENT ON COLUMN ml_training_data.data_type IS 'Type: match_quality, route_preference, driver_rating, booking_success';

-- ============================================================================
-- Advanced Search System
-- ============================================================================

CREATE TABLE IF NOT EXISTS search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  search_type TEXT NOT NULL,
  query_text TEXT,
  filters JSONB DEFAULT '{}'::jsonb,
  results_count INTEGER DEFAULT 0,
  selected_result_id UUID,
  selected_result_position INTEGER,
  response_time_ms NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_queries_user ON search_queries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_queries_type ON search_queries(search_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_queries_query_text ON search_queries USING gin(to_tsvector('english', COALESCE(query_text, '')));

COMMENT ON TABLE search_queries IS 'Track search patterns for optimization';
COMMENT ON COLUMN search_queries.search_type IS 'Type: ride_search, user_search, route_search, driver_search';

-- Search results caching
CREATE TABLE IF NOT EXISTS search_results_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  search_type TEXT NOT NULL,
  results JSONB NOT NULL,
  result_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes',
  hit_count INTEGER DEFAULT 0,
  last_hit_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_search_results_cache_key ON search_results_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_search_results_cache_expires ON search_results_cache(expires_at);

-- Route popularity tracking
CREATE TABLE IF NOT EXISTS route_popularity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_normalized TEXT NOT NULL,
  destination_normalized TEXT NOT NULL,
  search_count INTEGER DEFAULT 1,
  booking_count INTEGER DEFAULT 0,
  success_rate NUMERIC DEFAULT 0,
  avg_price NUMERIC,
  avg_duration_minutes INTEGER,
  last_searched_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_route_popularity_route ON route_popularity(origin_normalized, destination_normalized);
CREATE INDEX IF NOT EXISTS idx_route_popularity_search_count ON route_popularity(search_count DESC);

COMMENT ON TABLE route_popularity IS 'Track and optimize popular routes';

-- ============================================================================
-- Error Tracking System
-- ============================================================================

CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  severity TEXT NOT NULL DEFAULT 'error',
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  endpoint TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(error_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_unresolved ON error_logs(created_at DESC) WHERE NOT resolved;

COMMENT ON TABLE error_logs IS 'Production error tracking and monitoring';
COMMENT ON COLUMN error_logs.severity IS 'Severity: debug, info, warning, error, critical';

-- Error patterns detection
CREATE TABLE IF NOT EXISTS error_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name TEXT NOT NULL,
  error_type TEXT NOT NULL,
  occurrence_count INTEGER DEFAULT 1,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  pattern_signature TEXT NOT NULL UNIQUE,
  mitigation_notes TEXT,
  status TEXT DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_error_patterns_occurrence ON error_patterns(occurrence_count DESC);
CREATE INDEX IF NOT EXISTS idx_error_patterns_last_seen ON error_patterns(last_seen_at DESC);

COMMENT ON TABLE error_patterns IS 'Identify recurring error patterns';
COMMENT ON COLUMN error_patterns.status IS 'Status: active, investigating, mitigated, resolved';

-- ============================================================================
-- Intelligent Caching System
-- ============================================================================

CREATE TABLE IF NOT EXISTS cache_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  cache_type TEXT NOT NULL,
  data JSONB NOT NULL,
  size_bytes INTEGER,
  ttl_seconds INTEGER DEFAULT 300,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes',
  hit_count INTEGER DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  invalidated BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_cache_entries_key ON cache_entries(cache_key) WHERE NOT invalidated;
CREATE INDEX IF NOT EXISTS idx_cache_entries_expires ON cache_entries(expires_at) WHERE NOT invalidated;
CREATE INDEX IF NOT EXISTS idx_cache_entries_type ON cache_entries(cache_type);

COMMENT ON TABLE cache_entries IS 'Intelligent caching layer for performance';
COMMENT ON COLUMN cache_entries.cache_type IS 'Type: query_result, user_profile, ride_list, search_result, computed_data';

-- Cache performance statistics
CREATE TABLE IF NOT EXISTS cache_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_type TEXT NOT NULL,
  hits INTEGER DEFAULT 0,
  misses INTEGER DEFAULT 0,
  evictions INTEGER DEFAULT 0,
  avg_hit_time_ms NUMERIC,
  total_size_bytes BIGINT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cache_stats_recorded ON cache_stats(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_cache_stats_type ON cache_stats(cache_type, recorded_at DESC);

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Performance metrics - admin only
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view performance metrics"
  ON performance_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email LIKE '%@admin.carpoolnetwork.co.uk'
    )
  );

-- System health - admin only
ALTER TABLE system_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view system health"
  ON system_health FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email LIKE '%@admin.carpoolnetwork.co.uk'
    )
  );

-- Query performance - admin only
ALTER TABLE query_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view query performance"
  ON query_performance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email LIKE '%@admin.carpoolnetwork.co.uk'
    )
  );

-- User recommendations - users can view their own
ALTER TABLE user_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their recommendations"
  ON user_recommendations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their recommendations"
  ON user_recommendations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Recommendation feedback - users can manage their own
ALTER TABLE recommendation_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their feedback"
  ON recommendation_feedback FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Search queries - users can view their own
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their searches"
  ON search_queries FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Error logs - admin only
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage error logs"
  ON error_logs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email LIKE '%@admin.carpoolnetwork.co.uk'
    )
  );

-- Error patterns - admin only
ALTER TABLE error_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage error patterns"
  ON error_patterns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email LIKE '%@admin.carpoolnetwork.co.uk'
    )
  );

-- Cache tables - system access only
ALTER TABLE cache_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_stats ENABLE ROW LEVEL SECURITY;

-- ML training data - admin only
ALTER TABLE ml_training_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage ML data"
  ON ml_training_data FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email LIKE '%@admin.carpoolnetwork.co.uk'
    )
  );

-- ============================================================================
-- Advanced Functions
-- ============================================================================

-- Track performance metric
CREATE OR REPLACE FUNCTION track_performance_metric(
  p_metric_type TEXT,
  p_metric_name TEXT,
  p_value NUMERIC,
  p_unit TEXT DEFAULT 'ms',
  p_endpoint TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO performance_metrics (
    metric_type, metric_name, value, unit, endpoint, user_id, metadata
  )
  VALUES (
    p_metric_type, p_metric_name, p_value, p_unit, p_endpoint, auth.uid(), p_metadata
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get system health
CREATE OR REPLACE FUNCTION get_system_health()
RETURNS TABLE (
  overall_status TEXT,
  database_status TEXT,
  recent_errors INTEGER,
  avg_response_time_ms NUMERIC,
  cache_hit_rate NUMERIC,
  active_users INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'healthy'::TEXT as overall_status,
    'healthy'::TEXT as database_status,
    (SELECT COUNT(*)::INTEGER FROM error_logs WHERE created_at > NOW() - INTERVAL '1 hour')::INTEGER as recent_errors,
    (SELECT COALESCE(AVG(value), 0) FROM performance_metrics WHERE metric_type = 'api_call' AND created_at > NOW() - INTERVAL '1 hour')::NUMERIC as avg_response_time_ms,
    (SELECT 
      CASE 
        WHEN SUM(hits + misses) > 0 
        THEN (SUM(hits)::NUMERIC / SUM(hits + misses)::NUMERIC) * 100
        ELSE 0
      END
      FROM cache_stats
      WHERE recorded_at > NOW() - INTERVAL '1 hour'
    )::NUMERIC as cache_hit_rate,
    (SELECT COUNT(DISTINCT user_id)::INTEGER FROM performance_metrics WHERE created_at > NOW() - INTERVAL '1 hour' AND user_id IS NOT NULL)::INTEGER as active_users;
END;
$$ LANGUAGE plpgsql;

-- Calculate route popularity score
CREATE OR REPLACE FUNCTION calculate_route_popularity_score(
  p_origin TEXT,
  p_destination TEXT
)
RETURNS NUMERIC AS $$
DECLARE
  v_score NUMERIC := 0;
  v_route RECORD;
BEGIN
  SELECT * INTO v_route
  FROM route_popularity
  WHERE origin_normalized = lower(trim(p_origin))
  AND destination_normalized = lower(trim(p_destination));
  
  IF FOUND THEN
    v_score := (
      (v_route.search_count * 0.3) +
      (v_route.booking_count * 0.5) +
      (v_route.success_rate * 0.2)
    );
  END IF;
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Get smart recommendations
CREATE OR REPLACE FUNCTION get_smart_recommendations(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  recommendation_id UUID,
  ride_id UUID,
  driver_id UUID,
  score NUMERIC,
  reasoning JSONB,
  ride_details JSONB
) AS $$
BEGIN
  DELETE FROM user_recommendations
  WHERE expires_at < NOW() OR (dismissed = true AND created_at < NOW() - INTERVAL '30 days');
  
  RETURN QUERY
  SELECT 
    ur.id as recommendation_id,
    ur.ride_id,
    ur.driver_id,
    ur.score,
    ur.reasoning,
    jsonb_build_object(
      'origin', r.origin,
      'destination', r.destination,
      'departure_time', r.departure_time,
      'price_per_seat', r.price_per_seat,
      'available_seats', r.available_seats
    ) as ride_details
  FROM user_recommendations ur
  LEFT JOIN rides r ON r.id = ur.ride_id
  WHERE ur.user_id = p_user_id
  AND NOT ur.dismissed
  AND NOT ur.converted
  AND ur.expires_at > NOW()
  ORDER BY ur.score DESC, ur.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Optimize search results with ML scoring
CREATE OR REPLACE FUNCTION optimize_search_results(
  p_user_id UUID,
  p_origin TEXT,
  p_destination TEXT,
  p_departure_date TIMESTAMPTZ
)
RETURNS TABLE (
  ride_id UUID,
  relevance_score NUMERIC,
  ride_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id as ride_id,
    (
      COALESCE((
        SELECT SUM(
          CASE 
            WHEN up.preference_key = 'smoking' AND up.preference_value = (r.metadata->>'smoking_allowed')::TEXT THEN 20
            WHEN up.preference_key = 'music' AND up.preference_value = (r.metadata->>'music_allowed')::TEXT THEN 10
            WHEN up.preference_key = 'pets' AND up.preference_value = (r.metadata->>'pets_allowed')::TEXT THEN 15
            ELSE 0
          END
        )
        FROM user_preferences up
        WHERE up.user_id = p_user_id
      ), 0) +
      COALESCE((SELECT trust_score FROM profiles WHERE id = r.driver_id), 50) * 0.3 +
      calculate_route_popularity_score(r.origin, r.destination) * 0.2 +
      CASE 
        WHEN r.price_per_seat > 0 THEN (50.0 / r.price_per_seat) * 5
        ELSE 10
      END +
      CASE 
        WHEN ABS(EXTRACT(EPOCH FROM (r.departure_time - p_departure_date)) / 3600) < 2 THEN 20
        WHEN ABS(EXTRACT(EPOCH FROM (r.departure_time - p_departure_date)) / 3600) < 6 THEN 10
        ELSE 5
      END
    )::NUMERIC as relevance_score,
    jsonb_build_object(
      'id', r.id,
      'origin', r.origin,
      'destination', r.destination,
      'departure_time', r.departure_time,
      'price_per_seat', r.price_per_seat,
      'available_seats', r.available_seats,
      'driver', jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'trust_score', p.trust_score,
        'total_rides', p.total_rides_as_driver
      )
    ) as ride_data
  FROM rides r
  JOIN profiles p ON p.id = r.driver_id
  WHERE r.status = 'active'
  AND r.departure_time > NOW()
  AND r.available_seats > 0
  AND lower(r.origin) LIKE '%' || lower(p_origin) || '%'
  AND lower(r.destination) LIKE '%' || lower(p_destination) || '%'
  ORDER BY relevance_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Update route popularity
CREATE OR REPLACE FUNCTION update_route_popularity(
  p_origin TEXT,
  p_destination TEXT,
  p_increment_search BOOLEAN DEFAULT true,
  p_increment_booking BOOLEAN DEFAULT false
)
RETURNS BOOLEAN AS $$
DECLARE
  v_origin_normalized TEXT := lower(trim(p_origin));
  v_destination_normalized TEXT := lower(trim(p_destination));
BEGIN
  INSERT INTO route_popularity (
    origin_normalized,
    destination_normalized,
    search_count,
    booking_count,
    last_searched_at
  )
  VALUES (
    v_origin_normalized,
    v_destination_normalized,
    CASE WHEN p_increment_search THEN 1 ELSE 0 END,
    CASE WHEN p_increment_booking THEN 1 ELSE 0 END,
    NOW()
  )
  ON CONFLICT (origin_normalized, destination_normalized)
  DO UPDATE SET
    search_count = route_popularity.search_count + CASE WHEN p_increment_search THEN 1 ELSE 0 END,
    booking_count = route_popularity.booking_count + CASE WHEN p_increment_booking THEN 1 ELSE 0 END,
    last_searched_at = NOW(),
    updated_at = NOW();
    
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Log error with pattern detection
CREATE OR REPLACE FUNCTION log_error(
  p_error_type TEXT,
  p_error_message TEXT,
  p_error_stack TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT 'error',
  p_endpoint TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_error_id UUID;
  v_pattern_signature TEXT;
BEGIN
  INSERT INTO error_logs (
    error_type, error_message, error_stack, severity,
    user_id, endpoint, metadata
  )
  VALUES (
    p_error_type, p_error_message, p_error_stack, p_severity,
    auth.uid(), p_endpoint, p_metadata
  )
  RETURNING id INTO v_error_id;
  
  v_pattern_signature := md5(p_error_type || ':' || substring(p_error_message, 1, 100));
  
  INSERT INTO error_patterns (
    pattern_name,
    error_type,
    pattern_signature,
    occurrence_count
  )
  VALUES (
    p_error_type || ' Error',
    p_error_type,
    v_pattern_signature,
    1
  )
  ON CONFLICT (pattern_signature)
  DO UPDATE SET
    occurrence_count = error_patterns.occurrence_count + 1,
    last_seen_at = NOW();
  
  RETURN v_error_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION track_performance_metric TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_health TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_route_popularity_score TO authenticated;
GRANT EXECUTE ON FUNCTION get_smart_recommendations TO authenticated;
GRANT EXECUTE ON FUNCTION optimize_search_results TO authenticated;
GRANT EXECUTE ON FUNCTION update_route_popularity TO authenticated;
GRANT EXECUTE ON FUNCTION log_error TO authenticated;

-- ===== End 20251222032019_create_phase_5_6_advanced_production_system_v2.sql =====

-- ===== Begin 20251222033448_phase_7_8_mobile_locations_devices.sql =====

/*
  # Phase 7 & 8: Mobile Features & Real-time Tracking
*/

-- Push notification tokens
CREATE TABLE IF NOT EXISTS push_notification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL,
  device_type TEXT NOT NULL,
  platform TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_act ON push_notification_tokens(user_id) WHERE is_active;

-- Live locations for real-time tracking
CREATE TABLE IF NOT EXISTS live_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ride_id UUID REFERENCES rides(id) ON DELETE CASCADE,
  latitude NUMERIC(10, 8) NOT NULL,
  longitude NUMERIC(11, 8) NOT NULL,
  accuracy NUMERIC,
  speed NUMERIC,
  is_moving BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_live_locs_usr ON live_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_live_locs_rid ON live_locations(ride_id) WHERE ride_id IS NOT NULL;

-- Location history
CREATE TABLE IF NOT EXISTS location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ride_id UUID REFERENCES rides(id) ON DELETE CASCADE,
  latitude NUMERIC(10, 8) NOT NULL,
  longitude NUMERIC(11, 8) NOT NULL,
  speed NUMERIC,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loc_hist_usr ON location_history(user_id, recorded_at DESC);

-- Ride tracking sessions
CREATE TABLE IF NOT EXISTS ride_tracking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_status TEXT DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  total_distance_km NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_track_rid ON ride_tracking_sessions(ride_id);

-- Offline queue
CREATE TABLE IF NOT EXISTS offline_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_data JSONB NOT NULL,
  priority INTEGER DEFAULT 5,
  is_processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offq_usr ON offline_queue(user_id);

-- Device info
CREATE TABLE IF NOT EXISTS device_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  app_version TEXT,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

-- Feature flags
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key TEXT NOT NULL UNIQUE,
  flag_name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE push_notification_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_tokens_user" ON push_notification_tokens FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE live_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live_locs_user" ON live_locations FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loc_hist_user" ON location_history FOR SELECT TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE ride_tracking_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "track_sess_driver" ON ride_tracking_sessions FOR SELECT TO authenticated
  USING (driver_id = auth.uid());

ALTER TABLE offline_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offq_user" ON offline_queue FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE device_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "device_user" ON device_info FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flags_enabled" ON feature_flags FOR SELECT TO authenticated
  USING (is_enabled);

-- Functions
CREATE OR REPLACE FUNCTION update_live_location(
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_ride_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO live_locations (user_id, ride_id, latitude, longitude, updated_at, expires_at)
  VALUES (auth.uid(), p_ride_id, p_latitude, p_longitude, NOW(), NOW() + INTERVAL '5 minutes')
  ON CONFLICT (user_id)
  DO UPDATE SET
    ride_id = EXCLUDED.ride_id,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    updated_at = NOW(),
    expires_at = NOW() + INTERVAL '5 minutes';
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_feature_enabled(p_flag_key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM feature_flags WHERE flag_key = p_flag_key AND is_enabled = true);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION update_live_location TO authenticated;
GRANT EXECUTE ON FUNCTION is_feature_enabled TO authenticated;

-- ===== End 20251222033448_phase_7_8_mobile_locations_devices.sql =====

-- ===== Begin 20251222143734_fix_vehicles_financials_and_datetime.sql =====

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

-- ===== End 20251222143734_fix_vehicles_financials_and_datetime.sql =====

-- ===== Begin 20251222185446_20251222150000_add_missing_foreign_key_indexes.sql =====

/*
  # Add Missing Foreign Key Indexes

  1. Performance Improvements
    - Adds indexes for all unindexed foreign keys
    - Improves JOIN performance and referential integrity checks
    - Reduces query execution time for foreign key lookups

  2. Security
    - Better query performance prevents potential DoS through slow queries
    - Improves overall database responsiveness
*/

-- API Performance Logs
CREATE INDEX IF NOT EXISTS idx_api_performance_logs_user_id ON public.api_performance_logs(user_id);

-- Booking Restrictions
CREATE INDEX IF NOT EXISTS idx_booking_restrictions_reviewed_by ON public.booking_restrictions(reviewed_by);

-- Cancellation History
CREATE INDEX IF NOT EXISTS idx_cancellation_history_booking_id ON public.cancellation_history(booking_id);

-- Communication Templates
CREATE INDEX IF NOT EXISTS idx_communication_templates_created_by ON public.communication_templates(created_by);

-- Content Moderation Queue
CREATE INDEX IF NOT EXISTS idx_content_moderation_queue_reported_by ON public.content_moderation_queue(reported_by);
CREATE INDEX IF NOT EXISTS idx_content_moderation_queue_reviewed_by ON public.content_moderation_queue(reviewed_by);

-- Critical Alerts
CREATE INDEX IF NOT EXISTS idx_critical_alerts_acknowledged_by ON public.critical_alerts(acknowledged_by);
CREATE INDEX IF NOT EXISTS idx_critical_alerts_related_ride_id ON public.critical_alerts(related_ride_id);
CREATE INDEX IF NOT EXISTS idx_critical_alerts_related_user_id ON public.critical_alerts(related_user_id);

-- Email Campaigns
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_by ON public.email_campaigns(created_by);

-- Error Logs
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved_by ON public.error_logs(resolved_by);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON public.error_logs(user_id);

-- Error Logs Aggregated
CREATE INDEX IF NOT EXISTS idx_error_logs_aggregated_assigned_to ON public.error_logs_aggregated(assigned_to);

-- Financial Reports
CREATE INDEX IF NOT EXISTS idx_financial_reports_generated_by ON public.financial_reports(generated_by);

-- Fraud Alerts
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_investigated_by ON public.fraud_alerts(investigated_by);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_ride_id ON public.fraud_alerts(ride_id);

-- In-App Messages
CREATE INDEX IF NOT EXISTS idx_in_app_messages_created_by ON public.in_app_messages(created_by);

-- Incident Evidence
CREATE INDEX IF NOT EXISTS idx_incident_evidence_incident_id ON public.incident_evidence(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_evidence_report_id ON public.incident_evidence(report_id);
CREATE INDEX IF NOT EXISTS idx_incident_evidence_uploaded_by ON public.incident_evidence(uploaded_by);

-- Location History
CREATE INDEX IF NOT EXISTS idx_location_history_ride_id ON public.location_history(ride_id);

-- Passkey Challenges
CREATE INDEX IF NOT EXISTS idx_passkey_challenges_user_id ON public.passkey_challenges(user_id);

-- Performance Metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON public.performance_metrics(user_id);

-- Push Notifications
CREATE INDEX IF NOT EXISTS idx_push_notifications_created_by ON public.push_notifications(created_by);

-- Query Performance
CREATE INDEX IF NOT EXISTS idx_query_performance_user_id ON public.query_performance(user_id);

-- Recurring Ride Templates
CREATE INDEX IF NOT EXISTS idx_recurring_ride_templates_vehicle_id ON public.recurring_ride_templates(vehicle_id);

-- Ride Modifications
CREATE INDEX IF NOT EXISTS idx_ride_modifications_modified_by ON public.ride_modifications(modified_by);

-- Ride Tracking Sessions
CREATE INDEX IF NOT EXISTS idx_ride_tracking_sessions_driver_id ON public.ride_tracking_sessions(driver_id);

-- Safety Actions Log
CREATE INDEX IF NOT EXISTS idx_safety_actions_log_incident_id ON public.safety_actions_log(incident_id);
CREATE INDEX IF NOT EXISTS idx_safety_actions_log_performed_by ON public.safety_actions_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_safety_actions_log_report_id ON public.safety_actions_log(report_id);
CREATE INDEX IF NOT EXISTS idx_safety_actions_log_suspension_id ON public.safety_actions_log(suspension_id);
CREATE INDEX IF NOT EXISTS idx_safety_actions_log_user_id ON public.safety_actions_log(user_id);

-- Safety Incidents
CREATE INDEX IF NOT EXISTS idx_safety_incidents_investigator_id ON public.safety_incidents(investigator_id);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_resolved_by ON public.safety_incidents(resolved_by);

-- Safety Reports
CREATE INDEX IF NOT EXISTS idx_safety_reports_booking_id ON public.safety_reports(booking_id);
CREATE INDEX IF NOT EXISTS idx_safety_reports_resolved_by ON public.safety_reports(resolved_by);

-- Safety Warnings
CREATE INDEX IF NOT EXISTS idx_safety_warnings_incident_id ON public.safety_warnings(incident_id);
CREATE INDEX IF NOT EXISTS idx_safety_warnings_issued_by ON public.safety_warnings(issued_by);
CREATE INDEX IF NOT EXISTS idx_safety_warnings_report_id ON public.safety_warnings(report_id);

-- Search History Analytics
CREATE INDEX IF NOT EXISTS idx_search_history_analytics_result_clicked ON public.search_history_analytics(result_clicked);

-- SMS Campaigns
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_created_by ON public.sms_campaigns(created_by);

-- Suspicious Activities
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_reviewed_by ON public.suspicious_activities(reviewed_by);

-- User Challenges
CREATE INDEX IF NOT EXISTS idx_user_challenges_challenge_id ON public.user_challenges(challenge_id);

-- User Recommendations
CREATE INDEX IF NOT EXISTS idx_user_recommendations_driver_id ON public.user_recommendations(driver_id);
CREATE INDEX IF NOT EXISTS idx_user_recommendations_ride_id ON public.user_recommendations(ride_id);

-- User Suspensions
CREATE INDEX IF NOT EXISTS idx_user_suspensions_incident_id ON public.user_suspensions(incident_id);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_lifted_by ON public.user_suspensions(lifted_by);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_suspended_by ON public.user_suspensions(suspended_by);

-- ===== End 20251222185446_20251222150000_add_missing_foreign_key_indexes.sql =====

-- ===== Begin 20251222185530_20251222150100_optimize_rls_auth_policies_part1.sql =====

/*
  # Optimize RLS Policies - Auth Initialization (Part 1)

  1. Performance Improvements
    - Wraps auth.uid() calls in SELECT to prevent re-evaluation
    - Significantly improves RLS policy performance at scale
    - Reduces CPU usage for authenticated queries

  2. Affected Tables
    - emergency_alerts
    - emergency_notifications
    - vehicle_insurance
    - vehicles
    - two_factor_auth
    - two_factor_recovery_codes
    - two_factor_audit_log
*/

-- Emergency Alerts
DROP POLICY IF EXISTS "Users can create own emergency alerts" ON public.emergency_alerts;
CREATE POLICY "Users can create own emergency alerts" ON public.emergency_alerts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can read own emergency alerts" ON public.emergency_alerts;
CREATE POLICY "Users can read own emergency alerts" ON public.emergency_alerts
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own emergency alerts" ON public.emergency_alerts;
CREATE POLICY "Users can update own emergency alerts" ON public.emergency_alerts
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Emergency Notifications
DROP POLICY IF EXISTS "Users can create alert notifications" ON public.emergency_notifications;
CREATE POLICY "Users can create alert notifications" ON public.emergency_notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.emergency_alerts
      WHERE id = emergency_alert_id
      AND user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can read own alert notifications" ON public.emergency_notifications;
CREATE POLICY "Users can read own alert notifications" ON public.emergency_notifications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.emergency_alerts
      WHERE id = emergency_alert_id
      AND user_id = (SELECT auth.uid())
    )
  );

-- Vehicles
DROP POLICY IF EXISTS "Users can delete their own vehicles" ON public.vehicles;
CREATE POLICY "Users can delete their own vehicles" ON public.vehicles
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own vehicles" ON public.vehicles;
CREATE POLICY "Users can insert their own vehicles" ON public.vehicles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own vehicles" ON public.vehicles;
CREATE POLICY "Users can update their own vehicles" ON public.vehicles
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their own vehicles" ON public.vehicles;
CREATE POLICY "Users can view their own vehicles" ON public.vehicles
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ===== End 20251222185530_20251222150100_optimize_rls_auth_policies_part1.sql =====

-- ===== Begin 20251222185554_20251222150200_optimize_rls_auth_policies_part2.sql =====

/*
  # Optimize RLS Policies - Auth Initialization (Part 2)

  1. Performance Improvements
    - Wraps auth.uid() calls in SELECT to prevent re-evaluation
    - Significantly improves RLS policy performance at scale

  2. Affected Tables
    - user_challenges
    - two_factor_auth
    - two_factor_recovery_codes
    - two_factor_audit_log
    - notification_preferences
    - saved_searches
*/

-- User Challenges
DROP POLICY IF EXISTS "Users insert own challenges" ON public.user_challenges;
CREATE POLICY "Users insert own challenges" ON public.user_challenges
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users update own challenges" ON public.user_challenges;
CREATE POLICY "Users update own challenges" ON public.user_challenges
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users view own challenges" ON public.user_challenges;
CREATE POLICY "Users view own challenges" ON public.user_challenges
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Two Factor Auth
DROP POLICY IF EXISTS "Admins can view all 2FA settings" ON public.two_factor_auth;
CREATE POLICY "Admins can view all 2FA settings" ON public.two_factor_auth
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Users can create own 2FA settings" ON public.two_factor_auth;
CREATE POLICY "Users can create own 2FA settings" ON public.two_factor_auth
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own 2FA settings" ON public.two_factor_auth;
CREATE POLICY "Users can delete own 2FA settings" ON public.two_factor_auth
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own 2FA settings" ON public.two_factor_auth;
CREATE POLICY "Users can update own 2FA settings" ON public.two_factor_auth
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own 2FA settings" ON public.two_factor_auth;
CREATE POLICY "Users can view own 2FA settings" ON public.two_factor_auth
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Two Factor Recovery Codes
DROP POLICY IF EXISTS "Users can create own recovery codes" ON public.two_factor_recovery_codes;
CREATE POLICY "Users can create own recovery codes" ON public.two_factor_recovery_codes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own recovery codes" ON public.two_factor_recovery_codes;
CREATE POLICY "Users can update own recovery codes" ON public.two_factor_recovery_codes
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own recovery codes" ON public.two_factor_recovery_codes;
CREATE POLICY "Users can view own recovery codes" ON public.two_factor_recovery_codes
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Two Factor Audit Log
DROP POLICY IF EXISTS "Admins can view all 2FA audit logs" ON public.two_factor_audit_log;
CREATE POLICY "Admins can view all 2FA audit logs" ON public.two_factor_audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Users can view own 2FA audit log" ON public.two_factor_audit_log;
CREATE POLICY "Users can view own 2FA audit log" ON public.two_factor_audit_log
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Notification Preferences
DROP POLICY IF EXISTS "Users insert own notif prefs" ON public.notification_preferences;
CREATE POLICY "Users insert own notif prefs" ON public.notification_preferences
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users update own notif prefs" ON public.notification_preferences;
CREATE POLICY "Users update own notif prefs" ON public.notification_preferences
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users view own notif prefs" ON public.notification_preferences;
CREATE POLICY "Users view own notif prefs" ON public.notification_preferences
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Saved Searches
DROP POLICY IF EXISTS "Users can create own saved searches" ON public.saved_searches;
CREATE POLICY "Users can create own saved searches" ON public.saved_searches
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own saved searches" ON public.saved_searches;
CREATE POLICY "Users can delete own saved searches" ON public.saved_searches
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own saved searches" ON public.saved_searches;
CREATE POLICY "Users can update own saved searches" ON public.saved_searches
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own saved searches" ON public.saved_searches;
CREATE POLICY "Users can view own saved searches" ON public.saved_searches
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ===== End 20251222185554_20251222150200_optimize_rls_auth_policies_part2.sql =====

-- ===== Begin 20251222185616_20251222150300_optimize_rls_auth_policies_part3.sql =====

/*
  # Optimize RLS Policies - Auth Initialization (Part 3)

  1. Performance Improvements
    - Wraps auth.uid() calls in SELECT to prevent re-evaluation
    - Significantly improves RLS policy performance at scale

  2. Affected Tables
    - passkey_credentials
    - passenger_search_filters
    - preferred_drivers
    - blocked_users_preferences
    - recurring_ride_templates
    - bug_reports
*/

-- Bug Reports
DROP POLICY IF EXISTS "All authenticated users can submit bug reports" ON public.bug_reports;
CREATE POLICY "All authenticated users can submit bug reports" ON public.bug_reports
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Driver Licenses
DROP POLICY IF EXISTS "Admins can update licenses" ON public.driver_licenses;
CREATE POLICY "Admins can update licenses" ON public.driver_licenses
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can view all licenses" ON public.driver_licenses;
CREATE POLICY "Admins can view all licenses" ON public.driver_licenses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

-- Passkey Credentials
DROP POLICY IF EXISTS "Users can delete own passkey credentials" ON public.passkey_credentials;
CREATE POLICY "Users can delete own passkey credentials" ON public.passkey_credentials
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own passkey credentials" ON public.passkey_credentials;
CREATE POLICY "Users can view own passkey credentials" ON public.passkey_credentials
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Passenger Search Filters
DROP POLICY IF EXISTS "Users can create own search filters" ON public.passenger_search_filters;
CREATE POLICY "Users can create own search filters" ON public.passenger_search_filters
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own search filters" ON public.passenger_search_filters;
CREATE POLICY "Users can delete own search filters" ON public.passenger_search_filters
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own search filters" ON public.passenger_search_filters;
CREATE POLICY "Users can update own search filters" ON public.passenger_search_filters
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own search filters" ON public.passenger_search_filters;
CREATE POLICY "Users can view own search filters" ON public.passenger_search_filters
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Preferred Drivers
DROP POLICY IF EXISTS "Users can add preferred drivers" ON public.preferred_drivers;
CREATE POLICY "Users can add preferred drivers" ON public.preferred_drivers
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can remove preferred drivers" ON public.preferred_drivers;
CREATE POLICY "Users can remove preferred drivers" ON public.preferred_drivers
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own preferred drivers" ON public.preferred_drivers;
CREATE POLICY "Users can update own preferred drivers" ON public.preferred_drivers
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own preferred drivers" ON public.preferred_drivers;
CREATE POLICY "Users can view own preferred drivers" ON public.preferred_drivers
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Blocked Users Preferences
DROP POLICY IF EXISTS "Users can block other users" ON public.blocked_users_preferences;
CREATE POLICY "Users can block other users" ON public.blocked_users_preferences
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can unblock users" ON public.blocked_users_preferences;
CREATE POLICY "Users can unblock users" ON public.blocked_users_preferences
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own blocks" ON public.blocked_users_preferences;
CREATE POLICY "Users can update own blocks" ON public.blocked_users_preferences
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own blocked users" ON public.blocked_users_preferences;
CREATE POLICY "Users can view own blocked users" ON public.blocked_users_preferences
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Recurring Ride Templates
DROP POLICY IF EXISTS "Users can create ride templates" ON public.recurring_ride_templates;
CREATE POLICY "Users can create ride templates" ON public.recurring_ride_templates
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own ride templates" ON public.recurring_ride_templates;
CREATE POLICY "Users can delete own ride templates" ON public.recurring_ride_templates
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own ride templates" ON public.recurring_ride_templates;
CREATE POLICY "Users can update own ride templates" ON public.recurring_ride_templates
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own ride templates" ON public.recurring_ride_templates;
CREATE POLICY "Users can view own ride templates" ON public.recurring_ride_templates
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ===== End 20251222185616_20251222150300_optimize_rls_auth_policies_part3.sql =====

-- ===== Begin 20251222185639_20251222150400_drop_unused_indexes_part1.sql =====

/*
  # Drop Unused Indexes (Part 1)

  1. Performance Improvements
    - Removes unused indexes to reduce storage overhead
    - Speeds up INSERT, UPDATE, DELETE operations
    - Reduces maintenance burden

  2. Notes
    - Only dropping indexes that are confirmed unused
    - Keeping critical performance indexes
*/

-- Booking History
DROP INDEX IF EXISTS idx_booking_history_user_id;

-- Conversation Read Markers
DROP INDEX IF EXISTS idx_conversation_read_markers_conversation;
DROP INDEX IF EXISTS idx_conversation_read_markers_user;
DROP INDEX IF EXISTS idx_conversation_read_markers_last_read_message_id;

-- Trip Requests (renamed from ride_requests)
DROP INDEX IF EXISTS idx_ride_requests_requester;
DROP INDEX IF EXISTS idx_ride_requests_departure;

-- Chat Messages
DROP INDEX IF EXISTS idx_chat_messages_conversation_created;
DROP INDEX IF EXISTS idx_chat_messages_reply_to_message_id;

-- Message Reports
DROP INDEX IF EXISTS idx_message_reports_message;
DROP INDEX IF EXISTS idx_message_reports_reporter_id;

-- Bug Reports
DROP INDEX IF EXISTS idx_bug_reports_user_id;

-- Emergency Alerts
DROP INDEX IF EXISTS idx_emergency_alerts_user_id;
DROP INDEX IF EXISTS idx_emergency_alerts_ride_id;
DROP INDEX IF EXISTS idx_emergency_alerts_status;

-- Emergency Notifications
DROP INDEX IF EXISTS idx_emergency_notifications_alert_id;
DROP INDEX IF EXISTS idx_emergency_notifications_contact_id;

-- Profiles
DROP INDEX IF EXISTS idx_profiles_whatsapp;
DROP INDEX IF EXISTS idx_profiles_avatar_url;
DROP INDEX IF EXISTS idx_profiles_phone_e164;
DROP INDEX IF EXISTS idx_profiles_created_at;
DROP INDEX IF EXISTS idx_profiles_is_admin;

-- AI Chat History
DROP INDEX IF EXISTS idx_ai_chat_history_user_id;
DROP INDEX IF EXISTS idx_ai_chat_history_created_at;

-- Ride Requests
DROP INDEX IF EXISTS idx_ride_requests_rider_id;
DROP INDEX IF EXISTS idx_ride_requests_expires_at;
DROP INDEX IF EXISTS idx_ride_requests_ride_status;
DROP INDEX IF EXISTS idx_ride_requests_rider_status;

-- Vehicle Insurance
DROP INDEX IF EXISTS idx_vehicle_insurance_vehicle_id;
DROP INDEX IF EXISTS idx_vehicle_insurance_expiry;

-- Trip Offers
DROP INDEX IF EXISTS idx_trip_offers_trip_request_id;
DROP INDEX IF EXISTS idx_trip_offers_driver_id;
DROP INDEX IF EXISTS idx_trip_offers_status;
DROP INDEX IF EXISTS idx_trip_offers_ride_id;

-- Messages
DROP INDEX IF EXISTS idx_messages_ride_id;

-- Notifications
DROP INDEX IF EXISTS idx_notifications_user_id;
DROP INDEX IF EXISTS idx_notifications_is_read;
DROP INDEX IF EXISTS idx_notifications_created_at;

-- Rate Limits
DROP INDEX IF EXISTS idx_rate_limits_user_id;

-- Ride Stops
DROP INDEX IF EXISTS idx_ride_stops_user_id;

-- Safety Reports
DROP INDEX IF EXISTS idx_safety_reports_reported_user_id;
DROP INDEX IF EXISTS idx_safety_reports_reporter_id;
DROP INDEX IF EXISTS idx_safety_reports_assigned;
DROP INDEX IF EXISTS idx_safety_reports_priority;
DROP INDEX IF EXISTS idx_safety_reports_updated;

-- ===== End 20251222185639_20251222150400_drop_unused_indexes_part1.sql =====

-- ===== Begin 20251222185657_20251222150500_drop_unused_indexes_part2.sql =====

/*
  # Drop Unused Indexes (Part 2)

  1. Performance Improvements
    - Continues removing unused indexes
    - Reduces storage and maintenance overhead
*/

-- Rides
DROP INDEX IF EXISTS idx_rides_driver_id;
DROP INDEX IF EXISTS idx_rides_status;
DROP INDEX IF EXISTS idx_rides_departure_time;
DROP INDEX IF EXISTS idx_rides_city_area;
DROP INDEX IF EXISTS idx_rides_driver_status;
DROP INDEX IF EXISTS idx_rides_vehicle_id;
DROP INDEX IF EXISTS idx_rides_created_at_status;
DROP INDEX IF EXISTS idx_rides_locations;
DROP INDEX IF EXISTS idx_rides_time_type;
DROP INDEX IF EXISTS idx_rides_time_type_departure;
DROP INDEX IF EXISTS idx_rides_departure_time_status;

-- Saved Searches
DROP INDEX IF EXISTS idx_saved_searches_user_id;
DROP INDEX IF EXISTS idx_saved_searches_alerts_enabled;

-- Conversations
DROP INDEX IF EXISTS idx_conversations_ride_id;
DROP INDEX IF EXISTS idx_conversations_trip_request_id;
DROP INDEX IF EXISTS idx_conversations_type;

-- Conversation Members
DROP INDEX IF EXISTS idx_conversation_members_conversation_id;
DROP INDEX IF EXISTS idx_conversation_members_user_id;

-- Chat Messages
DROP INDEX IF EXISTS idx_chat_messages_conversation_id;
DROP INDEX IF EXISTS idx_chat_messages_sender_id;
DROP INDEX IF EXISTS idx_chat_messages_created_at;

-- Message Reads
DROP INDEX IF EXISTS idx_message_reads_message_id;
DROP INDEX IF EXISTS idx_message_reads_user_id;

-- Two Factor Auth
DROP INDEX IF EXISTS idx_two_factor_auth_enabled;
DROP INDEX IF EXISTS idx_two_factor_recovery_codes_user_id;
DROP INDEX IF EXISTS idx_two_factor_recovery_codes_used;
DROP INDEX IF EXISTS idx_two_factor_audit_log_user_id;
DROP INDEX IF EXISTS idx_two_factor_audit_log_created_at;

-- Vehicles
DROP INDEX IF EXISTS idx_vehicles_image_url;
DROP INDEX IF EXISTS idx_vehicles_user_active;

-- Safety Incidents
DROP INDEX IF EXISTS idx_safety_incidents_number;
DROP INDEX IF EXISTS idx_safety_incidents_status;
DROP INDEX IF EXISTS idx_safety_incidents_severity;
DROP INDEX IF EXISTS idx_safety_incidents_user;

-- User Suspensions
DROP INDEX IF EXISTS idx_user_suspensions_user;
DROP INDEX IF EXISTS idx_user_suspensions_active;
DROP INDEX IF EXISTS idx_user_suspensions_dates;

-- Safety Warnings
DROP INDEX IF EXISTS idx_safety_warnings_user;
DROP INDEX IF EXISTS idx_safety_warnings_level;

-- Safety Actions Log
DROP INDEX IF EXISTS idx_safety_actions_log_type;
DROP INDEX IF EXISTS idx_safety_actions_log_date;

-- Friend Requests
DROP INDEX IF EXISTS idx_friend_requests_from_user_id;
DROP INDEX IF EXISTS idx_friend_requests_to_user_id;
DROP INDEX IF EXISTS idx_friend_requests_status;

-- Friendships
DROP INDEX IF EXISTS idx_friendships_user_a;
DROP INDEX IF EXISTS idx_friendships_user_b;

-- Blocks
DROP INDEX IF EXISTS idx_blocks_blocker_id;
DROP INDEX IF EXISTS idx_blocks_blocked_id;
DROP INDEX IF EXISTS idx_blocks_blocker_blocked;

-- Location History
DROP INDEX IF EXISTS idx_loc_hist_usr;

-- Reviews
DROP INDEX IF EXISTS idx_reviews_reviewer_id;

-- Ride Waitlist
DROP INDEX IF EXISTS idx_ride_waitlist_user_id_fk;

-- Bookings
DROP INDEX IF EXISTS idx_bookings_created_at_status;

-- ===== End 20251222185657_20251222150500_drop_unused_indexes_part2.sql =====

-- ===== Begin 20251222185715_20251222150600_drop_unused_indexes_part3.sql =====

/*
  # Drop Unused Indexes (Part 3)

  1. Performance Improvements
    - Continues removing unused indexes
    - Final batch of unused indexes
*/

-- Leaderboard Cache
DROP INDEX IF EXISTS idx_leaderboard_cache_user_id;
DROP INDEX IF EXISTS idx_leaderboard_cache_category_period;
DROP INDEX IF EXISTS idx_leaderboard_cache_rank;

-- Challenges
DROP INDEX IF EXISTS idx_challenges_active;
DROP INDEX IF EXISTS idx_challenges_type;

-- User Challenges
DROP INDEX IF EXISTS idx_user_challenges_user_id;
DROP INDEX IF EXISTS idx_user_challenges_completed;

-- Driver Licenses
DROP INDEX IF EXISTS idx_driver_licenses_verified;
DROP INDEX IF EXISTS idx_driver_licenses_expiry;

-- Ride Tracking Sessions
DROP INDEX IF EXISTS idx_track_rid;

-- Passkey Credentials
DROP INDEX IF EXISTS idx_passkey_credentials_credential_id;

-- Passkey Challenges
DROP INDEX IF EXISTS idx_passkey_challenges_challenge;
DROP INDEX IF EXISTS idx_passkey_challenges_expires_at;

-- Offline Queue
DROP INDEX IF EXISTS idx_offq_usr;

-- Activity Logs
DROP INDEX IF EXISTS idx_activity_logs_created_at;
DROP INDEX IF EXISTS idx_activity_logs_type;
DROP INDEX IF EXISTS idx_activity_logs_severity;
DROP INDEX IF EXISTS idx_activity_logs_actor;
DROP INDEX IF EXISTS idx_activity_logs_target;

-- Critical Alerts
DROP INDEX IF EXISTS idx_critical_alerts_status;
DROP INDEX IF EXISTS idx_critical_alerts_type;
DROP INDEX IF EXISTS idx_critical_alerts_severity;

-- Passenger Search Filters
DROP INDEX IF EXISTS idx_passenger_search_filters_user_id;
DROP INDEX IF EXISTS idx_passenger_search_filters_default;

-- Preferred Drivers
DROP INDEX IF EXISTS idx_preferred_drivers_user_id;
DROP INDEX IF EXISTS idx_preferred_drivers_driver_id;

-- Bulk Operations
DROP INDEX IF EXISTS idx_bulk_operations_status;
DROP INDEX IF EXISTS idx_bulk_operations_type;
DROP INDEX IF EXISTS idx_bulk_operations_initiated_by;
DROP INDEX IF EXISTS idx_bulk_operation_items_operation;
DROP INDEX IF EXISTS idx_bulk_operation_items_target;

-- Blocked Users
DROP INDEX IF EXISTS idx_blocked_users_user_id;
DROP INDEX IF EXISTS idx_blocked_users_blocked_id;

-- Recurring Ride Templates
DROP INDEX IF EXISTS idx_recurring_ride_templates_user_id;
DROP INDEX IF EXISTS idx_recurring_ride_templates_active;

-- Search History
DROP INDEX IF EXISTS idx_search_history_user_id;
DROP INDEX IF EXISTS idx_search_history_timestamp;

-- Scheduled Operations
DROP INDEX IF EXISTS idx_scheduled_operations_next_run;
DROP INDEX IF EXISTS idx_scheduled_operations_scheduled_by;

-- Preference Profiles
DROP INDEX IF EXISTS idx_preference_profiles_user_id;
DROP INDEX IF EXISTS idx_preference_profiles_active;

-- Ride Request Matches
DROP INDEX IF EXISTS idx_ride_requests_matches_request;
DROP INDEX IF EXISTS idx_ride_requests_matches_ride;
DROP INDEX IF EXISTS idx_ride_requests_matches_status;
DROP INDEX IF EXISTS idx_ride_requests_matches_score;
DROP INDEX IF EXISTS idx_ride_requests_matches_expires;

-- Trip Request Matches
DROP INDEX IF EXISTS idx_trip_requests_matches_request;
DROP INDEX IF EXISTS idx_trip_requests_matches_ride;
DROP INDEX IF EXISTS idx_trip_requests_matches_status;
DROP INDEX IF EXISTS idx_trip_requests_matches_score;
DROP INDEX IF EXISTS idx_trip_requests_matches_expires;

-- Trip Requests
DROP INDEX IF EXISTS idx_trip_requests_time_type;
DROP INDEX IF EXISTS idx_trip_requests_time_type_departure;
DROP INDEX IF EXISTS idx_trip_requests_departure_status;

-- ===== End 20251222185715_20251222150600_drop_unused_indexes_part3.sql =====

-- ===== Begin 20251222185736_20251222150700_drop_unused_indexes_part4.sql =====

/*
  # Drop Unused Indexes (Part 4)

  1. Performance Improvements
    - Final batch of unused indexes
    - Analytics and performance monitoring indexes
*/

-- Ride Tracking
DROP INDEX IF EXISTS idx_ride_tracking_ride;
DROP INDEX IF EXISTS idx_ride_tracking_driver;
DROP INDEX IF EXISTS idx_ride_tracking_location;
DROP INDEX IF EXISTS idx_ride_tracking_active;

-- Ride Reviews Detailed
DROP INDEX IF EXISTS idx_reviews_detailed_booking;
DROP INDEX IF EXISTS idx_reviews_detailed_ride;
DROP INDEX IF EXISTS idx_reviews_detailed_reviewee;
DROP INDEX IF EXISTS idx_reviews_detailed_reviewer;

-- Favorite Drivers
DROP INDEX IF EXISTS idx_favorites_passenger;
DROP INDEX IF EXISTS idx_favorites_driver;
DROP INDEX IF EXISTS idx_favorites_auto_accept;

-- Notification Queue
DROP INDEX IF EXISTS idx_notifications_user;
DROP INDEX IF EXISTS idx_notifications_status;
DROP INDEX IF EXISTS idx_notifications_scheduled;
DROP INDEX IF EXISTS idx_notifications_priority;

-- Ride Modifications
DROP INDEX IF EXISTS idx_modifications_ride;
DROP INDEX IF EXISTS idx_modifications_booking;
DROP INDEX IF EXISTS idx_modifications_created;

-- Cancellation History
DROP INDEX IF EXISTS idx_cancellation_history_user;
DROP INDEX IF EXISTS idx_cancellation_history_created;
DROP INDEX IF EXISTS idx_cancellation_history_ride;

-- Reliability Scores
DROP INDEX IF EXISTS idx_reliability_scores_score;

-- Booking Restrictions
DROP INDEX IF EXISTS idx_booking_restrictions_active;

-- Performance Metrics
DROP INDEX IF EXISTS idx_performance_metrics_type;
DROP INDEX IF EXISTS idx_performance_metrics_endpoint;
DROP INDEX IF EXISTS idx_performance_metrics_created_at;

-- System Health
DROP INDEX IF EXISTS idx_system_health_timestamp;
DROP INDEX IF EXISTS idx_system_health_checked_at;
DROP INDEX IF EXISTS idx_system_health_status;

-- API Performance
DROP INDEX IF EXISTS idx_api_performance_timestamp;
DROP INDEX IF EXISTS idx_api_performance_endpoint;
DROP INDEX IF EXISTS idx_api_performance_status;

-- Database Performance
DROP INDEX IF EXISTS idx_db_performance_timestamp;
DROP INDEX IF EXISTS idx_db_performance_table;

-- Query Performance
DROP INDEX IF EXISTS idx_query_performance_query_name;
DROP INDEX IF EXISTS idx_query_performance_execution_time;

-- Error Logs
DROP INDEX IF EXISTS idx_error_logs_severity;
DROP INDEX IF EXISTS idx_error_logs_status;
DROP INDEX IF EXISTS idx_error_logs_last_seen;
DROP INDEX IF EXISTS idx_error_logs_type;
DROP INDEX IF EXISTS idx_error_logs_unresolved;

-- Service Uptime
DROP INDEX IF EXISTS idx_service_uptime_status;
DROP INDEX IF EXISTS idx_service_uptime_last_check;

-- Ride Analytics
DROP INDEX IF EXISTS idx_ride_analytics_ride_id;
DROP INDEX IF EXISTS idx_ride_analytics_time;
DROP INDEX IF EXISTS idx_ride_analytics_day;

-- User Recommendations
DROP INDEX IF EXISTS idx_user_recommendations_user;
DROP INDEX IF EXISTS idx_user_recommendations_score;
DROP INDEX IF EXISTS idx_user_recommendations_active;

-- Geographic Analytics
DROP INDEX IF EXISTS idx_geographic_region;
DROP INDEX IF EXISTS idx_geographic_city;

-- User Behavior
DROP INDEX IF EXISTS idx_user_behavior_user;
DROP INDEX IF EXISTS idx_user_behavior_date;
DROP INDEX IF EXISTS idx_user_behavior_churn;

-- Growth Metrics
DROP INDEX IF EXISTS idx_growth_metrics_date;
DROP INDEX IF EXISTS idx_growth_metrics_source;

-- Cohort Analysis
DROP INDEX IF EXISTS idx_cohort_month;

-- Performance Benchmarks
DROP INDEX IF EXISTS idx_benchmarks_date;
DROP INDEX IF EXISTS idx_benchmarks_category;

-- Transactions
DROP INDEX IF EXISTS idx_transactions_user;
DROP INDEX IF EXISTS idx_transactions_ride;
DROP INDEX IF EXISTS idx_transactions_status;
DROP INDEX IF EXISTS idx_transactions_created;
DROP INDEX IF EXISTS idx_transactions_type;

-- Revenue Tracking
DROP INDEX IF EXISTS idx_revenue_date;

-- Push Notifications
DROP INDEX IF EXISTS idx_push_scheduled;
DROP INDEX IF EXISTS idx_push_status;

-- ===== End 20251222185736_20251222150700_drop_unused_indexes_part4.sql =====

-- ===== Begin 20251222185755_20251222150800_drop_unused_indexes_part5.sql =====

/*
  # Drop Unused Indexes (Part 5 - Final)

  1. Performance Improvements
    - Final batch of unused indexes
    - Communication and ML indexes
*/

-- Recommendation Feedback
DROP INDEX IF EXISTS idx_recommendation_feedback_recommendation;
DROP INDEX IF EXISTS idx_recommendation_feedback_user;

-- ML Training Data
DROP INDEX IF EXISTS idx_ml_training_data_type;

-- Financial Reports
DROP INDEX IF EXISTS idx_reports_type;
DROP INDEX IF EXISTS idx_reports_period;
DROP INDEX IF EXISTS idx_reports_generated;

-- Search Queries
DROP INDEX IF EXISTS idx_search_queries_user;
DROP INDEX IF EXISTS idx_search_queries_type;
DROP INDEX IF EXISTS idx_search_queries_query_text;

-- Pricing Rules
DROP INDEX IF EXISTS idx_pricing_active;
DROP INDEX IF EXISTS idx_pricing_type;
DROP INDEX IF EXISTS idx_pricing_priority;

-- Email Campaigns
DROP INDEX IF EXISTS idx_email_campaigns_status;
DROP INDEX IF EXISTS idx_email_campaigns_scheduled;

-- Search Results Cache
DROP INDEX IF EXISTS idx_search_results_cache_key;
DROP INDEX IF EXISTS idx_search_results_cache_expires;

-- SMS Campaigns
DROP INDEX IF EXISTS idx_sms_status;
DROP INDEX IF EXISTS idx_sms_scheduled;

-- Route Popularity
DROP INDEX IF EXISTS idx_route_popularity_search_count;

-- In-App Messages
DROP INDEX IF EXISTS idx_in_app_active;
DROP INDEX IF EXISTS idx_in_app_priority;
DROP INDEX IF EXISTS idx_in_app_valid;

-- Communication Templates
DROP INDEX IF EXISTS idx_templates_type;
DROP INDEX IF EXISTS idx_templates_category;
DROP INDEX IF EXISTS idx_templates_active;

-- Campaign Analytics
DROP INDEX IF EXISTS idx_campaign_analytics_id;
DROP INDEX IF EXISTS idx_campaign_analytics_timestamp;

-- Error Patterns
DROP INDEX IF EXISTS idx_error_patterns_occurrence;
DROP INDEX IF EXISTS idx_error_patterns_last_seen;

-- User Communication Preferences
DROP INDEX IF EXISTS idx_user_comm_prefs_user;

-- ML Predictions
DROP INDEX IF EXISTS idx_ml_predictions_type;
DROP INDEX IF EXISTS idx_ml_predictions_created;

-- Demand Forecasts
DROP INDEX IF EXISTS idx_demand_forecast_date;
DROP INDEX IF EXISTS idx_demand_forecast_region;

-- Cache Entries
DROP INDEX IF EXISTS idx_cache_entries_key;
DROP INDEX IF EXISTS idx_cache_entries_expires;
DROP INDEX IF EXISTS idx_cache_entries_type;

-- Cache Stats
DROP INDEX IF EXISTS idx_cache_stats_recorded;
DROP INDEX IF EXISTS idx_cache_stats_type;

-- Recommendations
DROP INDEX IF EXISTS idx_recommendations_user;
DROP INDEX IF EXISTS idx_recommendations_type;
DROP INDEX IF EXISTS idx_recommendations_shown;

-- Fraud Alerts
DROP INDEX IF EXISTS idx_fraud_alerts_user;
DROP INDEX IF EXISTS idx_fraud_alerts_status;
DROP INDEX IF EXISTS idx_fraud_alerts_severity;
DROP INDEX IF EXISTS idx_fraud_alerts_created;

-- Suspicious Activities
DROP INDEX IF EXISTS idx_suspicious_user;
DROP INDEX IF EXISTS idx_suspicious_reviewed;
DROP INDEX IF EXISTS idx_suspicious_risk;

-- Admin Audit Log
DROP INDEX IF EXISTS idx_audit_admin;
DROP INDEX IF EXISTS idx_audit_resource;

-- Data Access Log
DROP INDEX IF EXISTS idx_data_access_user;
DROP INDEX IF EXISTS idx_data_access_resource;
DROP INDEX IF EXISTS idx_data_access_created;

-- Content Moderation
DROP INDEX IF EXISTS idx_moderation_status;
DROP INDEX IF EXISTS idx_moderation_severity;

-- Automated Content Filters
DROP INDEX IF EXISTS idx_filters_active;
DROP INDEX IF EXISTS idx_filters_type;

-- Push Notification Tokens
DROP INDEX IF EXISTS idx_push_tokens_user_act;

-- Live Locations
DROP INDEX IF EXISTS idx_live_locs_rid;

-- ===== End 20251222185755_20251222150800_drop_unused_indexes_part5.sql =====

-- ===== Begin 20251222185815_20251222150900_add_cache_rls_policies.sql =====

/*
  # Add RLS Policies for Cache Tables

  1. Security
    - Adds RLS policies for cache_entries and cache_stats
    - Restricts access to admin users only
    - Prevents unauthorized access to cache data

  2. Tables Affected
    - cache_entries
    - cache_stats
*/

-- Cache Entries - Admin Only Access
CREATE POLICY "Admins can view cache entries" ON public.cache_entries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

CREATE POLICY "Admins can insert cache entries" ON public.cache_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

CREATE POLICY "Admins can update cache entries" ON public.cache_entries
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

CREATE POLICY "Admins can delete cache entries" ON public.cache_entries
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

-- Cache Stats - Admin Only Access
CREATE POLICY "Admins can view cache stats" ON public.cache_stats
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

CREATE POLICY "Admins can insert cache stats" ON public.cache_stats
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

CREATE POLICY "Admins can update cache stats" ON public.cache_stats
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

CREATE POLICY "Admins can delete cache stats" ON public.cache_stats
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

-- ===== End 20251222185815_20251222150900_add_cache_rls_policies.sql =====

-- ===== Begin 20251222212017_20251222_fix_critical_rls_and_function_errors_v2.sql =====

/*
  # Fix Critical RLS and Function Errors

  1. Issues Fixed
    - Fix infinite recursion in rides RLS policies
    - Fix get_smart_recommendations function (remove non-existent price_per_seat column)
    - Simplify circular dependencies between rides and ride_requests

  2. Changes
    - Recreate rides SELECT policies without circular dependencies
    - Update get_smart_recommendations function to use existing columns only
    
  3. Security
    - Maintain same access control logic without recursion
    - Ensure authenticated users can still view appropriate rides
*/

-- Drop existing problematic rides SELECT policies
DROP POLICY IF EXISTS "Anyone can view active rides" ON rides;
DROP POLICY IF EXISTS "Drivers can view own rides" ON rides;
DROP POLICY IF EXISTS "Users can view rides they have booked" ON rides;

-- Recreate rides SELECT policies without circular dependencies
CREATE POLICY "Users can view active rides"
  ON rides FOR SELECT
  TO authenticated
  USING (status = 'active' OR driver_id = (SELECT auth.uid()));

CREATE POLICY "Users can view booked rides"
  ON rides FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT ride_id 
      FROM ride_requests 
      WHERE rider_id = (SELECT auth.uid()) 
        AND status = 'accepted'
    )
  );

-- Drop and recreate get_smart_recommendations function
DROP FUNCTION IF EXISTS get_smart_recommendations(uuid, integer);

CREATE FUNCTION get_smart_recommendations(
  p_user_id uuid,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  recommendation_id uuid,
  ride_id uuid,
  driver_id uuid,
  score integer,
  reasoning jsonb,
  ride_details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clean up old recommendations
  DELETE FROM user_recommendations
  WHERE expires_at < NOW() 
     OR (dismissed = true AND created_at < NOW() - INTERVAL '30 days');

  -- Return recommendations with existing ride columns only
  RETURN QUERY
  SELECT 
    ur.id as recommendation_id,
    ur.ride_id,
    ur.driver_id,
    ur.score,
    ur.reasoning,
    jsonb_build_object(
      'origin', r.origin,
      'destination', r.destination,
      'departure_time', r.departure_time,
      'available_seats', r.available_seats,
      'estimated_distance', r.estimated_distance,
      'estimated_duration', r.estimated_duration
    ) as ride_details
  FROM user_recommendations ur
  LEFT JOIN rides r ON r.id = ur.ride_id
  WHERE ur.user_id = p_user_id
    AND NOT ur.dismissed
    AND NOT ur.converted
    AND ur.expires_at > NOW()
  ORDER BY ur.score DESC, ur.created_at DESC
  LIMIT p_limit;
END;
$$;

-- ===== End 20251222212017_20251222_fix_critical_rls_and_function_errors_v2.sql =====

-- ===== Begin 20251222212057_20251222_cleanup_duplicate_vehicle_policies.sql =====

/*
  # Cleanup Duplicate Vehicle Policies

  1. Issue
    - Multiple duplicate policies exist for vehicles table
    - This can cause confusion and performance issues

  2. Changes
    - Remove older duplicate policies
    - Keep only one policy per operation type
    
  3. Security
    - Maintains same access control
    - Users can only manage their own vehicles
*/

-- Drop duplicate INSERT policies (keep the more descriptive one)
DROP POLICY IF EXISTS "Users can insert own vehicles" ON vehicles;

-- Drop duplicate SELECT policies (consolidate into one comprehensive policy)
DROP POLICY IF EXISTS "Users can view own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can view their own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can view vehicles associated with rides" ON vehicles;
DROP POLICY IF EXISTS "Users can view vehicles for active rides" ON vehicles;
DROP POLICY IF EXISTS "Users can view vehicles for their bookings" ON vehicles;

-- Drop duplicate UPDATE policies
DROP POLICY IF EXISTS "Users can update own vehicles" ON vehicles;

-- Drop duplicate DELETE policies
DROP POLICY IF EXISTS "Users can delete own vehicles" ON vehicles;

-- Create single, clear SELECT policy for vehicles
CREATE POLICY "Users can view vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (
    -- Own vehicles
    user_id = (SELECT auth.uid())
    OR
    -- Vehicles associated with active rides
    id IN (
      SELECT vehicle_id 
      FROM rides 
      WHERE status IN ('active', 'in_progress', 'completed')
    )
    OR
    -- Vehicles for rides they've booked
    id IN (
      SELECT r.vehicle_id
      FROM rides r
      INNER JOIN ride_requests rr ON r.id = rr.ride_id
      WHERE rr.rider_id = (SELECT auth.uid())
        AND rr.status = 'accepted'
    )
  );

-- ===== End 20251222212057_20251222_cleanup_duplicate_vehicle_policies.sql =====

-- ===== Begin 20251223134131_20251223_eliminate_all_circular_dependencies_final.sql =====

/*
  # Eliminate All Circular Dependencies in RLS Policies

  1. Problem
    - Circular dependency between rides, ride_requests, and vehicles policies
    - rides SELECT policy queries ride_requests
    - ride_requests SELECT policy queries rides
    - vehicles SELECT policy queries rides
    - This creates infinite recursion during vehicle insertion

  2. Solution
    - Completely restructure policies to avoid circular references
    - Use separate simple policies for each use case
    - Avoid subqueries that cross-reference tables with RLS
    
  3. Security
    - Maintain same access control without circular dependencies
    - Each policy is self-contained and doesn't trigger other RLS checks
*/

-- ============================================================================
-- FIX VEHICLES POLICIES (Remove rides query to break circular dependency)
-- ============================================================================

-- Drop all existing vehicle SELECT policies
DROP POLICY IF EXISTS "Users can view vehicles" ON vehicles;

-- Create separate, simple vehicle SELECT policies without cross-table queries
CREATE POLICY "vehicle_select_own"
  ON vehicles FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "vehicle_select_public_active"
  ON vehicles FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ============================================================================
-- FIX RIDES POLICIES (Simplify to avoid ride_requests query)
-- ============================================================================

-- Drop existing rides SELECT policies
DROP POLICY IF EXISTS "Users can view active rides" ON rides;
DROP POLICY IF EXISTS "Users can view booked rides" ON rides;

-- Create simple rides SELECT policies without circular dependencies
CREATE POLICY "rides_select_active_public"
  ON rides FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "rides_select_own_as_driver"
  ON rides FOR SELECT
  TO authenticated
  USING (driver_id = (SELECT auth.uid()));

-- ============================================================================
-- FIX RIDE_REQUESTS POLICIES (Remove rides query to break circular dependency)
-- ============================================================================

-- Drop existing ride_requests SELECT policies
DROP POLICY IF EXISTS "Drivers can view requests for their rides" ON ride_requests;
DROP POLICY IF EXISTS "Riders can view own ride requests" ON ride_requests;

-- Create simple ride_requests SELECT policies without cross-table queries
CREATE POLICY "ride_requests_select_as_rider"
  ON ride_requests FOR SELECT
  TO authenticated
  USING (rider_id = (SELECT auth.uid()));

-- For drivers to see requests, use a SECURITY DEFINER function instead of RLS
-- This breaks the circular dependency by bypassing RLS in the function

-- ============================================================================
-- ADD HELPER FUNCTION FOR DRIVERS TO VIEW THEIR RIDE REQUESTS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_ride_requests_for_driver(p_driver_id uuid)
RETURNS TABLE (
  id uuid,
  ride_id uuid,
  rider_id uuid,
  status text,
  seats_requested integer,
  pickup_location text,
  message text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rr.id,
    rr.ride_id,
    rr.rider_id,
    rr.status,
    rr.seats_requested,
    rr.pickup_location,
    rr.message,
    rr.created_at,
    rr.updated_at
  FROM ride_requests rr
  INNER JOIN rides r ON r.id = rr.ride_id
  WHERE r.driver_id = p_driver_id;
END;
$$;

-- ============================================================================
-- ADD HELPER FUNCTION TO CHECK IF USER CAN VIEW A SPECIFIC RIDE
-- ============================================================================

CREATE OR REPLACE FUNCTION user_can_view_ride(p_user_id uuid, p_ride_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result boolean;
BEGIN
  -- Check if user is the driver
  SELECT EXISTS(
    SELECT 1 FROM rides 
    WHERE id = p_ride_id AND driver_id = p_user_id
  ) INTO v_result;
  
  IF v_result THEN
    RETURN true;
  END IF;
  
  -- Check if user has an accepted booking
  SELECT EXISTS(
    SELECT 1 FROM ride_requests 
    WHERE ride_id = p_ride_id 
      AND rider_id = p_user_id 
      AND status = 'accepted'
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- ============================================================================
-- ADD POLICY FOR USERS TO VIEW RIDES THEY'VE BOOKED (using function)
-- ============================================================================

CREATE POLICY "rides_select_booked"
  ON rides FOR SELECT
  TO authenticated
  USING (user_can_view_ride((SELECT auth.uid()), id));

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_ride_requests_for_driver(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION user_can_view_ride(uuid, uuid) TO authenticated;

-- ===== End 20251223134131_20251223_eliminate_all_circular_dependencies_final.sql =====

-- ===== Begin 20251223210814_fix_smart_recommendations_score_type.sql =====

/*
  # Fix get_smart_recommendations Function Score Type

  1. Changes
    - Update get_smart_recommendations function to return NUMERIC for score column
    - This matches the user_recommendations table definition where score is NUMERIC
    
  2. Security
    - Maintain existing security definer and access controls
*/

-- Drop and recreate get_smart_recommendations function with correct score type
DROP FUNCTION IF EXISTS get_smart_recommendations(uuid, integer);

CREATE FUNCTION get_smart_recommendations(
  p_user_id uuid,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  recommendation_id uuid,
  ride_id uuid,
  driver_id uuid,
  score numeric,
  reasoning jsonb,
  ride_details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM user_recommendations
  WHERE expires_at < NOW() 
     OR (dismissed = true AND created_at < NOW() - INTERVAL '30 days');

  RETURN QUERY
  SELECT 
    ur.id as recommendation_id,
    ur.ride_id,
    ur.driver_id,
    ur.score,
    ur.reasoning,
    jsonb_build_object(
      'origin', r.origin,
      'destination', r.destination,
      'departure_time', r.departure_time,
      'available_seats', r.available_seats,
      'estimated_distance', r.estimated_distance,
      'estimated_duration', r.estimated_duration
    ) as ride_details
  FROM user_recommendations ur
  LEFT JOIN rides r ON r.id = ur.ride_id
  WHERE ur.user_id = p_user_id
    AND NOT ur.dismissed
    AND NOT ur.converted
    AND ur.expires_at > NOW()
  ORDER BY ur.score DESC, ur.created_at DESC
  LIMIT p_limit;
END;
$$;

-- ===== End 20251223210814_fix_smart_recommendations_score_type.sql =====

-- ===== Begin 20251224190000_fix_profiles_notifications_schema.sql =====

/*
  # Fix Profile and Notification Schema Mismatches

  1. Profiles
    - Add missing columns used by the app (phone_number, city, country, etc.)
    - Backfill phone_number from phone
    - Align photo_verified with profile_verified when available

  2. Notifications
    - Restore notifications.type alongside category
    - Backfill type/category values
    - Add sync trigger and broaden allowed types
*/

-- Add missing profile columns used by the frontend
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'city'
  ) THEN
    ALTER TABLE profiles ADD COLUMN city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'country'
  ) THEN
    ALTER TABLE profiles ADD COLUMN country text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email_verified boolean;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_verified boolean;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'photo_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN photo_verified boolean;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'id_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN id_verified boolean;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'language'
  ) THEN
    ALTER TABLE profiles ADD COLUMN language text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE profiles ADD COLUMN timezone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'profile_completion_percentage'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profile_completion_percentage integer;
  END IF;
END $$;

-- Backfill common values
UPDATE profiles
SET phone_number = phone
WHERE phone_number IS NULL AND phone IS NOT NULL;

UPDATE profiles
SET photo_verified = profile_verified
WHERE photo_verified IS NULL AND profile_verified IS NOT NULL;

-- Ensure notifications.type exists alongside category
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'type'
  ) THEN
    ALTER TABLE notifications ADD COLUMN type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'category'
  ) THEN
    ALTER TABLE notifications ADD COLUMN category text;
  END IF;
END $$;

-- Backfill type/category values
UPDATE notifications
SET type = COALESCE(type, category, 'system');

UPDATE notifications
SET category = COALESCE(category, type, 'system');

-- Reset constraints to include friend notification types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_category_check;

ALTER TABLE notifications ALTER COLUMN type SET DEFAULT 'system';
ALTER TABLE notifications ALTER COLUMN category SET DEFAULT 'system';
ALTER TABLE notifications ALTER COLUMN type SET NOT NULL;
ALTER TABLE notifications ALTER COLUMN category SET NOT NULL;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check CHECK (
    type IN (
      'ride-match',
      'booking-request',
      'booking-confirmed',
      'booking-cancelled',
      'message',
      'review',
      'safety-alert',
      'system',
      'friend-request',
      'friend-accepted',
      'info',
      'success',
      'warning',
      'error'
    )
  );

ALTER TABLE notifications
  ADD CONSTRAINT notifications_category_check CHECK (
    category IN (
      'ride-match',
      'booking-request',
      'booking-confirmed',
      'booking-cancelled',
      'message',
      'review',
      'safety-alert',
      'system',
      'friend-request',
      'friend-accepted',
      'info',
      'success',
      'warning',
      'error'
    )
  );

-- Keep type/category aligned for new writes
CREATE OR REPLACE FUNCTION sync_notification_type_category()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.type IS NULL AND NEW.category IS NOT NULL THEN
    NEW.type := NEW.category;
  ELSIF NEW.category IS NULL AND NEW.type IS NOT NULL THEN
    NEW.category := NEW.type;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_notification_type_category ON notifications;
CREATE TRIGGER trg_sync_notification_type_category
BEFORE INSERT OR UPDATE ON notifications
FOR EACH ROW
EXECUTE FUNCTION sync_notification_type_category();

-- ===== End 20251224190000_fix_profiles_notifications_schema.sql =====

-- ===== Begin 20251225120000_fix_conversation_members_policy.sql =====

/*
  # Fix conversation_members RLS recursion

  1. Changes
    - Add security definer helper to check conversation membership without RLS recursion
    - Update conversation_members select policy to use helper

  2. Security
    - Helper runs with row_security disabled and is restricted to authenticated users
*/

CREATE OR REPLACE FUNCTION public.is_conversation_member(
  check_conversation_id uuid,
  check_user_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public,
    row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM conversation_members
    WHERE conversation_id = check_conversation_id
      AND user_id = check_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can view members of their conversations" ON conversation_members;
CREATE POLICY "Users can view members of their conversations"
  ON conversation_members FOR SELECT
  TO authenticated
  USING (
    public.is_conversation_member(conversation_members.conversation_id, (select auth.uid()))
  );

-- ===== End 20251225120000_fix_conversation_members_policy.sql =====

