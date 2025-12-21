import { useState, useEffect } from 'react';
import { MapPin, Clock, Users, Navigation, CheckCircle, Circle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface RideStatusTrackerProps {
  rideId: string;
  isDriver: boolean;
}

interface RideStatus {
  id: string;
  status: string;
  departure_time: string;
  origin: string;
  destination: string;
  available_seats: number;
  total_seats: number;
  bookings: Array<{
    id: string;
    passenger_id: string;
    status: string;
    pickup_location: string;
    dropoff_location: string;
    pickup_order?: number;
    passenger: {
      full_name: string;
      avatar_url?: string;
    };
  }>;
}

export default function RideStatusTracker({ rideId, isDriver }: RideStatusTrackerProps) {
  const [rideStatus, setRideStatus] = useState<RideStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    loadRideStatus();
    setupRealtimeSubscription();
  }, [rideId]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`ride-${rideId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rides',
          filter: `id=eq.${rideId}`
        },
        (payload) => {
          setRideStatus(prev => prev ? { ...prev, ...payload.new } : null);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_bookings',
          filter: `ride_id=eq.${rideId}`
        },
        () => {
          loadRideStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadRideStatus = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('rides')
        .select(`
          *,
          bookings:ride_bookings(
            *,
            passenger:profiles!ride_bookings_passenger_id_fkey(
              full_name,
              avatar_url
            )
          )
        `)
        .eq('id', rideId)
        .single();

      if (error) throw error;

      setRideStatus(data);

      // Calculate current step based on ride status
      if (data.status === 'active') setCurrentStep(0);
      else if (data.status === 'in-progress') setCurrentStep(1);
      else if (data.status === 'completed') setCurrentStep(2);
    } catch (err) {
      console.error('Error loading ride status:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateRideStatus = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('rides')
        .update({ status: newStatus })
        .eq('id', rideId);

      if (error) throw error;

      await loadRideStatus();
    } catch (err) {
      console.error('Error updating ride status:', err);
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

  if (!rideStatus) {
    return null;
  }

  const confirmedBookings = rideStatus.bookings.filter(b => b.status === 'confirmed');
  const timeUntilDeparture = new Date(rideStatus.departure_time).getTime() - new Date().getTime();
  const hoursUntilDeparture = Math.floor(timeUntilDeparture / (1000 * 60 * 60));

  const steps = [
    {
      label: 'Waiting for departure',
      description: 'Ride scheduled',
      icon: Clock
    },
    {
      label: 'Ride in progress',
      description: 'Currently traveling',
      icon: Navigation
    },
    {
      label: 'Ride completed',
      description: 'Journey finished',
      icon: CheckCircle
    }
  ];

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Ride Status</h3>

      {/* Status Timeline */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div key={index} className="flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                    isCompleted ? 'bg-green-500' :
                    isActive ? 'bg-blue-600' :
                    'bg-gray-200'
                  }`}>
                    <Icon className={`w-6 h-6 ${
                      isCompleted || isActive ? 'text-white' : 'text-gray-500'
                    }`} />
                  </div>
                  <p className={`text-xs font-medium text-center ${
                    isCompleted || isActive ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-gray-500 text-center">{step.description}</p>
                </div>

                {index < steps.length - 1 && (
                  <div className={`h-0.5 w-full mt-6 -ml-1/2 ${
                    index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Time Until Departure */}
      {rideStatus.status === 'active' && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-blue-900">
              {hoursUntilDeparture > 0
                ? `Departing in ${hoursUntilDeparture} hours`
                : 'Departing soon'}
            </span>
          </div>
          <p className="text-sm text-blue-800">
            {new Date(rideStatus.departure_time).toLocaleString()}
          </p>
        </div>
      )}

      {/* Route Info */}
      <div className="space-y-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-green-100 rounded-full flex-shrink-0">
            <Circle className="w-4 h-4 text-green-600 fill-current" />
          </div>
          <div>
            <p className="text-xs text-gray-600">From</p>
            <p className="font-medium text-gray-900">{rideStatus.origin}</p>
          </div>
        </div>

        <div className="ml-6 border-l-2 border-dashed border-gray-300 h-8"></div>

        <div className="flex items-start gap-3">
          <div className="p-2 bg-red-100 rounded-full flex-shrink-0">
            <MapPin className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <p className="text-xs text-gray-600">To</p>
            <p className="font-medium text-gray-900">{rideStatus.destination}</p>
          </div>
        </div>
      </div>

      {/* Passengers Info */}
      {confirmedBookings.length > 0 && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-gray-700" />
            <span className="font-semibold text-gray-900">
              Passengers ({confirmedBookings.length}/{rideStatus.total_seats})
            </span>
          </div>

          <div className="space-y-2">
            {confirmedBookings.map((booking, index) => (
              <div key={booking.id} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  {booking.passenger.full_name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {booking.passenger.full_name}
                  </p>
                  <p className="text-xs text-gray-600">
                    {booking.pickup_location} → {booking.dropoff_location}
                  </p>
                </div>
                {booking.pickup_order && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                    Stop #{booking.pickup_order}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Driver Controls */}
      {isDriver && rideStatus.status === 'active' && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => updateRideStatus('in-progress')}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Start Ride
          </button>
        </div>
      )}

      {isDriver && rideStatus.status === 'in-progress' && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => updateRideStatus('completed')}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Complete Ride
          </button>
        </div>
      )}

      {/* Status Badge */}
      <div className="mt-4 flex justify-center">
        <span className={`px-4 py-2 rounded-full text-sm font-medium ${
          rideStatus.status === 'active' ? 'bg-blue-100 text-blue-800' :
          rideStatus.status === 'in-progress' ? 'bg-amber-100 text-amber-800' :
          rideStatus.status === 'completed' ? 'bg-green-100 text-green-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {rideStatus.status === 'active' && 'Scheduled'}
          {rideStatus.status === 'in-progress' && 'In Progress'}
          {rideStatus.status === 'completed' && 'Completed'}
          {rideStatus.status === 'cancelled' && 'Cancelled'}
        </span>
      </div>
    </div>
  );
}
