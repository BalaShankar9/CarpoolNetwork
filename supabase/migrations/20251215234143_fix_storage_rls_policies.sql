-- Fix Storage RLS Policies for Photo Uploads
-- Drop all conflicting storage policies for user-media bucket
DROP POLICY IF EXISTS "Users can upload own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own profile photo" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can read photos of connected users" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile photo" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile photo" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Profile photos are publicly accessible" ON storage.objects;

-- Create clean, simple policies for user-media bucket
-- Allow authenticated users to upload to their own folder
CREATE POLICY "auth_upload_own_folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-media' AND
    name LIKE 'users/' || auth.uid()::text || '/%'
  );

-- Allow users to read their own files
CREATE POLICY "auth_read_own_files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-media' AND
    name LIKE 'users/' || auth.uid()::text || '/%'
  );

-- Allow users to update/delete their own files
CREATE POLICY "auth_update_own_files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'user-media' AND
    name LIKE 'users/' || auth.uid()::text || '/%'
  )
  WITH CHECK (
    bucket_id = 'user-media' AND
    name LIKE 'users/' || auth.uid()::text || '/%'
  );

CREATE POLICY "auth_delete_own_files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-media' AND
    name LIKE 'users/' || auth.uid()::text || '/%'
  );

-- Clean up vehicle-images bucket policies
DROP POLICY IF EXISTS "Users can upload vehicle images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update vehicle images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete vehicle images" ON storage.objects;
DROP POLICY IF EXISTS "Vehicle photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public can view vehicle images" ON storage.objects;

-- Vehicle images bucket - allow authenticated uploads, public reads
CREATE POLICY "vehicle_auth_upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vehicle-images'
  );

CREATE POLICY "vehicle_public_read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'vehicle-images');

CREATE POLICY "vehicle_auth_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'vehicle-images')
  WITH CHECK (bucket_id = 'vehicle-images');

CREATE POLICY "vehicle_auth_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'vehicle-images');
