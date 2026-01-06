import { useState, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

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
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
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

  useEffect(() => {
    if (!isAdmin) {
      navigate('/admin');
      return;
    }
    loadAnalytics();
  }, [isAdmin, timeRange]);

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
      ] = await Promise.all([
        supabase.rpc('get_user_growth', { period_days: days }),
        supabase.rpc('get_peak_times'),
        supabase.rpc('get_booking_funnel', { period_days: days }),
        supabase.from('popular_routes').select('*'),
        supabase.rpc('get_geographic_distribution'),
        supabase.from('ride_completion_stats').select('*').single(),
        supabase.from('booking_success_metrics').select('*').single(),
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
    </AdminLayout>
  );
}