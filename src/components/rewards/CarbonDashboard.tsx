import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Leaf,
  TreePine,
  TrendingUp,
  Award,
  Car,
  Users,
  MapPin,
  BarChart3,
  Calendar,
  ChevronRight,
  Info,
  Share2,
} from 'lucide-react';
import {
  carbonRewardsService,
  CarbonStats,
  CO2_EMISSIONS_PER_KM,
} from '../../services/carbonRewardsService';
import { useAuth } from '../../contexts/AuthContext';

interface CarbonDashboardProps {
  onShareStats?: () => void;
}

export function CarbonDashboard({ onShareStats }: CarbonDashboardProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState<CarbonStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'month' | 'year'>('all');

  useEffect(() => {
    if (user?.id) {
      loadStats();
    }
  }, [user?.id]);

  const loadStats = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await carbonRewardsService.getCarbonStats(user.id);
      setStats(data);
    } finally {
      setLoading(false);
    }
  };

  // Fun facts calculations
  const carTripsAvoided = stats ? Math.round(stats.ridesShared * 0.8) : 0;
  const fuelSavedLitres = stats ? Math.round((stats.totalCO2Saved / 2.31) * 10) / 10 : 0; // ~2.31 kg CO2 per litre petrol
  const moneySaved = stats ? Math.round(fuelSavedLitres * 1.45) : 0; // £1.45 per litre

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-48 bg-gray-200 rounded-2xl mb-4" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-32 bg-gray-200 rounded-xl" />
            <div className="h-32 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 rounded-2xl p-6 text-white"
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
          <Leaf className="w-full h-full" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-white/20 rounded-lg">
              <Leaf className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-white/80">Your Environmental Impact</span>
          </div>

          <div className="mb-6">
            <div className="text-5xl font-bold mb-1">
              {stats?.totalCO2Saved.toFixed(1) || '0'} kg
            </div>
            <p className="text-white/80">CO₂ emissions prevented</p>
          </div>

          {/* Mini stats row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-xl p-3">
              <TreePine className="w-5 h-5 mb-1 opacity-80" />
              <div className="text-xl font-bold">{stats?.treesEquivalent || 0}</div>
              <div className="text-xs text-white/70">Trees equivalent</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <Car className="w-5 h-5 mb-1 opacity-80" />
              <div className="text-xl font-bold">{stats?.ridesShared || 0}</div>
              <div className="text-xs text-white/70">Rides shared</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <MapPin className="w-5 h-5 mb-1 opacity-80" />
              <div className="text-xl font-bold">{stats?.totalDistanceShared || 0}</div>
              <div className="text-xs text-white/70">Km shared</div>
            </div>
          </div>
        </div>

        {/* Share button */}
        {onShareStats && (
          <button
            onClick={onShareStats}
            className="absolute top-4 right-4 p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
          >
            <Share2 className="w-5 h-5" />
          </button>
        )}
      </motion.div>

      {/* Impact Comparison */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-200 p-6"
      >
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          Your Impact Equals...
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
            <div className="text-3xl font-bold text-blue-600 mb-1">{carTripsAvoided}</div>
            <p className="text-sm text-blue-800">Solo car trips avoided</p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4">
            <div className="text-3xl font-bold text-amber-600 mb-1">{fuelSavedLitres}L</div>
            <p className="text-sm text-amber-800">Fuel not burned</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
            <div className="text-3xl font-bold text-green-600 mb-1">£{moneySaved}</div>
            <p className="text-sm text-green-800">Estimated savings</p>
          </div>
        </div>
      </motion.div>

      {/* Monthly Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            Monthly Average
          </h3>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['month', 'year', 'all'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  selectedPeriod === period
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {period === 'month' ? '30d' : period === 'year' ? '1y' : 'All'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-end gap-4">
          <div>
            <div className="text-4xl font-bold text-gray-900">
              {stats?.monthlyAverage.toFixed(1) || '0'} kg
            </div>
            <p className="text-gray-500 text-sm">CO₂ saved per month</p>
          </div>
          <div className="flex-1 h-24 flex items-end gap-1">
            {/* Simplified bar chart visualization */}
            {[0.4, 0.6, 0.8, 0.5, 0.9, 0.7, 1.0, 0.6, 0.8, 0.5, 0.7, 0.9].map((height, index) => (
              <motion.div
                key={index}
                initial={{ height: 0 }}
                animate={{ height: `${height * 100}%` }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className="flex-1 bg-gradient-to-t from-green-500 to-emerald-400 rounded-t"
              />
            ))}
          </div>
        </div>

        <p className="text-sm text-gray-500 mt-4 flex items-center gap-1">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <span className="text-green-600 font-medium">+12%</span>
          vs last month
        </p>
      </motion.div>

      {/* Eco Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 p-6"
      >
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-emerald-600" />
          Did You Know?
        </h3>

        <div className="space-y-3">
          <p className="text-gray-700">
            🌍 The average car emits about <strong>{CO2_EMISSIONS_PER_KM.car} kg</strong> of CO₂ per kilometer.
          </p>
          <p className="text-gray-700">
            🚗 By sharing rides, you're helping reduce traffic congestion by up to <strong>30%</strong> in urban areas.
          </p>
          <p className="text-gray-700">
            🌳 It takes about <strong>22 trees</strong> a full year to absorb the CO₂ from driving 5,000 km alone.
          </p>
        </div>
      </motion.div>

      {/* Community Impact (Coming soon) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-violet-500" />
            Community Impact
          </h3>
          <span className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded-full">
            Coming Soon
          </span>
        </div>

        <p className="text-gray-600 mb-4">
          See how your community is working together to reduce emissions.
        </p>

        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
          <div className="flex -space-x-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 border-2 border-white flex items-center justify-center text-white text-xs font-medium"
              >
                {i}
              </div>
            ))}
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">Join the leaderboard</p>
            <p className="text-sm text-gray-500">Complete more rides to rank up</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
      </motion.div>
    </div>
  );
}
