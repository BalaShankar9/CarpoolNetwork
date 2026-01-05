import { supabase } from '../lib/supabase';
import { fetchPublicProfilesByIds } from './publicProfiles';

interface Ride {
  id: string;
  driver_id: string;
  origin: string;
  destination: string;
  departure_time: string;
  available_seats: number;
  price_per_seat?: number;
  estimated_distance?: number;
  driver?: {
    average_rating: number;
    total_rides_offered: number;
    trust_score?: number;
    profile_verified?: boolean;
  };
}

interface UserPreferences {
  search_max_price_per_km?: number;
  search_max_total_price?: number;
  search_min_driver_rating?: number;
  search_require_verified_driver?: boolean;
  search_smoking_filter?: string;
  search_pets_filter?: string;
  search_music_filter?: string;
  search_require_ac?: boolean;
  search_require_charging?: boolean;
  search_require_wifi?: boolean;
  search_luggage_needed?: string;
  search_require_child_seat?: boolean;
  search_require_wheelchair?: boolean;
  search_max_detour_minutes?: number;
  search_preferred_vehicle_types?: string[];
  search_eco_friendly_only?: boolean;
  search_instant_booking_only?: boolean;
  search_friends_only?: boolean;
  search_carpooling_ok?: boolean;
  search_priority_algorithm?: string;
}

interface DriverPreferences {
  smoking_policy?: string;
  pets_allowed?: boolean;
  music_preference?: string;
  ac_heating_available?: boolean;
  phone_charging_available?: boolean;
  wifi_available?: boolean;
  luggage_policy?: string;
  child_seats_available?: number;
  wheelchair_accessible?: boolean;
  instant_booking_enabled?: boolean;
}

interface MatchScore {
  rideId: string;
  totalScore: number;
  breakdown: {
    priceScore: number;
    ratingScore: number;
    trustScore: number;
    preferenceScore: number;
    availabilityScore: number;
  };
  matchPercentage: number;
  reasons: string[];
}

export async function calculateRideMatchScore(
  ride: Ride,
  userPrefs: UserPreferences,
  driverPrefs: DriverPreferences
): Promise<MatchScore> {
  let totalScore = 0;
  let maxScore = 0;
  const reasons: string[] = [];

  // Price Score (20 points max)
  maxScore += 20;
  if (ride.price_per_seat && ride.estimated_distance) {
    const pricePerKm = ride.price_per_seat / ride.estimated_distance;
    if (userPrefs.search_max_price_per_km) {
      if (pricePerKm <= userPrefs.search_max_price_per_km) {
        const priceScore = 20 * (1 - pricePerKm / userPrefs.search_max_price_per_km);
        totalScore += priceScore;
        reasons.push(`Great price: £${pricePerKm.toFixed(2)}/km`);
      }
    } else {
      totalScore += 10;
    }
  } else {
    totalScore += 10;
  }

  // Driver Rating Score (20 points max)
  maxScore += 20;
  if (ride.driver?.average_rating) {
    const ratingScore = (ride.driver.average_rating / 5) * 20;
    totalScore += ratingScore;
    if (ride.driver.average_rating >= 4.5) {
      reasons.push(`Highly rated driver (${ride.driver.average_rating.toFixed(1)}⭐)`);
    }
  }

  // Trust Score (15 points max)
  maxScore += 15;
  if (ride.driver?.trust_score) {
    const trustScore = (ride.driver.trust_score / 100) * 15;
    totalScore += trustScore;
    if (ride.driver.trust_score >= 80) {
      reasons.push(`Highly trusted driver (${ride.driver.trust_score}/100)`);
    }
  }

  // Verification Score (10 points max)
  maxScore += 10;
  if (ride.driver?.profile_verified) {
    totalScore += 10;
    reasons.push('Verified driver');
  }

  // Preference Matching (35 points max)
  let preferenceScore = 0;
  let preferenceMax = 35;

  // Smoking preference (5 points)
  if (userPrefs.search_smoking_filter && driverPrefs.smoking_policy) {
    if (userPrefs.search_smoking_filter === 'no-smoking-only' &&
        driverPrefs.smoking_policy === 'no-smoking') {
      preferenceScore += 5;
      reasons.push('Non-smoking vehicle');
    } else if (userPrefs.search_smoking_filter === 'any') {
      preferenceScore += 3;
    }
  }

  // Pets preference (5 points)
  if (userPrefs.search_pets_filter && driverPrefs.pets_allowed !== undefined) {
    if (userPrefs.search_pets_filter === 'no-pets' && !driverPrefs.pets_allowed) {
      preferenceScore += 5;
    } else if (userPrefs.search_pets_filter === 'pets-ok-only' && driverPrefs.pets_allowed) {
      preferenceScore += 5;
      reasons.push('Pet-friendly');
    } else if (userPrefs.search_pets_filter === 'any') {
      preferenceScore += 3;
    }
  }

  // Music preference (5 points)
  if (userPrefs.search_music_filter && driverPrefs.music_preference) {
    if (userPrefs.search_music_filter === 'quiet-only' &&
        driverPrefs.music_preference === 'none') {
      preferenceScore += 5;
      reasons.push('Quiet ride');
    } else if (userPrefs.search_music_filter === 'any') {
      preferenceScore += 3;
    }
  }

  // Amenities (5 points each)
  if (userPrefs.search_require_ac && driverPrefs.ac_heating_available) {
    preferenceScore += 5;
    reasons.push('AC available');
  }

  if (userPrefs.search_require_charging && driverPrefs.phone_charging_available) {
    preferenceScore += 5;
    reasons.push('Phone charging available');
  }

  if (userPrefs.search_require_wifi && driverPrefs.wifi_available) {
    preferenceScore += 5;
    reasons.push('WiFi available');
  }

  // Accessibility (5 points)
  if (userPrefs.search_require_wheelchair && driverPrefs.wheelchair_accessible) {
    preferenceScore += 5;
    reasons.push('Wheelchair accessible');
  }

  if (userPrefs.search_require_child_seat &&
      driverPrefs.child_seats_available &&
      driverPrefs.child_seats_available > 0) {
    preferenceScore += 5;
    reasons.push('Child seat available');
  }

  totalScore += preferenceScore;
  maxScore += preferenceMax;

  // Calculate final percentage
  const matchPercentage = Math.round((totalScore / maxScore) * 100);

  return {
    rideId: ride.id,
    totalScore,
    breakdown: {
      priceScore: Math.min(20, totalScore * 0.2),
      ratingScore: Math.min(20, (ride.driver?.average_rating || 0) * 4),
      trustScore: Math.min(15, (ride.driver?.trust_score || 0) * 0.15),
      preferenceScore,
      availabilityScore: ride.available_seats > 0 ? 10 : 0
    },
    matchPercentage,
    reasons
  };
}

export async function getRideRecommendations(
  userId: string,
  fromLocation: { lat: number; lng: number },
  toLocation: { lat: number; lng: number },
  departureTime?: string
): Promise<{ ride: Ride; matchScore: MatchScore }[]> {
  try {
    const { data: userPrefs } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!userPrefs) {
      return [];
    }

    const { data: rides, error } = await supabase
      .from('rides')
      .select('*')
      .eq('status', 'active')
      .gte('available_seats', 1)
      .order('departure_time', { ascending: true });

    if (error || !rides) {
      throw error;
    }

    const driversById = await fetchPublicProfilesByIds(rides.map((ride) => ride.driver_id));
    const ridesWithDrivers = rides.map((ride) => ({
      ...ride,
      driver: driversById[ride.driver_id] || null,
    }));

    const scoredRides = await Promise.all(
      ridesWithDrivers.map(async (ride) => {
        const { data: driverPrefs } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', ride.driver_id)
          .maybeSingle();

        const matchScore = await calculateRideMatchScore(
          ride,
          userPrefs,
          driverPrefs || {}
        );

        return { ride, matchScore };
      })
    );

    // Sort by match score
    const sortedRides = scoredRides
      .filter(r => r.matchScore.matchPercentage >= 50)
      .sort((a, b) => b.matchScore.totalScore - a.matchScore.totalScore);

    return sortedRides.slice(0, 10);
  } catch (error) {
    console.error('Error getting ride recommendations:', error);
    return [];
  }
}

export async function findBestMatches(
  userId: string,
  criteria: {
    from: { lat: number; lng: number; address: string };
    to: { lat: number; lng: number; address: string };
    date: string;
    seats: number;
  }
): Promise<{ ride: Ride; matchScore: MatchScore }[]> {
  try {
    const recommendations = await getRideRecommendations(
      userId,
      criteria.from,
      criteria.to,
      criteria.date
    );

    // Filter by available seats
    return recommendations.filter(
      r => r.ride.available_seats >= criteria.seats
    );
  } catch (error) {
    console.error('Error finding best matches:', error);
    return [];
  }
}

export function getMatchQualityLabel(percentage: number): {
  label: string;
  color: string;
  description: string;
} {
  if (percentage >= 90) {
    return {
      label: 'Perfect Match',
      color: 'green',
      description: 'Excellent match for your preferences'
    };
  } else if (percentage >= 75) {
    return {
      label: 'Great Match',
      color: 'blue',
      description: 'Very good match for your preferences'
    };
  } else if (percentage >= 60) {
    return {
      label: 'Good Match',
      color: 'indigo',
      description: 'Good match with most preferences met'
    };
  } else if (percentage >= 50) {
    return {
      label: 'Fair Match',
      color: 'yellow',
      description: 'Acceptable match with some preferences met'
    };
  } else {
    return {
      label: 'Poor Match',
      color: 'gray',
      description: 'Limited match with your preferences'
    };
  }
}
