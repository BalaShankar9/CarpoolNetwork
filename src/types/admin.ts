// Admin Role-Based Access Control Types

export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'analyst';

export type Permission =
  | 'users.view'
  | 'users.edit'
  | 'users.suspend'
  | 'users.ban'
  | 'users.warn'
  | 'users.verify'
  | 'users.flag'
  | 'users.notes'
  | 'users.trust_score'
  | 'users.badges'
  | 'users.delete'
  | 'admins.view'
  | 'admins.create'
  | 'admins.edit'
  | 'admins.delete'
  | 'rides.view'
  | 'rides.manage'
  | 'rides.delete'
  | 'bookings.view'
  | 'bookings.manage'
  | 'bookings.refund'
  | 'bookings.delete'
  | 'messages.view'
  | 'messages.moderate'
  | 'messages.mute'
  | 'community.view'
  | 'community.moderate'
  | 'community.pin'
  | 'community.warnings'
  | 'notifications.view'
  | 'notifications.send'
  | 'notifications.bulk'
  | 'notifications.templates'
  | 'announcements.create'
  | 'announcements.manage'
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
    'users.view', 'users.edit', 'users.suspend', 'users.ban', 'users.warn',
    'users.verify', 'users.flag', 'users.notes', 'users.trust_score', 'users.badges', 'users.delete',
    'admins.view', 'admins.create', 'admins.edit', 'admins.delete',
    'rides.view', 'rides.manage', 'rides.delete',
    'bookings.view', 'bookings.manage', 'bookings.refund', 'bookings.delete',
    'messages.view', 'messages.moderate', 'messages.mute',
    'community.view', 'community.moderate', 'community.pin', 'community.warnings',
    'notifications.view', 'notifications.send', 'notifications.bulk', 'notifications.templates',
    'announcements.create', 'announcements.manage',
    'safety.view', 'safety.investigate', 'safety.resolve', 'safety.escalate',
    'verification.view', 'verification.approve', 'verification.reject',
    'analytics.view', 'analytics.export',
    'system.settings', 'system.diagnostics', 'system.bulk_operations',
  ],
  admin: [
    'users.view', 'users.edit', 'users.suspend', 'users.ban', 'users.warn',
    'users.verify', 'users.flag', 'users.notes', 'users.trust_score', 'users.badges',
    'admins.view',
    'rides.view', 'rides.manage',
    'bookings.view', 'bookings.manage', 'bookings.refund',
    'messages.view', 'messages.moderate', 'messages.mute',
    'community.view', 'community.moderate', 'community.pin', 'community.warnings',
    'notifications.view', 'notifications.send', 'notifications.bulk', 'notifications.templates',
    'announcements.create', 'announcements.manage',
    'safety.view', 'safety.investigate', 'safety.resolve',
    'verification.view', 'verification.approve', 'verification.reject',
    'analytics.view',
  ],
  moderator: [
    'users.view',
    'rides.view',
    'bookings.view',
    'messages.view', 'messages.moderate',
    'community.view', 'community.moderate',
    'notifications.view', 'notifications.send',
    'safety.view', 'safety.investigate',
    'verification.view', 'verification.approve', 'verification.reject',
  ],
  analyst: [
    'users.view',
    'rides.view',
    'bookings.view',
    'messages.view',
    'notifications.view',
    'safety.view',
    'analytics.view', 'analytics.export',
  ],
};

// Permission categories for UI grouping
export const PERMISSION_CATEGORIES = {
  users: {
    label: 'User Management',
    permissions: [
      'users.view', 'users.edit', 'users.suspend', 'users.ban', 'users.warn',
      'users.verify', 'users.flag', 'users.notes', 'users.trust_score', 'users.badges', 'users.delete'
    ] as Permission[],
  },
  admins: {
    label: 'Admin Management',
    permissions: ['admins.view', 'admins.create', 'admins.edit', 'admins.delete'] as Permission[],
  },
  rides: {
    label: 'Rides Management',
    permissions: ['rides.view', 'rides.manage', 'rides.delete'] as Permission[],
  },
  bookings: {
    label: 'Bookings Management',
    permissions: ['bookings.view', 'bookings.manage', 'bookings.refund', 'bookings.delete'] as Permission[],
  },
  messages: {
    label: 'Messages Management',
    permissions: ['messages.view', 'messages.moderate', 'messages.mute'] as Permission[],
  },
  community: {
    label: 'Community Management',
    permissions: ['community.view', 'community.moderate', 'community.pin', 'community.warnings'] as Permission[],
  },
  notifications: {
    label: 'Notifications',
    permissions: ['notifications.view', 'notifications.send', 'notifications.bulk', 'notifications.templates'] as Permission[],
  },
  announcements: {
    label: 'Announcements',
    permissions: ['announcements.create', 'announcements.manage'] as Permission[],
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
  'rides.view': 'View Rides',
  'rides.manage': 'Manage Rides',
  'rides.delete': 'Delete Rides',
  'bookings.view': 'View Bookings',
  'bookings.manage': 'Manage Bookings',
  'bookings.refund': 'Process Refunds',
  'bookings.delete': 'Delete Bookings',
  'messages.view': 'View Messages',
  'messages.moderate': 'Moderate Messages',
  'messages.mute': 'Mute Users',
  'community.view': 'View Community Posts',
  'community.moderate': 'Moderate Content',
  'community.pin': 'Pin/Lock Posts',
  'community.warnings': 'Issue Warnings',
  'notifications.view': 'View Notifications',
  'notifications.send': 'Send Notifications',
  'notifications.bulk': 'Bulk Send Notifications',
  'notifications.templates': 'Manage Templates',
  'announcements.create': 'Create Announcements',
  'announcements.manage': 'Manage Announcements',
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
