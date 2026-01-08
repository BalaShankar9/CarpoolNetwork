import { useState, useEffect, useCallback } from 'react';
import { Navigation, Clock, MapPin, Phone, MessageSquare, AlertTriangle, RefreshCw } from 'lucide-react';
import ConfirmModal from '../shared/ConfirmModal';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { RideTrackingState, subscribeToRideTracking, calculateETA } from '../../services/rideTrackingService';
import ClickableUserProfile from '../shared/ClickableUserProfile';
import { useNavigate } from 'react-router-dom';

interface LiveRideTrackerProps {
    rideId: string;
    bookingId: string;
    pickupLocation: { latitude: number; longitude: number; address: string };
    dropoffLocation: { latitude: number; longitude: number; address: string };
    driver: {
        id: string;
        full_name: string;
        avatar_url?: string | null;
        profile_photo_url?: string | null;
        phone?: string;
    };
    departureTime: string;
}

export default function LiveRideTracker({
    rideId,
    bookingId,
    pickupLocation,
    dropoffLocation,
    driver,
    departureTime,
}: LiveRideTrackerProps) {
    const navigate = useNavigate();
    const [tracking, setTracking] = useState<RideTrackingState | null>(null);
    const [loading, setLoading] = useState(true);
    const [eta, setEta] = useState<{ minutes: number; distance: number } | null>(null);
    const [status, setStatus] = useState<'waiting' | 'driver_on_way' | 'picking_up' | 'in_transit' | 'arriving' | 'completed'>('waiting');
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    const loadTrackingData = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('ride_tracking')
                .select('*')
                .eq('ride_id', rideId)
                .is('ride_ended_at', null)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                const trackingData = transformTrackingData(data);
                setTracking(trackingData);
                setLastUpdate(new Date());
                updateStatus(trackingData);

                if (trackingData.current_location) {
                    const etaData = calculateETA(
                        trackingData.current_location,
                        pickupLocation,
                        trackingData.current_speed_kmh
                    );
                    setEta({ minutes: etaData.etaMinutes, distance: etaData.distanceKm });
                }
            }
        } catch (error) {
            console.error('Error loading tracking:', error);
        } finally {
            setLoading(false);
        }
    }, [rideId, pickupLocation]);

    const updateStatus = (trackingData: RideTrackingState) => {
        const isOnboard = trackingData.passengers_onboard?.includes(bookingId);

        if (trackingData.ride_ended_at) {
            setStatus('completed');
        } else if (isOnboard) {
            setStatus('in_transit');
        } else if (trackingData.ride_started_at) {
            // Driver has started, check if close to pickup
            if (trackingData.current_location && eta && eta.minutes <= 2) {
                setStatus('arriving');
            } else {
                setStatus('driver_on_way');
            }
        } else {
            setStatus('waiting');
        }
    };

    useEffect(() => {
        loadTrackingData();

        // Subscribe to real-time updates
        const unsubscribe = subscribeToRideTracking(rideId, (newTracking) => {
            setTracking(newTracking);
            setLastUpdate(new Date());
            updateStatus(newTracking);

            if (newTracking.current_location) {
                const etaData = calculateETA(
                    newTracking.current_location,
                    status === 'in_transit' ? dropoffLocation : pickupLocation,
                    newTracking.current_speed_kmh
                );
                setEta({ minutes: etaData.etaMinutes, distance: etaData.distanceKm });
            }
        });

        // Refresh every 30 seconds as backup
        const interval = setInterval(loadTrackingData, 30000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, [rideId, loadTrackingData]);

    const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false);

    const handleEmergency = () => {
        setShowEmergencyConfirm(true);
    };

    const confirmEmergency = () => {
        setShowEmergencyConfirm(false);
        toast.info('Emergency alert sent. Our team will contact you shortly.');
        // In production, this would trigger actual emergency protocols
    };

    const handleMessage = () => {
        navigate(`/messages?driver=${driver.id}`);
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                </div>
            </div>
        );
    }

    const statusConfig = {
        waiting: {
            color: 'bg-yellow-100 border-yellow-200 text-yellow-800',
            icon: Clock,
            title: 'Waiting for driver to start',
            description: `Scheduled departure: ${new Date(departureTime).toLocaleTimeString()}`,
        },
        driver_on_way: {
            color: 'bg-blue-100 border-blue-200 text-blue-800',
            icon: Navigation,
            title: 'Driver is on the way',
            description: eta ? `Arriving in ~${eta.minutes} min (${eta.distance.toFixed(1)} km away)` : 'Calculating ETA...',
        },
        picking_up: {
            color: 'bg-blue-100 border-blue-200 text-blue-800',
            icon: MapPin,
            title: 'Driver is nearby',
            description: 'Head to your pickup location',
        },
        arriving: {
            color: 'bg-green-100 border-green-200 text-green-800',
            icon: MapPin,
            title: 'Driver arriving!',
            description: 'Your driver is almost at the pickup point',
        },
        in_transit: {
            color: 'bg-green-100 border-green-200 text-green-800',
            icon: Navigation,
            title: 'On your way!',
            description: eta ? `ETA to destination: ~${eta.minutes} min` : 'Calculating ETA...',
        },
        completed: {
            color: 'bg-gray-100 border-gray-200 text-gray-800',
            icon: Clock,
            title: 'Ride completed',
            description: 'Thank you for riding with us!',
        },
    };

    const currentStatus = statusConfig[status];
    const StatusIcon = currentStatus.icon;

    return (
        <div className="space-y-4">
            {/* Status Banner */}
            <div className={`rounded-xl p-4 border ${currentStatus.color}`}>
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-white bg-opacity-50">
                        <StatusIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-semibold">{currentStatus.title}</h4>
                        <p className="text-sm opacity-80">{currentStatus.description}</p>
                    </div>
                    {tracking && (
                        <button
                            onClick={loadTrackingData}
                            className="p-2 hover:bg-white hover:bg-opacity-30 rounded-full transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Driver Info Card */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                    <ClickableUserProfile
                        user={{
                            id: driver.id,
                            full_name: driver.full_name,
                            avatar_url: driver.avatar_url,
                            profile_photo_url: driver.profile_photo_url,
                        }}
                        size="md"
                        showNameRight
                        additionalInfo="Your Driver"
                    />
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleMessage}
                            className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors"
                            title="Message driver"
                        >
                            <MessageSquare className="w-5 h-5" />
                        </button>
                        {driver.phone && (
                            <a
                                href={`tel:${driver.phone}`}
                                className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors"
                                title="Call driver"
                            >
                                <Phone className="w-5 h-5" />
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* Trip Progress */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-4">Trip Progress</h4>
                <div className="relative">
                    {/* Progress line */}
                    <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200">
                        <div
                            className="absolute top-0 left-0 w-full bg-blue-500 transition-all duration-500"
                            style={{
                                height: status === 'waiting' ? '0%'
                                    : status === 'driver_on_way' || status === 'arriving' ? '25%'
                                        : status === 'in_transit' ? '75%'
                                            : '100%'
                            }}
                        />
                    </div>

                    {/* Pickup Point */}
                    <div className="flex items-start gap-4 pb-6">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${status !== 'waiting' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                            }`}>
                            <MapPin className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-gray-900">Pickup</p>
                            <p className="text-sm text-gray-600">{pickupLocation.address}</p>
                        </div>
                    </div>

                    {/* Current Location (if driver is on way) */}
                    {(status === 'driver_on_way' || status === 'arriving') && tracking?.current_location && (
                        <div className="flex items-start gap-4 pb-6">
                            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center z-10 animate-pulse">
                                <Navigation className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-gray-900">Driver</p>
                                <p className="text-sm text-gray-600">
                                    {eta?.distance.toFixed(1)} km away • {tracking.current_speed_kmh.toFixed(0)} km/h
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Dropoff Point */}
                    <div className="flex items-start gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${status === 'completed' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                            }`}>
                            <MapPin className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-gray-900">Dropoff</p>
                            <p className="text-sm text-gray-600">{dropoffLocation.address}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Live Stats */}
            {tracking && status !== 'waiting' && status !== 'completed' && (
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-2xl font-bold text-blue-600">{eta?.minutes || '--'}</p>
                            <p className="text-xs text-gray-500">min ETA</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{tracking.current_speed_kmh.toFixed(0)}</p>
                            <p className="text-xs text-gray-500">km/h</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{eta?.distance.toFixed(1) || '--'}</p>
                            <p className="text-xs text-gray-500">km away</p>
                        </div>
                    </div>
                    {lastUpdate && (
                        <p className="text-xs text-gray-400 text-center mt-3">
                            Last updated: {lastUpdate.toLocaleTimeString()}
                        </p>
                    )}
                </div>
            )}

            {/* Emergency Button */}
            <button
                onClick={handleEmergency}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors"
            >
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">Emergency</span>
            </button>

            {/* Emergency Confirmation Modal */}
            <ConfirmModal
                isOpen={showEmergencyConfirm}
                onClose={() => setShowEmergencyConfirm(false)}
                onConfirm={confirmEmergency}
                title="Emergency Alert"
                message="This will alert the driver and our safety team. Are you sure you want to continue?"
                confirmText="Send Alert"
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    );
}

function transformTrackingData(data: any): RideTrackingState {
    let currentLocation: { longitude: number; latitude: number } | null = null;

    if (data.current_location) {
        // Handle different location formats
        if (typeof data.current_location === 'object' && data.current_location.coordinates) {
            currentLocation = {
                longitude: data.current_location.coordinates[0],
                latitude: data.current_location.coordinates[1],
            };
        }
    }

    return {
        id: data.id,
        ride_id: data.ride_id,
        driver_id: data.driver_id,
        current_location: currentLocation,
        current_speed_kmh: data.current_speed_kmh || 0,
        heading_degrees: data.heading_degrees || 0,
        route_deviation_meters: data.route_deviation_meters || 0,
        eta_to_next_stop: data.eta_to_next_stop,
        passengers_onboard: data.passengers_onboard || [],
        last_updated: data.last_updated,
        ride_started_at: data.ride_started_at,
        ride_ended_at: data.ride_ended_at,
    };
}
