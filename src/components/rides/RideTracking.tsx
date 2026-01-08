import { useState, useEffect } from 'react';
import { MapPin, Navigation, CheckCircle, XCircle, AlertTriangle, Users } from 'lucide-react';
import ConfirmModal from '../shared/ConfirmModal';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { useAuth } from '../../contexts/AuthContext';
import ClickableUserProfile from '../shared/ClickableUserProfile';

interface RideTrackingProps {
  rideId: string;
  onComplete?: () => void;
}

interface Passenger {
  id: string;
  full_name: string;
  seats_requested: number;
  status: string;
  pickup_location: string;
  dropoff_location: string;
  avatar_url?: string | null;
  profile_photo_url?: string | null;
}

export default function RideTracking({ rideId, onComplete }: RideTrackingProps) {
  const { user } = useAuth();
  const [tracking, setTracking] = useState<any>(null);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [rideStarted, setRideStarted] = useState(false);
  const [processingPassengerId, setProcessingPassengerId] = useState<string | null>(null);

  useEffect(() => {
    loadTrackingData();
    loadPassengers();

    const interval = setInterval(() => {
      if (rideStarted) {
        updateLocation();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [rideId, rideStarted]);

  const loadTrackingData = async () => {
    try {
      const { data, error } = await supabase.rpc('get_active_ride_tracking', {
        p_ride_id: rideId
      });

      if (!error && data && data.length > 0) {
        setTracking(data[0]);
        setRideStarted(true);
      }
    } catch (error) {
      console.error('Error loading tracking:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPassengers = async () => {
    try {
      const { data, error } = await supabase
        .from('ride_bookings')
        .select(`
          id,
          passenger_id,
          seats_requested,
          status,
          pickup_location,
          dropoff_location,
          passenger:profiles!ride_bookings_passenger_id_fkey(id, full_name, avatar_url, profile_photo_url)
        `)
        .eq('ride_id', rideId)
        .in('status', ['confirmed', 'active', 'completed']);

      if (error) throw error;

      const formattedPassengers = (data || []).map((booking: any) => ({
        id: booking.passenger_id,
        full_name: booking.passenger.full_name,
        seats_requested: booking.seats_requested,
        status: booking.status,
        pickup_location: booking.pickup_location,
        dropoff_location: booking.dropoff_location,
        avatar_url: booking.passenger.avatar_url,
        profile_photo_url: booking.passenger.profile_photo_url
      }));

      setPassengers(formattedPassengers);
    } catch (error) {
      console.error('Error loading passengers:', error);
    }
  };

  const startTracking = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const { data, error } = await supabase.rpc('start_ride_tracking', {
        p_ride_id: rideId,
        p_initial_lat: position.coords.latitude,
        p_initial_lng: position.coords.longitude
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];
        if (result.success) {
          setRideStarted(true);
          toast.success('Ride tracking started! Safe travels!');
          loadTrackingData();
        } else {
          toast.error(result.message || 'Failed to start tracking');
        }
      }
    } catch (error: any) {
      console.error('Error starting tracking:', error);
      toast.error(error.message || 'Failed to start tracking');
    }
  };

  const updateLocation = async () => {
    if (!navigator.geolocation) return;

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      await supabase.rpc('update_ride_location', {
        p_ride_id: rideId,
        p_lat: position.coords.latitude,
        p_lng: position.coords.longitude,
        p_speed_kmh: position.coords.speed ? position.coords.speed * 3.6 : 0,
        p_heading: position.coords.heading || 0
      });
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const markPickedUp = async (passengerId: string) => {
    setProcessingPassengerId(passengerId);
    try {
      const { data, error } = await supabase.rpc('mark_passenger_picked_up', {
        p_ride_id: rideId,
        p_passenger_id: passengerId
      });

      if (error) throw error;

      if (data && data.length > 0 && data[0].success) {
        toast.success('Passenger marked as picked up!');
        loadPassengers();
      }
    } catch (error: any) {
      console.error('Error marking picked up:', error);
      toast.error(error.message || 'Failed to mark passenger as picked up');
    } finally {
      setProcessingPassengerId(null);
    }
  };

  const markDroppedOff = async (passengerId: string) => {
    setProcessingPassengerId(passengerId);
    try {
      const { data, error } = await supabase.rpc('mark_passenger_dropped_off', {
        p_ride_id: rideId,
        p_passenger_id: passengerId
      });

      if (error) throw error;

      if (data && data.length > 0 && data[0].success) {
        toast.success('Passenger marked as dropped off!');
        loadPassengers();
      }
    } catch (error: any) {
      console.error('Error marking dropped off:', error);
      toast.error(error.message || 'Failed to mark passenger as dropped off');
    } finally {
      setProcessingPassengerId(null);
    }
  };

  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [completing, setCompleting] = useState(false);

  const completeRide = async () => {
    setShowCompleteConfirm(true);
  };

  const confirmCompleteRide = async () => {
    setShowCompleteConfirm(false);
    setCompleting(true);
    try {
      const { data, error } = await supabase.rpc('complete_ride_tracking', {
        p_ride_id: rideId
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];
        if (result.success) {
          toast.success(`Ride completed! Duration: ${result.total_duration_minutes} minutes. Please review your passengers.`);
          if (onComplete) onComplete();
        } else {
          toast.error(result.message || 'Failed to complete ride');
        }
      }
    } catch (error: any) {
      console.error('Error completing ride:', error);
      toast.error(error.message || 'Failed to complete ride');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!rideStarted ? (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Navigation className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Start Ride Tracking</h3>
            <p className="text-gray-600">
              Start tracking to notify passengers and enable live location sharing
            </p>
            <button
              onClick={startTracking}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Start Tracking
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-medium text-green-900">Ride in Progress - Location tracking active</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Passengers ({passengers.length})
            </h3>

            <div className="space-y-3">
              {passengers.map((passenger) => (
                <div
                  key={passenger.id}
                  className={`border rounded-lg p-4 ${passenger.status === 'completed'
                      ? 'bg-green-50 border-green-200'
                      : passenger.status === 'active'
                        ? 'bg-blue-50 border-blue-200'
                        : 'border-gray-200'
                    }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-2">
                        <ClickableUserProfile
                          user={{
                            id: passenger.id,
                            full_name: passenger.full_name,
                            avatar_url: passenger.avatar_url,
                            profile_photo_url: passenger.profile_photo_url
                          }}
                          size="sm"
                          showNameRight={true}
                        />
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {passenger.pickup_location} → {passenger.dropoff_location}
                        </div>
                        <div className="mt-1">{passenger.seats_requested} seat(s)</div>
                      </div>
                      <div className="mt-2">
                        {passenger.status === 'confirmed' && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            Waiting for pickup
                          </span>
                        )}
                        {passenger.status === 'active' && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Onboard
                          </span>
                        )}
                        {passenger.status === 'completed' && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Dropped off
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {passenger.status === 'confirmed' && (
                        <button
                          onClick={() => markPickedUp(passenger.id)}
                          disabled={processingPassengerId === passenger.id}
                          className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Pick Up
                        </button>
                      )}
                      {passenger.status === 'active' && (
                        <button
                          onClick={() => markDroppedOff(passenger.id)}
                          disabled={processingPassengerId === passenger.id}
                          className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Drop Off
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {passengers.every((p) => p.status === 'completed') && passengers.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={completeRide}
                  disabled={completing}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle className="w-5 h-5" />
                  {completing ? 'Completing...' : 'Complete Ride'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Complete Ride Confirmation Modal */}
      <ConfirmModal
        isOpen={showCompleteConfirm}
        onClose={() => setShowCompleteConfirm(false)}
        onConfirm={confirmCompleteRide}
        title="Complete Ride"
        message="Are you sure you want to complete this ride? Make sure all passengers have been dropped off."
        confirmText="Complete Ride"
        cancelText="Cancel"
        variant="success"
        loading={completing}
      />
    </div>
  );
}
