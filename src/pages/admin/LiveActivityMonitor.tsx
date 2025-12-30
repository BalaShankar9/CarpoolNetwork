import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Activity,
  Users,
  Car,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Search,
  Play,
  Pause,
  RefreshCw,
  Bell,
  BellOff,
  Download,
  Zap,
  Eye,
  UserX,
  Ban,
  MessageSquare,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface ActivityLog {
  id: string;
  activity_type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  actor_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  target_type: string | null;
  target_id: string | null;
  action: string;
  description: string;
  metadata: any;
  created_at: string;
}

interface CriticalAlert {
  id: string;
  alert_type: string;
  title: string;
  description: string;
  severity: string;
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  related_user_id: string | null;
  related_ride_id: string | null;
  metadata: any;
  created_at: string;
}

interface LiveMetrics {
  active_users: number;
  online_drivers: number;
  ongoing_rides: number;
  pending_bookings: number;
  active_alerts: number;
  recent_activities: number;
}

export default function LiveActivityMonitor() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [criticalAlerts, setCriticalAlerts] = useState<CriticalAlert[]>([]);
  const [metrics, setMetrics] = useState<LiveMetrics>({
    active_users: 0,
    online_drivers: 0,
    ongoing_rides: 0,
    pending_bookings: 0,
    active_alerts: 0,
    recent_activities: 0,
  });

  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const activityChannelRef = useRef<RealtimeChannel | null>(null);
  const alertChannelRef = useRef<RealtimeChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/admin');
      return;
    }

    loadInitialData();
    setupRealtimeSubscriptions();

    const metricsInterval = setInterval(() => {
      if (autoRefresh && !isPaused) {
        loadMetrics();
      }
    }, 10000);

    return () => {
      clearInterval(metricsInterval);
      cleanupSubscriptions();
    };
  }, [isAdmin, isPaused, autoRefresh]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadActivities(),
        loadCriticalAlerts(),
        loadMetrics(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (data && !error) {
      setActivities(data);
    }
  };

  const loadCriticalAlerts = async () => {
    const { data, error } = await supabase
      .from('critical_alerts')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (data && !error) {
      setCriticalAlerts(data);
    }
  };

  const loadMetrics = async () => {
    const { data, error } = await supabase.rpc('get_live_metrics');

    if (data && !error && data.length > 0) {
      setMetrics(data[0]);
    }
  };

  const setupRealtimeSubscriptions = () => {
    activityChannelRef.current = supabase
      .channel('activity_logs_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
        },
        (payload) => {
          if (!isPaused) {
            const newActivity = payload.new as ActivityLog;
            setActivities((prev) => [newActivity, ...prev.slice(0, 99)]);

            if (soundEnabled && (newActivity.severity === 'critical' || newActivity.severity === 'error')) {
              playNotificationSound();
            }

            loadMetrics();
          }
        }
      )
      .subscribe();

    alertChannelRef.current = supabase
      .channel('critical_alerts_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'critical_alerts',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newAlert = payload.new as CriticalAlert;
            setCriticalAlerts((prev) => [newAlert, ...prev]);
            if (soundEnabled) {
              playNotificationSound();
            }
          } else if (payload.eventType === 'UPDATE') {
            setCriticalAlerts((prev) =>
              prev.map((alert) =>
                alert.id === payload.new.id ? (payload.new as CriticalAlert) : alert
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setCriticalAlerts((prev) =>
              prev.filter((alert) => alert.id !== payload.old.id)
            );
          }
          loadMetrics();
        }
      )
      .subscribe();
  };

  const cleanupSubscriptions = () => {
    if (activityChannelRef.current) {
      supabase.removeChannel(activityChannelRef.current);
    }
    if (alertChannelRef.current) {
      supabase.removeChannel(alertChannelRef.current);
    }
  };

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    const { error } = await supabase.rpc('acknowledge_alert', { p_alert_id: alertId });
    if (!error) {
      setCriticalAlerts((prev) =>
        prev.map((alert) =>
          alert.id === alertId ? { ...alert, status: 'acknowledged' } : alert
        )
      );
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    const { error } = await supabase.rpc('resolve_alert', { p_alert_id: alertId });
    if (!error) {
      setCriticalAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
    }
  };

  const exportActivities = () => {
    const csv = [
      'Timestamp,Type,Severity,Actor,Action,Description',
      ...filteredActivities.map(a =>
        `${a.created_at},${a.activity_type},${a.severity},${a.actor_name || 'System'},${a.action},"${a.description}"`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-log-${new Date().toISOString()}.csv`;
    a.click();
  };

  const filteredActivities = activities.filter((activity) => {
    const typeMatch = selectedType === 'all' || activity.activity_type === selectedType;
    const severityMatch = selectedSeverity === 'all' || activity.severity === selectedSeverity;
    const searchMatch =
      !searchQuery ||
      activity.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.actor_name?.toLowerCase().includes(searchQuery.toLowerCase());

    return typeMatch && severityMatch && searchMatch;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'error': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user': return <Users className="w-4 h-4" />;
      case 'ride': return <Car className="w-4 h-4" />;
      case 'booking': return <CheckCircle className="w-4 h-4" />;
      case 'security': return <AlertTriangle className="w-4 h-4" />;
      case 'system': return <Activity className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS56+OdTgwOUKXh8bllHgU2jdXyzn0vBSh+zPDckjwKElyx6OyrWBQLRp3e8r1nIQYsgc/y2Ik2CBZgsunlm08MDlGl4fG5ZiAFNo/W8tCAMAUrfsrv3I4+ChFbs+jtrVoVDEae3vK8aCAFLIDP8tiKNQcVYbHo5JxPDA5RpuHxuWYgBTaO1vLOf2YgBS6Az/LYizcHE19Z6+SbTgwPUajh8bdnFApGnNzzwW0hBSyA0O+dTwxQvr+" />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Zap className="w-8 h-8 text-blue-600" />
              Live Activity Monitor
            </h1>
            <p className="text-gray-600 mt-1">Real-time platform operations and events</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg transition-colors ${
              soundEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
            }`}
            title={soundEnabled ? 'Disable sound' : 'Enable sound'}
          >
            {soundEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isPaused ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            }`}
          >
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={loadInitialData}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={exportActivities}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Download className="w-5 h-5" />
            Export
          </button>
        </div>
      </div>

      {/* Live Metrics */}
      <div className="grid md:grid-cols-6 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-6 h-6 text-blue-600" />
            {autoRefresh && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
          </div>
          <p className="text-sm text-blue-700 mb-1">Active Users</p>
          <p className="text-2xl font-bold text-blue-900">{metrics.active_users}</p>
          <p className="text-xs text-blue-600 mt-1">Last 15 min</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Car className="w-6 h-6 text-green-600" />
            {autoRefresh && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
          </div>
          <p className="text-sm text-green-700 mb-1">Online Drivers</p>
          <p className="text-2xl font-bold text-green-900">{metrics.online_drivers}</p>
          <p className="text-xs text-green-600 mt-1">Active now</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-6 h-6 text-orange-600" />
            {autoRefresh && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
          </div>
          <p className="text-sm text-orange-700 mb-1">Ongoing Rides</p>
          <p className="text-2xl font-bold text-orange-900">{metrics.ongoing_rides}</p>
          <p className="text-xs text-orange-600 mt-1">In progress</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-6 h-6 text-purple-600" />
            {autoRefresh && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
          </div>
          <p className="text-sm text-purple-700 mb-1">Pending Bookings</p>
          <p className="text-2xl font-bold text-purple-900">{metrics.pending_bookings}</p>
          <p className="text-xs text-purple-600 mt-1">Awaiting action</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            {metrics.active_alerts > 0 && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
          </div>
          <p className="text-sm text-red-700 mb-1">Active Alerts</p>
          <p className="text-2xl font-bold text-red-900">{metrics.active_alerts}</p>
          <p className="text-xs text-red-600 mt-1">Needs attention</p>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-6 h-6 text-gray-600" />
            {autoRefresh && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
          </div>
          <p className="text-sm text-gray-700 mb-1">Recent Activities</p>
          <p className="text-2xl font-bold text-gray-900">{metrics.recent_activities}</p>
          <p className="text-xs text-gray-600 mt-1">Last hour</p>
        </div>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-red-900">Critical Alerts ({criticalAlerts.length})</h2>
          </div>
          <div className="space-y-3">
            {criticalAlerts.map((alert) => (
              <div key={alert.id} className="bg-white border border-red-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        alert.severity === 'critical' ? 'bg-red-600 text-white' :
                        alert.severity === 'error' ? 'bg-orange-500 text-white' :
                        'bg-yellow-500 text-white'
                      }`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-500">{alert.alert_type}</span>
                      <span className="text-sm text-gray-500">|</span>
                      <span className="text-sm text-gray-500">{formatTimeAgo(alert.created_at)}</span>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">{alert.title}</h3>
                    <p className="text-gray-700 text-sm">{alert.description}</p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {alert.status === 'active' && (
                      <button
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                        className="px-3 py-1 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm font-medium"
                      >
                        Acknowledge
                      </button>
                    )}
                    <button
                      onClick={() => handleResolveAlert(alert.id)}
                      className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-900">Filters:</span>
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="user">Users</option>
            <option value="ride">Rides</option>
            <option value="booking">Bookings</option>
            <option value="security">Security</option>
            <option value="system">System</option>
          </select>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="critical">Critical</option>
          </select>

          <div className="w-full lg:flex-1 lg:min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search activities..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Auto-refresh (10s)</span>
          </label>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Activity Feed
            <span className="text-sm text-gray-500">({filteredActivities.length} events)</span>
          </h2>
        </div>

        <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
          {filteredActivities.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No activities match your filters</p>
            </div>
          ) : (
            filteredActivities.map((activity) => (
              <div
                key={activity.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${getSeverityColor(activity.severity)}`}>
                    {getActivityIcon(activity.activity_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{activity.action}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(activity.severity)}`}>
                        {activity.severity}
                      </span>
                      <span className="text-sm text-gray-500">|</span>
                      <span className="text-sm text-gray-500">{activity.activity_type}</span>
                    </div>
                    <p className="text-gray-700 text-sm mb-2">{activity.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {activity.actor_name || 'System'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(activity.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="View details"
                    >
                      <Eye className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
