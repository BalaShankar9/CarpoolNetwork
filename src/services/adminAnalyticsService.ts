/**
 * Admin Analytics Service
 *
 * Provides typed functions for fetching admin dashboard analytics data.
 * Uses secure aggregate queries - no personal user data exposed.
 * Includes in-memory caching to prevent redundant requests.
 */

import { supabase } from '../lib/supabase';
import type {
  AnalyticsFilters,
  KpiSummary,
  TimeSeries,
  TimeSeriesPoint,
  TopRoute,
  GeoDistribution,
  OpsHealth,
  RideTypePerformance,
  FunnelStage,
  RetentionCohort,
  PeakTime,
  PeriodComparison,
  TimeSeriesMetric,
  AnalyticsCacheEntry,
} from '../types/analytics';

// Cache configuration
const CACHE_TTL_MS = 60 * 1000; // 60 seconds
const cache = new Map<string, AnalyticsCacheEntry<unknown>>();

// Generate a hash for cache key
function generateCacheKey(prefix: string, filters: AnalyticsFilters | Record<string, unknown>): string {
  return `${prefix}:${JSON.stringify(filters)}`;
}

// Check if cache entry is valid
function isCacheValid<T>(entry: AnalyticsCacheEntry<T> | undefined): boolean {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

// Get from cache
function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key) as AnalyticsCacheEntry<T> | undefined;
  if (isCacheValid(entry)) {
    return entry!.data;
  }
  cache.delete(key);
  return null;
}

// Set in cache
function setInCache<T>(key: string, data: T, filterHash: string): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    filterHash,
  });
}

// Clear all cache entries
export function clearAdminAnalyticsCache(): void {
  cache.clear();
}

// Helper to calculate period for delta comparisons
function getPreviousPeriod(startDate: string, endDate: string): { prevStart: string; prevEnd: string } {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const duration = end.getTime() - start.getTime();

  const prevEnd = new Date(start.getTime() - 1); // Day before start
  const prevStart = new Date(prevEnd.getTime() - duration);

  return {
    prevStart: prevStart.toISOString().split('T')[0],
    prevEnd: prevEnd.toISOString().split('T')[0],
  };
}

// Helper to build ride type filter
function buildRideTypeFilter(query: any, rideType?: string) {
  if (rideType && rideType !== 'all') {
    return query.eq('ride_type', rideType);
  }
  return query;
}

/**
 * Get KPI Summary with deltas compared to previous period
 * Prefers secure RPC, falls back to direct queries if RPC not available
 */
export async function getKpiSummary(filters: AnalyticsFilters): Promise<KpiSummary> {
  const cacheKey = generateCacheKey('admin-kpi', filters);
  const cached = getFromCache<KpiSummary>(cacheKey);
  if (cached) return cached;

  const { startDate, endDate, segment, rideType } = filters;

  try {
    // Try secure RPC first
    const { data: rpcData, error: rpcError } = await supabase.rpc('admin_kpi_summary', {
      start_ts: new Date(startDate).toISOString(),
      end_ts: new Date(endDate + 'T23:59:59').toISOString(),
      p_community_id: filters.communityId || null,
      p_segment: segment || 'all',
      p_ride_type: rideType || null,
    });

    if (!rpcError && rpcData && rpcData.length > 0) {
      const d = rpcData[0];
      const kpis: KpiSummary = {
        activeUsers: Number(d.active_users) || 0,
        activeUsersDelta: Number(d.active_users_delta) || 0,
        newUsers: Number(d.new_users) || 0,
        newUsersDelta: Number(d.new_users_delta) || 0,
        ridesPosted: Number(d.rides_posted) || 0,
        ridesPostedDelta: Number(d.rides_posted_delta) || 0,
        bookingsCreated: Number(d.bookings_created) || 0,
        bookingsCreatedDelta: Number(d.bookings_created_delta) || 0,
        completionRate: Number(d.completion_rate) || 0,
        completionRateDelta: Number(d.completion_rate_delta) || 0,
        cancellationRate: Number(d.cancellation_rate) || 0,
        cancellationRateDelta: Number(d.cancellation_rate_delta) || 0,
        fillRate: Number(d.fill_rate) || 0,
        fillRateDelta: Number(d.fill_rate_delta) || 0,
        messagesSent: Number(d.messages_sent) || 0,
        messagesSentDelta: Number(d.messages_sent_delta) || 0,
      };
      setInCache(cacheKey, kpis, JSON.stringify(filters));
      return kpis;
    }

    // Fallback to direct queries if RPC not available
    console.warn('admin_kpi_summary RPC not available, using fallback queries');
    return await getKpiSummaryFallback(filters);
  } catch (error) {
    console.error('Error fetching admin KPI summary:', error);
    return getEmptyKpis();
  }
}

// Helper to return empty KPIs on error
function getEmptyKpis(): KpiSummary {
  return {
    activeUsers: 0, activeUsersDelta: 0,
    newUsers: 0, newUsersDelta: 0,
    ridesPosted: 0, ridesPostedDelta: 0,
    bookingsCreated: 0, bookingsCreatedDelta: 0,
    completionRate: 0, completionRateDelta: 0,
    cancellationRate: 0, cancellationRateDelta: 0,
    fillRate: 0, fillRateDelta: 0,
    messagesSent: 0, messagesSentDelta: 0,
  };
}

// Fallback function using direct queries
async function getKpiSummaryFallback(filters: AnalyticsFilters): Promise<KpiSummary> {
  const { startDate, endDate, rideType } = filters;
  const { prevStart, prevEnd } = getPreviousPeriod(startDate, endDate);
  const cacheKey = generateCacheKey('admin-kpi', filters);

  try {
    // Current period queries
    let ridesQuery = supabase
      .from('rides')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startDate)
      .lte('created_at', endDate);
    if (rideType && rideType !== 'all') {
      ridesQuery = ridesQuery.eq('ride_type', rideType);
    }

    const [
      ridesResult,
      bookingsResult,
      newUsersResult,
      messagesResult,
      completionResult,
    ] = await Promise.all([
      ridesQuery,
      supabase
        .from('ride_bookings')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startDate)
        .lte('created_at', endDate),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startDate)
        .lte('created_at', endDate),
      supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startDate)
        .lte('created_at', endDate),
      supabase.from('ride_completion_stats').select('*').maybeSingle(),
    ]);

    // Active users (unique users who posted or booked rides)
    const { data: activeDrivers } = await supabase
      .from('rides')
      .select('driver_id')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    const { data: activePassengers } = await supabase
      .from('ride_bookings')
      .select('passenger_id')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    const uniqueActiveUsers = new Set([
      ...(activeDrivers?.map(r => r.driver_id) || []),
      ...(activePassengers?.map(b => b.passenger_id) || []),
    ]).size;

    // Previous period queries for deltas
    let prevRidesQuery = supabase
      .from('rides')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', prevStart)
      .lte('created_at', prevEnd);
    if (rideType && rideType !== 'all') {
      prevRidesQuery = prevRidesQuery.eq('ride_type', rideType);
    }

    const [prevRides, prevBookings, prevNewUsers] = await Promise.all([
      prevRidesQuery,
      supabase
        .from('ride_bookings')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', prevStart)
        .lte('created_at', prevEnd),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', prevStart)
        .lte('created_at', prevEnd),
    ]);

    // Calculate deltas
    const calculateDelta = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const currentRides = ridesResult.count || 0;
    const currentBookings = bookingsResult.count || 0;
    const currentNewUsers = newUsersResult.count || 0;
    const prevRidesCount = prevRides.count || 0;
    const prevBookingsCount = prevBookings.count || 0;
    const prevNewUsersCount = prevNewUsers.count || 0;

    const completion = completionResult.data;

    const kpis: KpiSummary = {
      activeUsers: uniqueActiveUsers,
      activeUsersDelta: 0, // Would need separate query for prev period
      newUsers: currentNewUsers,
      newUsersDelta: calculateDelta(currentNewUsers, prevNewUsersCount),
      ridesPosted: currentRides,
      ridesPostedDelta: calculateDelta(currentRides, prevRidesCount),
      bookingsCreated: currentBookings,
      bookingsCreatedDelta: calculateDelta(currentBookings, prevBookingsCount),
      completionRate: completion?.completion_rate || 0,
      completionRateDelta: 0,
      cancellationRate: completion
        ? Math.round((completion.cancelled_rides / (completion.total_rides || 1)) * 100)
        : 0,
      cancellationRateDelta: 0,
      fillRate: 0,
      fillRateDelta: 0,
      messagesSent: messagesResult.count || 0,
      messagesSentDelta: 0,
    };

    setInCache(cacheKey, kpis, JSON.stringify(filters));
    return kpis;
  } catch (error) {
    console.error('Error in KPI summary fallback:', error);
    return getEmptyKpis();
  }
}

/**
 * Get time series data for a specific metric
 * Prefers secure RPC, falls back to direct queries if RPC not available
 */
export async function getTimeSeries(
  metric: TimeSeriesMetric,
  filters: AnalyticsFilters
): Promise<TimeSeries> {
  const cacheKey = generateCacheKey(`admin-timeseries:${metric}`, filters);
  const cached = getFromCache<TimeSeries>(cacheKey);
  if (cached) return cached;

  const { startDate, endDate } = filters;

  try {
    // Try secure RPC first
    const { data: rpcData, error: rpcError } = await supabase.rpc('admin_timeseries', {
      start_ts: new Date(startDate).toISOString(),
      end_ts: new Date(endDate + 'T23:59:59').toISOString(),
      p_metric: metric,
      p_community_id: filters.communityId || null,
      p_ride_type: filters.rideType || null,
    });

    if (!rpcError && rpcData) {
      const data: TimeSeriesPoint[] = (rpcData as { date: string; value: number }[]).map(r => ({
        date: r.date,
        value: Number(r.value) || 0,
      }));
      const result: TimeSeries = { metric, data };
      setInCache(cacheKey, result, JSON.stringify(filters));
      return result;
    }

    // Fallback to direct queries
    console.warn('admin_timeseries RPC not available, using fallback queries');
    let data: TimeSeriesPoint[] = [];

    switch (metric) {
      case 'rides': {
        const { data: rides } = await supabase
          .from('daily_metrics')
          .select('date, count')
          .eq('metric_type', 'rides')
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date');

        data = (rides || []).map(r => ({
          date: r.date,
          value: r.count,
        }));
        break;
      }
      case 'bookings': {
        const { data: bookings } = await supabase
          .from('daily_metrics')
          .select('date, count')
          .eq('metric_type', 'bookings')
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date');

        data = (bookings || []).map(b => ({
          date: b.date,
          value: b.count,
        }));
        break;
      }
      case 'users': {
        const periodDays = Math.ceil(
          (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        const { data: users } = await supabase.rpc('get_user_growth', {
          period_days: periodDays,
        });

        data = (users || []).map((u: { date: string; new_users: number }) => ({
          date: u.date,
          value: u.new_users,
        }));
        break;
      }
      case 'messages': {
        // If daily_metrics doesn't have messages, aggregate directly
        const { data: msgData } = await supabase
          .from('chat_messages')
          .select('created_at')
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        // Aggregate by day
        const dayMap = new Map<string, number>();
        (msgData || []).forEach(m => {
          const day = m.created_at.split('T')[0];
          dayMap.set(day, (dayMap.get(day) || 0) + 1);
        });

        data = Array.from(dayMap.entries())
          .map(([date, value]) => ({ date, value }))
          .sort((a, b) => a.date.localeCompare(b.date));
        break;
      }
      default:
        break;
    }

    const result: TimeSeries = { metric, data };
    setInCache(cacheKey, result, JSON.stringify(filters));
    return result;
  } catch (error) {
    console.error(`Error fetching time series for ${metric}:`, error);
    return { metric, data: [] };
  }
}

/**
 * Get top routes by ride/booking count
 * Prefers secure RPC, falls back to direct queries if RPC not available
 */
export async function getTopRoutes(filters: AnalyticsFilters, limit = 10): Promise<TopRoute[]> {
  const cacheKey = generateCacheKey('admin-topRoutes', { ...filters, limit });
  const cached = getFromCache<TopRoute[]>(cacheKey);
  if (cached) return cached;

  try {
    // Try secure RPC first
    const { data: rpcData, error: rpcError } = await supabase.rpc('admin_top_routes', {
      start_ts: new Date(filters.startDate).toISOString(),
      end_ts: new Date(filters.endDate + 'T23:59:59').toISOString(),
      p_community_id: filters.communityId || null,
      p_limit: limit,
    });

    if (!rpcError && rpcData) {
      const routes: TopRoute[] = (rpcData as {
        origin: string;
        destination: string;
        ride_count: number;
        booking_count: number;
        avg_fill_rate: number;
      }[]).map(r => ({
        origin: r.origin || 'Unknown',
        destination: r.destination || 'Unknown',
        rideCount: Number(r.ride_count) || 0,
        bookingCount: Number(r.booking_count) || 0,
        avgFillRate: Number(r.avg_fill_rate) || 0,
      }));
      setInCache(cacheKey, routes, JSON.stringify(filters));
      return routes;
    }

    // Fallback to direct queries
    console.warn('admin_top_routes RPC not available, using fallback queries');
    const { data } = await supabase
      .from('popular_routes')
      .select('origin, destination, ride_count, unique_drivers, avg_seats')
      .limit(limit);

    const routes: TopRoute[] = (data || []).map(r => ({
      origin: r.origin || 'Unknown',
      destination: r.destination || 'Unknown',
      rideCount: r.ride_count || 0,
      bookingCount: 0,
      avgFillRate: r.avg_seats ? Math.min(100, (r.avg_seats / 4) * 100) : 0,
    }));

    setInCache(cacheKey, routes, JSON.stringify(filters));
    return routes;
  } catch (error) {
    console.error('Error fetching top routes:', error);
    return [];
  }
}

/**
 * Get geographic distribution of rides/users
 * Prefers secure RPC, falls back to direct queries if RPC not available
 */
export async function getGeoDistribution(filters: AnalyticsFilters): Promise<GeoDistribution[]> {
  const cacheKey = generateCacheKey('admin-geoDistribution', filters);
  const cached = getFromCache<GeoDistribution[]>(cacheKey);
  if (cached) return cached;

  try {
    // Try secure RPC first
    const { data: rpcData, error: rpcError } = await supabase.rpc('admin_geo_distribution', {
      start_ts: new Date(filters.startDate).toISOString(),
      end_ts: new Date(filters.endDate + 'T23:59:59').toISOString(),
      p_community_id: filters.communityId || null,
    });

    if (!rpcError && rpcData) {
      const distribution: GeoDistribution[] = (rpcData as {
        area: string;
        rides: number;
        bookings: number;
        users: number;
      }[]).map(d => ({
        area: d.area || 'Unknown',
        rides: Number(d.rides) || 0,
        bookings: Number(d.bookings) || 0,
        users: Number(d.users) || 0,
      }));
      setInCache(cacheKey, distribution, JSON.stringify(filters));
      return distribution;
    }

    // Fallback to direct queries
    console.warn('admin_geo_distribution RPC not available, using fallback queries');
    const { data } = await supabase.rpc('get_geographic_distribution');

    const distribution: GeoDistribution[] = (data || [])
      .slice(0, 20)
      .map((d: { location: string; ride_count: number }) => ({
        area: d.location || 'Unknown',
        rides: d.ride_count || 0,
        bookings: 0,
        users: 0,
      }));

    setInCache(cacheKey, distribution, JSON.stringify(filters));
    return distribution;
  } catch (error) {
    console.error('Error fetching geo distribution:', error);
    return [];
  }
}

/**
 * Get operational health metrics
 * Prefers secure RPC, falls back to direct queries if RPC not available
 */
export async function getOpsHealth(filters: AnalyticsFilters): Promise<OpsHealth> {
  const cacheKey = generateCacheKey('admin-opsHealth', filters);
  const cached = getFromCache<OpsHealth>(cacheKey);
  if (cached) return cached;

  const defaultHealth: OpsHealth = {
    jobFailures: 0,
    notificationFailures: 0,
    errorEvents: 0,
    avgLatency: null,
    systemStatus: 'healthy',
  };

  try {
    // Try secure RPC first
    const { data: rpcData, error: rpcError } = await supabase.rpc('admin_ops_health', {
      start_ts: new Date(filters.startDate).toISOString(),
      end_ts: new Date(filters.endDate + 'T23:59:59').toISOString(),
    });

    if (!rpcError && rpcData && rpcData.length > 0) {
      const d = rpcData[0];
      const health: OpsHealth = {
        jobFailures: Number(d.job_failures) || 0,
        notificationFailures: Number(d.notification_failures) || 0,
        errorEvents: Number(d.error_events) || 0,
        avgLatency: d.avg_latency_ms != null ? Number(d.avg_latency_ms) : null,
        systemStatus: d.system_status || 'healthy',
      };
      setInCache(cacheKey, health, JSON.stringify(filters));
      return health;
    }

    // Fallback to direct queries
    console.warn('admin_ops_health RPC not available, using fallback queries');
    // Try to query system_events table if it exists
    const { count: errorCount, error } = await supabase
      .from('system_events')
      .select('id', { count: 'exact', head: true })
      .eq('severity', 'error')
      .gte('created_at', filters.startDate)
      .lte('created_at', filters.endDate);

    if (error) {
      // Table might not exist
      console.warn('system_events table not found, returning default ops health');
      return defaultHealth;
    }

    const health: OpsHealth = {
      jobFailures: 0,
      notificationFailures: 0,
      errorEvents: errorCount || 0,
      avgLatency: null,
      systemStatus: (errorCount || 0) > 10 ? 'degraded' : 'healthy',
    };

    setInCache(cacheKey, health, JSON.stringify(filters));
    return health;
  } catch (error) {
    console.warn('Error fetching ops health:', error);
    return defaultHealth;
  }
}

/**
 * Get ride type performance metrics
 */
export async function getRideTypePerformance(): Promise<RideTypePerformance[]> {
  const cacheKey = 'admin-rideTypePerformance';
  const cached = getFromCache<RideTypePerformance[]>(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await supabase.rpc('get_ride_type_performance');

    if (error) {
      console.warn('get_ride_type_performance RPC not found');
      return [];
    }

    const performance: RideTypePerformance[] = (data || []).map((d: {
      ride_type: string;
      total_rides: number;
      completion_rate: number;
      avg_booking_rate: number;
      avg_seats_filled: number;
      cancellation_rate: number;
    }) => ({
      rideType: d.ride_type || 'one_time',
      totalRides: d.total_rides || 0,
      completionRate: d.completion_rate || 0,
      avgBookingRate: d.avg_booking_rate || 0,
      avgSeatsFilled: d.avg_seats_filled || 0,
      cancellationRate: d.cancellation_rate || 0,
    }));

    setInCache(cacheKey, performance, 'static');
    return performance;
  } catch (error) {
    console.error('Error fetching ride type performance:', error);
    return [];
  }
}

/**
 * Get booking funnel data
 */
export async function getBookingFunnel(periodDays = 30): Promise<FunnelStage[]> {
  const cacheKey = `admin-bookingFunnel:${periodDays}`;
  const cached = getFromCache<FunnelStage[]>(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await supabase.rpc('get_booking_funnel', { period_days: periodDays });

    if (error) {
      console.warn('get_booking_funnel RPC not found');
      return [];
    }

    const funnel: FunnelStage[] = (data || []).map((d: { stage: string; count: number; percentage: number }) => ({
      stage: d.stage,
      count: d.count || 0,
      percentage: d.percentage || 0,
    }));

    setInCache(cacheKey, funnel, String(periodDays));
    return funnel;
  } catch (error) {
    console.error('Error fetching booking funnel:', error);
    return [];
  }
}

/**
 * Get retention cohort data
 */
export async function getRetentionMetrics(): Promise<RetentionCohort[]> {
  const cacheKey = 'admin-retentionMetrics';
  const cached = getFromCache<RetentionCohort[]>(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await supabase.rpc('get_retention_metrics');

    if (error) {
      console.warn('get_retention_metrics RPC not found');
      return [];
    }

    const retention: RetentionCohort[] = (data || []).map((d: {
      cohort_month: string;
      users_count: number;
      retained_users: number;
      retention_rate: number;
    }) => ({
      cohortMonth: d.cohort_month,
      usersCount: d.users_count || 0,
      retainedUsers: d.retained_users || 0,
      retentionRate: d.retention_rate || 0,
    }));

    setInCache(cacheKey, retention, 'static');
    return retention;
  } catch (error) {
    console.error('Error fetching retention metrics:', error);
    return [];
  }
}

/**
 * Get peak usage times
 */
export async function getPeakTimes(): Promise<PeakTime[]> {
  const cacheKey = 'admin-peakTimes';
  const cached = getFromCache<PeakTime[]>(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await supabase.rpc('get_peak_times');

    if (error) {
      console.warn('get_peak_times RPC not found');
      return [];
    }

    const peaks: PeakTime[] = (data || []).map((d: { hour_of_day: number; ride_count: number; avg_seats: number }) => ({
      hour: d.hour_of_day,
      rideCount: d.ride_count || 0,
      avgSeats: d.avg_seats || 0,
    }));

    setInCache(cacheKey, peaks, 'static');
    return peaks;
  } catch (error) {
    console.error('Error fetching peak times:', error);
    return [];
  }
}

/**
 * Get period comparison metrics
 */
export async function getPeriodComparison(
  currentStart: string,
  currentEnd: string,
  previousStart: string,
  previousEnd: string
): Promise<PeriodComparison[]> {
  const cacheKey = generateCacheKey('admin-periodComparison', { currentStart, currentEnd, previousStart, previousEnd });
  const cached = getFromCache<PeriodComparison[]>(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await supabase.rpc('get_period_comparison', {
      current_start: currentStart,
      current_end: currentEnd,
      previous_start: previousStart,
      previous_end: previousEnd,
    });

    if (error) {
      console.warn('get_period_comparison RPC not found');
      return [];
    }

    const comparison: PeriodComparison[] = (data || []).map((d: {
      metric: string;
      current_value: number;
      previous_value: number;
      change_percentage: number;
    }) => ({
      metric: d.metric,
      currentValue: d.current_value || 0,
      previousValue: d.previous_value || 0,
      changePercentage: d.change_percentage || 0,
    }));

    setInCache(cacheKey, comparison, JSON.stringify({ currentStart, currentEnd }));
    return comparison;
  } catch (error) {
    console.error('Error fetching period comparison:', error);
    return [];
  }
}

/**
 * Get community growth data by city
 */
export async function getCommunityGrowth(periodDays = 30): Promise<{
  city: string;
  newUsers: number;
  newDrivers: number;
  ridesCreated: number;
  bookingsMade: number;
}[]> {
  const cacheKey = `admin-communityGrowth:${periodDays}`;
  const cached = getFromCache<{
    city: string;
    newUsers: number;
    newDrivers: number;
    ridesCreated: number;
    bookingsMade: number;
  }[]>(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await supabase.rpc('get_community_growth', { period_days: periodDays });

    if (error) {
      console.warn('get_community_growth RPC not found');
      return [];
    }

    const growth = (data || []).map((d: {
      city: string;
      new_users: number;
      new_drivers: number;
      rides_created: number;
      bookings_made: number;
    }) => ({
      city: d.city || 'Unknown',
      newUsers: d.new_users || 0,
      newDrivers: d.new_drivers || 0,
      ridesCreated: d.rides_created || 0,
      bookingsMade: d.bookings_made || 0,
    }));

    setInCache(cacheKey, growth, String(periodDays));
    return growth;
  } catch (error) {
    console.error('Error fetching community growth:', error);
    return [];
  }
}

/**
 * User segment distribution
 */
export interface UserSegment {
  segment: string;
  count: number;
  percentage: number;
}

/**
 * Get user segments distribution
 * Uses secure RPC that returns aggregate counts only
 */
export async function getUserSegments(filters: AnalyticsFilters): Promise<UserSegment[]> {
  const cacheKey = generateCacheKey('admin-userSegments', filters);
  const cached = getFromCache<UserSegment[]>(cacheKey);
  if (cached) return cached;

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('admin_user_segments', {
      start_ts: new Date(filters.startDate).toISOString(),
      end_ts: new Date(filters.endDate + 'T23:59:59').toISOString(),
      p_community_id: filters.communityId || null,
    });

    if (!rpcError && rpcData) {
      const segments: UserSegment[] = (rpcData as {
        segment: string;
        count: number;
        percentage: number;
      }[]).map(d => ({
        segment: d.segment || 'Unknown',
        count: Number(d.count) || 0,
        percentage: Number(d.percentage) || 0,
      }));
      setInCache(cacheKey, segments, JSON.stringify(filters));
      return segments;
    }

    // Fallback: query profiles directly for basic segmentation
    console.warn('admin_user_segments RPC not available, using fallback');
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('role')
      .gte('created_at', filters.startDate)
      .lte('created_at', filters.endDate);

    if (error) return [];

    // Count by role
    const roleMap = new Map<string, number>();
    (profiles || []).forEach((p: { role: string }) => {
      const role = p.role || 'unknown';
      roleMap.set(role, (roleMap.get(role) || 0) + 1);
    });

    const total = profiles?.length || 1;
    const segments: UserSegment[] = Array.from(roleMap.entries()).map(([segment, count]) => ({
      segment,
      count,
      percentage: Math.round((count / total) * 100),
    }));

    setInCache(cacheKey, segments, JSON.stringify(filters));
    return segments;
  } catch (error) {
    console.error('Error fetching user segments:', error);
    return [];
  }
}

export default {
  getKpiSummary,
  getTimeSeries,
  getTopRoutes,
  getGeoDistribution,
  getOpsHealth,
  getRideTypePerformance,
  getBookingFunnel,
  getRetentionMetrics,
  getPeakTimes,
  getPeriodComparison,
  getCommunityGrowth,
  getUserSegments,
  clearAdminAnalyticsCache,
};
