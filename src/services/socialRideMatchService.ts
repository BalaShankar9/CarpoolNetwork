// =============================================================================
// Social Ride Match Service — friend & group-aware ride suggestions
// =============================================================================
// Finds upcoming rides from the user's social circle (friends and group
// members) and scores them based on route overlap, time proximity, and
// social closeness.
// =============================================================================

import { supabase } from '../lib/supabase';
import type { RideMatch } from '../types/social';

// ---------------------------------------------------------------------------
// constants
// ---------------------------------------------------------------------------

/** Earth radius in km — used for Haversine distance calculations. */
const EARTH_RADIUS_KM = 6_371;

/** Maximum km between two points for them to be considered overlapping. */
const ROUTE_OVERLAP_THRESHOLD_KM = 2;

/** Maximum time difference (ms) for two rides to be considered time-close. */
const TIME_PROXIMITY_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Haversine distance in km between two lat/lng points. */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Normalise a value to [0, 1] where lower raw is better. */
function normalise(raw: number, threshold: number): number {
  return Math.max(0, 1 - raw / threshold);
}

/** Unwrap a join result that may be a single object or an array. */
function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

// ---------------------------------------------------------------------------
// service
// ---------------------------------------------------------------------------

export const socialRideMatchService = {
  /**
   * Find upcoming rides from the user's social circle, scored and sorted by
   * relevance.
   *
   * Scoring formula:
   *   score = (routeOverlap * 0.4) + (timeProximity * 0.3) + (socialCloseness * 0.3)
   *
   * - routeOverlap: 1.0 if origin AND destination are within 2 km of the
   *   user's historical patterns, 0.5 if only one end matches, 0 otherwise.
   * - timeProximity: 1.0 if departure is within 1 hour of the user's typical
   *   departure, decaying linearly to 0 at 4 hours.
   * - socialCloseness: 1.0 for direct friends, 0.6 for group members.
   */
  async getMatchesForUser(userId: string): Promise<RideMatch[]> {
    try {
      // ------------------------------------------------------------------
      // 1. Build the user's social graph
      // ------------------------------------------------------------------
      const [friendshipsRes, groupMembershipsRes] = await Promise.allSettled([
        supabase
          .from('friendships')
          .select('user_a, user_b')
          .or(`user_a.eq.${userId},user_b.eq.${userId}`),
        supabase
          .from('social_group_members')
          .select('group_id, user_id')
          .eq('user_id', userId),
      ]);

      const friendIds = new Set<string>();
      if (friendshipsRes.status === 'fulfilled' && friendshipsRes.value.data) {
        for (const f of friendshipsRes.value.data) {
          friendIds.add(f.user_a === userId ? f.user_b : f.user_a);
        }
      }

      // Groups the user belongs to, and all members of those groups
      const myGroupIds: string[] = [];
      if (groupMembershipsRes.status === 'fulfilled' && groupMembershipsRes.value.data) {
        for (const m of groupMembershipsRes.value.data) {
          myGroupIds.push(m.group_id);
        }
      }

      // Map: userId -> groupName (for the `shared_group` field)
      const groupMemberMap = new Map<string, string>();
      if (myGroupIds.length > 0) {
        const { data: allGroupMembers } = await supabase
          .from('social_group_members')
          .select('user_id, social_groups:group_id (name)')
          .in('group_id', myGroupIds)
          .neq('user_id', userId)
          .limit(200);

        if (allGroupMembers) {
          for (const m of allGroupMembers) {
            const group: any = unwrap(m.social_groups);
            if (group?.name) {
              groupMemberMap.set(m.user_id, group.name);
            }
          }
        }
      }

      // Combined set of social user IDs
      const socialUserIds = new Set<string>(Array.from(friendIds));
      groupMemberMap.forEach((_value, key) => socialUserIds.add(key));
      socialUserIds.delete(userId);

      if (socialUserIds.size === 0) return [];

      // ------------------------------------------------------------------
      // 2. Fetch upcoming rides from social circle
      // ------------------------------------------------------------------
      const { data: rides, error: ridesError } = await supabase
        .from('rides')
        .select(
          `id, driver_id, origin, origin_lat, origin_lng,
           destination, destination_lat, destination_lng,
           departure_time, available_seats, status,
           profiles:driver_id (full_name, avatar_url)`,
        )
        .in('driver_id', Array.from(socialUserIds))
        .eq('status', 'active')
        .gt('departure_time', new Date().toISOString())
        .gt('available_seats', 0)
        .order('departure_time', { ascending: true })
        .limit(50);

      if (ridesError) throw ridesError;
      if (!rides || rides.length === 0) return [];

      // ------------------------------------------------------------------
      // 3. Fetch user's historical ride patterns for route scoring
      // ------------------------------------------------------------------
      const { data: history } = await supabase
        .from('ride_bookings')
        .select(
          `pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
           rides:ride_id (departure_time)`,
        )
        .eq('passenger_id', userId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20);

      // Also check rides the user drove
      const { data: drivenHistory } = await supabase
        .from('rides')
        .select('origin_lat, origin_lng, destination_lat, destination_lng, departure_time')
        .eq('driver_id', userId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20);

      // Compile typical origin/destination points and departure hours
      const typicalOrigins: { lat: number; lng: number }[] = [];
      const typicalDestinations: { lat: number; lng: number }[] = [];
      const typicalHours: number[] = [];

      for (const h of history ?? []) {
        if (h.pickup_lat != null && h.pickup_lng != null) {
          typicalOrigins.push({ lat: Number(h.pickup_lat), lng: Number(h.pickup_lng) });
        }
        if (h.dropoff_lat != null && h.dropoff_lng != null) {
          typicalDestinations.push({ lat: Number(h.dropoff_lat), lng: Number(h.dropoff_lng) });
        }
        const ride: any = unwrap(h.rides);
        if (ride?.departure_time) {
          typicalHours.push(new Date(ride.departure_time).getHours());
        }
      }

      for (const d of drivenHistory ?? []) {
        if (d.origin_lat != null && d.origin_lng != null) {
          typicalOrigins.push({ lat: Number(d.origin_lat), lng: Number(d.origin_lng) });
        }
        if (d.destination_lat != null && d.destination_lng != null) {
          typicalDestinations.push({ lat: Number(d.destination_lat), lng: Number(d.destination_lng) });
        }
        if (d.departure_time) {
          typicalHours.push(new Date(d.departure_time).getHours());
        }
      }

      // ------------------------------------------------------------------
      // 4. Score each ride
      // ------------------------------------------------------------------
      const matches: RideMatch[] = [];

      for (const ride of rides) {
        const driver: any = unwrap(ride.profiles);
        const isFriend = friendIds.has(ride.driver_id);
        const sharedGroup = groupMemberMap.get(ride.driver_id);

        // Route overlap score
        let originClose = false;
        let destClose = false;

        const rideOriginLat = Number(ride.origin_lat);
        const rideOriginLng = Number(ride.origin_lng);
        const rideDestLat = Number(ride.destination_lat);
        const rideDestLng = Number(ride.destination_lng);

        for (const o of typicalOrigins) {
          if (haversineKm(o.lat, o.lng, rideOriginLat, rideOriginLng) <= ROUTE_OVERLAP_THRESHOLD_KM) {
            originClose = true;
            break;
          }
        }
        for (const d of typicalDestinations) {
          if (haversineKm(d.lat, d.lng, rideDestLat, rideDestLng) <= ROUTE_OVERLAP_THRESHOLD_KM) {
            destClose = true;
            break;
          }
        }

        let routeScore: number;
        if (originClose && destClose) routeScore = 1.0;
        else if (originClose || destClose) routeScore = 0.5;
        else routeScore = typicalOrigins.length === 0 ? 0.3 : 0; // give some base score if no history

        // Time proximity score
        let timeScore = 0.3; // default if no history
        if (typicalHours.length > 0) {
          const rideHour = new Date(ride.departure_time).getHours();
          const minHourDiff = Math.min(
            ...typicalHours.map((h) => {
              const diff = Math.abs(h - rideHour);
              return Math.min(diff, 24 - diff); // wrap around midnight
            }),
          );
          timeScore = normalise(minHourDiff, 4); // 4 hour window
        }

        // Social closeness score
        const socialScore = isFriend ? 1.0 : 0.6;

        // Composite
        const matchScore =
          routeScore * 0.4 + timeScore * 0.3 + socialScore * 0.3;

        matches.push({
          ride_id: ride.id,
          driver_id: ride.driver_id,
          driver_name: driver?.full_name ?? 'Unknown',
          driver_avatar: driver?.avatar_url ?? null,
          origin: ride.origin,
          destination: ride.destination,
          departure_time: ride.departure_time,
          seats_available: ride.available_seats,
          match_score: Math.round(matchScore * 100) / 100,
          is_friend: isFriend,
          shared_group: sharedGroup,
        });
      }

      // Sort by score descending
      matches.sort((a, b) => b.match_score - a.match_score);

      return matches;
    } catch (err) {
      console.error('[socialRideMatchService.getMatchesForUser]', err);
      return [];
    }
  },

  /**
   * Group ride suggestions: rides from the same social group heading to
   * similar destinations.
   */
  async getGroupRideSuggestions(
    userId: string,
  ): Promise<{ group: string; rides: RideMatch[] }[]> {
    try {
      // 1. Get user's groups
      const { data: myMemberships, error: memError } = await supabase
        .from('social_group_members')
        .select('group_id, social_groups:group_id (name)')
        .eq('user_id', userId);

      if (memError) throw memError;
      if (!myMemberships || myMemberships.length === 0) return [];

      const groupMap = new Map<string, string>();
      for (const m of myMemberships) {
        const group: any = unwrap(m.social_groups);
        if (group?.name) {
          groupMap.set(m.group_id, group.name);
        }
      }

      const groupIds = Array.from(groupMap.keys());

      // 2. Get members of those groups (excluding the current user)
      const { data: allMembers, error: allMemError } = await supabase
        .from('social_group_members')
        .select('group_id, user_id')
        .in('group_id', groupIds)
        .neq('user_id', userId)
        .limit(200);

      if (allMemError) throw allMemError;
      if (!allMembers || allMembers.length === 0) return [];

      // Build group -> member IDs map
      const groupMembersMap = new Map<string, string[]>();
      for (const m of allMembers) {
        const list = groupMembersMap.get(m.group_id) ?? [];
        list.push(m.user_id);
        groupMembersMap.set(m.group_id, list);
      }

      // 3. Fetch active rides from all group members
      const allMemberIds = Array.from(
        new Set(allMembers.map((m) => m.user_id)),
      );

      const { data: rides, error: ridesError } = await supabase
        .from('rides')
        .select(
          `id, driver_id, origin, destination, departure_time,
           available_seats, destination_lat, destination_lng,
           profiles:driver_id (full_name, avatar_url)`,
        )
        .in('driver_id', allMemberIds)
        .eq('status', 'active')
        .gt('departure_time', new Date().toISOString())
        .gt('available_seats', 0)
        .order('departure_time', { ascending: true })
        .limit(100);

      if (ridesError) throw ridesError;
      if (!rides || rides.length === 0) return [];

      // Check friend status for all drivers
      const { data: friendships } = await supabase
        .from('friendships')
        .select('user_a, user_b')
        .or(`user_a.eq.${userId},user_b.eq.${userId}`);

      const friendIdSet = new Set<string>();
      (friendships ?? []).forEach((f) => {
        friendIdSet.add(f.user_a === userId ? f.user_b : f.user_a);
      });

      // 4. Group rides by social group
      const results: { group: string; rides: RideMatch[] }[] = [];

      groupMap.forEach((groupName, groupId) => {
        const memberIds = new Set(groupMembersMap.get(groupId) ?? []);
        const groupRides: RideMatch[] = [];

        for (const ride of rides) {
          if (!memberIds.has(ride.driver_id)) continue;

          const driver: any = unwrap(ride.profiles);

          groupRides.push({
            ride_id: ride.id,
            driver_id: ride.driver_id,
            driver_name: driver?.full_name ?? 'Unknown',
            driver_avatar: driver?.avatar_url ?? null,
            origin: ride.origin,
            destination: ride.destination,
            departure_time: ride.departure_time,
            seats_available: ride.available_seats,
            match_score: friendIdSet.has(ride.driver_id) ? 1.0 : 0.6,
            is_friend: friendIdSet.has(ride.driver_id),
            shared_group: groupName,
          });
        }

        if (groupRides.length > 0) {
          // Cluster by destination proximity
          groupRides.sort((a, b) => b.match_score - a.match_score);
          results.push({ group: groupName, rides: groupRides });
        }
      });

      // Sort groups by most rides first
      results.sort((a, b) => b.rides.length - a.rides.length);

      return results;
    } catch (err) {
      console.error('[socialRideMatchService.getGroupRideSuggestions]', err);
      return [];
    }
  },
};
