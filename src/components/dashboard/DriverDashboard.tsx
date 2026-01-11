import { useState, useEffect } from 'react';
import {
    Car,
    Users,
    Star,
    DollarSign,
    TrendingUp,
    Calendar,
    Clock,
    MapPin,
    Target,
    Award,
    Leaf,
    ChevronRight,
    AlertCircle,
    CheckCircle2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MatchScoreBadge } from '../rides/MatchScoreDisplay';
import ClickableUserProfile from '../shared/ClickableUserProfile';

interface DriverStats {
    totalRides: number;
    totalPassengers: number;
    averageRating: number;
    totalEarnings: number;
    totalDistance: number;
    co2Saved: number;
    completionRate: number;
    onTimeRate: number;
}

interface UpcomingRide {
    id: string;
    origin: string;
    destination: string;
    departure_time: string;
    available_seats: number;
    booked_count: number;
    price_per_seat: number;
    status: string;
}

interface PendingBooking {
    id: string;
    ride_id: string;
    passenger_name: string;
    passenger_avatar: string | null;
    passenger_id: string;
    pickup_location: string;
    seats_requested: number;
    created_at: string;
}

interface PendingMatch {
    id: string;
    ride_id: string;
    passenger_name: string;
    passenger_id: string;
    match_score: number;
    pickup_location: string;
    dropoff_location: string;
}

export default function DriverDashboard() {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<DriverStats | null>(null);
    const [upcomingRides, setUpcomingRides] = useState<UpcomingRide[]>([]);
    const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([]);
    const [pendingMatches, setPendingMatches] = useState<PendingMatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'rides' | 'matches'>('overview');

    useEffect(() => {
        if (user) {
            loadDashboardData();
        }
    }, [user]);

    const loadDashboardData = async () => {
        if (!user) return;
        setLoading(true);

        try {
            // Load stats
            const [ridesData, reviewsData] = await Promise.all([
                supabase
                    .from('rides')
                    .select('id, status, price_per_seat, distance_km')
                    .eq('driver_id', user.id),
                supabase
                    .from('ride_reviews_detailed')
                    .select('overall_rating')
                    .eq('reviewee_id', user.id),
            ]);

            const rides = ridesData.data || [];
            const reviews = reviewsData.data || [];

            // Get booking counts
            const { data: bookingsData } = await supabase
                .from('ride_bookings')
                .select('id, seats_requested, status, ride:rides!inner(driver_id)')
                .eq('rides.driver_id', user.id);

            const bookings = bookingsData || [];
            const completedBookings = bookings.filter((b: any) => b.status === 'completed');
            const totalPassengers = completedBookings.reduce((sum: number, b: any) => sum + (b.seats_requested || 1), 0);
            const totalEarnings = rides
                .filter(r => r.status === 'completed')
                .reduce((sum, r) => sum + (r.price_per_seat || 0), 0);

            const totalDistance = rides.reduce((sum, r) => sum + (r.distance_km || 0), 0);
            const avgRating = reviews.length > 0
                ? reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviews.length
                : 0;

            setStats({
                totalRides: rides.filter(r => r.status === 'completed').length,
                totalPassengers,
                averageRating: avgRating,
                totalEarnings,
                totalDistance,
                co2Saved: totalDistance * 0.12, // ~120g CO2 per km saved per passenger
                completionRate: rides.length > 0
                    ? (rides.filter(r => r.status === 'completed').length / rides.length) * 100
                    : 0,
                onTimeRate: 95, // Placeholder - would need actual tracking data
            });

            // Load upcoming rides
            const { data: upcoming } = await supabase
                .from('rides')
                .select(`
          id,
          origin,
          destination,
          departure_time,
          available_seats,
          price_per_seat,
          status,
          ride_bookings(id, status)
        `)
                .eq('driver_id', user.id)
                .in('status', ['active', 'scheduled'])
                .gte('departure_time', new Date().toISOString())
                .order('departure_time', { ascending: true })
                .limit(5);

            setUpcomingRides(
                (upcoming || []).map((r: any) => ({
                    ...r,
                    booked_count: r.ride_bookings?.filter((b: any) => b.status === 'confirmed').length || 0,
                }))
            );

            // Load pending bookings
            const { data: pending } = await supabase
                .from('ride_bookings')
                .select(`
          id,
          ride_id,
          pickup_location,
          seats_requested,
          created_at,
          passenger:profiles!ride_bookings_passenger_id_fkey(id, full_name, avatar_url, profile_photo_url)
        `)
                .eq('status', 'pending')
                .in('ride_id', (upcoming || []).map((r: any) => r.id));

            setPendingBookings(
                (pending || []).map((b: any) => ({
                    id: b.id,
                    ride_id: b.ride_id,
                    passenger_name: b.passenger?.full_name || 'Unknown',
                    passenger_avatar: b.passenger?.profile_photo_url || b.passenger?.avatar_url,
                    passenger_id: b.passenger?.id,
                    pickup_location: b.pickup_location,
                    seats_requested: b.seats_requested,
                    created_at: b.created_at,
                }))
            );

            // Load potential matches
            const { data: matches } = await supabase
                .from('trip_requests_matches')
                .select(`
          id,
          ride_id,
          match_score,
          trip_request:trip_requests!inner(
            rider_id,
            origin,
            destination,
            rider:profiles!trip_requests_rider_id_fkey(full_name)
          )
        `)
                .eq('status', 'pending')
                .in('ride_id', (upcoming || []).map((r: any) => r.id))
                .order('match_score', { ascending: false })
                .limit(10);

            setPendingMatches(
                (matches || []).map((m: any) => ({
                    id: m.id,
                    ride_id: m.ride_id,
                    passenger_name: m.trip_request?.rider?.full_name || 'Unknown',
                    passenger_id: m.trip_request?.rider_id,
                    match_score: m.match_score,
                    pickup_location: m.trip_request?.origin || '',
                    dropoff_location: m.trip_request?.destination || '',
                }))
            );
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApproveBooking = async (bookingId: string) => {
        try {
            const { error } = await supabase
                .from('ride_bookings')
                .update({ status: 'confirmed' })
                .eq('id', bookingId);

            if (error) throw error;
            loadDashboardData();
        } catch (error) {
            console.error('Error approving booking:', error);
        }
    };

    const handleRejectBooking = async (bookingId: string) => {
        try {
            // CANONICAL: Use 'cancelled' status with cancellation_reason indicating driver declined
            const { error } = await supabase
                .from('ride_bookings')
                .update({
                    status: 'cancelled',
                    cancellation_reason: 'Declined by driver',
                    cancelled_at: new Date().toISOString(),
                })
                .eq('id', bookingId);

            if (error) throw error;
            loadDashboardData();
        } catch (error) {
            console.error('Error rejecting booking:', error);
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
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Driver Dashboard</h2>
                    <p className="text-gray-600">Manage your rides and bookings</p>
                </div>
                <button
                    onClick={() => navigate('/post-ride')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <Car className="w-4 h-4" />
                    Post New Ride
                </button>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Car className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{stats.totalRides}</p>
                                <p className="text-sm text-gray-500">Total Rides</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <Users className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{stats.totalPassengers}</p>
                                <p className="text-sm text-gray-500">Passengers</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                                <Star className="w-5 h-5 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{stats.averageRating.toFixed(1)}</p>
                                <p className="text-sm text-gray-500">Avg Rating</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Leaf className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{stats.co2Saved.toFixed(0)}</p>
                                <p className="text-sm text-gray-500">kg CO₂ Saved</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Pending Actions Alert */}
            {(pendingBookings.length > 0 || pendingMatches.length > 0) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-amber-900">Actions Required</p>
                            <p className="text-sm text-amber-700">
                                You have {pendingBookings.length} pending booking(s) and {pendingMatches.length} potential match(es) waiting for your response.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                {(['overview', 'rides', 'matches'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 -mb-px ${activeTab === tab
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        {tab === 'overview' && 'Overview'}
                        {tab === 'rides' && `Upcoming Rides (${upcomingRides.length})`}
                        {tab === 'matches' && `Matches (${pendingMatches.length})`}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Pending Bookings */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-200">
                            <h3 className="font-semibold text-gray-900">Pending Bookings</h3>
                        </div>
                        {pendingBookings.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">
                                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                <p>No pending bookings</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {pendingBookings.map(booking => (
                                    <div key={booking.id} className="p-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <ClickableUserProfile
                                                    user={{
                                                        id: booking.passenger_id,
                                                        full_name: booking.passenger_name,
                                                        avatar_url: booking.passenger_avatar,
                                                    }}
                                                    size="sm"
                                                />
                                                <div>
                                                    <p className="font-medium text-gray-900">{booking.passenger_name}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {booking.seats_requested} seat(s) • {booking.pickup_location}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleRejectBooking(booking.id)}
                                                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => handleApproveBooking(booking.id)}
                                                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                                >
                                                    Approve
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Next Rides */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-200">
                            <h3 className="font-semibold text-gray-900">Upcoming Rides</h3>
                        </div>
                        {upcomingRides.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">
                                <Car className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                <p>No upcoming rides</p>
                                <button
                                    onClick={() => navigate('/post-ride')}
                                    className="mt-2 text-blue-600 hover:underline text-sm"
                                >
                                    Post a ride →
                                </button>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {upcomingRides.slice(0, 3).map(ride => (
                                    <div
                                        key={ride.id}
                                        onClick={() => navigate(`/rides/${ride.id}`)}
                                        className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {ride.origin} → {ride.destination}
                                                </p>
                                                <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(ride.departure_time).toLocaleDateString()}
                                                    <Clock className="w-3 h-3 ml-2" />
                                                    {new Date(ride.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-medium text-blue-600">
                                                    {ride.booked_count}/{ride.available_seats} seats
                                                </p>
                                                <ChevronRight className="w-4 h-4 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'rides' && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {upcomingRides.length === 0 ? (
                        <div className="p-8 text-center">
                            <Car className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                            <h3 className="text-lg font-medium text-gray-900 mb-1">No Upcoming Rides</h3>
                            <p className="text-gray-600 mb-4">Post a ride to start accepting passengers</p>
                            <button
                                onClick={() => navigate('/post-ride')}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Post a Ride
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {upcomingRides.map(ride => (
                                <div
                                    key={ride.id}
                                    onClick={() => navigate(`/rides/${ride.id}`)}
                                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {ride.origin} → {ride.destination}
                                            </p>
                                            <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(ride.departure_time).toLocaleDateString()}
                                                <Clock className="w-3 h-3 ml-2" />
                                                {new Date(ride.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium">
                                                {ride.booked_count}/{ride.available_seats} booked
                                            </p>
                                            <p className="text-sm text-gray-500">${ride.price_per_seat}/seat</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'matches' && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {pendingMatches.length === 0 ? (
                        <div className="p-8 text-center">
                            <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                            <h3 className="text-lg font-medium text-gray-900 mb-1">No Potential Matches</h3>
                            <p className="text-gray-600">When passengers request rides that match your routes, they'll appear here</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {pendingMatches.map(match => (
                                <div key={match.id} className="p-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-medium text-gray-900">{match.passenger_name}</p>
                                                <MatchScoreBadge score={match.match_score} />
                                            </div>
                                            <p className="text-sm text-gray-500">
                                                <MapPin className="w-3 h-3 inline mr-1" />
                                                {match.pickup_location} → {match.dropoff_location}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/rides/${match.ride_id}?match=${match.id}`)}
                                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            View Match
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
