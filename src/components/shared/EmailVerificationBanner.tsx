import { useState } from 'react';
import { Mail, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  action?: string;
}

export default function EmailVerificationBanner({ action = 'perform this action' }: Props) {
  const { user, isEmailVerified, resendVerificationEmail } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [dismissed, setDismissed] = useState(false);

  if (isEmailVerified || dismissed) return null;

  const handleResend = async () => {
    setSending(true);
    setError('');
    const { error } = await resendVerificationEmail();
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setSending(false);
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-amber-800">Email verification required</h3>
          <p className="text-sm text-amber-700 mt-1">
            Please verify your email address to {action}. Check your inbox for the verification link.
          </p>
          {user?.email && (
            <p className="text-xs text-amber-600 mt-1">
              Sent to: {user.email}
            </p>
          )}
          {error && (
            <p className="text-sm text-red-600 mt-2">{error}</p>
          )}
          {sent ? (
            <div className="flex items-center gap-2 mt-3 text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Verification email sent!</span>
            </div>
          ) : (
            <button
              onClick={handleResend}
              disabled={sending}
              className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              <Mail className="w-4 h-4" />
              {sending ? 'Sending...' : 'Resend verification email'}
            </button>
          )}
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-amber-100 rounded transition-colors"
        >
          <X className="w-4 h-4 text-amber-600" />
        </button>
      </div>
    </div>
  );
}

export function useRequiresVerification() {
  const { isEmailVerified } = useAuth();
  return !isEmailVerified;
}
