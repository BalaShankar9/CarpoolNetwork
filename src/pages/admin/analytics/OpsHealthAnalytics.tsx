/**
 * Operations Health Analytics Page
 * 
 * System health monitoring, error tracking, and operational metrics.
 */

import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import KpiCard from '../../../components/admin/analytics/KpiCard';
import AnalyticsFilterBar from '../../../components/admin/analytics/AnalyticsFilters';
import DataTable from '../../../components/admin/analytics/DataTable';
import {
  ChartContainer,
  TimeSeriesChart,
  SimpleBarChart,
  DonutChart,
  CHART_COLORS,
} from '../../../components/admin/analytics/AnalyticsCharts';
import { exportToCSV } from '../../../components/admin/analytics/exportUtils';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Server,
  Zap,
} from 'lucide-react';
import {
  getOpsHealth,
  clearAdminAnalyticsCache,
} from '../../../services/adminAnalyticsService';
import { supabase } from '../../../lib/supabase';
import type { AnalyticsFilters, OpsHealth } from '../../../types/analytics';

interface SystemEvent {
  id: string;
  created_at: string;
  event_type: string;
  severity: string;
  source: string;
}

export default function OpsHealthAnalytics() {
  const [filters, setFilters] = useState<AnalyticsFilters>(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Default to 7 days for ops
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      segment: 'all',
    };
  });

  const [opsHealth, setOpsHealth] = useState<OpsHealth | null>(null);
  const [recentEvents, setRecentEvents] = useState<SystemEvent[]>([]);
  const [eventsByType, setEventsByType] = useState<{ type: string; count: number }[]>([]);
  const [eventsBySeverity, setEventsBySeverity] = useState<{ severity: string; count: number }[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get ops health summary
      const healthData = await getOpsHealth(filters);
      setOpsHealth(healthData);

      // Get recent system events
      const { data: events, error: eventsError } = await supabase
        .from('system_events')
        .select('id, created_at, event_type, severity, source')
        .gte('created_at', filters.startDate)
        .lte('created_at', filters.endDate)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!eventsError && events) {
        setRecentEvents(events);

        // Aggregate by type
        const typeMap = new Map<string, number>();
        const severityMap = new Map<string, number>();
        
        events.forEach(e => {
          typeMap.set(e.event_type, (typeMap.get(e.event_type) || 0) + 1);
          severityMap.set(e.severity, (severityMap.get(e.severity) || 0) + 1);
        });

        setEventsByType(
          Array.from(typeMap.entries())
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count)
        );
        
        setEventsBySeverity(
          Array.from(severityMap.entries())
            .map(([severity, count]) => ({ severity, count }))
        );
      }
    } catch (err) {
      console.error('Failed to load ops health:', err);
      // Don't show error for missing table - it's expected initially
      if (!String(err).includes('system_events')) {
        setError('Failed to load operational data');
      }
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    clearAdminAnalyticsCache();
    await loadData();
    setRefreshing(false);
  };

  // Prepare chart data
  const severityChartData = eventsBySeverity.map(s => ({
    name: s.severity.charAt(0).toUpperCase() + s.severity.slice(1),
    value: s.count,
  }));

  const typeChartData = eventsByType.slice(0, 8).map(t => ({
    name: t.type.substring(0, 20),
    value: t.count,
  }));

  // Status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'green';
      case 'degraded': return 'orange';
      case 'critical': return 'red';
      default: return 'blue';
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      info: 'bg-blue-100 text-blue-700',
      warning: 'bg-yellow-100 text-yellow-700',
      error: 'bg-red-100 text-red-700',
      critical: 'bg-red-200 text-red-800',
    };
    return colors[severity] || 'bg-gray-100 text-gray-700';
  };

  // Event columns
  const eventColumns = [
    { 
      key: 'created_at', 
      label: 'Time',
      render: (value: unknown) => new Date(String(value)).toLocaleString(),
    },
    { key: 'event_type', label: 'Event Type' },
    { 
      key: 'severity', 
      label: 'Severity',
      render: (value: unknown) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSeverityBadge(String(value))}`}>
          {String(value)}
        </span>
      ),
    },
    { key: 'source', label: 'Source' },
  ];

  return (
    <AdminLayout
      title="Operations Health"
      subtitle="System status, errors, and operational metrics"
      actions={
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      }
    >
      <AnalyticsFilterBar
        filters={filters}
        onFiltersChange={setFilters}
        isLoading={isLoading}
      />

      {/* System Status Banner */}
      <div className={`mb-6 p-4 rounded-xl border ${
        opsHealth?.systemStatus === 'healthy' 
          ? 'bg-green-50 border-green-200' 
          : opsHealth?.systemStatus === 'degraded'
          ? 'bg-yellow-50 border-yellow-200'
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center gap-3">
          {opsHealth?.systemStatus === 'healthy' ? (
            <CheckCircle className="w-6 h-6 text-green-600" />
          ) : opsHealth?.systemStatus === 'degraded' ? (
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
          ) : (
            <XCircle className="w-6 h-6 text-red-600" />
          )}
          <div>
            <h3 className={`font-semibold ${
              opsHealth?.systemStatus === 'healthy' 
                ? 'text-green-800' 
                : opsHealth?.systemStatus === 'degraded'
                ? 'text-yellow-800'
                : 'text-red-800'
            }`}>
              System Status: {opsHealth?.systemStatus?.toUpperCase() || 'UNKNOWN'}
            </h3>
            <p className={`text-sm ${
              opsHealth?.systemStatus === 'healthy' 
                ? 'text-green-600' 
                : opsHealth?.systemStatus === 'degraded'
                ? 'text-yellow-600'
                : 'text-red-600'
            }`}>
              {opsHealth?.systemStatus === 'healthy' 
                ? 'All systems operating normally'
                : opsHealth?.systemStatus === 'degraded'
                ? 'Some issues detected, monitoring closely'
                : 'Critical issues require immediate attention'}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiCard
          title="System Status"
          value={opsHealth?.systemStatus?.toUpperCase() || 'N/A'}
          icon={<Server className="w-5 h-5" />}
          color={getStatusColor(opsHealth?.systemStatus || 'unknown') as 'green' | 'orange' | 'red' | 'blue'}
          isLoading={isLoading}
        />
        <KpiCard
          title="Error Events"
          value={opsHealth?.errorEvents.toLocaleString() || '0'}
          icon={<XCircle className="w-5 h-5" />}
          color="red"
          isLoading={isLoading}
        />
        <KpiCard
          title="Total Events"
          value={recentEvents.length.toString()}
          description="In selected period"
          icon={<Activity className="w-5 h-5" />}
          color="blue"
          isLoading={isLoading}
        />
        <KpiCard
          title="Avg Latency"
          value={opsHealth?.avgLatency ? `${opsHealth.avgLatency}ms` : 'N/A'}
          icon={<Zap className="w-5 h-5" />}
          color="purple"
          isLoading={isLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <ChartContainer
          title="Events by Severity"
          description="Distribution of event severity levels"
          isLoading={isLoading}
          height={280}
        >
          <DonutChart
            data={severityChartData}
            colors={['#3B82F6', '#F59E0B', '#EF4444', '#DC2626']}
            innerRadius={50}
          />
        </ChartContainer>

        <ChartContainer
          title="Events by Type"
          description="Most common event types"
          isLoading={isLoading}
          height={280}
        >
          <SimpleBarChart
            data={typeChartData}
            color={CHART_COLORS[0]}
            horizontal
          />
        </ChartContainer>
      </div>

      {/* Recent Events Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent System Events</h3>
        <DataTable
          data={recentEvents}
          columns={eventColumns}
          isLoading={isLoading}
          pageSize={15}
          onExport={() => exportToCSV(recentEvents, 'system-events')}
          emptyMessage="No system events recorded in this period"
        />
      </div>

      {/* Note about system events */}
      {recentEvents.length === 0 && !isLoading && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start gap-3">
            <Activity className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">System Events Tracking</h4>
              <p className="text-sm text-blue-700 mt-1">
                System events are logged automatically when errors or important system-level actions occur.
                If no events are shown, it typically means the system has been operating smoothly.
              </p>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
