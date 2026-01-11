import { MapPin, Clock, Calendar, Car, User, Star, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RideInfo {
    id: string;
    origin: string;
    destination: string;
    departure_time: string;
    // CANONICAL ride states: active, in-progress, completed, cancelled
    status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
    available_seats?: number;
    driver?: {
        id: string;
        full_name: string;
        avatar_url?: string;
        profile_photo_url?: string;
        average_rating?: number;
    };
}

interface BookingInfo {
    id: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    seats_booked: number;
    pickup_location?: string;
    dropoff_location?: string;
}

interface RideContextCardProps {
    ride: RideInfo;
    booking?: BookingInfo;
    compact?: boolean;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Scheduled' },
    active: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Active' },
    'in-progress': { bg: 'bg-green-100', text: 'text-green-700', label: 'In Progress' },
    completed: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Completed' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
    confirmed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Confirmed' },
};

export function RideContextCard({ ride, booking, compact = false }: RideContextCardProps) {
    const navigate = useNavigate();

    const handleClick = () => {
        if (booking) {
            navigate(`/bookings/${booking.id}`);
        } else {
            navigate(`/rides/${ride.id}`);
        }
    };

    const departureDate = new Date(ride.departure_time);
    const isToday = departureDate.toDateString() === new Date().toDateString();
    const isTomorrow =
        departureDate.toDateString() ===
        new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString();

    const dateLabel = isToday
        ? 'Today'
        : isTomorrow
            ? 'Tomorrow'
            : departureDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

    const rideStatus = STATUS_STYLES[ride.status];
    const bookingStatus = booking ? STATUS_STYLES[booking.status] : null;

    if (compact) {
        return (
            <button
                onClick={handleClick}
                className="w-full p-3 bg-gray-50 border rounded-xl hover:bg-gray-100 transition-colors
                 text-left flex items-center gap-3"
            >
                <div className="p-2 bg-blue-100 rounded-lg">
                    <Car className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                        {ride.origin.split(',')[0]} → {ride.destination.split(',')[0]}
                    </p>
                    <p className="text-xs text-gray-500">
                        {dateLabel} at {departureDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
            </button>
        );
    }

    return (
        <div
            onClick={handleClick}
            className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-xl
               p-4 cursor-pointer hover:shadow-md transition-all"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Car className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-900">Ride Details</span>
                </div>
                <div className="flex items-center gap-2">
                    {bookingStatus && (
                        <span className={`px-2 py-0.5 ${bookingStatus.bg} ${bookingStatus.text} text-xs font-medium rounded-full`}>
                            {bookingStatus.label}
                        </span>
                    )}
                    <span className={`px-2 py-0.5 ${rideStatus.bg} ${rideStatus.text} text-xs font-medium rounded-full`}>
                        {rideStatus.label}
                    </span>
                </div>
            </div>

            {/* Route */}
            <div className="space-y-2 mb-3">
                <div className="flex items-start gap-2">
                    <div className="w-2 h-2 mt-2 bg-green-500 rounded-full" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500">From</p>
                        <p className="text-sm text-gray-900 truncate">{ride.origin}</p>
                    </div>
                </div>
                <div className="flex items-start gap-2">
                    <div className="w-2 h-2 mt-2 bg-red-500 rounded-full" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500">To</p>
                        <p className="text-sm text-gray-900 truncate">{ride.destination}</p>
                    </div>
                </div>
            </div>

            {/* Info Row */}
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{dateLabel}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{departureDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {ride.available_seats !== undefined && (
                    <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>{ride.available_seats} seats</span>
                    </div>
                )}
            </div>

            {/* Driver Info */}
            {ride.driver && (
                <div className="flex items-center gap-3 pt-3 border-t">
                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                        {(ride.driver.profile_photo_url || ride.driver.avatar_url) ? (
                            <img
                                src={ride.driver.profile_photo_url || ride.driver.avatar_url}
                                alt={ride.driver.full_name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <User className="h-5 w-5" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{ride.driver.full_name}</p>
                        {ride.driver.average_rating && (
                            <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                <span className="text-xs text-gray-500">
                                    {ride.driver.average_rating.toFixed(1)}
                                </span>
                            </div>
                        )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
            )}

            {/* Booking Details */}
            {booking && (
                <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                    <div className="flex items-center justify-between">
                        <span>Seats booked:</span>
                        <span className="font-medium">{booking.seats_booked}</span>
                    </div>
                    {booking.pickup_location && booking.pickup_location !== ride.origin && (
                        <div className="flex items-center justify-between mt-1">
                            <span>Custom pickup:</span>
                            <span className="font-medium truncate max-w-[60%]">{booking.pickup_location}</span>
                        </div>
                    )}
                </div>
            )}

            {/* View Details CTA */}
            <div className="mt-3 text-center">
                <span className="text-xs text-blue-600 font-medium">Tap to view details →</span>
            </div>
        </div>
    );
}
