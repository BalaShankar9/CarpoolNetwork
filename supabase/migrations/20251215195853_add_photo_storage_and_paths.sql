/*
  # Add Photo Storage and Database Paths

  ## Changes
  
  1. Storage Bucket
    - Creates `user-media` bucket for profile and vehicle photos
    - Private bucket with authenticated access only
    - Allows image uploads (jpg, jpeg, png, webp)
    - Max file size 10MB
  
  2. Profile Photo Fields
    - `profile_photo_path` - Path to optimized profile photo
    - `profile_photo_thumb_path` - Path to profile thumbnail
  
  3. Vehicle Photo Fields  
    - `vehicle_front_photo_path` - Path to optimized vehicle front photo
    - `vehicle_front_photo_thumb_path` - Path to vehicle front thumbnail
    - `vehicle_verified` - Boolean flag for admin verification
    - `plate_ocr_text` - Extracted plate text (optional)
    - `plate_verified_at` - Timestamp of plate verification
  
  4. Storage Policies
    - Users can upload to their own folder
    - Users can read their own photos
    - Users can read photos of drivers/passengers they're connected with
    - Users can update/delete their own photos
  
  5. Security
    - All photo paths are stored as text (not blobs)
    - Private bucket requires signed URLs for access
    - RLS policies ensure users only access authorized photos
*/

-- Create user-media storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-media',
  'user-media',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Add photo path fields to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'profile_photo_path'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profile_photo_path text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'profile_photo_thumb_path'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profile_photo_thumb_path text;
  END IF;
END $$;

-- Add photo path and verification fields to vehicles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'vehicle_front_photo_path'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN vehicle_front_photo_path text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'vehicle_front_photo_thumb_path'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN vehicle_front_photo_thumb_path text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'vehicle_verified'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN vehicle_verified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'plate_ocr_text'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN plate_ocr_text text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'plate_verified_at'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN plate_verified_at timestamptz;
  END IF;
END $$;

-- Storage RLS Policies

-- Users can upload to their own folder
CREATE POLICY "Users can upload own photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-media' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Users can read their own photos
CREATE POLICY "Users can read own photos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-media' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Users can read photos of people they have bookings with
CREATE POLICY "Users can read photos of connected users"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-media' AND
    (storage.foldername(name))[1] = 'users' AND
    EXISTS (
      SELECT 1 FROM ride_bookings b
      JOIN rides r ON b.ride_id = r.id
      WHERE (
        (r.driver_id = auth.uid() AND b.passenger_id::text = (storage.foldername(name))[2]) OR
        (b.passenger_id = auth.uid() AND r.driver_id::text = (storage.foldername(name))[2])
      )
      AND b.status IN ('confirmed', 'completed')
    )
  );

-- Users can update their own photos
CREATE POLICY "Users can update own photos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'user-media' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'user-media' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Users can delete their own photos
CREATE POLICY "Users can delete own photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-media' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );
