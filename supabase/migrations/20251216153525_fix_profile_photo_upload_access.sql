/*
  # Fix Profile Photo Upload Access

  1. Changes
    - Add public read access for user profile photos
    - Keep upload restricted to authenticated users for their own files
    - Ensure proper permissions for profile photo display across the app

  2. Security
    - Users can only upload to their own folder
    - Everyone can read profile photos (needed for social features)
    - Users can only update/delete their own files
*/

-- Add public read policy for user-media bucket (needed for profile photos)
CREATE POLICY "public_read_user_media"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'user-media');
