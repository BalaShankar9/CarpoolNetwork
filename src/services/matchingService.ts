// Advanced Ride Matching Service
// Smart matching, recurring rides, wait lists, and ride pooling

import { supabase } from '@/lib/supabase';

export interface MatchPreferences {
  userId: string;
  smokingAllowed: boolean;
  petsAllowed: boolean;
  musicPreference: 'quiet' | 'any' | 'music';
  conversationLevel: 'quiet' | 'some' | 'chatty';
  genderPreference: 'any' | 'same' | 'female_only' | 'male_only';
  maxDetourMinutes: number;
  preferredDepartureWindow: number; // minutes flexibility
  preferVerifiedDrivers: boolean;
  minDriverRating: number;
}

export interface SmartMatch {
  rideId: string;
  driverId: string;
  driverName: string;
  driverAvatar?: string;
  driverRating: number;
  driverRides: number;
  origin: string;
  destination: string;
  departureTime: Date;
  availableSeats: number;
  matchScore: number; // 0-100
  matchReasons: MatchReason[];
  routeOverlap: number; // percentage
  estimatedDetour: number; // minutes
  pricePerSeat: number;
  preferences: Partial<MatchPreferences>;
}

export interface MatchReason {
  type: 'route' | 'time' | 'preference' | 'social' | 'rating' | 'history';
  description: string;
  score: number;
}

export interface RecurringRide {
  id: string;
  userId: string;
  type: 'driver' | 'passenger';
  origin: string;
  originLat: number;
  originLng: number;
  destination: string;
  destinationLat: number;
  destinationLng: number;
  departureTime: string; // HH:mm
  daysOfWeek: number[]; // 0-6, Sunday = 0
  isActive: boolean;
  autoBook: boolean;
  matchedRides: string[];
  createdAt: Date;
  lastMatchedAt?: Date;
}

export interface WaitListEntry {
  id: string;
  userId: string;
  rideId: string;
  position: number;
  joinedAt: Date;
  notifyOnAvailable: boolean;
  autoBook: boolean;
  expiresAt?: Date;
}

export interface RidePoolSuggestion {
  rides: SmartMatch[];
  combinedRoute: {
    totalDistance: number;
    totalDuration: number;
    stops: { location: string; lat: number; lng: number; type: 'pickup' | 'dropoff' }[];
  };
  efficiency: number; // percentage improvement vs individual rides
  totalPassengers: number;
  estimatedSavings: number;
}

// Match scoring weights
const MATCH_WEIGHTS = {
  routeOverlap: 30,
  timeMatch: 25,
  preferenceMatch: 20,
  socialMatch: 10,
  ratingMatch: 10,
  historyMatch: 5,
};

class MatchingService {
  // Find smart matches for a ride request
  async findSmartMatches(
    userId: string,
    origin: { lat: number; lng: number; address: string },
    destination: { lat: number; lng: number; address: string },
    departureTime: Date,
    seatsNeeded: number = 1
  ): Promise<SmartMatch[]> {
    // Get user preferences
    const preferences = await this.getUserPreferences(userId);

    // Calculate time window
    const windowMinutes = preferences?.preferredDepartureWindow || 30;
    const minTime = new Date(departureTime.getTime() - windowMinutes * 60 * 1000);
    const maxTime = new Date(departureTime.getTime() + windowMinutes * 60 * 1000);

    // Find available rides
    const { data: rides } = await supabase
      .from('rides')
      .select(`
        *,
        driver:profiles!driver_id(id, full_name, avatar_url, average_rating),
        vehicle:vehicles(make, model, color)
      `)
      .gte('departure_time', minTime.toISOString())
      .lte('departure_time', maxTime.toISOString())
      .gte('available_seats', seatsNeeded)
      .eq('status', 'scheduled')
      .neq('driver_id', userId);

    if (!rides || rides.length === 0) {
      return [];
    }

    // Get user's ride history for social matching
    const history = await this.getUserRideHistory(userId);
    const friendIds = await this.getUserFriendIds(userId);

    // Score and filter matches
    const matches: SmartMatch[] = [];

    for (const ride of rides) {
      const match = await this.scoreMatch(
        ride,
        origin,
        destination,
        departureTime,
        preferences,
        history,
        friendIds
      );

      if (match.matchScore >= 40) { // Minimum threshold
        matches.push(match);
      }
    }

    // Sort by match score
    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  // Score a potential match
  private async scoreMatch(
    ride: any,
    origin: { lat: number; lng: number; address: string },
    destination: { lat: number; lng: number; address: string },
    requestedTime: Date,
    preferences: MatchPreferences | null,
    history: string[],
    friendIds: Set<string>
  ): Promise<SmartMatch> {
    const reasons: MatchReason[] = [];
    let totalScore = 0;

    // 1. Route overlap score
    const routeOverlap = this.calculateRouteOverlap(
      { origin, destination },
      {
        origin: { lat: ride.origin_lat, lng: ride.origin_lng },
        destination: { lat: ride.destination_lat, lng: ride.destination_lng },
      }
    );
    const routeScore = routeOverlap * MATCH_WEIGHTS.routeOverlap;
    totalScore += routeScore;
    if (routeOverlap >= 0.7) {
      reasons.push({
        type: 'route',
        description: 'Route closely matches yours',
        score: routeScore,
      });
    }

    // 2. Time match score
    const rideTime = new Date(ride.departure_time);
    const timeDiff = Math.abs(rideTime.getTime() - requestedTime.getTime()) / (60 * 1000);
    const timeScore = Math.max(0, MATCH_WEIGHTS.timeMatch * (1 - timeDiff / 60));
    totalScore += timeScore;
    if (timeDiff <= 15) {
      reasons.push({
        type: 'time',
        description: 'Departure time matches well',
        score: timeScore,
      });
    }

    // 3. Preference match score
    let preferenceScore = 0;
    if (preferences) {
      const prefMatches: string[] = [];

      if (preferences.smokingAllowed === ride.smoking_allowed) {
        preferenceScore += 5;
        prefMatches.push('smoking');
      }
      if (preferences.petsAllowed === ride.pets_allowed) {
        preferenceScore += 5;
        prefMatches.push('pets');
      }
      if (preferences.musicPreference === 'any' || preferences.musicPreference === ride.music_preference) {
        preferenceScore += 5;
        prefMatches.push('music');
      }
      if (!preferences.preferVerifiedDrivers || ride.driver?.is_verified) {
        preferenceScore += 5;
      }

      totalScore += preferenceScore;
      if (prefMatches.length >= 2) {
        reasons.push({
          type: 'preference',
          description: `Matches your preferences: ${prefMatches.join(', ')}`,
          score: preferenceScore,
        });
      }
    }

    // 4. Social match score
    let socialScore = 0;
    if (friendIds.has(ride.driver_id)) {
      socialScore = MATCH_WEIGHTS.socialMatch;
      reasons.push({
        type: 'social',
        description: 'Driver is your friend',
        score: socialScore,
      });
    }
    totalScore += socialScore;

    // 5. Rating score
    const driverRating = ride.driver?.average_rating || 0;
    const ratingScore = (driverRating / 5) * MATCH_WEIGHTS.ratingMatch;
    totalScore += ratingScore;
    if (driverRating >= 4.5) {
      reasons.push({
        type: 'rating',
        description: 'Highly rated driver',
        score: ratingScore,
      });
    }

    // 6. History score (have ridden with this driver before)
    let historyScore = 0;
    if (history.includes(ride.driver_id)) {
      historyScore = MATCH_WEIGHTS.historyMatch;
      reasons.push({
        type: 'history',
        description: 'You\'ve ridden with this driver before',
        score: historyScore,
      });
    }
    totalScore += historyScore;

    // Get driver ride count
    const { count: driverRides } = await supabase
      .from('rides')
      .select('*', { count: 'exact', head: true })
      .eq('driver_id', ride.driver_id);

    return {
      rideId: ride.id,
      driverId: ride.driver_id,
      driverName: ride.driver?.full_name || 'Unknown',
      driverAvatar: ride.driver?.avatar_url,
      driverRating,
      driverRides: driverRides || 0,
      origin: ride.origin,
      destination: ride.destination,
      departureTime: new Date(ride.departure_time),
      availableSeats: ride.available_seats,
      matchScore: Math.round(totalScore),
      matchReasons: reasons,
      routeOverlap: Math.round(routeOverlap * 100),
      estimatedDetour: Math.round((1 - routeOverlap) * 15), // Rough estimate
      pricePerSeat: ride.price_per_seat || 0,
      preferences: {
        smokingAllowed: ride.smoking_allowed,
        petsAllowed: ride.pets_allowed,
        musicPreference: ride.music_preference,
      },
    };
  }

  // Calculate route overlap between two routes
  private calculateRouteOverlap(
    route1: { origin: { lat: number; lng: number }; destination: { lat: number; lng: number } },
    route2: { origin: { lat: number; lng: number }; destination: { lat: number; lng: number } }
  ): number {
    // Simplified calculation using Haversine distance
    const originDistance = this.haversineDistance(
      route1.origin.lat,
      route1.origin.lng,
      route2.origin.lat,
      route2.origin.lng
    );
    const destDistance = this.haversineDistance(
      route1.destination.lat,
      route1.destination.lng,
      route2.destination.lat,
      route2.destination.lng
    );

    // Score based on proximity (max 5km for good match)
    const originScore = Math.max(0, 1 - originDistance / 5);
    const destScore = Math.max(0, 1 - destDistance / 5);

    return (originScore + destScore) / 2;
  }

  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Get user's match preferences
  async getUserPreferences(userId: string): Promise<MatchPreferences | null> {
    const { data } = await supabase
      .from('user_match_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!data) return null;

    return {
      userId: data.user_id,
      smokingAllowed: data.smoking_allowed,
      petsAllowed: data.pets_allowed,
      musicPreference: data.music_preference,
      conversationLevel: data.conversation_level,
      genderPreference: data.gender_preference,
      maxDetourMinutes: data.max_detour_minutes,
      preferredDepartureWindow: data.preferred_departure_window,
      preferVerifiedDrivers: data.prefer_verified_drivers,
      minDriverRating: data.min_driver_rating,
    };
  }

  // Save user preferences
  async saveUserPreferences(preferences: MatchPreferences): Promise<void> {
    await supabase.from('user_match_preferences').upsert({
      user_id: preferences.userId,
      smoking_allowed: preferences.smokingAllowed,
      pets_allowed: preferences.petsAllowed,
      music_preference: preferences.musicPreference,
      conversation_level: preferences.conversationLevel,
      gender_preference: preferences.genderPreference,
      max_detour_minutes: preferences.maxDetourMinutes,
      preferred_departure_window: preferences.preferredDepartureWindow,
      prefer_verified_drivers: preferences.preferVerifiedDrivers,
      min_driver_rating: preferences.minDriverRating,
      updated_at: new Date().toISOString(),
    });
  }

  // Recurring Rides
  async createRecurringRide(ride: Omit<RecurringRide, 'id' | 'createdAt' | 'matchedRides'>): Promise<RecurringRide> {
    const { data, error } = await supabase
      .from('recurring_rides')
      .insert({
        user_id: ride.userId,
        type: ride.type,
        origin: ride.origin,
        origin_lat: ride.originLat,
        origin_lng: ride.originLng,
        destination: ride.destination,
        destination_lat: ride.destinationLat,
        destination_lng: ride.destinationLng,
        departure_time: ride.departureTime,
        days_of_week: ride.daysOfWeek,
        is_active: ride.isActive,
        auto_book: ride.autoBook,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      userId: data.user_id,
      type: data.type,
      origin: data.origin,
      originLat: data.origin_lat,
      originLng: data.origin_lng,
      destination: data.destination,
      destinationLat: data.destination_lat,
      destinationLng: data.destination_lng,
      departureTime: data.departure_time,
      daysOfWeek: data.days_of_week,
      isActive: data.is_active,
      autoBook: data.auto_book,
      matchedRides: [],
      createdAt: new Date(data.created_at),
    };
  }

  async getUserRecurringRides(userId: string): Promise<RecurringRide[]> {
    const { data } = await supabase
      .from('recurring_rides')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return (data || []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      type: r.type,
      origin: r.origin,
      originLat: r.origin_lat,
      originLng: r.origin_lng,
      destination: r.destination,
      destinationLat: r.destination_lat,
      destinationLng: r.destination_lng,
      departureTime: r.departure_time,
      daysOfWeek: r.days_of_week,
      isActive: r.is_active,
      autoBook: r.auto_book,
      matchedRides: r.matched_rides || [],
      createdAt: new Date(r.created_at),
      lastMatchedAt: r.last_matched_at ? new Date(r.last_matched_at) : undefined,
    }));
  }

  async updateRecurringRide(id: string, updates: Partial<RecurringRide>): Promise<void> {
    const updateData: any = {};
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.autoBook !== undefined) updateData.auto_book = updates.autoBook;
    if (updates.daysOfWeek) updateData.days_of_week = updates.daysOfWeek;
    if (updates.departureTime) updateData.departure_time = updates.departureTime;

    await supabase
      .from('recurring_rides')
      .update(updateData)
      .eq('id', id);
  }

  async deleteRecurringRide(id: string): Promise<void> {
    await supabase.from('recurring_rides').delete().eq('id', id);
  }

  // Wait List
  async joinWaitList(
    userId: string,
    rideId: string,
    options: { notifyOnAvailable?: boolean; autoBook?: boolean; expiresAt?: Date } = {}
  ): Promise<WaitListEntry> {
    // Get current wait list size
    const { count } = await supabase
      .from('ride_waitlist')
      .select('*', { count: 'exact', head: true })
      .eq('ride_id', rideId);

    const position = (count || 0) + 1;

    const { data, error } = await supabase
      .from('ride_waitlist')
      .insert({
        user_id: userId,
        ride_id: rideId,
        position,
        notify_on_available: options.notifyOnAvailable ?? true,
        auto_book: options.autoBook ?? false,
        expires_at: options.expiresAt?.toISOString(),
        joined_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      userId: data.user_id,
      rideId: data.ride_id,
      position: data.position,
      joinedAt: new Date(data.joined_at),
      notifyOnAvailable: data.notify_on_available,
      autoBook: data.auto_book,
      expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
    };
  }

  async leaveWaitList(userId: string, rideId: string): Promise<void> {
    await supabase
      .from('ride_waitlist')
      .delete()
      .eq('user_id', userId)
      .eq('ride_id', rideId);
  }

  async getWaitListPosition(userId: string, rideId: string): Promise<number | null> {
    const { data } = await supabase
      .from('ride_waitlist')
      .select('position')
      .eq('user_id', userId)
      .eq('ride_id', rideId)
      .single();

    return data?.position || null;
  }

  async getRideWaitList(rideId: string): Promise<WaitListEntry[]> {
    const { data } = await supabase
      .from('ride_waitlist')
      .select('*')
      .eq('ride_id', rideId)
      .order('position', { ascending: true });

    return (data || []).map((w) => ({
      id: w.id,
      userId: w.user_id,
      rideId: w.ride_id,
      position: w.position,
      joinedAt: new Date(w.joined_at),
      notifyOnAvailable: w.notify_on_available,
      autoBook: w.auto_book,
      expiresAt: w.expires_at ? new Date(w.expires_at) : undefined,
    }));
  }

  // Process wait list when seat becomes available
  async processWaitList(rideId: string): Promise<void> {
    const waitList = await this.getRideWaitList(rideId);
    if (waitList.length === 0) return;

    // Get ride details
    const { data: ride } = await supabase
      .from('rides')
      .select('available_seats')
      .eq('id', rideId)
      .single();

    if (!ride || ride.available_seats <= 0) return;

    // Process first in queue
    const first = waitList[0];

    if (first.autoBook) {
      // Auto-book for them
      await supabase.from('ride_bookings').insert({
        ride_id: rideId,
        passenger_id: first.userId,
        status: 'confirmed',
        seats_booked: 1,
        created_at: new Date().toISOString(),
      });

      // Update available seats
      await supabase
        .from('rides')
        .update({ available_seats: ride.available_seats - 1 })
        .eq('id', rideId);
    }

    // Notify user
    if (first.notifyOnAvailable) {
      await supabase.from('notifications').insert({
        user_id: first.userId,
        type: 'waitlist_available',
        title: 'Seat Available!',
        message: first.autoBook
          ? 'A seat became available and was automatically booked for you!'
          : 'A seat is now available for a ride you were waiting for.',
        data: { ride_id: rideId, auto_booked: first.autoBook },
      });
    }

    // Remove from wait list
    await this.leaveWaitList(first.userId, rideId);

    // Re-order remaining entries
    for (let i = 1; i < waitList.length; i++) {
      await supabase
        .from('ride_waitlist')
        .update({ position: i })
        .eq('id', waitList[i].id);
    }
  }

  // Helper methods
  private async getUserRideHistory(userId: string): Promise<string[]> {
    const { data } = await supabase
      .from('ride_bookings')
      .select('ride:rides(driver_id)')
      .eq('passenger_id', userId)
      .eq('status', 'confirmed');

    return data?.map((b: any) => b.ride?.driver_id).filter(Boolean) || [];
  }

  private async getUserFriendIds(userId: string): Promise<Set<string>> {
    const { data } = await supabase
      .from('friendships')
      .select('user_a, user_b')
      .or(`user_a.eq.${userId},user_b.eq.${userId}`);

    const friendIds = new Set<string>();
    data?.forEach((f) => {
      if (f.user_a !== userId) friendIds.add(f.user_a);
      if (f.user_b !== userId) friendIds.add(f.user_b);
    });

    return friendIds;
  }
}

export const matchingService = new MatchingService();
export default matchingService;
