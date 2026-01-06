import { useState, useEffect } from 'react';
import { Leaf, TreeDeciduous, Car, Droplet, Wind, TrendingUp, Award, Share2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface EnvironmentalStats {
    totalRides: number;
    totalDistanceKm: number;
    co2SavedKg: number;
    treesEquivalent: number;
    fuelSavedLiters: number;
    carbonOffset: number;
    monthlyTrend: number;
}

interface ImpactMilestone {
    id: string;
    name: string;
    icon: React.ElementType;
    threshold: number;
    unit: string;
    achieved: boolean;
    progress: number;
}

export default function EnvironmentalImpact() {
    const { user } = useAuth();
    const [stats, setStats] = useState<EnvironmentalStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [shareMessage, setShareMessage] = useState('');

    // Constants for calculations
    const CO2_PER_KM_SAVED = 0.12; // kg CO2 per km when carpooling vs driving alone
    const TREE_ABSORBS_KG_PER_YEAR = 21; // kg CO2 absorbed by one tree annually
    const FUEL_PER_KM = 0.08; // liters per km average car consumption

    useEffect(() => {
        if (user) {
            loadStats();
        }
    }, [user]);

    const loadStats = async () => {
        if (!user) return;

        try {
            // Get rides as driver
            const { data: driverRides } = await supabase
                .from('rides')
                .select('distance_km, departure_time')
                .eq('driver_id', user.id)
                .eq('status', 'completed');

            // Get rides as passenger (through bookings)
            const { data: passengerBookings } = await supabase
                .from('ride_bookings')
                .select(`
          id,
          ride:rides!inner(distance_km, departure_time)
        `)
                .eq('passenger_id', user.id)
                .eq('status', 'completed');

            // Calculate total distance
            const driverDistance = (driverRides || []).reduce((sum, r) => sum + (r.distance_km || 10), 0);
            const passengerDistance = (passengerBookings || []).reduce(
                (sum: number, b: any) => sum + (b.ride?.distance_km || 10),
                0
            );
            const totalDistance = driverDistance + passengerDistance;

            // Calculate environmental impact
            const co2Saved = totalDistance * CO2_PER_KM_SAVED;
            const treesEquivalent = co2Saved / TREE_ABSORBS_KG_PER_YEAR;
            const fuelSaved = totalDistance * FUEL_PER_KM;

            // Calculate monthly trend (last 30 days vs previous 30 days)
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

            const recentRides = [...(driverRides || []), ...(passengerBookings || []).map((b: any) => b.ride)]
                .filter(r => r && new Date(r.departure_time) > thirtyDaysAgo);
            const previousRides = [...(driverRides || []), ...(passengerBookings || []).map((b: any) => b.ride)]
                .filter(r => r && new Date(r.departure_time) > sixtyDaysAgo && new Date(r.departure_time) <= thirtyDaysAgo);

            const recentDistance = recentRides.reduce((sum, r) => sum + (r?.distance_km || 10), 0);
            const previousDistance = previousRides.reduce((sum, r) => sum + (r?.distance_km || 10), 0);
            const trend = previousDistance > 0 ? ((recentDistance - previousDistance) / previousDistance) * 100 : 0;

            const totalRides = (driverRides?.length || 0) + (passengerBookings?.length || 0);

            setStats({
                totalRides,
                totalDistanceKm: totalDistance,
                co2SavedKg: co2Saved,
                treesEquivalent,
                fuelSavedLiters: fuelSaved,
                carbonOffset: co2Saved * 0.02, // Estimated cost to offset
                monthlyTrend: trend,
            });
        } catch (error) {
            console.error('Error loading environmental stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const getMilestones = (): ImpactMilestone[] => {
        if (!stats) return [];

        return [
            {
                id: 'co2_10',
                name: 'Eco Starter',
                icon: Leaf,
                threshold: 10,
                unit: 'kg CO₂',
                achieved: stats.co2SavedKg >= 10,
                progress: Math.min(100, (stats.co2SavedKg / 10) * 100),
            },
            {
                id: 'co2_50',
                name: 'Green Commuter',
                icon: Leaf,
                threshold: 50,
                unit: 'kg CO₂',
                achieved: stats.co2SavedKg >= 50,
                progress: Math.min(100, (stats.co2SavedKg / 50) * 100),
            },
            {
                id: 'co2_100',
                name: 'Climate Champion',
                icon: TreeDeciduous,
                threshold: 100,
                unit: 'kg CO₂',
                achieved: stats.co2SavedKg >= 100,
                progress: Math.min(100, (stats.co2SavedKg / 100) * 100),
            },
            {
                id: 'co2_500',
                name: 'Earth Guardian',
                icon: Award,
                threshold: 500,
                unit: 'kg CO₂',
                achieved: stats.co2SavedKg >= 500,
                progress: Math.min(100, (stats.co2SavedKg / 500) * 100),
            },
            {
                id: 'trees_1',
                name: 'Tree Saver',
                icon: TreeDeciduous,
                threshold: 1,
                unit: 'trees',
                achieved: stats.treesEquivalent >= 1,
                progress: Math.min(100, (stats.treesEquivalent / 1) * 100),
            },
            {
                id: 'fuel_50',
                name: 'Fuel Saver',
                icon: Droplet,
                threshold: 50,
                unit: 'liters',
                achieved: stats.fuelSavedLiters >= 50,
                progress: Math.min(100, (stats.fuelSavedLiters / 50) * 100),
            },
        ];
    };

    const handleShare = async () => {
        if (!stats) return;

        const message = `🌱 I've saved ${stats.co2SavedKg.toFixed(1)}kg of CO₂ by carpooling! That's equivalent to planting ${stats.treesEquivalent.toFixed(1)} trees. Join me in making a difference! #Carpooling #ClimateAction`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'My Carpooling Impact',
                    text: message,
                });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            navigator.clipboard.writeText(message);
            setShareMessage('Copied to clipboard!');
            setTimeout(() => setShareMessage(''), 2000);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="bg-gray-50 rounded-xl p-8 text-center">
                <Leaf className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Start Your Green Journey</h3>
                <p className="text-gray-600">Complete rides to see your environmental impact!</p>
            </div>
        );
    }

    const milestones = getMilestones();
    const achievedCount = milestones.filter(m => m.achieved).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Environmental Impact</h2>
                    <p className="text-gray-600">Your contribution to a greener planet</p>
                </div>
                <button
                    onClick={handleShare}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    <Share2 className="w-4 h-4" />
                    Share Impact
                </button>
            </div>
            {shareMessage && (
                <p className="text-sm text-green-600">{shareMessage}</p>
            )}

            {/* Main Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <Leaf className="w-5 h-5" />
                        <span className="text-sm opacity-90">CO₂ Saved</span>
                    </div>
                    <p className="text-3xl font-bold">{stats.co2SavedKg.toFixed(1)}</p>
                    <p className="text-sm opacity-75">kilograms</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <TreeDeciduous className="w-5 h-5" />
                        <span className="text-sm opacity-90">Trees Equivalent</span>
                    </div>
                    <p className="text-3xl font-bold">{stats.treesEquivalent.toFixed(1)}</p>
                    <p className="text-sm opacity-75">planted</p>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <Droplet className="w-5 h-5" />
                        <span className="text-sm opacity-90">Fuel Saved</span>
                    </div>
                    <p className="text-3xl font-bold">{stats.fuelSavedLiters.toFixed(1)}</p>
                    <p className="text-sm opacity-75">liters</p>
                </div>

                <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <Car className="w-5 h-5" />
                        <span className="text-sm opacity-90">Total Distance</span>
                    </div>
                    <p className="text-3xl font-bold">{stats.totalDistanceKm.toFixed(0)}</p>
                    <p className="text-sm opacity-75">km shared</p>
                </div>
            </div>

            {/* Monthly Trend */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Monthly Impact Trend</h3>
                    <div className={`flex items-center gap-1 ${stats.monthlyTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        <TrendingUp className={`w-4 h-4 ${stats.monthlyTrend < 0 ? 'rotate-180' : ''}`} />
                        <span className="font-medium">{Math.abs(stats.monthlyTrend).toFixed(0)}%</span>
                    </div>
                </div>
                <p className="text-gray-600 text-sm">
                    {stats.monthlyTrend >= 0
                        ? `You've increased your eco-friendly commuting by ${stats.monthlyTrend.toFixed(0)}% compared to last month!`
                        : `Your carpooling decreased by ${Math.abs(stats.monthlyTrend).toFixed(0)}% compared to last month. Keep up the green habits!`
                    }
                </p>
            </div>

            {/* Eco Milestones */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Eco Milestones</h3>
                    <span className="text-sm text-gray-500">{achievedCount}/{milestones.length} achieved</span>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    {milestones.map((milestone) => {
                        const Icon = milestone.icon;
                        return (
                            <div
                                key={milestone.id}
                                className={`p-4 rounded-lg border ${milestone.achieved
                                        ? 'bg-green-50 border-green-200'
                                        : 'bg-gray-50 border-gray-200'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${milestone.achieved ? 'bg-green-500' : 'bg-gray-300'
                                        }`}>
                                        <Icon className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <p className={`font-medium ${milestone.achieved ? 'text-green-900' : 'text-gray-700'}`}>
                                            {milestone.name}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {milestone.threshold} {milestone.unit} saved
                                        </p>
                                    </div>
                                    {milestone.achieved && (
                                        <span className="text-green-600 text-sm font-medium">✓</span>
                                    )}
                                </div>
                                {!milestone.achieved && (
                                    <div className="mt-3">
                                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                            <span>Progress</span>
                                            <span>{milestone.progress.toFixed(0)}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-green-500 rounded-full transition-all duration-500"
                                                style={{ width: `${milestone.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Impact Visualization */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                <h3 className="font-semibold text-green-900 mb-4">Your Impact Visualized</h3>
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Wind className="w-8 h-8 text-green-600" />
                        <div>
                            <p className="font-medium text-green-900">Clean Air Contribution</p>
                            <p className="text-sm text-green-700">
                                Your {stats.co2SavedKg.toFixed(1)}kg of CO₂ saved is like removing a car from the road for {(stats.co2SavedKg / 4.6).toFixed(1)} days!
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <TreeDeciduous className="w-8 h-8 text-green-600" />
                        <div>
                            <p className="font-medium text-green-900">Forest Equivalent</p>
                            <p className="text-sm text-green-700">
                                You've saved the same CO₂ that {stats.treesEquivalent.toFixed(1)} mature trees would absorb in a year!
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Droplet className="w-8 h-8 text-blue-600" />
                        <div>
                            <p className="font-medium text-green-900">Fuel Conservation</p>
                            <p className="text-sm text-green-700">
                                You've saved approximately ${(stats.fuelSavedLiters * 1.5).toFixed(0)} in fuel costs!
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
