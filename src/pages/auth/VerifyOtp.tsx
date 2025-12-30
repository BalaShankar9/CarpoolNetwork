import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthCard from '../../components/auth/AuthCard';
import OtpVerifyForm from '../../components/auth/OtpVerifyForm';

export default function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const { verifyOTP, signInWithOTP } = useAuth();

  const { identifier, type, isSignup } = location.state || {};

  if (!identifier || !type) {
    return <Navigate to="/signin" replace />;
  }

  const isPhone = type === 'phone';

  const handleVerify = async (code: string) => {
    setError('');
    try {
      const { error } = await verifyOTP(identifier, code, isPhone);
      if (error) {
        setError(error.message);
      } else {
        navigate('/');
      }
    } catch {
      setError('An unexpected error occurred');
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      const { error } = await signInWithOTP(identifier, isPhone);
      if (error) {
        setError(error.message);
      }
    } catch {
      setError('Failed to resend code');
    }
  };

  const handleChangeIdentifier = () => {
    navigate(isSignup ? '/signup' : '/signin');
  };

  return (
    <AuthLayout>
      <AuthCard
        title="Verify Your Code"
        subtitle={`We sent a code to ${isPhone ? 'your phone' : 'your email'}`}
        impactFactsRoute="/verify-otp"
      >
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">{error}</div>
          </div>
        )}

        <OtpVerifyForm
          identifier={identifier}
          identifierType={isPhone ? 'phone' : 'email'}
          onVerify={handleVerify}
          onResend={handleResend}
          onChangeIdentifier={handleChangeIdentifier}
        />
      </AuthCard>
    </AuthLayout>
  );
}
