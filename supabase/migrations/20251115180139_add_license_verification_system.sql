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
