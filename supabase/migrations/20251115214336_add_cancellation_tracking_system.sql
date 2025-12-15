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
