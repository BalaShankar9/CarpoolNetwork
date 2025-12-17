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
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">{error}</div>
          </div>
        )}

        <div className="space-y-4">
          <SocialAuthButtons
            onGoogleSignIn={handleGoogleSignIn}
            onFacebookSignIn={handleFacebookSignIn}
          />

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">or</span>
            </div>
          </div>

          <PasswordSignupForm onSubmit={handleSignUp} />

          <p className="mt-6 text-xs text-center text-gray-500">
            By continuing, you agree to our{' '}
            <Link to="/terms" className="text-blue-600 hover:text-blue-700">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-blue-600 hover:text-blue-700">
              Privacy Policy
            </Link>
          </p>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 text-center text-sm">
          <span className="text-gray-600">Already have an account? </span>
          <Link to="/signin" className="text-blue-600 hover:text-blue-700 font-semibold">
            Sign in
          </Link>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
