/**
 * Ride Analytics Page
 * 
 * Drilldown for ride-related analytics: types, completion rates, popular times.
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
  StackedBarChart,
  CHART_COLORS,
} from '../../../components/admin/analytics/AnalyticsCharts';
import { exportToCSV } from '../../../components/admin/analytics/exportUtils';
import {
  Car,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import {
  getKpiSummary,
  getTimeSeries,
  getRideTypePerformance,
  getPeakTimes,
  getBookingFunnel,
  clearAdminAnalyticsCache,
} from '../../../services/adminAnalyticsService';
import type { 
  AnalyticsFilters, 
  KpiSummary, 
  TimeSeries, 
  RideTypePerformance, 
  PeakTime,
  FunnelStage 
} from '../../../types/analytics';
import { getRideTypeInfo } from '../../../types/rideTypes';

export default function RideAnalytics() {
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
  const [ridesTrend, setRidesTrend] = useState<TimeSeries | null>(null);
  const [rideTypePerf, setRideTypePerf] = useState<RideTypePerformance[]>([]);
  const [peakTimes, setPeakTimes] = useState<PeakTime[]>([]);
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const periodDays = Math.ceil(
        (new Date(filters.endDate).getTime() - new Date(filters.startDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      const [kpiData, trendData, rideTypeData, peakData, funnelData] = await Promise.all([
        getKpiSummary(filters),
        getTimeSeries('rides', filters),
        getRideTypePerformance(),
        getPeakTimes(),
        getBookingFunnel(periodDays),
      ]);

      setKpis(kpiData);
      setRidesTrend(trendData);
      setRideTypePerf(rideTypeData);
      setPeakTimes(peakData);
      setFunnel(funnelData);
    } catch (err) {
      console.error('Failed to load ride analytics:', err);
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
  const trendChartData = ridesTrend?.data.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: d.value,
  })) || [];

  const rideTypeChartData = rideTypePerf.map(r => ({
    name: getRideTypeInfo(r.rideType)?.label || r.rideType,
    value: r.totalRides,
  }));

  const peakTimeChartData = peakTimes.map(p => ({
    name: `${p.hour}:00`,
    value: p.rideCount,
  }));

  const funnelChartData = funnel.map(f => ({
    name: f.stage,
    value: f.count,
  }));

  const rideTypeColumns = [
    { 
      key: 'rideType', 
      label: 'Type',
      render: (value: unknown) => getRideTypeInfo(String(value))?.label || String(value),
    },
    { key: 'totalRides', label: 'Total Rides', align: 'right' as const },
    { 
      key: 'completionRate', 
      label: 'Completion', 
      align: 'right' as const,
      render: (value: unknown) => (
        <span className={`font-medium ${Number(value) >= 80 ? 'text-green-600' : Number(value) >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
          {Number(value)}%
        </span>
      ),
    },
    { 
      key: 'avgSeatsFilled', 
      label: 'Avg Fill', 
      align: 'right' as const,
      render: (value: unknown) => `${Number(value).toFixed(1)} seats`,
    },
    { 
      key: 'cancellationRate', 
      label: 'Cancellations', 
      align: 'right' as const,
      render: (value: unknown) => (
        <span className={`font-medium ${Number(value) <= 10 ? 'text-green-600' : Number(value) <= 20 ? 'text-yellow-600' : 'text-red-600'}`}>
          {Number(value)}%
        </span>
      ),
    },
  ];

  return (
    <AdminLayout
      title="Ride Analytics"
      subtitle="Ride performance, types, and booking patterns"
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
          title="Rides Posted"
          value={kpis?.ridesPosted.toLocaleString() || '0'}
          delta={kpis?.ridesPostedDelta}
          icon={<Car className="w-5 h-5" />}
          color="indigo"
          isLoading={isLoading}
        />
        <KpiCard
          title="Bookings"
          value={kpis?.bookingsCreated.toLocaleString() || '0'}
          delta={kpis?.bookingsCreatedDelta}
          icon={<Calendar className="w-5 h-5" />}
          color="blue"
          isLoading={isLoading}
        />
        <KpiCard
          title="Completion Rate"
          value={`${kpis?.completionRate || 0}%`}
          delta={kpis?.completionRateDelta}
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
          isLoading={isLoading}
        />
        <KpiCard
          title="Fill Rate"
          value={`${kpis?.fillRate || 0}%`}
          delta={kpis?.fillRateDelta}
          icon={<TrendingUp className="w-5 h-5" />}
          color="purple"
          isLoading={isLoading}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <ChartContainer
          title="Rides Over Time"
          description="Daily ride postings trend"
          isLoading={isLoading}
          onExport={(format) => {
            if (format === 'csv' && ridesTrend) {
              exportToCSV(
                ridesTrend.data.map(d => ({ date: d.date, rides: d.value })),
                'rides-trend'
              );
            }
          }}
          height={300}
        >
          <TimeSeriesChart
            data={trendChartData}
            color={CHART_COLORS[4]}
            showArea
          />
        </ChartContainer>

        <ChartContainer
          title="Rides by Type"
          description="Distribution across ride categories"
          isLoading={isLoading}
          height={300}
        >
          <DonutChart
            data={rideTypeChartData}
            colors={CHART_COLORS}
            innerRadius={50}
          />
        </ChartContainer>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <ChartContainer
          title="Peak Hours"
          description="Ride activity by hour of day"
          isLoading={isLoading}
          height={280}
        >
          <SimpleBarChart
            data={peakTimeChartData}
            color={CHART_COLORS[2]}
          />
        </ChartContainer>

        <ChartContainer
          title="Booking Funnel"
          description="From ride posted to completed"
          isLoading={isLoading}
          height={280}
        >
          <SimpleBarChart
            data={funnelChartData}
            color={CHART_COLORS[0]}
            horizontal
          />
        </ChartContainer>
      </div>

      {/* Ride Type Performance Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ride Type Performance</h3>
        <DataTable
          data={rideTypePerf}
          columns={rideTypeColumns}
          isLoading={isLoading}
          onExport={() => exportToCSV(rideTypePerf, 'ride-type-performance')}
          emptyMessage="No ride type data available"
        />
      </div>
    </AdminLayout>
  );
}
