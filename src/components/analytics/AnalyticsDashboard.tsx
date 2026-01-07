import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Car,
  Users,
  Leaf,
  TreeDeciduous,
  Wallet,
  Clock,
  MapPin,
  Calendar,
  Download,
  ChevronDown,
  Star,
  Route,
  Zap,
  Target,
  Award,
  Loader2,
} from 'lucide-react';
import {
  analyticsService,
  UserStats,
  TrendData,
  EnvironmentalImpact,
} from '../../services/analyticsService';
import { useAuth } from '../../contexts/AuthContext';

type Period = 'week' | 'month' | 'year' | 'all';

export function AnalyticsDashboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('month');
  const [stats, setStats] = useState<UserStats | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [impact, setImpact] = useState<EnvironmentalImpact | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'impact' | 'routes'>('overview');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user, period]);

  const loadAnalytics = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [statsData, trendsData, impactData] = await Promise.all([
        analyticsService.getUserStats(user.id, period),
        analyticsService.getTrendData(user.id, period === 'all' ? 'year' : period),
        analyticsService.getEnvironmentalImpact(user.id),
      ]);
      setStats(statsData);
      setTrends(trendsData);
      setImpact(impactData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    if (!user) return;
    setExporting(true);
    try {
      const report = await analyticsService.generateReport(user.id, period === 'all' ? 'year' : period, format);
      const blob = new Blob([report], { type: format === 'csv' ? 'text/csv' : 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `carpool-stats-${period}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const periodLabels: Record<Period, string> = {
    week: 'This Week',
    month: 'This Month',
    year: 'This Year',
    all: 'All Time',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Analytics</h1>
          <p className="text-gray-600">Track your carpooling journey</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className="relative">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(periodLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Export Button */}
          <div className="relative group">
            <button
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Export
            </button>
            <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => handleExport('csv')}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 rounded-t-lg"
              >
                Export CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 rounded-b-lg"
              >
                Export JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        {(['overview', 'trends', 'impact', 'routes'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && stats && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={<Car className="w-5 h-5" />}
                label="Rides Given"
                value={stats.ridesGiven}
                color="blue"
              />
              <StatCard
                icon={<Users className="w-5 h-5" />}
                label="Rides Taken"
                value={stats.ridesTaken}
                color="purple"
              />
              <StatCard
                icon={<Route className="w-5 h-5" />}
                label="Total Distance"
                value={`${stats.totalDistance.toFixed(0)} km`}
                color="green"
              />
              <StatCard
                icon={<Clock className="w-5 h-5" />}
                label="Time on Road"
                value={formatDuration(stats.totalDuration)}
                color="amber"
              />
            </div>

            {/* Financial Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-green-100">Money Saved</p>
                    <p className="text-3xl font-bold">£{stats.moneySaved.toFixed(2)}</p>
                  </div>
                </div>
                <p className="text-sm text-green-100">
                  By sharing rides instead of driving alone
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-blue-100">Money Earned</p>
                    <p className="text-3xl font-bold">£{stats.moneyEarned.toFixed(2)}</p>
                  </div>
                </div>
                <p className="text-sm text-blue-100">
                  From fuel contributions on your rides
                </p>
              </div>
            </div>

            {/* Rating & Reviews */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Your Reputation</h3>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Star className="w-8 h-8 text-amber-400 fill-amber-400" />
                  <div>
                    <p className="text-3xl font-bold">{stats.averageRating.toFixed(1)}</p>
                    <p className="text-sm text-gray-500">Average Rating</p>
                  </div>
                </div>
                <div className="h-12 w-px bg-gray-200" />
                <div>
                  <p className="text-3xl font-bold">{stats.totalReviews}</p>
                  <p className="text-sm text-gray-500">Total Reviews</p>
                </div>
              </div>
            </div>

            {/* Frequent Partners */}
            {stats.frequentPartners.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Frequent Carpool Partners</h3>
                <div className="space-y-3">
                  {stats.frequentPartners.map((partner) => (
                    <div key={partner.userId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {partner.avatar ? (
                          <img
                            src={partner.avatar}
                            alt={partner.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <Users className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{partner.name}</p>
                          <p className="text-sm text-gray-500">
                            {partner.ridesShared} rides shared
                          </p>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">
                        Last: {new Date(partner.lastRide).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'trends' && (
          <motion.div
            key="trends"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <TrendsChart data={trends} />

            {/* Peak Times */}
            {stats?.peakTimes && stats.peakTimes.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Your Peak Travel Times</h3>
                <div className="grid grid-cols-7 gap-2 text-center text-xs">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="font-medium text-gray-500">{day}</div>
                  ))}
                  {Array.from({ length: 7 * 24 }).map((_, idx) => {
                    const dayOfWeek = idx % 7;
                    const hour = Math.floor(idx / 7);
                    const peakTime = stats.peakTimes.find(
                      (p) => p.dayOfWeek === dayOfWeek && p.hour === hour
                    );
                    const intensity = peakTime
                      ? Math.min(peakTime.rideCount / Math.max(...stats.peakTimes.map((p) => p.rideCount)), 1)
                      : 0;
                    return (
                      <div
                        key={idx}
                        className="aspect-square rounded"
                        style={{
                          backgroundColor: intensity > 0
                            ? `rgba(59, 130, 246, ${0.2 + intensity * 0.8})`
                            : '#f3f4f6',
                        }}
                        title={`${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]} ${hour}:00 - ${peakTime?.rideCount || 0} rides`}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'impact' && impact && (
          <motion.div
            key="impact"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Environmental Hero Banner */}
            <div className="bg-gradient-to-br from-green-600 to-teal-700 rounded-2xl p-8 text-white">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Leaf className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Environmental Impact</h2>
                  <p className="text-green-100">You're making a difference!</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-4xl font-bold">{impact.totalCo2Saved.toFixed(0)}</p>
                  <p className="text-green-100">kg CO₂ saved</p>
                </div>
                <div>
                  <p className="text-4xl font-bold">{impact.treesEquivalent.toFixed(1)}</p>
                  <p className="text-green-100">trees equivalent</p>
                </div>
                <div>
                  <p className="text-4xl font-bold">{impact.gallonsSaved.toFixed(0)}</p>
                  <p className="text-green-100">gallons saved</p>
                </div>
                <div>
                  <p className="text-4xl font-bold">{impact.carsOffRoad.toFixed(0)}</p>
                  <p className="text-green-100">car-days off road</p>
                </div>
              </div>
            </div>

            {/* Comparison */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">How You Compare</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Your CO₂ savings this month</span>
                    <span className="font-medium">{impact.comparison.yourSavings.toFixed(1)} kg</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
                      style={{
                        width: `${Math.min(
                          (impact.comparison.yourSavings / (impact.comparison.averageUser * 2)) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Average user: {impact.comparison.averageUser.toFixed(1)} kg</span>
                  <span className="text-green-600 font-medium">
                    Top {(100 - impact.comparison.percentile).toFixed(0)}% of users!
                  </span>
                </div>
              </div>
            </div>

            {/* Monthly Trend */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">CO₂ Savings Over Time</h3>
              <div className="h-48">
                <MonthlyImpactChart data={impact.monthlyTrend} />
              </div>
            </div>

            {/* Fun Facts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <TreeDeciduous className="w-8 h-8 text-amber-600 mb-2" />
                <p className="text-sm text-amber-800">
                  Your CO₂ savings equal what <strong>{impact.treesEquivalent.toFixed(1)} trees</strong> absorb in a year!
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <Zap className="w-8 h-8 text-blue-600 mb-2" />
                <p className="text-sm text-blue-800">
                  You've saved enough fuel to power a car for <strong>{(impact.milesSaved / 30).toFixed(0)} days</strong>!
                </p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <Target className="w-8 h-8 text-purple-600 mb-2" />
                <p className="text-sm text-purple-800">
                  Keep it up! You're on track to save <strong>{(impact.totalCo2Saved * 12 / (new Date().getMonth() + 1)).toFixed(0)} kg</strong> CO₂ this year.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'routes' && stats && (
          <motion.div
            key="routes"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Your Top Routes</h3>
              {stats.topRoutes.length > 0 ? (
                <div className="space-y-4">
                  {stats.topRoutes.map((route, index) => (
                    <div
                      key={`${route.origin}-${route.destination}`}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="truncate font-medium">{route.origin}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm mt-1">
                          <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
                          <span className="truncate">{route.destination}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{route.count} trips</p>
                        <p className="text-sm text-gray-500">{route.totalDistance.toFixed(0)} km total</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No routes yet. Start carpooling to see your top routes!
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Sub-components
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: 'blue' | 'purple' | 'green' | 'amber';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`inline-flex p-2 rounded-lg ${colorClasses[color]} mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

function TrendsChart({ data }: { data: TrendData[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-500">
        No trend data available for this period
      </div>
    );
  }

  const maxRides = Math.max(...data.map((d) => d.ridesGiven + d.ridesTaken), 1);
  const maxCo2 = Math.max(...data.map((d) => d.co2Saved), 1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Activity Trends</h3>
      <div className="space-y-6">
        {/* Rides Chart */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Rides</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-blue-500" /> Given
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-purple-500" /> Taken
              </span>
            </div>
          </div>
          <div className="flex items-end gap-1 h-32">
            {data.slice(-14).map((d, i) => (
              <div key={i} className="flex-1 flex flex-col gap-0.5">
                <div
                  className="bg-blue-500 rounded-t"
                  style={{ height: `${(d.ridesGiven / maxRides) * 100}%` }}
                />
                <div
                  className="bg-purple-500 rounded-b"
                  style={{ height: `${(d.ridesTaken / maxRides) * 100}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>{data[Math.max(0, data.length - 14)]?.date}</span>
            <span>{data[data.length - 1]?.date}</span>
          </div>
        </div>

        {/* CO2 Chart */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">CO₂ Saved (kg)</span>
          </div>
          <div className="flex items-end gap-1 h-24">
            {data.slice(-14).map((d, i) => (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-green-500 to-green-400 rounded-t"
                style={{ height: `${(d.co2Saved / maxCo2) * 100}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MonthlyImpactChart({ data }: { data: { month: string; co2Saved: number }[] }) {
  const maxCo2 = Math.max(...data.map((d) => d.co2Saved), 1);

  return (
    <div className="flex items-end justify-between h-full gap-2">
      {data.map((d) => (
        <div key={d.month} className="flex-1 flex flex-col items-center">
          <div
            className="w-full bg-gradient-to-t from-teal-500 to-green-400 rounded-t"
            style={{ height: `${(d.co2Saved / maxCo2) * 100}%`, minHeight: d.co2Saved > 0 ? '4px' : '0' }}
          />
          <span className="text-xs text-gray-500 mt-2">
            {new Date(d.month + '-01').toLocaleDateString('en', { month: 'short' })}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return `${hours}h ${mins}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export default AnalyticsDashboard;
