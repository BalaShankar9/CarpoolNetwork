import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  HeartPulse,
  AlertTriangle,
  Monitor,
  Users,
  CheckSquare,
  Shield,
  ShieldAlert,
  VolumeX,
  MessagesSquare,
  FileWarning,
  MessageSquare,
  Bell,
  Megaphone,
  FileText,
  Car,
  Calendar,
  Zap,
  BarChart3,
  PieChart,
  UserCheck,
  MapPin,
  Wrench,
  Activity,
  Gauge,
  Flame,
  Settings,
  HeartHandshake,
  UserCog,
  ClipboardList,
  Database,
  Bug,
  MessageCircle,
  Beaker,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { AdminTab } from './AdminTopBar';
import type { Permission, AdminRole } from '../../types/admin';

interface SideNavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  permission?: Permission;
  minRole?: AdminRole;
}

const TAB_NAV_ITEMS: Record<AdminTab, SideNavItem[]> = {
  overview: [
    { path: '/admin', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { path: '/admin/health-score', label: 'Health Score', icon: <HeartPulse className="w-5 h-5" /> },
    { path: '/admin/incidents', label: 'Incident Queue', icon: <AlertTriangle className="w-5 h-5" /> },
    { path: '/admin/status-manager', label: 'Status Page', icon: <Monitor className="w-5 h-5" /> },
  ],
  'users-safety': [
    { path: '/admin/users', label: 'Users', icon: <Users className="w-5 h-5" />, permission: 'users.view' },
    { path: '/admin/verifications', label: 'Verification Queue', icon: <CheckSquare className="w-5 h-5" />, permission: 'verification.view' },
    { path: '/admin/safety', label: 'Safety Reports', icon: <Shield className="w-5 h-5" />, permission: 'safety.view' },
    { path: '/admin/safety/dashboard', label: 'Safety Dashboard', icon: <ShieldAlert className="w-5 h-5" />, permission: 'safety.view' },
    { path: '/admin/messages/muted', label: 'Muted Users', icon: <VolumeX className="w-5 h-5" />, permission: 'messages.mute' },
  ],
  content: [
    { path: '/admin/community', label: 'Community', icon: <MessagesSquare className="w-5 h-5" />, permission: 'community.view' },
    { path: '/admin/community/warnings', label: 'Content Warnings', icon: <FileWarning className="w-5 h-5" />, permission: 'community.warnings' },
    { path: '/admin/messages', label: 'Messages', icon: <MessageSquare className="w-5 h-5" />, permission: 'messages.view' },
    { path: '/admin/notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" />, permission: 'notifications.view' },
    { path: '/admin/notifications/announcements', label: 'Announcements', icon: <Megaphone className="w-5 h-5" />, permission: 'announcements.manage' },
    { path: '/admin/notifications/templates', label: 'Templates', icon: <FileText className="w-5 h-5" />, permission: 'notifications.templates' },
  ],
  operations: [
    { path: '/admin/rides', label: 'Rides', icon: <Car className="w-5 h-5" />, permission: 'rides.view' },
    { path: '/admin/bookings', label: 'Bookings', icon: <Calendar className="w-5 h-5" />, permission: 'bookings.view' },
    { path: '/admin/bulk-operations', label: 'Bulk Operations', icon: <Zap className="w-5 h-5" />, permission: 'system.bulk_operations' },
  ],
  analytics: [
    { path: '/admin/analytics', label: 'Overview', icon: <BarChart3 className="w-5 h-5" />, permission: 'analytics.view' },
    { path: '/admin/analytics/summary', label: 'Summary', icon: <PieChart className="w-5 h-5" />, permission: 'analytics.view' },
    { path: '/admin/analytics/users', label: 'User Analytics', icon: <UserCheck className="w-5 h-5" />, permission: 'analytics.view' },
    { path: '/admin/analytics/rides', label: 'Ride Analytics', icon: <Car className="w-5 h-5" />, permission: 'analytics.view' },
    { path: '/admin/analytics/geo', label: 'Geo Analytics', icon: <MapPin className="w-5 h-5" />, permission: 'analytics.view' },
    { path: '/admin/analytics/ops', label: 'Ops Health', icon: <Wrench className="w-5 h-5" />, permission: 'analytics.view' },
    { path: '/admin/activity', label: 'Live Activity', icon: <Activity className="w-5 h-5" />, permission: 'analytics.view' },
    { path: '/admin/performance', label: 'Performance', icon: <Gauge className="w-5 h-5" />, permission: 'analytics.view' },
    { path: '/admin/incident-analytics', label: 'Incidents', icon: <Flame className="w-5 h-5" />, permission: 'analytics.view' },
  ],
  system: [
    { path: '/admin/settings', label: 'Platform Settings', icon: <Settings className="w-5 h-5" />, minRole: 'super_admin' },
    { path: '/admin/health', label: 'System Health', icon: <HeartHandshake className="w-5 h-5" />, minRole: 'super_admin' },
    { path: '/admin/admins', label: 'Admin Management', icon: <UserCog className="w-5 h-5" />, minRole: 'super_admin' },
    { path: '/admin/audit', label: 'Audit Log', icon: <ClipboardList className="w-5 h-5" />, minRole: 'super_admin' },
    { path: '/admin/diagnostics', label: 'Diagnostics', icon: <Database className="w-5 h-5" />, permission: 'system.diagnostics' },
    { path: '/admin/bugs', label: 'Bug Reports', icon: <Bug className="w-5 h-5" />, minRole: 'moderator' },
    { path: '/admin/feedback', label: 'Feedback', icon: <MessageCircle className="w-5 h-5" />, minRole: 'moderator' },
    { path: '/admin/beta', label: 'Beta Management', icon: <Beaker className="w-5 h-5" />, minRole: 'admin' },
  ],
};

interface AdminSideNavProps {
  activeTab: AdminTab;
}

export default function AdminSideNav({ activeTab }: AdminSideNavProps) {
  const { hasPermission, hasRole } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = TAB_NAV_ITEMS[activeTab] || [];

  // Filter items based on permissions / roles
  const filteredItems = navItems.filter(item => {
    if (item.permission && !hasPermission(item.permission)) return false;
    if (item.minRole && !hasRole(item.minRole)) return false;
    return true;
  });

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={`shrink-0 bg-slate-800 border-r border-slate-700 flex flex-col transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Collapse toggle */}
      <div className="flex items-center justify-end p-2 border-b border-slate-700">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-slate-50"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {filteredItems.map(item => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                active
                  ? 'bg-slate-700 text-slate-50'
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-50'
              }`}
              style={
                active
                  ? {
                      borderLeft: '3px solid transparent',
                      borderImage: 'linear-gradient(to bottom, #ef4444, #f97316) 1',
                    }
                  : { borderLeft: '3px solid transparent' }
              }
            >
              <span className={active ? 'text-orange-400' : ''}>
                {item.icon}
              </span>
              {!collapsed && <span className="text-sm">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
