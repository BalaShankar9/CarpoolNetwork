import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import Logo from '../../components/shared/Logo';

export default function VerifyEmail() {
  const { user, resendVerificationEmail, signOut } = useAuth();
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleResend = async () => {
    setResending(true);
    setMessage('');
    setError('');

    const { error: resendError } = await resendVerificationEmail();

    if (resendError) {
      setError('Failed to resend verification email. Please try again.');
    } else {
      setMessage('Verification email sent! Please check your inbox.');
    }

    setResending(false);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <Logo />
        </div>

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Verify Your Email
          </h1>
          <p className="text-gray-600">
            We've sent a verification link to:
          </p>
          <p className="text-blue-600 font-semibold mt-2">
            {user?.email}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-700">
              <p className="font-semibold mb-1">Please check your email</p>
              <p>Click the verification link in the email we sent you. You may need to check your spam folder.</p>
            </div>
          </div>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-800">{message}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleResend}
          disabled={resending}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4"
        >
          <RefreshCw className={`w-5 h-5 ${resending ? 'animate-spin' : ''}`} />
          {resending ? 'Sending...' : 'Resend Verification Email'}
        </button>

        <button
          onClick={handleSignOut}
          className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
        >
          Sign Out
        </button>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already verified?{' '}
            <button
              onClick={() => window.location.reload()}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Refresh Page
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
