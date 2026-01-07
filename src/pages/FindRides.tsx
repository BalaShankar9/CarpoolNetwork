import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Calendar, Users, Star, Eye, Cloud, CheckCircle, AlertCircle, TrendingUp, Filter, X, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import LocationAutocomplete from '../components/shared/LocationAutocomplete';
import { googleMapsService } from '../services/googleMapsService';
import UserAvatar from '../components/shared/UserAvatar';
import { getUserProfilePath } from '../utils/profileNavigation';
import { fetchPublicProfilesByIds, PublicProfile } from '../services/publicProfiles';
import { toast } from '../lib/toast';

interface Ride {
  id: string;
  origin: string;
  destination: string;
  destination_lat: number;
  destination_lng: number;
  departure_time: string;
  available_seats: number;
  total_seats: number;
  notes: string | null;
  origin_lat: number;
  origin_lng: number;
  driver_id: string;
  driver: PublicProfile | null;
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
  matchScore?: number;
  reliabilityScore?: number;
}

interface TripRequest {
  id: string;
  from_location: string;
  to_location: string;
  departure_time: string;
  flexible_time: boolean;
  seats_needed: number;
  status: string;
}

export default function FindRides() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [originCoords, setOriginCoords] = useState({ lat: 0, lng: 0 });
  const [destCoords, setDestCoords] = useState({ lat: 0, lng: 0 });
  const [date, setDate] = useState('');
  const [seats, setSeats] = useState(1);
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'match_score' | 'departure_time' | 'rating'>('match_score');
  const [myTripRequests, setMyTripRequests] = useState<TripRequest[]>([]);
  const [showCreateRequest, setShowCreateRequest] = useState(false);
  const [eligibilityStatus, setEligibilityStatus] = useState<any>(null);

  useEffect(() => {
    checkEligibility();
    loadAllRides();
    loadMyTripRequests();

    const ridesChannel = supabase
      .channel('rides-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides'
        },
        () => {
          loadAllRides();
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
          loadAllRides();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ridesChannel);
    };
  }, []);

  const checkEligibility = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('check_booking_eligibility');
      if (!error && data && data.length > 0) {
        setEligibilityStatus(data[0]);
      }
    } catch (error) {
      console.error('Error checking eligibility:', error);
    }
  };

  const loadMyTripRequests = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('trip_requests')
        .select('*')
        .eq('rider_id', user.id)
        .in('status', ['active', 'pending'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyTripRequests(data || []);
    } catch (error) {
      console.error('Error loading trip requests:', error);
    }
  };

  const loadAllRides = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rides')
        .select(`
          *,
          vehicle:vehicles(*)
        `)
        .eq('status', 'active')
        .neq('driver_id', user.id)
        .gt('available_seats', 0)
        .gte('departure_time', new Date().toISOString())
        .order('departure_time', { ascending: true })
        .limit(50);

      if (error) throw error;
      const ridesData = data || [];
      const driversById = await fetchPublicProfilesByIds(ridesData.map((ride: Ride) => ride.driver_id));
      const ridesWithDrivers = ridesData.map((ride: Ride) => ({
        ...ride,
        driver: driversById[ride.driver_id] || null,
      }));

      const [bookingsResult, reliabilityResult] = await Promise.all([
        supabase
          .from('ride_bookings')
          .select('ride_id, id, status')
          .eq('passenger_id', user.id)
          .in('ride_id', ridesData.map(r => r.id)),
        supabase
          .from('reliability_scores')
          .select('user_id, reliability_score')
          .in('user_id', ridesData.map(r => r.driver_id))
      ]);

      const bookings = bookingsResult.data || [];
      const reliabilityScores = reliabilityResult.data || [];

      const ridesWithBookings = await Promise.all(ridesWithDrivers.map(async (ride) => {
        const booking = bookings.find(b => b.ride_id === ride.id);
        const reliability = reliabilityScores.find(r => r.user_id === ride.driver_id);
        let weather: { temperature: number; condition: string; humidity: number; windSpeed: number; icon: string } | null = null;

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
          reliabilityScore: reliability?.reliability_score || 100,
          weather: weather && weather.condition !== 'Unavailable' ? {
            temperature: weather.temperature,
            condition: weather.condition
          } : undefined
        };
      }));

      let filteredRides = ridesWithBookings.filter(ride => ride.available_seats > 0);

      if (minRating > 0) {
        filteredRides = filteredRides.filter(ride => (ride.driver?.average_rating || 0) >= minRating);
      }

      if (verifiedOnly) {
        filteredRides = filteredRides.filter(ride => ride.driver?.email_verified && ride.driver?.phone_verified);
      }

      if (sortBy === 'rating') {
        filteredRides.sort((a, b) => (b.driver?.average_rating || 0) - (a.driver?.average_rating || 0));
      } else if (sortBy === 'match_score' && filteredRides.some(r => r.matchScore)) {
        filteredRides.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
      }

      setRides(filteredRides);
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
      const driversById = await fetchPublicProfilesByIds(ridesData.map((ride: Ride) => ride.driver_id));
      const ridesWithDrivers = ridesData.map((ride: Ride) => ({
        ...ride,
        driver: driversById[ride.driver_id] || null,
      }));

      const { data: bookings } = await supabase
        .from('ride_bookings')
        .select('ride_id, id, status')
        .eq('passenger_id', user.id)
        .in('ride_id', ridesData.map(r => r.id));

      const ridesWithBookings = await Promise.all(ridesWithDrivers.map(async (ride) => {
        const booking = bookings?.find(b => b.ride_id === ride.id);
        let weather: { temperature: number; condition: string; humidity: number; windSpeed: number; icon: string } | null = null;

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

    const ride = rides.find(r => r.id === rideId);
    if (!ride) {
      toast.error('Ride not found');
      return;
    }

    try {
      const { error } = await supabase
        .from('ride_bookings')
        .insert([{
          ride_id: rideId,
          passenger_id: user.id,
          pickup_location: origin || ride.origin,
          pickup_lat: ride.origin_lat,
          pickup_lng: ride.origin_lng,
          dropoff_location: destination || ride.destination,
          dropoff_lat: ride.destination_lat,
          dropoff_lng: ride.destination_lng,
          seats_requested: seats,
        }]);

      if (error) throw error;
      toast.success('Ride request sent successfully!');
      loadAllRides();
    } catch (error: any) {
      if (error.code === '23505') {
        toast.info('You have already requested this ride');
      } else {
        toast.error('Failed to request ride. Please try again.');
      }
    }
  };

  const createTripRequest = async () => {
    if (!user || !origin || !destination || !date) {
      toast.warning('Please fill in all fields');
      return;
    }

    if (!eligibilityStatus?.is_eligible) {
      toast.warning(eligibilityStatus?.reason || 'You are not eligible to book rides at this time');
      return;
    }

    try {
      const departureTime = new Date(date);

      const { data: originCoords } = await googleMapsService.geocodeAddress(origin);
      const { data: destCoords } = await googleMapsService.geocodeAddress(destination);

      if (!originCoords || !destCoords) {
        toast.error('Could not geocode locations');
        return;
      }

      const { error } = await supabase.from('trip_requests').insert({
        rider_id: user.id,
        from_location: origin,
        to_location: destination,
        from_lat: originCoords.lat,
        from_lng: originCoords.lng,
        to_lat: destCoords.lat,
        to_lng: destCoords.lng,
        departure_time: departureTime.toISOString(),
        flexible_time: true,
        time_window_start: new Date(departureTime.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        time_window_end: new Date(departureTime.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        seats_needed: seats,
      });

      if (error) throw error;

      await supabase.rpc('match_trip_requests_to_rides');

      toast.success('Trip request created! We will notify you when matching rides are found.');
      setShowCreateRequest(false);
      loadMyTripRequests();
    } catch (error) {
      console.error('Error creating trip request:', error);
      toast.error('Failed to create trip request');
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

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-blue-600 bg-blue-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getReliabilityColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
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
              onChange={(value, place) => {
                setOrigin(value);
                if (place?.geometry?.location) {
                  setOriginCoords({
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                  });
                }
              }}
              placeholder="Enter pickup location"
            />

            <LocationAutocomplete
              id="search-destination-input"
              label="To"
              value={destination}
              onChange={(value, place) => {
                setDestination(value);
                if (place?.geometry?.location) {
                  setDestCoords({
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                  });
                }
              }}
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
            {rides.filter(ride => ride.available_seats > 0 && ride.id).map((ride) => (
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
                className={`bg-white border rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
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
                    <div onClick={(event) => event.stopPropagation()}>
                      <UserAvatar
                        user={ride.driver || { id: ride.driver_id, full_name: 'Driver', avatar_url: null }}
                        size="lg"
                        rating={ride.driver?.average_rating}
                        onClick={() => navigate(getUserProfilePath(ride.driver?.id || ride.driver_id, user?.id))}
                      />
                    </div>
                    <div>
                      <p
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(getUserProfilePath(ride.driver?.id || ride.driver_id, user?.id));
                        }}
                        className="font-semibold text-gray-900 cursor-pointer hover:text-green-600 transition-colors"
                      >
                        {ride.driver?.full_name || 'Driver'}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          {(ride.driver?.average_rating || 0).toFixed(1)}
                        </span>
                        <span>•</span>
                        <span>{ride.driver?.total_rides_offered || 0} rides</span>
                        {ride.reliabilityScore && (
                          <>
                            <span>•</span>
                            <span className={`flex items-center gap-1 font-medium ${getReliabilityColor(ride.reliabilityScore)}`}>
                              <Shield className="w-4 h-4" />
                              {ride.reliabilityScore} reliability
                            </span>
                          </>
                        )}
                      </div>
                      {ride.matchScore && (
                        <div className="mt-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            ride.matchScore >= 80 ? 'bg-green-100 text-green-800' :
                            ride.matchScore >= 60 ? 'bg-blue-100 text-blue-800' :
                            ride.matchScore >= 40 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {ride.matchScore}% Match
                          </span>
                        </div>
                      )}
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
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/rides/${ride.id}`);
                      }}
                      className="flex-1 lg:flex-none px-6 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium whitespace-nowrap flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                    {ride.userBooking && ride.userBooking.status !== 'cancelled' ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/bookings/${ride.userBooking!.id}`);
                        }}
                        className="flex-1 lg:flex-none px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium whitespace-nowrap"
                      >
                        View Booking
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          requestRide(ride.id);
                        }}
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
