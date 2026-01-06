import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  User,
  Calendar,
  MapPin,
  Flag,
  Shield,
  AlertTriangle,
  Clock,
  FileText,
  MessageSquare,
  Ban,
  AlertCircle,
  CheckCircle,
  XCircle,
  Edit,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { useAuth } from '../../contexts/AuthContext';

interface ReportDetails {
  id: string;
  reporter_id: string;
  reporter_name: string;
  reporter_anonymous: boolean;
  reported_user_id: string;
  reported_user_name: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  incident_location: string;
  incident_date: string;
  priority: number;
  created_at: string;
  resolution_notes: string;
  resolved_at: string;
  resolved_by: string;
}

interface UserHistory {
  total_reports_against: number;
  active_warnings: number;
  suspensions: number;
  previous_incidents: any[];
}

export default function SafetyReportDetail() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [report, setReport] = useState<ReportDetails | null>(null);
  const [userHistory, setUserHistory] = useState<UserHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [suspensionReason, setSuspensionReason] = useState('');
  const [suspensionDays, setSuspensionDays] = useState('7');
  const [suspensionType, setSuspensionType] = useState('temporary');
  const [warningMessage, setWarningMessage] = useState('');
  const [warningLevel, setWarningLevel] = useState('1');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/admin');
      return;
    }
    if (reportId) {
      loadReportDetails();
    }
  }, [reportId, isAdmin]);

  const loadReportDetails = async () => {
    try {
      const { data: reportData, error: reportError } = await supabase
        .from('safety_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (reportError) throw reportError;
      setReport(reportData);

      if (reportData.reported_user_id) {
        const [reportsAgainst, warnings, suspensions, previousIncidents] = await Promise.all([
          supabase.from('safety_reports').select('id', { count: 'exact', head: true }).eq('reported_user_id', reportData.reported_user_id),
          supabase.from('safety_warnings').select('id', { count: 'exact', head: true }).eq('user_id', reportData.reported_user_id).eq('acknowledged', false),
          supabase.from('user_suspensions').select('id', { count: 'exact', head: true }).eq('user_id', reportData.reported_user_id).eq('is_active', true),
          supabase.from('safety_reports').select('*').eq('reported_user_id', reportData.reported_user_id).neq('id', reportId).order('created_at', { ascending: false }).limit(5),
        ]);

        setUserHistory({
          total_reports_against: reportsAgainst.count || 0,
          active_warnings: warnings.count || 0,
          suspensions: suspensions.count || 0,
          previous_incidents: previousIncidents.data || [],
        });
      }
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateReportStatus = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('safety_reports')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', reportId);

      if (error) throw error;

      await supabase.from('safety_actions_log').insert({
        action_type: 'status_changed',
        action_description: `Report status changed to ${newStatus}`,
        report_id: reportId,
        performed_by: user?.id,
        performed_by_name: 'Admin',
      });

      loadReportDetails();
      toast.success('Report status updated');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const resolveReport = async () => {
    if (!resolutionNotes.trim()) {
      toast.warning('Please provide resolution notes');
      return;
    }

    try {
      const { error } = await supabase
        .from('safety_reports')
        .update({
          status: 'resolved',
          resolution_notes: resolutionNotes,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (error) throw error;

      await supabase.from('safety_actions_log').insert({
        action_type: 'report_reviewed',
        action_description: 'Report resolved with notes',
        report_id: reportId,
        performed_by: user?.id,
        performed_by_name: 'Admin',
        details: { resolution_notes: resolutionNotes },
      });

      toast.success('Report resolved successfully');
      loadReportDetails();
      setResolutionNotes('');
    } catch (error) {
      console.error('Error resolving report:', error);
      toast.error('Failed to resolve report');
    }
  };

  const suspendUser = async () => {
    if (!suspensionReason.trim()) {
      toast.warning('Please provide a suspension reason');
      return;
    }

    try {
      const endDate = suspensionType === 'permanent'
        ? null
        : new Date(Date.now() + parseInt(suspensionDays) * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('user_suspensions')
        .insert({
          user_id: report?.reported_user_id,
          suspension_type: suspensionType,
          reason: suspensionReason,
          admin_notes: `Related to report ${reportId}`,
          end_date: endDate,
          report_ids: [reportId],
          suspended_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('safety_actions_log').insert({
        action_type: 'user_suspended',
        action_description: `User suspended for ${suspensionDays} days`,
        report_id: reportId,
        user_id: report?.reported_user_id,
        suspension_id: data.id,
        performed_by: user?.id,
        performed_by_name: 'Admin',
      });

      toast.success('User suspended successfully');
      setShowSuspendModal(false);
      loadReportDetails();
    } catch (error) {
      console.error('Error suspending user:', error);
      toast.error('Failed to suspend user');
    }
  };

  const issueWarning = async () => {
    if (!warningMessage.trim()) {
      toast.warning('Please provide a warning message');
      return;
    }

    try {
      const { error } = await supabase
        .from('safety_warnings')
        .insert({
          user_id: report?.reported_user_id,
          warning_level: parseInt(warningLevel),
          warning_type: report?.category || 'general',
          message: warningMessage,
          report_id: reportId,
          issued_by: user?.id,
        });

      if (error) throw error;

      await supabase.from('safety_actions_log').insert({
        action_type: 'user_warned',
        action_description: `Level ${warningLevel} warning issued`,
        report_id: reportId,
        user_id: report?.reported_user_id,
        performed_by: user?.id,
        performed_by_name: 'Admin',
      });

      toast.success('Warning issued successfully');
      setShowWarningModal(false);
      loadReportDetails();
    } catch (error) {
      console.error('Error issuing warning:', error);
      toast.error('Failed to issue warning');
    }
  };

  const createIncident = async () => {
    try {
      const incidentNumber = `INC-${new Date().getFullYear()}-${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`;

      const { error } = await supabase
        .from('safety_incidents')
        .insert({
          incident_number: incidentNumber,
          title: report?.title || 'Safety Incident',
          description: report?.description || '',
          severity: report?.severity || 'medium',
          category: report?.category || 'other',
          reported_user_id: report?.reported_user_id,
          related_report_ids: [reportId],
          investigator_id: user?.id,
          investigation_started_at: new Date().toISOString(),
        });

      if (error) throw error;

      await supabase.from('safety_actions_log').insert({
        action_type: 'incident_created',
        action_description: `Created incident ${incidentNumber}`,
        report_id: reportId,
        performed_by: user?.id,
        performed_by_name: 'Admin',
      });

      toast.success('Incident created successfully');
      setShowIncidentModal(false);
      updateReportStatus('investigating');
    } catch (error) {
      console.error('Error creating incident:', error);
      toast.error('Failed to create incident');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Report not found</p>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <AdminLayout
      title="Safety Report Details"
      subtitle={`Report ID: ${report.id.slice(0, 8)}`}
    >
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Report Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report Header */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${getSeverityColor(report.severity)}`}>
                  {report.severity?.toUpperCase()}
                </span>
                <span className="px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                  {report.status?.replace('_', ' ')?.toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-blue-600">Priority: {report.priority}</span>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">{report.title || 'Untitled Report'}</h2>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-2 text-gray-600">
                <User className="w-5 h-5" />
                <div>
                  <p className="text-xs text-gray-500">Reported User</p>
                  <p className="font-medium">{report.reported_user_name || 'Unknown'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-5 h-5" />
                <div>
                  <p className="text-xs text-gray-500">Submitted</p>
                  <p className="font-medium">{new Date(report.created_at).toLocaleString()}</p>
                </div>
              </div>
              {report.incident_location && (
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-5 h-5" />
                  <div>
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="font-medium">{report.incident_location}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <Flag className="w-5 h-5" />
                <div>
                  <p className="text-xs text-gray-500">Category</p>
                  <p className="font-medium capitalize">{report.category?.replace('_', ' ') || 'General'}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{report.description}</p>
            </div>

            {report.resolution_notes && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Resolution Notes
                </h3>
                <p className="text-green-800">{report.resolution_notes}</p>
                {report.resolved_at && (
                  <p className="text-sm text-green-600 mt-2">
                    Resolved on {new Date(report.resolved_at).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Actions</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <button
                onClick={() => setShowWarningModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
              >
                <AlertTriangle className="w-5 h-5" />
                Issue Warning
              </button>
              <button
                onClick={() => setShowSuspendModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                <Ban className="w-5 h-5" />
                Suspend User
              </button>
              <button
                onClick={() => setShowIncidentModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                <Flag className="w-5 h-5" />
                Create Incident
              </button>
              <button
                onClick={() => updateReportStatus('investigating')}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <MessageSquare className="w-5 h-5" />
                Start Investigation
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="font-medium text-gray-900 mb-3">Resolve Report</h4>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Enter resolution notes..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
              />
              <div className="flex gap-3 mt-3">
                <button
                  onClick={resolveReport}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Resolve Report
                </button>
                <button
                  onClick={() => updateReportStatus('dismissed')}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Reporter Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Reporter Information</h3>
            <div className="space-y-3">
              {report.reporter_anonymous ? (
                <p className="text-gray-600 italic">Anonymous Report</p>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-gray-500">Reporter</p>
                    <p className="font-medium">{report.reporter_name || 'System'}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* User History */}
          {userHistory && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                User History
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Reports Against</span>
                  <span className="font-bold text-red-600">{userHistory.total_reports_against}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Active Warnings</span>
                  <span className="font-bold text-orange-600">{userHistory.active_warnings}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Suspensions</span>
                  <span className="font-bold text-red-600">{userHistory.suspensions}</span>
                </div>
              </div>

              {userHistory.previous_incidents.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-900 mb-2">Previous Incidents</p>
                  <div className="space-y-2">
                    {userHistory.previous_incidents.map((incident) => (
                      <div key={incident.id} className="text-sm">
                        <p className="font-medium text-gray-700">{incident.title || 'Incident'}</p>
                        <p className="text-gray-500 text-xs">{new Date(incident.created_at).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Suspend User Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Suspend User</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Suspension Type</label>
                <select
                  value={suspensionType}
                  onChange={(e) => setSuspensionType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="temporary">Temporary</option>
                  <option value="permanent">Permanent</option>
                  <option value="pending_review">Pending Review</option>
                </select>
              </div>
              {suspensionType === 'temporary' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duration (days)</label>
                  <input
                    type="number"
                    value={suspensionDays}
                    onChange={(e) => setSuspensionDays(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    min="1"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                <textarea
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={4}
                  placeholder="Explain the reason for suspension..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={suspendUser}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Suspend User
              </button>
              <button
                onClick={() => setShowSuspendModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Issue Warning</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Warning Level</label>
                <select
                  value={warningLevel}
                  onChange={(e) => setWarningLevel(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="1">Level 1 - Minor</option>
                  <option value="2">Level 2 - Serious</option>
                  <option value="3">Level 3 - Final Warning</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Warning Message</label>
                <textarea
                  value={warningMessage}
                  onChange={(e) => setWarningMessage(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={4}
                  placeholder="Enter warning message for user..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={issueWarning}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
              >
                Issue Warning
              </button>
              <button
                onClick={() => setShowWarningModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Incident Modal */}
      {showIncidentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Create Safety Incident</h3>
            <p className="text-gray-600 mb-6">
              This will create a formal incident record and start an investigation. The report will be linked to the incident.
            </p>
            <div className="flex gap-3">
              <button
                onClick={createIncident}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                Create Incident
              </button>
              <button
                onClick={() => setShowIncidentModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
