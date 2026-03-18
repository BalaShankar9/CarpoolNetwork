import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Car,
  MapPin,
  Clock,
  Users as UsersIcon,
  ChevronRight,
  Armchair,
  Loader2,
  Navigation,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { socialRideMatchService } from '../../../services/socialRideMatchService';
import { toast } from '../../../lib/toast';
import { Link, useNavigate } from 'react-router-dom';
import type { RideMatch } from '../../../types/social';
import WidgetCard from '../shared/WidgetCard';
import PresenceIndicator from '../shared/PresenceIndicator';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_DISPLAYED_MATCHES = 3;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GroupRideSuggestion {
  group_name: string;
  destination: string;
  member_count: number;
  date_label: string;
  rides: RideMatch[];
}

interface PresenceEntry {
  user_id: string;
  status: 'online' | 'idle' | 'offline';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Hash-based stable color for avatar fallback backgrounds. */
function initialColor(name: string): string {
  const colors = [
    'bg-emerald-500',
    'bg-blue-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-amber-500',
    'bg-teal-500',
    'bg-indigo-500',
    'bg-rose-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitial(name: string): string {
  return (name || '?').charAt(0).toUpperCase();
}

/**
 * Format a departure ISO timestamp into a human-friendly label.
 *
 * - "Today, 5:00 PM"
 * - "Tomorrow, 8:30 AM"
 * - "Mon 15 Mar, 7:45 AM"
 */
function formatDepartureTime(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return 'Unknown';

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const dayAfterTomorrow = new Date(todayStart);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  const timeStr = date.toLocaleTimeString('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (date >= todayStart && date < tomorrowStart) {
    return `Today, ${timeStr}`;
  }
  if (date >= tomorrowStart && date < dayAfterTomorrow) {
    return `Tomorrow, ${timeStr}`;
  }

  const dayOfWeek = date.toLocaleDateString('en-GB', { weekday: 'short' });
  const dayNum = date.getDate();
  const month = date.toLocaleDateString('en-GB', { month: 'short' });
  return `${dayOfWeek} ${dayNum} ${month}, ${timeStr}`;
}

/**
 * Relative date label for group ride suggestion aggregation.
 * "today", "tomorrow", or the weekday name.
 */
function relativeDateLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const dayAfterTomorrow = new Date(todayStart);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  if (date >= todayStart && date < tomorrowStart) return 'today';
  if (date >= tomorrowStart && date < dayAfterTomorrow) return 'tomorrow';
  return date.toLocaleDateString('en-GB', { weekday: 'long' });
}

/**
 * Extract the first significant part of a location string.
 * "Manchester, Greater Manchester, UK" -> "Manchester"
 */
function shortLocation(location: string): string {
  if (!location) return 'Unknown';
  const first = location.split(',')[0].trim();
  return first.length > 24 ? first.slice(0, 22) + '...' : first;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Avatar({
  url,
  name,
  size = 'md',
  className = '',
}: {
  url: string | null;
  name: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const sizeClass = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 ${className}`}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${initialColor(name)} ${className}`}
    >
      <span className={textSize}>{getInitial(name)}</span>
    </div>
  );
}

function AvatarWithPresence({
  url,
  name,
  presence,
}: {
  url: string | null;
  name: string;
  presence: 'online' | 'idle' | 'offline';
}) {
  return (
    <div className="relative inline-flex flex-shrink-0">
      <Avatar url={url} name={name} />
      <span className="absolute -bottom-0.5 -right-0.5">
        <PresenceIndicator status={presence} size="md" />
      </span>
    </div>
  );
}

function RelationshipBadge({
  isFriend,
  groupName,
}: {
  isFriend: boolean;
  groupName?: string;
}) {
  if (isFriend) {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold text-blue-600 bg-blue-50">
        Friend
      </span>
    );
  }
  if (groupName) {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold text-purple-600 bg-purple-50 max-w-[100px] truncate">
        {groupName}
      </span>
    );
  }
  return null;
}

function MatchScoreBadge({ score }: { score: number }) {
  const percentage = Math.round(score * 100);
  let color: string;
  let label: string;

  if (percentage >= 70) {
    color = 'text-emerald-600 bg-emerald-50';
    label = 'Great match';
  } else if (percentage >= 40) {
    color = 'text-amber-600 bg-amber-50';
    label = 'Good match';
  } else {
    color = 'text-gray-500 bg-gray-50';
    label = 'Possible match';
  }

  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${color}`}
      title={`${percentage}% match score`}
    >
      <Sparkles className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Ride Card
// ---------------------------------------------------------------------------

function RideMatchCard({
  match,
  presence,
  requesting,
  requested,
  onRequestJoin,
  index,
}: {
  match: RideMatch;
  presence: 'online' | 'idle' | 'offline';
  requesting: boolean;
  requested: boolean;
  onRequestJoin: () => void;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.25 }}
      className="p-3 rounded-xl border border-gray-100 hover:border-gray-200 bg-white hover:shadow-sm transition-all"
    >
      {/* Top row: avatar + name + badges */}
      <div className="flex items-center gap-2.5 mb-2">
        <AvatarWithPresence
          url={match.driver_avatar}
          name={match.driver_name}
          presence={presence}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 truncate">
              {match.driver_name}
            </span>
            <RelationshipBadge
              isFriend={match.is_friend}
              groupName={match.shared_group}
            />
          </div>
          <MatchScoreBadge score={match.match_score} />
        </div>
      </div>

      {/* Route */}
      <div className="flex items-center gap-2 mb-1.5 text-xs text-gray-600">
        <MapPin className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
        <span className="truncate font-medium">
          {shortLocation(match.origin)}
        </span>
        <ArrowRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
        <span className="truncate font-medium">
          {shortLocation(match.destination)}
        </span>
      </div>

      {/* Time + seats row */}
      <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          {formatDepartureTime(match.departure_time)}
        </span>
        <span className="flex items-center gap-1">
          <Armchair className="w-3.5 h-3.5 text-gray-400" />
          {match.seats_available} seat{match.seats_available !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Action button */}
      <motion.button
        whileHover={{ scale: requested ? 1 : 1.02 }}
        whileTap={{ scale: requested ? 1 : 0.97 }}
        onClick={onRequestJoin}
        disabled={requesting || requested}
        className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
          requested
            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default'
            : requesting
              ? 'bg-gray-100 text-gray-400 cursor-wait'
              : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700 shadow-sm'
        }`}
      >
        {requested ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5" />
            Requested
          </>
        ) : requesting ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Navigation className="w-3.5 h-3.5" />
            Request to Join
          </>
        )}
      </motion.button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function RideMatchSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="p-3 rounded-xl border border-gray-100 animate-pulse-soft space-y-2.5"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-gray-200 rounded-full w-2/3" />
              <div className="h-2.5 bg-gray-100 rounded-full w-1/3" />
            </div>
          </div>
          <div className="h-3 bg-gray-100 rounded-full w-5/6" />
          <div className="flex gap-3">
            <div className="h-3 bg-gray-100 rounded-full w-1/3" />
            <div className="h-3 bg-gray-100 rounded-full w-1/4" />
          </div>
          <div className="h-8 bg-gray-100 rounded-lg w-full" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <div className="relative mb-3">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-50 to-blue-100 flex items-center justify-center">
          <Car className="w-6 h-6 text-cyan-400" />
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-white" />
        </div>
      </div>
      <p className="text-sm font-medium text-gray-700 mb-1">
        No ride matches right now
      </p>
      <p className="text-xs text-gray-400 max-w-[220px] mb-3">
        Your friends haven't posted rides matching your routes yet
      </p>
      <Link
        to="/post-ride"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-lg transition-colors shadow-sm"
      >
        <Car className="w-3.5 h-3.5" />
        Post a ride to attract matches
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Group Ride Suggestion Banner
// ---------------------------------------------------------------------------

function GroupSuggestionBanner({
  suggestion,
}: {
  suggestion: GroupRideSuggestion;
}) {
  const navigate = useNavigate();

  // Find the first group ride's group_id to link to group detail
  const firstRide = suggestion.rides[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.2 }}
      className="p-3 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100"
    >
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
          <UsersIcon className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-700">
            <span className="font-semibold">{suggestion.member_count}</span>{' '}
            {suggestion.member_count === 1 ? 'member' : 'members'} of{' '}
            <span className="font-semibold text-purple-700">
              "{suggestion.group_name}"
            </span>{' '}
            {suggestion.member_count === 1 ? 'is' : 'are'} heading to{' '}
            <span className="font-semibold">
              {shortLocation(suggestion.destination)}
            </span>{' '}
            {suggestion.date_label}
          </p>
          <button
            onClick={() => {
              // Navigate to find-rides with the group context
              if (firstRide) {
                navigate('/find-rides');
              }
            }}
            className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-purple-700 bg-white border border-purple-200 hover:bg-purple-50 transition-colors"
          >
            View Group Rides
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ===========================================================================
// MAIN COMPONENT
// ===========================================================================

export default function RideMatchWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Data state
  const [matches, setMatches] = useState<RideMatch[]>([]);
  const [groupSuggestions, setGroupSuggestions] = useState<GroupRideSuggestion[]>([]);
  const [presenceMap, setPresenceMap] = useState<Map<string, PresenceEntry['status']>>(new Map());
  const [loading, setLoading] = useState(true);

  // Action state
  const [requestingRideId, setRequestingRideId] = useState<string | null>(null);
  const [requestedRideIds, setRequestedRideIds] = useState<Set<string>>(new Set());

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const loadMatches = useCallback(async () => {
    if (!user?.id) return;

    try {
      const [matchResults, groupResults] = await Promise.allSettled([
        socialRideMatchService.getMatchesForUser(user.id),
        socialRideMatchService.getGroupRideSuggestions(user.id),
      ]);

      // Process ride matches
      if (matchResults.status === 'fulfilled') {
        setMatches(matchResults.value);

        // Fetch presence for all drivers in matches
        const driverIds = matchResults.value.map((m) => m.driver_id);
        if (driverIds.length > 0) {
          const { data: presenceData } = await supabase
            .from('user_presence')
            .select('user_id, status')
            .in('user_id', driverIds);

          if (presenceData) {
            const map = new Map<string, PresenceEntry['status']>();
            for (const p of presenceData) {
              map.set(p.user_id, (p.status as PresenceEntry['status']) || 'offline');
            }
            setPresenceMap(map);
          }
        }

        // Check if user already has pending bookings for any of these rides
        if (matchResults.value.length > 0) {
          const rideIds = matchResults.value.map((m) => m.ride_id);
          const { data: existingBookings } = await supabase
            .from('ride_bookings')
            .select('ride_id')
            .eq('passenger_id', user.id)
            .in('ride_id', rideIds)
            .in('status', ['pending', 'confirmed', 'PENDING', 'CONFIRMED']);

          if (existingBookings && existingBookings.length > 0) {
            setRequestedRideIds(new Set(existingBookings.map((b) => b.ride_id)));
          }
        }
      }

      // Process group ride suggestions
      if (groupResults.status === 'fulfilled' && groupResults.value.length > 0) {
        const suggestions: GroupRideSuggestion[] = [];

        for (const group of groupResults.value) {
          if (group.rides.length === 0) continue;

          // Find the most common destination and the soonest date
          const destCounts = new Map<string, number>();
          let soonestTime = group.rides[0].departure_time;

          for (const ride of group.rides) {
            const dest = shortLocation(ride.destination);
            destCounts.set(dest, (destCounts.get(dest) || 0) + 1);
            if (new Date(ride.departure_time) < new Date(soonestTime)) {
              soonestTime = ride.departure_time;
            }
          }

          // Pick the most frequent destination
          let topDest = group.rides[0].destination;
          let topCount = 0;
          for (const [dest, count] of destCounts) {
            if (count > topCount) {
              topDest = dest;
              topCount = count;
            }
          }

          suggestions.push({
            group_name: group.group,
            destination: topDest,
            member_count: group.rides.length,
            date_label: relativeDateLabel(soonestTime),
            rides: group.rides,
          });
        }

        setGroupSuggestions(suggestions.slice(0, 2));
      }
    } catch (err) {
      console.error('[RideMatchWidget] loadMatches error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  // -------------------------------------------------------------------------
  // Request to join
  // -------------------------------------------------------------------------

  const requestToJoin = useCallback(
    async (match: RideMatch) => {
      if (!user?.id || requestedRideIds.has(match.ride_id)) return;

      setRequestingRideId(match.ride_id);

      // Optimistic: mark as requested
      setRequestedRideIds((prev) => new Set(prev).add(match.ride_id));

      try {
        // Check if already booked own ride
        if (match.driver_id === user.id) {
          toast.warning('You cannot book your own ride.');
          setRequestedRideIds((prev) => {
            const next = new Set(prev);
            next.delete(match.ride_id);
            return next;
          });
          return;
        }

        const { error } = await supabase.from('ride_bookings').insert({
          ride_id: match.ride_id,
          passenger_id: user.id,
          seats_requested: 1,
          status: 'pending',
        });

        if (error) throw error;

        // Send notification to driver
        await supabase.from('notifications').insert({
          user_id: match.driver_id,
          type: 'ride-request',
          title: 'New Ride Request',
          message: `Someone wants to join your ride from ${shortLocation(match.origin)} to ${shortLocation(match.destination)}`,
          data: { ride_id: match.ride_id, passenger_id: user.id },
        }).then(() => { /* best-effort */ });

        const firstName = match.driver_name.split(' ')[0];
        toast.success(`Ride request sent to ${firstName}!`);
      } catch (err) {
        // Rollback optimistic update
        setRequestedRideIds((prev) => {
          const next = new Set(prev);
          next.delete(match.ride_id);
          return next;
        });

        console.error('[RideMatchWidget] requestToJoin error:', err);
        const msg =
          err instanceof Error ? err.message : 'Failed to send ride request';
        toast.error(msg);
      } finally {
        setRequestingRideId(null);
      }
    },
    [user?.id, requestedRideIds],
  );

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const displayedMatches = useMemo(
    () => matches.slice(0, MAX_DISPLAYED_MATCHES),
    [matches],
  );

  const totalMatchCount = matches.length;
  const hasMatches = displayedMatches.length > 0;
  const hasGroupSuggestions = groupSuggestions.length > 0;
  const isEmpty = !hasMatches && !hasGroupSuggestions;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <WidgetCard
        title="Ride Matches"
        icon={<Car className="w-4 h-4 text-white" />}
        gradient="from-cyan-500 to-blue-600"
        seeAllLink="/find-rides"
        seeAllLabel="Find rides"
        loading
      >
        {null}
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      title="Ride Matches"
      icon={<Car className="w-4 h-4 text-white" />}
      gradient="from-cyan-500 to-blue-600"
      seeAllLink="/find-rides"
      seeAllLabel="Find rides"
      badge={totalMatchCount > 0 ? totalMatchCount : undefined}
    >
      {isEmpty ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {/* ---- Friends / group member rides ---- */}
          {hasMatches && (
            <>
              <div className="flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-cyan-500" />
                <span className="text-xs font-semibold text-gray-600">
                  Friends on your route
                </span>
              </div>

              <AnimatePresence mode="popLayout">
                <div className="space-y-2.5">
                  {displayedMatches.map((match, index) => (
                    <RideMatchCard
                      key={match.ride_id}
                      match={match}
                      presence={presenceMap.get(match.driver_id) || 'offline'}
                      requesting={requestingRideId === match.ride_id}
                      requested={requestedRideIds.has(match.ride_id)}
                      onRequestJoin={() => requestToJoin(match)}
                      index={index}
                    />
                  ))}
                </div>
              </AnimatePresence>

              {/* Show more link */}
              {totalMatchCount > MAX_DISPLAYED_MATCHES && (
                <Link
                  to="/find-rides"
                  className="flex items-center justify-center gap-1 pt-1 text-xs font-medium text-cyan-600 hover:text-cyan-700 transition-colors"
                >
                  View all {totalMatchCount} matches
                  <ChevronRight className="w-3 h-3" />
                </Link>
              )}
            </>
          )}

          {/* ---- Group ride suggestions ---- */}
          {hasGroupSuggestions && (
            <div className={hasMatches ? 'pt-2 border-t border-gray-100' : ''}>
              {groupSuggestions.map((suggestion) => (
                <GroupSuggestionBanner
                  key={`${suggestion.group_name}-${suggestion.destination}`}
                  suggestion={suggestion}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </WidgetCard>
  );
}
