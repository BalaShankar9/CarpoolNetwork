import { supabase } from '../lib/supabase';
import { compressProfilePhoto, compressVehiclePhoto } from './imageCompression';

interface UploadResult {
  optimizedPath: string;
  thumbnailPath: string;
  optimizedUrl?: string;
  thumbnailUrl?: string;
}

const BUCKET_NAME = 'user-media';

export async function uploadProfilePhoto(
  userId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  try {
    onProgress?.(10);

    const { optimized, thumbnail } = await compressProfilePhoto(file);
    onProgress?.(60);

    const optimizedPath = `users/${userId}/profile.webp`;
    const thumbnailPath = `users/${userId}/profile_thumb.webp`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(optimizedPath, optimized.file, {
        upsert: true,
        contentType: optimized.file.type,
      });

    if (uploadError) throw uploadError;

    onProgress?.(80);

    const { error: thumbError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(thumbnailPath, thumbnail.file, {
        upsert: true,
        contentType: thumbnail.file.type,
      });

    if (thumbError) throw thumbError;

    onProgress?.(100);

    return {
      optimizedPath,
      thumbnailPath,
    };
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    throw error;
  }
}

export async function uploadVehiclePhoto(
  userId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  try {
    onProgress?.(10);

    const { optimized, thumbnail } = await compressVehiclePhoto(file);
    onProgress?.(60);

    const optimizedPath = `users/${userId}/vehicle_front.webp`;
    const thumbnailPath = `users/${userId}/vehicle_front_thumb.webp`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(optimizedPath, optimized.file, {
        upsert: true,
        contentType: optimized.file.type,
      });

    if (uploadError) throw uploadError;

    onProgress?.(80);

    const { error: thumbError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(thumbnailPath, thumbnail.file, {
        upsert: true,
        contentType: thumbnail.file.type,
      });

    if (thumbError) throw thumbError;

    onProgress?.(100);

    return {
      optimizedPath,
      thumbnailPath,
    };
  } catch (error) {
    console.error('Error uploading vehicle photo:', error);
    throw error;
  }
}

export async function getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

export async function getPublicUrl(path: string): Promise<string> {
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  return data.publicUrl;
}

export async function deletePhoto(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);
  if (error) throw error;
}
