/**
 * Analytics Types
 *
 * Type definitions for the admin analytics dashboard.
 * These types are used by the analytics service and components.
 */

// Filter types for analytics queries
export interface AnalyticsFilters {
  startDate: string; // ISO date string
  endDate: string;
  communityId?: string;
  segment?: 'all' | 'drivers' | 'passengers';
  rideType?: string;
}

export type DateRangePreset = '7d' | '30d' | '90d' | 'custom';

export interface DateRange {
  preset: DateRangePreset;
  startDate: string;
  endDate: string;
}

// KPI Summary response
export interface KpiSummary {
  activeUsers: number;
  activeUsersDelta: number;
  newUsers: number;
  newUsersDelta: number;
  ridesPosted: number;
  ridesPostedDelta: number;
  bookingsCreated: number;
  bookingsCreatedDelta: number;
  completionRate: number;
  completionRateDelta: number;
  cancellationRate: number;
  cancellationRateDelta: number;
  fillRate: number;
  fillRateDelta: number;
  messagesSent: number;
  messagesSentDelta: number;
}

// Time series data point
export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface TimeSeries {
  metric: string;
  data: TimeSeriesPoint[];
}

// Top routes data
export interface TopRoute {
  origin: string;
  destination: string;
  rideCount: number;
  bookingCount: number;
  avgFillRate: number;
}

// Geographic distribution
export interface GeoDistribution {
  area: string;
  rides: number;
  bookings: number;
  users: number;
}

// Ops health metrics
export interface OpsHealth {
  jobFailures: number;
  notificationFailures: number;
  errorEvents: number;
  avgLatency: number | null;
  systemStatus: 'healthy' | 'degraded' | 'critical';
}

// User segment distribution
export interface UserSegment {
  segment: string;
  count: number;
  percentage: number;
}

// Ride type performance
export interface RideTypePerformance {
  rideType: string;
  totalRides: number;
  completionRate: number;
  avgBookingRate: number;
  avgSeatsFilled: number;
  cancellationRate: number;
}

// Booking funnel stage
export interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
}

// Retention metrics
export interface RetentionCohort {
  cohortMonth: string;
  usersCount: number;
  retainedUsers: number;
  retentionRate: number;
}

// Peak times data
export interface PeakTime {
  hour: number;
  rideCount: number;
  avgSeats: number;
}

// Period comparison
export interface PeriodComparison {
  metric: string;
  currentValue: number;
  previousValue: number;
  changePercentage: number;
}

// Chart data types for Recharts
export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface MultiSeriesChartData {
  name: string;
  [key: string]: string | number;
}

// Export format types
export type ExportFormat = 'csv' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  filters: AnalyticsFilters;
  dataType: string;
}

// Analytics dashboard state
export interface AnalyticsDashboardState {
  filters: AnalyticsFilters;
  isLoading: boolean;
  error: string | null;
  kpis: KpiSummary | null;
  timeSeries: Record<string, TimeSeries>;
  lastUpdated: string | null;
}

// Cache entry for analytics data
export interface AnalyticsCacheEntry<T> {
  data: T;
  timestamp: number;
  filterHash: string;
}

// Metric definitions for the dashboard
export interface MetricDefinition {
  id: string;
  label: string;
  description: string;
  unit: string;
  format: 'number' | 'percentage' | 'currency' | 'duration';
  color: string;
  icon: string;
}

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  activeUsers: {
    id: 'activeUsers',
    label: 'Active Users',
    description: 'Users who posted or booked a ride in the period',
    unit: 'users',
    format: 'number',
    color: '#3B82F6', // blue
    icon: 'Users',
  },
  newUsers: {
    id: 'newUsers',
    label: 'New Users',
    description: 'Users who signed up in the period',
    unit: 'users',
    format: 'number',
    color: '#10B981', // green
    icon: 'UserPlus',
  },
  ridesPosted: {
    id: 'ridesPosted',
    label: 'Rides Posted',
    description: 'Total rides created by drivers',
    unit: 'rides',
    format: 'number',
    color: '#6366F1', // indigo
    icon: 'Car',
  },
  bookingsCreated: {
    id: 'bookingsCreated',
    label: 'Bookings',
    description: 'Total booking requests made',
    unit: 'bookings',
    format: 'number',
    color: '#F59E0B', // amber
    icon: 'Calendar',
  },
  completionRate: {
    id: 'completionRate',
    label: 'Completion Rate',
    description: 'Percentage of rides completed successfully',
    unit: '%',
    format: 'percentage',
    color: '#10B981', // green
    icon: 'CheckCircle',
  },
  cancellationRate: {
    id: 'cancellationRate',
    label: 'Cancellation Rate',
    description: 'Percentage of rides cancelled',
    unit: '%',
    format: 'percentage',
    color: '#EF4444', // red
    icon: 'XCircle',
  },
  fillRate: {
    id: 'fillRate',
    label: 'Fill Rate',
    description: 'Average seat utilization per ride',
    unit: '%',
    format: 'percentage',
    color: '#8B5CF6', // purple
    icon: 'Users',
  },
  messagesSent: {
    id: 'messagesSent',
    label: 'Messages Sent',
    description: 'Total chat messages in the period',
    unit: 'messages',
    format: 'number',
    color: '#06B6D4', // cyan
    icon: 'MessageSquare',
  },
};

// Time series metric options
export const TIME_SERIES_METRICS = [
  { value: 'rides', label: 'Rides Posted' },
  { value: 'bookings', label: 'Bookings' },
  { value: 'users', label: 'New Users' },
  { value: 'messages', label: 'Messages' },
  { value: 'completion_rate', label: 'Completion Rate' },
] as const;

export type TimeSeriesMetric = typeof TIME_SERIES_METRICS[number]['value'];

// Interval options for time series
export const TIME_SERIES_INTERVALS = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
] as const;

export type TimeSeriesInterval = typeof TIME_SERIES_INTERVALS[number]['value'];
