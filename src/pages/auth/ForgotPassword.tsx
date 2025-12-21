import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle, CheckCircle, Mail, Loader2, ArrowLeft, Phone, Shield } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthCard from '../../components/auth/AuthCard';

type RecoveryMethod = 'email' | 'phone';

export default function ForgotPassword() {
  const [recoveryMethod, setRecoveryMethod] = useState<RecoveryMethod>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (recoveryMethod === 'email') {
        const { error } = await resetPassword(email);
        if (error) {
          setError(error.message);
        } else {
          setSuccess(true);
        }
      } else {
        setError('Phone recovery is coming soon. Please use email recovery for now.');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard
        title="Reset Password"
        subtitle="We'll email you a reset link"
        impactFactsRoute="/forgot-password"
        showImpactFacts={!success}
      >
        {error && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl flex items-start gap-3 animate-shake shadow-lg shadow-red-100">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-1 text-sm font-medium">{error}</div>
          </div>
        )}

        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
          }

          .animate-shake {
            animation: shake 0.4s ease-in-out;
          }

          .method-tab {
            transition: all 0.3s ease;
          }

          .method-tab.active {
            background: linear-gradient(135deg, #E53E3E, #F97316);
            color: white;
            box-shadow: 0 4px 12px rgba(229, 62, 62, 0.3);
          }
        `}</style>

        {success ? (
          <div className="text-center py-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full mb-6 shadow-lg">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Check Your {recoveryMethod === 'email' ? 'Email' : 'Phone'}</h3>
            <p className="text-gray-600 mb-2">
              We've sent a password reset {recoveryMethod === 'email' ? 'link' : 'code'} to
            </p>
            <p className="font-semibold text-gray-900 mb-6 text-lg">
              {recoveryMethod === 'email' ? email : phone}
            </p>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-gray-700">
              <Shield className="w-5 h-5 text-red-600 mx-auto mb-2" />
              <p>For security, the link expires in 1 hour. Check your spam folder if you don't see it.</p>
            </div>
            <Link
              to="/signin"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-red-700 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="text-sm text-gray-700">
                  <p className="font-semibold mb-1">Secure Account Recovery</p>
                  <p>Choose your preferred method to reset your password securely.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRecoveryMethod('email')}
                className={`method-tab flex flex-col items-center gap-2 p-4 rounded-xl border-2 ${
                  recoveryMethod === 'email'
                    ? 'active border-transparent'
                    : 'border-gray-200 hover:border-red-300 hover:bg-red-50'
                }`}
              >
                <Mail className="w-6 h-6" />
                <span className="text-sm font-semibold">Email</span>
              </button>
              <button
                type="button"
                onClick={() => setRecoveryMethod('phone')}
                className={`method-tab flex flex-col items-center gap-2 p-4 rounded-xl border-2 ${
                  recoveryMethod === 'phone'
                    ? 'active border-transparent'
                    : 'border-gray-200 hover:border-red-300 hover:bg-red-50'
                }`}
              >
                <Phone className="w-6 h-6" />
                <span className="text-sm font-semibold">Phone</span>
              </button>
            </div>

            {recoveryMethod === 'email' ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      disabled={loading}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed transition-all"
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">We'll send a secure reset link to this email</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+44 7700 900000"
                      required
                      disabled={loading}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed transition-all"
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">We'll send a verification code via SMS</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (recoveryMethod === 'email' ? !email.trim() : !phone.trim())}
              className="w-full bg-gradient-to-r from-red-600 to-orange-500 text-white py-3 rounded-xl font-semibold hover:from-red-700 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-500/30 hover:shadow-xl"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  Send {recoveryMethod === 'email' ? 'Reset Link' : 'Verification Code'}
                </>
              )}
            </button>

            <div className="text-center">
              <Link
                to="/signin"
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-700 font-medium transition-all hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </AuthCard>
    </AuthLayout>
  );
}
