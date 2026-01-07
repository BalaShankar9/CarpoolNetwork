import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    BarChart3, Car, Leaf, Wallet, MapPin, Calendar,
    TrendingUp, Award, Clock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { smartRecommendationService } from '@/services/smartRecommendationService';

interface CommuteInsightsProps {
    showDetailed?: boolean;
}

export function CommuteInsights({ showDetailed = true }: CommuteInsightsProps) {
    const { user } = useAuth();
    const [insights, setInsights] = useState<{
        totalTrips: number;
        totalSaved: number;
        carbonReduced: number;
        topRoutes: { route: string; count: number }[];
        averageRating: number;
        mostActiveDay: string;
    } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInsights = async () => {
            if (!user) return;

            try {
                const data = await smartRecommendationService.getCommuteInsights(user.id);
                setInsights(data);
            } catch (error) {
                console.error('Failed to fetch insights:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInsights();
    }, [user]);

    if (loading) {
        return (
            <div className="bg-slate-800/50 rounded-xl p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-slate-700 rounded w-1/3"></div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-24 bg-slate-700 rounded-xl"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!insights) return null;

    const stats = [
        {
            label: 'Total Trips',
            value: insights.totalTrips,
            icon: Car,
            color: 'text-blue-400',
            bg: 'bg-blue-500/20'
        },
        {
            label: 'Money Saved',
            value: `£${insights.totalSaved}`,
            icon: Wallet,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/20'
        },
        {
            label: 'CO₂ Reduced',
            value: `${insights.carbonReduced}kg`,
            icon: Leaf,
            color: 'text-green-400',
            bg: 'bg-green-500/20'
        },
        {
            label: 'Most Active',
            value: insights.mostActiveDay.substring(0, 3),
            icon: Calendar,
            color: 'text-purple-400',
            bg: 'bg-purple-500/20'
        }
    ];

    return (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50">
            {/* Header */}
            <div className="p-4 border-b border-slate-700/50 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                    <h3 className="font-semibold text-white">Your Commute Insights</h3>
                    <p className="text-sm text-slate-400">Based on your last 90 days</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                {stats.map((stat, index) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-slate-700/50 rounded-xl p-4"
                    >
                        <div className={`w-8 h-8 ${stat.bg} rounded-lg flex items-center justify-center mb-2`}>
                            <stat.icon className={`w-4 h-4 ${stat.color}`} />
                        </div>
                        <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                        <div className="text-xs text-slate-400">{stat.label}</div>
                    </motion.div>
                ))}
            </div>

            {/* Detailed Section */}
            {showDetailed && (
                <div className="p-4 border-t border-slate-700/50">
                    {/* Top Routes */}
                    {insights.topRoutes.length > 0 && (
                        <div className="mb-4">
                            <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                Your Most Frequent Routes
                            </h4>
                            <div className="space-y-2">
                                {insights.topRoutes.map((route, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center text-xs font-bold text-slate-300">
                                                {index + 1}
                                            </div>
                                            <span className="text-sm text-white">{route.route}</span>
                                        </div>
                                        <span className="text-sm text-slate-400">{route.count} trips</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Rating Given */}
                    {insights.averageRating > 0 && (
                        <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                            <div className="flex items-center gap-2">
                                <Award className="w-5 h-5 text-amber-400" />
                                <span className="text-sm text-amber-300">Average Rating Given</span>
                            </div>
                            <span className="text-lg font-bold text-amber-400">
                                {insights.averageRating.toFixed(1)} ⭐
                            </span>
                        </div>
                    )}

                    {/* Empty State for New Users */}
                    {insights.totalTrips === 0 && (
                        <div className="text-center py-6">
                            <Clock className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                            <p className="text-slate-400 text-sm">
                                Complete a few rides to see your personalized insights!
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default CommuteInsights;
