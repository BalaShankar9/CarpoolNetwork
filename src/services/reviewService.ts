import { supabase } from '../lib/supabase';

export interface DetailedReview {
    id: string;
    booking_id: string;
    ride_id: string;
    reviewer_id: string;
    reviewee_id: string;
    overall_rating: number;
    punctuality_rating: number | null;
    cleanliness_rating: number | null;
    communication_rating: number | null;
    safety_rating: number | null;
    comfort_rating: number | null;
    review_text: string | null;
    would_ride_again: boolean;
    created_at: string;
}

export interface ReviewSubmissionData {
    booking_id: string;
    overall_rating: number;
    punctuality_rating?: number;
    cleanliness_rating?: number;
    communication_rating?: number;
    safety_rating?: number;
    comfort_rating?: number;
    review_text?: string;
    would_ride_again: boolean;
}

export interface PendingReview {
    booking_id: string;
    ride_id: string;
    reviewee_id: string;
    reviewee_name: string;
    origin: string;
    destination: string;
    departure_time: string;
    role: 'driver' | 'passenger';
}

/**
 * Submit a detailed review for a completed ride
 */
export async function submitReview(
    data: ReviewSubmissionData
): Promise<{ success: boolean; message: string; achievements_unlocked?: string[] }> {
    const { data: result, error } = await supabase.rpc('submit_detailed_review', {
        p_booking_id: data.booking_id,
        p_overall_rating: data.overall_rating,
        p_punctuality_rating: data.punctuality_rating || null,
        p_cleanliness_rating: data.cleanliness_rating || null,
        p_communication_rating: data.communication_rating || null,
        p_safety_rating: data.safety_rating || null,
        p_comfort_rating: data.comfort_rating || null,
        p_review_text: data.review_text || null,
        p_would_ride_again: data.would_ride_again,
    });

    if (error) {
        throw new Error(error.message);
    }

    return result?.[0] || { success: false, message: 'No response' };
}

/**
 * Get pending reviews for the current user
 */
export async function getPendingReviews(): Promise<PendingReview[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    // Get completed bookings where user hasn't left a review yet
    const { data: asPassenger, error: passengerError } = await supabase
        .from('ride_bookings')
        .select(`
      id,
      ride_id,
      rides!inner(
        driver_id,
        origin,
        destination,
        departure_time,
        driver:profiles!rides_driver_id_fkey(full_name)
      )
    `)
        .eq('passenger_id', user.user.id)
        .eq('status', 'completed')
        .not('ride_id', 'in', (
            supabase
                .from('ride_reviews_detailed')
                .select('ride_id')
                .eq('reviewer_id', user.user.id)
        ));

    if (passengerError) {
        console.error('Error fetching passenger reviews:', passengerError);
    }

    // Get completed rides as driver where user hasn't reviewed passengers
    const { data: asDriver, error: driverError } = await supabase
        .from('ride_bookings')
        .select(`
      id,
      ride_id,
      passenger_id,
      rides!inner(
        driver_id,
        origin,
        destination,
        departure_time
      ),
      passenger:profiles!ride_bookings_passenger_id_fkey(full_name)
    `)
        .eq('status', 'completed')
        .eq('rides.driver_id', user.user.id)
        .not('id', 'in', (
            supabase
                .from('ride_reviews_detailed')
                .select('booking_id')
                .eq('reviewer_id', user.user.id)
        ));

    if (driverError) {
        console.error('Error fetching driver reviews:', driverError);
    }

    const pending: PendingReview[] = [];

    // Format passenger reviews
    (asPassenger || []).forEach((booking: any) => {
        pending.push({
            booking_id: booking.id,
            ride_id: booking.ride_id,
            reviewee_id: booking.rides.driver_id,
            reviewee_name: booking.rides.driver?.full_name || 'Driver',
            origin: booking.rides.origin,
            destination: booking.rides.destination,
            departure_time: booking.rides.departure_time,
            role: 'passenger',
        });
    });

    // Format driver reviews
    (asDriver || []).forEach((booking: any) => {
        pending.push({
            booking_id: booking.id,
            ride_id: booking.ride_id,
            reviewee_id: booking.passenger_id,
            reviewee_name: booking.passenger?.full_name || 'Passenger',
            origin: booking.rides.origin,
            destination: booking.rides.destination,
            departure_time: booking.rides.departure_time,
            role: 'driver',
        });
    });

    return pending;
}

/**
 * Get reviews for a specific user
 */
export async function getUserReviews(
    userId: string,
    options: { limit?: number; offset?: number } = {}
): Promise<{ reviews: DetailedReview[]; total: number }> {
    const { limit = 10, offset = 0 } = options;

    const { data, error, count } = await supabase
        .from('ride_reviews_detailed')
        .select('*', { count: 'exact' })
        .eq('reviewee_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        throw new Error(error.message);
    }

    return {
        reviews: data || [],
        total: count || 0,
    };
}

/**
 * Get review statistics for a user
 */
export async function getUserReviewStats(userId: string): Promise<{
    averageRating: number;
    totalReviews: number;
    categoryAverages: Record<string, number>;
    wouldRideAgainPercent: number;
}> {
    const { data, error } = await supabase
        .from('ride_reviews_detailed')
        .select('*')
        .eq('reviewee_id', userId);

    if (error) {
        throw new Error(error.message);
    }

    const reviews = data || [];

    if (reviews.length === 0) {
        return {
            averageRating: 0,
            totalReviews: 0,
            categoryAverages: {},
            wouldRideAgainPercent: 0,
        };
    }

    const avgOverall = reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviews.length;

    const calcAvg = (field: string) => {
        const valid = reviews.filter(r => r[field] !== null);
        if (valid.length === 0) return 0;
        return valid.reduce((sum, r) => sum + r[field], 0) / valid.length;
    };

    const wouldRideAgain = reviews.filter(r => r.would_ride_again).length;

    return {
        averageRating: avgOverall,
        totalReviews: reviews.length,
        categoryAverages: {
            punctuality: calcAvg('punctuality_rating'),
            cleanliness: calcAvg('cleanliness_rating'),
            communication: calcAvg('communication_rating'),
            safety: calcAvg('safety_rating'),
            comfort: calcAvg('comfort_rating'),
        },
        wouldRideAgainPercent: (wouldRideAgain / reviews.length) * 100,
    };
}

/**
 * Check if a review exists for a booking
 */
export async function hasReviewed(bookingId: string, reviewerId: string): Promise<boolean> {
    const { count, error } = await supabase
        .from('ride_reviews_detailed')
        .select('*', { count: 'exact', head: true })
        .eq('booking_id', bookingId)
        .eq('reviewer_id', reviewerId);

    if (error) {
        throw new Error(error.message);
    }

    return (count || 0) > 0;
}
