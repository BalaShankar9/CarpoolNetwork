/**
 * Phase C: Reliability Service
 * 
 * TypeScript wrappers for the Phase C database functions.
 * These functions call the Supabase RPC endpoints for:
 * - Ride expiry
 * - Seat reconciliation
 * - Notification repair
 * - Invariant checking
 */

import { supabase } from '@/lib/supabase';

// ============================================================================
// Types
// ============================================================================

export type ViolationSeverity = 'critical' | 'warning' | 'info';

export interface InvariantViolation {
  check: string;
  name: string;
  severity: ViolationSeverity;
  ride_id?: string;
  booking_id?: string;
  [key: string]: unknown;
}

export interface ExpireRidesResult {
  success: boolean;
  rides_expired: number;
  bookings_completed: number;
  notifications_created: number;
}

export interface ReconcileSeatsResult {
  success: boolean;
  mismatches_found: number;
  mismatches_fixed: number;
}

export interface RepairNotificationsResult {
  success: boolean;
  booking_requests_created: number;
  confirmations_created: number;
  cancellations_created: number;
  total_notifications_created: number;
}

export interface CheckInvariantsResult {
  success: boolean;
  healthy: boolean;
  total_violations: number;
  violations: InvariantViolation[];
}

export interface JobStatus {
  job_name: string;
  status: 'running' | 'completed' | 'failed';
  completed_at: string | null;
  records_processed: number;
}

export interface SystemHealthSummary {
  timestamp: string;
  total_rides: number;
  active_rides: number;
  in_progress_rides: number;
  total_bookings: number;
  pending_bookings: number;
  confirmed_bookings: number;
  expired_active_rides: number;
  seat_mismatches: number;
  unresolved_violations: number;
  recent_job_status: JobStatus[] | null;
}

// ============================================================================
// Ride Expiry
// ============================================================================

/**
 * Expires all rides past their departure_time or available_until.
 * Updates bookings to 'completed' and creates notifications.
 * 
 * Safe to call multiple times (idempotent).
 * Uses SKIP LOCKED for concurrent safety.
 */
export async function expireRides(): Promise<ExpireRidesResult> {
  const { data, error } = await supabase.rpc('expire_rides');
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data as ExpireRidesResult;
}

// ============================================================================
// Seat Reconciliation
// ============================================================================

/**
 * Reconciles available_seats with actual booking counts.
 * Finds and fixes any mismatches, logging discrepancies to admin_audit_log.
 * 
 * Safe to call multiple times (idempotent).
 */
export async function reconcileSeatCounts(): Promise<ReconcileSeatsResult> {
  const { data, error } = await supabase.rpc('reconcile_seat_counts');
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data as ReconcileSeatsResult;
}

// ============================================================================
// Notification Repair
// ============================================================================

/**
 * Finds and creates missing booking notifications.
 * Only repairs bookings from the last 30 days.
 * Created notifications are marked with repaired=true.
 * 
 * Safe to call multiple times (uses ON CONFLICT DO NOTHING).
 */
export async function repairMissingNotifications(): Promise<RepairNotificationsResult> {
  const { data, error } = await supabase.rpc('repair_missing_notifications');
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data as RepairNotificationsResult;
}

// ============================================================================
// Invariant Checking
// ============================================================================

/**
 * Comprehensive system health check that validates all critical invariants:
 * - Seat accounting (mismatches, negative, overflow)
 * - State consistency (terminal rides with active bookings)
 * - Valid states only
 * - No duplicate bookings
 * 
 * Logs violations to invariant_violations table.
 */
export async function checkSystemInvariants(): Promise<CheckInvariantsResult> {
  const { data, error } = await supabase.rpc('check_system_invariants');
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data as CheckInvariantsResult;
}

// ============================================================================
// Health Summary
// ============================================================================

/**
 * Quick system health summary for dashboards and monitoring.
 * Returns counts of rides, bookings, and any detected issues.
 */
export async function getSystemHealthSummary(): Promise<SystemHealthSummary> {
  const { data, error } = await supabase.rpc('get_system_health_summary');
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data as SystemHealthSummary;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Run all maintenance jobs in sequence.
 * Useful for manual intervention or testing.
 */
export async function runAllMaintenanceJobs(): Promise<{
  expiry: ExpireRidesResult;
  seats: ReconcileSeatsResult;
  notifications: RepairNotificationsResult;
  invariants: CheckInvariantsResult;
}> {
  const expiry = await expireRides();
  const seats = await reconcileSeatCounts();
  const notifications = await repairMissingNotifications();
  const invariants = await checkSystemInvariants();
  
  return { expiry, seats, notifications, invariants };
}

/**
 * Check if system is healthy (no critical violations).
 */
export async function isSystemHealthy(): Promise<boolean> {
  const result = await checkSystemInvariants();
  return result.healthy;
}

/**
 * Get count of critical issues requiring attention.
 */
export async function getCriticalIssueCount(): Promise<number> {
  const health = await getSystemHealthSummary();
  return health.expired_active_rides + health.seat_mismatches + health.unresolved_violations;
}
