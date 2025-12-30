import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { AlertCircle, CheckCircle, Lock, Eye, EyeOff, Loader2, Check, X } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthCard from '../../components/auth/AuthCard';

interface PasswordRequirement {
  label: string;
  met: boolean;
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordRequirements = useMemo((): PasswordRequirement[] => {
    return [
      { label: 'At least 8 characters', met: password.length >= 8 },
      { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
      { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
      { label: 'Contains a number', met: /[0-9]/.test(password) },
      { label: 'Contains special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
    ];
  }, [password]);

  const passwordStrength = useMemo(() => {
    const metCount = passwordRequirements.filter(req => req.met).length;
    if (metCount === 0) return { label: '', color: '', width: 0 };
    if (metCount <= 2) return { label: 'Weak', color: 'bg-red-500', width: 33 };
    if (metCount <= 3) return { label: 'Fair', color: 'bg-yellow-500', width: 50 };
    if (metCount <= 4) return { label: 'Good', color: 'bg-blue-500', width: 75 };
    return { label: 'Strong', color: 'bg-green-500', width: 100 };
  }, [passwordRequirements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    const allRequirementsMet = passwordRequirements.every(req => req.met);
    if (!allRequirementsMet) {
      setError('Please meet all password requirements');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          navigate('/signin');
        }, 2500);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const allRequirementsMet = passwordRequirements.every(req => req.met);

  return (
    <AuthLayout>
      <AuthCard
        title="Set New Password"
        subtitle="Choose a strong password"
        impactFactsRoute="/reset-password"
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

          @keyframes confetti {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(-100vh) rotate(720deg); opacity: 0; }
          }

          .confetti-piece {
            animation: confetti 2s ease-out forwards;
          }
        `}</style>

        {success ? (
          <div className="text-center py-8 relative overflow-hidden">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full mb-6 shadow-lg animate-bounce">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Password Updated!</h3>
            <p className="text-gray-600 mb-2 text-lg">
              Your password has been successfully reset.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-sm text-gray-700">
              <p className="font-semibold">🔒 Your account is now secure</p>
            </div>
            <p className="text-sm text-gray-500 animate-pulse">Redirecting to sign in...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  disabled={loading}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {password && (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full ${passwordStrength.color} transition-all duration-300`}
                        style={{ width: `${passwordStrength.width}%` }}
                      />
                    </div>
                    {passwordStrength.label && (
                      <span className={`text-xs font-semibold ${
                        passwordStrength.label === 'Weak' ? 'text-red-600' :
                        passwordStrength.label === 'Fair' ? 'text-yellow-600' :
                        passwordStrength.label === 'Good' ? 'text-blue-600' :
                        'text-green-600'
                      }`}>
                        {passwordStrength.label}
                      </span>
                    )}
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Password Requirements:</p>
                    {passwordRequirements.map((req, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        {req.met ? (
                          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                        <span className={req.met ? 'text-green-700 font-medium' : 'text-gray-600'}>
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  disabled={loading}
                  className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed transition-all ${
                    confirmPassword && (passwordsMatch ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50')
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword && (
                <p className={`mt-1 text-xs ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                  {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !allRequirementsMet || !passwordsMatch}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </button>

            <div className="text-center text-sm">
              <Link to="/signin" className="text-gray-600 hover:text-gray-700 font-medium hover:underline transition-all">
                Cancel
              </Link>
            </div>
          </form>
        )}
      </AuthCard>
    </AuthLayout>
  );
}
