/*
  # Create Vehicle Images Storage Bucket

  1. Storage Setup
    - Create public bucket `vehicle-images` for storing vehicle photos
    - Set up RLS policies to allow authenticated users to upload their vehicle images
    - Allow public read access to vehicle images

  2. Security
    - Users can only upload images for their own vehicles
    - Public can view all vehicle images
    - Maximum file size: 5MB
    - Allowed file types: images only
*/

-- Create the storage bucket for vehicle images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicle-images',
  'vehicle-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload vehicle images
CREATE POLICY "Users can upload vehicle images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vehicle-images' AND
  (storage.foldername(name))[1] = 'vehicles'
);

-- Allow authenticated users to update their own vehicle images
CREATE POLICY "Users can update vehicle images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'vehicle-images')
WITH CHECK (bucket_id = 'vehicle-images');

-- Allow authenticated users to delete their own vehicle images
CREATE POLICY "Users can delete vehicle images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vehicle-images');

-- Allow public read access to all vehicle images
CREATE POLICY "Public can view vehicle images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'vehicle-images');