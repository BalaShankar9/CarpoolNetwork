// Smart Recommendations Service
// AI-powered matching, commute pattern analysis, and personalized suggestions

import { supabase } from '@/lib/supabase';

export interface RideRecommendation {
    id: string;
    rideId: string;
    score: number; // 0-100 compatibility score
    reasons: RecommendationReason[];
    ride: {
        origin: string;
        destination: string;
        departureTime: Date;
        driver: {
            id: string;
            name: string;
            avatar?: string;
            rating: number;
        };
        price: number;
        seatsAvailable: number;
    };
}

export interface RecommendationReason {
    type: 'route_match' | 'time_match' | 'past_interaction' | 'preference_match' | 'regular_route' | 'price' | 'rating';
    description: string;
    weight: number; // 0-1
}

export interface CommutePattern {
    dayOfWeek: number; // 0-6
    timeSlot: string; // 'morning' | 'evening'
    origin: {
        lat: number;
        lng: number;
        commonAddress: string;
    };
    destination: {
        lat: number;
        lng: number;
        commonAddress: string;
    };
    frequency: number; // trips per week
    averagePrice: number;
}

export interface SmartAlert {
    id: string;
    userId: string;
    type: 'new_route' | 'price_drop' | 'favorite_driver' | 'regular_match' | 'preferred_time';
    title: string;
    message: string;
    rideId?: string;
    createdAt: Date;
    read: boolean;
}

export interface UserPreferenceProfile {
    preferredTimes: {
        morning?: { start: string; end: string };
        evening?: { start: string; end: string };
    };
    preferredDays: number[];
    maxPrice: number;
    maxWalkingDistance: number; // meters
    preferFemaleDrivers?: boolean;
    preferQuietRides?: boolean;
    preferNoSmoking?: boolean;
    musicPreferences?: string[];
    regularRoutes: {
        origin: string;
        destination: string;
        frequency: 'daily' | 'weekly' | 'occasional';
    }[];
}

class SmartRecommendationService {
    // Calculate match score between user preferences and a ride
    calculateMatchScore(
        ride: any,
        userPreferences: UserPreferenceProfile,
        userLocation?: { lat: number; lng: number }
    ): { score: number; reasons: RecommendationReason[] } {
        const reasons: RecommendationReason[] = [];
        let totalWeight = 0;
        let weightedScore = 0;

        // Time matching (20% weight)
        const timeWeight = 0.2;
        const rideTime = new Date(ride.departure_time);
        const rideHour = rideTime.getHours();
        const isMorning = rideHour >= 6 && rideHour <= 10;
        const isEvening = rideHour >= 16 && rideHour <= 20;

        if (isMorning && userPreferences.preferredTimes.morning) {
            const preferredStart = parseInt(userPreferences.preferredTimes.morning.start.split(':')[0]);
            const preferredEnd = parseInt(userPreferences.preferredTimes.morning.end.split(':')[0]);
            if (rideHour >= preferredStart && rideHour <= preferredEnd) {
                reasons.push({
                    type: 'time_match',
                    description: 'Matches your preferred morning commute time',
                    weight: timeWeight
                });
                weightedScore += timeWeight * 100;
            }
        } else if (isEvening && userPreferences.preferredTimes.evening) {
            const preferredStart = parseInt(userPreferences.preferredTimes.evening.start.split(':')[0]);
            const preferredEnd = parseInt(userPreferences.preferredTimes.evening.end.split(':')[0]);
            if (rideHour >= preferredStart && rideHour <= preferredEnd) {
                reasons.push({
                    type: 'time_match',
                    description: 'Matches your preferred evening commute time',
                    weight: timeWeight
                });
                weightedScore += timeWeight * 100;
            }
        }
        totalWeight += timeWeight;

        // Day matching (10% weight)
        const dayWeight = 0.1;
        const rideDay = rideTime.getDay();
        if (userPreferences.preferredDays.includes(rideDay)) {
            reasons.push({
                type: 'time_match',
                description: 'Available on your preferred travel day',
                weight: dayWeight
            });
            weightedScore += dayWeight * 100;
        }
        totalWeight += dayWeight;

        // Price matching (25% weight)
        const priceWeight = 0.25;
        if (ride.price_per_seat <= userPreferences.maxPrice) {
            const priceScore = 100 - ((ride.price_per_seat / userPreferences.maxPrice) * 50);
            reasons.push({
                type: 'price',
                description: ride.price_per_seat === 0
                    ? 'Free ride!'
                    : `Within your budget (£${ride.price_per_seat})`,
                weight: priceWeight
            });
            weightedScore += priceWeight * priceScore;
        }
        totalWeight += priceWeight;

        // Driver rating (15% weight)
        const ratingWeight = 0.15;
        if (ride.driver?.average_rating) {
            const ratingScore = (ride.driver.average_rating / 5) * 100;
            if (ride.driver.average_rating >= 4.5) {
                reasons.push({
                    type: 'rating',
                    description: `Highly rated driver (${ride.driver.average_rating.toFixed(1)}⭐)`,
                    weight: ratingWeight
                });
            }
            weightedScore += ratingWeight * ratingScore;
        }
        totalWeight += ratingWeight;

        // Route matching (30% weight)
        const routeWeight = 0.3;
        const routeMatch = userPreferences.regularRoutes.find(route => {
            const originMatch = ride.origin?.toLowerCase().includes(route.origin.toLowerCase()) ||
                route.origin.toLowerCase().includes(ride.origin?.toLowerCase());
            const destMatch = ride.destination?.toLowerCase().includes(route.destination.toLowerCase()) ||
                route.destination.toLowerCase().includes(ride.destination?.toLowerCase());
            return originMatch && destMatch;
        });

        if (routeMatch) {
            reasons.push({
                type: 'regular_route',
                description: `Matches your ${routeMatch.frequency} route`,
                weight: routeWeight
            });
            weightedScore += routeWeight * 100;
        }
        totalWeight += routeWeight;

        // Calculate final normalized score
        const finalScore = totalWeight > 0
            ? Math.round(weightedScore / totalWeight)
            : 50;

        return { score: Math.min(100, finalScore), reasons };
    }

    // Analyze user's commute patterns from past rides
    async analyzeCommutePatterns(userId: string): Promise<CommutePattern[]> {
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select(`
        id,
        created_at,
        ride:rides (
          origin,
          destination,
          origin_lat,
          origin_lng,
          destination_lat,
          destination_lng,
          departure_time,
          price_per_seat
        )
      `)
            .eq('passenger_id', userId)
            .eq('status', 'confirmed')
            .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // Last 90 days
            .order('created_at', { ascending: false });

        if (error || !bookings) return [];

        // Group by day of week and time slot
        const patternMap = new Map<string, {
            rides: any[];
            origins: { lat: number; lng: number; address: string }[];
            destinations: { lat: number; lng: number; address: string }[];
            prices: number[];
        }>();

        bookings.forEach((booking: any) => {
            if (!booking.ride) return;

            const depTime = new Date(booking.ride.departure_time);
            const dayOfWeek = depTime.getDay();
            const hour = depTime.getHours();
            const timeSlot = hour < 12 ? 'morning' : 'evening';
            const key = `${dayOfWeek}-${timeSlot}`;

            if (!patternMap.has(key)) {
                patternMap.set(key, {
                    rides: [],
                    origins: [],
                    destinations: [],
                    prices: []
                });
            }

            const pattern = patternMap.get(key)!;
            pattern.rides.push(booking.ride);
            pattern.origins.push({
                lat: booking.ride.origin_lat,
                lng: booking.ride.origin_lng,
                address: booking.ride.origin
            });
            pattern.destinations.push({
                lat: booking.ride.destination_lat,
                lng: booking.ride.destination_lng,
                address: booking.ride.destination
            });
            pattern.prices.push(booking.ride.price_per_seat || 0);
        });

        // Convert to CommutePattern array
        const patterns: CommutePattern[] = [];

        patternMap.forEach((data, key) => {
            if (data.rides.length >= 2) { // Only include patterns with at least 2 occurrences
                const [dayOfWeek, timeSlot] = key.split('-');

                // Find most common origin/destination
                const commonOrigin = this.findMostCommon(data.origins.map(o => o.address));
                const commonDest = this.findMostCommon(data.destinations.map(d => d.address));

                const originData = data.origins.find(o => o.address === commonOrigin);
                const destData = data.destinations.find(d => d.address === commonDest);

                if (originData && destData) {
                    patterns.push({
                        dayOfWeek: parseInt(dayOfWeek),
                        timeSlot,
                        origin: {
                            lat: originData.lat,
                            lng: originData.lng,
                            commonAddress: commonOrigin
                        },
                        destination: {
                            lat: destData.lat,
                            lng: destData.lng,
                            commonAddress: commonDest
                        },
                        frequency: data.rides.length / 12, // Approximate weekly frequency over 3 months
                        averagePrice: data.prices.reduce((a, b) => a + b, 0) / data.prices.length
                    });
                }
            }
        });

        return patterns;
    }

    private findMostCommon<T>(items: T[]): T {
        const counts = new Map<T, number>();
        items.forEach(item => {
            counts.set(item, (counts.get(item) || 0) + 1);
        });

        let maxCount = 0;
        let mostCommon = items[0];

        counts.forEach((count, item) => {
            if (count > maxCount) {
                maxCount = count;
                mostCommon = item;
            }
        });

        return mostCommon;
    }

    // Get personalized ride recommendations
    async getRecommendations(
        userId: string,
        options?: {
            limit?: number;
            includePatternBased?: boolean;
        }
    ): Promise<RideRecommendation[]> {
        const { limit = 10, includePatternBased = true } = options || {};

        // Get user preferences
        const { data: profile } = await supabase
            .from('profiles')
            .select('preferences')
            .eq('id', userId)
            .single();

        const userPreferences: UserPreferenceProfile = profile?.preferences || {
            preferredTimes: {},
            preferredDays: [1, 2, 3, 4, 5], // Default weekdays
            maxPrice: 20,
            maxWalkingDistance: 500,
            regularRoutes: []
        };

        // Get upcoming rides
        const { data: rides, error } = await supabase
            .from('rides')
            .select(`
        *,
        driver:profiles!rides_driver_id_fkey (
          id,
          full_name,
          avatar_url,
          average_rating
        )
      `)
            .eq('status', 'active')
            .gt('departure_time', new Date().toISOString())
            .gt('seats_available', 0)
            .order('departure_time', { ascending: true })
            .limit(50);

        if (error || !rides) return [];

        // Analyze patterns if requested
        let patterns: CommutePattern[] = [];
        if (includePatternBased) {
            patterns = await this.analyzeCommutePatterns(userId);
        }

        // Add pattern-based regular routes to preferences
        patterns.forEach(pattern => {
            if (!userPreferences.regularRoutes.some(r =>
                r.origin === pattern.origin.commonAddress &&
                r.destination === pattern.destination.commonAddress
            )) {
                userPreferences.regularRoutes.push({
                    origin: pattern.origin.commonAddress,
                    destination: pattern.destination.commonAddress,
                    frequency: pattern.frequency >= 3 ? 'daily' : pattern.frequency >= 1 ? 'weekly' : 'occasional'
                });
            }
        });

        // Score and rank rides
        const recommendations: RideRecommendation[] = rides.map(ride => {
            const { score, reasons } = this.calculateMatchScore(ride, userPreferences);

            return {
                id: `rec_${ride.id}`,
                rideId: ride.id,
                score,
                reasons,
                ride: {
                    origin: ride.origin,
                    destination: ride.destination,
                    departureTime: new Date(ride.departure_time),
                    driver: {
                        id: ride.driver?.id,
                        name: ride.driver?.full_name || 'Driver',
                        avatar: ride.driver?.avatar_url,
                        rating: ride.driver?.average_rating || 0
                    },
                    price: ride.price_per_seat || 0,
                    seatsAvailable: ride.seats_available
                }
            };
        });

        // Sort by score and return top results
        return recommendations
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    // Create smart alerts based on user patterns
    async checkForAlerts(userId: string): Promise<SmartAlert[]> {
        const alerts: SmartAlert[] = [];

        // Get user's patterns
        const patterns = await this.analyzeCommutePatterns(userId);

        if (patterns.length === 0) return alerts;

        // Check for matching rides based on patterns
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        for (const pattern of patterns) {
            const tomorrowDay = tomorrow.getDay();

            if (pattern.dayOfWeek === tomorrowDay) {
                // Look for rides matching this pattern
                const { data: matchingRides } = await supabase
                    .from('rides')
                    .select('id, origin, destination, departure_time, price_per_seat')
                    .eq('status', 'active')
                    .ilike('origin', `%${pattern.origin.commonAddress.split(',')[0]}%`)
                    .ilike('destination', `%${pattern.destination.commonAddress.split(',')[0]}%`)
                    .gte('departure_time', tomorrow.toISOString())
                    .lt('departure_time', new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000).toISOString())
                    .gt('seats_available', 0)
                    .limit(3);

                if (matchingRides && matchingRides.length > 0) {
                    alerts.push({
                        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        userId,
                        type: 'regular_match',
                        title: 'Ride for your usual commute!',
                        message: `${matchingRides.length} ride${matchingRides.length > 1 ? 's' : ''} available for your regular ${pattern.origin.commonAddress.split(',')[0]} → ${pattern.destination.commonAddress.split(',')[0]} route tomorrow`,
                        rideId: matchingRides[0].id,
                        createdAt: new Date(),
                        read: false
                    });
                }
            }
        }

        // Check for favorite driver rides
        const { data: favorites } = await supabase
            .from('favorites')
            .select('driver_id')
            .eq('user_id', userId)
            .eq('type', 'driver');

        if (favorites && favorites.length > 0) {
            const driverIds = favorites.map(f => f.driver_id);

            const { data: favoriteDriverRides } = await supabase
                .from('rides')
                .select('id, driver_id, origin, destination, departure_time')
                .in('driver_id', driverIds)
                .eq('status', 'active')
                .gt('departure_time', now.toISOString())
                .lt('departure_time', new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString())
                .gt('seats_available', 0)
                .limit(5);

            if (favoriteDriverRides && favoriteDriverRides.length > 0) {
                alerts.push({
                    id: `alert_fav_${Date.now()}`,
                    userId,
                    type: 'favorite_driver',
                    title: 'Your favorite driver has new rides!',
                    message: `${favoriteDriverRides.length} upcoming ride${favoriteDriverRides.length > 1 ? 's' : ''} from drivers you follow`,
                    rideId: favoriteDriverRides[0].id,
                    createdAt: new Date(),
                    read: false
                });
            }
        }

        return alerts;
    }

    // Get commute insights
    async getCommuteInsights(userId: string): Promise<{
        totalTrips: number;
        totalSaved: number;
        carbonReduced: number;
        topRoutes: { route: string; count: number }[];
        averageRating: number;
        mostActiveDay: string;
    }> {
        const patterns = await this.analyzeCommutePatterns(userId);

        // Get booking stats
        const { data: bookings } = await supabase
            .from('bookings')
            .select('id, ride:rides(price_per_seat)')
            .eq('passenger_id', userId)
            .eq('status', 'confirmed');

        const totalTrips = bookings?.length || 0;
        const totalSaved = bookings?.reduce((sum, b: any) => {
            // Estimate savings vs taxi (assume 3x price)
            const rideCost = b.ride?.price_per_seat || 0;
            return sum + (rideCost * 2);
        }, 0) || 0;

        // Estimate CO2 reduction (avg 2.3kg per shared trip)
        const carbonReduced = totalTrips * 2.3;

        // Find top routes
        const routeCounts = new Map<string, number>();
        patterns.forEach(p => {
            const route = `${p.origin.commonAddress.split(',')[0]} → ${p.destination.commonAddress.split(',')[0]}`;
            routeCounts.set(route, (routeCounts.get(route) || 0) + Math.round(p.frequency * 12));
        });

        const topRoutes = Array.from(routeCounts.entries())
            .map(([route, count]) => ({ route, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

        // Find most active day
        const dayCounts = [0, 0, 0, 0, 0, 0, 0];
        patterns.forEach(p => {
            dayCounts[p.dayOfWeek] += p.frequency;
        });
        const maxDayIndex = dayCounts.indexOf(Math.max(...dayCounts));
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        // Get average rating given
        const { data: reviews } = await supabase
            .from('reviews')
            .select('rating')
            .eq('reviewer_id', userId);

        const avgRating = reviews && reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;

        return {
            totalTrips,
            totalSaved: Math.round(totalSaved),
            carbonReduced: Math.round(carbonReduced * 10) / 10,
            topRoutes,
            averageRating: Math.round(avgRating * 10) / 10,
            mostActiveDay: days[maxDayIndex]
        };
    }
}

export const smartRecommendationService = new SmartRecommendationService();
export default smartRecommendationService;
