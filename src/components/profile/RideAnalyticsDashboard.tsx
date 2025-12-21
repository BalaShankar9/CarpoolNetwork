import { useState, useEffect } from 'react';
import { TrendingUp, Leaf, MapPin, Clock, DollarSign, Users, Calendar, Award } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface RideStats {
  totalDistance: number;
  totalRides: number;
  totalDriverRides: number;
  totalPassengerRides: number;
  carbonSaved: number;
  moneySaved: number;
  timeInRides: number;
  peopleConnected: number;
  mostFrequentRoute?: {
    origin: string;
    destination: string;
    count: number;
  };
}

export default function RideAnalyticsDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<RideStats>({
    totalDistance: 0,
    totalRides: 0,
    totalDriverRides: 0,
    totalPassengerRides: 0,
    carbonSaved: 0,
    moneySaved: 0,
    timeInRides: 0,
    peopleConnected: 0
  });

  useEffect(() => {
    if (profile?.id) {
      loadRideAnalytics();
    }
  }, [profile?.id]);

  const loadRideAnalytics = async () => {
    try {
      setLoading(true);

      // Get rides as driver
      const { data: driverRides, error: driverError } = await supabase
        .from('rides')
        .select('*, ride_bookings(*)')
        .eq('driver_id', profile?.id)
        .in('status', ['completed', 'in-progress']);

      if (driverError) throw driverError;

      // Get rides as passenger
      const { data: passengerBookings, error: passengerError } = await supabase
        .from('ride_bookings')
        .select('*, ride:rides(*)')
        .eq('passenger_id', profile?.id)
        .in('status', ['completed', 'confirmed']);

      if (passengerError) throw passengerError;

      // Calculate statistics
      let totalDistance = 0;
      let totalDuration = 0;
      const uniquePeople = new Set<string>();
      const routeCounts: { [key: string]: { origin: string; destination: string; count: number } } = {};

      // Process driver rides
      if (driverRides) {
        driverRides.forEach(ride => {
          if (ride.estimated_distance) {
            totalDistance += Number(ride.estimated_distance);
          }
          if (ride.estimated_duration) {
            totalDuration += Number(ride.estimated_duration);
          }

          // Track route frequency
          const routeKey = `${ride.origin}-${ride.destination}`;
          if (!routeCounts[routeKey]) {
            routeCounts[routeKey] = {
              origin: ride.origin,
              destination: ride.destination,
              count: 0
            };
          }
          routeCounts[routeKey].count++;

          // Count unique passengers
          if (ride.ride_bookings) {
            ride.ride_bookings.forEach((booking: any) => {
              uniquePeople.add(booking.passenger_id);
            });
          }
        });
      }

      // Process passenger rides
      if (passengerBookings) {
        passengerBookings.forEach((booking: any) => {
          const ride = booking.ride;
          if (ride) {
            if (ride.estimated_distance) {
              totalDistance += Number(ride.estimated_distance);
            }
            if (ride.estimated_duration) {
              totalDuration += Number(ride.estimated_duration);
            }

            uniquePeople.add(ride.driver_id);

            const routeKey = `${ride.origin}-${ride.destination}`;
            if (!routeCounts[routeKey]) {
              routeCounts[routeKey] = {
                origin: ride.origin,
                destination: ride.destination,
                count: 0
              };
            }
            routeCounts[routeKey].count++;
          }
        });
      }

      // Find most frequent route
      let mostFrequentRoute;
      if (Object.keys(routeCounts).length > 0) {
        const sortedRoutes = Object.values(routeCounts).sort((a, b) => b.count - a.count);
        mostFrequentRoute = sortedRoutes[0];
      }

      // Calculate carbon savings (average car emits 0.171 kg CO2 per km)
      const carbonSaved = totalDistance * 0.171;

      // Calculate money saved (average cost £0.15/km for car ownership)
      const moneySaved = totalDistance * 0.15;

      setStats({
        totalDistance: Math.round(totalDistance),
        totalRides: (driverRides?.length || 0) + (passengerBookings?.length || 0),
        totalDriverRides: driverRides?.length || 0,
        totalPassengerRides: passengerBookings?.length || 0,
        carbonSaved: Math.round(carbonSaved * 10) / 10,
        moneySaved: Math.round(moneySaved * 100) / 100,
        timeInRides: Math.round(totalDuration / 60),
        peopleConnected: uniquePeople.size,
        mostFrequentRoute
      });
    } catch (err) {
      console.error('Error loading ride analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 md:p-8 border border-gray-200 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-6 h-6 text-gray-900" />
        <div>
          <h3 className="text-xl font-bold text-gray-900">Your Ride Analytics</h3>
          <p className="text-sm text-gray-600">Track your carpooling impact</p>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-medium text-blue-600">Distance</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalDistance}</div>
          <div className="text-xs text-gray-600">kilometers traveled</div>
        </div>

        <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <Leaf className="w-5 h-5 text-green-600" />
            <span className="text-xs font-medium text-green-600">Carbon</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.carbonSaved}</div>
          <div className="text-xs text-gray-600">kg CO₂ saved</div>
        </div>

        <div className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg border border-amber-200">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-amber-600" />
            <span className="text-xs font-medium text-amber-600">Savings</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">£{stats.moneySaved}</div>
          <div className="text-xs text-gray-600">estimated saved</div>
        </div>

        <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-purple-600" />
            <span className="text-xs font-medium text-purple-600">Community</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.peopleConnected}</div>
          <div className="text-xs text-gray-600">people connected</div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-gray-600" />
            <span className="text-xs text-gray-600">Total Rides</span>
          </div>
          <div className="text-lg font-bold text-gray-900">{stats.totalRides}</div>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-4 h-4 text-gray-600" />
            <span className="text-xs text-gray-600">As Driver</span>
          </div>
          <div className="text-lg font-bold text-gray-900">{stats.totalDriverRides}</div>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-gray-600" />
            <span className="text-xs text-gray-600">As Passenger</span>
          </div>
          <div className="text-lg font-bold text-gray-900">{stats.totalPassengerRides}</div>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-gray-600" />
            <span className="text-xs text-gray-600">Time in Rides</span>
          </div>
          <div className="text-lg font-bold text-gray-900">{stats.timeInRides}h</div>
        </div>
      </div>

      {/* Environmental Impact */}
      <div className="p-5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 mb-6">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-green-100 rounded-full">
            <Leaf className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-1">Environmental Impact</h4>
            <p className="text-sm text-gray-700 mb-3">
              By carpooling, you've saved <strong>{stats.carbonSaved} kg of CO₂</strong> from
              entering the atmosphere. That's equivalent to planting{' '}
              <strong>{Math.round(stats.carbonSaved / 21)} trees</strong> and keeping them for one year!
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-3 py-1 bg-white rounded-full border border-green-300 text-green-800">
                🌱 Carbon neutral contributor
              </span>
              <span className="px-3 py-1 bg-white rounded-full border border-green-300 text-green-800">
                🚗 Reduced traffic congestion
              </span>
              <span className="px-3 py-1 bg-white rounded-full border border-green-300 text-green-800">
                💚 Community builder
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Most Frequent Route */}
      {stats.mostFrequentRoute && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Most Frequent Route
          </h4>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-gray-900">{stats.mostFrequentRoute.origin}</span>
            <span className="text-gray-500">→</span>
            <span className="font-medium text-gray-900">{stats.mostFrequentRoute.destination}</span>
            <span className="ml-auto px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
              {stats.mostFrequentRoute.count} times
            </span>
          </div>
        </div>
      )}

      {stats.totalRides === 0 && (
        <div className="text-center py-8 text-gray-500">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="font-medium">No ride data yet</p>
          <p className="text-sm">Complete rides to see your analytics</p>
        </div>
      )}
    </div>
  );
}
