import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import BookingFilters, { BookingFiltersType, DEFAULT_BOOKING_FILTERS } from '../../components/admin/BookingFilters';
import QuickUserCard from '../../components/admin/QuickUserCard';
import {
    Calendar,
    RefreshCw,
    Download,
    Search,
    Eye,
    Edit,
    XCircle,
    CheckCircle,
    MoreVertical,
    ChevronLeft,
    ChevronRight,
    Clock,
    MapPin,
    Users,
    Copy,
    Check,
    MessageSquare,
    ExternalLink,
    AlertTriangle,
    ArrowRight,
    Car,
    DollarSign,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { useAuth } from '../../contexts/AuthContext';

interface AdminBooking {
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
    };
    ride: {
        id: string;
        origin: string;
        destination: string;
        departure_time: string;
        price_per_seat: number | null;
        driver_id: string;
        driver: {
            id: string;
            full_name: string;
            email: string;
        };
    };
    seats_requested: number;
    status: string;
    pickup_location: string | null;
    dropoff_location: string | null;
    special_requests: string | null;
    cancellation_reason: string | null;
    cancelled_at: string | null;
    is_last_minute_cancellation: boolean;
    created_at: string;
    updated_at: string;
}

interface BookingStats {
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    declined: number;
}

export default function BookingsManagement() {
    const { isAdmin } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Data state
    const [bookings, setBookings] = useState<AdminBooking[]>([]);
    const [stats, setStats] = useState<BookingStats>({ total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0, declined: 0 });
    const [totalCount, setTotalCount] = useState(0);

    // Loading states
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [exporting, setExporting] = useState(false);

    // Selection
    const [selectedBookings, setSelectedBookings] = useState<string[]>([]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState<number>(25);

    // Sorting
    const [sortField, setSortField] = useState<string>('created_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Filters
    const [filters, setFilters] = useState<BookingFiltersType>(() => {
        const rideId = searchParams.get('rideId');
        return rideId
            ? { ...DEFAULT_BOOKING_FILTERS, rideSearch: rideId }
            : DEFAULT_BOOKING_FILTERS;
    });
    const [filtersExpanded, setFiltersExpanded] = useState(!!searchParams.get('rideId'));
    const [searchQuery, setSearchQuery] = useState('');

    // Modals
    const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
    const [cancellingBooking, setCancellingBooking] = useState<string | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        if (!isAdmin) {
            navigate('/');
            return;
        }
        fetchBookings();
        fetchStats();
    }, [isAdmin, currentPage, pageSize, sortField, sortOrder, filters]);

    const fetchBookings = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('ride_bookings')
                .select(`
          *,
          passenger:profiles!passenger_id (
            id,
            full_name,
            email,
            avatar_url,
            phone,
            trust_score
          ),
          ride:rides!ride_id (
            id,
            origin,
            destination,
            departure_time,
            price_per_seat,
            driver_id,
            driver:profiles!driver_id (
              id,
              full_name,
              email
            )
          )
        `, { count: 'exact' });

            // Apply filters
            if (filters.status !== 'all') {
                query = query.eq('status', filters.status);
            }
            if (filters.dateFrom) {
                query = query.gte('created_at', filters.dateFrom);
            }
            if (filters.dateTo) {
                query = query.lte('created_at', filters.dateTo + 'T23:59:59');
            }
            if (filters.seatsMin) {
                query = query.gte('seats_requested', parseInt(filters.seatsMin));
            }
            if (filters.seatsMax) {
                query = query.lte('seats_requested', parseInt(filters.seatsMax));
            }
            if (filters.isLastMinute === 'yes') {
                query = query.eq('is_last_minute_cancellation', true);
            } else if (filters.isLastMinute === 'no') {
                query = query.eq('is_last_minute_cancellation', false);
            }

            // Apply search query
            if (searchQuery) {
                // Search by booking ID prefix
                query = query.or(`id.ilike.${searchQuery}%`);
            }

            // Apply sorting
            query = query.order(sortField, { ascending: sortOrder === 'asc' });

            // Apply pagination
            const from = (currentPage - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;

            if (error) throw error;

            // Client-side filtering for nested fields
            let filteredData = data || [];

            // Filter by passenger search
            if (filters.passengerSearch) {
                const search = filters.passengerSearch.toLowerCase();
                filteredData = filteredData.filter(b =>
                    b.passenger?.full_name?.toLowerCase().includes(search) ||
                    b.passenger?.email?.toLowerCase().includes(search)
                );
            }

            // Filter by driver search
            if (filters.driverSearch) {
                const search = filters.driverSearch.toLowerCase();
                filteredData = filteredData.filter(b =>
                    b.ride?.driver?.full_name?.toLowerCase().includes(search) ||
                    b.ride?.driver?.email?.toLowerCase().includes(search)
                );
            }

            // Filter by ride search
            if (filters.rideSearch) {
                const search = filters.rideSearch.toLowerCase();
                filteredData = filteredData.filter(b =>
                    b.ride_id.toLowerCase().includes(search) ||
                    b.ride?.origin?.toLowerCase().includes(search) ||
                    b.ride?.destination?.toLowerCase().includes(search)
                );
            }

            setBookings(filteredData);
            setTotalCount(count || 0);
        } catch (error) {
            console.error('Error fetching bookings:', error);
            toast.error('Failed to load bookings');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchStats = async () => {
        try {
            const [totalRes, pendingRes, confirmedRes, completedRes, cancelledRes, declinedRes] = await Promise.all([
                supabase.from('ride_bookings').select('id', { count: 'exact', head: true }),
                supabase.from('ride_bookings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
                supabase.from('ride_bookings').select('id', { count: 'exact', head: true }).eq('status', 'confirmed'),
                supabase.from('ride_bookings').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
                supabase.from('ride_bookings').select('id', { count: 'exact', head: true }).eq('status', 'cancelled'),
                supabase.from('ride_bookings').select('id', { count: 'exact', head: true }).eq('status', 'declined'),
            ]);

            setStats({
                total: totalRes.count || 0,
                pending: pendingRes.count || 0,
                confirmed: confirmedRes.count || 0,
                completed: completedRes.count || 0,
                cancelled: cancelledRes.count || 0,
                declined: declinedRes.count || 0,
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchBookings();
        fetchStats();
    };

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
        setCurrentPage(1);
    };

    const handleSelectBooking = (bookingId: string) => {
        setSelectedBookings(prev =>
            prev.includes(bookingId)
                ? prev.filter(id => id !== bookingId)
                : [...prev, bookingId]
        );
    };

    const handleSelectAll = () => {
        if (selectedBookings.length === bookings.length) {
            setSelectedBookings([]);
        } else {
            setSelectedBookings(bookings.map(b => b.id));
        }
    };

    const handleCopyId = async (id: string) => {
        await navigator.clipboard.writeText(id);
        setCopiedId(id);
        toast.success('Booking ID copied!');
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleApproveBooking = async (bookingId: string) => {
        try {
            const { error } = await supabase.rpc('admin_approve_booking', {
                p_booking_id: bookingId,
                p_reason: 'Approved by admin',
            });

            if (error) throw error;

            toast.success('Booking approved');
            setActionMenuOpen(null);
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
            setActionMenuOpen(null);
            handleRefresh();
        } catch (error: any) {
            toast.error(error.message || 'Failed to decline booking');
        }
    };

    const handleCancelBooking = async (bookingId: string) => {
        if (!cancelReason.trim()) {
            toast.warning('Please provide a reason for cancellation');
            return;
        }

        try {
            const { error } = await supabase.rpc('admin_cancel_booking', {
                p_booking_id: bookingId,
                p_reason: cancelReason,
            });

            if (error) throw error;

            toast.success('Booking cancelled');
            setCancellingBooking(null);
            setCancelReason('');
            handleRefresh();
        } catch (error: any) {
            toast.error(error.message || 'Failed to cancel booking');
        }
    };

    const handleExportCSV = async () => {
        setExporting(true);
        try {
            const dataToExport = selectedBookings.length > 0
                ? bookings.filter(b => selectedBookings.includes(b.id))
                : bookings;

            const csv = [
                'Booking ID,Passenger Name,Passenger Email,Ride ID,Route,Departure Date,Driver Name,Seats,Status,Pickup,Dropoff,Created At',
                ...dataToExport.map(b => [
                    b.id,
                    b.passenger?.full_name || 'Unknown',
                    b.passenger?.email || '',
                    b.ride_id,
                    `"${b.ride?.origin || ''} → ${b.ride?.destination || ''}"`,
                    b.ride?.departure_time ? new Date(b.ride.departure_time).toLocaleDateString() : '',
                    b.ride?.driver?.full_name || 'Unknown',
                    b.seats_requested,
                    b.status,
                    `"${b.pickup_location || ''}"`,
                    `"${b.dropoff_location || ''}"`,
                    new Date(b.created_at).toISOString(),
                ].join(','))
            ].join('\n');

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bookings-export-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);

            toast.success(`Exported ${dataToExport.length} bookings`);
        } catch (error) {
            toast.error('Failed to export bookings');
        } finally {
            setExporting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
            pending: { bg: 'bg-orange-100', text: 'text-orange-800', icon: <Clock className="w-3.5 h-3.5" /> },
            confirmed: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="w-3.5 h-3.5" /> },
            completed: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <Check className="w-3.5 h-3.5" /> },
            cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle className="w-3.5 h-3.5" /> },
            declined: { bg: 'bg-gray-100', text: 'text-gray-800', icon: <XCircle className="w-3.5 h-3.5" /> },
        };
        const badge = badges[status] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: null };

        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                {badge.icon}
                {status}
            </span>
        );
    };

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return {
            date: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        };
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    if (!isAdmin) return null;

    return (
        <AdminLayout
            title="Bookings Management"
            subtitle={`${stats.total} total bookings · ${stats.pending} pending`}
            actions={
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportCSV}
                        disabled={exporting}
                        className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        <Download className={`w-4 h-4 ${exporting ? 'animate-pulse' : ''}`} />
                        Export {selectedBookings.length > 0 ? `(${selectedBookings.length})` : ''}
                    </button>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            }
        >
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                <StatCard label="Total" value={stats.total} color="gray" />
                <StatCard label="Pending" value={stats.pending} color="orange" highlight={stats.pending > 0} />
                <StatCard label="Confirmed" value={stats.confirmed} color="green" />
                <StatCard label="Completed" value={stats.completed} color="blue" />
                <StatCard label="Cancelled" value={stats.cancelled} color="red" />
                <StatCard label="Declined" value={stats.declined} color="gray" />
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                        placeholder="Search by booking ID..."
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Filters */}
            <BookingFilters
                filters={filters}
                onChange={(newFilters) => {
                    setFilters(newFilters);
                    setCurrentPage(1);
                }}
                onClear={() => {
                    setFilters(DEFAULT_BOOKING_FILTERS);
                    setCurrentPage(1);
                }}
                isExpanded={filtersExpanded}
                onToggle={() => setFiltersExpanded(!filtersExpanded)}
            />

            {/* Bulk Actions Bar */}
            {selectedBookings.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={selectedBookings.length === bookings.length}
                            onChange={handleSelectAll}
                            className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="font-medium text-blue-900">
                            {selectedBookings.length} booking{selectedBookings.length !== 1 ? 's' : ''} selected
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportCSV}
                            className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                        >
                            Export Selected
                        </button>
                        <button
                            onClick={() => setSelectedBookings([])}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Clear Selection
                        </button>
                    </div>
                </div>
            )}

            {/* Bookings Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        checked={selectedBookings.length === bookings.length && bookings.length > 0}
                                        onChange={handleSelectAll}
                                        className="w-4 h-4 text-blue-600 rounded"
                                    />
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Passenger</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ride</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                                <th
                                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort('seats_requested')}
                                >
                                    Seats
                                    {sortField === 'seats_requested' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                                </th>
                                <th
                                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort('status')}
                                >
                                    Status
                                    {sortField === 'status' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                                </th>
                                <th
                                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort('created_at')}
                                >
                                    Created
                                    {sortField === 'created_at' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12 text-center">
                                        <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
                                        <p className="text-gray-500">Loading bookings...</p>
                                    </td>
                                </tr>
                            ) : bookings.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12 text-center">
                                        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500 font-medium">No bookings found</p>
                                        <p className="text-gray-400 text-sm">Try adjusting your filters</p>
                                    </td>
                                </tr>
                            ) : (
                                bookings.map((booking) => {
                                    const dt = formatDateTime(booking.created_at);
                                    const rideDt = booking.ride?.departure_time ? formatDateTime(booking.ride.departure_time) : null;
                                    return (
                                        <tr
                                            key={booking.id}
                                            className={`hover:bg-gray-50 transition-colors ${selectedBookings.includes(booking.id) ? 'bg-blue-50' : ''}`}
                                        >
                                            {/* Checkbox */}
                                            <td className="px-4 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedBookings.includes(booking.id)}
                                                    onChange={() => handleSelectBooking(booking.id)}
                                                    className="w-4 h-4 text-blue-600 rounded"
                                                />
                                            </td>

                                            {/* ID */}
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs font-mono text-gray-500">
                                                        #{booking.id.slice(0, 8)}
                                                    </span>
                                                    <button
                                                        onClick={() => handleCopyId(booking.id)}
                                                        className="p-1 hover:bg-gray-100 rounded"
                                                    >
                                                        {copiedId === booking.id ? (
                                                            <Check className="w-3 h-3 text-green-500" />
                                                        ) : (
                                                            <Copy className="w-3 h-3 text-gray-400" />
                                                        )}
                                                    </button>
                                                </div>
                                                {booking.is_last_minute_cancellation && (
                                                    <span className="text-xs text-orange-600 flex items-center gap-0.5 mt-1">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        Last minute
                                                    </span>
                                                )}
                                            </td>

                                            {/* Passenger */}
                                            <td className="px-4 py-4">
                                                <QuickUserCard
                                                    user={{
                                                        id: booking.passenger?.id || '',
                                                        full_name: booking.passenger?.full_name || 'Unknown',
                                                        email: booking.passenger?.email || '',
                                                        avatar_url: booking.passenger?.avatar_url,
                                                    }}
                                                    role="passenger"
                                                    compact
                                                    showActions={false}
                                                />
                                            </td>

                                            {/* Ride */}
                                            <td className="px-4 py-4">
                                                <div className="max-w-[180px]">
                                                    <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                                                        <span className="truncate">{booking.ride?.origin || 'Unknown'}</span>
                                                        <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                                        <span className="truncate">{booking.ride?.destination || ''}</span>
                                                    </div>
                                                    {rideDt && (
                                                        <div className="text-xs text-gray-500 mt-0.5">
                                                            {rideDt.date} at {rideDt.time}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Driver */}
                                            <td className="px-4 py-4">
                                                <div className="text-sm">
                                                    <p className="font-medium text-gray-900">{booking.ride?.driver?.full_name || 'Unknown'}</p>
                                                    <p className="text-gray-500 text-xs truncate max-w-[120px]">{booking.ride?.driver?.email}</p>
                                                </div>
                                            </td>

                                            {/* Seats */}
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-1">
                                                    <Users className="w-4 h-4 text-gray-400" />
                                                    <span className="font-medium text-gray-900">{booking.seats_requested}</span>
                                                </div>
                                                {booking.ride?.price_per_seat && (
                                                    <div className="text-xs text-gray-500 mt-0.5">
                                                        £{(booking.seats_requested * booking.ride.price_per_seat).toFixed(2)}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-4">
                                                {getStatusBadge(booking.status)}
                                            </td>

                                            {/* Created */}
                                            <td className="px-4 py-4">
                                                <div className="text-sm">
                                                    <p className="text-gray-900">{dt.date}</p>
                                                    <p className="text-gray-500 text-xs">{dt.time}</p>
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-4">
                                                <div className="relative flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => navigate(`/admin/bookings/${booking.id}`)}
                                                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => setActionMenuOpen(actionMenuOpen === booking.id ? null : booking.id)}
                                                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                                        >
                                                            <MoreVertical className="w-4 h-4" />
                                                        </button>

                                                        {/* Dropdown Menu */}
                                                        {actionMenuOpen === booking.id && (
                                                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                                                                <button
                                                                    onClick={() => {
                                                                        navigate(`/admin/rides/${booking.ride_id}`);
                                                                        setActionMenuOpen(null);
                                                                    }}
                                                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                                >
                                                                    <Car className="w-4 h-4" />
                                                                    View Ride
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        navigate(`/profile/${booking.passenger_id}`);
                                                                        setActionMenuOpen(null);
                                                                    }}
                                                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                                >
                                                                    <ExternalLink className="w-4 h-4" />
                                                                    View Passenger Profile
                                                                </button>
                                                                <hr className="my-1" />
                                                                {booking.status === 'pending' && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => handleApproveBooking(booking.id)}
                                                                            className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                                                                        >
                                                                            <CheckCircle className="w-4 h-4" />
                                                                            Approve
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeclineBooking(booking.id)}
                                                                            className="w-full px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                                                                        >
                                                                            <XCircle className="w-4 h-4" />
                                                                            Decline
                                                                        </button>
                                                                    </>
                                                                )}
                                                                {['pending', 'confirmed'].includes(booking.status) && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setCancellingBooking(booking.id);
                                                                            setActionMenuOpen(null);
                                                                        }}
                                                                        className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2"
                                                                    >
                                                                        <XCircle className="w-4 h-4" />
                                                                        Cancel Booking
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && bookings.length > 0 && (
                    <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>Showing</span>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="px-2 py-1 border border-gray-300 rounded-lg"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span>of {totalCount} bookings</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="px-3 py-1 text-sm text-gray-600">
                                Page {currentPage} of {totalPages || 1}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Cancel Modal */}
            {cancellingBooking && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-orange-100 rounded-full">
                                <AlertTriangle className="w-6 h-6 text-orange-600" />
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setCancellingBooking(null);
                                    setCancelReason('');
                                }}
                                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleCancelBooking(cancellingBooking)}
                                className="flex-1 px-4 py-2 text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
                            >
                                Confirm Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Click outside to close action menu */}
            {actionMenuOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setActionMenuOpen(null)}
                />
            )}
        </AdminLayout>
    );
}

function StatCard({ label, value, color, highlight }: { label: string; value: number; color: string; highlight?: boolean }) {
    const colors: Record<string, string> = {
        gray: 'bg-gray-100 text-gray-600 border-gray-200',
        green: 'bg-green-100 text-green-600 border-green-200',
        blue: 'bg-blue-100 text-blue-600 border-blue-200',
        orange: highlight ? 'bg-orange-200 text-orange-700 border-orange-300' : 'bg-orange-100 text-orange-600 border-orange-200',
        red: 'bg-red-100 text-red-600 border-red-200',
    };

    return (
        <div className={`rounded-xl border p-4 ${colors[color]} ${highlight ? 'ring-2 ring-orange-400' : ''}`}>
            <p className="text-sm font-medium opacity-80">{label}</p>
            <p className="text-2xl font-bold">{value.toLocaleString()}</p>
        </div>
    );
}
