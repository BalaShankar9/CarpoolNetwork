import React, { useState, useEffect } from 'react';
import {
    Users,
    Car,
    Leaf,
    TrendingUp,
    Award,
    Clock,
    MapPin,
    Zap
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CommunityStats {
    totalMembers: number;
    totalRides: number;
    totalCO2Saved: number;
    totalDistance: number;
    activeDrivers: number;
    ridesThisMonth: number;
    newMembersThisMonth: number;
    topCities: { city: string; count: number }[];
}

interface CommunityStatsProps {
    className?: string;
}

export const CommunityStats: React.FC<CommunityStatsProps> = ({ className = '' }) => {
    const [stats, setStats] = useState<CommunityStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            try {
                // Get total members
                const { count: totalMembers } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true });

                // Get total rides
                const { count: totalRides } = await supabase
                    .from('rides')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'completed');

                // Get rides this month
                const startOfMonth = new Date();
                startOfMonth.setDate(1);
                startOfMonth.setHours(0, 0, 0, 0);

                const { count: ridesThisMonth } = await supabase
                    .from('rides')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', startOfMonth.toISOString());

                // Get new members this month
                const { count: newMembersThisMonth } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', startOfMonth.toISOString());

                // Calculate estimates
                const estimatedDistance = (totalRides || 0) * 25; // Avg 25km per ride
                const estimatedCO2 = Math.round(estimatedDistance * 0.12); // ~120g CO2/km saved

                // Active drivers (had a ride in last 30 days)
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                const { data: activeDriverData } = await supabase
                    .from('rides')
                    .select('driver_id')
                    .gte('created_at', thirtyDaysAgo.toISOString());

                const uniqueDrivers = new Set(activeDriverData?.map(d => d.driver_id) || []);

                setStats({
                    totalMembers: totalMembers || 0,
                    totalRides: totalRides || 0,
                    totalCO2Saved: estimatedCO2,
                    totalDistance: estimatedDistance,
                    activeDrivers: uniqueDrivers.size,
                    ridesThisMonth: ridesThisMonth || 0,
                    newMembersThisMonth: newMembersThisMonth || 0,
                    topCities: [], // Would need location data
                });
            } catch (err) {
                console.error('Failed to load community stats:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadStats();
    }, []);

    if (isLoading) {
        return (
            <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 animate-pulse">
                        <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full mb-3" />
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                    </div>
                ))}
            </div>
        );
    }

    if (!stats) return null;

    const statCards = [
        {
            label: 'Community Members',
            value: stats.totalMembers.toLocaleString(),
            icon: Users,
            color: 'blue',
            subtext: `+${stats.newMembersThisMonth} this month`,
        },
        {
            label: 'Rides Completed',
            value: stats.totalRides.toLocaleString(),
            icon: Car,
            color: 'green',
            subtext: `${stats.ridesThisMonth} this month`,
        },
        {
            label: 'CO₂ Saved',
            value: `${(stats.totalCO2Saved / 1000).toFixed(1)}t`,
            icon: Leaf,
            color: 'emerald',
            subtext: 'Estimated savings',
        },
        {
            label: 'Active Drivers',
            value: stats.activeDrivers.toLocaleString(),
            icon: Zap,
            color: 'amber',
            subtext: 'Last 30 days',
        },
    ];

    const colorClasses: Record<string, { bg: string; icon: string; text: string }> = {
        blue: {
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            icon: 'text-blue-600 dark:text-blue-400',
            text: 'text-blue-600 dark:text-blue-400',
        },
        green: {
            bg: 'bg-green-50 dark:bg-green-900/20',
            icon: 'text-green-600 dark:text-green-400',
            text: 'text-green-600 dark:text-green-400',
        },
        emerald: {
            bg: 'bg-emerald-50 dark:bg-emerald-900/20',
            icon: 'text-emerald-600 dark:text-emerald-400',
            text: 'text-emerald-600 dark:text-emerald-400',
        },
        amber: {
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            icon: 'text-amber-600 dark:text-amber-400',
            text: 'text-amber-600 dark:text-amber-400',
        },
    };

    return (
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
            {statCards.map((stat, index) => {
                const Icon = stat.icon;
                const colors = colorClasses[stat.color];

                return (
                    <div
                        key={index}
                        className={`${colors.bg} rounded-xl p-4 border border-gray-200 dark:border-gray-700`}
                    >
                        <div className={`w-10 h-10 ${colors.bg} rounded-full flex items-center justify-center mb-3`}>
                            <Icon className={`w-5 h-5 ${colors.icon}`} />
                        </div>
                        <div className={`text-2xl font-bold ${colors.text}`}>
                            {stat.value}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            {stat.label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {stat.subtext}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// Live counter animation component
interface AnimatedCounterProps {
    value: number;
    duration?: number;
    suffix?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
    value,
    duration = 2000,
    suffix = '',
}) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const startTime = Date.now();
        const startValue = displayValue;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function
            const eased = 1 - Math.pow(1 - progress, 3);

            const current = Math.round(startValue + (value - startValue) * eased);
            setDisplayValue(current);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [value, duration]);

    return (
        <span>
            {displayValue.toLocaleString()}{suffix}
        </span>
    );
};

export default CommunityStats;
