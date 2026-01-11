import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

export type VehicleRow = Database['public']['Tables']['vehicles']['Row'];
type DbClient = SupabaseClient<Database>;

type GetVehiclesOptions = {
  activeOnly?: boolean;
};

export async function getUserVehicles(
  userId: string,
  options: GetVehiclesOptions = {},
  client: DbClient = supabase
): Promise<{ data: VehicleRow[]; error: Error | null }> {
  if (!userId) {
    return { data: [], error: new Error('Missing user id') };
  }

  if (import.meta.env.DEV) {
    console.log('[DEV] getUserVehicles', { userId, activeOnly: options.activeOnly ?? false });
  }

  let query = client
    .from('vehicles')
    .select('*')
    .eq('user_id', userId);

  if (options.activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (import.meta.env.DEV) {
    console.log('[DEV] getUserVehicles result', {
      userId,
      count: data?.length ?? 0,
      error: error?.message ?? null,
    });
  }

  return { data: data ?? [], error: error as Error | null };
}

export async function deactivateVehicle(
  vehicleId: string,
  client: DbClient = supabase
) {
  if (!vehicleId) {
    return { data: null, error: new Error('Missing vehicle id') };
  }

  return client.rpc('deactivate_vehicle', { p_vehicle_id: vehicleId });
}
