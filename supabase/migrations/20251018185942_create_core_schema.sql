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