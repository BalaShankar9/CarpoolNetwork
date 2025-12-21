import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthCard from '../../components/auth/AuthCard';
import SocialAuthButtons from '../../components/auth/SocialAuthButtons';
import PasswordSignupForm from '../../components/auth/PasswordSignupForm';

export default function SignUp() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const { signUp, signInWithGoogle, signInWithFacebook } = useAuth();

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

  const handleSignUp = async (email: string, password: string, fullName: string, phone: string) => {
    setError('');
    try {
      const { error } = await signUp(email, password, fullName, phone);
      if (error) {
        setError(error.message);
      } else {
        navigate('/');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }
  };

  return (
    <AuthLayout>
      <AuthCard
        title="Create Account"
        subtitle="Join the carpooling community"
        impactFactsRoute="/signup"
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
        `}</style>

        <div className="space-y-4">
          <SocialAuthButtons
            onGoogleSignIn={handleGoogleSignIn}
            onFacebookSignIn={handleFacebookSignIn}
          />

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-400 font-medium">or</span>
            </div>
          </div>

          <PasswordSignupForm onSubmit={handleSignUp} />

          <p className="mt-6 text-xs text-center text-gray-500 bg-gray-50 border border-gray-200 rounded-xl p-3">
            By continuing, you agree to our{' '}
            <Link to="/terms" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm">
          <span className="text-gray-600">Already have an account? </span>
          <Link
            to="/signin"
            className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-all"
          >
            Sign in
          </Link>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
