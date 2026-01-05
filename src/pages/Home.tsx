import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Users, TrendingUp, Calendar, MapPin, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import SmartRecommendations from '../components/shared/SmartRecommendations';
import ClickableUserProfile from '../components/shared/ClickableUserProfile';
import { fetchPublicProfilesByIds, PublicProfile } from '../services/publicProfiles';

interface Stats {
  totalRidesOffered: number;
  totalRidesTaken: number;
  upcomingRides: number;
  activeRides: number;
}

interface RecentRide {
  id: string;
  origin: string;
  destination: string;
  departure_time: string;
  available_seats: number;
  driver_id: string;
  driver: PublicProfile | null;
}

export default function Home() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalRidesOffered: 0,
    totalRidesTaken: 0,
    upcomingRides: 0,
    activeRides: 0,
  });
  const [recentRides, setRecentRides] = useState<RecentRide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();

    const ridesChannel = supabase
      .channel('home-rides-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides'
        },
        () => {
          loadDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_bookings'
        },
        () => {
          loadDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ridesChannel);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: activeRidesData } = await supabase
        .from('rides')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .gt('available_seats', 0);

      const { data: recentRidesData } = await supabase
        .from('rides')
        .select(`
          id,
          origin,
          destination,
          departure_time,
          available_seats,
          driver_id
        `)
        .eq('status', 'active')
        .gt('available_seats', 0)
        .gte('departure_time', new Date().toISOString())
        .order('departure_time', { ascending: true })
        .limit(5);

      setStats({
        totalRidesOffered: profile?.total_rides_offered || 0,
        totalRidesTaken: profile?.total_rides_taken || 0,
        upcomingRides: activeRidesData?.length || 0,
        activeRides: activeRidesData?.length || 0,
      });

      const rides = (recentRidesData as RecentRide[]) || [];
      const driverIds = rides.map((ride) => ride.driver_id);
      const driversById = await fetchPublicProfilesByIds(driverIds);
      const filteredRides = rides
        .filter((ride) => ride.available_seats > 0)
        .map((ride) => ({
          ...ride,
          driver: driversById[ride.driver_id] || null,
        }));
      setRecentRides(filteredRides);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome back, {profile?.full_name?.split(' ')[0]}!</h1>
        <p className="text-gray-600 mt-1">Here's your carpooling activity</p>
      </div>

      <SmartRecommendations />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Car className="w-6 h-6 text-blue-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalRidesOffered}</p>
          <p className="text-sm text-gray-600 mt-1">Rides Offered</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalRidesTaken}</p>
          <p className="text-sm text-gray-600 mt-1">Rides Taken</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.upcomingRides}</p>
          <p className="text-sm text-gray-600 mt-1">Available Rides</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <div className="text-2xl">⭐</div>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{(profile?.average_rating || 0).toFixed(1)}</p>
          <p className="text-sm text-gray-600 mt-1">Your Rating</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/find-rides')}
              className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Find a Ride</p>
                  <p className="text-sm text-gray-600">Search available rides</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => navigate('/request-ride')}
              className="w-full flex items-center justify-between p-4 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Request a Ride</p>
                  <p className="text-sm text-gray-600">Post where you need to go</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-orange-600 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => navigate('/post-ride')}
              className="w-full flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <Car className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Offer a Ride</p>
                  <p className="text-sm text-gray-600">Post your trip</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-green-600 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Available Rides</h2>
            <button
              onClick={() => navigate('/find-rides')}
              className="text-sm text-blue-600 hover:underline"
            >
              View all
            </button>
          </div>
          <div className="space-y-3">
            {recentRides.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No upcoming rides available</p>
            ) : (
              recentRides.filter(ride => ride.available_seats > 0).map((ride) => (
                <div
                  key={ride.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/rides/${ride.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(`/rides/${ride.id}`);
                    }
                  }}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                        <span className="font-medium">{ride.origin}</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium">{ride.destination}</span>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">{formatDateTime(ride.departure_time)}</p>
                      {ride.driver && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <ClickableUserProfile
                            user={{
                              id: ride.driver.id,
                              full_name: ride.driver.full_name,
                              avatar_url: ride.driver.avatar_url,
                              profile_photo_url: ride.driver.profile_photo_url
                            }}
                            size="sm"
                            rating={ride.driver.average_rating}
                            showNameRight={true}
                          />
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-blue-600">
                        {ride.available_seats} {ride.available_seats === 1 ? 'seat' : 'seats'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
