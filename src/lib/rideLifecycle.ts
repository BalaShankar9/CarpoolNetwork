/**
 * Ride Lifecycle Constants and Utilities
 *
 * Defines the ride lifecycle states and provides helper functions
 * for determining ride visibility and available actions.
 */

/**
 * Ride lifecycle states:
 * - active: Ride is available for booking
 * - in-progress: Ride has started (driver on the way)
 * - completed: Ride successfully finished
 * - cancelled: Ride was cancelled by driver
 * - expired: Past departure time without completion (auto-set by sync_expired_ride_state)
 */
export type RideStatus = 'active' | 'in-progress' | 'completed' | 'cancelled' | 'expired';

/**
 * Lifecycle phases based on time:
 * - upcoming: Departure time is in the future
 * - grace: Within 60 minutes after departure time (still joinable/visible)
 * - expired: Beyond grace period and not completed/cancelled
 */
export type LifecyclePhase = 'upcoming' | 'grace' | 'expired';

/**
 * Grace period in minutes after departure time where a ride is still considered "active"
 * This allows for late joiners and prevents rides from immediately disappearing
 */
export const GRACE_PERIOD_MINUTES = 60;

/**
 * Default lookahead for finding rides (hours from now)
 */
export const DEFAULT_LOOKAHEAD_HOURS = 168; // 7 days

/**
 * Calculate the lifecycle phase of a ride based on current time
 *
 * @param departureTime - ISO string of the ride's departure time
 * @param availableUntil - Optional ISO string of when the ride is available until
 * @returns The lifecycle phase: 'upcoming', 'grace', or 'expired'
 */
export function getRideLifecyclePhase(
  departureTime: string,
  availableUntil?: string | null
): LifecyclePhase {
  const now = new Date();
  const departure = new Date(departureTime);
  const gracePeriodEnd = new Date(departure.getTime() + GRACE_PERIOD_MINUTES * 60 * 1000);

  // If availableUntil is set, use it as the "deadline" instead of departure time
  const effectiveDeadline = availableUntil ? new Date(availableUntil) : departure;
  const effectiveGraceEnd = new Date(effectiveDeadline.getTime() + GRACE_PERIOD_MINUTES * 60 * 1000);

  if (now < effectiveDeadline) {
    return 'upcoming';
  } else if (now < effectiveGraceEnd) {
    return 'grace';
  } else {
    return 'expired';
  }
}

/**
 * Check if a ride is past its departure time (including grace period consideration)
 *
 * @param departureTime - ISO string of the ride's departure time
 * @param availableUntil - Optional ISO string of when the ride is available until
 * @param includeGracePeriod - If true, also consider rides in grace period as not expired
 * @returns true if the ride is expired
 */
export function isRideExpired(
  departureTime: string,
  availableUntil?: string | null,
  includeGracePeriod: boolean = false
): boolean {
  const phase = getRideLifecyclePhase(departureTime, availableUntil);

  if (includeGracePeriod) {
    return phase === 'expired';
  }

  // Without grace period consideration, both 'grace' and 'expired' are considered "past"
  return phase === 'grace' || phase === 'expired';
}

/**
 * Check if a ride is still visible for searching (upcoming or within grace period)
 *
 * @param departureTime - ISO string of the ride's departure time
 * @param availableUntil - Optional ISO string of when the ride is available until
 * @param status - The ride's status
 * @returns true if the ride should be visible in search results
 */
export function isRideSearchable(
  departureTime: string,
  availableUntil?: string | null,
  status?: string
): boolean {
  // Cancelled and completed rides are not searchable
  if (status === 'cancelled' || status === 'completed' || status === 'expired') {
    return false;
  }

  const phase = getRideLifecyclePhase(departureTime, availableUntil);

  // Upcoming and grace period rides are searchable
  return phase === 'upcoming' || phase === 'grace';
}

/**
 * Determine what actions are available for a ride based on its state
 *
 * @param departureTime - ISO string of the ride's departure time
 * @param availableUntil - Optional ISO string of when the ride is available until
 * @param status - The ride's current status
 * @param hasConfirmedPassengers - Whether the ride has confirmed passengers
 * @returns Object with boolean flags for each available action
 */
export function getRideActions(
  departureTime: string,
  availableUntil: string | null | undefined,
  status: string,
  hasConfirmedPassengers: boolean = false
): {
  canEdit: boolean;
  canCancel: boolean;
  canDelete: boolean;
  canArchive: boolean;
  canStartTracking: boolean;
  canComplete: boolean;
} {
  const phase = getRideLifecyclePhase(departureTime, availableUntil);
  const isTerminalStatus = status === 'cancelled' || status === 'completed';

  return {
    // Can edit upcoming rides that aren't cancelled/completed
    canEdit: phase === 'upcoming' && !isTerminalStatus,

    // Can cancel any non-terminal ride (even expired ones - for record keeping)
    // This allows drivers to officially mark expired rides as cancelled
    canCancel: !isTerminalStatus,

    // Can delete rides without confirmed passengers (regardless of time)
    // DB-level check via delete_ride_for_driver RPC will enforce this
    canDelete: !hasConfirmedPassengers,

    // Can archive expired rides that aren't in terminal state
    canArchive: phase === 'expired' && !isTerminalStatus,

    // Can start tracking for upcoming/grace period active rides
    canStartTracking: (phase === 'upcoming' || phase === 'grace') &&
      (status === 'active' || status === 'in-progress'),

    // Can complete rides that are in progress or past departure
    canComplete: (phase === 'grace' || phase === 'expired') &&
      (status === 'active' || status === 'in-progress'),
  };
}

/**
 * Get a human-readable label for the ride's lifecycle phase
 */
export function getLifecyclePhaseLabel(phase: LifecyclePhase): string {
  switch (phase) {
    case 'upcoming':
      return 'Upcoming';
    case 'grace':
      return 'Departing Soon';
    case 'expired':
      return 'Past Departure';
  }
}

/**
 * Get the appropriate CSS class for a ride's status badge
 */
export function getRideStatusBadgeClass(
  status: string,
  phase: LifecyclePhase
): string {
  if (status === 'cancelled') {
    return 'bg-red-100 text-red-800';
  }
  if (status === 'completed') {
    return 'bg-green-100 text-green-800';
  }
  if (status === 'expired' || phase === 'expired') {
    return 'bg-gray-200 text-gray-800';
  }
  if (phase === 'grace') {
    return 'bg-amber-100 text-amber-800';
  }
  if (status === 'in-progress') {
    return 'bg-blue-100 text-blue-800';
  }
  // Active, upcoming
  return 'bg-green-100 text-green-800';
}

/**
 * Build a Supabase query filter for finding visible rides
 *
 * This can be used to construct the WHERE clause for ride searches
 * to include rides that are upcoming or within the grace period.
 */
export function getVisibleRidesTimeFilter(): {
  column: string;
  operator: string;
  value: string;
} {
  // Calculate the cutoff time (now minus grace period)
  const cutoffTime = new Date(Date.now() - GRACE_PERIOD_MINUTES * 60 * 1000);

  return {
    column: 'departure_time',
    operator: 'gte',
    value: cutoffTime.toISOString(),
  };
}

export default {
  GRACE_PERIOD_MINUTES,
  DEFAULT_LOOKAHEAD_HOURS,
  getRideLifecyclePhase,
  isRideExpired,
  isRideSearchable,
  getRideActions,
  getLifecyclePhaseLabel,
  getRideStatusBadgeClass,
  getVisibleRidesTimeFilter,
};
