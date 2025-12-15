import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Calendar, Users, Star, Eye, Cloud, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import LocationAutocomplete from '../components/shared/LocationAutocomplete';
import { googleMapsService } from '../services/googleMapsService';

interface Ride {
  id: string;
  origin: string;
  destination: string;
  departure_time: string;
  available_seats: number;
  total_seats: number;
  notes: string | null;
  origin_lat: number;
  origin_lng: number;
  driver: {
    id: string;
    full_name: string;
    average_rating: number;
    total_rides_offered: number;
  };
  vehicle: {
    make: string;
    model: string;
    color: string;
  };
  userBooking?: {
    id: string;
    status: string;
  };
  weather?: {
    temperature: number;
    condition: string;
  };
}

export default function FindRides() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [seats, setSeats] = useState(1);
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    loadAllRides();
  }, []);

  const loadAllRides = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rides')
        .select(`
          *,
          driver:profiles!rides_driver_id_fkey(*),
          vehicle:vehicles(*)
        `)
        .eq('status', 'active')
        .neq('driver_id', user.id)
        .gt('available_seats', 0)
        .gte('departure_time', new Date().toISOString())
        .order('departure_time', { ascending: true })
        .limit(20);

      if (error) throw error;
      const ridesData = data || [];

      const { data: bookings } = await supabase
        .from('ride_bookings')
        .select('ride_id, id, status')
        .eq('passenger_id', user.id)
        .in('ride_id', ridesData.map(r => r.id));

      const ridesWithBookings = await Promise.all(ridesData.map(async (ride) => {
        const booking = bookings?.find(b => b.ride_id === ride.id);
        let weather = null;

        if (ride.origin_lat && ride.origin_lng) {
          try {
            weather = await googleMapsService.getWeather(ride.origin_lat, ride.origin_lng);
          } catch (e) {
            console.error('Failed to load weather:', e);
          }
        }

        return {
          ...ride,
          userBooking: booking ? { id: booking.id, status: booking.status } : undefined,
          weather: weather && weather.condition !== 'Unavailable' ? {
            temperature: weather.temperature,
            condition: weather.condition
          } : undefined
        };
      }));

      const availableRides = ridesWithBookings.filter(ride => ride.available_seats > 0);
      setRides(availableRides);
    } catch (error) {
      console.error('Error loading rides:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setSearched(true);

    try {
      let query = supabase
        .from('rides')
        .select(`
          *,
          driver:profiles!rides_driver_id_fkey(*),
          vehicle:vehicles(*)
        `)
        .eq('status', 'active')
        .neq('driver_id', user.id)
        .gte('available_seats', seats)
        .gt('available_seats', 0);

      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        query = query
          .gte('departure_time', startOfDay.toISOString())
          .lte('departure_time', endOfDay.toISOString());
      } else {
        query = query.gte('departure_time', new Date().toISOString());
      }

      query = query.order('departure_time', { ascending: true }).limit(20);

      const { data, error } = await query;

      if (error) throw error;

      const ridesData = data || [];

      const { data: bookings } = await supabase
        .from('ride_bookings')
        .select('ride_id, id, status')
        .eq('passenger_id', user.id)
        .in('ride_id', ridesData.map(r => r.id));

      const ridesWithBookings = await Promise.all(ridesData.map(async (ride) => {
        const booking = bookings?.find(b => b.ride_id === ride.id);
        let weather = null;

        if (ride.origin_lat && ride.origin_lng) {
          try {
            weather = await googleMapsService.getWeather(ride.origin_lat, ride.origin_lng);
          } catch (e) {
            console.error('Failed to load weather:', e);
          }
        }

        return {
          ...ride,
          userBooking: booking ? { id: booking.id, status: booking.status } : undefined,
          weather: weather && weather.condition !== 'Unavailable' ? {
            temperature: weather.temperature,
            condition: weather.condition
          } : undefined
        };
      }));

      const availableRides = ridesWithBookings.filter(ride => ride.available_seats > 0);
      setRides(availableRides);
    } catch (error) {
      console.error('Error searching rides:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestRide = async (rideId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('ride_bookings')
        .insert([{
          ride_id: rideId,
          passenger_id: user.id,
          pickup_location: origin || 'To be confirmed',
          pickup_lat: 0,
          pickup_lng: 0,
          dropoff_location: destination || 'To be confirmed',
          dropoff_lat: 0,
          dropoff_lng: 0,
          seats_requested: seats,
        }]);

      if (error) throw error;
      alert('Ride request sent successfully!');
      loadAllRides();
    } catch (error: any) {
      if (error.code === '23505') {
        alert('You have already requested this ride');
      } else {
        alert('Failed to request ride. Please try again.');
      }
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Find a Ride</h1>
        <p className="text-gray-600 mt-1">Search for available rides in your area</p>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <LocationAutocomplete
              id="search-origin-input"
              label="From"
              value={origin}
              onChange={(value) => setOrigin(value)}
              placeholder="Enter pickup location"
            />

            <LocationAutocomplete
              id="search-destination-input"
              label="To"
              value={destination}
              onChange={(value) => setDestination(value)}
              placeholder="Enter destination"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Seats
              </label>
              <select
                value={seats}
                onChange={(e) => setSeats(Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {[1, 2, 3, 4].map((num) => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? 'seat' : 'seats'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Search className="w-5 h-5" />
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {searched ? `${rides.length} rides found` : 'All Available Rides'}
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
        ) : rides.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
            <p className="text-gray-600">
              {searched ? 'No rides found matching your criteria' : 'No rides available'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {rides.map((ride) => (
              <div
                key={ride.id}
                className={`bg-white border rounded-xl p-6 hover:shadow-lg transition-all ${
                  ride.userBooking && ride.userBooking.status !== 'cancelled'
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200'
                }`}
              >
                {ride.userBooking && ride.userBooking.status !== 'cancelled' && (
                  <div className="mb-4 flex items-center gap-2 bg-green-100 border border-green-300 rounded-lg px-4 py-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-800">
                      Already Booked - Status: {ride.userBooking.status.charAt(0).toUpperCase() + ride.userBooking.status.slice(1)}
                    </span>
                  </div>
                )}
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl font-bold text-blue-600">
                        {ride.driver.full_name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{ride.driver.full_name}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          {ride.driver.average_rating.toFixed(1)}
                        </span>
                        <span>•</span>
                        <span>{ride.driver.total_rides_offered} rides</span>
                      </div>
                      {ride.weather && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-600">
                          <Cloud className="w-3 h-3" />
                          <span>{Math.round(ride.weather.temperature)}°C - {ride.weather.condition}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 text-gray-700">
                      <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <span className="font-medium">{ride.origin}</span>
                      <span className="text-gray-400">→</span>
                      <span className="font-medium">{ride.destination}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDateTime(ride.departure_time)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {ride.available_seats} of {ride.total_seats} seats
                      </span>
                      {ride.vehicle && (
                        <span>
                          {ride.vehicle.color} {ride.vehicle.make} {ride.vehicle.model}
                        </span>
                      )}
                    </div>
                    {ride.notes && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{ride.notes}</p>
                    )}
                  </div>

                  <div className="flex lg:flex-col gap-2 lg:justify-center">
                    <button
                      onClick={() => navigate(`/rides/${ride.id}`)}
                      className="flex-1 lg:flex-none px-6 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium whitespace-nowrap flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                    {ride.userBooking && ride.userBooking.status !== 'cancelled' ? (
                      <button
                        onClick={() => navigate(`/bookings/${ride.userBooking!.id}`)}
                        className="flex-1 lg:flex-none px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium whitespace-nowrap"
                      >
                        View Booking
                      </button>
                    ) : (
                      <button
                        onClick={() => requestRide(ride.id)}
                        className="flex-1 lg:flex-none px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium whitespace-nowrap"
                      >
                        Request Ride
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
