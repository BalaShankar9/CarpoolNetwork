/*
  # Add Vehicle Image and Engine Capacity Fields

  ## Changes
  1. Add `engine_capacity` column to vehicles table
     - Type: integer (stores engine capacity in cc)
     - Nullable: true (optional field)
  
  2. Add `image_url` column to vehicles table
     - Type: text (stores URL to vehicle image)
     - Nullable: true (optional field)

  ## Purpose
  These fields enhance vehicle information display by storing:
  - Engine capacity from DVLA API lookups
  - Vehicle images from external image APIs
*/

-- Add engine_capacity column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'engine_capacity'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN engine_capacity integer;
  END IF;
END $$;

-- Add image_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN image_url text;
  END IF;
END $$;