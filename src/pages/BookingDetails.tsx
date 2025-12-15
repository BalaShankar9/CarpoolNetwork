import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Users,
  Phone,
  MessageCircle,
  AlertTriangle,
  Navigation,
  Clock,
  Star,
  Shield,
  XCircle,
  Car,
  Cloud,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import RideDetailsMap from '../components/rides/RideDetailsMap';

interface BookingDetails {
  id: string;
  pickup_location: string;
  dropoff_location: string;
  seats_requested: number;
  status: string;
  created_at: string;
  cancellation_reason?: string;
  ride: {
    id: string;
    origin: string;
    destination: string;
    departure_time: string;
    origin_lat: number;
    origin_lng: number;
    destination_lat: number;
    destination_lng: number;
    price_per_seat: number;
    notes?: string;
    driver: {
      id: string;
      full_name: string;
      phone?: string;
      average_rating: number;
      total_rides: number;
      bio?: string;
      whatsapp_number?: string;
      preferred_contact_method?: string;
    };
    vehicle?: {
      make: string;
      model: string;
      year: number;
      color: string;
      license_plate: string;
    };
  };
}

export default function BookingDetails() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<any>(null);
  const [cancelling, setCancelling] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bookingId && user) {
      loadBookingDetails();
    } else if (!user) {
      setError('Please sign in to view booking details');
      setLoading(false);
    }
  }, [bookingId, user]);

  const loadBookingDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('ride_bookings')
        .select(`
          *,
          ride:rides(
            *,
            driver:profiles!rides_driver_id_fkey(*),
            vehicle:vehicles(*)
          )
        `)
        .eq('id', bookingId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        console.error('Booking not found');
        setError('Booking not found');
        setLoading(false);
        return;
      }

      setBooking(data);
      setError(null);

      if (data?.ride) {
        loadWeather(data.ride.origin_lat, data.ride.origin_lng);
      }
    } catch (error: any) {
      console.error('Error loading booking:', error);
      console.error('Error details:', error?.message, error?.details);
      setError(error?.message || 'Failed to load booking details');
      setLoading(false);
    }
  };

  const loadWeather = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m`
      );
      const data = await response.json();
      setWeather(data.current);
    } catch (error) {
      console.error('Error loading weather:', error);
    }
  };

  const cancelBooking = async () => {
    const reason = prompt('Please provide a reason for cancellation (optional):');
    if (reason === null) return;

    if (!confirm('Are you sure you want to cancel this booking?')) return;

    setCancelling(true);
    try {
      const { error } = await supabase.rpc('cancel_booking', {
        p_booking_id: bookingId!,
        p_reason: reason || 'No reason provided'
      });

      if (error) throw error;

      alert('Booking cancelled successfully!');
      navigate('/my-rides');
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      const errorMessage = error.message || 'Failed to cancel booking. Please try again.';

      if (errorMessage.includes('already cancelled')) {
        alert('This booking is already cancelled.');
      } else {
        alert(errorMessage);
      }
    } finally {
      setCancelling(false);
    }
  };

  const activateSOS = () => {
    setSosActive(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const message = `EMERGENCY: I need help!\n\nBooking ID: ${bookingId}\nDriver: ${booking?.ride.driver.full_name}\nMy Location: https://www.google.com/maps?q=${position.coords.latitude},${position.coords.longitude}\n\nThis is an automated emergency alert.`;

          alert('SOS Activated!\n\n' + message + '\n\nIn a real emergency:\n1. Call emergency services (911)\n2. Contact driver\n3. Share your live location with trusted contacts');

          setSosActive(false);
        },
        (error) => {
          console.error('Location error:', error);
          alert('Could not get your location. Please call emergency services immediately if you need help.');
          setSosActive(false);
        }
      );
    }
  };

  const openNavigation = () => {
    if (booking) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${booking.ride.origin_lat},${booking.ride.origin_lng}&destination=${booking.ride.destination_lat},${booking.ride.destination_lng}`;
      window.open(url, '_blank');
    }
  };

  const callDriver = () => {
    if (booking?.ride.driver.phone) {
      window.location.href = `tel:${booking.ride.driver.phone}`;
    } else {
      alert('Driver phone number not available');
    }
  };

  const messageDriver = async () => {
    if (!booking?.ride) return;
    navigate('/messages', {
      state: {
        rideId: booking.ride.id,
        driverId: booking.ride.driver.id
      }
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getTimeUntilDeparture = () => {
    if (!booking) return '';
    const now = new Date();
    const departure = new Date(booking.ride.departure_time);
    const diff = departure.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours < 0) return 'Departed';
    if (hours === 0) return `${minutes} minutes`;
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Booking</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/my-rides')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to My Rides
          </button>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Booking not found</p>
        <button
          onClick={() => navigate('/my-rides')}
          className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to My Rides
        </button>
      </div>
    );
  }

  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';
  const isUpcoming = new Date(booking.ride.departure_time) > new Date();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Your Booking</h1>
          <p className="text-gray-600 mt-1">Trip details and information</p>
        </div>
        <span className={`px-4 py-2 rounded-full text-sm font-medium ${
          booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {booking.status}
        </span>
      </div>

      {isUpcoming && booking.status === 'confirmed' && (
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="text-white">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-6 h-6" />
                <h3 className="text-xl font-bold">Emergency SOS</h3>
              </div>
              <p className="text-red-100 text-sm">
                Press this button in case of emergency. Your location will be shared.
              </p>
            </div>
            <button
              onClick={activateSOS}
              disabled={sosActive}
              className="bg-white text-red-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-red-50 transition-colors disabled:opacity-50 shadow-lg"
            >
              {sosActive ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-5 h-5 border-3 border-red-600 border-t-transparent rounded-full" />
                  <span>ACTIVATING...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6" />
                  <span>SOS</span>
                </div>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Time Until Departure</p>
              <p className="text-xl font-bold text-gray-900">{getTimeUntilDeparture()}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Seats Booked</p>
              <p className="text-xl font-bold text-gray-900">{booking.seats_requested}</p>
            </div>
          </div>
        </div>

        {weather && (
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-sky-100 rounded-lg">
                <Cloud className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Weather at Origin</p>
                <p className="text-xl font-bold text-gray-900">{weather.temperature_2m}°C</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Trip Route
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pick-up Location</p>
              <p className="font-medium text-gray-900">{booking.pickup_location}</p>
            </div>
            <div className="border-l-2 border-blue-200 pl-4 ml-2">
              <p className="text-sm text-gray-600 mb-1">Drop-off Location</p>
              <p className="font-medium text-gray-900">{booking.dropoff_location}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-1">Departure Time</p>
            <p className="font-medium text-gray-900">{formatDateTime(booking.ride.departure_time)}</p>
          </div>
        </div>

        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Driver Information
          </h3>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600">
              {booking.ride.driver.full_name.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-lg text-gray-900">{booking.ride.driver.full_name}</p>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  {booking.ride.driver.average_rating.toFixed(1)}
                </span>
                <span>{booking.ride.driver.total_rides} rides</span>
              </div>
              {booking.ride.driver.bio && (
                <p className="mt-2 text-sm text-gray-600">{booking.ride.driver.bio}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 flex-wrap mt-4">
            {booking.ride.driver.phone && (
              <button
                onClick={callDriver}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Phone className="w-4 h-4" />
                Call Driver
              </button>
            )}
            {(booking.ride.driver.preferred_contact_method === 'in_app' || booking.ride.driver.preferred_contact_method === 'both' || !booking.ride.driver.preferred_contact_method) && (
              <button
                onClick={messageDriver}
                className="flex items-center justify-center gap-2 px-4 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Message
              </button>
            )}
            {booking.ride.driver.whatsapp_number && (booking.ride.driver.preferred_contact_method === 'whatsapp' || booking.ride.driver.preferred_contact_method === 'both' || !booking.ride.driver.preferred_contact_method) && (
              <button
                onClick={() => {
                  const cleanNumber = booking.ride.driver.whatsapp_number!.replace(/[^0-9]/g, '');
                  window.open(`https://wa.me/${cleanNumber}`, '_blank');
                }}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <Phone className="w-4 h-4" />
                WhatsApp
              </button>
            )}
          </div>
        </div>

        {booking.ride.vehicle && (
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-600" />
              Vehicle Information
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <span className="text-gray-600">Model:</span>
                <span className="ml-2 font-medium">
                  {booking.ride.vehicle.year} {booking.ride.vehicle.make} {booking.ride.vehicle.model}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Color:</span>
                <span className="ml-2 font-medium">{booking.ride.vehicle.color}</span>
              </div>
              <div>
                <span className="text-gray-600">License Plate:</span>
                <span className="ml-2 font-medium font-mono">{booking.ride.vehicle.license_plate}</span>
              </div>
            </div>
          </div>
        )}

        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Route Map
          </h3>
          <RideDetailsMap
            origin={{
              lat: booking.ride.origin_lat,
              lng: booking.ride.origin_lng,
              name: booking.ride.origin
            }}
            destination={{
              lat: booking.ride.destination_lat,
              lng: booking.ride.destination_lng,
              name: booking.ride.destination
            }}
          />
          <button
            onClick={openNavigation}
            className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Navigation className="w-4 h-4" />
            Open in Google Maps
          </button>
        </div>

        <div className="p-6 bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-3">Booking Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Seats</span>
              <span className="font-medium">{booking.seats_requested}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Price per seat</span>
              <span className="font-medium">${booking.ride.price_per_seat}</span>
            </div>
            <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between font-semibold">
              <span>Total Cost</span>
              <span className="text-blue-600">${booking.ride.price_per_seat * booking.seats_requested}</span>
            </div>
          </div>
        </div>
      </div>

      {canCancel && isUpcoming && (
        <div className="bg-white rounded-xl border border-red-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            Cancel Booking
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            You can cancel this booking. Note: Cancellations within 24 hours of departure may affect your reliability score.
          </p>
          <button
            onClick={cancelBooking}
            disabled={cancelling}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelling ? 'Cancelling...' : 'Cancel Booking'}
          </button>
        </div>
      )}
    </div>
  );
}
