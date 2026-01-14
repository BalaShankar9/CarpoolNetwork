/**
 * Geographic Analytics Page
 * 
 * Drilldown for location-based analytics: popular areas, route patterns, coverage.
 */

import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import KpiCard from '../../../components/admin/analytics/KpiCard';
import AnalyticsFilterBar from '../../../components/admin/analytics/AnalyticsFilters';
import DataTable from '../../../components/admin/analytics/DataTable';
import {
  ChartContainer,
  SimpleBarChart,
  HeatMap,
  CHART_COLORS,
} from '../../../components/admin/analytics/AnalyticsCharts';
import { exportToCSV, exportGeoDistribution, exportTopRoutes } from '../../../components/admin/analytics/exportUtils';
import {
  MapPin,
  Route,
  Navigation,
  Globe,
  RefreshCw,
  Building2,
} from 'lucide-react';
import {
  getGeoDistribution,
  getTopRoutes,
  getCommunityGrowth,
  clearAdminAnalyticsCache,
} from '../../../services/adminAnalyticsService';
import type { AnalyticsFilters, GeoDistribution, TopRoute } from '../../../types/analytics';

interface CommunityGrowth {
  city: string;
  newUsers: number;
  newDrivers: number;
  ridesCreated: number;
  bookingsMade: number;
}

export default function GeoAnalytics() {
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

  const [geoDistribution, setGeoDistribution] = useState<GeoDistribution[]>([]);
  const [topRoutes, setTopRoutes] = useState<TopRoute[]>([]);
  const [communityGrowth, setCommunityGrowth] = useState<CommunityGrowth[]>([]);
  
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

      const [geoData, routesData, growthData] = await Promise.all([
        getGeoDistribution(filters),
        getTopRoutes(filters, 15),
        getCommunityGrowth(periodDays),
      ]);

      setGeoDistribution(geoData);
      setTopRoutes(routesData);
      setCommunityGrowth(growthData);
    } catch (err) {
      console.error('Failed to load geo analytics:', err);
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

  // Calculate summary stats
  const totalAreas = geoDistribution.length;
  const totalRides = geoDistribution.reduce((sum, d) => sum + d.rides, 0);
  const topArea = geoDistribution[0]?.area || 'N/A';
  const avgRidesPerArea = totalAreas > 0 ? Math.round(totalRides / totalAreas) : 0;

  // Prepare chart data
  const areaChartData = geoDistribution.slice(0, 10).map(d => ({
    name: d.area.substring(0, 15),
    value: d.rides,
  }));

  // Route columns
  const routeColumns = [
    { 
      key: 'origin', 
      label: 'Origin',
      render: (value: unknown) => String(value).split(',')[0].substring(0, 20),
    },
    { 
      key: 'destination', 
      label: 'Destination',
      render: (value: unknown) => String(value).split(',')[0].substring(0, 20),
    },
    { key: 'rideCount', label: 'Rides', align: 'right' as const },
    { key: 'bookingCount', label: 'Bookings', align: 'right' as const },
    { 
      key: 'avgFillRate', 
      label: 'Fill Rate', 
      align: 'right' as const,
      render: (value: unknown) => (
        <span className={`font-medium ${Number(value) >= 50 ? 'text-green-600' : Number(value) >= 25 ? 'text-yellow-600' : 'text-red-600'}`}>
          {Number(value).toFixed(0)}%
        </span>
      ),
    },
  ];

  // Community growth columns
  const growthColumns = [
    { key: 'city', label: 'City' },
    { key: 'newUsers', label: 'New Users', align: 'right' as const },
    { key: 'newDrivers', label: 'New Drivers', align: 'right' as const },
    { key: 'ridesCreated', label: 'Rides', align: 'right' as const },
    { key: 'bookingsMade', label: 'Bookings', align: 'right' as const },
  ];

  // Geo distribution columns
  const geoColumns = [
    { key: 'area', label: 'Area' },
    { key: 'rides', label: 'Rides', align: 'right' as const },
    { key: 'bookings', label: 'Bookings', align: 'right' as const },
    { key: 'users', label: 'Users', align: 'right' as const },
  ];

  return (
    <AdminLayout
      title="Geographic Analytics"
      subtitle="Location-based insights and route patterns"
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
          title="Active Areas"
          value={totalAreas.toString()}
          icon={<MapPin className="w-5 h-5" />}
          color="green"
          isLoading={isLoading}
        />
        <KpiCard
          title="Top Area"
          value={topArea.substring(0, 15)}
          description="Most rides originated"
          icon={<Building2 className="w-5 h-5" />}
          color="blue"
          isLoading={isLoading}
        />
        <KpiCard
          title="Total Routes"
          value={topRoutes.length.toString()}
          icon={<Route className="w-5 h-5" />}
          color="indigo"
          isLoading={isLoading}
        />
        <KpiCard
          title="Avg Rides/Area"
          value={avgRidesPerArea.toString()}
          icon={<Navigation className="w-5 h-5" />}
          color="orange"
          isLoading={isLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <ChartContainer
          title="Rides by Area"
          description="Top 10 areas by ride volume"
          isLoading={isLoading}
          onExport={(format) => {
            if (format === 'csv') {
              exportGeoDistribution(geoDistribution, filters);
            }
          }}
          height={350}
        >
          <SimpleBarChart
            data={areaChartData}
            color={CHART_COLORS[1]}
            horizontal
          />
        </ChartContainer>

        <ChartContainer
          title="Route Patterns"
          description="Most popular origin-destination pairs"
          isLoading={isLoading}
          onExport={(format) => {
            if (format === 'csv') {
              exportTopRoutes(topRoutes, filters);
            }
          }}
          height={350}
        >
          <SimpleBarChart
            data={topRoutes.slice(0, 8).map(r => ({
              name: `${r.origin.split(',')[0]} → ${r.destination.split(',')[0]}`.substring(0, 20),
              value: r.rideCount,
            }))}
            color={CHART_COLORS[4]}
            horizontal
          />
        </ChartContainer>
      </div>

      {/* Top Routes Table */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Routes</h3>
        <DataTable
          data={topRoutes}
          columns={routeColumns}
          isLoading={isLoading}
          pageSize={10}
          onExport={() => exportTopRoutes(topRoutes, filters)}
          emptyMessage="No route data available"
        />
      </div>

      {/* Community Growth Table */}
      {communityGrowth.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Growth by City</h3>
          <DataTable
            data={communityGrowth}
            columns={growthColumns}
            isLoading={isLoading}
            pageSize={10}
            onExport={() => exportToCSV(communityGrowth, 'community-growth')}
            emptyMessage="No community growth data available"
          />
        </div>
      )}

      {/* Geographic Distribution Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">All Areas</h3>
        <DataTable
          data={geoDistribution}
          columns={geoColumns}
          isLoading={isLoading}
          pageSize={15}
          onExport={() => exportGeoDistribution(geoDistribution, filters)}
          emptyMessage="No geographic data available"
        />
      </div>
    </AdminLayout>
  );
}
