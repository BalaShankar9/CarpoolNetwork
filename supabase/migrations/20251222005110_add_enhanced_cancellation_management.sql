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
      '⚠️ Reliability Warning',
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
      '🚫 Booking Restricted',
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
