import { supabase } from '../lib/supabase';
import { fetchPublicProfilesByIds } from './publicProfiles';
import type { Database } from '../lib/database.types';

type UserPreferences = Database['public']['Tables']['user_preferences']['Row'];
type Ride = Database['public']['Tables']['rides']['Row'];

export interface CompatibilityScore {
  overall: number;
  breakdown: {
    music?: number;
    conversation?: number;
    temperature?: number;
    smoking?: number;
    pets?: number;
    amenities?: number;
    safety?: number;
    accessibility?: number;
  };
  blockingIssues: string[];
  isCompatible: boolean;
  matchDetails: {
    category: string;
    reason: string;
    impact: 'positive' | 'negative' | 'neutral';
  }[];
}

export interface FilteredRide extends Ride {
  compatibilityScore: number;
  compatibilityDetails: CompatibilityScore;
  isPreferredDriver: boolean;
  isInstantBookable: boolean;
  matchPercentage: number;
  driverProfile?: any;
  driverPreferences?: UserPreferences;
}

export interface SearchFilterSettings {
  maxPrice?: number;
  minRating?: number;
  requireVerified?: boolean;
  smokingFilter?: string;
  petsFilter?: string;
  musicFilter?: string;
  requireAC?: boolean;
  requireCharging?: boolean;
  requireWiFi?: boolean;
  luggageNeeded?: string;
  requireChildSeat?: boolean;
  requireWheelchair?: boolean;
  maxDetourMinutes?: number;
  preferredVehicleTypes?: string[];
  ecoFriendlyOnly?: boolean;
  instantBookingOnly?: boolean;
  friendsOnly?: boolean;
  carpoolingOk?: boolean;
  priorityAlgorithm?: 'cheapest' | 'fastest' | 'highest-rated' | 'eco-friendly' | 'comfort';
}

export class PreferenceMatchingService {
  static async calculateDetailedCompatibility(
    driverId: string,
    passengerId: string,
    rideId?: string
  ): Promise<CompatibilityScore> {
    const { data: driverPrefs } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', driverId)
      .maybeSingle();

    const { data: passengerPrefs } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', passengerId)
      .maybeSingle();

    if (!driverPrefs || !passengerPrefs) {
      return {
        overall: 50,
        breakdown: {},
        blockingIssues: ['missing_preferences'],
        isCompatible: false,
        matchDetails: []
      };
    }

    let score = 100;
    const breakdown: CompatibilityScore['breakdown'] = {};
    const blockingIssues: string[] = [];
    const matchDetails: CompatibilityScore['matchDetails'] = [];

    const { data: blocked } = await supabase
      .from('blocked_users_preferences')
      .select('*')
      .or(`user_id.eq.${driverId},user_id.eq.${passengerId}`)
      .or(`blocked_user_id.eq.${driverId},blocked_user_id.eq.${passengerId}`)
      .maybeSingle();

    if (blocked) {
      blockingIssues.push('users_blocked');
      score = 0;
      matchDetails.push({
        category: 'Block',
        reason: 'One user has blocked the other',
        impact: 'negative'
      });
    }

    if (passengerPrefs.search_smoking_filter === 'no-smoking-only' &&
        driverPrefs.smoking_policy !== 'no-smoking') {
      blockingIssues.push('smoking_incompatible');
      score -= 30;
      breakdown.smoking = -30;
      matchDetails.push({
        category: 'Smoking',
        reason: 'Passenger requires no-smoking vehicle',
        impact: 'negative'
      });
    } else if (driverPrefs.smoking_policy === 'no-smoking') {
      breakdown.smoking = 10;
      matchDetails.push({
        category: 'Smoking',
        reason: 'Non-smoking vehicle matches preference',
        impact: 'positive'
      });
    }

    if (passengerPrefs.service_animal && !driverPrefs.pets_allowed) {
      blockingIssues.push('service_animal_not_allowed');
      score -= 40;
      breakdown.pets = -40;
      matchDetails.push({
        category: 'Pets',
        reason: 'Service animal cannot be accommodated',
        impact: 'negative'
      });
    } else if (driverPrefs.pets_allowed) {
      breakdown.pets = 5;
      matchDetails.push({
        category: 'Pets',
        reason: 'Pet-friendly vehicle',
        impact: 'positive'
      });
    }

    if (passengerPrefs.search_require_wheelchair && !driverPrefs.wheelchair_accessible) {
      blockingIssues.push('wheelchair_not_accessible');
      score -= 40;
      breakdown.accessibility = -40;
      matchDetails.push({
        category: 'Accessibility',
        reason: 'Wheelchair accessibility required but not available',
        impact: 'negative'
      });
    } else if (driverPrefs.wheelchair_accessible) {
      breakdown.accessibility = 15;
      matchDetails.push({
        category: 'Accessibility',
        reason: 'Wheelchair accessible vehicle',
        impact: 'positive'
      });
    }

    if (driverPrefs.music_preference === passengerPrefs.search_music_filter ||
        passengerPrefs.search_music_filter === 'any') {
      breakdown.music = 10;
      matchDetails.push({
        category: 'Music',
        reason: 'Music preferences align',
        impact: 'positive'
      });
    } else {
      score -= 5;
      breakdown.music = -5;
      matchDetails.push({
        category: 'Music',
        reason: 'Different music preferences',
        impact: 'negative'
      });
    }

    if (driverPrefs.conversation_level === passengerPrefs.conversation_level) {
      breakdown.conversation = 10;
      matchDetails.push({
        category: 'Conversation',
        reason: 'Conversation preferences match perfectly',
        impact: 'positive'
      });
    } else {
      score -= 5;
      breakdown.conversation = -5;
    }

    if (driverPrefs.temperature_preference === passengerPrefs.temperature_preference) {
      breakdown.temperature = 5;
      matchDetails.push({
        category: 'Temperature',
        reason: 'Temperature preferences match',
        impact: 'positive'
      });
    } else {
      score -= 3;
      breakdown.temperature = -3;
    }

    let amenityScore = 0;
    if (passengerPrefs.search_require_ac && driverPrefs.ac_heating_available) {
      amenityScore += 5;
      matchDetails.push({
        category: 'Amenities',
        reason: 'Air conditioning available',
        impact: 'positive'
      });
    } else if (passengerPrefs.search_require_ac && !driverPrefs.ac_heating_available) {
      blockingIssues.push('ac_required');
      score -= 20;
    }

    if (passengerPrefs.search_require_charging && driverPrefs.phone_charging_available) {
      amenityScore += 5;
      matchDetails.push({
        category: 'Amenities',
        reason: 'Phone charging available',
        impact: 'positive'
      });
    }

    if (passengerPrefs.search_require_wifi && driverPrefs.wifi_available) {
      amenityScore += 5;
      matchDetails.push({
        category: 'Amenities',
        reason: 'WiFi available',
        impact: 'positive'
      });
    }

    if (amenityScore > 0) {
      breakdown.amenities = amenityScore;
    }

    let safetyScore = 0;
    if (driverPrefs.share_live_location_automatically) {
      safetyScore += 5;
      matchDetails.push({
        category: 'Safety',
        reason: 'Driver shares live location automatically',
        impact: 'positive'
      });
    }

    if (driverPrefs.require_photo_verification_at_pickup) {
      safetyScore += 5;
      matchDetails.push({
        category: 'Safety',
        reason: 'Photo verification at pickup for security',
        impact: 'positive'
      });
    }

    if (safetyScore > 0) {
      breakdown.safety = safetyScore;
    }

    score = Math.max(0, Math.min(100, score));

    return {
      overall: score,
      breakdown,
      blockingIssues,
      isCompatible: score >= 50 && blockingIssues.length === 0,
      matchDetails
    };
  }

  static async getFilteredRidesWithMatching(
    userId: string,
    filters: SearchFilterSettings = {}
  ): Promise<FilteredRide[]> {
    let query = supabase
      .from('rides')
      .select(`
        *,
        vehicle:vehicles!rides_vehicle_id_fkey(
          make,
          model,
          year,
          color
        )
      `)
      .eq('status', 'active')
      .gt('available_seats', 0)
      .neq('driver_id', userId);

    const { data: rides, error } = await query;

    if (error || !rides) {
      console.error('Error fetching rides:', error);
      return [];
    }

    const driversById = await fetchPublicProfilesByIds(rides.map((ride) => ride.driver_id));
    const ridesWithDrivers = rides.map((ride) => ({
      ...ride,
      driver: driversById[ride.driver_id] || null,
    }));

    const { data: blockedUsers } = await supabase
      .from('blocked_users_preferences')
      .select('blocked_user_id')
      .eq('user_id', userId);

    const blockedIds = blockedUsers?.map(b => b.blocked_user_id) || [];

    const { data: preferredDrivers } = await supabase
      .from('preferred_drivers')
      .select('preferred_driver_id')
      .eq('user_id', userId);

    const preferredIds = preferredDrivers?.map(p => p.preferred_driver_id) || [];

    const filteredRides = await Promise.all(
      ridesWithDrivers
        .filter(ride => !blockedIds.includes(ride.driver_id))
        .map(async (ride) => {
          const compatibility = await this.calculateDetailedCompatibility(
            ride.driver_id,
            userId,
            ride.id
          );

          const { data: driverPrefs } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', ride.driver_id)
            .maybeSingle();

          return {
            ...ride,
            compatibilityScore: compatibility.overall,
            compatibilityDetails: compatibility,
            isPreferredDriver: preferredIds.includes(ride.driver_id),
            isInstantBookable: driverPrefs?.instant_booking_enabled || false,
            matchPercentage: compatibility.overall,
            driverProfile: ride.driver,
            driverPreferences: driverPrefs
          } as FilteredRide;
        })
    );

    let filteredResults = filteredRides.filter(ride => {
      if (filters.requireVerified && !ride.driverProfile?.is_verified) return false;
      if (filters.minRating && ride.driverProfile?.average_rating < filters.minRating) return false;
      if (filters.instantBookingOnly && !ride.isInstantBookable) return false;
      if (filters.friendsOnly && !ride.isPreferredDriver) return false;

      if (!ride.compatibilityDetails.isCompatible) return false;

      return true;
    });

    switch (filters.priorityAlgorithm) {
      case 'highest-rated':
        filteredResults.sort((a, b) =>
          (b.driverProfile?.average_rating || 0) - (a.driverProfile?.average_rating || 0)
        );
        break;
      case 'comfort':
        filteredResults.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
        break;
      case 'fastest':
        filteredResults.sort((a, b) =>
          new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime()
        );
        break;
      default:
        filteredResults.sort((a, b) => {
          if (a.isPreferredDriver && !b.isPreferredDriver) return -1;
          if (!a.isPreferredDriver && b.isPreferredDriver) return 1;
          return b.compatibilityScore - a.compatibilityScore;
        });
    }

    return filteredResults;
  }

  static async saveSearchFilter(
    userId: string,
    filterName: string,
    filterSettings: SearchFilterSettings
  ): Promise<boolean> {
    const { error } = await supabase
      .from('passenger_search_filters')
      .insert({
        user_id: userId,
        filter_name: filterName,
        filter_settings: filterSettings as any,
        is_default: false
      });

    return !error;
  }

  static async getSavedFilters(userId: string) {
    const { data, error } = await supabase
      .from('passenger_search_filters')
      .select('*')
      .eq('user_id', userId)
      .order('use_count', { ascending: false });

    return data || [];
  }

  static async updateFilterUsage(filterId: string) {
    await supabase.rpc('increment', {
      table_name: 'passenger_search_filters',
      row_id: filterId,
      column_name: 'use_count'
    });

    await supabase
      .from('passenger_search_filters')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', filterId);
  }

  static async trackSearch(
    userId: string,
    searchParameters: SearchFilterSettings,
    resultsShown: number,
    resultClicked?: string
  ) {
    await supabase
      .from('search_history_analytics')
      .insert({
        user_id: userId,
        search_parameters: searchParameters as any,
        results_shown: resultsShown,
        result_clicked: resultClicked,
        booking_completed: false
      });
  }

  static async getPreferenceProfiles(userId: string, profileType: 'driver' | 'passenger' | 'both') {
    const { data } = await supabase
      .from('preference_profiles')
      .select('*')
      .eq('user_id', userId)
      .in('profile_type', [profileType, 'both'])
      .order('use_count', { ascending: false });

    return data || [];
  }

  static async createDefaultProfiles(userId: string) {
    const defaultPassengerProfiles = [
      {
        user_id: userId,
        profile_name: 'Budget Traveler',
        profile_type: 'passenger' as const,
        profile_category: 'budget' as const,
        preferences: {
          search_priority_algorithm: 'cheapest',
          search_min_driver_rating: 3.0,
          search_carpooling_ok: true,
          flexible_price_percentage: 30
        },
        is_system_default: true
      },
      {
        user_id: userId,
        profile_name: 'Comfort Seeker',
        profile_type: 'passenger' as const,
        profile_category: 'comfort' as const,
        preferences: {
          search_priority_algorithm: 'comfort',
          search_min_driver_rating: 4.5,
          search_require_ac: true,
          search_require_charging: true,
          search_music_filter: 'quiet-only'
        },
        is_system_default: true
      },
      {
        user_id: userId,
        profile_name: 'Safety First',
        profile_type: 'passenger' as const,
        profile_category: 'safety' as const,
        preferences: {
          search_priority_algorithm: 'highest-rated',
          search_min_driver_rating: 4.8,
          search_require_verified_driver: true,
          search_friends_only: false,
          search_instant_booking_only: false
        },
        is_system_default: true
      }
    ];

    await supabase
      .from('preference_profiles')
      .insert(defaultPassengerProfiles);
  }

  static getRecommendedFilterAdjustments(
    currentFilters: SearchFilterSettings,
    resultsCount: number
  ): { suggestion: string; impact: string }[] {
    const suggestions: { suggestion: string; impact: string }[] = [];

    if (resultsCount === 0) {
      if (currentFilters.minRating && currentFilters.minRating > 4.0) {
        suggestions.push({
          suggestion: `Lowering minimum rating from ${currentFilters.minRating} to 4.0`,
          impact: 'Would show approximately 40% more rides'
        });
      }

      if (currentFilters.requireVerified) {
        suggestions.push({
          suggestion: 'Removing verified driver requirement',
          impact: 'Would show 3x more rides'
        });
      }

      if (currentFilters.instantBookingOnly) {
        suggestions.push({
          suggestion: 'Allowing manual approval rides',
          impact: 'Would show 5x more rides'
        });
      }
    } else if (resultsCount < 5) {
      suggestions.push({
        suggestion: 'Increasing flexible price percentage by 10%',
        impact: 'Would show 2-3 more options'
      });

      if (currentFilters.maxDetourMinutes && currentFilters.maxDetourMinutes < 20) {
        suggestions.push({
          suggestion: 'Increasing max detour time to 20 minutes',
          impact: 'Would open up more route options'
        });
      }
    }

    return suggestions;
  }
}
