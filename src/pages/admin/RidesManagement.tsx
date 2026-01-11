import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import RideFilters, { RideFiltersType, DEFAULT_RIDE_FILTERS } from '../../components/admin/RideFilters';
import QuickUserCard from '../../components/admin/QuickUserCard';
import {
    Car,
    RefreshCw,
    Download,
    Plus,
    Search,
    Eye,
    Edit,
    XCircle,
    Trash2,
    MoreVertical,
    ChevronLeft,
    ChevronRight,
    CheckCircle,
    Clock,
    MapPin,
    Calendar,
    Users,
    DollarSign,
    Copy,
    Check,
    MessageSquare,
    ExternalLink,
    AlertTriangle,
    Repeat,
    ArrowRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { useAuth } from '../../contexts/AuthContext';

interface AdminRide {
    id: string;
    driver_id: string;
    driver: {
        id: string;
        full_name: string;
        email: string;
        avatar_url: string | null;
        phone: string | null;
    };
    vehicle: {
        id: string;
        make: string;
        model: string;
        color: string;
        license_plate: string;
    } | null;
    origin: string;
    origin_lat: number | null;
    origin_lng: number | null;
    destination: string;
    destination_lat: number | null;
    destination_lng: number | null;
    departure_time: string;
    available_seats: number;
    total_seats: number;
    price_per_seat: number | null;
    status: string;
    notes: string | null;
    is_recurring: boolean;
    created_at: string;
    updated_at: string;
    bookings_count: number;
    confirmed_bookings: number;
    pending_bookings: number;
}

interface RideStats {
    total: number;
    active: number;
    completed: number;
    cancelled: number;
    inProgress: number;
}

export default function RidesManagement() {
    const { hasRole } = useAuth();
    const navigate = useNavigate();

    // Data state
    const [rides, setRides] = useState<AdminRide[]>([]);
    const [stats, setStats] = useState<RideStats>({ total: 0, active: 0, completed: 0, cancelled: 0, inProgress: 0 });
    const [totalCount, setTotalCount] = useState(0);

    // Loading states
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [exporting, setExporting] = useState(false);

    // Selection
    const [selectedRides, setSelectedRides] = useState<string[]>([]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState<number>(25);

    // Sorting
    const [sortField, setSortField] = useState<string>('departure_time');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Filters
    const [filters, setFilters] = useState<RideFiltersType>(DEFAULT_RIDE_FILTERS);
    const [filtersExpanded, setFiltersExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Modals
    const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
    const [cancellingRide, setCancellingRide] = useState<string | null>(null);
    const [deletingRide, setDeletingRide] = useState<string | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        fetchRides();
        fetchStats();
    }, [currentPage, pageSize, sortField, sortOrder, filters]);

    const fetchRides = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('rides')
                .select(`
          *,
          driver:profiles!driver_id (
            id,
            full_name,
            email,
            avatar_url,
            phone
          ),
          vehicle:vehicles!vehicle_id (
            id,
            make,
            model,
            color,
            license_plate
          )
        `, { count: 'exact' });

            // Apply filters
            if (filters.status !== 'all') {
                query = query.eq('status', filters.status);
            }
            if (filters.dateFrom) {
                query = query.gte('departure_time', filters.dateFrom);
            }
            if (filters.dateTo) {
                query = query.lte('departure_time', filters.dateTo + 'T23:59:59');
            }
            if (filters.originSearch) {
                query = query.ilike('origin', `%${filters.originSearch}%`);
            }
            if (filters.destinationSearch) {
                query = query.ilike('destination', `%${filters.destinationSearch}%`);
            }
            if (filters.minSeats) {
                query = query.gte('available_seats', parseInt(filters.minSeats));
            }
            if (filters.maxSeats) {
                query = query.lte('available_seats', parseInt(filters.maxSeats));
            }
            if (filters.minPrice) {
                query = query.gte('price_per_seat', parseFloat(filters.minPrice));
            }
            if (filters.maxPrice) {
                query = query.lte('price_per_seat', parseFloat(filters.maxPrice));
            }
            if (filters.isRecurring === 'yes') {
                query = query.eq('is_recurring', true);
            } else if (filters.isRecurring === 'no') {
                query = query.eq('is_recurring', false);
            }

            // Apply search query
            if (searchQuery) {
                query = query.or(`origin.ilike.%${searchQuery}%,destination.ilike.%${searchQuery}%`);
            }

            // Apply sorting
            query = query.order(sortField, { ascending: sortOrder === 'asc' });

            // Apply pagination
            const from = (currentPage - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;

            if (error) throw error;

            // Fetch booking counts for each ride
            const ridesWithBookings = await Promise.all(
                (data || []).map(async (ride) => {
                    const { data: bookings } = await supabase
                        .from('ride_bookings')
                        .select('status')
                        .eq('ride_id', ride.id);

                    const bookingStats = bookings?.reduce(
                        (acc, b) => {
                            acc.total++;
                            if (b.status === 'confirmed') acc.confirmed++;
                            if (b.status === 'pending') acc.pending++;
                            return acc;
                        },
                        { total: 0, confirmed: 0, pending: 0 }
                    ) || { total: 0, confirmed: 0, pending: 0 };

                    return {
                        ...ride,
                        bookings_count: bookingStats.total,
                        confirmed_bookings: bookingStats.confirmed,
                        pending_bookings: bookingStats.pending,
                    };
                })
            );

            // Apply hasBookings filter client-side
            let filteredRides = ridesWithBookings;
            if (filters.hasBookings === 'yes') {
                filteredRides = ridesWithBookings.filter(r => r.bookings_count > 0);
            } else if (filters.hasBookings === 'no') {
                filteredRides = ridesWithBookings.filter(r => r.bookings_count === 0);
            }

            // Filter by driver search
            if (filters.driverSearch) {
                const search = filters.driverSearch.toLowerCase();
                filteredRides = filteredRides.filter(r =>
                    r.driver?.full_name?.toLowerCase().includes(search) ||
                    r.driver?.email?.toLowerCase().includes(search)
                );
            }

            setRides(filteredRides);
            setTotalCount(count || 0);
        } catch (error) {
            console.error('Error fetching rides:', error);
            toast.error('Failed to load rides');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchStats = async () => {
        try {
            // CANONICAL ride states: active, in-progress, completed, cancelled
            const [totalRes, activeRes, completedRes, cancelledRes, inProgressRes] = await Promise.all([
                supabase.from('rides').select('id', { count: 'exact', head: true }),
                supabase.from('rides').select('id', { count: 'exact', head: true }).eq('status', 'active'),
                supabase.from('rides').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
                supabase.from('rides').select('id', { count: 'exact', head: true }).eq('status', 'cancelled'),
                supabase.from('rides').select('id', { count: 'exact', head: true }).eq('status', 'in-progress'),
            ]);

            setStats({
                total: totalRes.count || 0,
                active: activeRes.count || 0,
                completed: completedRes.count || 0,
                cancelled: cancelledRes.count || 0,
                inProgress: inProgressRes.count || 0,
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchRides();
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

    const handleSelectRide = (rideId: string) => {
        setSelectedRides(prev =>
            prev.includes(rideId)
                ? prev.filter(id => id !== rideId)
                : [...prev, rideId]
        );
    };

    const handleSelectAll = () => {
        if (selectedRides.length === rides.length) {
            setSelectedRides([]);
        } else {
            setSelectedRides(rides.map(r => r.id));
        }
    };

    const handleCopyId = async (id: string) => {
        await navigator.clipboard.writeText(id);
        setCopiedId(id);
        toast.success('Ride ID copied!');
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleCancelRide = async (rideId: string) => {
        if (!cancelReason.trim()) {
            toast.warning('Please provide a reason for cancellation');
            return;
        }

        try {
            const { error } = await supabase.rpc('admin_cancel_ride', {
                p_ride_id: rideId,
                p_reason: cancelReason,
                p_notify_passengers: true,
            });

            if (error) throw error;

            toast.success('Ride cancelled successfully');
            setCancellingRide(null);
            setCancelReason('');
            handleRefresh();
        } catch (error: any) {
            console.error('Error cancelling ride:', error);
            toast.error(error.message || 'Failed to cancel ride');
        }
    };

    const handleDeleteRide = async (rideId: string) => {
        if (!hasRole('super_admin')) {
            toast.error('Only super admins can delete rides');
            return;
        }

        const reason = prompt('Please provide a reason for deletion:');
        if (!reason) return;

        try {
            const { error } = await supabase.rpc('admin_delete_ride', {
                p_ride_id: rideId,
                p_reason: reason,
            });

            if (error) throw error;

            toast.success('Ride deleted permanently');
            setDeletingRide(null);
            handleRefresh();
        } catch (error: any) {
            console.error('Error deleting ride:', error);
            toast.error(error.message || 'Failed to delete ride');
        }
    };

    const handleExportCSV = async () => {
        setExporting(true);
        try {
            const dataToExport = selectedRides.length > 0
                ? rides.filter(r => selectedRides.includes(r.id))
                : rides;

            const csv = [
                'Ride ID,Driver Name,Driver Email,Origin,Destination,Departure Date,Departure Time,Total Seats,Available Seats,Price,Status,Bookings,Notes,Created At',
                ...dataToExport.map(r => [
                    r.id,
                    r.driver?.full_name || 'Unknown',
                    r.driver?.email || '',
                    `"${r.origin}"`,
                    `"${r.destination}"`,
                    new Date(r.departure_time).toLocaleDateString(),
                    new Date(r.departure_time).toLocaleTimeString(),
                    r.total_seats,
                    r.available_seats,
                    r.price_per_seat || 0,
                    r.status,
                    r.bookings_count,
                    `"${r.notes || ''}"`,
                    new Date(r.created_at).toISOString(),
                ].join(','))
            ].join('\n');

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rides-export-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);

            toast.success(`Exported ${dataToExport.length} rides`);
        } catch (error) {
            toast.error('Failed to export rides');
        } finally {
            setExporting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        // CANONICAL ride states: active, in-progress, completed, cancelled
        const badges: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
            active: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="w-3.5 h-3.5" /> },
            completed: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <Check className="w-3.5 h-3.5" /> },
            cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle className="w-3.5 h-3.5" /> },
            'in-progress': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <Clock className="w-3.5 h-3.5" /> },
        };
        const badge = badges[status] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: null };

        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                {badge.icon}
                {status.replace('-', ' ')}
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

    return (
        <AdminLayout
            title="Rides Management"
            subtitle={`${stats.total} total rides · ${stats.active} active`}
            actions={
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportCSV}
                        disabled={exporting}
                        className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        <Download className={`w-4 h-4 ${exporting ? 'animate-pulse' : ''}`} />
                        Export {selectedRides.length > 0 ? `(${selectedRides.length})` : ''}
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <StatCard label="Total Rides" value={stats.total} color="gray" />
                <StatCard label="Active" value={stats.active} color="green" />
                <StatCard label="In Progress" value={stats.inProgress} color="yellow" />
                <StatCard label="Completed" value={stats.completed} color="blue" />
                <StatCard label="Cancelled" value={stats.cancelled} color="red" />
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
                        placeholder="Search by origin or destination..."
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Filters */}
            <RideFilters
                filters={filters}
                onChange={(newFilters) => {
                    setFilters(newFilters);
                    setCurrentPage(1);
                }}
                onClear={() => {
                    setFilters(DEFAULT_RIDE_FILTERS);
                    setCurrentPage(1);
                }}
                isExpanded={filtersExpanded}
                onToggle={() => setFiltersExpanded(!filtersExpanded)}
            />

            {/* Bulk Actions Bar */}
            {selectedRides.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={selectedRides.length === rides.length}
                            onChange={handleSelectAll}
                            className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="font-medium text-blue-900">
                            {selectedRides.length} ride{selectedRides.length !== 1 ? 's' : ''} selected
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
                            onClick={() => setSelectedRides([])}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Clear Selection
                        </button>
                    </div>
                </div>
            )}

            {/* Rides Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        checked={selectedRides.length === rides.length && rides.length > 0}
                                        onChange={handleSelectAll}
                                        className="w-4 h-4 text-blue-600 rounded"
                                    />
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                <th
                                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort('origin')}
                                >
                                    Route
                                    {sortField === 'origin' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                                <th
                                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort('departure_time')}
                                >
                                    Date/Time
                                    {sortField === 'departure_time' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                                </th>
                                <th
                                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort('available_seats')}
                                >
                                    Seats
                                    {sortField === 'available_seats' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bookings</th>
                                <th
                                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort('status')}
                                >
                                    Status
                                    {sortField === 'status' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12 text-center">
                                        <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
                                        <p className="text-gray-500">Loading rides...</p>
                                    </td>
                                </tr>
                            ) : rides.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12 text-center">
                                        <Car className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500 font-medium">No rides found</p>
                                        <p className="text-gray-400 text-sm">Try adjusting your filters</p>
                                    </td>
                                </tr>
                            ) : (
                                rides.map((ride) => {
                                    const dt = formatDateTime(ride.departure_time);
                                    return (
                                        <tr
                                            key={ride.id}
                                            className={`hover:bg-gray-50 transition-colors ${selectedRides.includes(ride.id) ? 'bg-blue-50' : ''}`}
                                        >
                                            {/* Checkbox */}
                                            <td className="px-4 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRides.includes(ride.id)}
                                                    onChange={() => handleSelectRide(ride.id)}
                                                    className="w-4 h-4 text-blue-600 rounded"
                                                />
                                            </td>

                                            {/* ID */}
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs font-mono text-gray-500">
                                                        #{ride.id.slice(0, 8)}
                                                    </span>
                                                    <button
                                                        onClick={() => handleCopyId(ride.id)}
                                                        className="p-1 hover:bg-gray-100 rounded"
                                                    >
                                                        {copiedId === ride.id ? (
                                                            <Check className="w-3 h-3 text-green-500" />
                                                        ) : (
                                                            <Copy className="w-3 h-3 text-gray-400" />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Route */}
                                            <td className="px-4 py-4">
                                                <div className="max-w-[200px]">
                                                    <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                                                        <MapPin className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                                        <span className="truncate">{ride.origin}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                                                        <ArrowRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                        <span className="truncate">{ride.destination}</span>
                                                    </div>
                                                    {ride.is_recurring && (
                                                        <div className="flex items-center gap-1 text-xs text-purple-600 mt-1">
                                                            <Repeat className="w-3 h-3" />
                                                            Recurring
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Driver */}
                                            <td className="px-4 py-4">
                                                <QuickUserCard
                                                    user={{
                                                        id: ride.driver?.id || '',
                                                        full_name: ride.driver?.full_name || 'Unknown',
                                                        email: ride.driver?.email || '',
                                                        avatar_url: ride.driver?.avatar_url,
                                                    }}
                                                    role="driver"
                                                    compact
                                                    showActions={false}
                                                />
                                            </td>

                                            {/* Date/Time */}
                                            <td className="px-4 py-4">
                                                <div className="text-sm">
                                                    <div className="flex items-center gap-1 text-gray-900">
                                                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                        {dt.date}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-gray-500">
                                                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                        {dt.time}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Seats */}
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-4 h-4 text-gray-400" />
                                                    <div>
                                                        <span className="font-medium text-gray-900">{ride.available_seats}</span>
                                                        <span className="text-gray-400">/{ride.total_seats}</span>
                                                    </div>
                                                </div>
                                                <div className="w-16 h-1.5 bg-gray-200 rounded-full mt-1">
                                                    <div
                                                        className="h-full bg-blue-500 rounded-full"
                                                        style={{ width: `${((ride.total_seats - ride.available_seats) / ride.total_seats) * 100}%` }}
                                                    />
                                                </div>
                                            </td>

                                            {/* Bookings */}
                                            <td className="px-4 py-4">
                                                <div className="text-sm">
                                                    <span className="font-medium text-gray-900">{ride.bookings_count}</span>
                                                    <span className="text-gray-400 ml-1">total</span>
                                                </div>
                                                {(ride.pending_bookings > 0 || ride.confirmed_bookings > 0) && (
                                                    <div className="flex items-center gap-2 text-xs mt-0.5">
                                                        {ride.confirmed_bookings > 0 && (
                                                            <span className="text-green-600">{ride.confirmed_bookings} ✓</span>
                                                        )}
                                                        {ride.pending_bookings > 0 && (
                                                            <span className="text-orange-600">{ride.pending_bookings} ⏳</span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-4">
                                                {getStatusBadge(ride.status)}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-4">
                                                <div className="relative flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => navigate(`/admin/rides/${ride.id}`)}
                                                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => navigate(`/admin/rides/${ride.id}?edit=true`)}
                                                        className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                        title="Edit Ride"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => setActionMenuOpen(actionMenuOpen === ride.id ? null : ride.id)}
                                                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                                        >
                                                            <MoreVertical className="w-4 h-4" />
                                                        </button>

                                                        {/* Dropdown Menu */}
                                                        {actionMenuOpen === ride.id && (
                                                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                                                                <button
                                                                    onClick={() => {
                                                                        navigate(`/admin/bookings?rideId=${ride.id}`);
                                                                        setActionMenuOpen(null);
                                                                    }}
                                                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                                >
                                                                    <Calendar className="w-4 h-4" />
                                                                    View Bookings ({ride.bookings_count})
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        navigate(`/profile/${ride.driver_id}`);
                                                                        setActionMenuOpen(null);
                                                                    }}
                                                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                                >
                                                                    <ExternalLink className="w-4 h-4" />
                                                                    View Driver Profile
                                                                </button>
                                                                <hr className="my-1" />
                                                                {ride.status === 'active' && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setCancellingRide(ride.id);
                                                                            setActionMenuOpen(null);
                                                                        }}
                                                                        className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2"
                                                                    >
                                                                        <XCircle className="w-4 h-4" />
                                                                        Cancel Ride
                                                                    </button>
                                                                )}
                                                                {hasRole('super_admin') && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setDeletingRide(ride.id);
                                                                            setActionMenuOpen(null);
                                                                        }}
                                                                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                        Delete Ride
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
                {!loading && rides.length > 0 && (
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
                            <span>of {totalCount} rides</span>
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
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Cancel Modal */}
            {cancellingRide && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-orange-100 rounded-full">
                                <AlertTriangle className="w-6 h-6 text-orange-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Cancel Ride</h3>
                                <p className="text-sm text-gray-500">This will notify all passengers</p>
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
                                    setCancellingRide(null);
                                    setCancelReason('');
                                }}
                                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleCancelRide(cancellingRide)}
                                className="flex-1 px-4 py-2 text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
                            >
                                Confirm Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deletingRide && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-red-100 rounded-full">
                                <Trash2 className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Delete Ride Permanently</h3>
                                <p className="text-sm text-gray-500">This action cannot be undone</p>
                            </div>
                        </div>
                        <p className="text-gray-600 mb-4">
                            Are you sure you want to permanently delete this ride? All associated bookings will also be deleted.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeletingRide(null)}
                                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteRide(deletingRide)}
                                className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Delete Permanently
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

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    const colors: Record<string, string> = {
        gray: 'bg-gray-100 text-gray-600 border-gray-200',
        green: 'bg-green-100 text-green-600 border-green-200',
        blue: 'bg-blue-100 text-blue-600 border-blue-200',
        yellow: 'bg-yellow-100 text-yellow-600 border-yellow-200',
        red: 'bg-red-100 text-red-600 border-red-200',
    };

    return (
        <div className={`rounded-xl border p-4 ${colors[color]}`}>
            <p className="text-sm font-medium opacity-80">{label}</p>
            <p className="text-2xl font-bold">{value.toLocaleString()}</p>
        </div>
    );
}
