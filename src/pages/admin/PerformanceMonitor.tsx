import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Activity,
  Zap,
  TrendingUp,
  TrendingDown,
  Clock,
  Database,
  Server,
  Gauge,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { performanceMonitor } from '../../services/performanceMonitoring';

interface SystemHealth {
  overall_status: string;
  database_status: string;
  recent_errors: number;
  avg_response_time_ms: number;
  cache_hit_rate: number;
  active_users: number;
}

interface PerformanceMetric {
  metric_type: string;
  metric_name: string;
  value: number;
  unit: string;
  endpoint: string;
  created_at: string;
}

export default function PerformanceMonitor() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/admin');
      return;
    }

    loadData();
    const interval = setInterval(loadData, 30000);

    return () => clearInterval(interval);
  }, [isAdmin, timeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const health = await performanceMonitor.getSystemHealth();
      setSystemHealth(health);

      const timeFilter = getTimeFilter();
      const { data: metricsData } = await supabase
        .from('performance_metrics')
        .select('*')
        .gte('created_at', timeFilter)
        .order('created_at', { ascending: false })
        .limit(100);

      if (metricsData) {
        setMetrics(metricsData);
      }
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeFilter = () => {
    const now = new Date();
    switch (timeRange) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      case '6h':
        return new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    }
  };

  const getMetricsByType = (type: string) => {
    return metrics.filter(m => m.metric_type === type);
  };

  const calculateAverage = (values: number[]) => {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unhealthy':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'degraded':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'unhealthy':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const pageLoadMetrics = getMetricsByType('page_load');
  const apiCallMetrics = getMetricsByType('api_call');
  const dbQueryMetrics = getMetricsByType('database_query');
  const renderTimeMetrics = getMetricsByType('render_time');

  const avgPageLoad = calculateAverage(pageLoadMetrics.map(m => m.value));
  const avgApiCall = calculateAverage(apiCallMetrics.map(m => m.value));
  const avgDbQuery = calculateAverage(dbQueryMetrics.map(m => m.value));
  const avgRenderTime = calculateAverage(renderTimeMetrics.map(m => m.value));

  if (loading && !systemHealth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Gauge className="w-8 h-8 text-blue-600" />
              Performance Monitor
            </h1>
            <p className="text-gray-600 mt-1">Real-time system performance and health metrics</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>

          <button
            onClick={loadData}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {systemHealth && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Overall Status</h3>
              {getStatusIcon(systemHealth.overall_status)}
            </div>
            <div className={`px-3 py-2 rounded-lg border font-medium ${getStatusColor(systemHealth.overall_status)}`}>
              {systemHealth.overall_status.toUpperCase()}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Database Status</h3>
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div className={`px-3 py-2 rounded-lg border font-medium ${getStatusColor(systemHealth.database_status)}`}>
              {systemHealth.database_status.toUpperCase()}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Recent Errors</h3>
              <AlertCircle className={`w-5 h-5 ${systemHealth.recent_errors > 10 ? 'text-red-600' : 'text-gray-400'}`} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{systemHealth.recent_errors}</p>
            <p className="text-sm text-gray-600 mt-1">in the last hour</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Avg Response Time</h3>
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {systemHealth?.avg_response_time_ms?.toFixed(0) || 0}
            <span className="text-lg text-gray-600 ml-1">ms</span>
          </p>
          {systemHealth && systemHealth.avg_response_time_ms < 200 ? (
            <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
              <TrendingDown className="w-4 h-4" />
              <span>Excellent</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 mt-2 text-sm text-yellow-600">
              <TrendingUp className="w-4 h-4" />
              <span>Could be better</span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Cache Hit Rate</h3>
            <Zap className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {systemHealth?.cache_hit_rate?.toFixed(1) || 0}
            <span className="text-lg text-gray-600 ml-1">%</span>
          </p>
          <p className="text-sm text-gray-600 mt-2">Cache efficiency</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Active Users</h3>
            <Activity className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{systemHealth?.active_users || 0}</p>
          <p className="text-sm text-gray-600 mt-2">in the last hour</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">API Calls</h3>
            <Server className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{apiCallMetrics.length}</p>
          <p className="text-sm text-gray-600 mt-2">Avg: {avgApiCall.toFixed(0)}ms</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Performance Metrics
          </h3>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Page Load Time</span>
                <span className="font-semibold text-gray-900">{avgPageLoad.toFixed(0)}ms</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${Math.min((avgPageLoad / 3000) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">API Response Time</span>
                <span className="font-semibold text-gray-900">{avgApiCall.toFixed(0)}ms</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${Math.min((avgApiCall / 1000) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Database Query Time</span>
                <span className="font-semibold text-gray-900">{avgDbQuery.toFixed(0)}ms</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: `${Math.min((avgDbQuery / 500) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Component Render Time</span>
                <span className="font-semibold text-gray-900">{avgRenderTime.toFixed(0)}ms</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-orange-600 h-2 rounded-full"
                  style={{ width: `${Math.min((avgRenderTime / 100) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Metrics</h3>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {metrics.slice(0, 20).map((metric, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{metric.metric_name}</p>
                  <p className="text-xs text-gray-600 truncate">{metric.endpoint || metric.metric_type}</p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-sm font-semibold text-gray-900">
                    {metric.value.toFixed(0)} {metric.unit}
                  </p>
                  <p className="text-xs text-gray-600">
                    {new Date(metric.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
