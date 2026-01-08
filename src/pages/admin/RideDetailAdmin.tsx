import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import QuickUserCard from '../../components/admin/QuickUserCard';
import AdminActionLog from '../../components/admin/AdminActionLog';
import RideEditModal from '../../components/admin/RideEditModal';
import ConfirmModal from '../../components/shared/ConfirmModal';
import {
    Car,
    ArrowLeft,
    Edit,
    XCircle,
    Trash2,
    RefreshCw,
    MapPin,
    Calendar,
    Clock,
    Users,
    DollarSign,
    FileText,
    CheckCircle,
    AlertTriangle,
    MessageSquare,
    Copy,
    Check,
    ExternalLink,
    Navigation,
    Repeat,
    Send,
    Eye,
    ChevronRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { useAuth } from '../../contexts/AuthContext';

interface RideDetail {
    id: string;
    driver_id: string;
    driver: {
        id: string;
        full_name: string;
        email: string;
        avatar_url: string | null;
        phone: string | null;
        trust_score: number | null;
    };
    vehicle: {
        id: string;
        make: string;
        model: string;
        color: string;
        license_plate: string;
        year: number | null;
    } | null;
    origin: string;
    origin_lat: number | null;
    origin_lng: number | null;
    destination: string;
    destination_lat: number | null;
    destination_lng: number | null;
    departure_time: string;
    arrival_time: string | null;
    available_seats: number;
    total_seats: number;
    price_per_seat: number | null;
    status: string;
    notes: string | null;
    is_recurring: boolean;
    recurring_pattern: any | null;
    created_at: string;
    updated_at: string;
}

interface RideBooking {
    id: string;
    passenger_id: string;
    passenger: {
        id: string;
        full_name: string;
        email: string;
        avatar_url: string | null;
        phone: string | null;
    };
    seats_requested: number;
    status: string;
    pickup_location: string | null;
    dropoff_location: string | null;
    special_requests: string | null;
    created_at: string;
    cancelled_at: string | null;
    cancellation_reason: string | null;
}

export default function RideDetailAdmin() {
    const { rideId } = useParams<{ rideId: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { isAdmin, hasRole } = useAuth();

    const [ride, setRide] = useState<RideDetail | null>(null);
    const [bookings, setBookings] = useState<RideBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modals
    const [showEditModal, setShowEditModal] = useState(searchParams.get('edit') === 'true');
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelling, setCancelling] = useState(false);

    // Copy states
    const [copiedId, setCopiedId] = useState(false);

    useEffect(() => {
        if (!isAdmin) {
            navigate('/');
            return;
        }
        if (rideId) {
            fetchRideDetails();
        }
    }, [isAdmin, rideId]);

    const fetchRideDetails = async () => {
        if (!rideId) return;
        setLoading(true);

        try {
            // Fetch ride with driver and vehicle
            const { data: rideData, error: rideError } = await supabase
                .from('rides')
                .select(`
          *,
          driver:profiles!driver_id (
            id,
            full_name,
            email,
            avatar_url,
            phone,
            trust_score
          ),
          vehicle:vehicles!vehicle_id (
            id,
            make,
            model,
            color,
            license_plate,
            year
          )
        `)
                .eq('id', rideId)
                .single();

            if (rideError) throw rideError;
            setRide(rideData);

            // Fetch bookings
            const { data: bookingsData, error: bookingsError } = await supabase
                .from('ride_bookings')
                .select(`
          *,
          passenger:profiles!passenger_id (
            id,
            full_name,
            email,
            avatar_url,
            phone
          )
        `)
                .eq('ride_id', rideId)
                .order('created_at', { ascending: false });

            if (bookingsError) throw bookingsError;
            setBookings(bookingsData || []);

        } catch (error) {
            console.error('Error fetching ride details:', error);
            toast.error('Failed to load ride details');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchRideDetails();
    };

    const handleCopyId = async () => {
        if (ride) {
            await navigator.clipboard.writeText(ride.id);
            setCopiedId(true);
            toast.success('Ride ID copied!');
            setTimeout(() => setCopiedId(false), 2000);
        }
    };

    const handleCancelRide = async () => {
        if (!ride || !cancelReason.trim()) {
            toast.warning('Please provide a reason for cancellation');
            return;
        }

        setCancelling(true);
        try {
            const { error } = await supabase.rpc('admin_cancel_ride', {
                p_ride_id: ride.id,
                p_reason: cancelReason,
                p_notify_passengers: true,
            });

            if (error) throw error;

            toast.success('Ride cancelled successfully');
            setShowCancelModal(false);
            setCancelReason('');
            handleRefresh();
        } catch (error: any) {
            console.error('Error cancelling ride:', error);
            toast.error(error.message || 'Failed to cancel ride');
        } finally {
            setCancelling(false);
        }
    };

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteReason, setDeleteReason] = useState('');
    const [deletingRide, setDeletingRide] = useState(false);

    const handleDeleteRide = async () => {
        if (!ride || !hasRole('super_admin')) {
            toast.error('Only super admins can delete rides');
            return;
        }
        setShowDeleteConfirm(true);
    };

    const confirmDeleteRide = async () => {
        if (!deleteReason) {
            toast.error('Please provide a reason for deletion');
            return;
        }
        setDeletingRide(true);
        try {
            const { error } = await supabase.rpc('admin_delete_ride', {
                p_ride_id: ride!.id,
                p_reason: deleteReason,
            });

            if (error) throw error;

            toast.success('Ride deleted permanently');
            navigate('/admin/rides');
        } catch (error: any) {
            console.error('Error deleting ride:', error);
            toast.error(error.message || 'Failed to delete ride');
        } finally {
            setDeletingRide(false);
            setShowDeleteConfirm(false);
            setDeleteReason('');
        }
    };

    const handleApproveBooking = async (bookingId: string) => {
        try {
            const { error } = await supabase.rpc('admin_approve_booking', {
                p_booking_id: bookingId,
                p_reason: 'Approved by admin',
            });

            if (error) throw error;
            toast.success('Booking approved');
            handleRefresh();
        } catch (error: any) {
            toast.error(error.message || 'Failed to approve booking');
        }
    };

    const handleDeclineBooking = async (bookingId: string) => {
        const reason = prompt('Please provide a reason for declining:');
        if (!reason) return;

        try {
            const { error } = await supabase.rpc('admin_decline_booking', {
                p_booking_id: bookingId,
                p_reason: reason,
            });

            if (error) throw error;
            toast.success('Booking declined');
            handleRefresh();
        } catch (error: any) {
            toast.error(error.message || 'Failed to decline booking');
        }
    };

    const handleCancelBooking = async (bookingId: string) => {
        const reason = prompt('Please provide a reason for cancellation:');
        if (!reason) return;

        try {
            const { error } = await supabase.rpc('admin_cancel_booking', {
                p_booking_id: bookingId,
                p_reason: reason,
            });

            if (error) throw error;
            toast.success('Booking cancelled');
            handleRefresh();
        } catch (error: any) {
            toast.error(error.message || 'Failed to cancel booking');
        }
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
            active: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="w-4 h-4" /> },
            completed: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <Check className="w-4 h-4" /> },
            cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle className="w-4 h-4" /> },
            in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <Clock className="w-4 h-4" /> },
            pending: { bg: 'bg-orange-100', text: 'text-orange-800', icon: <Clock className="w-4 h-4" /> },
            confirmed: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="w-4 h-4" /> },
            declined: { bg: 'bg-gray-100', text: 'text-gray-800', icon: <XCircle className="w-4 h-4" /> },
        };
        const badge = badges[status] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: null };

        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
                {badge.icon}
                {status.replace('_', ' ')}
            </span>
        );
    };

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return {
            date: date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
            time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        };
    };

    const formatRelativeTime = (dateString: string) => {
        const diff = new Date(dateString).getTime() - Date.now();
        const hours = Math.abs(Math.floor(diff / (1000 * 60 * 60)));
        const days = Math.abs(Math.floor(diff / (1000 * 60 * 60 * 24)));

        if (diff < 0) {
            if (hours < 24) return `${hours} hours ago`;
            return `${days} days ago`;
        } else {
            if (hours < 24) return `in ${hours} hours`;
            return `in ${days} days`;
        }
    };

    if (!isAdmin) return null;

    if (loading) {
        return (
            <AdminLayout title="Loading..." subtitle="">
                <div className="flex items-center justify-center py-20">
                    <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
                </div>
            </AdminLayout>
        );
    }

    if (!ride) {
        return (
            <AdminLayout title="Ride Not Found" subtitle="">
                <div className="text-center py-20">
                    <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Ride Not Found</h2>
                    <p className="text-gray-500 mb-4">The ride you're looking for doesn't exist or has been deleted.</p>
                    <Link
                        to="/admin/rides"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Rides
                    </Link>
                </div>
            </AdminLayout>
        );
    }

    const dt = formatDateTime(ride.departure_time);
    const pendingBookings = bookings.filter(b => b.status === 'pending');
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
    const otherBookings = bookings.filter(b => !['pending', 'confirmed'].includes(b.status));

    return (
        <AdminLayout
            title="Ride Details"
            subtitle={`${ride.origin} → ${ride.destination}`}
            actions={
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setShowEditModal(true)}
                        className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <Edit className="w-4 h-4" />
                        Edit
                    </button>
                    {ride.status === 'active' && (
                        <button
                            onClick={() => setShowCancelModal(true)}
                            className="flex items-center gap-2 px-4 py-2 text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200 transition-colors"
                        >
                            <XCircle className="w-4 h-4" />
                            Cancel
                        </button>
                    )}
                    {hasRole('super_admin') && (
                        <button
                            onClick={handleDeleteRide}
                            className="flex items-center gap-2 px-4 py-2 text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>
                    )}
                </div>
            }
        >
            {/* Ride Header Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {ride.origin} → {ride.destination}
                            </h2>
                            {ride.is_recurring && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                    <Repeat className="w-3 h-3" />
                                    Recurring
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-4 text-gray-500">
                            <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {dt.date}
                            </div>
                            <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {dt.time}
                            </div>
                            <span className="text-sm text-gray-400">({formatRelativeTime(ride.departure_time)})</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {getStatusBadge(ride.status)}
                        <button
                            onClick={handleCopyId}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            #{ride.id.slice(0, 8)}
                            {copiedId ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Ride Details */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Car className="w-5 h-5 text-gray-400" />
                            Ride Details
                        </h3>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* Origin */}
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Origin</label>
                                <div className="flex items-start gap-2">
                                    <MapPin className="w-4 h-4 text-green-500 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-gray-900">{ride.origin}</p>
                                        {ride.origin_lat && ride.origin_lng && (
                                            <a
                                                href={`https://www.google.com/maps?q=${ride.origin_lat},${ride.origin_lng}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                            >
                                                <Navigation className="w-3 h-3" />
                                                View on map
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Destination */}
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Destination</label>
                                <div className="flex items-start gap-2">
                                    <MapPin className="w-4 h-4 text-red-500 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-gray-900">{ride.destination}</p>
                                        {ride.destination_lat && ride.destination_lng && (
                                            <a
                                                href={`https://www.google.com/maps?q=${ride.destination_lat},${ride.destination_lng}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                            >
                                                <Navigation className="w-3 h-3" />
                                                View on map
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Seats */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Seats</label>
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-gray-400" />
                                    <span className="font-medium text-gray-900">
                                        {ride.available_seats} / {ride.total_seats}
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-gray-200 rounded-full mt-1">
                                    <div
                                        className="h-full bg-blue-500 rounded-full"
                                        style={{ width: `${((ride.total_seats - ride.available_seats) / ride.total_seats) * 100}%` }}
                                    />
                                </div>
                            </div>

                            {/* Price */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Price per Seat</label>
                                <div className="flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-gray-400" />
                                    <span className="font-medium text-gray-900">
                                        {ride.price_per_seat ? `£${ride.price_per_seat.toFixed(2)}` : 'Free'}
                                    </span>
                                </div>
                            </div>

                            {/* Created */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Created</label>
                                <p className="text-sm text-gray-900">
                                    {new Date(ride.created_at).toLocaleDateString('en-GB', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                    })}
                                </p>
                            </div>

                            {/* Updated */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Last Updated</label>
                                <p className="text-sm text-gray-900">
                                    {new Date(ride.updated_at).toLocaleDateString('en-GB', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                    })}
                                </p>
                            </div>
                        </div>

                        {/* Notes */}
                        {ride.notes && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                                <p className="text-gray-700 bg-gray-50 rounded-lg p-3">{ride.notes}</p>
                            </div>
                        )}
                    </div>

                    {/* Bookings Section */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-gray-400" />
                                Bookings
                                <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                                    {bookings.length}
                                </span>
                            </h3>
                            <Link
                                to={`/admin/bookings?rideId=${ride.id}`}
                                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                                View all
                                <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>

                        {bookings.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                <p>No bookings yet</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Pending Bookings */}
                                {pendingBookings.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-medium text-orange-600 mb-2 flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            Pending ({pendingBookings.length})
                                        </h4>
                                        <div className="space-y-2">
                                            {pendingBookings.map(booking => (
                                                <BookingCard
                                                    key={booking.id}
                                                    booking={booking}
                                                    onApprove={() => handleApproveBooking(booking.id)}
                                                    onDecline={() => handleDeclineBooking(booking.id)}
                                                    onCancel={() => handleCancelBooking(booking.id)}
                                                    navigate={navigate}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Confirmed Bookings */}
                                {confirmedBookings.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-medium text-green-600 mb-2 flex items-center gap-1">
                                            <CheckCircle className="w-4 h-4" />
                                            Confirmed ({confirmedBookings.length})
                                        </h4>
                                        <div className="space-y-2">
                                            {confirmedBookings.map(booking => (
                                                <BookingCard
                                                    key={booking.id}
                                                    booking={booking}
                                                    onCancel={() => handleCancelBooking(booking.id)}
                                                    navigate={navigate}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Other Bookings */}
                                {otherBookings.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-2">
                                            Other ({otherBookings.length})
                                        </h4>
                                        <div className="space-y-2">
                                            {otherBookings.map(booking => (
                                                <BookingCard
                                                    key={booking.id}
                                                    booking={booking}
                                                    navigate={navigate}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Admin Action Log */}
                    <AdminActionLog
                        resourceType="ride"
                        resourceId={ride.id}
                        maxItems={20}
                        showExpanded={false}
                    />
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Driver Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Driver</h3>
                        <QuickUserCard
                            user={{
                                id: ride.driver?.id || '',
                                full_name: ride.driver?.full_name || 'Unknown',
                                email: ride.driver?.email || '',
                                phone: ride.driver?.phone,
                                avatar_url: ride.driver?.avatar_url,
                                trust_score: ride.driver?.trust_score,
                            }}
                            role="driver"
                            onViewProfile={() => navigate(`/admin/users?userId=${ride.driver_id}`)}
                            onMessage={() => toast.info('Messaging not implemented yet')}
                        />
                    </div>

                    {/* Vehicle Card */}
                    {ride.vehicle && (
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h3 className="font-semibold text-gray-900 mb-4">Vehicle</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-gray-100 rounded-lg">
                                        <Car className="w-6 h-6 text-gray-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {ride.vehicle.make} {ride.vehicle.model}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {ride.vehicle.color} {ride.vehicle.year && `• ${ride.vehicle.year}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                                    <span className="text-sm text-gray-500">License Plate:</span>
                                    <span className="font-mono font-medium text-gray-900">{ride.vehicle.license_plate}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quick Actions */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
                        <div className="space-y-2">
                            <button
                                onClick={() => navigate(`/rides/${ride.id}`)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                <Eye className="w-4 h-4" />
                                View Public Page
                            </button>
                            <button
                                onClick={() => toast.info('Send reminder not implemented yet')}
                                className="w-full flex items-center gap-2 px-4 py-2 text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                            >
                                <Send className="w-4 h-4" />
                                Send Reminder to Driver
                            </button>
                            <button
                                onClick={() => toast.info('Flag for review not implemented yet')}
                                className="w-full flex items-center gap-2 px-4 py-2 text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200 transition-colors"
                            >
                                <AlertTriangle className="w-4 h-4" />
                                Flag for Review
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <RideEditModal
                    ride={ride}
                    onClose={() => setShowEditModal(false)}
                    onSaved={() => {
                        setShowEditModal(false);
                        handleRefresh();
                    }}
                />
            )}

            {/* Cancel Modal */}
            {showCancelModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-orange-100 rounded-full">
                                <AlertTriangle className="w-6 h-6 text-orange-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Cancel Ride</h3>
                                <p className="text-sm text-gray-500">
                                    This will notify all {bookings.filter(b => b.status === 'confirmed').length} confirmed passengers
                                </p>
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cancellation Reason *
                            </label>
                            <textarea
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="Explain why this ride is being cancelled..."
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                                Cancel
                            </button>
                            <button
                                onClick={handleCancelRide}
                                disabled={cancelling || !cancelReason.trim()}
                                className="flex-1 px-4 py-2 text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                            >
                                {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Ride Confirmation Modal */}
            <ConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => {
                    setShowDeleteConfirm(false);
                    setDeleteReason('');
                }}
                onConfirm={confirmDeleteRide}
                title="Delete Ride Permanently"
                message={
                    <div className="space-y-4">
                        <p>Are you sure you want to permanently delete this ride? This action cannot be undone.</p>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for deletion *</label>
                            <textarea
                                value={deleteReason}
                                onChange={(e) => setDeleteReason(e.target.value)}
                                placeholder="Enter reason for deleting this ride..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                rows={3}
                            />
                        </div>
                    </div>
                }
                confirmText="Delete Permanently"
                cancelText="Cancel"
                variant="danger"
                loading={deletingRide}
            />
        </AdminLayout>
    );
}

// Booking Card Component
function BookingCard({
    booking,
    onApprove,
    onDecline,
    onCancel,
    navigate,
}: {
    booking: RideBooking;
    onApprove?: () => void;
    onDecline?: () => void;
    onCancel?: () => void;
    navigate: (path: string) => void;
}) {
    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            pending: 'bg-orange-100 text-orange-800',
            confirmed: 'bg-green-100 text-green-800',
            completed: 'bg-blue-100 text-blue-800',
            cancelled: 'bg-red-100 text-red-800',
            declined: 'bg-gray-100 text-gray-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    {booking.passenger?.avatar_url ? (
                        <img
                            src={booking.passenger.avatar_url}
                            alt={booking.passenger.full_name}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                            {booking.passenger?.full_name?.charAt(0) || 'U'}
                        </div>
                    )}
                    <div>
                        <p className="font-medium text-gray-900">{booking.passenger?.full_name || 'Unknown'}</p>
                        <p className="text-sm text-gray-500">{booking.passenger?.email}</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                        {booking.status}
                    </span>
                    <p className="text-sm text-gray-500 mt-1">{booking.seats_requested} seat{booking.seats_requested !== 1 ? 's' : ''}</p>
                </div>
            </div>

            {booking.special_requests && (
                <p className="text-sm text-gray-500 mt-2 bg-gray-50 rounded px-2 py-1">
                    "{booking.special_requests}"
                </p>
            )}

            {booking.cancellation_reason && (
                <p className="text-sm text-red-600 mt-2">
                    Cancellation reason: {booking.cancellation_reason}
                </p>
            )}

            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                <button
                    onClick={() => navigate(`/admin/bookings/${booking.id}`)}
                    className="flex-1 text-sm text-gray-600 hover:text-gray-900 flex items-center justify-center gap-1"
                >
                    <Eye className="w-4 h-4" />
                    View
                </button>
                {booking.status === 'pending' && onApprove && (
                    <button
                        onClick={onApprove}
                        className="flex-1 text-sm text-green-600 hover:text-green-700 flex items-center justify-center gap-1"
                    >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                    </button>
                )}
                {booking.status === 'pending' && onDecline && (
                    <button
                        onClick={onDecline}
                        className="flex-1 text-sm text-red-600 hover:text-red-700 flex items-center justify-center gap-1"
                    >
                        <XCircle className="w-4 h-4" />
                        Decline
                    </button>
                )}
                {['pending', 'confirmed'].includes(booking.status) && onCancel && (
                    <button
                        onClick={onCancel}
                        className="flex-1 text-sm text-orange-600 hover:text-orange-700 flex items-center justify-center gap-1"
                    >
                        <XCircle className="w-4 h-4" />
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );
}
