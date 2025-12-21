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
