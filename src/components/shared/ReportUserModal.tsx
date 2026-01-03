import { useEffect, useState } from 'react';
import { AlertCircle, Flag, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { notify } from '../../lib/toast';

interface ReportUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUser: {
    id: string;
    full_name: string;
  };
  initialTitle?: string;
  initialDescription?: string;
}

const INCIDENT_OPTIONS = [
  { value: 'harassment', label: 'Harassment or abusive behavior' },
  { value: 'unsafe-driving', label: 'Unsafe driving' },
  { value: 'inappropriate-behavior', label: 'Inappropriate behavior' },
  { value: 'other', label: 'Other' },
] as const;

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
] as const;

export default function ReportUserModal({
  isOpen,
  onClose,
  reportedUser,
  initialTitle,
  initialDescription,
}: ReportUserModalProps) {
  const { user, profile } = useAuth();
  const [incidentType, setIncidentType] = useState<typeof INCIDENT_OPTIONS[number]['value']>('harassment');
  const [severity, setSeverity] = useState<typeof SEVERITY_OPTIONS[number]['value']>('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [incidentLocation, setIncidentLocation] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setIncidentType('harassment');
    setSeverity('medium');
    setTitle(initialTitle || '');
    setDescription(initialDescription || '');
    setIncidentDate('');
    setIncidentLocation('');
    setAnonymous(false);
    setError(null);
  }, [isOpen, reportedUser.id, initialTitle, initialDescription]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!user) {
      notify('Please sign in to submit a report.', 'warning');
      return;
    }

    if (!description.trim()) {
      setError('Please describe what happened.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const incidentDateValue = incidentDate
      ? new Date(`${incidentDate}T12:00:00`).toISOString()
      : null;

    const payload = {
      reporter_id: user.id,
      reported_user_id: reportedUser.id,
      incident_type: incidentType,
      description: description.trim(),
      severity,
      status: 'pending',
      reporter_name: profile?.full_name || null,
      reporter_anonymous: anonymous,
      reported_user_name: reportedUser.full_name,
      category: incidentType,
      title: title.trim() || null,
      incident_location: incidentLocation.trim() || null,
      incident_date: incidentDateValue,
    };

    const { error: insertError } = await supabase
      .from('safety_reports')
      .insert(payload);

    if (insertError) {
      console.error('Error submitting report:', insertError);
      setError('Unable to submit report. Please try again.');
      setSubmitting(false);
      return;
    }

    notify('Report submitted. Our safety team will review it shortly.', 'success');
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-200">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Report {reportedUser.full_name}</h2>
              <p className="text-sm text-gray-600">Help us keep the community safe.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700"
            aria-label="Close report modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Incident type</label>
              <select
                value={incidentType}
                onChange={(event) => setIncidentType(event.target.value as typeof incidentType)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                {INCIDENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
              <select
                value={severity}
                onChange={(event) => setSeverity(event.target.value as typeof severity)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                {SEVERITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title (optional)</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Short summary"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Describe what happened</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Share details, time, and context to help us investigate."
              rows={4}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Incident date (optional)</label>
              <input
                type="date"
                value={incidentDate}
                onChange={(event) => setIncidentDate(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location (optional)</label>
              <input
                value={incidentLocation}
                onChange={(event) => setIncidentLocation(event.target.value)}
                placeholder="City, pickup, or route"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(event) => setAnonymous(event.target.checked)}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            Submit anonymously
          </label>
        </div>

        <div className="border-t border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-gray-500">
            Reports are reviewed by our safety team. False reports may lead to restrictions.
          </p>
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              type="button"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
