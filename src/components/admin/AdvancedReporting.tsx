import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Car,
  BarChart3,
  PieChart,
  Activity,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  XCircle,
  MessageSquare,
  MapPin,
} from 'lucide-react';
import { getKpiSummary, clearAdminAnalyticsCache } from '../../services/adminAnalyticsService';
import type { KpiSummary, AnalyticsFilters } from '../../types/analytics';

interface KpiCardData {
  label: string;
  value: string | number;
  delta?: number;
  icon: React.ReactNode;
  color: string;
  link?: string;
}

export function AdvancedReporting() {
  const [generating, setGenerating] = useState<string | null>(null);
  const [kpis, setKpis] = useState<KpiSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const loadKpis = useCallback(async () => {
    try {
      const filters: AnalyticsFilters = {
        startDate: dateRange.start,
        endDate: dateRange.end,
        segment: 'all',
      };
      const data = await getKpiSummary(filters);
      setKpis(data);
    } catch (error) {
      console.error('Failed to load KPIs:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadKpis();
  }, [loadKpis]);

  const handleRefresh = async () => {
    setRefreshing(true);
    clearAdminAnalyticsCache();
    await loadKpis();
    setRefreshing(false);
  };

  const getDeltaIndicator = (delta: number | undefined) => {
    if (delta === undefined || delta === null) return null;
    if (delta > 0) {
      return (
        <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
          <TrendingUp className="w-3 h-3" />
          +{delta.toFixed(1)}%
        </span>
      );
    } else if (delta < 0) {
      return (
        <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
          <TrendingDown className="w-3 h-3" />
          {delta.toFixed(1)}%
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
        <Minus className="w-3 h-3" />
        0%
      </span>
    );
  };

  const kpiCards: KpiCardData[] = [
    {
      label: 'Active Users',
      value: kpis?.activeUsers.toLocaleString() || '0',
      delta: kpis?.activeUsersDelta,
      icon: <Users className="w-5 h-5" />,
      color: 'blue',
      link: '/admin/analytics/users',
    },
    {
      label: 'Rides Posted',
      value: kpis?.ridesPosted.toLocaleString() || '0',
      delta: kpis?.ridesPostedDelta,
      icon: <Car className="w-5 h-5" />,
      color: 'indigo',
      link: '/admin/analytics/rides',
    },
    {
      label: 'Bookings',
      value: kpis?.bookingsCreated.toLocaleString() || '0',
      delta: kpis?.bookingsCreatedDelta,
      icon: <Calendar className="w-5 h-5" />,
      color: 'orange',
    },
    {
      label: 'Completion Rate',
      value: `${kpis?.completionRate || 0}%`,
      delta: kpis?.completionRateDelta,
      icon: <CheckCircle className="w-5 h-5" />,
      color: 'green',
    },
    {
      label: 'Messages',
      value: kpis?.messagesSent.toLocaleString() || '0',
      delta: kpis?.messagesSentDelta,
      icon: <MessageSquare className="w-5 h-5" />,
      color: 'teal',
    },
    {
      label: 'Fill Rate',
      value: `${kpis?.fillRate || 0}%`,
      delta: kpis?.fillRateDelta,
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'purple',
    },
  ];

  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' },
    teal: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-100' },
  };

  const drilldownPages = [
    {
      title: 'Analytics Summary',
      description: 'Overview of all key metrics',
      icon: <BarChart3 className="w-5 h-5" />,
      link: '/admin/analytics/summary',
      color: 'blue',
    },
    {
      title: 'User Analytics',
      description: 'Growth, retention, segments',
      icon: <Users className="w-5 h-5" />,
      link: '/admin/analytics/users',
      color: 'green',
    },
    {
      title: 'Ride Analytics',
      description: 'Types, completion, trends',
      icon: <Car className="w-5 h-5" />,
      link: '/admin/analytics/rides',
      color: 'indigo',
    },
    {
      title: 'Geo Analytics',
      description: 'Locations, routes, coverage',
      icon: <MapPin className="w-5 h-5" />,
      link: '/admin/analytics/geo',
      color: 'orange',
    },
    {
      title: 'Ops Health',
      description: 'System status, errors',
      icon: <Activity className="w-5 h-5" />,
      link: '/admin/analytics/ops',
      color: 'purple',
    },
  ];

  const generateReport = async (reportType: string) => {
    setGenerating(reportType);

    try {
      let reportData: Record<string, unknown> = {};
      const startDate = dateRange.start;
      const endDate = dateRange.end;

      switch (reportType) {
        case 'executive':
          reportData = {
            title: 'Executive Summary Report',
            period: `${startDate} to ${endDate}`,
            kpis: kpis,
          };
          break;
        default:
          reportData = {
            title: `${reportType} Report`,
            period: `${startDate} to ${endDate}`,
          };
      }

      const csvContent = generateCSV(reportData);
      downloadCSV(csvContent, `${reportType}-report-${startDate}-${endDate}.csv`);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGenerating(null);
    }
  };

  const generateCSV = (data: Record<string, unknown>): string => {
    const lines = [
      `Report: ${data.title}`,
      `Period: ${data.period}`,
      `Generated: ${new Date().toISOString()}`,
      '',
      'Summary Data:',
      JSON.stringify(data, null, 2)
    ];
    return lines.join('\n');
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics & Reports</h2>
          <p className="text-gray-600">Live platform metrics with optional exports</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Period:</span>
          </div>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={() => {
              setDateRange({
                start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
              });
            }}
            className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            Last 30 days
          </button>
        </div>
      </div>

      {/* Live KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((card) => {
          const colors = colorClasses[card.color];
          const CardWrapper = card.link ? Link : 'div';
          const wrapperProps = card.link ? { to: card.link } : {};
          
          return (
            <CardWrapper
              key={card.label}
              {...wrapperProps}
              className={`bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all ${card.link ? 'cursor-pointer hover:border-blue-200' : ''}`}
            >
              {loading ? (
                <div className="animate-pulse">
                  <div className={`w-10 h-10 rounded-lg ${colors.bg} mb-3`} />
                  <div className="h-6 w-16 bg-gray-200 rounded mb-1" />
                  <div className="h-4 w-20 bg-gray-100 rounded" />
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.bg} ${colors.text} ${colors.border} border`}>
                      {card.icon}
                    </div>
                    {getDeltaIndicator(card.delta)}
                  </div>
                  <p className="text-xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-sm text-gray-500">{card.label}</p>
                </>
              )}
            </CardWrapper>
          );
        })}
      </div>

      {/* Drilldown Pages */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Detailed Analytics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {drilldownPages.map((page) => {
            const colors = colorClasses[page.color];
            return (
              <Link
                key={page.link}
                to={page.link}
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-blue-200 hover:shadow-sm transition-all group"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.bg} ${colors.text}`}>
                  {page.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">{page.title}</h4>
                  <p className="text-xs text-gray-500 truncate">{page.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Export Reports</h3>
            <p className="text-sm text-gray-500">Download data for the selected period</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => generateReport('executive')}
            disabled={generating === 'executive' || loading}
            className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 ${
              generating === 'executive'
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {generating === 'executive' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                KPI Summary (CSV)
              </>
            )}
          </button>
          <Link
            to="/admin/analytics/summary"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-blue-700"
          >
            <BarChart3 className="w-4 h-4" />
            View Full Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}