/**
 * Analytics Summary Page
 * 
 * Main analytics dashboard showing KPIs, trends, and quick insights.
 * Entry point for /admin/analytics/summary
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../components/admin/AdminLayout';
import KpiCard from '../../../components/admin/analytics/KpiCard';
import AnalyticsFilterBar from '../../../components/admin/analytics/AnalyticsFilters';
import {
  ChartContainer,
  MultiSeriesChart,
  DonutChart,
  SimpleBarChart,
  CHART_COLORS,
} from '../../../components/admin/analytics/AnalyticsCharts';
import {
  exportKpiSummary,
  exportTimeSeries,
  generatePDFReport,
  formatKpisAsHTML,
  formatRoutesAsHTML,
} from '../../../components/admin/analytics/exportUtils';
import {
  Users,
  UserPlus,
  Car,
  Calendar,
  CheckCircle,
  XCircle,
  MessageSquare,
  TrendingUp,
  RefreshCw,
  Download,
  ChevronRight,
  MapPin,
  Activity,
  BarChart3,
} from 'lucide-react';
import {
  getKpiSummary,
  getTimeSeries,
  getTopRoutes,
  clearAdminAnalyticsCache,
} from '../../../services/adminAnalyticsService';
import type { AnalyticsFilters, KpiSummary, TimeSeries, TopRoute } from '../../../types/analytics';

export default function AnalyticsSummary() {
  // Filter state
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

  // Data state
  const [kpis, setKpis] = useState<KpiSummary | null>(null);
  const [ridesTimeSeries, setRidesTimeSeries] = useState<TimeSeries | null>(null);
  const [bookingsTimeSeries, setBookingsTimeSeries] = useState<TimeSeries | null>(null);
  const [topRoutes, setTopRoutes] = useState<TopRoute[]>([]);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [kpiData, ridesData, bookingsData, routesData] = await Promise.all([
        getKpiSummary(filters),
        getTimeSeries('rides', filters),
        getTimeSeries('bookings', filters),
        getTopRoutes(filters, 5),
      ]);

      setKpis(kpiData);
      setRidesTimeSeries(ridesData);
      setBookingsTimeSeries(bookingsData);
      setTopRoutes(routesData);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError('Failed to load analytics data. Please try again.');
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

  const handleExportPDF = () => {
    if (!kpis) return;
    
    generatePDFReport(
      'CarpoolNetwork Analytics Summary',
      filters,
      [
        { title: 'Key Performance Indicators', content: formatKpisAsHTML(kpis) },
        { title: 'Top Routes', content: formatRoutesAsHTML(topRoutes) },
      ]
    );
  };

  // Prepare time series chart data
  const chartData = ridesTimeSeries?.data.map((d, i) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    rides: d.value,
    bookings: bookingsTimeSeries?.data[i]?.value || 0,
  })) || [];

  return (
    <AdminLayout
      title="Analytics Summary"
      subtitle="Overview of platform performance and key metrics"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={handleExportPDF}
            disabled={!kpis}
            className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export PDF</span>
          </button>
        </div>
      }
    >
      {/* Filters */}
      <AnalyticsFilterBar
        filters={filters}
        onFiltersChange={setFilters}
        isLoading={isLoading}
      />

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700">{error}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard
          title="Active Users"
          value={kpis?.activeUsers.toLocaleString() || '0'}
          delta={kpis?.activeUsersDelta}
          icon={<Users className="w-5 h-5" />}
          color="blue"
          isLoading={isLoading}
          onClick={() => window.location.href = '/admin/analytics/users'}
        />
        <KpiCard
          title="New Users"
          value={kpis?.newUsers.toLocaleString() || '0'}
          delta={kpis?.newUsersDelta}
          icon={<UserPlus className="w-5 h-5" />}
          color="green"
          isLoading={isLoading}
        />
        <KpiCard
          title="Rides Posted"
          value={kpis?.ridesPosted.toLocaleString() || '0'}
          delta={kpis?.ridesPostedDelta}
          icon={<Car className="w-5 h-5" />}
          color="indigo"
          isLoading={isLoading}
          onClick={() => window.location.href = '/admin/analytics/rides'}
        />
        <KpiCard
          title="Bookings"
          value={kpis?.bookingsCreated.toLocaleString() || '0'}
          delta={kpis?.bookingsCreatedDelta}
          icon={<Calendar className="w-5 h-5" />}
          color="orange"
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiCard
          title="Completion Rate"
          value={`${kpis?.completionRate || 0}%`}
          delta={kpis?.completionRateDelta}
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
          isLoading={isLoading}
        />
        <KpiCard
          title="Cancellation Rate"
          value={`${kpis?.cancellationRate || 0}%`}
          delta={kpis?.cancellationRateDelta}
          icon={<XCircle className="w-5 h-5" />}
          color="red"
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
        <KpiCard
          title="Messages"
          value={kpis?.messagesSent.toLocaleString() || '0'}
          delta={kpis?.messagesSentDelta}
          icon={<MessageSquare className="w-5 h-5" />}
          color="teal"
          isLoading={isLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <ChartContainer
          title="Rides & Bookings Trend"
          description="Daily rides and bookings over the selected period"
          isLoading={isLoading}
          onExport={(format) => {
            if (format === 'csv' && ridesTimeSeries) {
              exportTimeSeries(ridesTimeSeries.data, 'rides', filters);
            }
          }}
          height={280}
        >
          <MultiSeriesChart
            data={chartData}
            series={[
              { key: 'rides', name: 'Rides', color: '#6366F1' },
              { key: 'bookings', name: 'Bookings', color: '#F97316' },
            ]}
          />
        </ChartContainer>

        <ChartContainer
          title="Top Routes"
          description="Most popular origin-destination pairs"
          isLoading={isLoading}
          height={280}
        >
          <SimpleBarChart
            data={topRoutes.map(r => ({
              name: `${r.origin.split(',')[0]} → ${r.destination.split(',')[0]}`.substring(0, 25),
              value: r.rideCount,
            }))}
            color={CHART_COLORS[0]}
            horizontal
          />
        </ChartContainer>
      </div>

      {/* Quick Links */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/admin/analytics/users"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-blue-200 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </div>
          <h3 className="font-semibold text-gray-900">User Analytics</h3>
          <p className="text-sm text-gray-500">Growth, retention, segments</p>
        </Link>

        <Link
          to="/admin/analytics/rides"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-indigo-200 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Car className="w-5 h-5 text-indigo-600" />
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
          </div>
          <h3 className="font-semibold text-gray-900">Ride Analytics</h3>
          <p className="text-sm text-gray-500">Types, completion, trends</p>
        </Link>

        <Link
          to="/admin/analytics/geo"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-green-200 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-green-600" />
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
          </div>
          <h3 className="font-semibold text-gray-900">Geo Analytics</h3>
          <p className="text-sm text-gray-500">Locations, routes, coverage</p>
        </Link>

        <Link
          to="/admin/analytics/ops"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-orange-200 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
              <Activity className="w-5 h-5 text-orange-600" />
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-600 transition-colors" />
          </div>
          <h3 className="font-semibold text-gray-900">Ops Health</h3>
          <p className="text-sm text-gray-500">System status, errors</p>
        </Link>
      </div>

      {/* Export Actions */}
      {kpis && (
        <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Export Reports</h3>
              <p className="text-sm text-gray-500">Download analytics data for the selected period</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => exportKpiSummary(kpis, filters)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                Export KPIs (CSV)
              </button>
              <button
                onClick={handleExportPDF}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Full Report (PDF)
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
