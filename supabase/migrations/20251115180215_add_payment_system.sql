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
