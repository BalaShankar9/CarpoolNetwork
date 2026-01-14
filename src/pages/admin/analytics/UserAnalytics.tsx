/**
 * User Analytics Page
 * 
 * Drilldown page for user-related analytics including growth, retention, and segments.
 */

import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import KpiCard from '../../../components/admin/analytics/KpiCard';
import AnalyticsFilterBar from '../../../components/admin/analytics/AnalyticsFilters';
import DataTable from '../../../components/admin/analytics/DataTable';
import {
  ChartContainer,
  TimeSeriesChart,
  DonutChart,
  SimpleBarChart,
  CHART_COLORS,
} from '../../../components/admin/analytics/AnalyticsCharts';
import { exportToCSV } from '../../../components/admin/analytics/exportUtils';
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import {
  getKpiSummary,
  getTimeSeries,
  getRetentionMetrics,
  clearAdminAnalyticsCache,
} from '../../../services/adminAnalyticsService';
import { supabase } from '../../../lib/supabase';
import type { AnalyticsFilters, KpiSummary, TimeSeries, RetentionCohort } from '../../../types/analytics';

interface UserSegment {
  segment: string;
  count: number;
  percentage: number;
}

export default function UserAnalytics() {
  const [filters, setFilters] = useState<AnalyticsFilters>(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      segment: 'all',
    };
  });

  const [kpis, setKpis] = useState<KpiSummary | null>(null);
  const [userGrowth, setUserGrowth] = useState<TimeSeries | null>(null);
  const [userSegments, setUserSegments] = useState<UserSegment[]>([]);
  const [retention, setRetention] = useState<RetentionCohort[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [kpiData, growthData, retentionData] = await Promise.all([
        getKpiSummary(filters),
        getTimeSeries('users', filters),
        getRetentionMetrics(),
      ]);

      setKpis(kpiData);
      setUserGrowth(growthData);
      setRetention(retentionData);

      // Fetch user segments via RPC
      const { data: segmentData } = await supabase.rpc('admin_user_segments', {
        start_ts: filters.startDate,
        end_ts: filters.endDate,
      });

      if (segmentData) {
        setUserSegments(segmentData.map((s: { segment: string; count: number; percentage: number }) => ({
          segment: s.segment,
          count: Number(s.count),
          percentage: Number(s.percentage),
        })));
      }
    } catch (err) {
      console.error('Failed to load user analytics:', err);
      setError('Failed to load analytics data');
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
  const growthChartData = userGrowth?.data.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: d.value,
  })) || [];

  const segmentChartData = userSegments.map(s => ({
    name: s.segment,
    value: s.count,
  }));

  const retentionColumns = [
    { key: 'cohortMonth', label: 'Cohort' },
    { key: 'usersCount', label: 'Users', align: 'right' as const },
    { key: 'retainedUsers', label: 'Retained', align: 'right' as const },
    { 
      key: 'retentionRate', 
      label: 'Rate', 
      align: 'right' as const,
      render: (value: unknown) => (
        <span className={`font-medium ${Number(value) >= 50 ? 'text-green-600' : Number(value) >= 25 ? 'text-yellow-600' : 'text-red-600'}`}>
          {Number(value)}%
        </span>
      )
    },
  ];

  return (
    <AdminLayout
      title="User Analytics"
      subtitle="User growth, retention, and segment analysis"
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiCard
          title="Active Users"
          value={kpis?.activeUsers.toLocaleString() || '0'}
          delta={kpis?.activeUsersDelta}
          icon={<Users className="w-5 h-5" />}
          color="blue"
          isLoading={isLoading}
        />
        <KpiCard
          title="New Signups"
          value={kpis?.newUsers.toLocaleString() || '0'}
          delta={kpis?.newUsersDelta}
          icon={<UserPlus className="w-5 h-5" />}
          color="green"
          isLoading={isLoading}
        />
        <KpiCard
          title="Active Drivers"
          description="Users who posted rides"
          value={userSegments.find(s => s.segment.includes('Driver'))?.count.toLocaleString() || '0'}
          icon={<UserCheck className="w-5 h-5" />}
          color="indigo"
          isLoading={isLoading}
        />
        <KpiCard
          title="Active Passengers"
          description="Users who booked rides"
          value={userSegments.find(s => s.segment.includes('Passenger'))?.count.toLocaleString() || '0'}
          icon={<TrendingUp className="w-5 h-5" />}
          color="orange"
          isLoading={isLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <ChartContainer
          title="User Growth"
          description="New user signups over time"
          isLoading={isLoading}
          onExport={(format) => {
            if (format === 'csv' && userGrowth) {
              exportToCSV(
                userGrowth.data.map(d => ({ date: d.date, newUsers: d.value })),
                'user-growth'
              );
            }
          }}
          height={300}
        >
          <TimeSeriesChart
            data={growthChartData}
            color={CHART_COLORS[1]}
            showArea
          />
        </ChartContainer>

        <ChartContainer
          title="User Segments"
          description="Breakdown by activity type"
          isLoading={isLoading}
          height={300}
        >
          <DonutChart
            data={segmentChartData}
            colors={[CHART_COLORS[0], CHART_COLORS[1], CHART_COLORS[4], CHART_COLORS[5]]}
            innerRadius={50}
          />
        </ChartContainer>
      </div>

      {/* Retention Table */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Retention by Cohort</h3>
        <DataTable
          data={retention}
          columns={retentionColumns}
          isLoading={isLoading}
          pageSize={12}
          onExport={() => exportToCSV(retention, 'user-retention')}
          emptyMessage="No retention data available"
        />
      </div>

      {/* Segments Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Segment Details</h3>
        <DataTable
          data={userSegments}
          columns={[
            { key: 'segment', label: 'Segment' },
            { key: 'count', label: 'Users', align: 'right' as const },
            { 
              key: 'percentage', 
              label: 'Share', 
              align: 'right' as const,
              render: (value: unknown) => `${Number(value)}%`
            },
          ]}
          isLoading={isLoading}
          onExport={() => exportToCSV(userSegments, 'user-segments')}
          emptyMessage="No segment data available"
        />
      </div>
    </AdminLayout>
  );
}
