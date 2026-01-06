import { useState, useEffect, useMemo } from 'react';
import {
    TrendingUp,
    TrendingDown,
    Car,
    User,
    Clock,
    MapPin,
    Leaf,
    PoundSterling,
    Calendar,
    Award,
    Star,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface StatsData {
    totalRides: number;
    ridesAsDriver: number;
    ridesAsPassenger: number;
    totalDistance: number;
    totalTime: number;
    co2Saved: number;
    moneySaved: number;
    averageRating: number;
    uniquePartners: number;
    completionRate: number;
    thisMonth: {
        rides: number;
        distance: number;
        savings: number;
    };
    lastMonth: {
        rides: number;
        distance: number;
        savings: number;
    };
}

export function PersonalStats() {
    const { user } = useAuth();
    const [stats, setStats] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadStats();
        }
    }, [user]);

    const loadStats = async () => {
        if (!user) return;

        try {
            setLoading(true);

            // Get profile stats
            const { data: profile } = await supabase
                .from('profiles')
                .select('average_rating, reliability_score, total_rides, total_distance')
                .eq('id', user.id)
                .single();

            // Get rides as driver
            const { data: driverRides } = await supabase
                .from('rides')
                .select('id, status, departure_time, distance_km, duration_minutes')
                .eq('driver_id', user.id);

            // Get bookings as passenger
            const { data: passengerBookings } = await supabase
                .from('ride_bookings')
                .select(`
          id, 
          status, 
          created_at,
          ride:rides(departure_time, distance_km, driver_id)
        `)
                .eq('passenger_id', user.id);

            // Calculate stats
            const completedDriverRides = driverRides?.filter(r => r.status === 'completed') || [];
            const completedPassengerRides = passengerBookings?.filter(b => b.status === 'completed') || [];

            const totalRides = completedDriverRides.length + completedPassengerRides.length;
            const totalDistance = profile?.total_distance ||
                completedDriverRides.reduce((sum, r) => sum + (r.distance_km || 0), 0);
            const totalTime = completedDriverRides.reduce((sum, r) => sum + (r.duration_minutes || 0), 0);

            // Get unique carpool partners
            const driverIds = new Set(
                completedPassengerRides
                    .map(b => (b.ride as any)?.driver_id)
                    .filter(Boolean)
            );
            const { data: passengerIds } = await supabase
                .from('ride_bookings')
                .select('passenger_id')
                .in('ride_id', completedDriverRides.map(r => r.id))
                .eq('status', 'completed');
            const uniquePartners = driverIds.size + new Set(passengerIds?.map(p => p.passenger_id)).size;

            // Calculate monthly stats
            const now = new Date();
            const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

            const thisMonthRides = [...completedDriverRides, ...completedPassengerRides].filter(r => {
                const date = new Date((r as any).departure_time || (r as any).created_at);
                return date >= thisMonthStart;
            });

            const lastMonthRides = [...completedDriverRides, ...completedPassengerRides].filter(r => {
                const date = new Date((r as any).departure_time || (r as any).created_at);
                return date >= lastMonthStart && date <= lastMonthEnd;
            });

            // CO2 savings calculation (average car emits ~120g CO2/km, shared = saved)
            const co2Saved = totalDistance * 0.12; // kg

            // Money saved calculation (average fuel cost ~£0.15/km saved per person)
            const moneySaved = totalDistance * 0.15;

            // Completion rate
            const totalAttempted = (driverRides?.length || 0) + (passengerBookings?.length || 0);
            const completionRate = totalAttempted > 0
                ? (totalRides / totalAttempted) * 100
                : 100;

            setStats({
                totalRides,
                ridesAsDriver: completedDriverRides.length,
                ridesAsPassenger: completedPassengerRides.length,
                totalDistance,
                totalTime,
                co2Saved,
                moneySaved,
                averageRating: profile?.average_rating || 0,
                uniquePartners,
                completionRate,
                thisMonth: {
                    rides: thisMonthRides.length,
                    distance: thisMonthRides.reduce((sum, r) => sum + ((r as any).distance_km || 0), 0),
                    savings: thisMonthRides.length * 5, // Estimated savings
                },
                lastMonth: {
                    rides: lastMonthRides.length,
                    distance: lastMonthRides.reduce((sum, r) => sum + ((r as any).distance_km || 0), 0),
                    savings: lastMonthRides.length * 5,
                },
            });
        } catch (err) {
            console.error('Error loading stats:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    if (!stats) {
        return null;
    }

    const ridesChange = stats.lastMonth.rides > 0
        ? ((stats.thisMonth.rides - stats.lastMonth.rides) / stats.lastMonth.rides) * 100
        : stats.thisMonth.rides > 0 ? 100 : 0;

    return (
        <div className="space-y-6">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard
                    icon={Car}
                    label="Total Rides"
                    value={stats.totalRides}
                    color="blue"
                />
                <StatCard
                    icon={MapPin}
                    label="Distance"
                    value={`${Math.round(stats.totalDistance)} km`}
                    color="purple"
                />
                <StatCard
                    icon={Leaf}
                    label="CO₂ Saved"
                    value={`${Math.round(stats.co2Saved)} kg`}
                    color="green"
                />
                <StatCard
                    icon={PoundSterling}
                    label="Money Saved"
                    value={`£${Math.round(stats.moneySaved)}`}
                    color="yellow"
                />
            </div>

            {/* This Month Summary */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">This Month</h3>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm ${ridesChange >= 0 ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'
                        }`}>
                        {ridesChange >= 0 ? (
                            <TrendingUp className="h-4 w-4" />
                        ) : (
                            <TrendingDown className="h-4 w-4" />
                        )}
                        <span>{Math.abs(ridesChange).toFixed(0)}%</span>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-3xl font-bold">{stats.thisMonth.rides}</p>
                        <p className="text-sm text-blue-200">Rides</p>
                    </div>
                    <div>
                        <p className="text-3xl font-bold">{Math.round(stats.thisMonth.distance)}</p>
                        <p className="text-sm text-blue-200">km traveled</p>
                    </div>
                    <div>
                        <p className="text-3xl font-bold">£{Math.round(stats.thisMonth.savings)}</p>
                        <p className="text-sm text-blue-200">Saved</p>
                    </div>
                </div>
            </div>

            {/* Detailed Stats */}
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="bg-white border rounded-xl p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <Car className="h-5 w-5 text-blue-600" />
                        Ride Breakdown
                    </h4>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">As Driver</span>
                            <span className="font-semibold">{stats.ridesAsDriver} rides</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">As Passenger</span>
                            <span className="font-semibold">{stats.ridesAsPassenger} rides</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden flex">
                            <div
                                className="h-full bg-blue-500"
                                style={{
                                    width: `${(stats.ridesAsDriver / Math.max(stats.totalRides, 1)) * 100}%`,
                                }}
                            />
                            <div
                                className="h-full bg-green-500"
                                style={{
                                    width: `${(stats.ridesAsPassenger / Math.max(stats.totalRides, 1)) * 100}%`,
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white border rounded-xl p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <Star className="h-5 w-5 text-yellow-500" />
                        Reputation
                    </h4>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">Average Rating</span>
                            <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                <span className="font-semibold">{stats.averageRating.toFixed(1)}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">Completion Rate</span>
                            <span className="font-semibold">{stats.completionRate.toFixed(0)}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">Carpool Partners</span>
                            <span className="font-semibold">{stats.uniquePartners}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Environmental Impact */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                <h4 className="font-medium text-green-900 mb-3 flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-green-600" />
                    Your Environmental Impact
                </h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-2xl font-bold text-green-700">{Math.round(stats.co2Saved)}</p>
                        <p className="text-xs text-green-600">kg CO₂ saved</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-green-700">{Math.round(stats.co2Saved / 21)}</p>
                        <p className="text-xs text-green-600">Trees equivalent</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-green-700">{Math.round(stats.totalDistance * 0.06)}</p>
                        <p className="text-xs text-green-600">Litres fuel saved</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface StatCardProps {
    icon: React.ComponentType<any>;
    label: string;
    value: string | number;
    color: 'blue' | 'green' | 'purple' | 'yellow';
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
    const colors = {
        blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
        green: { bg: 'bg-green-100', text: 'text-green-600' },
        purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
        yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600' },
    };

    return (
        <div className="bg-white border rounded-xl p-4">
            <div className={`w-10 h-10 ${colors[color].bg} rounded-lg flex items-center justify-center mb-3`}>
                <Icon className={`h-5 w-5 ${colors[color].text}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
        </div>
    );
}
