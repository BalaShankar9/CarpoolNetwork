import { useState } from 'react';
import { Mail, Loader2, Phone as PhoneIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmailOtpFormProps {
  onSendOTP: (email: string) => Promise<void>;
  onSwitchToPhone?: () => void;
  onSwitchToPassword?: () => void;
  disabled?: boolean;
  showPasswordLink?: boolean;
}

export default function EmailOtpForm({
  onSendOTP,
  onSwitchToPhone,
  onSwitchToPassword,
  disabled = false,
  showPasswordLink = false,
}: EmailOtpFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      await onSendOTP(email);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-600">
        We'll send a one-time code to your email.
      </p>

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
            disabled={disabled || loading}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={disabled || loading || !email.trim()}
        className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Sending...
          </>
        ) : (
          'Continue'
        )}
      </button>

      <div className="flex items-center justify-center gap-4 text-sm">
        {onSwitchToPhone && (
          <button
            type="button"
            onClick={onSwitchToPhone}
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <PhoneIcon className="w-4 h-4" />
            Use phone instead
          </button>
        )}
        {showPasswordLink && onSwitchToPassword && (
          <button
            type="button"
            onClick={onSwitchToPassword}
            className="text-gray-600 hover:text-gray-700 font-medium"
          >
            Use password instead
          </button>
        )}
      </div>
    </form>
  );
}
