import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Shield,
  Users,
  Ban,
  CheckCircle,
  Clock,
  BarChart3,
  ArrowLeft,
  Calendar,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface SafetyMetrics {
  total_reports: number;
  pending_reports: number;
  resolved_reports: number;
  critical_reports: number;
  active_suspensions: number;
  total_warnings: number;
  avg_resolution_time: number;
  reports_this_week: number;
  reports_last_week: number;
}

interface TrendData {
  date: string;
  count: number;
}

export default function SafetyDashboard() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<SafetyMetrics | null>(null);
  const [severityBreakdown, setSeverityBreakdown] = useState<any[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);
  const [weeklyTrend, setWeeklyTrend] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/admin');
      return;
    }
    loadMetrics();
  }, [isAdmin]);

  const loadMetrics = async () => {
    try {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

      const [
        totalReports,
        pendingReports,
        resolvedReports,
        criticalReports,
        activeSuspensions,
        totalWarnings,
        reportsThisWeek,
        reportsLastWeek,
        severity,
        category,
      ] = await Promise.all([
        supabase.from('safety_reports').select('id', { count: 'exact', head: true }),
        supabase.from('safety_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('safety_reports').select('id', { count: 'exact', head: true }).eq('status', 'resolved'),
        supabase.from('safety_reports').select('id', { count: 'exact', head: true }).eq('severity', 'critical'),
        supabase.from('user_suspensions').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('safety_warnings').select('id', { count: 'exact', head: true }),
        supabase.from('safety_reports').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
        supabase.from('safety_reports').select('id', { count: 'exact', head: true }).gte('created_at', twoWeeksAgo).lt('created_at', weekAgo),
        supabase.from('safety_reports').select('severity').then(({ data }) => {
          const counts: any = {};
          data?.forEach(r => {
            counts[r.severity] = (counts[r.severity] || 0) + 1;
          });
          return Object.entries(counts).map(([severity, count]) => ({ severity, count }));
        }),
        supabase.from('safety_reports').select('category').then(({ data }) => {
          const counts: any = {};
          data?.forEach(r => {
            const cat = r.category || 'other';
            counts[cat] = (counts[cat] || 0) + 1;
          });
          return Object.entries(counts).map(([category, count]) => ({ category, count }));
        }),
      ]);

      setMetrics({
        total_reports: totalReports.count || 0,
        pending_reports: pendingReports.count || 0,
        resolved_reports: resolvedReports.count || 0,
        critical_reports: criticalReports.count || 0,
        active_suspensions: activeSuspensions.count || 0,
        total_warnings: totalWarnings.count || 0,
        avg_resolution_time: 0,
        reports_this_week: reportsThisWeek.count || 0,
        reports_last_week: reportsLastWeek.count || 0,
      });

      setSeverityBreakdown(severity);
      setCategoryBreakdown(category);

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        return date.toISOString().split('T')[0];
      }).reverse();

      const trendPromises = last7Days.map(async (date) => {
        const nextDay = new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const { count } = await supabase
          .from('safety_reports')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', date)
          .lt('created_at', nextDay);
        return { date, count: count || 0 };
      });

      const trendData = await Promise.all(trendPromises);
      setWeeklyTrend(trendData);

    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const weekOverWeekChange = metrics
    ? ((metrics.reports_this_week - metrics.reports_last_week) / (metrics.reports_last_week || 1)) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">Safety Metrics</h1>
          <p className="text-gray-600 mt-1">Comprehensive safety and moderation analytics</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Reports</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{metrics?.total_reports || 0}</p>
              <div className="flex items-center gap-1 mt-2">
                {weekOverWeekChange >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-red-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-green-600" />
                )}
                <span className={`text-sm font-medium ${weekOverWeekChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {Math.abs(weekOverWeekChange).toFixed(1)}% vs last week
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">{metrics?.pending_reports || 0}</p>
              <p className="text-sm text-gray-500 mt-2">Awaiting review</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Critical</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{metrics?.critical_reports || 0}</p>
              <p className="text-sm text-gray-500 mt-2">High priority</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Suspensions</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">{metrics?.active_suspensions || 0}</p>
              <p className="text-sm text-gray-500 mt-2">Currently banned</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Ban className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Trend */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          7-Day Trend
        </h3>
        <div className="flex items-end justify-between gap-2 h-48">
          {weeklyTrend.map((day, idx) => {
            const maxCount = Math.max(...weeklyTrend.map(d => d.count), 1);
            const height = (day.count / maxCount) * 100;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center">
                <div className="w-full flex items-end justify-center" style={{ height: '180px' }}>
                  <div
                    className="w-full bg-blue-500 rounded-t-lg transition-all hover:bg-blue-600 cursor-pointer relative group"
                    style={{ height: `${height}%`, minHeight: day.count > 0 ? '10px' : '0' }}
                  >
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-sm font-medium text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                      {day.count}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Severity Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Reports by Severity</h3>
          <div className="space-y-4">
            {severityBreakdown.map((item) => {
              const total = severityBreakdown.reduce((sum, i) => sum + (i.count || 0), 0);
              const percentage = total > 0 ? ((item.count || 0) / total) * 100 : 0;
              const colors = {
                critical: { bg: 'bg-red-500', text: 'text-red-600' },
                high: { bg: 'bg-orange-500', text: 'text-orange-600' },
                medium: { bg: 'bg-yellow-500', text: 'text-yellow-600' },
                low: { bg: 'bg-blue-500', text: 'text-blue-600' },
              };
              const color = colors[item.severity as keyof typeof colors] || colors.low;

              return (
                <div key={item.severity}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-medium capitalize ${color.text}`}>{item.severity}</span>
                    <span className="text-sm text-gray-600">{item.count} ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${color.bg}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Reports by Category</h3>
          <div className="space-y-3">
            {categoryBreakdown.slice(0, 6).map((item) => {
              const total = categoryBreakdown.reduce((sum, i) => sum + (i.count || 0), 0);
              const percentage = total > 0 ? ((item.count || 0) / total) * 100 : 0;

              return (
                <div key={item.category} className="flex items-center justify-between">
                  <span className="text-gray-700 capitalize text-sm">{item.category?.replace('_', ' ')}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">{item.count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-green-700">Resolved Reports</p>
              <p className="text-2xl font-bold text-green-900">{metrics?.resolved_reports || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="text-sm text-yellow-700">Total Warnings</p>
              <p className="text-2xl font-bold text-yellow-900">{metrics?.total_warnings || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-purple-700">This Week</p>
              <p className="text-2xl font-bold text-purple-900">{metrics?.reports_this_week || 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
