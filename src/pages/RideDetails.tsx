import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Star, Car, MessageCircle, ArrowLeft, Navigation, Phone, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import EnhancedRideMap from '../components/rides/EnhancedRideMap';
import TripInsights from '../components/rides/TripInsights';
import RideStatusTracker from '../components/rides/RideStatusTracker';
import { RouteOption, PlaceDetails } from '../services/googleMapsService';

interface RideDetails {
  id: string;
  origin: string;
  origin_lat: number;
  origin_lng: number;
  destination: string;
  destination_lat: number;
  destination_lng: number;
  departure_time: string;
  available_seats: number;
  total_seats: number;
  notes: string | null;
  estimated_distance: number | null;
  estimated_duration: number | null;
  driver: {
    id: string;
    full_name: string;
    average_rating: number;
    total_rides_offered: number;
    bio: string | null;
    whatsapp_number?: string;
    preferred_contact_method?: string;
  };
  vehicle: {
    make: string;
    model: string;
    color: string;
    year: number;
    fuel_type: string | null;
    capacity: number;
  };
}

interface UserBooking {
  id: string;
  status: string;
  seats_requested: number;
  created_at: string;
}

export default function RideDetails() {
  const { rideId } = useParams<{ rideId: string }>();
  const { user, isEmailVerified } = useAuth();
  const navigate = useNavigate();
  const [ride, setRide] = useState<RideDetails | null>(null);
  const [userBooking, setUserBooking] = useState<UserBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<PlaceDetails[]>([]);
  const [showSeatSelector, setShowSeatSelector] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState(1);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rideId) {
      loadRideDetails();
      checkUserBooking();
    }
  }, [rideId]);

  const checkUserBooking = async () => {
    if (!user || !rideId) return;

    try {
      const { data, error } = await supabase
        .from('ride_bookings')
        .select('id, status, seats_requested, created_at')
        .eq('ride_id', rideId)
        .eq('passenger_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setUserBooking(data);
    } catch (error) {
      console.error('Error checking booking:', error);
    }
  };

  const loadRideDetails = async () => {
    setError(null);
    try {
      if (!rideId) {
        throw new Error('Ride ID is missing');
      }

      const { data, error } = await supabase
        .from('rides')
        .select(`
          *,
          driver:profiles!rides_driver_id_fkey(*),
          vehicle:vehicles(*)
        `)
        .eq('id', rideId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setError('Ride not found or no longer available');
        return;
      }

      if (data.available_seats === 0 && data.status === 'active' && data.driver_id !== user?.id) {
        setError('This ride is fully booked');
      }

      setRide(data);
    } catch (error: any) {
      console.error('Error loading ride:', error);
      setError(error.message || 'Failed to load ride details');
    } finally {
      setLoading(false);
    }
  };

  const handleGasStationsUpdate = (stations: PlaceDetails[]) => {
    setNearbyPlaces(stations);
  };

  const handleRouteSelect = (route: RouteOption) => {
    setSelectedRoute(route);
  };

  const requestRide = async (seats: number = 1) => {
    if (!user || !ride) return;

    if (!isEmailVerified) {
      alert('Please verify your email address before booking rides.');
      return;
    }

    setRequesting(true);
    setShowSeatSelector(false);
    try {
      const { data: bookingId, error } = await supabase.rpc('request_booking', {
        p_ride_id: ride.id,
        p_pickup_location: ride.origin,
        p_pickup_lat: ride.origin_lat,
        p_pickup_lng: ride.origin_lng,
        p_dropoff_location: ride.destination,
        p_dropoff_lat: ride.destination_lat,
        p_dropoff_lng: ride.destination_lng,
        p_seats_requested: seats,
      });

      if (error) {
        const errorMsg = error.message.toLowerCase();

        if (errorMsg.includes('not enough seats')) {
          alert('Sorry, not enough seats available. Please try a different number of seats or refresh the page.');
        } else if (errorMsg.includes('not active')) {
          alert('This ride is no longer active.');
        } else if (errorMsg.includes('already requested') || error.code === '23505') {
          alert('You have already requested this ride.');
        } else {
          alert(`Failed to request ride: ${error.message}`);
        }

        await loadRideDetails();
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('total_bookings')
          .eq('id', user.id)
          .single();

        if (profile) {
          await supabase
            .from('profiles')
            .update({ total_bookings: (profile.total_bookings || 0) + 1 })
            .eq('id', user.id);
        }

        alert('Ride request sent successfully!');
        await Promise.all([loadRideDetails(), checkUserBooking()]);
      }
    } catch (error: any) {
      console.error('Booking error:', error);
      alert('Failed to request ride. Please try again.');
      await loadRideDetails();
    } finally {
      setRequesting(false);
    }
  };

  const cancelBooking = async () => {
    if (!userBooking) return;

    const reason = prompt('Please provide a reason for cancellation (optional):');
    if (reason === null) return;

    if (!confirm('Are you sure you want to cancel this booking?')) return;

    setCancelling(true);
    try {
      const { error } = await supabase.rpc('cancel_booking', {
        p_booking_id: userBooking.id,
        p_reason: reason || 'No reason provided'
      });

      if (error) throw error;

      alert('Booking cancelled successfully!');
      await Promise.all([loadRideDetails(), checkUserBooking()]);
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert('Failed to cancel booking. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const sendMessage = () => {
    if (ride?.driver && ride?.id) {
      navigate('/messages', {
        state: {
          rideId: ride.id,
          driverId: ride.driver.id
        }
      });
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }),
    };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mb-4" />
        <p className="text-gray-600">Loading ride details...</p>
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <button
          onClick={() => navigate('/find-rides')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Search
        </button>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {error || 'Ride Not Found'}
          </h2>
          <p className="text-gray-600 mb-6">
            This ride may have been cancelled, deleted, or the link is incorrect.
          </p>
          <button
            onClick={() => navigate('/find-rides')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Browse Available Rides
          </button>
        </div>
      </div>
    );
  }

  const dateTime = formatDateTime(ride.departure_time);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/find-rides')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Search
      </button>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {ride.origin} → {ride.destination}
              </h1>
              <div className="flex items-center gap-4 text-gray-600">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {dateTime.date}
                </span>
                <span className="flex items-center gap-1">
                  <span className="font-semibold">{dateTime.time}</span>
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">{ride.available_seats}</div>
              <div className="text-sm text-gray-600">seats available</div>
            </div>
          </div>
        </div>

        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start gap-4">
            <div
              className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer hover:bg-blue-200 transition-colors"
              onClick={() => {
                if (ride.driver.id !== user?.id) {
                  navigate('/messages', { state: { rideId: ride.id, driverId: ride.driver.id } });
                }
              }}
              title="Click to message driver"
            >
              <span className="text-3xl font-bold text-blue-600">
                {ride.driver.full_name.charAt(0)}
              </span>
            </div>
            <div className="flex-1">
              <h2
                className="text-xl font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => {
                  if (ride.driver.id !== user?.id) {
                    navigate('/messages', { state: { rideId: ride.id, driverId: ride.driver.id } });
                  }
                }}
                title="Click to message driver"
              >
                {ride.driver.full_name}
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-gray-600">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="font-semibold">{ride.driver.average_rating.toFixed(1)}</span>
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-600">{ride.driver.total_rides_offered} rides completed</span>
              </div>
              {ride.driver.bio && (
                <p className="mt-2 text-gray-600 text-sm">{ride.driver.bio}</p>
              )}
            </div>
            {ride.driver.id !== user?.id && (
              <div className="flex gap-2">
                {(ride.driver.preferred_contact_method === 'in_app' || ride.driver.preferred_contact_method === 'both' || !ride.driver.preferred_contact_method) && (
                  <button
                    onClick={sendMessage}
                    className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Message
                  </button>
                )}
                {ride.driver.whatsapp_number && (ride.driver.preferred_contact_method === 'whatsapp' || ride.driver.preferred_contact_method === 'both' || !ride.driver.preferred_contact_method) && (
                  <button
                    onClick={() => {
                      const cleanNumber = ride.driver.whatsapp_number!.replace(/[^0-9]/g, '');
                      window.open(`https://wa.me/${cleanNumber}`, '_blank');
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                  >
                    <Phone className="w-4 h-4" />
                    WhatsApp
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {ride.vehicle && (
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-600" />
              Vehicle Information
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <span className="text-gray-600">Model:</span>
                <span className="ml-2 font-medium">
                  {ride.vehicle.year} {ride.vehicle.make} {ride.vehicle.model}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Color:</span>
                <span className="ml-2 font-medium">{ride.vehicle.color}</span>
              </div>
              {ride.vehicle.fuel_type && (
                <div>
                  <span className="text-gray-600">Fuel Type:</span>
                  <span className="ml-2 font-medium capitalize">{ride.vehicle.fuel_type}</span>
                </div>
              )}
              <div>
                <span className="text-gray-600">Capacity:</span>
                <span className="ml-2 font-medium">{ride.vehicle.capacity - 1} passengers</span>
                <span className="text-gray-500 text-sm ml-1">(offering {ride.total_seats} seats for this ride)</span>
              </div>
            </div>
          </div>
        )}

        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Route Information & Live Map
          </h3>
          <EnhancedRideMap
            origin={{
              lat: ride.origin_lat,
              lng: ride.origin_lng,
              name: ride.origin,
            }}
            destination={{
              lat: ride.destination_lat,
              lng: ride.destination_lng,
              name: ride.destination,
            }}
            departureTime={new Date(ride.departure_time)}
            onRouteSelect={handleRouteSelect}
            onGasStationsUpdate={handleGasStationsUpdate}
          />
        </div>

        <div className="p-6 border-b border-gray-200">
          <RideStatusTracker rideId={ride.id} isDriver={ride.driver.id === user?.id} />
        </div>

        {userBooking &&
         (userBooking.status === 'confirmed' || userBooking.status === 'active') &&
         (ride.status === 'in-progress' || ride.status === 'active') && (
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Navigation className="w-5 h-5 text-blue-600" />
              Live Ride Tracking
            </h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700">
                The driver has started this ride. You can view real-time tracking and trip progress here.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">Tracking active - Updates every 30 seconds</span>
              </div>
              <p className="text-sm text-gray-600">
                Driver: <span className="font-medium">{ride.driver.full_name}</span>
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Your booking: {userBooking.seats_requested} seat{userBooking.seats_requested > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}

        <div className="p-6 border-b border-gray-200">
          <TripInsights
            origin={{ lat: ride.origin_lat, lng: ride.origin_lng }}
            destination={{ lat: ride.destination_lat, lng: ride.destination_lng }}
            departureTime={new Date(ride.departure_time)}
            distance={ride.estimated_distance || undefined}
            duration={ride.estimated_duration || undefined}
          />
        </div>

        {nearbyPlaces.length > 0 && (
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Navigation className="w-5 h-5 text-blue-600" />
              Gas Stations Along Route
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              {selectedRoute ? `Stations near ${selectedRoute.name}` : 'Stations near your route'}
            </p>
            <div className="space-y-2">
              {nearbyPlaces.map((place, index) => (
                <div key={place.placeId || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{place.name}</p>
                    <p className="text-sm text-gray-600">{place.address}</p>
                    {place.openNow !== undefined && (
                      <span className={`text-xs font-medium ${place.openNow ? 'text-green-600' : 'text-red-600'}`}>
                        {place.openNow ? 'Open now' : 'Closed'}
                      </span>
                    )}
                  </div>
                  {place.rating && (
                    <div className="flex items-center gap-1 ml-4">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm font-medium">{place.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {ride.notes && (
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">Additional Notes</h3>
            <p className="text-gray-600">{ride.notes}</p>
          </div>
        )}

        {ride.driver.id !== user?.id && (
          <div className="p-6 bg-gray-50">
            {ride.available_seats === 0 && (!userBooking || userBooking.status === 'cancelled') ? (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6 text-center">
                <h3 className="font-bold text-amber-900 text-lg mb-2">Fully Booked</h3>
                <p className="text-amber-800 mb-4">
                  This ride has no available seats. Check back later or search for other rides.
                </p>
                <button
                  onClick={() => navigate('/find-rides')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  Browse Other Rides
                </button>
              </div>
            ) : userBooking && userBooking.status !== 'cancelled' ? (
              <div className="space-y-4">
                <div className="bg-white border-2 border-green-500 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 text-xl">✓</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Booking Confirmed</h3>
                      <p className="text-sm text-gray-600">
                        Status: <span className={`font-medium ${
                          userBooking.status === 'confirmed' ? 'text-green-600' :
                          userBooking.status === 'pending' ? 'text-yellow-600' :
                          'text-gray-600'
                        }`}>{userBooking.status}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                    <span>Seats: {userBooking.seats_requested}</span>
                    <span>Booked: {new Date(userBooking.created_at).toLocaleDateString()}</span>
                  </div>
                  <button
                    onClick={() => navigate(`/bookings/${userBooking.id}`)}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors mb-2"
                  >
                    View Booking Details
                  </button>
                </div>
                {(userBooking.status === 'pending' || userBooking.status === 'confirmed') && (
                  <button
                    onClick={cancelBooking}
                    disabled={cancelling}
                    className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cancelling ? 'Cancelling...' : 'Cancel Booking'}
                  </button>
                )}
              </div>
            ) : userBooking && userBooking.status === 'cancelled' ? (
              <div className="bg-white border-2 border-red-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 text-xl">✕</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Booking Cancelled</h3>
                    <p className="text-sm text-gray-600">You cancelled this booking</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSeatSelector(true)}
                  disabled={requesting || ride.available_seats === 0}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-3"
                >
                  {requesting
                    ? 'Sending Request...'
                    : ride.available_seats === 0
                    ? 'No Seats Available'
                    : 'Request Again'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSeatSelector(true)}
                disabled={requesting || ride.available_seats === 0}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {requesting
                  ? 'Sending Request...'
                  : ride.available_seats === 0
                  ? 'No Seats Available'
                  : 'Request This Ride'}
              </button>
            )}
          </div>
        )}
      </div>

      {showSeatSelector && ride && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Select Number of Seats</h3>
            <p className="text-gray-600 mb-6">How many seats do you need?</p>

            {!isEmailVerified && (
              <div className="flex items-center gap-2 text-amber-600 text-sm mb-4 bg-amber-50 px-3 py-2 rounded-lg">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Verify your email to book rides</span>
              </div>
            )}

            <div className="grid grid-cols-4 gap-3 mb-6">
              {[...Array(Math.min(ride.available_seats, 8))].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setSelectedSeats(i + 1)}
                  className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                    selectedSeats === i + 1
                      ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Selected:</span> {selectedSeats} seat{selectedSeats > 1 ? 's' : ''}
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Available:</span> {ride.available_seats} seat{ride.available_seats > 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSeatSelector(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => requestRide(selectedSeats)}
                disabled={!isEmailVerified}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEmailVerified ? 'Confirm Request' : 'Verify Email First'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
