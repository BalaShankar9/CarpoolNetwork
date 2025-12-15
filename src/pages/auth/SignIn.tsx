import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthCard from '../../components/auth/AuthCard';
import PasskeyButton from '../../components/auth/PasskeyButton';
import SocialAuthButtons from '../../components/auth/SocialAuthButtons';
import PasswordLoginForm from '../../components/auth/PasswordLoginForm';
import OtpRequestForm from '../../components/auth/OtpRequestForm';

type AuthMode = 'password' | 'otp';

export default function SignIn() {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState<AuthMode>('password');
  const [error, setError] = useState('');
  const { signIn, signInWithGoogle, signInWithFacebook, signInWithOTP } = useAuth();

  const handlePasskeyLogin = async () => {
    setError('');
    try {
      setError('Passkey authentication is not yet configured. Please use another sign-in method.');
    } catch (err) {
      setError('Passkey authentication failed. Please try another method.');
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }
  };

  const handleFacebookSignIn = async () => {
    setError('');
    try {
      const { error } = await signInWithFacebook();
      if (error) {
        setError(error.message);
      }
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
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
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">{error}</div>
          </div>
        )}

        <div className="space-y-4">
          <PasskeyButton onPasskeyLogin={handlePasskeyLogin} />

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">or</span>
            </div>
          </div>

          <SocialAuthButtons
            onGoogleSignIn={handleGoogleSignIn}
            onFacebookSignIn={handleFacebookSignIn}
          />

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">or continue with</span>
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
              <div className="mb-4 text-sm text-gray-600 text-center">
                We'll send a one-time code to your email or phone.
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

        <div className="mt-6 pt-6 border-t border-gray-200 text-center text-sm">
          <span className="text-gray-600">Don't have an account? </span>
          <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-semibold">
            Sign up
          </Link>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
