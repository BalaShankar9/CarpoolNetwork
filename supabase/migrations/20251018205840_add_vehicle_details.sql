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
