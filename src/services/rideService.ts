import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type DbClient = SupabaseClient<Database>;

export async function deleteRideForDriver(
  rideId: string,
  client: DbClient = supabase
) {
  if (!rideId) {
    return { data: null, error: new Error('Missing ride id') };
  }

  return client.rpc('delete_ride_for_driver', { p_ride_id: rideId });
}

export async function syncExpiredRideState(client: DbClient = supabase) {
  return client.rpc('sync_expired_ride_state');
}
