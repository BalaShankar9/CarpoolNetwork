import { supabase } from '../lib/supabase';

export interface FavoriteDriver {
    id: string;
    user_id: string;
    driver_id: string;
    nickname?: string;
    notes?: string;
    ride_count: number;
    last_ride_at?: string;
    created_at: string;
    driver?: {
        id: string;
        full_name: string;
        avatar_url?: string;
        profile_photo_url?: string;
        average_rating?: number;
        total_rides?: number;
    };
}

export interface SavedRoute {
    id: string;
    user_id: string;
    name: string;
    origin: string;
    origin_coords?: { latitude: number; longitude: number };
    destination: string;
    destination_coords?: { latitude: number; longitude: number };
    preferred_departure_time?: string;
    preferred_days?: string[];
    is_default: boolean;
    use_count: number;
    last_used_at?: string;
    created_at: string;
}

export interface QuickBookingPreset {
    id: string;
    user_id: string;
    name: string;
    route_id?: string;
    driver_id?: string;
    seats_needed: number;
    flexible_time: boolean;
    time_flexibility_minutes: number;
    preferences?: {
        women_only?: boolean;
        no_smoking?: boolean;
        quiet_ride?: boolean;
        luggage_space?: boolean;
    };
    created_at: string;
}

// ============ FAVORITE DRIVERS ============

/**
 * Get all favorite drivers for a user
 */
export async function getFavoriteDrivers(userId: string): Promise<FavoriteDriver[]> {
    const { data, error } = await supabase
        .from('favorite_drivers')
        .select(`
      *,
      driver:profiles!favorite_drivers_driver_id_fkey(
        id,
        full_name,
        avatar_url,
        profile_photo_url,
        average_rating,
        total_rides
      )
    `)
        .eq('user_id', userId)
        .order('ride_count', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Add a driver to favorites
 */
export async function addFavoriteDriver(
    userId: string,
    driverId: string,
    nickname?: string,
    notes?: string
): Promise<FavoriteDriver> {
    // Check if already favorited
    const { data: existing } = await supabase
        .from('favorite_drivers')
        .select('id')
        .eq('user_id', userId)
        .eq('driver_id', driverId)
        .single();

    if (existing) {
        throw new Error('Driver is already in your favorites');
    }

    const { data, error } = await supabase
        .from('favorite_drivers')
        .insert({
            user_id: userId,
            driver_id: driverId,
            nickname,
            notes,
            ride_count: 0,
        })
        .select(`
      *,
      driver:profiles!favorite_drivers_driver_id_fkey(
        id,
        full_name,
        avatar_url,
        profile_photo_url,
        average_rating,
        total_rides
      )
    `)
        .single();

    if (error) throw error;
    return data;
}

/**
 * Remove a driver from favorites
 */
export async function removeFavoriteDriver(userId: string, driverId: string): Promise<void> {
    const { error } = await supabase
        .from('favorite_drivers')
        .delete()
        .eq('user_id', userId)
        .eq('driver_id', driverId);

    if (error) throw error;
}

/**
 * Update favorite driver details
 */
export async function updateFavoriteDriver(
    favoriteId: string,
    updates: { nickname?: string; notes?: string }
): Promise<FavoriteDriver> {
    const { data, error } = await supabase
        .from('favorite_drivers')
        .update(updates)
        .eq('id', favoriteId)
        .select(`
      *,
      driver:profiles!favorite_drivers_driver_id_fkey(
        id,
        full_name,
        avatar_url,
        profile_photo_url,
        average_rating,
        total_rides
      )
    `)
        .single();

    if (error) throw error;
    return data;
}

/**
 * Check if a driver is favorited
 */
export async function isDriverFavorited(userId: string, driverId: string): Promise<boolean> {
    const { data } = await supabase
        .from('favorite_drivers')
        .select('id')
        .eq('user_id', userId)
        .eq('driver_id', driverId)
        .single();

    return !!data;
}

/**
 * Increment ride count with a favorite driver
 */
export async function incrementFavoriteRideCount(
    userId: string,
    driverId: string
): Promise<void> {
    const { error } = await supabase.rpc('increment_favorite_ride_count', {
        p_user_id: userId,
        p_driver_id: driverId,
    });

    // Fallback if RPC doesn't exist
    if (error) {
        await supabase
            .from('favorite_drivers')
            .update({
                ride_count: supabase.rpc('increment_ride_count'),
                last_ride_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .eq('driver_id', driverId);
    }
}

// ============ SAVED ROUTES ============

/**
 * Get all saved routes for a user
 */
export async function getSavedRoutes(userId: string): Promise<SavedRoute[]> {
    const { data, error } = await supabase
        .from('saved_routes')
        .select('*')
        .eq('user_id', userId)
        .order('use_count', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Create a saved route
 */
export async function createSavedRoute(
    userId: string,
    route: Omit<SavedRoute, 'id' | 'user_id' | 'use_count' | 'created_at'>
): Promise<SavedRoute> {
    // Check limit (max 10 routes)
    const existing = await getSavedRoutes(userId);
    if (existing.length >= 10) {
        throw new Error('Maximum of 10 saved routes allowed');
    }

    // If setting as default, unset other defaults
    if (route.is_default) {
        await supabase
            .from('saved_routes')
            .update({ is_default: false })
            .eq('user_id', userId);
    }

    const { data, error } = await supabase
        .from('saved_routes')
        .insert({
            user_id: userId,
            ...route,
            use_count: 0,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Update a saved route
 */
export async function updateSavedRoute(
    routeId: string,
    userId: string,
    updates: Partial<Omit<SavedRoute, 'id' | 'user_id' | 'created_at'>>
): Promise<SavedRoute> {
    // If setting as default, unset other defaults
    if (updates.is_default) {
        await supabase
            .from('saved_routes')
            .update({ is_default: false })
            .eq('user_id', userId);
    }

    const { data, error } = await supabase
        .from('saved_routes')
        .update(updates)
        .eq('id', routeId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Delete a saved route
 */
export async function deleteSavedRoute(routeId: string): Promise<void> {
    const { error } = await supabase
        .from('saved_routes')
        .delete()
        .eq('id', routeId);

    if (error) throw error;
}

/**
 * Increment route usage count
 */
export async function incrementRouteUsage(routeId: string): Promise<void> {
    const { error } = await supabase
        .from('saved_routes')
        .update({
            use_count: supabase.rpc('increment'),
            last_used_at: new Date().toISOString(),
        })
        .eq('id', routeId);

    if (error) {
        // Fallback - manual increment
        const { data } = await supabase
            .from('saved_routes')
            .select('use_count')
            .eq('id', routeId)
            .single();

        if (data) {
            await supabase
                .from('saved_routes')
                .update({
                    use_count: (data.use_count || 0) + 1,
                    last_used_at: new Date().toISOString(),
                })
                .eq('id', routeId);
        }
    }
}

// ============ QUICK BOOKING ============

/**
 * Get quick booking presets
 */
export async function getQuickBookingPresets(userId: string): Promise<QuickBookingPreset[]> {
    const { data, error } = await supabase
        .from('quick_booking_presets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Create a quick booking preset
 */
export async function createQuickBookingPreset(
    userId: string,
    preset: Omit<QuickBookingPreset, 'id' | 'user_id' | 'created_at'>
): Promise<QuickBookingPreset> {
    const { data, error } = await supabase
        .from('quick_booking_presets')
        .insert({
            user_id: userId,
            ...preset,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Search for rides matching a saved route
 */
export async function findRidesForRoute(
    route: SavedRoute,
    options?: {
        date?: Date;
        timeFlexibilityMinutes?: number;
        seatsNeeded?: number;
        favoriteDriversOnly?: boolean;
        favoriteDriverIds?: string[];
    }
): Promise<any[]> {
    const targetDate = options?.date || new Date();
    const flexMinutes = options?.timeFlexibilityMinutes || 60;

    let query = supabase
        .from('rides')
        .select(`
      *,
      driver:profiles!rides_driver_id_fkey(
        id,
        full_name,
        avatar_url,
        profile_photo_url,
        average_rating
      )
    `)
        .eq('status', 'scheduled')
        .gte('available_seats', options?.seatsNeeded || 1);

    // Filter by date range
    const startDate = new Date(targetDate);
    startDate.setMinutes(startDate.getMinutes() - flexMinutes);

    const endDate = new Date(targetDate);
    endDate.setMinutes(endDate.getMinutes() + flexMinutes);

    query = query
        .gte('departure_time', startDate.toISOString())
        .lte('departure_time', endDate.toISOString());

    // Filter by favorite drivers if requested
    if (options?.favoriteDriversOnly && options?.favoriteDriverIds?.length) {
        query = query.in('driver_id', options.favoriteDriverIds);
    }

    // Text search for origin/destination (basic matching)
    query = query
        .ilike('origin', `%${route.origin.split(',')[0]}%`)
        .ilike('destination', `%${route.destination.split(',')[0]}%`);

    const { data, error } = await query.limit(20);

    if (error) throw error;
    return data || [];
}

/**
 * Quick book - find and book a ride in one step
 */
export async function quickBook(
    userId: string,
    routeId: string,
    options?: {
        preferredDate?: Date;
        seatsNeeded?: number;
        preferFavoriteDrivers?: boolean;
    }
): Promise<{ ride: any; booking: any } | null> {
    // Get the saved route
    const { data: route } = await supabase
        .from('saved_routes')
        .select('*')
        .eq('id', routeId)
        .single();

    if (!route) {
        throw new Error('Saved route not found');
    }

    // Get favorite drivers if preferred
    let favoriteDriverIds: string[] = [];
    if (options?.preferFavoriteDrivers) {
        const favorites = await getFavoriteDrivers(userId);
        favoriteDriverIds = favorites.map(f => f.driver_id);
    }

    // Find matching rides
    const rides = await findRidesForRoute(route, {
        date: options?.preferredDate,
        seatsNeeded: options?.seatsNeeded || 1,
        favoriteDriversOnly: options?.preferFavoriteDrivers && favoriteDriverIds.length > 0,
        favoriteDriverIds,
    });

    if (rides.length === 0) {
        return null;
    }

    // Sort by: favorite driver first, then best rating
    const sortedRides = rides.sort((a, b) => {
        const aIsFavorite = favoriteDriverIds.includes(a.driver_id);
        const bIsFavorite = favoriteDriverIds.includes(b.driver_id);

        if (aIsFavorite && !bIsFavorite) return -1;
        if (!aIsFavorite && bIsFavorite) return 1;

        return (b.driver?.average_rating || 0) - (a.driver?.average_rating || 0);
    });

    const bestRide = sortedRides[0];

    // Create the booking
    const { data: booking, error } = await supabase
        .from('ride_bookings')
        .insert({
            ride_id: bestRide.id,
            passenger_id: userId,
            seats_booked: options?.seatsNeeded || 1,
            status: 'pending',
            pickup_location: route.origin,
            dropoff_location: route.destination,
        })
        .select()
        .single();

    if (error) throw error;

    // Increment route usage
    await incrementRouteUsage(routeId);

    // Increment favorite ride count if applicable
    if (favoriteDriverIds.includes(bestRide.driver_id)) {
        await incrementFavoriteRideCount(userId, bestRide.driver_id);
    }

    return { ride: bestRide, booking };
}
