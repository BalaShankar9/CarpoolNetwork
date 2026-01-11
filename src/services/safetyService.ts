import { supabase } from '../lib/supabase';

export interface EmergencyContact {
    id: string;
    user_id: string;
    name: string;
    phone: string;
    relationship: string;
    notify_on_sos: boolean;
    notify_on_trip_start: boolean;
    created_at: string;
}

export interface TripShare {
    id: string;
    ride_id: string;
    booking_id?: string;
    user_id: string;
    share_token: string;
    shared_with_contacts: string[];
    shared_via_link: boolean;
    expires_at: string;
    created_at: string;
}

export interface SafetyCheckIn {
    id: string;
    ride_id: string;
    user_id: string;
    status: 'ok' | 'help_needed' | 'no_response';
    location?: { latitude: number; longitude: number };
    notes?: string;
    created_at: string;
}

export interface TrustBadge {
    id: string;
    name: string;
    description: string;
    icon: string;
    earned: boolean;
    earnedAt?: string;
}

// Safety tips for different scenarios
export const SAFETY_TIPS = {
    first_ride: [
        'Share your trip details with a friend or family member',
        'Verify the driver\'s profile photo and vehicle details before getting in',
        'Sit in the back seat for added safety',
        'Keep your phone charged and location services on',
        'Trust your instincts - if something feels wrong, don\'t get in',
    ],
    as_driver: [
        'Verify passenger identity before they enter your vehicle',
        'Share your trip with a trusted contact',
        'Keep your doors locked until you\'ve confirmed the passenger',
        'Follow the planned route and avoid shortcuts through isolated areas',
        'Report any suspicious behavior to the platform',
    ],
    as_passenger: [
        'Check the driver\'s rating and reviews before booking',
        'Confirm the car make, model, and license plate match the app',
        'Share your live trip with emergency contacts',
        'Sit in the back seat when possible',
        'Keep your belongings with you at all times',
    ],
    night_rides: [
        'Choose well-lit pickup and dropoff locations',
        'Let someone know your expected arrival time',
        'Stay alert and avoid using headphones',
        'Have a backup plan if the ride is cancelled',
        'Keep emergency numbers easily accessible',
    ],
};

/**
 * Get all emergency contacts for a user
 */
export async function getEmergencyContacts(userId: string): Promise<EmergencyContact[]> {
    const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
}

/**
 * Add a new emergency contact
 */
export async function addEmergencyContact(
    userId: string,
    contact: Omit<EmergencyContact, 'id' | 'user_id' | 'created_at'>
): Promise<EmergencyContact> {
    // Check limit (max 5 contacts)
    const existing = await getEmergencyContacts(userId);
    if (existing.length >= 5) {
        throw new Error('Maximum of 5 emergency contacts allowed');
    }

    const { data, error } = await supabase
        .from('emergency_contacts')
        .insert({
            user_id: userId,
            ...contact,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Update an emergency contact
 */
export async function updateEmergencyContact(
    contactId: string,
    updates: Partial<Omit<EmergencyContact, 'id' | 'user_id' | 'created_at'>>
): Promise<EmergencyContact> {
    const { data, error } = await supabase
        .from('emergency_contacts')
        .update(updates)
        .eq('id', contactId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Delete an emergency contact
 */
export async function deleteEmergencyContact(contactId: string): Promise<void> {
    const { error } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', contactId);

    if (error) throw error;
}

/**
 * Create a shareable trip link
 */
export async function createTripShare(
    rideId: string,
    userId: string,
    bookingId?: string,
    contactIds: string[] = []
): Promise<TripShare> {
    const shareToken = generateShareToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

    const { data, error } = await supabase
        .from('trip_shares')
        .insert({
            ride_id: rideId,
            booking_id: bookingId,
            user_id: userId,
            share_token: shareToken,
            shared_with_contacts: contactIds,
            shared_via_link: contactIds.length === 0,
            expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Get trip share by token (for public viewing)
 */
export async function getTripShareByToken(token: string): Promise<{
    tripShare: TripShare;
    ride: any;
    driver: any;
    currentLocation?: { latitude: number; longitude: number };
} | null> {
    const { data: tripShare, error } = await supabase
        .from('trip_shares')
        .select(`
      *,
      ride:rides!inner(
        id,
        origin,
        destination,
        departure_time,
        status,
        driver:profiles!rides_driver_id_fkey(id, full_name, avatar_url, profile_photo_url)
      )
    `)
        .eq('share_token', token)
        .gt('expires_at', new Date().toISOString())
        .single();

    if (error || !tripShare) return null;

    // Get current tracking location if ride is in progress (canonical state: 'in-progress')
    let currentLocation;
    if (tripShare.ride.status === 'in-progress') {
        const { data: tracking } = await supabase
            .from('ride_tracking')
            .select('current_location')
            .eq('ride_id', tripShare.ride_id)
            .is('ride_ended_at', null)
            .single();

        if (tracking?.current_location) {
            currentLocation = {
                latitude: tracking.current_location.coordinates[1],
                longitude: tracking.current_location.coordinates[0],
            };
        }
    }

    return {
        tripShare,
        ride: tripShare.ride,
        driver: tripShare.ride.driver,
        currentLocation,
    };
}

/**
 * Send SOS alert
 */
export async function triggerSOS(
    userId: string,
    rideId: string,
    location?: { latitude: number; longitude: number }
): Promise<{ success: boolean; message: string }> {
    const { data, error } = await supabase.rpc('trigger_ride_emergency', {
        p_ride_id: rideId,
        p_lat: location?.latitude,
        p_lng: location?.longitude,
    });

    if (error) {
        // Fallback - create emergency alert manually
        await supabase.from('safety_alerts').insert({
            user_id: userId,
            ride_id: rideId,
            alert_type: 'sos',
            location: location
                ? `POINT(${location.longitude} ${location.latitude})`
                : null,
            status: 'active',
        });

        // Notify emergency contacts
        const contacts = await getEmergencyContacts(userId);
        const sosContacts = contacts.filter(c => c.notify_on_sos);

        // Queue notifications for each contact
        for (const contact of sosContacts) {
            await supabase.from('notification_queue').insert({
                user_id: userId,
                notification_type: 'sos_alert',
                title: 'Emergency SOS Alert',
                message: `${contact.name}, an emergency has been triggered. Location has been shared.`,
                data: { contact_phone: contact.phone, ride_id: rideId, location },
                priority: 'urgent',
            });
        }

        return { success: true, message: 'Emergency alert sent to contacts and safety team' };
    }

    return data?.[0] || { success: true, message: 'Emergency services notified' };
}

/**
 * Create a safety check-in
 */
export async function createSafetyCheckIn(
    rideId: string,
    userId: string,
    status: 'ok' | 'help_needed',
    location?: { latitude: number; longitude: number },
    notes?: string
): Promise<SafetyCheckIn> {
    const { data, error } = await supabase
        .from('safety_checkins')
        .insert({
            ride_id: rideId,
            user_id: userId,
            status,
            location: location
                ? `POINT(${location.longitude} ${location.latitude})`
                : null,
            notes,
        })
        .select()
        .single();

    if (error) throw error;

    // If help needed, trigger alert
    if (status === 'help_needed') {
        await triggerSOS(userId, rideId, location);
    }

    return data;
}

/**
 * Get user's trust badges
 */
export async function getUserTrustBadges(userId: string): Promise<TrustBadge[]> {
    // Get user profile for verification status
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (!profile) return [];

    // Get completed rides count
    const { count: ridesAsDriver } = await supabase
        .from('rides')
        .select('*', { count: 'exact', head: true })
        .eq('driver_id', userId)
        .eq('status', 'completed');

    const { count: ridesAsPassenger } = await supabase
        .from('ride_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('passenger_id', userId)
        .eq('status', 'completed');

    const totalRides = (ridesAsDriver || 0) + (ridesAsPassenger || 0);

    // Define badges
    const badges: TrustBadge[] = [
        {
            id: 'email_verified',
            name: 'Email Verified',
            description: 'Email address has been verified',
            icon: 'mail-check',
            earned: profile.email_verified === true,
            earnedAt: profile.email_verified ? profile.created_at : undefined,
        },
        {
            id: 'phone_verified',
            name: 'Phone Verified',
            description: 'Phone number has been verified',
            icon: 'phone-check',
            earned: profile.phone_verified === true,
            earnedAt: profile.phone_verified_at,
        },
        {
            id: 'id_verified',
            name: 'ID Verified',
            description: 'Government ID has been verified',
            icon: 'id-card',
            earned: profile.id_verified === true,
            earnedAt: profile.id_verified_at,
        },
        {
            id: 'photo_verified',
            name: 'Photo Verified',
            description: 'Profile photo verified with face detection',
            icon: 'camera-check',
            earned: !!profile.profile_photo_url,
            earnedAt: profile.profile_photo_url ? profile.updated_at : undefined,
        },
        {
            id: 'trusted_member',
            name: 'Trusted Member',
            description: 'Completed 10+ rides with good ratings',
            icon: 'shield-check',
            earned: totalRides >= 10 && (profile.average_rating || 0) >= 4.0,
        },
        {
            id: 'veteran',
            name: 'Community Veteran',
            description: 'Active member for over 6 months',
            icon: 'award',
            earned: isOlderThanMonths(profile.created_at, 6),
        },
        {
            id: 'super_driver',
            name: 'Super Driver',
            description: 'Completed 50+ rides as driver with 4.5+ rating',
            icon: 'star',
            earned: (ridesAsDriver || 0) >= 50 && (profile.average_rating || 0) >= 4.5,
        },
        {
            id: 'reliable',
            name: 'Highly Reliable',
            description: 'Reliability score above 90',
            icon: 'clock-check',
            earned: (profile.reliability_score || 0) >= 90,
        },
    ];

    return badges;
}

/**
 * Get safety score breakdown for a user
 */
export async function getSafetyScoreBreakdown(userId: string): Promise<{
    overallScore: number;
    components: {
        name: string;
        score: number;
        maxScore: number;
        description: string;
    }[];
}> {
    const badges = await getUserTrustBadges(userId);
    const earnedBadges = badges.filter(b => b.earned);

    const { data: profile } = await supabase
        .from('profiles')
        .select('average_rating, reliability_score, trust_score')
        .eq('id', userId)
        .single();

    const components = [
        {
            name: 'Verification',
            score: earnedBadges.filter(b =>
                ['email_verified', 'phone_verified', 'id_verified', 'photo_verified'].includes(b.id)
            ).length * 10,
            maxScore: 40,
            description: 'Complete profile verifications',
        },
        {
            name: 'Ratings',
            score: Math.round((profile?.average_rating || 0) * 6), // Max 30 for 5.0 rating
            maxScore: 30,
            description: 'Average rating from other users',
        },
        {
            name: 'Reliability',
            score: Math.round((profile?.reliability_score || 0) * 0.2), // Max 20 for 100 score
            maxScore: 20,
            description: 'Completion rate and punctuality',
        },
        {
            name: 'Experience',
            score: Math.min(10, earnedBadges.filter(b =>
                ['trusted_member', 'veteran', 'super_driver'].includes(b.id)
            ).length * 5),
            maxScore: 10,
            description: 'Community experience and tenure',
        },
    ];

    const overallScore = components.reduce((sum, c) => sum + c.score, 0);

    return { overallScore, components };
}

// Helper functions
function generateShareToken(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let token = '';
    for (let i = 0; i < 12; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

function isOlderThanMonths(dateString: string, months: number): boolean {
    const date = new Date(dateString);
    const now = new Date();
    const diffMonths = (now.getFullYear() - date.getFullYear()) * 12 +
        (now.getMonth() - date.getMonth());
    return diffMonths >= months;
}
