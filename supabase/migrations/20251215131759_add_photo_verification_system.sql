/*
  # Photo Verification System

  1. Profile Photo Requirements
    - Add `profile_photo_url` field to profiles table
    - Add `profile_verified` boolean flag (default false)
    - Add `profile_verification_date` timestamp

  2. Vehicle Photo Requirements
    - Add `vehicle_photo_url` field to vehicles table
    - Add `plate_verified` boolean flag (default false)
    - Add `plate_verification_date` timestamp
    - Add `extracted_plate_text` field for OCR results

  3. Security
    - Update RLS policies to allow users to update their own photos
    - Add verification status visibility

  4. Important Notes
    - Profile photo mandatory before posting/requesting rides (enforced in app)
    - Vehicle photo mandatory before posting rides (enforced in app)
    - Face detection performed client-side before upload
    - Plate OCR performed via edge function after upload
*/

-- Add profile photo fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'profile_photo_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profile_photo_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'profile_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profile_verified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'profile_verification_date'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profile_verification_date timestamptz;
  END IF;
END $$;

-- Add vehicle photo fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'vehicle_photo_url'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN vehicle_photo_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'plate_verified'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN plate_verified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'plate_verification_date'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN plate_verification_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'extracted_plate_text'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN extracted_plate_text text;
  END IF;
END $$;

-- Create storage bucket for profile photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for vehicle photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-photos', 'vehicle-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for profile photos bucket
DROP POLICY IF EXISTS "Users can upload their own profile photo" ON storage.objects;
CREATE POLICY "Users can upload their own profile photo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update their own profile photo" ON storage.objects;
CREATE POLICY "Users can update their own profile photo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Profile photos are publicly accessible" ON storage.objects;
CREATE POLICY "Profile photos are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-photos');

DROP POLICY IF EXISTS "Users can delete their own profile photo" ON storage.objects;
CREATE POLICY "Users can delete their own profile photo"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policies for vehicle photos bucket
DROP POLICY IF EXISTS "Users can upload their vehicle photos" ON storage.objects;
CREATE POLICY "Users can upload their vehicle photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vehicle-photos' AND
  EXISTS (
    SELECT 1 FROM vehicles
    WHERE vehicles.user_id = auth.uid()
    AND vehicles.id::text = (storage.foldername(name))[1]
  )
);

DROP POLICY IF EXISTS "Users can update their vehicle photos" ON storage.objects;
CREATE POLICY "Users can update their vehicle photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'vehicle-photos' AND
  EXISTS (
    SELECT 1 FROM vehicles
    WHERE vehicles.user_id = auth.uid()
    AND vehicles.id::text = (storage.foldername(name))[1]
  )
);

DROP POLICY IF EXISTS "Vehicle photos are publicly accessible" ON storage.objects;
CREATE POLICY "Vehicle photos are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'vehicle-photos');

DROP POLICY IF EXISTS "Users can delete their vehicle photos" ON storage.objects;
CREATE POLICY "Users can delete their vehicle photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'vehicle-photos' AND
  EXISTS (
    SELECT 1 FROM vehicles
    WHERE vehicles.user_id = auth.uid()
    AND vehicles.id::text = (storage.foldername(name))[1]
  )
);

-- Function to verify profile photo (called by edge function after face detection)
CREATE OR REPLACE FUNCTION verify_profile_photo(
  p_user_id uuid,
  p_photo_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET
    profile_photo_url = p_photo_url,
    profile_verified = true,
    profile_verification_date = now()
  WHERE id = p_user_id;
END;
$$;

-- Function to verify vehicle plate (called by edge function after OCR)
CREATE OR REPLACE FUNCTION verify_vehicle_plate(
  p_vehicle_id uuid,
  p_photo_url text,
  p_extracted_text text,
  p_verified boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE vehicles
  SET
    vehicle_photo_url = p_photo_url,
    extracted_plate_text = p_extracted_text,
    plate_verified = p_verified,
    plate_verification_date = CASE WHEN p_verified THEN now() ELSE NULL END
  WHERE id = p_vehicle_id;
END;
$$;

-- Add comment on profiles table
COMMENT ON COLUMN profiles.profile_photo_url IS 'URL to user profile photo (face photo required)';
COMMENT ON COLUMN profiles.profile_verified IS 'Whether profile photo has been verified to contain a face';
COMMENT ON COLUMN profiles.profile_verification_date IS 'When profile photo was verified';

-- Add comment on vehicles table
COMMENT ON COLUMN vehicles.vehicle_photo_url IS 'URL to vehicle front photo (plate must be visible)';
COMMENT ON COLUMN vehicles.plate_verified IS 'Whether vehicle plate has been verified via OCR';
COMMENT ON COLUMN vehicles.extracted_plate_text IS 'Plate text extracted via OCR for verification';
COMMENT ON COLUMN vehicles.plate_verification_date IS 'When vehicle plate was verified';
