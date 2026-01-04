import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthCard from '../../components/auth/AuthCard';
import SocialAuthButtons from '../../components/auth/SocialAuthButtons';
import PasswordLoginForm from '../../components/auth/PasswordLoginForm';
import OtpRequestForm from '../../components/auth/OtpRequestForm';

type AuthMode = 'password' | 'otp';

export default function SignIn() {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState<AuthMode>('password');
  const [error, setError] = useState('');
  const { signIn, signInWithGoogle, signInWithGitHub, signInWithOTP } = useAuth();

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setError(error.message);
      }
    } catch {
      setError('An unexpected error occurred');
    }
  };

  const handleGitHubSignIn = async () => {
    setError('');
    try {
      const { error } = await signInWithGitHub();
      if (error) {
        setError(error.message);
      }
    } catch {
      setError('An unexpected error occurred');
    }
  };

  const handlePasswordLogin = async (identifier: string, password: string) => {
    setError('');
    try {
      const isEmail = identifier.includes('@');

      if (!isEmail) {
        setError('Please use your email address for password login, or switch to OTP for phone login.');
        return;
      }

      const { error } = await signIn(identifier, password);
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          setError('Please verify your email before signing in. Check your inbox for the verification link.');
        } else {
          setError(error.message);
        }
      } else {
        navigate('/');
      }
    } catch {
      setError('An unexpected error occurred');
    }
  };

  const handleSendOTP = async (identifier: string, isPhone: boolean) => {
    setError('');
    try {
      const { error } = await signInWithOTP(identifier, isPhone);
      if (error) {
        setError(error.message);
      } else {
        navigate('/verify-otp', {
          state: {
            identifier,
            type: isPhone ? 'phone' : 'email',
            isSignup: false
          }
        });
      }
    } catch {
      setError('An unexpected error occurred');
    }
  };

  return (
    <AuthLayout>
      <AuthCard
        title="Welcome Back"
        subtitle="Sign in to continue carpooling"
        impactFactsRoute="/signin"
      >
        {error && (
          <div
            role="alert"
            className="mb-6 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl flex items-start gap-3 animate-shake shadow-lg shadow-red-100"
          >
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
        `}</style>

        <div className="space-y-4">
          <SocialAuthButtons
            onGoogleSignIn={handleGoogleSignIn}
            onGitHubSignIn={handleGitHubSignIn}
          />

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-400 font-medium">or continue with</span>
            </div>
          </div>

          {authMode === 'password' ? (
            <>
              <PasswordLoginForm onSubmit={handlePasswordLogin} />

              <div className="mt-4 flex items-center justify-between text-sm">
                <Link
                  to="/forgot-password"
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Forgot password?
                </Link>
                <button
                  onClick={() => setAuthMode('otp')}
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Use a one-time code instead
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-4 text-sm text-gray-600 text-center bg-blue-50 border border-blue-100 rounded-xl p-3">
                <span className="font-medium">We'll send a one-time code to your email or phone.</span>
              </div>
              <OtpRequestForm onSendOTP={handleSendOTP} />
              <div className="mt-4 text-center text-sm">
                <button
                  onClick={() => setAuthMode('password')}
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Use password instead
                </button>
              </div>
            </>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm">
          <span className="text-gray-600">Don't have an account? </span>
          <Link
            to="/signup"
            className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-all"
          >
            Sign up
          </Link>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
