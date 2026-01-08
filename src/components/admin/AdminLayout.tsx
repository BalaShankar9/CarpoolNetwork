import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Shield,
  CheckSquare,
  BarChart3,
  Activity,
  Bug,
  FileText,
  Database,
  Zap,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Crown,
  Menu,
  UserCog,
  ClipboardList,
  X,
  Beaker,
  MessageSquare,
  Heart,
  Car,
  Calendar,
  MessagesSquare,
  Bell,
  Settings,
  HeartPulse,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Permission, AdminRole, ROLE_DISPLAY_NAMES, ROLE_COLORS } from '../../types/admin';

interface NavItem {
  path: string;
  label: string;
  icon: ReactNode;
  permission?: Permission;
  minRole?: AdminRole;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/admin', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { path: '/admin/rides', label: 'Rides', icon: <Car className="w-5 h-5" />, permission: 'rides.view' },
  { path: '/admin/bookings', label: 'Bookings', icon: <Calendar className="w-5 h-5" />, permission: 'bookings.view' },
  { path: '/admin/messages', label: 'Messages', icon: <MessageSquare className="w-5 h-5" />, permission: 'messages.view' },
  { path: '/admin/community', label: 'Community', icon: <MessagesSquare className="w-5 h-5" />, permission: 'community.view' },
  { path: '/admin/notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" />, permission: 'notifications.view' },
  { path: '/admin/users', label: 'Users', icon: <Users className="w-5 h-5" />, permission: 'users.view' },
  { path: '/admin/safety', label: 'Safety Reports', icon: <Shield className="w-5 h-5" />, permission: 'safety.view' },
  { path: '/admin/verification', label: 'Verification', icon: <CheckSquare className="w-5 h-5" />, permission: 'verification.view' },
  { path: '/admin/analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" />, permission: 'analytics.view' },
  { path: '/admin/activity', label: 'Live Activity', icon: <Activity className="w-5 h-5" />, permission: 'analytics.view' },
  { path: '/admin/bugs', label: 'Bug Reports', icon: <Bug className="w-5 h-5" />, minRole: 'moderator' },
  { path: '/admin/feedback', label: 'Feedback', icon: <MessageSquare className="w-5 h-5" />, minRole: 'moderator' },
  { path: '/admin/beta', label: 'Beta Management', icon: <Beaker className="w-5 h-5" />, minRole: 'admin' },
  { path: '/admin/safety-dashboard', label: 'Safety Dashboard', icon: <Heart className="w-5 h-5" />, permission: 'safety.view' },
  { path: '/admin/settings', label: 'Platform Settings', icon: <Settings className="w-5 h-5" />, minRole: 'super_admin' },
  { path: '/admin/health', label: 'System Health', icon: <HeartPulse className="w-5 h-5" />, minRole: 'super_admin' },
  { path: '/admin/admins', label: 'Admin Management', icon: <UserCog className="w-5 h-5" />, minRole: 'super_admin' },
  { path: '/admin/audit', label: 'Audit Log', icon: <ClipboardList className="w-5 h-5" />, minRole: 'super_admin' },
  { path: '/admin/diagnostics', label: 'Diagnostics', icon: <Database className="w-5 h-5" />, permission: 'system.diagnostics' },
  { path: '/admin/bulk', label: 'Bulk Operations', icon: <Zap className="w-5 h-5" />, permission: 'system.bulk_operations' },
];

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function AdminLayout({ children, title, subtitle, actions }: AdminLayoutProps) {
  const { profile, adminRole, hasPermission, hasRole, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filter nav items based on permissions
  const filteredNavItems = NAV_ITEMS.filter(item => {
    // Dashboard is always visible for admins
    if (item.path === '/admin') return true;

    // Check specific permission
    if (item.permission && !hasPermission(item.permission)) return false;

    // Check minimum role
    if (item.minRole && !hasRole(item.minRole)) return false;

    return true;
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActivePath = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-gray-900">Admin Panel</span>
        </div>
        <div className="w-9" />
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 transition-all duration-300 flex flex-col ${sidebarCollapsed ? 'w-16' : 'w-64'
            } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        >
          {/* Logo Area */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 shrink-0">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2">
                <Crown className="w-6 h-6 text-blue-600" />
                <span className="font-bold text-gray-900">Admin</span>
              </div>
            )}
            {sidebarCollapsed && (
              <Crown className="w-6 h-6 text-blue-600 mx-auto" />
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 hover:bg-gray-100 rounded-lg hidden lg:block"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
            {/* Mobile close button */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 hover:bg-gray-100 rounded-lg lg:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* User Info */}
          {!sidebarCollapsed && (
            <div className="p-4 border-b border-gray-200 shrink-0">
              <div className="flex items-center gap-3">
                <img
                  src={profile?.avatar_url || '/default-avatar.png'}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full object-cover bg-gray-200"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {profile?.full_name || 'Admin'}
                  </p>
                  {adminRole && (
                    <span className={`inline-block px-2 py-0.5 text-xs rounded-full border ${ROLE_COLORS[adminRole]}`}>
                      {ROLE_DISPLAY_NAMES[adminRole]}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            {filteredNavItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActivePath(item.path)
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span className={isActivePath(item.path) ? 'text-blue-600' : ''}>
                  {item.icon}
                </span>
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>

          {/* Back to App & Sign Out */}
          <div className="p-2 border-t border-gray-200 space-y-1 shrink-0">
            <Link
              to="/"
              className="flex items-center gap-3 px-3 py-2.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              {!sidebarCollapsed && <span>Back to App</span>}
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              {!sidebarCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* Mobile Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Main Content */}
        <main
          className={`flex-1 min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
            }`}
        >
          {/* Page Header */}
          {(title || actions) && (
            <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 lg:top-0 z-30">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                  {subtitle && (
                    <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
                  )}
                </div>
                {actions && (
                  <div className="flex items-center gap-3">
                    {actions}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Page Content */}
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// Quick stats card component for dashboards
export function AdminStatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
}: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: ReactNode;
}) {
  const changeColors = {
    positive: 'text-green-600 bg-green-50',
    negative: 'text-red-600 bg-red-50',
    neutral: 'text-gray-600 bg-gray-50',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <span className={`inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded-full ${changeColors[changeType]}`}>
              {change}
            </span>
          )}
        </div>
        {icon && (
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// Section wrapper for consistent styling
export function AdminSection({
  title,
  description,
  actions,
  children,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {(title || actions) && (
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
            {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

// Empty state component
export function AdminEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-12">
      {icon && (
        <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
