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

    console.log('Uploading profile photo to path:', optimizedPath);
    const { data: uploadedData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(optimizedPath, optimized.file, {
        upsert: true,
        contentType: 'image/webp',
      });

    if (uploadError) {
      console.error('Profile photo upload error:', uploadError);
      throw new Error(uploadError.message || 'Failed to upload profile photo');
    }

    console.log('Profile photo uploaded successfully:', uploadedData);
    onProgress?.(80);

    const { data: thumbData, error: thumbError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(thumbnailPath, thumbnail.file, {
        upsert: true,
        contentType: 'image/webp',
      });

    if (thumbError) {
      console.error('Profile thumbnail upload error:', thumbError);
      throw new Error(thumbError.message || 'Failed to upload profile thumbnail');
    }

    console.log('Profile thumbnail uploaded successfully:', thumbData);
    onProgress?.(90);

    const optimizedUrl = await getPublicUrl(optimizedPath);
    const thumbnailUrl = await getPublicUrl(thumbnailPath);

    console.log('Generated URLs:', { optimizedUrl, thumbnailUrl });
    onProgress?.(100);

    return {
      optimizedPath,
      thumbnailPath,
      optimizedUrl,
      thumbnailUrl,
    };
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    throw error;
  }
}

export async function uploadVehiclePhoto(
  userId: string,
  vehicleId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  try {
    onProgress?.(10);

    const { optimized, thumbnail } = await compressVehiclePhoto(file);
    onProgress?.(60);

    const optimizedPath = `vehicles/${userId}/${vehicleId}/front.webp`;
    const thumbnailPath = `vehicles/${userId}/${vehicleId}/front_thumb.webp`;

    console.log('Uploading vehicle photo to path:', optimizedPath, { userId, vehicleId });
    const { data: uploadedData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(optimizedPath, optimized.file, {
        upsert: true,
        contentType: 'image/webp',
      });

    if (uploadError) {
      console.error('Vehicle photo upload error:', uploadError);
      throw new Error(uploadError.message || 'Failed to upload vehicle photo');
    }

    console.log('Vehicle photo uploaded successfully:', uploadedData);
    onProgress?.(80);

    const { data: thumbData, error: thumbError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(thumbnailPath, thumbnail.file, {
        upsert: true,
        contentType: 'image/webp',
      });

    if (thumbError) {
      console.error('Vehicle thumbnail upload error:', thumbError);
      throw new Error(thumbError.message || 'Failed to upload vehicle thumbnail');
    }

    console.log('Vehicle thumbnail uploaded successfully:', thumbData);
    onProgress?.(90);

    const optimizedUrl = await getPublicUrl(optimizedPath);
    const thumbnailUrl = await getPublicUrl(thumbnailPath);

    console.log('Generated URLs:', { optimizedUrl, thumbnailUrl });
    onProgress?.(100);

    return {
      optimizedPath,
      thumbnailPath,
      optimizedUrl,
      thumbnailUrl,
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

/**
 * Helper to convert a storage path to a public URL
 * Use this when you have a path saved in the database and need to display it
 */
export function getPublicUrlSync(path: string): string {
  if (!path) return '';

  // If it's already a full URL, return it
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  return data.publicUrl;
}
