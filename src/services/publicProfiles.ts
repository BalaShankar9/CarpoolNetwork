import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

export type PublicProfile = Database['public']['Views']['profile_public_v']['Row'];

// Fields to select when falling back to profiles table (public-safe fields only)
const PUBLIC_PROFILE_FIELDS = `
  id,
  full_name,
  avatar_url,
  profile_photo_url,
  created_at,
  country,
  city,
  bio,
  trust_score,
  average_rating,
  reliability_score,
  total_rides_offered,
  total_rides_taken,
  profile_verified
`;

export async function fetchPublicProfilesByIds(ids: string[]): Promise<Record<string, PublicProfile>> {
  const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
  if (uniqueIds.length === 0) return {};

  try {
    const { data, error } = await supabase
      .from('profile_public_v')
      .select('*')
      .in('id', uniqueIds);

    if (error) {
      // If view doesn't exist, fallback to profiles table with limited fields
      if (error.message?.includes('schema cache') || error.code === 'PGRST204' || error.code === '42P01') {
        console.warn('[publicProfiles] profile_public_v view not available, using fallback');
        return fetchPublicProfilesByIdsFallback(uniqueIds);
      }
      throw error;
    }

    return (data || []).reduce<Record<string, PublicProfile>>((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {});
  } catch (err: any) {
    // Catch schema cache errors at runtime
    if (err?.message?.includes('schema cache') || err?.code === 'PGRST204') {
      console.warn('[publicProfiles] profile_public_v view error, using fallback');
      return fetchPublicProfilesByIdsFallback(uniqueIds);
    }
    throw err;
  }
}

async function fetchPublicProfilesByIdsFallback(ids: string[]): Promise<Record<string, PublicProfile>> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PUBLIC_PROFILE_FIELDS)
    .in('id', ids);

  if (error) throw error;

  return (data || []).reduce<Record<string, any>>((acc, profile) => {
    acc[profile.id] = profile;
    return acc;
  }, {});
}

export async function fetchPublicProfileById(id: string): Promise<PublicProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profile_public_v')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      // If view doesn't exist, fallback to profiles table
      if (error.message?.includes('schema cache') || error.code === 'PGRST204' || error.code === '42P01') {
        console.warn('[publicProfiles] profile_public_v view not available, using fallback');
        return fetchPublicProfileByIdFallback(id);
      }
      throw error;
    }
    return data || null;
  } catch (err: any) {
    if (err?.message?.includes('schema cache') || err?.code === 'PGRST204') {
      console.warn('[publicProfiles] profile_public_v view error, using fallback');
      return fetchPublicProfileByIdFallback(id);
    }
    throw err;
  }
}

async function fetchPublicProfileByIdFallback(id: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PUBLIC_PROFILE_FIELDS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as PublicProfile || null;
}
