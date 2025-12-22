import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Leaf,
  DollarSign,
  Clock,
  MapPin,
  Users,
  Car,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface AnalyticsData {
  totalRides: number;
  totalDistance: number;
  totalCO2Saved: number;
  totalMoneySaved: number;
  avgRideDistance: number;
  mostCommonRoute: { origin: string; destination: string; count: number } | null;
  peakHours: { hour: number; count: number }[];
  monthlyTrends: { month: string; rides: number; distance: number }[];
  ridesByDayOfWeek: { day: string; count: number }[];
}

export default function AdvancedAnalyticsDashboard() {
  const { user, profile } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year' | 'all'>('month');

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const startDate = getStartDate(timeRange);

      const { data: rides, error: ridesError } = await supabase
        .from('rides')
        .select('*')
        .eq('driver_id', user?.id)
        .gte('created_at', startDate.toISOString());

      if (ridesError) throw ridesError;

      const { data: bookings, error: bookingsError } = await supabase
        .from('ride_bookings')
        .select('*, rides(*)')
        .eq('rider_id', user?.id)
        .gte('created_at', startDate.toISOString());

      if (bookingsError) throw bookingsError;

      const allRides = [...(rides || []), ...(bookings?.map(b => b.rides) || [])];
      const totalDistance = allRides.reduce((sum, ride) => sum + estimateDistance(ride), 0);
      const co2Saved = calculateCO2Savings(totalDistance, allRides.length);
      const moneySaved = calculateMoneySavings(totalDistance);

      const routeCounts: { [key: string]: number } = {};
      allRides.forEach(ride => {
        if (ride?.origin && ride?.destination) {
          const route = `${ride.origin}-${ride.destination}`;
          routeCounts[route] = (routeCounts[route] || 0) + 1;
        }
      });

      const mostCommonRouteKey = Object.keys(routeCounts).sort((a, b) => routeCounts[b] - routeCounts[a])[0];
      const mostCommonRoute = mostCommonRouteKey
        ? {
            origin: mostCommonRouteKey.split('-')[0],
            destination: mostCommonRouteKey.split('-')[1],
            count: routeCounts[mostCommonRouteKey],
          }
        : null;

      const peakHours = calculatePeakHours(allRides);
      const monthlyTrends = calculateMonthlyTrends(allRides);
      const ridesByDayOfWeek = calculateRidesByDayOfWeek(allRides);

      setAnalytics({
        totalRides: allRides.length,
        totalDistance,
        totalCO2Saved: co2Saved,
        totalMoneySaved: moneySaved,
        avgRideDistance: allRides.length > 0 ? totalDistance / allRides.length : 0,
        mostCommonRoute,
        peakHours,
        monthlyTrends,
        ridesByDayOfWeek,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = (range: string): Date => {
    const now = new Date();
    switch (range) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      case 'all':
      default:
        return new Date(0);
    }
  };

  const estimateDistance = (ride: any): number => {
    if (!ride?.origin_lat || !ride?.destination_lat) return 0;

    const R = 6371;
    const dLat = ((ride.destination_lat - ride.origin_lat) * Math.PI) / 180;
    const dLon = ((ride.destination_lng - ride.origin_lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((ride.origin_lat * Math.PI) / 180) *
        Math.cos((ride.destination_lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const calculateCO2Savings = (distance: number, rideCount: number): number => {
    const avgCarEmissions = 0.171;
    const carpoolFactor = 0.5;
    return distance * avgCarEmissions * carpoolFactor;
  };

  const calculateMoneySavings = (distance: number): number => {
    const costPerKm = 0.15;
    return distance * costPerKm;
  };

  const calculatePeakHours = (rides: any[]): { hour: number; count: number }[] => {
    const hourCounts: { [key: number]: number } = {};
    rides.forEach(ride => {
      if (ride?.departure_time) {
        const hour = new Date(ride.departure_time).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    });

    return Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const calculateMonthlyTrends = (rides: any[]): { month: string; rides: number; distance: number }[] => {
    const monthData: { [key: string]: { rides: number; distance: number } } = {};

    rides.forEach(ride => {
      if (ride?.created_at) {
        const date = new Date(ride.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthData[monthKey]) {
          monthData[monthKey] = { rides: 0, distance: 0 };
        }
        monthData[monthKey].rides += 1;
        monthData[monthKey].distance += estimateDistance(ride);
      }
    });

    return Object.entries(monthData)
      .map(([month, data]) => ({
        month,
        rides: data.rides,
        distance: Math.round(data.distance),
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);
  };

  const calculateRidesByDayOfWeek = (rides: any[]): { day: string; count: number }[] => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts: { [key: number]: number } = {};

    rides.forEach(ride => {
      if (ride?.departure_time) {
        const day = new Date(ride.departure_time).getDay();
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      }
    });

    return dayNames.map((day, index) => ({
      day,
      count: dayCounts[index] || 0,
    }));
  };

  const formatCO2 = (kg: number): string => {
    if (kg >= 1000) {
      return `${(kg / 1000).toFixed(2)} tonnes`;
    }
    return `${kg.toFixed(2)} kg`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Advanced Analytics</h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
          <option value="year">Last Year</option>
          <option value="all">All Time</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Leaf className="w-8 h-8 opacity-80" />
            <TrendingDown className="w-5 h-5" />
          </div>
          <p className="text-green-100 text-sm mb-1">CO₂ Saved</p>
          <p className="text-3xl font-bold">{formatCO2(analytics.totalCO2Saved)}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 opacity-80" />
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-blue-100 text-sm mb-1">Money Saved</p>
          <p className="text-3xl font-bold">£{analytics.totalMoneySaved.toFixed(2)}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <MapPin className="w-8 h-8 opacity-80" />
            <Activity className="w-5 h-5" />
          </div>
          <p className="text-orange-100 text-sm mb-1">Total Distance</p>
          <p className="text-3xl font-bold">{analytics.totalDistance.toFixed(0)} km</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Car className="w-8 h-8 opacity-80" />
            <Users className="w-5 h-5" />
          </div>
          <p className="text-purple-100 text-sm mb-1">Total Rides</p>
          <p className="text-3xl font-bold">{analytics.totalRides}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Peak Travel Hours</h3>
          </div>
          {analytics.peakHours.length > 0 ? (
            <div className="space-y-3">
              {analytics.peakHours.map(({ hour, count }) => (
                <div key={hour} className="flex items-center justify-between">
                  <span className="text-gray-700">
                    {hour.toString().padStart(2, '0')}:00 - {(hour + 1).toString().padStart(2, '0')}:00
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(count / analytics.peakHours[0].count) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No data available</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <MapPin className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Most Common Route</h3>
          </div>
          {analytics.mostCommonRoute ? (
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-gray-900 font-medium">{analytics.mostCommonRoute.origin}</span>
                  </div>
                  <div className="ml-1.5 w-0.5 h-6 bg-gray-300"></div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-gray-900 font-medium">{analytics.mostCommonRoute.destination}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{analytics.mostCommonRoute.count}</p>
                  <p className="text-sm text-gray-600">rides</p>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                <p className="text-sm text-blue-800">
                  This is your most frequent route! Consider finding regular carpool partners for this journey.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No data available</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Calendar className="w-5 h-5 text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900">Rides by Day of Week</h3>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {analytics.ridesByDayOfWeek.map(({ day, count }) => {
            const maxCount = Math.max(...analytics.ridesByDayOfWeek.map(d => d.count), 1);
            const heightPercent = (count / maxCount) * 100;
            return (
              <div key={day} className="flex flex-col items-center">
                <div className="w-full h-32 bg-gray-100 rounded-lg flex items-end justify-center p-1">
                  <div
                    className="w-full bg-blue-600 rounded-t"
                    style={{ height: `${heightPercent}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-2">{day.slice(0, 3)}</p>
                <p className="text-sm font-semibold text-gray-900">{count}</p>
              </div>
            );
          })}
        </div>
      </div>

      {analytics.monthlyTrends.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <BarChart3 className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Monthly Trends</h3>
          </div>
          <div className="space-y-3">
            {analytics.monthlyTrends.map(({ month, rides, distance }) => (
              <div key={month} className="border-b border-gray-100 pb-3 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <span className="text-sm text-gray-600">{rides} rides</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${(distance / Math.max(...analytics.monthlyTrends.map(t => t.distance), 1)) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600 w-16 text-right">{distance} km</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-green-500 rounded-full">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Environmental Impact</h4>
            <p className="text-gray-700 mb-4">
              By carpooling, you've saved <strong>{formatCO2(analytics.totalCO2Saved)}</strong> of CO₂ emissions.
              That's equivalent to planting approximately{' '}
              <strong>{Math.round(analytics.totalCO2Saved / 20)}</strong> trees!
            </p>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-white rounded-lg p-3">
                <p className="text-sm text-gray-600">Avg. Distance/Ride</p>
                <p className="text-xl font-bold text-gray-900">{analytics.avgRideDistance.toFixed(1)} km</p>
              </div>
              <div className="bg-white rounded-lg p-3">
                <p className="text-sm text-gray-600">Total Savings</p>
                <p className="text-xl font-bold text-green-600">£{analytics.totalMoneySaved.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
