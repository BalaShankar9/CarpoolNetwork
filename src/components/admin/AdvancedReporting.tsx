import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Users,
  Car,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  type: string;
}

export function AdvancedReporting() {
  const [generating, setGenerating] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const reportTemplates: ReportTemplate[] = [
    {
      id: 'executive',
      name: 'Executive Summary',
      description: 'High-level overview of platform performance, KPIs, and trends',
      icon: <TrendingUp className="w-6 h-6" />,
      type: 'executive'
    },
    {
      id: 'user-analytics',
      name: 'User Analytics',
      description: 'User growth, retention, behavior patterns, and demographics',
      icon: <Users className="w-6 h-6" />,
      type: 'user'
    },
    {
      id: 'ride-performance',
      name: 'Ride Performance',
      description: 'Ride metrics, completion rates, cancellations, and efficiency',
      icon: <Car className="w-6 h-6" />,
      type: 'ride'
    },
    {
      id: 'geographic',
      name: 'Geographic Analysis',
      description: 'Regional performance, demand/supply analysis, and coverage maps',
      icon: <PieChart className="w-6 h-6" />,
      type: 'geographic'
    },
    {
      id: 'operational',
      name: 'Operational Metrics',
      description: 'System health, performance, uptime, and operational efficiency',
      icon: <Activity className="w-6 h-6" />,
      type: 'operational'
    }
  ];

  const generateReport = async (reportType: string) => {
    setGenerating(reportType);

    try {
      let reportData: any = {};
      const startDate = dateRange.start;
      const endDate = dateRange.end;

      switch (reportType) {
        case 'executive':
          const { data: businessMetrics } = await supabase
            .from('business_metrics_daily')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate);

          const { data: activeUsers } = await supabase
            .from('active_users_snapshot')
            .select('*')
            .order('snapshot_time', { ascending: false })
            .limit(1)
            .maybeSingle();

          reportData = {
            title: 'Executive Summary Report',
            period: `${startDate} to ${endDate}`,
            metrics: businessMetrics,
            activeUsers: activeUsers
          };
          break;

        case 'user':
          const { data: userBehavior } = await supabase
            .from('user_behavior_analytics')
            .select('*')
            .gte('analysis_date', startDate)
            .lte('analysis_date', endDate);

          const { data: growthMetrics } = await supabase
            .from('growth_metrics')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate);

          reportData = {
            title: 'User Analytics Report',
            period: `${startDate} to ${endDate}`,
            userBehavior: userBehavior,
            growthMetrics: growthMetrics
          };
          break;

        case 'ride':
          const { data: rideAnalytics } = await supabase
            .from('ride_analytics')
            .select('*')
            .gte('created_at', startDate)
            .lte('created_at', endDate);

          reportData = {
            title: 'Ride Performance Report',
            period: `${startDate} to ${endDate}`,
            analytics: rideAnalytics
          };
          break;

        case 'geographic':
          const { data: geoAnalytics } = await supabase
            .from('geographic_analytics')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate);

          reportData = {
            title: 'Geographic Analysis Report',
            period: `${startDate} to ${endDate}`,
            geographic: geoAnalytics
          };
          break;

        case 'operational':
          const { data: systemHealth } = await supabase
            .from('system_health_metrics')
            .select('*')
            .gte('timestamp', startDate)
            .lte('timestamp', endDate);

          const { data: serviceUptime } = await supabase
            .from('service_uptime_tracking')
            .select('*');

          reportData = {
            title: 'Operational Metrics Report',
            period: `${startDate} to ${endDate}`,
            systemHealth: systemHealth,
            serviceUptime: serviceUptime
          };
          break;
      }

      await supabase.from('financial_reports').insert({
        report_type: reportType,
        report_period: `${startDate} to ${endDate}`,
        start_date: startDate,
        end_date: endDate,
        data: reportData,
        generated_by: (await supabase.auth.getUser()).data.user?.id
      });

      const csvContent = generateCSV(reportData);
      downloadCSV(csvContent, `${reportType}-report-${startDate}-${endDate}.csv`);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGenerating(null);
    }
  };

  const generateCSV = (data: any): string => {
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
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Advanced Reporting</h2>
        <p className="text-gray-600">Generate comprehensive reports and analytics</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <Calendar className="w-5 h-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Report Period:</span>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <span className="text-gray-600">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportTemplates.map((template) => (
            <div
              key={template.id}
              className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                {template.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{template.description}</p>
              <button
                onClick={() => generateReport(template.type)}
                disabled={generating === template.type}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  generating === template.type
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {generating === template.type ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white flex-shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Report Features</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                Customizable date ranges for any reporting period
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                Export to CSV format for further analysis
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                Historical report storage and retrieval
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                Automated scheduling available for regular reports
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                Comprehensive data aggregation from multiple sources
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}