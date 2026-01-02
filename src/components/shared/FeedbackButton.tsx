import { useState, useEffect } from 'react';
import { Bug, X, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { reportUserBug, logApiError } from '../../services/errorTracking';

export default function FeedbackButton() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const tooltipSeen = localStorage.getItem('bug-report-tooltip-seen');
    if (!tooltipSeen) {
      setShowTooltip(true);
      setTimeout(() => {
        setShowTooltip(false);
        localStorage.setItem('bug-report-tooltip-seen', 'true');
      }, 5000);
    }
  }, []);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim() || !details.trim()) {
      setError('Please add a summary and details.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await reportUserBug({
        summary: summary.trim(),
        details: details.trim(),
        route: window.location.pathname,
        userId: user.id,
        role: 'user',
      });

      if (!result.success) {
        throw new Error(result.message || 'Failed to submit feedback');
      }

      setSuccess(true);
      setSummary('');
      setDetails('');
      setTimeout(() => {
        setSuccess(false);
        setIsOpen(false);
      }, 2000);
    } catch (err: any) {
      console.error('Failed to submit feedback:', err);
      setError(err?.message || 'Failed to submit feedback. Please try again.');
      await logApiError('reportUserBug-client', err, {
        route: window.location.pathname,
        userId: user?.id ?? null,
        role: 'user',
      });
    } finally {
      setLoading(false);
    }
  };

  const bottomOffset = 'calc(var(--app-bottom-nav-height) + 80px + var(--safe-area-inset-bottom))';

  return (
    <>
      <div
        className="fixed right-4 md:right-6 z-[85]"
        style={{ bottom: bottomOffset }}
      >
        <button
          onClick={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOpen(true);
            }
          }}
          className="bg-red-600 text-white p-3 md:p-4 rounded-full shadow-lg hover:bg-red-700 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 animate-pulse"
          title="Report a problem"
          aria-label="Report a problem or bug"
          tabIndex={0}
          style={{ pointerEvents: 'auto' }}
        >
          <Bug className="w-5 h-5 md:w-6 md:h-6" />
        </button>

        {showTooltip && (
          <div className="absolute bottom-full right-0 mb-2 w-48 bg-gray-900 text-white text-sm rounded-lg px-3 py-2 shadow-lg animate-fade-in">
            Found a bug? Click here to report it!
            <div className="absolute -bottom-1 right-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/50" style={{ pointerEvents: 'auto' }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Report a Problem</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {success ? (
              <div className="p-8 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Thank you!</h3>
                <p className="text-gray-600">Your feedback has been submitted.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Summary
                    </label>
                    <input
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      placeholder="Crash while posting a ride"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Describe the problem
                  </label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Describe what went wrong, steps to reproduce, expected behavior..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    required
                  />
                </div>

                <p className="text-xs text-gray-500">
                  Page: {window.location.pathname}
                </p>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !summary.trim() || !details.trim()}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {loading ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
