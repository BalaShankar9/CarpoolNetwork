import { supabase } from '../lib/supabase';

export interface CarpoolPool {
    id: string;
    name: string;
    description?: string;
    origin_area: string;
    destination_area: string;
    schedule_type: 'daily' | 'weekdays' | 'custom';
    preferred_time?: string;
    preferred_days?: string[];
    max_members: number;
    is_private: boolean;
    invite_code?: string;
    created_by: string;
    created_at: string;
    member_count?: number;
    creator?: {
        id: string;
        full_name: string;
        avatar_url?: string;
        profile_photo_url?: string;
    };
}

export interface PoolMember {
    id: string;
    pool_id: string;
    user_id: string;
    role: 'admin' | 'member';
    is_driver: boolean;
    joined_at: string;
    user?: {
        id: string;
        full_name: string;
        avatar_url?: string;
        profile_photo_url?: string;
        average_rating?: number;
    };
}

export interface PoolScheduleSlot {
    id: string;
    pool_id: string;
    day_of_week: number; // 0-6
    departure_time: string;
    driver_id?: string;
    is_recurring: boolean;
    created_at: string;
}

export interface PoolRide {
    id: string;
    pool_id: string;
    ride_id: string;
    scheduled_for: string;
    driver_id: string;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    created_at: string;
}

// ============ POOL CRUD ============

/**
 * Get all pools a user is a member of
 */
export async function getUserPools(userId: string): Promise<CarpoolPool[]> {
    const { data, error } = await supabase
        .from('carpool_pool_members')
        .select(`
      pool:carpool_pools(
        *,
        creator:profiles!carpool_pools_created_by_fkey(
          id,
          full_name,
          avatar_url,
          profile_photo_url
        )
      )
    `)
        .eq('user_id', userId);

    if (error) throw error;
    return (data?.map(d => d.pool).filter(Boolean) || []) as unknown as CarpoolPool[];
}

/**
 * Search for public pools
 */
export async function searchPools(
    originArea?: string,
    destinationArea?: string
): Promise<CarpoolPool[]> {
    let query = supabase
        .from('carpool_pools')
        .select(`
      *,
      creator:profiles!carpool_pools_created_by_fkey(
        id,
        full_name,
        avatar_url,
        profile_photo_url
      ),
      member_count:carpool_pool_members(count)
    `)
        .eq('is_private', false);

    if (originArea) {
        query = query.ilike('origin_area', `%${originArea}%`);
    }

    if (destinationArea) {
        query = query.ilike('destination_area', `%${destinationArea}%`);
    }

    const { data, error } = await query.limit(20);

    if (error) throw error;
    return data || [];
}

/**
 * Create a new carpool pool
 */
export async function createPool(
    userId: string,
    pool: Omit<CarpoolPool, 'id' | 'created_by' | 'created_at' | 'invite_code'>
): Promise<CarpoolPool> {
    // Generate invite code for private pools
    const inviteCode = pool.is_private ? generateInviteCode() : undefined;

    const { data, error } = await supabase
        .from('carpool_pools')
        .insert({
            ...pool,
            created_by: userId,
            invite_code: inviteCode,
        })
        .select()
        .single();

    if (error) throw error;

    // Add creator as admin member
    await supabase.from('carpool_pool_members').insert({
        pool_id: data.id,
        user_id: userId,
        role: 'admin',
        is_driver: true, // Assume creator can drive
    });

    return data;
}

/**
 * Update a pool
 */
export async function updatePool(
    poolId: string,
    updates: Partial<Omit<CarpoolPool, 'id' | 'created_by' | 'created_at'>>
): Promise<CarpoolPool> {
    const { data, error } = await supabase
        .from('carpool_pools')
        .update(updates)
        .eq('id', poolId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Delete a pool
 */
export async function deletePool(poolId: string): Promise<void> {
    const { error } = await supabase
        .from('carpool_pools')
        .delete()
        .eq('id', poolId);

    if (error) throw error;
}

/**
 * Get pool details with members
 */
export async function getPoolDetails(poolId: string): Promise<{
    pool: CarpoolPool;
    members: PoolMember[];
} | null> {
    const { data: pool, error: poolError } = await supabase
        .from('carpool_pools')
        .select(`
      *,
      creator:profiles!carpool_pools_created_by_fkey(
        id,
        full_name,
        avatar_url,
        profile_photo_url
      )
    `)
        .eq('id', poolId)
        .single();

    if (poolError || !pool) return null;

    const { data: members, error: membersError } = await supabase
        .from('carpool_pool_members')
        .select(`
      *,
      user:profiles!carpool_pool_members_user_id_fkey(
        id,
        full_name,
        avatar_url,
        profile_photo_url,
        average_rating
      )
    `)
        .eq('pool_id', poolId);

    if (membersError) throw membersError;

    return {
        pool,
        members: members || [],
    };
}

// ============ MEMBERSHIP ============

/**
 * Join a public pool or via invite code
 */
export async function joinPool(
    poolId: string,
    userId: string,
    inviteCode?: string,
    isDriver: boolean = false
): Promise<PoolMember> {
    // Get pool to check if public or verify invite code
    const { data: pool } = await supabase
        .from('carpool_pools')
        .select('is_private, invite_code, max_members')
        .eq('id', poolId)
        .single();

    if (!pool) {
        throw new Error('Pool not found');
    }

    if (pool.is_private && pool.invite_code !== inviteCode) {
        throw new Error('Invalid invite code');
    }

    // Check member count
    const { count } = await supabase
        .from('carpool_pool_members')
        .select('*', { count: 'exact', head: true })
        .eq('pool_id', poolId);

    if (count && count >= pool.max_members) {
        throw new Error('Pool is full');
    }

    // Check if already a member
    const { data: existing } = await supabase
        .from('carpool_pool_members')
        .select('id')
        .eq('pool_id', poolId)
        .eq('user_id', userId)
        .single();

    if (existing) {
        throw new Error('Already a member of this pool');
    }

    const { data, error } = await supabase
        .from('carpool_pool_members')
        .insert({
            pool_id: poolId,
            user_id: userId,
            role: 'member',
            is_driver: isDriver,
        })
        .select(`
      *,
      user:profiles!carpool_pool_members_user_id_fkey(
        id,
        full_name,
        avatar_url,
        profile_photo_url,
        average_rating
      )
    `)
        .single();

    if (error) throw error;
    return data;
}

/**
 * Join pool by invite code
 */
export async function joinPoolByCode(
    inviteCode: string,
    userId: string,
    isDriver: boolean = false
): Promise<{ pool: CarpoolPool; membership: PoolMember }> {
    const { data: pool, error: poolError } = await supabase
        .from('carpool_pools')
        .select('*')
        .eq('invite_code', inviteCode)
        .single();

    if (poolError || !pool) {
        throw new Error('Invalid invite code');
    }

    const membership = await joinPool(pool.id, userId, inviteCode, isDriver);
    return { pool, membership };
}

/**
 * Leave a pool
 */
export async function leavePool(poolId: string, userId: string): Promise<void> {
    // Check if user is the only admin
    const { data: members } = await supabase
        .from('carpool_pool_members')
        .select('role')
        .eq('pool_id', poolId);

    const admins = members?.filter(m => m.role === 'admin') || [];
    const { data: membership } = await supabase
        .from('carpool_pool_members')
        .select('role')
        .eq('pool_id', poolId)
        .eq('user_id', userId)
        .single();

    if (membership?.role === 'admin' && admins.length === 1) {
        throw new Error('Cannot leave pool as the only admin. Transfer ownership or delete the pool.');
    }

    const { error } = await supabase
        .from('carpool_pool_members')
        .delete()
        .eq('pool_id', poolId)
        .eq('user_id', userId);

    if (error) throw error;
}

/**
 * Update member role
 */
export async function updateMemberRole(
    poolId: string,
    userId: string,
    role: 'admin' | 'member'
): Promise<void> {
    const { error } = await supabase
        .from('carpool_pool_members')
        .update({ role })
        .eq('pool_id', poolId)
        .eq('user_id', userId);

    if (error) throw error;
}

/**
 * Update driver status
 */
export async function updateDriverStatus(
    poolId: string,
    userId: string,
    isDriver: boolean
): Promise<void> {
    const { error } = await supabase
        .from('carpool_pool_members')
        .update({ is_driver: isDriver })
        .eq('pool_id', poolId)
        .eq('user_id', userId);

    if (error) throw error;
}

/**
 * Remove a member (admin only)
 */
export async function removeMember(poolId: string, userId: string): Promise<void> {
    const { error } = await supabase
        .from('carpool_pool_members')
        .delete()
        .eq('pool_id', poolId)
        .eq('user_id', userId);

    if (error) throw error;
}

// ============ SCHEDULE ============

/**
 * Get pool schedule
 */
export async function getPoolSchedule(poolId: string): Promise<PoolScheduleSlot[]> {
    const { data, error } = await supabase
        .from('carpool_pool_schedule')
        .select('*')
        .eq('pool_id', poolId)
        .order('day_of_week', { ascending: true })
        .order('departure_time', { ascending: true });

    if (error) throw error;
    return data || [];
}

/**
 * Add schedule slot
 */
export async function addScheduleSlot(
    poolId: string,
    slot: Omit<PoolScheduleSlot, 'id' | 'pool_id' | 'created_at'>
): Promise<PoolScheduleSlot> {
    const { data, error } = await supabase
        .from('carpool_pool_schedule')
        .insert({
            pool_id: poolId,
            ...slot,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Assign driver to schedule slot
 */
export async function assignDriverToSlot(
    slotId: string,
    driverId: string
): Promise<void> {
    const { error } = await supabase
        .from('carpool_pool_schedule')
        .update({ driver_id: driverId })
        .eq('id', slotId);

    if (error) throw error;
}

/**
 * Remove schedule slot
 */
export async function removeScheduleSlot(slotId: string): Promise<void> {
    const { error } = await supabase
        .from('carpool_pool_schedule')
        .delete()
        .eq('id', slotId);

    if (error) throw error;
}

// ============ POOL RIDES ============

/**
 * Get upcoming pool rides
 */
export async function getPoolRides(poolId: string): Promise<PoolRide[]> {
    const { data, error } = await supabase
        .from('carpool_pool_rides')
        .select(`
      *,
      ride:rides(
        id,
        origin,
        destination,
        departure_time,
        available_seats,
        status
      )
    `)
        .eq('pool_id', poolId)
        .gte('scheduled_for', new Date().toISOString())
        .order('scheduled_for', { ascending: true });

    if (error) throw error;
    return data || [];
}

/**
 * Create a ride for the pool
 */
export async function createPoolRide(
    poolId: string,
    driverId: string,
    rideDetails: {
        origin: string;
        destination: string;
        departure_time: string;
        available_seats: number;
    }
): Promise<{ poolRide: PoolRide; ride: any }> {
    // Create the actual ride
    const { data: ride, error: rideError } = await supabase
        .from('rides')
        .insert({
            driver_id: driverId,
            origin: rideDetails.origin,
            destination: rideDetails.destination,
            departure_time: rideDetails.departure_time,
            available_seats: rideDetails.available_seats,
            status: 'scheduled',
            is_pool_ride: true,
        })
        .select()
        .single();

    if (rideError) throw rideError;

    // Link to pool
    const { data: poolRide, error: poolRideError } = await supabase
        .from('carpool_pool_rides')
        .insert({
            pool_id: poolId,
            ride_id: ride.id,
            driver_id: driverId,
            scheduled_for: rideDetails.departure_time,
            status: 'scheduled',
        })
        .select()
        .single();

    if (poolRideError) throw poolRideError;

    return { poolRide, ride };
}

// ============ HELPERS ============

function generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Regenerate invite code
 */
export async function regenerateInviteCode(poolId: string): Promise<string> {
    const newCode = generateInviteCode();

    const { error } = await supabase
        .from('carpool_pools')
        .update({ invite_code: newCode })
        .eq('id', poolId);

    if (error) throw error;
    return newCode;
}
