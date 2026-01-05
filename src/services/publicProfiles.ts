import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

export type PublicProfile = Database['public']['Views']['profile_public_v']['Row'];

export async function fetchPublicProfilesByIds(ids: string[]): Promise<Record<string, PublicProfile>> {
  const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
  if (uniqueIds.length === 0) return {};

  const { data, error } = await supabase
    .from('profile_public_v')
    .select('*')
    .in('id', uniqueIds);

  if (error) throw error;

  return (data || []).reduce<Record<string, PublicProfile>>((acc, profile) => {
    acc[profile.id] = profile;
    return acc;
  }, {});
}

export async function fetchPublicProfileById(id: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from('profile_public_v')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}
