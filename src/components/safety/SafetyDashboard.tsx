import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart2,
  MapPin,
  Users,
  Activity,
  Loader2,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import {
  safetyAnalyticsService,
  SafetyMetrics,
  SafetyTrend,
  AreaSafetyScore,
  SafetyIncident,
} from '@/services/safetyAnalyticsService';

interface SafetyDashboardProps {
  isAdmin?: boolean;
}

export function SafetyDashboard({ isAdmin = false }: SafetyDashboardProps) {
  const [metrics, setMetrics] = useState<SafetyMetrics | null>(null);
  const [trends, setTrends] = useState<SafetyTrend[]>([]);
  const [areaScores, setAreaScores] = useState<AreaSafetyScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('7d');
  const [recentIncidents, setRecentIncidents] = useState<SafetyIncident[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  useEffect(() => {
    // Subscribe to real-time incidents
    const unsubscribe = safetyAnalyticsService.subscribeToIncidents(
      (incident) => {
        setRecentIncidents((prev) => [incident, ...prev.slice(0, 9)]);
        // Refresh metrics when new incident arrives
        loadMetrics();
      }
    );

    return () => unsubscribe();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    await Promise.all([loadMetrics(), loadTrends(), loadAreaScores()]);
    setLoading(false);
  };

  const loadMetrics = async () => {
    const data = await safetyAnalyticsService.getSafetyMetrics(timeRange);
    setMetrics(data);
  };

  const loadTrends = async () => {
    const rangeMap = { '24h': 1, '7d': 7, '30d': 30, '90d': 90 };
    const data = await safetyAnalyticsService.getSafetyTrends(rangeMap[timeRange]);
    setTrends(data);
  };

  const loadAreaScores = async () => {
    const data = await safetyAnalyticsService.getAreaSafetyScores();
    setAreaScores(data);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-400 bg-red-500/20';
      case 'high':
        return 'text-orange-400 bg-orange-500/20';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/20';
      default:
        return 'text-emerald-400 bg-emerald-500/20';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sos_alert':
        return '🚨';
      case 'safety_report':
        return '📋';
      case 'dispute':
        return '⚖️';
      case 'ban':
        return '🚫';
      case 'suspension':
        return '⏸️';
      case 'route_deviation':
        return '🗺️';
      case 'missed_checkin':
        return '⏰';
      default:
        return '❓';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Safety Dashboard</h2>
            <p className="text-sm text-slate-400">Platform safety overview</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button
            onClick={loadDashboardData}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="Total Incidents"
            value={metrics.totalIncidents}
            trend={metrics.trendsComparison.percentChange}
            iconColor="text-orange-400"
            iconBg="bg-orange-500/20"
          />
          <MetricCard
            icon={<AlertCircle className="w-5 h-5" />}
            label="Active Alerts"
            value={metrics.activeAlerts}
            iconColor="text-red-400"
            iconBg="bg-red-500/20"
          />
          <MetricCard
            icon={<CheckCircle className="w-5 h-5" />}
            label="Resolved"
            value={metrics.resolvedThisWeek}
            iconColor="text-emerald-400"
            iconBg="bg-emerald-500/20"
          />
          <MetricCard
            icon={<Clock className="w-5 h-5" />}
            label="Avg Resolution"
            value={`${metrics.averageResolutionTime.toFixed(1)}h`}
            iconColor="text-blue-400"
            iconBg="bg-blue-500/20"
          />
        </div>
      )}

      {/* Trends Chart */}
      {trends.length > 0 && (
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
          <h3 className="font-medium text-white mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" />
            Incident Trends
          </h3>
          <div className="h-48">
            <TrendsChart data={trends} />
          </div>
        </div>
      )}

      {/* Incidents by Type & Severity */}
      {metrics && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            <h3 className="font-medium text-white mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-400" />
              By Type
            </h3>
            <div className="space-y-3">
              {Object.entries(metrics.incidentsByType)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-xl">{getTypeIcon(type)}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-300 capitalize">
                          {type.replace('_', ' ')}
                        </span>
                        <span className="text-sm font-medium text-white">{count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-blue-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{
                            width: `${(count / metrics.totalIncidents) * 100}%`,
                          }}
                          transition={{ duration: 0.5, delay: 0.1 }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            <h3 className="font-medium text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              By Severity
            </h3>
            <div className="space-y-3">
              {['critical', 'high', 'medium', 'low'].map((severity) => {
                const count = metrics.incidentsBySeverity[severity] || 0;
                return (
                  <div key={severity} className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded ${getSeverityColor(
                        severity
                      )}`}
                    >
                      {severity}
                    </span>
                    <div className="flex-1">
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${
                            severity === 'critical'
                              ? 'bg-red-500'
                              : severity === 'high'
                              ? 'bg-orange-500'
                              : severity === 'medium'
                              ? 'bg-yellow-500'
                              : 'bg-emerald-500'
                          }`}
                          initial={{ width: 0 }}
                          animate={{
                            width: `${(count / metrics.totalIncidents) * 100}%`,
                          }}
                          transition={{ duration: 0.5, delay: 0.1 }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium text-white w-8 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Area Safety Scores */}
      {isAdmin && (
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
          <h3 className="font-medium text-white mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            Area Safety Scores
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {areaScores.map((area) => (
              <div
                key={area.region}
                className="p-3 bg-slate-700/50 rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-white">{area.region}</p>
                    <p className="text-xs text-slate-400">
                      {area.incidentCount} incidents
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {area.trend === 'improving' ? (
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    ) : area.trend === 'declining' ? (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    ) : null}
                    <span
                      className={`text-lg font-bold ${
                        area.score >= 85
                          ? 'text-emerald-400'
                          : area.score >= 70
                          ? 'text-yellow-400'
                          : 'text-red-400'
                      }`}
                    >
                      {area.score}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Top issue: {area.mostCommonIssue}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Incidents Feed */}
      {isAdmin && recentIncidents.length > 0 && (
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
          <h3 className="font-medium text-white mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-red-400" />
            Live Incident Feed
          </h3>
          <div className="space-y-2">
            {recentIncidents.map((incident) => (
              <motion.div
                key={incident.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 p-2 bg-slate-700/50 rounded-lg"
              >
                <span className="text-xl">{getTypeIcon(incident.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white capitalize truncate">
                    {incident.type.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {incident.description}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded ${getSeverityColor(
                    incident.severity
                  )}`}
                >
                  {incident.severity}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  trend?: number;
  iconColor: string;
  iconBg: string;
}

function MetricCard({ icon, label, value, trend, iconColor, iconBg }: MetricCardProps) {
  return (
    <motion.div
      className="p-4 bg-slate-800/50 rounded-xl border border-slate-700"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 ${iconBg} rounded-lg ${iconColor}`}>{icon}</div>
        <span className="text-sm text-slate-400">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-white">{value}</span>
        {trend !== undefined && (
          <div
            className={`flex items-center text-sm ${
              trend < 0 ? 'text-emerald-400' : trend > 0 ? 'text-red-400' : 'text-slate-400'
            }`}
          >
            {trend < 0 ? (
              <TrendingDown className="w-4 h-4 mr-1" />
            ) : trend > 0 ? (
              <TrendingUp className="w-4 h-4 mr-1" />
            ) : null}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface TrendsChartProps {
  data: SafetyTrend[];
}

function TrendsChart({ data }: TrendsChartProps) {
  const maxIncidents = Math.max(...data.map((d) => d.incidents), 1);

  return (
    <div className="flex items-end gap-1 h-full">
      {data.map((day, index) => (
        <div
          key={day.date}
          className="flex-1 flex flex-col items-center gap-1"
          title={`${day.date}: ${day.incidents} incidents`}
        >
          <div className="w-full flex flex-col gap-0.5 h-36">
            {/* SOS Alerts */}
            {day.sosAlerts > 0 && (
              <motion.div
                className="w-full bg-red-500/50 rounded-t"
                initial={{ height: 0 }}
                animate={{ height: `${(day.sosAlerts / maxIncidents) * 100}%` }}
                transition={{ duration: 0.3, delay: index * 0.02 }}
              />
            )}
            {/* Reports */}
            <motion.div
              className="w-full bg-orange-500/50"
              initial={{ height: 0 }}
              animate={{ height: `${(day.reports / maxIncidents) * 100}%` }}
              transition={{ duration: 0.3, delay: index * 0.02 }}
            />
            {/* Other incidents */}
            <motion.div
              className="w-full bg-blue-500/50 rounded-b"
              initial={{ height: 0 }}
              animate={{
                height: `${
                  ((day.incidents - day.sosAlerts - day.reports) / maxIncidents) * 100
                }%`,
              }}
              transition={{ duration: 0.3, delay: index * 0.02 }}
            />
          </div>
          {index % Math.ceil(data.length / 7) === 0 && (
            <span className="text-xs text-slate-500 truncate w-full text-center">
              {new Date(day.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default SafetyDashboard;
