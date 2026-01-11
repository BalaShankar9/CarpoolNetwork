import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import QuickUserCard from '../../components/admin/QuickUserCard';
import AdminActionLog from '../../components/admin/AdminActionLog';
import BookingEditModal from '../../components/admin/BookingEditModal';
import {
    ArrowLeft,
    Calendar,
    Clock,
    MapPin,
    Users,
    DollarSign,
    Car,
    CheckCircle,
    XCircle,
    AlertTriangle,
    RefreshCw,
    Edit,
    MessageSquare,
    Copy,
    Check,
    ExternalLink,
    ArrowRight,
    Phone,
    Mail,
    FileText,
    Star,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';

interface BookingDetail {
    id: string;
    ride_id: string;
    passenger_id: string;
    passenger: {
        id: string;
        full_name: string;
        email: string;
        avatar_url: string | null;
        phone: string | null;
        trust_score: number | null;
        verification_level: string | null;
        created_at: string;
    };
    ride: {
        id: string;
        origin: string;
        destination: string;
        origin_coordinates: { lat: number; lng: number } | null;
        destination_coordinates: { lat: number; lng: number } | null;
        departure_time: string;
        arrival_time: string | null;
        available_seats: number;
        price_per_seat: number | null;
        status: string;
        notes: string | null;
        driver_id: string;
        driver: {
            id: string;
            full_name: string;
            email: string;
            phone: string | null;
            avatar_url: string | null;
            trust_score: number | null;
        };
        vehicle: {
            id: string;
            make: string;
            model: string;
            color: string;
            license_plate: string;
        } | null;
    };
    seats_requested: number;
    status: string;
    pickup_location: string | null;
    pickup_coordinates: { lat: number; lng: number } | null;
    dropoff_location: string | null;
    dropoff_coordinates: { lat: number; lng: number } | null;
    special_requests: string | null;
    cancellation_reason: string | null;
    cancelled_at: string | null;
    cancelled_by: string | null;
    is_last_minute_cancellation: boolean;
    payment_status: string | null;
    payment_amount: number | null;
    created_at: string;
    updated_at: string;
}

export default function BookingDetailAdmin() {
    const { bookingId } = useParams<{ bookingId: string }>();
    const navigate = useNavigate();

    const [booking, setBooking] = useState<BookingDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [copiedId, setCopiedId] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Cancel modal
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');

    useEffect(() => {
        if (bookingId) {
            fetchBooking();
        }
    }, [bookingId]);

    const fetchBooking = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('ride_bookings')
                .select(`
          *,
          passenger:profiles!passenger_id (
            id,
            full_name,
            email,
            avatar_url,
            phone,
            trust_score,
            verification_level,
            created_at
          ),
          ride:rides!ride_id (
            id,
            origin,
            destination,
            origin_coordinates,
            destination_coordinates,
            departure_time,
            arrival_time,
            available_seats,
            price_per_seat,
            status,
            notes,
            driver_id,
            driver:profiles!driver_id (
              id,
              full_name,
              email,
              phone,
              avatar_url,
              trust_score
            ),
            vehicle:vehicles (
              id,
              make,
              model,
              color,
              license_plate
            )
          )
        `)
                .eq('id', bookingId)
                .single();

            if (error) throw error;
            setBooking(data);
        } catch (error) {
            console.error('Error fetching booking:', error);
            toast.error('Failed to load booking details');
            navigate('/admin/bookings');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchBooking();
    };

    const handleCopyId = async () => {
        if (booking) {
            await navigator.clipboard.writeText(booking.id);
            setCopiedId(true);
            toast.success('Booking ID copied!');
            setTimeout(() => setCopiedId(false), 2000);
        }
    };

    const handleApprove = async () => {
        if (!booking) return;
        setActionLoading('approve');
        try {
            const { error } = await supabase.rpc('admin_approve_booking', {
                p_booking_id: booking.id,
                p_reason: 'Approved by admin',
            });

            if (error) throw error;
            toast.success('Booking approved');
            fetchBooking();
        } catch (error: any) {
            toast.error(error.message || 'Failed to approve booking');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDecline = async () => {
        const reason = prompt('Please provide a reason for declining:');
        if (!reason) return;

        setActionLoading('decline');
        try {
            const { error } = await supabase.rpc('admin_decline_booking', {
                p_booking_id: booking!.id,
                p_reason: reason,
            });

            if (error) throw error;
            toast.success('Booking declined');
            fetchBooking();
        } catch (error: any) {
            toast.error(error.message || 'Failed to decline booking');
        } finally {
            setActionLoading(null);
        }
    };

    const handleCancel = async () => {
        if (!booking || !cancelReason.trim()) {
            toast.warning('Please provide a cancellation reason');
            return;
        }

        setActionLoading('cancel');
        try {
            const { error } = await supabase.rpc('admin_cancel_booking', {
                p_booking_id: booking.id,
                p_reason: cancelReason,
            });

            if (error) throw error;
            toast.success('Booking cancelled');
            setShowCancelModal(false);
            setCancelReason('');
            fetchBooking();
        } catch (error: any) {
            toast.error(error.message || 'Failed to cancel booking');
        } finally {
            setActionLoading(null);
        }
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
            pending: { bg: 'bg-orange-100', text: 'text-orange-800', icon: <Clock className="w-4 h-4" /> },
            confirmed: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="w-4 h-4" /> },
            completed: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <Check className="w-4 h-4" /> },
            cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle className="w-4 h-4" /> },
            declined: { bg: 'bg-gray-100', text: 'text-gray-800', icon: <XCircle className="w-4 h-4" /> },
        };
        const badge = badges[status] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: null };

        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
                {badge.icon}
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return {
            date: date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
            time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            relative: getRelativeTime(date),
        };
    };

    const getRelativeTime = (date: Date) => {
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days < 0) return `${Math.abs(days)} days ago`;
        if (days === 0) return 'Today';
        if (days === 1) return 'Tomorrow';
        return `In ${days} days`;
    };

    if (loading) {
        return (
            <AdminLayout title="Loading..." subtitle="">
                <div className="flex items-center justify-center py-20">
                    <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
                </div>
            </AdminLayout>
        );
    }

    if (!booking) {
        return (
            <AdminLayout title="Booking Not Found" subtitle="">
                <div className="text-center py-20">
                    <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">This booking could not be found.</p>
                    <button
                        onClick={() => navigate('/admin/bookings')}
                        className="mt-4 text-blue-600 hover:underline"
                    >
                        Back to Bookings
                    </button>
                </div>
            </AdminLayout>
        );
    }

    const rideDt = formatDateTime(booking.ride.departure_time);
    const createdDt = formatDateTime(booking.created_at);
    const totalAmount = booking.seats_requested * (booking.ride.price_per_seat || 0);

    return (
        <AdminLayout
            title="Booking Details"
            subtitle={`#${booking.id.slice(0, 8)}`}
            actions={
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setShowEditModal(true)}
                        className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Edit className="w-4 h-4" />
                        Edit Booking
                    </button>
                </div>
            }
        >
            {/* Back Button */}
            <button
                onClick={() => navigate('/admin/bookings')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Bookings
            </button>

            {/* Header Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            {getStatusBadge(booking.status)}
                            {booking.is_last_minute_cancellation && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                                    <AlertTriangle className="w-3 h-3" />
                                    Last Minute
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-semibold text-gray-900">
                                Booking #{booking.id.slice(0, 8)}
                            </h2>
                            <button
                                onClick={handleCopyId}
                                className="p-1 hover:bg-gray-100 rounded"
                                title="Copy full ID"
                            >
                                {copiedId ? (
                                    <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                    <Copy className="w-4 h-4 text-gray-400" />
                                )}
                            </button>
                        </div>
                        <p className="text-gray-500 mt-1">
                            Created {createdDt.date} at {createdDt.time}
                        </p>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-2">
                        {booking.status === 'pending' && (
                            <>
                                <button
                                    onClick={handleApprove}
                                    disabled={actionLoading !== null}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                >
                                    {actionLoading === 'approve' ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CheckCircle className="w-4 h-4" />
                                    )}
                                    Approve
                                </button>
                                <button
                                    onClick={handleDecline}
                                    disabled={actionLoading !== null}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                                >
                                    {actionLoading === 'decline' ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <XCircle className="w-4 h-4" />
                                    )}
                                    Decline
                                </button>
                            </>
                        )}
                        {['pending', 'confirmed'].includes(booking.status) && (
                            <button
                                onClick={() => setShowCancelModal(true)}
                                disabled={actionLoading !== null}
                                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                            >
                                <XCircle className="w-4 h-4" />
                                Cancel
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Booking Details */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Details</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Seats Requested</p>
                                <div className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-gray-400" />
                                    <span className="text-lg font-semibold text-gray-900">{booking.seats_requested}</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Total Amount</p>
                                <div className="flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-gray-400" />
                                    <span className="text-lg font-semibold text-gray-900">£{totalAmount.toFixed(2)}</span>
                                </div>
                            </div>
                            {booking.pickup_location && (
                                <div className="col-span-2">
                                    <p className="text-sm text-gray-500 mb-1">Custom Pickup</p>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-green-500" />
                                        <span className="text-gray-900">{booking.pickup_location}</span>
                                    </div>
                                </div>
                            )}
                            {booking.dropoff_location && (
                                <div className="col-span-2">
                                    <p className="text-sm text-gray-500 mb-1">Custom Dropoff</p>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-red-500" />
                                        <span className="text-gray-900">{booking.dropoff_location}</span>
                                    </div>
                                </div>
                            )}
                            {booking.special_requests && (
                                <div className="col-span-2">
                                    <p className="text-sm text-gray-500 mb-1">Special Requests</p>
                                    <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                                        <FileText className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-900">{booking.special_requests}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Cancellation Info */}
                        {booking.status === 'cancelled' && booking.cancellation_reason && (
                            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium text-red-900">Cancellation Reason</h4>
                                        <p className="text-red-700 mt-1">{booking.cancellation_reason}</p>
                                        {booking.cancelled_at && (
                                            <p className="text-red-600 text-sm mt-2">
                                                Cancelled on {formatDateTime(booking.cancelled_at).date} at {formatDateTime(booking.cancelled_at).time}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Ride Information */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Ride Information</h3>
                            <button
                                onClick={() => navigate(`/admin/rides/${booking.ride_id}`)}
                                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                            >
                                View Ride
                                <ExternalLink className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Route */}
                        <div className="flex items-start gap-4 mb-4">
                            <div className="flex flex-col items-center">
                                <div className="w-3 h-3 bg-green-500 rounded-full" />
                                <div className="w-0.5 h-10 bg-gray-200" />
                                <div className="w-3 h-3 bg-red-500 rounded-full" />
                            </div>
                            <div className="flex-1">
                                <div className="mb-4">
                                    <p className="text-sm text-gray-500">From</p>
                                    <p className="font-medium text-gray-900">{booking.ride.origin}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">To</p>
                                    <p className="font-medium text-gray-900">{booking.ride.destination}</p>
                                </div>
                            </div>
                        </div>

                        {/* Date/Time */}
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Departure</p>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <span className="font-medium">{rideDt.date}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span className="font-medium">{rideDt.time}</span>
                                    <span className="text-xs text-gray-500">({rideDt.relative})</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Ride Status</p>
                                {getStatusBadge(booking.ride.status)}
                            </div>
                        </div>
                    </div>

                    {/* Admin Action Log */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Action Log</h3>
                        <AdminActionLog
                            resourceType="booking"
                            resourceId={booking.id}
                            maxItems={10}
                        />
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Passenger Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Passenger</h3>
                        <QuickUserCard
                            user={{
                                id: booking.passenger.id,
                                full_name: booking.passenger.full_name,
                                email: booking.passenger.email,
                                avatar_url: booking.passenger.avatar_url,
                                phone: booking.passenger.phone,
                                trust_score: booking.passenger.trust_score,
                            }}
                            role="passenger"
                            showActions
                        />
                        <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500">
                            <p>Member since {formatDateTime(booking.passenger.created_at).date}</p>
                            {booking.passenger.verification_level && (
                                <p className="mt-1">Verification: {booking.passenger.verification_level}</p>
                            )}
                        </div>
                    </div>

                    {/* Driver Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Driver</h3>
                        <QuickUserCard
                            user={{
                                id: booking.ride.driver.id,
                                full_name: booking.ride.driver.full_name,
                                email: booking.ride.driver.email,
                                avatar_url: booking.ride.driver.avatar_url,
                                phone: booking.ride.driver.phone,
                                trust_score: booking.ride.driver.trust_score,
                            }}
                            role="driver"
                            showActions
                        />
                    </div>

                    {/* Vehicle Info */}
                    {booking.ride.vehicle && (
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle</h3>
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-gray-100 rounded-lg">
                                    <Car className="w-6 h-6 text-gray-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">
                                        {booking.ride.vehicle.make} {booking.ride.vehicle.model}
                                    </p>
                                    <p className="text-sm text-gray-500">{booking.ride.vehicle.color}</p>
                                </div>
                            </div>
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500">License Plate</p>
                                <p className="text-lg font-mono font-bold text-gray-900">{booking.ride.vehicle.license_plate}</p>
                            </div>
                        </div>
                    )}

                    {/* Payment Info */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Price per seat</span>
                                <span className="font-medium">£{(booking.ride.price_per_seat || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Seats</span>
                                <span className="font-medium">× {booking.seats_requested}</span>
                            </div>
                            <hr />
                            <div className="flex justify-between text-lg">
                                <span className="font-medium">Total</span>
                                <span className="font-bold text-green-600">£{totalAmount.toFixed(2)}</span>
                            </div>
                            {booking.payment_status && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500">Payment Status</p>
                                    <p className={`font-medium ${booking.payment_status === 'completed' ? 'text-green-600' :
                                            booking.payment_status === 'pending' ? 'text-orange-600' :
                                                'text-gray-600'
                                        }`}>
                                        {booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1)}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <BookingEditModal
                    booking={booking}
                    onClose={() => setShowEditModal(false)}
                    onSave={() => {
                        setShowEditModal(false);
                        fetchBooking();
                    }}
                />
            )}

            {/* Cancel Modal */}
            {showCancelModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-red-100 rounded-full">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Cancel Booking</h3>
                                <p className="text-sm text-gray-500">This will notify the passenger</p>
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cancellation Reason *
                            </label>
                            <textarea
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="Explain why this booking is being cancelled..."
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowCancelModal(false);
                                    setCancelReason('');
                                }}
                                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleCancel}
                                disabled={actionLoading === 'cancel'}
                                className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {actionLoading === 'cancel' ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                    'Cancel Booking'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
