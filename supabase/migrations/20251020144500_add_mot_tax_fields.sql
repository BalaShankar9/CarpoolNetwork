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
