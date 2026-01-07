import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  Clock,
  User,
  MessageSquare,
  Car,
  Check,
  X,
  ChevronRight,
  Filter,
  Search,
  Loader2,
  Eye,
  Ban,
  AlertCircle,
} from 'lucide-react';
import {
  moderationService,
  ContentReport,
  ReportCategory,
  ReportStatus,
} from '@/services/moderationService';

interface ModerationQueueProps {
  moderatorId: string;
}

export function ModerationQueue({ moderatorId }: ModerationQueueProps) {
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ContentReport | null>(null);
  const [filters, setFilters] = useState<{
    status?: ReportStatus;
    category?: ReportCategory;
    severity?: string;
  }>({});
  const [stats, setStats] = useState<{
    pending: number;
    resolved: number;
    escalated: number;
    avgResolutionTime: number;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reportsData, statsData] = await Promise.all([
        moderationService.getModerationQueue(filters),
        moderationService.getModerationStats(),
      ]);
      setReports(reportsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load moderation queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (
    reportId: string,
    status: ReportStatus,
    resolution?: string
  ) => {
    try {
      await moderationService.updateReportStatus(reportId, status, resolution, moderatorId);
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status, resolution } : r))
      );
      setSelectedReport(null);
    } catch (error) {
      console.error('Failed to update report:', error);
    }
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
        return 'text-slate-400 bg-slate-500/20';
    }
  };

  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'under_review':
        return 'text-blue-400 bg-blue-500/20';
      case 'action_taken':
        return 'text-emerald-400 bg-emerald-500/20';
      case 'dismissed':
        return 'text-slate-400 bg-slate-500/20';
      case 'escalated':
        return 'text-red-400 bg-red-500/20';
      default:
        return 'text-slate-400 bg-slate-500/20';
    }
  };

  const getCategoryIcon = (category: ReportCategory) => {
    switch (category) {
      case 'harassment':
      case 'safety_concern':
      case 'dangerous_driving':
        return <AlertTriangle className="w-4 h-4" />;
      case 'spam':
      case 'inappropriate_content':
        return <MessageSquare className="w-4 h-4" />;
      case 'fake_profile':
      case 'fraud':
        return <User className="w-4 h-4" />;
      case 'no_show':
        return <Car className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Shield className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Moderation Queue</h1>
              <p className="text-sm text-slate-400">Review and resolve reports</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 bg-yellow-500/10 rounded-lg">
              <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
              <p className="text-xs text-slate-400">Pending</p>
            </div>
            <div className="p-3 bg-red-500/10 rounded-lg">
              <p className="text-2xl font-bold text-red-400">{stats.escalated}</p>
              <p className="text-xs text-slate-400">Escalated</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-lg">
              <p className="text-2xl font-bold text-emerald-400">{stats.resolved}</p>
              <p className="text-xs text-slate-400">Resolved</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <p className="text-2xl font-bold text-blue-400">
                {stats.avgResolutionTime.toFixed(1)}h
              </p>
              <p className="text-xs text-slate-400">Avg Time</p>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-slate-700 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Filter className="w-4 h-4" />
          <span>Filter:</span>
        </div>

        <select
          value={filters.status || ''}
          onChange={(e) =>
            setFilters({ ...filters, status: e.target.value as ReportStatus || undefined })
          }
          className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="under_review">Under Review</option>
          <option value="escalated">Escalated</option>
          <option value="action_taken">Action Taken</option>
          <option value="dismissed">Dismissed</option>
        </select>

        <select
          value={filters.severity || ''}
          onChange={(e) =>
            setFilters({ ...filters, severity: e.target.value || undefined })
          }
          className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
        >
          <option value="">All Severity</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <button
          onClick={() => setFilters({})}
          className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Reports List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No reports to review</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {reports.map((report) => (
              <motion.button
                key={report.id}
                onClick={() => setSelectedReport(report)}
                className="w-full p-4 hover:bg-slate-800/50 transition-colors text-left"
                whileHover={{ x: 4 }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${getSeverityColor(report.severity)}`}>
                      {getCategoryIcon(report.category)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white capitalize">
                          {report.category.replace('_', ' ')}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(
                            report.status
                          )}`}
                        >
                          {report.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 line-clamp-2">
                        {report.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(report.createdAt).toLocaleDateString()}
                        </span>
                        <span className={`capitalize ${getSeverityColor(report.severity)} px-1.5 py-0.5 rounded`}>
                          {report.severity}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500 flex-shrink-0" />
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      <AnimatePresence>
        {selectedReport && (
          <ReportDetailModal
            report={selectedReport}
            onClose={() => setSelectedReport(null)}
            onUpdateStatus={handleUpdateStatus}
            moderatorId={moderatorId}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface ReportDetailModalProps {
  report: ContentReport;
  onClose: () => void;
  onUpdateStatus: (id: string, status: ReportStatus, resolution?: string) => void;
  moderatorId: string;
}

function ReportDetailModal({
  report,
  onClose,
  onUpdateStatus,
  moderatorId,
}: ReportDetailModalProps) {
  const [action, setAction] = useState<'take_action' | 'dismiss' | null>(null);
  const [resolution, setResolution] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleAction = async () => {
    if (!action) return;

    setProcessing(true);
    try {
      const status = action === 'take_action' ? 'action_taken' : 'dismissed';
      await onUpdateStatus(report.id, status, resolution);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-slate-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-white">Report Details</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Category & Severity */}
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-slate-700 text-white text-sm rounded-lg capitalize">
              {report.category.replace('_', ' ')}
            </span>
            <span className={`px-3 py-1 text-sm rounded-lg capitalize ${
              report.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
              report.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
              report.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-slate-500/20 text-slate-400'
            }`}>
              {report.severity} severity
            </span>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Description
            </label>
            <p className="text-white bg-slate-700/50 rounded-lg p-3">
              {report.description}
            </p>
          </div>

          {/* Evidence */}
          {report.evidence && report.evidence.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Evidence
              </label>
              <div className="space-y-2">
                {report.evidence.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-purple-400 hover:text-purple-300 truncate"
                  >
                    {url}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-slate-700/30 rounded-lg">
              <p className="text-slate-400">Reported</p>
              <p className="text-white">
                {new Date(report.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-slate-700/30 rounded-lg">
              <p className="text-slate-400">Status</p>
              <p className="text-white capitalize">{report.status.replace('_', ' ')}</p>
            </div>
          </div>

          {/* Actions */}
          {['pending', 'under_review', 'escalated'].includes(report.status) && (
            <div className="pt-4 border-t border-slate-700 space-y-3">
              <p className="text-sm font-medium text-slate-300">Take Action</p>

              <div className="flex gap-2">
                <button
                  onClick={() => setAction('take_action')}
                  className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                    action === 'take_action'
                      ? 'bg-red-500 text-white'
                      : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  }`}
                >
                  <Ban className="w-4 h-4" />
                  Take Action
                </button>
                <button
                  onClick={() => setAction('dismiss')}
                  className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                    action === 'dismiss'
                      ? 'bg-slate-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <X className="w-4 h-4" />
                  Dismiss
                </button>
              </div>

              {action && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-3"
                >
                  <textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder={`Enter ${action === 'take_action' ? 'action taken' : 'dismissal reason'}...`}
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 resize-none"
                  />
                  <button
                    onClick={handleAction}
                    disabled={processing || !resolution.trim()}
                    className="w-full py-3 bg-purple-500 text-white font-medium rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Confirm {action === 'take_action' ? 'Action' : 'Dismissal'}
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default ModerationQueue;
