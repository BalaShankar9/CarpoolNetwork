import { useState, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Users,
  Car,
  MapPin,
  Clock,
  CheckCircle,
  BarChart3,
  PieChart,
  Activity,
  RefreshCw,
  Plane,
  Briefcase,
  Package,
  Star,
  Building2,
  Route,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getRideTypeInfo, RIDE_TYPE_LIST } from '../../types/rideTypes';

interface MetricCard {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
  targetId?: string;
}

interface ChartData {
  label: string;
  value: number;
}

export default function AdvancedAnalytics() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [comparisonEnabled, setComparisonEnabled] = useState(false);

  const [userGrowth, setUserGrowth] = useState<ChartData[]>([]);
  const [peakTimes, setPeakTimes] = useState<ChartData[]>([]);
  const [bookingFunnel, setBookingFunnel] = useState<any[]>([]);
  const [popularRoutes, setPopularRoutes] = useState<any[]>([]);
  const [geoDistribution, setGeoDistribution] = useState<any[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);

  const [rideStats, setRideStats] = useState<any>(null);
  const [bookingStats, setBookingStats] = useState<any>(null);

  // New Phase 6 state
  const [rideTypeDistribution, setRideTypeDistribution] = useState<any[]>([]);
  const [cityDistribution, setCityDistribution] = useState<any[]>([]);
  const [driverLeaderboard, setDriverLeaderboard] = useState<any[]>([]);
  const [realtimeActivity, setRealtimeActivity] = useState<any[]>([]);
  const [communityGrowth, setCommunityGrowth] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const days = parseInt(timeRange.replace('d', ''));

      const [
        growthData,
        peakData,
        funnelData,
        routesData,
        geoData,
        rideStatsData,
        bookingStatsData,
        // New Phase 6 data
        rideTypeData,
        cityData,
        leaderboardData,
        realtimeData,
        communityData,
      ] = await Promise.all([
        supabase.rpc('get_user_growth', { period_days: days }),
        supabase.rpc('get_peak_times'),
        supabase.rpc('get_booking_funnel', { period_days: days }),
        supabase.from('popular_routes').select('*'),
        supabase.rpc('get_geographic_distribution'),
        supabase.from('ride_completion_stats').select('*').single(),
        supabase.from('booking_success_metrics').select('*').single(),
        // New Phase 6 queries
        supabase.from('ride_type_distribution').select('*'),
        supabase.from('city_user_distribution').select('*').limit(15),
        supabase.from('driver_leaderboard').select('*').limit(10),
        supabase.rpc('get_realtime_activity'),
        supabase.rpc('get_community_growth', { period_days: days }),
      ]);

      if (growthData.data) {
        setUserGrowth(growthData.data.map((d: any) => ({
          label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          value: d.new_users,
        })));
      }

      if (peakData.data) {
        setPeakTimes(peakData.data.map((d: any) => ({
          label: `${d.hour_of_day}:00`,
          value: d.ride_count,
        })));
      }

      if (funnelData.data) {
        setBookingFunnel(funnelData.data);
      }

      if (routesData.data) {
        setPopularRoutes(routesData.data);
      }

      if (geoData.data) {
        setGeoDistribution(geoData.data);
      }

      if (rideStatsData.data) {
        setRideStats(rideStatsData.data);
      }

      if (bookingStatsData.data) {
        setBookingStats(bookingStatsData.data);
      }

      // Set new Phase 6 data
      if (rideTypeData.data) {
        setRideTypeDistribution(rideTypeData.data);
      }

      if (cityData.data) {
        setCityDistribution(cityData.data);
      }

      if (leaderboardData.data) {
        setDriverLeaderboard(leaderboardData.data);
      }

      if (realtimeData.data) {
        setRealtimeActivity(realtimeData.data);
      }

      if (communityData.data) {
        setCommunityGrowth(communityData.data);
      }

      if (comparisonEnabled) {
        await loadComparisonData(days);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadComparisonData = async (days: number) => {
    const currentEnd = new Date();
    const currentStart = new Date(currentEnd.getTime() - days * 24 * 60 * 60 * 1000);
    const previousEnd = currentStart;
    const previousStart = new Date(previousEnd.getTime() - days * 24 * 60 * 60 * 1000);

    const { data } = await supabase.rpc('get_period_comparison', {
      current_start: currentStart.toISOString().split('T')[0],
      current_end: currentEnd.toISOString().split('T')[0],
      previous_start: previousStart.toISOString().split('T')[0],
      previous_end: previousEnd.toISOString().split('T')[0],
    });

    if (data) {
      setComparisonData(data);
    }
  };

  const scrollToSection = (id: string) => {
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, id: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      scrollToSection(id);
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => row[h]).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const metrics: MetricCard[] = [
    {
      label: 'Ride Completion Rate',
      value: `${rideStats?.completion_rate || 0}%`,
      change: 5.2,
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'bg-green-100 text-green-600',
      targetId: 'analytics-ride-stats',
    },
    {
      label: 'Booking Confirmation Rate',
      value: `${bookingStats?.confirmation_rate || 0}%`,
      change: 3.1,
      icon: <Activity className="w-6 h-6" />,
      color: 'bg-blue-100 text-blue-600',
      targetId: 'analytics-booking-funnel',
    },
    {
      label: 'Total Rides',
      value: rideStats?.total_rides || 0,
      change: -2.4,
      icon: <Car className="w-6 h-6" />,
      color: 'bg-orange-100 text-orange-600',
      targetId: 'analytics-popular-routes',
    },
    {
      label: 'User Growth',
      value: userGrowth.length > 0 ? userGrowth[userGrowth.length - 1].value : 0,
      change: 8.7,
      icon: <Users className="w-6 h-6" />,
      color: 'bg-purple-100 text-purple-600',
      targetId: 'analytics-user-growth',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <AdminLayout
      title="Advanced Analytics"
      subtitle="Comprehensive platform insights and metrics"
      actions={
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={loadAnalytics}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => exportToCSV(popularRoutes, 'popular-routes')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Download className="w-5 h-5" />
            Export Data
          </button>
        </div>
      }
    >

      {/* Time Range Selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-900">Time Range:</span>
            <div className="flex flex-wrap gap-2">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer self-start sm:self-auto">
            <input
              type="checkbox"
              checked={comparisonEnabled}
              onChange={(e) => {
                setComparisonEnabled(e.target.checked);
                if (e.target.checked) {
                  loadComparisonData(parseInt(timeRange.replace('d', '')));
                }
              }}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Enable Period Comparison</span>
          </label>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        {metrics.map((metric, idx) => {
          const isClickable = Boolean(metric.targetId);

          return (
            <div
              key={idx}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onClick={isClickable ? () => scrollToSection(metric.targetId!) : undefined}
              onKeyDown={isClickable ? (event) => handleCardKeyDown(event, metric.targetId!) : undefined}
              className={`bg-white rounded-xl border border-gray-200 p-6 ${isClickable ? 'cursor-pointer hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-300' : ''
                }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-3 rounded-lg ${metric.color}`}>
                  {metric.icon}
                </div>
                {metric.change !== undefined && (
                  <div className={`flex items-center gap-1 text-sm font-medium ${metric.change >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {metric.change >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    {Math.abs(metric.change)}%
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-1">{metric.label}</p>
              <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
            </div>
          );
        })}
      </div>
      {/* Comparison Data */}
      {comparisonEnabled && comparisonData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Period-over-Period Comparison
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {comparisonData.map((item, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">{item.metric}</p>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-2xl font-bold text-gray-900">{item.current_value}</span>
                  <span className="text-sm text-gray-500">current</span>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-lg font-medium text-gray-700">{item.previous_value}</span>
                  <span className="text-sm text-gray-500">previous</span>
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${item.change_percentage >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                  {item.change_percentage >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {Math.abs(item.change_percentage).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 id="analytics-user-growth" className="font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5" />
              User Growth Trend
            </h3>
            <button
              onClick={() => exportToCSV(userGrowth, 'user-growth')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Export
            </button>
          </div>
          <div className="flex items-end justify-between gap-2 h-64">
            {userGrowth.slice(-14).map((item, idx) => {
              const maxValue = Math.max(...userGrowth.map(d => d.value));
              const height = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex items-end justify-center" style={{ height: '230px' }}>
                    <div
                      className="w-full bg-blue-500 rounded-t-lg transition-all hover:bg-blue-600 cursor-pointer relative group"
                      style={{ height: `${height}%`, minHeight: item.value > 0 ? '8px' : '0' }}
                    >
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {item.value}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-2 -rotate-45 origin-top-left">
                    {item.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Peak Times Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 id="analytics-peak-times" className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Peak Ride Times
            </h3>
            <button
              onClick={() => exportToCSV(peakTimes, 'peak-times')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Export
            </button>
          </div>
          <div className="flex items-end justify-between gap-1 h-64">
            {peakTimes.map((item, idx) => {
              const maxValue = Math.max(...peakTimes.map(d => d.value));
              const height = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex items-end justify-center" style={{ height: '230px' }}>
                    <div
                      className="w-full bg-orange-500 rounded-t-lg transition-all hover:bg-orange-600 cursor-pointer relative group"
                      style={{ height: `${height}%`, minHeight: item.value > 0 ? '8px' : '0' }}
                    >
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.value}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">{item.label.split(':')[0]}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Booking Conversion Funnel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 id="analytics-booking-funnel" className="font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Booking Conversion Funnel
          </h3>
          <button
            onClick={() => exportToCSV(bookingFunnel, 'booking-funnel')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Export
          </button>
        </div>
        <div className="space-y-4">
          {bookingFunnel.map((stage, idx) => {
            const colors = ['bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500'];
            return (
              <div key={idx}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{stage.stage}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-gray-900">{stage.count}</span>
                    <span className="text-sm font-medium text-gray-600">({stage.percentage}%)</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${colors[idx % colors.length]} transition-all`}
                    style={{ width: `${stage.percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Popular Routes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 id="analytics-popular-routes" className="font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Popular Routes
            </h3>
            <button
              onClick={() => exportToCSV(popularRoutes, 'popular-routes')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Export
            </button>
          </div>
          <div className="space-y-3">
            {popularRoutes.slice(0, 10).map((route, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">
                    {route.origin} {'->'} {route.destination}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {route.unique_drivers} drivers - Avg {route.avg_seats} seats
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600">{route.ride_count}</p>
                  <p className="text-xs text-gray-500">rides</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 id="analytics-geo-distribution" className="font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Geographic Distribution
            </h3>
            <button
              onClick={() => exportToCSV(geoDistribution, 'geo-distribution')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Export
            </button>
          </div>
          <div className="space-y-3">
            {geoDistribution.slice(0, 10).map((location, idx) => {
              const maxCount = Math.max(...geoDistribution.map(g => g.ride_count));
              const percentage = maxCount > 0 ? (location.ride_count / maxCount) * 100 : 0;
              return (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{location.location}</span>
                    <span className="text-sm font-bold text-gray-900">{location.ride_count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Ride and Booking Stats Summary */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6">
          <h3 id="analytics-ride-stats" className="font-semibold text-green-900 mb-4 flex items-center gap-2">
            <Car className="w-5 h-5" />
            Ride Statistics (Last 30 Days)
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-green-700">Completed</p>
              <p className="text-2xl font-bold text-green-900">{rideStats?.completed_rides || 0}</p>
            </div>
            <div>
              <p className="text-sm text-green-700">Cancelled</p>
              <p className="text-2xl font-bold text-green-900">{rideStats?.cancelled_rides || 0}</p>
            </div>
            <div>
              <p className="text-sm text-green-700">Active</p>
              <p className="text-2xl font-bold text-green-900">{rideStats?.active_rides || 0}</p>
            </div>
            <div>
              <p className="text-sm text-green-700">Scheduled</p>
              <p className="text-2xl font-bold text-green-900">{rideStats?.scheduled_rides || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
          <h3 id="analytics-booking-stats" className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Booking Statistics (Last 30 Days)
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-blue-700">Confirmed</p>
              <p className="text-2xl font-bold text-blue-900">{bookingStats?.confirmed_bookings || 0}</p>
            </div>
            <div>
              <p className="text-sm text-blue-700">Pending</p>
              <p className="text-2xl font-bold text-blue-900">{bookingStats?.pending_bookings || 0}</p>
            </div>
            <div>
              <p className="text-sm text-blue-700">Cancelled</p>
              <p className="text-2xl font-bold text-blue-900">{bookingStats?.cancelled_bookings || 0}</p>
            </div>
            <div>
              <p className="text-sm text-blue-700">Total</p>
              <p className="text-2xl font-bold text-blue-900">{bookingStats?.total_bookings || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-red-500" />
            Real-time Activity
          </h3>
          <span className="flex items-center gap-1 text-xs text-green-600">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Live
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {realtimeActivity.map((item, idx) => (
            <div key={idx} className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{item.count}</p>
              <p className="text-xs text-gray-600">{item.metric.replace(/_/g, ' ').replace(/1h/g, '(1h)')}</p>
              <p className="text-xs text-gray-400">{item.time_period}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Ride Type Distribution */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 id="analytics-ride-types" className="font-semibold text-gray-900 flex items-center gap-2">
            <Route className="w-5 h-5 text-indigo-500" />
            Ride Type Distribution
          </h3>
          <button
            onClick={() => exportToCSV(rideTypeDistribution, 'ride-type-distribution')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Export
          </button>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Pie Chart Visualization */}
          <div className="space-y-3">
            {rideTypeDistribution.map((type, idx) => {
              const info = getRideTypeInfo(type.ride_type);
              return (
                <div key={idx} className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${info.color} flex items-center justify-center text-lg`}>
                    {info.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{info.label}</span>
                      <span className="text-sm font-bold text-gray-900">{type.total_count} rides</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${info.color.replace('-100', '-500')}`}
                        style={{ width: `${type.percentage || 0}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-gray-500 w-12 text-right">{type.percentage || 0}%</span>
                </div>
              );
            })}
          </div>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            {rideTypeDistribution.slice(0, 4).map((type, idx) => {
              const info = getRideTypeInfo(type.ride_type);
              return (
                <div key={idx} className={`p-4 rounded-lg ${info.color}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{info.icon}</span>
                    <span className={`font-medium ${info.textColor}`}>{info.label}</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className={info.textColor}>Completed:</span>
                      <span className={`font-semibold ${info.textColor}`}>{type.completed_count || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={info.textColor}>Active:</span>
                      <span className={`font-semibold ${info.textColor}`}>{type.active_count || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={info.textColor}>Avg Seats:</span>
                      <span className={`font-semibold ${info.textColor}`}>{type.avg_seats_offered || 0}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Community & City Analytics */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Users by City */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 id="analytics-cities" className="font-semibold text-gray-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-500" />
              Community by City
            </h3>
            <button
              onClick={() => exportToCSV(cityDistribution, 'city-distribution')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Export
            </button>
          </div>
          <div className="space-y-3">
            {cityDistribution.slice(0, 10).map((city, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{city.city_name}</p>
                  <p className="text-xs text-gray-500">
                    {city.driver_count} drivers • {city.rider_count} riders
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-purple-600">{city.user_count}</p>
                  <p className="text-xs text-gray-400">{city.percentage}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Community Growth */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Community Growth (Last {timeRange.replace('d', ' Days')})
            </h3>
          </div>
          <div className="space-y-3">
            {communityGrowth.slice(0, 8).map((city, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{city.city}</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <p className="font-bold text-green-600">{city.new_users}</p>
                    <p className="text-xs text-gray-500">Users</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-blue-600">{city.new_drivers}</p>
                    <p className="text-xs text-gray-500">Drivers</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-orange-600">{city.rides_created}</p>
                    <p className="text-xs text-gray-500">Rides</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Driver Leaderboard */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 id="analytics-leaderboard" className="font-semibold text-gray-900 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Top Drivers Leaderboard
          </h3>
          <button
            onClick={() => exportToCSV(driverLeaderboard, 'driver-leaderboard')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Export
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
                <th className="pb-3 font-medium">#</th>
                <th className="pb-3 font-medium">Driver</th>
                <th className="pb-3 font-medium">City</th>
                <th className="pb-3 font-medium text-center">Rides</th>
                <th className="pb-3 font-medium text-center">Completed</th>
                <th className="pb-3 font-medium text-center">Passengers</th>
                <th className="pb-3 font-medium text-center">Rating</th>
                <th className="pb-3 font-medium text-center">Reliability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {driverLeaderboard.map((driver, idx) => (
                <tr key={driver.driver_id} className="hover:bg-gray-50">
                  <td className="py-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                        idx === 1 ? 'bg-gray-200 text-gray-700' :
                          idx === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-600'
                      }`}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      {driver.avatar_url ? (
                        <img src={driver.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <Users className="w-4 h-4 text-blue-600" />
                        </div>
                      )}
                      <span className="font-medium text-gray-900">{driver.full_name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-sm text-gray-600">{driver.city || '-'}</td>
                  <td className="py-3 text-center font-semibold text-gray-900">{driver.total_rides_offered}</td>
                  <td className="py-3 text-center text-green-600 font-semibold">{driver.completed_rides}</td>
                  <td className="py-3 text-center text-blue-600 font-semibold">{driver.total_passengers}</td>
                  <td className="py-3 text-center">
                    <span className="flex items-center justify-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      {driver.average_rating?.toFixed(1) || '-'}
                    </span>
                  </td>
                  <td className="py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${driver.reliability_score >= 90 ? 'bg-green-100 text-green-700' :
                        driver.reliability_score >= 70 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                      }`}>
                      {driver.reliability_score?.toFixed(0) || 0}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
