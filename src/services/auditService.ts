import { supabase } from '../lib/supabase';
import { AdminRole } from '../types/admin';

export interface AuditLogEntry {
  action: string;
  targetType?: 'user' | 'ride' | 'report' | 'verification' | 'system' | 'admin';
  targetId?: string;
  details?: Record<string, unknown>;
}

export interface AuditLogRecord {
  id: string;
  admin_id: string;
  admin_role: AdminRole;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  admin?: {
    full_name: string;
    avatar_url: string;
    email: string;
  };
}

export interface GetAuditLogsOptions {
  adminId?: string;
  action?: string;
  targetType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Log an admin action to the audit log
 */
export async function logAdminAction(entry: AuditLogEntry): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('No authenticated user for audit log');
      return false;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('admin_role')
      .eq('id', user.id)
      .single();

    if (!profile?.admin_role) {
      console.warn('User is not an admin');
      return false;
    }

    const { error } = await supabase.from('admin_audit_log').insert({
      admin_id: user.id,
      admin_role: profile.admin_role,
      action: entry.action,
      target_type: entry.targetType || null,
      target_id: entry.targetId || null,
      details: entry.details || {},
    });

    if (error) {
      console.error('Failed to log admin action:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error logging admin action:', error);
    return false;
  }
}

/**
 * Get audit logs with filtering and pagination
 */
export async function getAuditLogs(options: GetAuditLogsOptions = {}) {
  const {
    adminId,
    action,
    targetType,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = options;

  let query = supabase
    .from('admin_audit_log')
    .select(`
      *,
      admin:profiles!admin_id(full_name, avatar_url, email)
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (adminId) {
    query = query.eq('admin_id', adminId);
  }

  if (action) {
    query = query.eq('action', action);
  }

  if (targetType) {
    query = query.eq('target_type', targetType);
  }

  if (startDate) {
    query = query.gte('created_at', startDate.toISOString());
  }

  if (endDate) {
    query = query.lte('created_at', endDate.toISOString());
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching audit logs:', error);
    return { data: [], count: 0, error };
  }

  return { data: data as AuditLogRecord[], count: count || 0, error: null };
}

/**
 * Get audit logs for a specific target
 */
export async function getAuditLogsForTarget(
  targetType: string,
  targetId: string,
  limit = 20
) {
  const { data, error } = await supabase
    .from('admin_audit_log')
    .select(`
      *,
      admin:profiles!admin_id(full_name, avatar_url)
    `)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching target audit logs:', error);
    return [];
  }

  return data as AuditLogRecord[];
}

/**
 * Get unique action types for filtering
 */
export async function getUniqueActions(): Promise<string[]> {
  const { data, error } = await supabase
    .from('admin_audit_log')
    .select('action')
    .order('action');

  if (error) {
    console.error('Error fetching unique actions:', error);
    return [];
  }

  // Get unique values
  const actions = new Set(data?.map(d => d.action) || []);
  return Array.from(actions);
}

/**
 * Get admin activity summary for a date range
 */
export async function getAdminActivitySummary(
  startDate: Date,
  endDate: Date
): Promise<{ adminId: string; adminName: string; actionCount: number }[]> {
  const { data, error } = await supabase
    .from('admin_audit_log')
    .select(`
      admin_id,
      admin:profiles!admin_id(full_name)
    `)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (error) {
    console.error('Error fetching admin activity:', error);
    return [];
  }

  // Group by admin
  const summary = new Map<string, { name: string; count: number }>();

  for (const record of data || []) {
    const existing = summary.get(record.admin_id);
    // Handle both array and object forms of the join
    const adminData = Array.isArray(record.admin)
      ? record.admin[0] as { full_name: string } | undefined
      : record.admin as { full_name: string } | null;
    if (existing) {
      existing.count++;
    } else {
      summary.set(record.admin_id, {
        name: adminData?.full_name || 'Unknown',
        count: 1,
      });
    }
  }

  return Array.from(summary.entries()).map(([adminId, data]) => ({
    adminId,
    adminName: data.name,
    actionCount: data.count,
  })).sort((a, b) => b.actionCount - a.actionCount);
}

// Common action types for consistency
export const AUDIT_ACTIONS = {
  // User actions
  USER_VIEWED: 'user.viewed',
  USER_EDITED: 'user.edited',
  USER_SUSPENDED: 'user.suspended',
  USER_UNSUSPENDED: 'user.unsuspended',
  USER_DELETED: 'user.deleted',
  USER_VERIFIED: 'user.verified',

  // Admin actions
  ADMIN_CREATED: 'admin.created',
  ADMIN_ROLE_CHANGED: 'admin.role_changed',
  ADMIN_REMOVED: 'admin.removed',

  // Safety actions
  REPORT_VIEWED: 'report.viewed',
  REPORT_INVESTIGATION_STARTED: 'report.investigation_started',
  REPORT_RESOLVED: 'report.resolved',
  REPORT_ESCALATED: 'report.escalated',
  REPORT_DISMISSED: 'report.dismissed',

  // Verification actions
  VERIFICATION_APPROVED: 'verification.approved',
  VERIFICATION_REJECTED: 'verification.rejected',

  // System actions
  BULK_OPERATION: 'system.bulk_operation',
  SETTINGS_CHANGED: 'system.settings_changed',
  EXPORT_CREATED: 'system.export_created',
} as const;

// Action display names
export const ACTION_LABELS: Record<string, string> = {
  [AUDIT_ACTIONS.USER_VIEWED]: 'Viewed User',
  [AUDIT_ACTIONS.USER_EDITED]: 'Edited User',
  [AUDIT_ACTIONS.USER_SUSPENDED]: 'Suspended User',
  [AUDIT_ACTIONS.USER_UNSUSPENDED]: 'Unsuspended User',
  [AUDIT_ACTIONS.USER_DELETED]: 'Deleted User',
  [AUDIT_ACTIONS.USER_VERIFIED]: 'Verified User',
  [AUDIT_ACTIONS.ADMIN_CREATED]: 'Created Admin',
  [AUDIT_ACTIONS.ADMIN_ROLE_CHANGED]: 'Changed Admin Role',
  [AUDIT_ACTIONS.ADMIN_REMOVED]: 'Removed Admin',
  [AUDIT_ACTIONS.REPORT_VIEWED]: 'Viewed Report',
  [AUDIT_ACTIONS.REPORT_INVESTIGATION_STARTED]: 'Started Investigation',
  [AUDIT_ACTIONS.REPORT_RESOLVED]: 'Resolved Report',
  [AUDIT_ACTIONS.REPORT_ESCALATED]: 'Escalated Report',
  [AUDIT_ACTIONS.REPORT_DISMISSED]: 'Dismissed Report',
  [AUDIT_ACTIONS.VERIFICATION_APPROVED]: 'Approved Verification',
  [AUDIT_ACTIONS.VERIFICATION_REJECTED]: 'Rejected Verification',
  [AUDIT_ACTIONS.BULK_OPERATION]: 'Bulk Operation',
  [AUDIT_ACTIONS.SETTINGS_CHANGED]: 'Changed Settings',
  [AUDIT_ACTIONS.EXPORT_CREATED]: 'Created Export',
};

// Get display label for an action
export function getActionLabel(action: string): string {
  return ACTION_LABELS[action] || action.replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
