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
