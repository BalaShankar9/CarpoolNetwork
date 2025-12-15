import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Calendar, MapPin, Users, Edit2, Trash2, Eye, AlertCircle, XCircle, CheckCircle, Star, Shield, MessageSquare, Phone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Ride {
  id: string;
  origin: string;
  destination: string;
  departure_time: string;
  available_seats: number;
  total_seats: number;
  status: string;
  notes: string | null;
  is_recurring: boolean;
}

interface Booking {
  id: string;
  pickup_location: string;
  dropoff_location: string;
  seats_requested: number;
  status: string;
  created_at: string;
  ride: {
    id: string;
    origin: string;
    destination: string;
    departure_time: string;
    driver: {
      full_name: string;
      average_rating: number;
    };
  };
}

interface BookingRequest {
  id: string;
  pickup_location: string;
  dropoff_location: string;
  seats_requested: number;
  status: string;
  created_at: string;
  updated_at: string;
  passenger: {
    id: string;
    full_name: string;
    average_rating: number;
    total_bookings: number;
    cancelled_bookings: number;
    last_minute_cancellations: number;
    reliability_score: number;
    bio: string | null;
    phone?: string | null;
  };
  ride: {
    id: string;
    origin: string;
    destination: string;
    departure_time: string;
    available_seats: number;
  };
}

interface RideRequest {
  id: string;
  from_location: string;
  to_location: string;
  departure_time: string;
  flexible_time: boolean;
  seats_needed: number;
  notes: string;
  status: string;
  created_at: string;
}

export default function MyRides() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'offered' | 'booked' | 'requests' | 'passengers' | 'myRequests'>('offered');
  const [offeredRides, setOfferedRides] = useState<Ride[]>([]);
  const [bookedRides, setBookedRides] = useState<Booking[]>([]);
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [confirmedPassengers, setConfirmedPassengers] = useState<BookingRequest[]>([]);
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  useEffect(() => {
    loadRides();
    if (activeTab !== 'requests' && activeTab !== 'passengers') {
      loadRequestsCount();
    }

    const handleBookingUpdate = () => {
      loadRides();
      if (activeTab !== 'requests' && activeTab !== 'passengers') {
        loadRequestsCount();
      }
    };

    window.addEventListener('booking-update', handleBookingUpdate);

    return () => {
      window.removeEventListener('booking-update', handleBookingUpdate);
    };
  }, [user, activeTab]);

  const loadRequestsCount = async () => {
    if (!user) return;

    try {
      const { data: rides, error: ridesError } = await supabase
        .from('rides')
        .select('id')
        .eq('driver_id', user.id);

      if (ridesError) throw ridesError;
      const rideIds = rides?.map(r => r.id) || [];

      if (rideIds.length > 0) {
        const { data, error } = await supabase
          .from('ride_bookings')
          .select('id')
          .in('ride_id', rideIds)
          .eq('status', 'pending');

        if (!error && data) {
          setBookingRequests(data as any);
        }
      }
    } catch (error) {
      console.error('Error loading requests count:', error);
    }
  };

  const loadRides = async () => {
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
        setOfferedRides(data || []);
      } else if (activeTab === 'booked') {
        const { data, error } = await supabase
          .from('ride_bookings')
          .select(`
            *,
            ride:rides(
              id,
              origin,
              destination,
              departure_time,
              driver:profiles!rides_driver_id_fkey(full_name, average_rating)
            )
          `)
          .eq('passenger_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setBookedRides(data || []);
      } else if (activeTab === 'requests') {
        const { data: rides, error: ridesError } = await supabase
          .from('rides')
          .select('id')
          .eq('driver_id', user.id);

        if (ridesError) throw ridesError;
        const rideIds = rides?.map(r => r.id) || [];

        if (rideIds.length > 0) {
          const { data, error } = await supabase
            .from('ride_bookings')
            .select(`
              *,
              passenger:profiles(
                id,
                full_name,
                average_rating,
                total_bookings,
                cancelled_bookings,
                last_minute_cancellations,
                reliability_score,
                bio
              ),
              ride:rides(
                id,
                origin,
                destination,
                departure_time,
                available_seats
              )
            `)
            .in('ride_id', rideIds)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error loading booking requests:', error);
            throw error;
          }
          console.log('Booking requests loaded:', data);
          setBookingRequests(data || []);
        } else {
          setBookingRequests([]);
        }
      } else if (activeTab === 'passengers') {
        const { data: rides, error: ridesError } = await supabase
          .from('rides')
          .select('id')
          .eq('driver_id', user.id);

        if (ridesError) throw ridesError;
        const rideIds = rides?.map(r => r.id) || [];

        if (rideIds.length > 0) {
          const { data, error } = await supabase
            .from('ride_bookings')
            .select(`
              *,
              passenger:profiles(
                id,
                full_name,
                average_rating,
                total_bookings,
                cancelled_bookings,
                last_minute_cancellations,
                reliability_score,
                bio,
                phone
              ),
              ride:rides(
                id,
                origin,
                destination,
                departure_time,
                available_seats
              )
            `)
            .in('ride_id', rideIds)
            .eq('status', 'confirmed')
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error loading confirmed passengers:', error);
            throw error;
          }
          setConfirmedPassengers(data || []);
        } else {
          setConfirmedPassengers([]);
        }
      } else if (activeTab === 'myRequests') {
        const { data, error } = await supabase
          .from('ride_requests')
          .select('*')
          .eq('requester_id', user.id)
          .order('departure_time', { ascending: false });

        if (error) throw error;
        setRideRequests(data || []);
      }
    } catch (error) {
      console.error('Error loading rides:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteRide = async (rideId: string) => {
    if (!confirm('Are you sure you want to delete this ride? This action cannot be undone.')) {
      return;
    }

    setDeletingId(rideId);
    try {
      const { error } = await supabase
        .from('rides')
        .delete()
        .eq('id', rideId);

      if (error) throw error;

      setOfferedRides(prev => prev.filter(ride => ride.id !== rideId));
      alert('Ride deleted successfully!');
    } catch (error) {
      console.error('Error deleting ride:', error);
      alert('Failed to delete ride. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const cancelRide = async (rideId: string) => {
    if (!confirm('Are you sure you want to cancel this ride?')) {
      return;
    }

    setDeletingId(rideId);
    try {
      const { error } = await supabase
        .from('rides')
        .update({ status: 'cancelled' })
        .eq('id', rideId);

      if (error) throw error;

      loadRides();
      alert('Ride cancelled successfully!');
    } catch (error) {
      console.error('Error cancelling ride:', error);
      alert('Failed to cancel ride. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const acceptBookingRequest = async (request: BookingRequest) => {
    if (!confirm(`Accept booking request from ${request.passenger.full_name}?`)) {
      return;
    }

    setProcessingRequestId(request.id);
    try {
      const { error } = await supabase.rpc('driver_decide_booking', {
        p_booking_id: request.id,
        p_decision: 'confirmed'
      });

      if (error) throw error;

      alert('Booking request accepted!');
      loadRides();
    } catch (error: any) {
      console.error('Error accepting request:', error);
      alert(error.message || 'Failed to accept request. Please try again.');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const rejectBookingRequest = async (request: BookingRequest) => {
    const reason = prompt('Reason for rejecting (optional):');
    if (reason === null) return;

    if (!confirm(`Reject booking request from ${request.passenger.full_name}?`)) {
      return;
    }

    setProcessingRequestId(request.id);
    try {
      const { error } = await supabase.rpc('driver_decide_booking', {
        p_booking_id: request.id,
        p_decision: 'cancelled'
      });

      if (error) throw error;

      alert('Booking request rejected.');
      loadRides();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      alert(error.message || 'Failed to reject request. Please try again.');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const cancelBooking = async (bookingId: string, departureTime: string) => {
    const reason = prompt('Please provide a reason for cancellation (optional):');

    if (reason === null) {
      return;
    }

    if (!confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    setDeletingId(bookingId);
    try {
      const { error } = await supabase.rpc('cancel_booking', {
        p_booking_id: bookingId,
        p_reason: reason || 'No reason provided'
      });

      if (error) throw error;

      loadRides();
      alert('Booking cancelled successfully!');
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      const errorMessage = error.message || 'Failed to cancel booking. Please try again.';

      if (errorMessage.includes('already cancelled')) {
        alert('This booking is already cancelled.');
      } else {
        alert(errorMessage);
      }
    } finally {
      setDeletingId(null);
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

  const isExpired = (departureTime: string) => {
    return new Date(departureTime) < new Date();
  };

  const getStatusColor = (status: string, expired: boolean = false) => {
    if (expired) {
      return 'bg-gray-200 text-gray-800';
    }
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-200 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-900';
      case 'confirmed':
        return 'bg-green-100 text-green-900';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  const getStatusLabel = (status: string, expired: boolean = false) => {
    if (expired) return 'expired';
    return status;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Rides</h1>
        <p className="text-gray-600 mt-1">Manage your rides and bookings</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 flex">
          <button
            onClick={() => setActiveTab('offered')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'offered'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Rides I'm Offering
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 px-6 py-4 font-medium transition-colors relative ${
              activeTab === 'requests'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Requests
            {bookingRequests.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-600 rounded-full">
                {bookingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('passengers')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'passengers'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Passengers
            {confirmedPassengers.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-green-600 rounded-full">
                {confirmedPassengers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('booked')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'booked'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            My Bookings
          </button>
          <button
            onClick={() => setActiveTab('myRequests')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'myRequests'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            My Ride Requests
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
          ) : activeTab === 'offered' ? (
            <div className="space-y-4">
              {offeredRides.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Car className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="font-medium mb-2">No rides offered yet</p>
                  <p className="text-sm">Start by posting your first ride!</p>
                </div>
              ) : (
                offeredRides.map((ride) => {
                  const expired = isExpired(ride.departure_time);
                  const isCancelled = ride.status === 'cancelled';

                  return (
                    <div
                      key={ride.id}
                      className={`border rounded-xl p-6 transition-all ${
                        expired || isCancelled
                          ? 'border-gray-200 bg-gray-50 opacity-75'
                          : 'border-gray-200 bg-white hover:shadow-lg cursor-pointer'
                      }`}
                      onClick={() => {
                        if (!expired && !isCancelled) {
                          navigate(`/rides/${ride.id}`);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(ride.status, expired)}`}>
                            {getStatusLabel(ride.status, expired)}
                          </span>
                          {ride.is_recurring && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              Recurring
                            </span>
                          )}
                          {expired && !isCancelled && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <AlertCircle className="w-3 h-3" />
                              Past departure time
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {!expired && !isCancelled && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/rides/${ride.id}`);
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  alert('Edit functionality coming soon!');
                                }}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Edit Ride"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelRide(ride.id);
                                }}
                                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                title="Cancel Ride"
                                disabled={deletingId === ride.id}
                              >
                                <AlertCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteRide(ride.id);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Ride"
                            disabled={deletingId === ride.id}
                          >
                            {deletingId === ride.id ? (
                              <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700 mb-2">
                        <MapPin className="w-5 h-5 text-blue-600" />
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
                          {ride.available_seats}/{ride.total_seats} available
                        </span>
                      </div>
                      {ride.notes && (
                        <p className="mt-3 text-sm text-gray-600 border-t border-gray-100 pt-3 line-clamp-2">
                          {ride.notes}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : activeTab === 'requests' ? (
            <div className="space-y-4">
              {bookingRequests.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="font-medium mb-2">No pending requests</p>
                  <p className="text-sm">Booking requests will appear here</p>
                </div>
              ) : (
                bookingRequests.map((request) => {
                  if (!request.passenger || !request.ride) {
                    console.error('Invalid booking request data:', request);
                    return null;
                  }

                  const reliabilityColor =
                    request.passenger.reliability_score >= 4.5 ? 'text-green-600' :
                    request.passenger.reliability_score >= 3.5 ? 'text-yellow-600' :
                    'text-red-600';

                  return (
                    <div
                      key={request.id}
                      className="border-2 border-blue-200 rounded-xl p-6 bg-blue-50"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-14 h-14 bg-blue-200 rounded-full flex items-center justify-center text-2xl font-bold text-blue-700 flex-shrink-0">
                            {request.passenger.full_name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-lg text-gray-900">{request.passenger.full_name}</h3>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm">
                              <span className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                {request.passenger.average_rating.toFixed(1)}
                              </span>
                              <span className="text-gray-600">
                                {request.passenger.total_bookings} bookings
                              </span>
                              <span className={`flex items-center gap-1 font-medium ${reliabilityColor}`}>
                                <Shield className="w-4 h-4" />
                                {request.passenger.reliability_score.toFixed(1)} reliability
                              </span>
                            </div>
                            {request.passenger.cancelled_bookings > 0 && (
                              <div className="mt-2 text-xs text-gray-600 bg-white px-3 py-1 rounded-lg inline-block">
                                ⚠️ {request.passenger.cancelled_bookings} cancellations
                                {request.passenger.last_minute_cancellations > 0 &&
                                  ` (${request.passenger.last_minute_cancellations} last-minute)`
                                }
                              </div>
                            )}
                            {request.passenger.bio && (
                              <p className="mt-2 text-sm text-gray-700 italic line-clamp-2">"{request.passenger.bio}"</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4 mb-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-blue-600" />
                              Trip Details
                            </h4>
                            <div className="space-y-1 text-sm text-gray-700">
                              <p><span className="font-medium">From:</span> {request.pickup_location}</p>
                              <p><span className="font-medium">To:</span> {request.dropoff_location}</p>
                              <p><span className="font-medium">Seats:</span> {request.seats_requested}</p>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-blue-600" />
                              Ride Info
                            </h4>
                            <div className="space-y-1 text-sm text-gray-700">
                              <p><span className="font-medium">Route:</span> {request.ride.origin} → {request.ride.destination}</p>
                              <p><span className="font-medium">Departure:</span> {formatDateTime(request.ride.departure_time)}</p>
                              <p><span className="font-medium">Requested:</span> {new Date(request.created_at).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => acceptBookingRequest(request)}
                          disabled={processingRequestId === request.id}
                          className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {processingRequestId === request.id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-5 h-5" />
                              Accept
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => rejectBookingRequest(request)}
                          disabled={processingRequestId === request.id}
                          className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {processingRequestId === request.id ? (
                            'Processing...'
                          ) : (
                            <>
                              <XCircle className="w-5 h-5" />
                              Reject
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : activeTab === 'passengers' ? (
            <div className="space-y-4">
              {confirmedPassengers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="font-medium mb-2">No confirmed passengers</p>
                  <p className="text-sm">Passengers will appear here after you accept booking requests</p>
                </div>
              ) : (
                confirmedPassengers.map((passenger) => {
                  if (!passenger.passenger || !passenger.ride) {
                    return null;
                  }

                  return (
                    <div key={passenger.id} className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-16 h-16 bg-green-200 rounded-full flex items-center justify-center text-2xl font-bold text-green-700 flex-shrink-0">
                          {passenger.passenger.full_name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-xl text-gray-900">{passenger.passenger.full_name}</h3>
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm">
                            <span className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              {passenger.passenger.average_rating.toFixed(1)}
                            </span>
                            <span className="text-gray-600">
                              {passenger.passenger.total_bookings} bookings
                            </span>
                            <span className="flex items-center gap-1 font-medium text-green-600">
                              <Shield className="w-4 h-4" />
                              {passenger.passenger.reliability_score.toFixed(1)} reliability
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4 mb-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-blue-600" />
                              Ride Details
                            </h4>
                            <div className="space-y-1 text-sm text-gray-700">
                              <p><span className="font-medium">Route:</span> {passenger.ride.origin} → {passenger.ride.destination}</p>
                              <p><span className="font-medium">Departure:</span> {formatDateTime(passenger.ride.departure_time)}</p>
                              <p><span className="font-medium">Seats Booked:</span> {passenger.seats_requested}</p>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-blue-600" />
                              Pickup & Drop-off
                            </h4>
                            <div className="space-y-1 text-sm text-gray-700">
                              <p><span className="font-medium">Pickup:</span> {passenger.pickup_location}</p>
                              <p><span className="font-medium">Drop-off:</span> {passenger.dropoff_location}</p>
                              <p><span className="font-medium">Confirmed:</span> {new Date(passenger.updated_at).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            navigate('/messages', { state: { userId: passenger.passenger.id, userName: passenger.passenger.full_name } });
                          }}
                          className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                        >
                          <MessageSquare className="w-5 h-5" />
                          Message Passenger
                        </button>
                        {passenger.passenger.phone && (
                          <a
                            href={`tel:${passenger.passenger.phone}`}
                            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                          >
                            <Phone className="w-5 h-5" />
                            Call
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : activeTab === 'booked' ? (
            <div className="space-y-4">
              {bookedRides.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="font-medium mb-2">No bookings yet</p>
                  <p className="text-sm">Find a ride to get started!</p>
                </div>
              ) : (
                bookedRides.map((booking) => {
                  const expired = isExpired(booking.ride.departure_time);
                  const isCancelled = booking.status === 'cancelled';
                  const canCancel = !expired && !isCancelled && (booking.status === 'pending' || booking.status === 'confirmed');

                  return (
                    <div
                      key={booking.id}
                      className={`border rounded-xl p-6 transition-all ${
                        expired || isCancelled
                          ? 'border-gray-200 bg-gray-50 opacity-75'
                          : 'border-gray-200 bg-white hover:shadow-lg cursor-pointer'
                      }`}
                      onClick={() => {
                        if (!expired && !isCancelled) {
                          navigate(`/bookings/${booking.id}`);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status, expired)}`}>
                            {getStatusLabel(booking.status, expired)}
                          </span>
                          {expired && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <AlertCircle className="w-3 h-3" />
                              Past departure time
                            </span>
                          )}
                        </div>
                        {canCancel && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelBooking(booking.id, booking.ride.departure_time);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Cancel Booking"
                            disabled={deletingId === booking.id}
                          >
                            {deletingId === booking.id ? (
                              <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-gray-700 mb-2">
                        <MapPin className="w-5 h-5 text-blue-600" />
                        <span className="font-medium">{booking.pickup_location}</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium">{booking.dropoff_location}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDateTime(booking.ride.departure_time)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {booking.seats_requested} {booking.seats_requested === 1 ? 'seat' : 'seats'}
                        </span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600">
                        <p>
                          Driver: <span className="font-medium">{booking.ride.driver?.full_name}</span>
                          {' • '}
                          <span className="text-yellow-600">⭐ {booking.ride.driver?.average_rating.toFixed(1)}</span>
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : activeTab === 'myRequests' ? (
            <div className="space-y-4">
              {rideRequests.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="font-medium mb-2">No ride requests yet</p>
                  <p className="text-sm mb-4">Post a ride request to find a driver</p>
                  <button
                    onClick={() => navigate('/request-ride')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <MapPin className="w-5 h-5" />
                    Request a Ride
                  </button>
                </div>
              ) : (
                rideRequests.map((request) => {
                  const expired = isExpired(request.departure_time);
                  const isCancelled = request.status === 'cancelled';

                  return (
                    <div
                      key={request.id}
                      className={`border rounded-xl p-6 ${
                        expired || isCancelled
                          ? 'border-gray-200 bg-gray-50 opacity-75'
                          : 'border-blue-200 bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status, expired)}`}>
                            {getStatusLabel(request.status, expired)}
                          </span>
                          {expired && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <AlertCircle className="w-3 h-3" />
                              Past departure time
                            </span>
                          )}
                          {request.flexible_time && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                              Flexible Time
                            </span>
                          )}
                        </div>
                        {!expired && !isCancelled && (
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to cancel this ride request?')) {
                                supabase
                                  .from('ride_requests')
                                  .update({ status: 'cancelled' })
                                  .eq('id', request.id)
                                  .then(() => loadRides());
                              }
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Cancel Request"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-gray-700 mb-2">
                        <MapPin className="w-5 h-5 text-blue-600" />
                        <span className="font-medium">{request.from_location}</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium">{request.to_location}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDateTime(request.departure_time)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {request.seats_needed} {request.seats_needed === 1 ? 'seat' : 'seats'} needed
                        </span>
                      </div>
                      {request.notes && (
                        <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
                          <p className="font-medium mb-1">Additional Notes:</p>
                          <p>{request.notes}</p>
                        </div>
                      )}
                      <div className="mt-3 text-xs text-gray-500">
                        Posted {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
