import { ReactNode, useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DarkThemeProvider from './DarkThemeProvider';
import AdminTopBar from './AdminTopBar';
import type { AdminTab } from './AdminTopBar';
import AdminSideNav from './AdminSideNav';
import { supabase } from '../../lib/supabase';

interface AdminShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

/** Map URL prefixes to top-level tabs */
const ROUTE_TAB_MAP: Array<{ prefix: string; tab: AdminTab }> = [
  // users-safety
  { prefix: '/admin/users', tab: 'users-safety' },
  { prefix: '/admin/verifications', tab: 'users-safety' },
  { prefix: '/admin/safety', tab: 'users-safety' },
  { prefix: '/admin/messages/muted', tab: 'users-safety' },
  // content
  { prefix: '/admin/community', tab: 'content' },
  { prefix: '/admin/messages', tab: 'content' },
  { prefix: '/admin/notifications', tab: 'content' },
  // operations
  { prefix: '/admin/rides', tab: 'operations' },
  { prefix: '/admin/bookings', tab: 'operations' },
  { prefix: '/admin/bulk-operations', tab: 'operations' },
  // analytics
  { prefix: '/admin/analytics', tab: 'analytics' },
  { prefix: '/admin/activity', tab: 'analytics' },
  { prefix: '/admin/performance', tab: 'analytics' },
  { prefix: '/admin/incident-analytics', tab: 'analytics' },
  // system
  { prefix: '/admin/settings', tab: 'system' },
  { prefix: '/admin/health', tab: 'system' },
  { prefix: '/admin/admins', tab: 'system' },
  { prefix: '/admin/audit', tab: 'system' },
  { prefix: '/admin/diagnostics', tab: 'system' },
  { prefix: '/admin/bugs', tab: 'system' },
  { prefix: '/admin/feedback', tab: 'system' },
  { prefix: '/admin/beta', tab: 'system' },
];

/** First route per tab, used when clicking a tab */
const TAB_DEFAULT_ROUTES: Record<AdminTab, string> = {
  overview: '/admin',
  'users-safety': '/admin/users',
  content: '/admin/community',
  operations: '/admin/rides',
  analytics: '/admin/analytics',
  system: '/admin/settings',
};

function detectTab(pathname: string): AdminTab {
  // Check specific prefixes first (order matters: longer/more-specific first where needed)
  for (const { prefix, tab } of ROUTE_TAB_MAP) {
    if (pathname.startsWith(prefix)) return tab;
  }
  // overview routes: /admin, /admin/health-score, /admin/incidents, /admin/status-manager
  return 'overview';
}

export default function AdminShell({ children, title, subtitle, actions }: AdminShellProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = useMemo(() => detectTab(location.pathname), [location.pathname]);

  const [incidentCount, setIncidentCount] = useState<number | undefined>(undefined);

  const fetchIncidentCount = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .in('status', ['new', 'triaging', 'needs_review']);

      if (!error && count !== null) {
        setIncidentCount(count);
      }
    } catch {
      // Silently fail -- table may not exist yet
    }
  }, []);

  useEffect(() => {
    fetchIncidentCount();
    const interval = setInterval(fetchIncidentCount, 60_000);
    return () => clearInterval(interval);
  }, [fetchIncidentCount]);

  const handleTabChange = useCallback(
    (tab: AdminTab) => {
      navigate(TAB_DEFAULT_ROUTES[tab]);
    },
    [navigate],
  );

  return (
    <DarkThemeProvider>
      <div className="flex flex-col h-screen">
        <AdminTopBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          incidentCount={incidentCount}
        />

        <div className="flex flex-1 overflow-hidden">
          <AdminSideNav activeTab={activeTab} />

          {/* Main content area */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Optional header */}
            {(title || actions) && (
              <div className="bg-slate-800/50 border-b border-slate-700 px-6 py-4 shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    {title && (
                      <h1 className="text-2xl font-bold text-slate-50">{title}</h1>
                    )}
                    {subtitle && (
                      <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
                    )}
                  </div>
                  {actions && (
                    <div className="flex items-center gap-3">{actions}</div>
                  )}
                </div>
              </div>
            )}

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
          </main>
        </div>
      </div>
    </DarkThemeProvider>
  );
}
