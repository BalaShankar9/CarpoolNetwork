import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Car,
  MessageSquare,
  Activity,
  Shield,
  TrendingUp,
  Calendar,
  CheckCircle,
  MapPin,
  Clock,
  ChevronRight,
  RefreshCw,
  UserCheck,
  AlertCircle,
  ArrowLeft,
  BarChart3,
  DollarSign,
  Mail,
  Brain,
  Target,
  FileText,
  Eye,
  Flag,
  Settings,
  Zap,
  Package,
  Gauge,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ContentModeration } from '../../components/admin/ContentModeration';
import { AuditLogViewer } from '../../components/admin/AuditLogViewer';
import { AdvancedReporting } from '../../components/admin/AdvancedReporting';
import { AdminSettings } from '../../components/admin/AdminSettings';

interface DashboardStats {
  totalUsers: number;
  totalRides: number;
  totalBookings: number;
  pendingBookings: number;
  feedbackCount: number;
  activeRides: number;
  recentSignups: number;
  pendingVerifications: number;
}

interface RecentActivity {
  type: 'user' | 'ride' | 'booking' | 'feedback';
  description: string;
  timestamp: string;
  details?: string;
}

type TabType = 'overview' | 'moderation' | 'audit' | 'reports' | 'settings';

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchDashboardData();
  }, [isAdmin, navigate]);

  const fetchDashboardData = async () => {
    setRefreshing(true);

    try {
      const [
        usersResult,
        ridesResult,
        bookingsResult,
        pendingResult,
        feedbackResult,
        activeRidesResult,
        recentSignupsResult,
        pendingLicensesResult,
        pendingInsuranceResult,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('rides').select('id', { count: 'exact', head: true }),
        supabase.from('ride_bookings').select('id', { count: 'exact', head: true }),
        supabase.from('ride_bookings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('bug_reports').select('id', { count: 'exact', head: true }),
        supabase.from('rides').select('id', { count: 'exact', head: true })
          .gte('departure_time', new Date().toISOString()),
        supabase.from('profiles').select('id', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('driver_licenses').select('id', { count: 'exact', head: true }).eq('verified', false),
        supabase.from('vehicle_insurance').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      setStats({
        totalUsers: usersResult.count || 0,
        totalRides: ridesResult.count || 0,
        totalBookings: bookingsResult.count || 0,
        pendingBookings: pendingResult.count || 0,
        feedbackCount: feedbackResult.count || 0,
        activeRides: activeRidesResult.count || 0,
        recentSignups: recentSignupsResult.count || 0,
        pendingVerifications: (pendingLicensesResult.count || 0) + (pendingInsuranceResult.count || 0),
      });

      const activities: RecentActivity[] = [];

      const { data: recentUsers } = await supabase
        .from('profiles')
        .select('full_name, email, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      recentUsers?.forEach(u => {
        activities.push({
          type: 'user',
          description: `New user: ${u.full_name || 'Unknown'}`,
          timestamp: u.created_at,
          details: u.email,
        });
      });

      const { data: recentRides } = await supabase
        .from('rides')
        .select('origin, destination, departure_time, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      recentRides?.forEach(r => {
        activities.push({
          type: 'ride',
          description: `New ride posted`,
          timestamp: r.created_at,
          details: `${r.origin} to ${r.destination}`,
        });
      });

      const { data: recentFeedback } = await supabase
        .from('bug_reports')
        .select('text, created_at')
        .order('created_at', { ascending: false })
        .limit(2);

      recentFeedback?.forEach(f => {
        activities.push({
          type: 'feedback',
          description: 'New feedback received',
          timestamp: f.created_at,
          details: f.text.substring(0, 50) + (f.text.length > 50 ? '...' : ''),
        });
      });

      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(activities.slice(0, 8));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'user': return <Users className="w-4 h-4 text-blue-500" />;
      case 'ride': return <Car className="w-4 h-4 text-green-500" />;
      case 'booking': return <Calendar className="w-4 h-4 text-orange-500" />;
      case 'feedback': return <MessageSquare className="w-4 h-4 text-teal-500" />;
    }
  };

  if (!isAdmin) return null;

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'blue', link: '/admin/users' },
    { label: 'Active Rides', value: stats?.activeRides || 0, icon: Car, color: 'green', subtext: `${stats?.totalRides || 0} total` },
    { label: 'Verifications', value: stats?.pendingVerifications || 0, icon: CheckCircle, color: 'orange', link: '/admin/verifications', highlight: (stats?.pendingVerifications || 0) > 0 },
    { label: 'Feedback', value: stats?.feedbackCount || 0, icon: MessageSquare, color: 'teal', link: '/admin/feedback' },
    { label: 'New This Week', value: stats?.recentSignups || 0, icon: TrendingUp, color: 'green' },
  ];

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    teal: 'bg-teal-50 text-teal-600 border-teal-100',
  };

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: LayoutDashboard },
    { id: 'moderation' as TabType, label: 'Content Moderation', icon: Flag },
    { id: 'audit' as TabType, label: 'Audit Logs', icon: Eye },
    { id: 'reports' as TabType, label: 'Advanced Reports', icon: FileText },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'moderation':
        return <ContentModeration />;
      case 'audit':
        return <AuditLogViewer />;
      case 'reports':
        return <AdvancedReporting />;
      case 'settings':
        return <AdminSettings />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <LayoutDashboard className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-500">Welcome back, {user?.email?.split('@')[0]}</p>
              </div>
            </div>
            <button
              onClick={fetchDashboardData}
              disabled={refreshing}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading && activeTab === 'overview' ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeTab !== 'overview' ? (
          <div className="py-4">
            {renderTabContent()}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              {statCards.map((stat) => (
                <div
                  key={stat.label}
                  className={`bg-white rounded-xl p-4 border shadow-sm hover:shadow-md transition-all ${stat.link ? 'cursor-pointer' : ''} ${stat.highlight ? 'ring-2 ring-orange-400 ring-offset-2' : ''}`}
                  onClick={() => stat.link && navigate(stat.link)}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  {stat.subtext && (
                    <p className="text-xs text-gray-400 mt-1">{stat.subtext}</p>
                  )}
                  {stat.highlight && stat.value > 0 && (
                    <p className="text-xs text-orange-600 font-medium mt-1">Needs attention</p>
                  )}
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                  <Clock className="w-5 h-5 text-gray-400" />
                </div>
                <div className="divide-y divide-gray-100">
                  {recentActivity.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      No recent activity
                    </div>
                  ) : (
                    recentActivity.map((activity, idx) => (
                      <div key={idx} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{activity.description}</p>
                          {activity.details && (
                            <p className="text-sm text-gray-500 truncate">{activity.details}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {formatTimeAgo(activity.timestamp)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <Link
                      to="/admin/verifications"
                      className={`flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group ${(stats?.pendingVerifications || 0) > 0 ? 'bg-orange-50' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-orange-500" />
                        <span className="font-medium text-gray-700">Verification Queue</span>
                        {(stats?.pendingVerifications || 0) > 0 && (
                          <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full">
                            {stats?.pendingVerifications}
                          </span>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                    </Link>
                    <Link
                      to="/admin/analytics"
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <BarChart3 className="w-5 h-5 text-green-500" />
                        <span className="font-medium text-gray-700">Advanced Analytics</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                    </Link>
                    <Link
                      to="/admin/activity"
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Zap className="w-5 h-5 text-yellow-500" />
                        <span className="font-medium text-gray-700">Live Activity Monitor</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                    </Link>
                    <Link
                      to="/admin/diagnostics"
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Activity className="w-5 h-5 text-blue-500" />
                        <span className="font-medium text-gray-700">System Diagnostics</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                    </Link>
                    <Link
                      to="/admin/feedback"
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <MessageSquare className="w-5 h-5 text-teal-500" />
                        <span className="font-medium text-gray-700">User Feedback</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                    </Link>
                    <Link
                      to="/admin/users"
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <UserCheck className="w-5 h-5 text-green-500" />
                        <span className="font-medium text-gray-700">User Management</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                    </Link>
                    <Link
                      to="/admin/bulk-operations"
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-purple-500" />
                        <span className="font-medium text-gray-700">Bulk Operations</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                    </Link>
                    <Link
                      to="/admin/performance"
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Gauge className="w-5 h-5 text-indigo-500" />
                        <span className="font-medium text-gray-700">Performance Monitor</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                    </Link>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <AlertCircle className="w-6 h-6" />
                    <h3 className="font-semibold">System Status</h3>
                  </div>
                  <p className="text-blue-100 text-sm mb-4">
                    Run diagnostics to check all system components and integrations.
                  </p>
                  <Link
                    to="/admin/diagnostics"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Activity className="w-4 h-4" />
                    Run Health Check
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
