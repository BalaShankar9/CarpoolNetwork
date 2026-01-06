// Admin Role-Based Access Control Types

export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'analyst';

export type Permission =
  | 'users.view'
  | 'users.edit'
  | 'users.suspend'
  | 'users.delete'
  | 'admins.view'
  | 'admins.create'
  | 'admins.edit'
  | 'admins.delete'
  | 'safety.view'
  | 'safety.investigate'
  | 'safety.resolve'
  | 'safety.escalate'
  | 'verification.view'
  | 'verification.approve'
  | 'verification.reject'
  | 'analytics.view'
  | 'analytics.export'
  | 'system.settings'
  | 'system.diagnostics'
  | 'system.bulk_operations';

export interface AdminUser {
  id: string;
  role: AdminRole;
  permissions: Permission[];
}

export const ROLE_HIERARCHY: Record<AdminRole, number> = {
  super_admin: 4,
  admin: 3,
  moderator: 2,
  analyst: 1,
};

export const ROLE_DISPLAY_NAMES: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  moderator: 'Moderator',
  analyst: 'Analyst',
};

export const ROLE_COLORS: Record<AdminRole, string> = {
  super_admin: 'bg-purple-100 text-purple-800 border-purple-300',
  admin: 'bg-blue-100 text-blue-800 border-blue-300',
  moderator: 'bg-green-100 text-green-800 border-green-300',
  analyst: 'bg-gray-100 text-gray-800 border-gray-300',
};

export const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  super_admin: 'Full system access including admin management',
  admin: 'User management, safety reports, and verifications',
  moderator: 'Limited review capabilities, verification approvals',
  analyst: 'Read-only access to analytics and reports',
};

// Default permissions for each role
export const DEFAULT_ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  super_admin: [
    'users.view', 'users.edit', 'users.suspend', 'users.delete',
    'admins.view', 'admins.create', 'admins.edit', 'admins.delete',
    'safety.view', 'safety.investigate', 'safety.resolve', 'safety.escalate',
    'verification.view', 'verification.approve', 'verification.reject',
    'analytics.view', 'analytics.export',
    'system.settings', 'system.diagnostics', 'system.bulk_operations',
  ],
  admin: [
    'users.view', 'users.edit', 'users.suspend',
    'admins.view',
    'safety.view', 'safety.investigate', 'safety.resolve',
    'verification.view', 'verification.approve', 'verification.reject',
    'analytics.view',
  ],
  moderator: [
    'users.view',
    'safety.view', 'safety.investigate',
    'verification.view', 'verification.approve', 'verification.reject',
  ],
  analyst: [
    'users.view',
    'safety.view',
    'analytics.view', 'analytics.export',
  ],
};

// Permission categories for UI grouping
export const PERMISSION_CATEGORIES = {
  users: {
    label: 'User Management',
    permissions: ['users.view', 'users.edit', 'users.suspend', 'users.delete'] as Permission[],
  },
  admins: {
    label: 'Admin Management',
    permissions: ['admins.view', 'admins.create', 'admins.edit', 'admins.delete'] as Permission[],
  },
  safety: {
    label: 'Safety Reports',
    permissions: ['safety.view', 'safety.investigate', 'safety.resolve', 'safety.escalate'] as Permission[],
  },
  verification: {
    label: 'Verification Queue',
    permissions: ['verification.view', 'verification.approve', 'verification.reject'] as Permission[],
  },
  analytics: {
    label: 'Analytics',
    permissions: ['analytics.view', 'analytics.export'] as Permission[],
  },
  system: {
    label: 'System',
    permissions: ['system.settings', 'system.diagnostics', 'system.bulk_operations'] as Permission[],
  },
};

// Permission display names
export const PERMISSION_LABELS: Record<Permission, string> = {
  'users.view': 'View Users',
  'users.edit': 'Edit Users',
  'users.suspend': 'Suspend Users',
  'users.delete': 'Delete Users',
  'admins.view': 'View Admins',
  'admins.create': 'Create Admins',
  'admins.edit': 'Edit Admin Roles',
  'admins.delete': 'Remove Admins',
  'safety.view': 'View Safety Reports',
  'safety.investigate': 'Investigate Reports',
  'safety.resolve': 'Resolve Reports',
  'safety.escalate': 'Escalate Reports',
  'verification.view': 'View Verifications',
  'verification.approve': 'Approve Verifications',
  'verification.reject': 'Reject Verifications',
  'analytics.view': 'View Analytics',
  'analytics.export': 'Export Analytics',
  'system.settings': 'System Settings',
  'system.diagnostics': 'System Diagnostics',
  'system.bulk_operations': 'Bulk Operations',
};
