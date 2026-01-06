import { supabase } from '../lib/supabase';

export interface RideTrackingState {
    id: string;
    ride_id: string;
    driver_id: string;
    current_location: {
        latitude: number;
        longitude: number;
    } | null;
    current_speed_kmh: number;
    heading_degrees: number;
    route_deviation_meters: number;
    eta_to_next_stop: string | null;
    passengers_onboard: string[];
    last_updated: string;
    ride_started_at: string | null;
    ride_ended_at: string | null;
}

export interface TrackingUpdate {
    latitude: number;
    longitude: number;
    speed_kmh?: number;
    heading?: number;
}

/**
 * Start tracking for a ride (driver only)
 */
export async function startRideTracking(
    rideId: string,
    initialLocation: { latitude: number; longitude: number }
): Promise<{ tracking_id: string; success: boolean; message: string }> {
    const { data, error } = await supabase.rpc('start_ride_tracking', {
        p_ride_id: rideId,
        p_initial_lat: initialLocation.latitude,
        p_initial_lng: initialLocation.longitude,
    });

    if (error) {
        throw new Error(error.message);
    }

    return data?.[0] || { tracking_id: '', success: false, message: 'No response' };
}

/**
 * Update current location during active ride (driver only)
 */
export async function updateRideLocation(
    rideId: string,
    location: TrackingUpdate
): Promise<{ success: boolean; deviation_meters: number; message: string }> {
    const { data, error } = await supabase.rpc('update_ride_location', {
        p_ride_id: rideId,
        p_lat: location.latitude,
        p_lng: location.longitude,
        p_speed_kmh: location.speed_kmh || 0,
        p_heading: location.heading || 0,
    });

    if (error) {
        throw new Error(error.message);
    }

    return data?.[0] || { success: false, deviation_meters: 0, message: 'No response' };
}

/**
 * Mark a passenger as picked up
 */
export async function markPassengerPickedUp(
    rideId: string,
    passengerId: string
): Promise<{ success: boolean; message: string }> {
    const { data, error } = await supabase.rpc('mark_passenger_picked_up', {
        p_ride_id: rideId,
        p_passenger_id: passengerId,
    });

    if (error) {
        throw new Error(error.message);
    }

    return data?.[0] || { success: false, message: 'No response' };
}

/**
 * Mark a passenger as dropped off
 */
export async function markPassengerDroppedOff(
    rideId: string,
    passengerId: string
): Promise<{ success: boolean; message: string }> {
    const { data, error } = await supabase.rpc('mark_passenger_dropped_off', {
        p_ride_id: rideId,
        p_passenger_id: passengerId,
    });

    if (error) {
        throw new Error(error.message);
    }

    return data?.[0] || { success: false, message: 'No response' };
}

/**
 * Complete ride tracking (driver only)
 */
export async function completeRideTracking(
    rideId: string
): Promise<{ success: boolean; message: string }> {
    const { data, error } = await supabase.rpc('complete_ride_tracking', {
        p_ride_id: rideId,
    });

    if (error) {
        throw new Error(error.message);
    }

    return data?.[0] || { success: false, message: 'No response' };
}

/**
 * Get active tracking for a ride
 */
export async function getActiveRideTracking(
    rideId: string
): Promise<RideTrackingState | null> {
    const { data, error } = await supabase
        .from('ride_tracking')
        .select('*')
        .eq('ride_id', rideId)
        .is('ride_ended_at', null)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return null; // No tracking found
        }
        throw new Error(error.message);
    }

    return transformTrackingData(data);
}

/**
 * Subscribe to live tracking updates for a ride
 */
export function subscribeToRideTracking(
    rideId: string,
    callback: (tracking: RideTrackingState) => void
): () => void {
    const channel = supabase
        .channel(`ride_tracking_${rideId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'ride_tracking',
                filter: `ride_id=eq.${rideId}`,
            },
            (payload) => {
                if (payload.new) {
                    callback(transformTrackingData(payload.new));
                }
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}

/**
 * Calculate ETA based on current position and destination
 */
export function calculateETA(
    currentLocation: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    currentSpeedKmh: number
): { etaMinutes: number; distanceKm: number } {
    // Haversine formula for distance
    const R = 6371; // Earth's radius in km
    const dLat = toRad(destination.latitude - currentLocation.latitude);
    const dLng = toRad(destination.longitude - currentLocation.longitude);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(currentLocation.latitude)) *
        Math.cos(toRad(destination.latitude)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;

    // Estimate time based on speed (with minimum speed of 30 km/h for stationary)
    const effectiveSpeed = Math.max(currentSpeedKmh, 30);
    const etaMinutes = Math.round((distanceKm / effectiveSpeed) * 60);

    return { etaMinutes, distanceKm };
}

/**
 * Parse location from PostGIS geography format
 */
function parseLocation(locationData: any): { latitude: number; longitude: number } | null {
    if (!locationData) return null;

    // Handle GeoJSON format
    if (typeof locationData === 'object' && locationData.coordinates) {
        return {
            longitude: locationData.coordinates[0],
            latitude: locationData.coordinates[1],
        };
    }

    // Handle WKB hex format - needs conversion
    if (typeof locationData === 'string') {
        // For WKB, we'd need a parser - return null for now
        return null;
    }

    return null;
}

function transformTrackingData(data: any): RideTrackingState {
    return {
        id: data.id,
        ride_id: data.ride_id,
        driver_id: data.driver_id,
        current_location: parseLocation(data.current_location),
        current_speed_kmh: data.current_speed_kmh || 0,
        heading_degrees: data.heading_degrees || 0,
        route_deviation_meters: data.route_deviation_meters || 0,
        eta_to_next_stop: data.eta_to_next_stop,
        passengers_onboard: data.passengers_onboard || [],
        last_updated: data.last_updated,
        ride_started_at: data.ride_started_at,
        ride_ended_at: data.ride_ended_at,
    };
}

function toRad(deg: number): number {
    return deg * (Math.PI / 180);
}
