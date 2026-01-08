import { useState, useEffect } from 'react';
import { Car, Calendar, Star, Settings, MapPin, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';

type Ride = Database['public']['Tables']['rides']['Row'];
type Booking = Database['public']['Tables']['ride_bookings']['Row'] & {
  ride: Ride;
};

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'offered' | 'booked'>('offered');
  const [offeredRides, setOfferedRides] = useState<Ride[]>([]);
  const [bookedRides, setBookedRides] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, activeTab]);

  const loadDashboardData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      if (activeTab === 'offered') {
        const { data, error } = await supabase
          .from('rides')
          .select('*')
          .eq('driver_id', user.id)
          .order('departure_time', { ascending: false });

        if (error) throw error;
        setOfferedRides(data);
      } else {
        const { data, error } = await supabase
          .from('ride_bookings')
          .select('*, ride:rides(*)')
          .eq('passenger_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setBookedRides(data as Booking[]);
      }
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Please sign in to view your dashboard</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Dashboard</h1>
        <p className="text-gray-600">Manage your rides and profile</p>
      </div>

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Rides Offered</p>
              <p className="text-3xl font-bold text-gray-900">{profile?.total_rides_offered || 0}</p>
            </div>
            <Car className="w-12 h-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Rides Taken</p>
              <p className="text-3xl font-bold text-gray-900">{profile?.total_rides_taken || 0}</p>
            </div>
            <Users className="w-12 h-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Average Rating</p>
              <p className="text-3xl font-bold text-gray-900">
                {profile?.average_rating.toFixed(1) || '0.0'}
              </p>
            </div>
            <Star className="w-12 h-12 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Member Since</p>
              <p className="text-lg font-bold text-gray-900">
                {new Date(profile?.created_at || '').toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
            <Calendar className="w-12 h-12 text-red-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('offered')}
              className={`px-6 py-4 font-medium transition-colors ${activeTab === 'offered'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Rides I'm Offering
            </button>
            <button
              onClick={() => setActiveTab('booked')}
              className={`px-6 py-4 font-medium transition-colors ${activeTab === 'booked'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              My Bookings
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : activeTab === 'offered' ? (
            <div className="space-y-4">
              {offeredRides.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Car className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p>You haven't offered any rides yet</p>
                  <Link
                    to="/post-ride"
                    className="inline-block mt-4 text-blue-600 hover:underline"
                  >
                    Post your first ride
                  </Link>
                </div>
              ) : (
                offeredRides.map((ride) => (
                  <div
                    key={ride.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                              ride.status
                            )}`}
                          >
                            {ride.status}
                          </span>
                          {ride.is_recurring && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                              Recurring
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-gray-700 mb-2">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          <span className="font-medium">{ride.origin}</span>
                          <span className="text-gray-400">→</span>
                          <span className="font-medium">{ride.destination}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDateTime(ride.departure_time)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {ride.available_seats}/{ride.total_seats} available
                          </span>
                        </div>
                      </div>
                      <button className="text-gray-600 hover:text-blue-600 transition-colors">
                        <Settings className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {bookedRides.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p>You haven't booked any rides yet</p>
                  <Link
                    to="/find-rides"
                    className="inline-block mt-4 text-blue-600 hover:underline"
                  >
                    Find a ride
                  </Link>
                </div>
              ) : (
                bookedRides.map((booking) => (
                  <div
                    key={booking.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                              booking.status
                            )}`}
                          >
                            {booking.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700 mb-2">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          <span className="font-medium">{booking.pickup_location}</span>
                          <span className="text-gray-400">→</span>
                          <span className="font-medium">{booking.dropoff_location}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDateTime(booking.ride.departure_time)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {booking.seats_requested} {booking.seats_requested === 1 ? 'seat' : 'seats'}
                          </span>
                        </div>
                      </div>
                      <button className="text-gray-600 hover:text-blue-600 transition-colors">
                        View Details
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
