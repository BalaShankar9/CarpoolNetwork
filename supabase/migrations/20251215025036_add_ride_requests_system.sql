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