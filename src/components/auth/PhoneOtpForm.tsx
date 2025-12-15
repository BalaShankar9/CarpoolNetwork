import { useState } from 'react';
import { Phone, Loader2, Mail } from 'lucide-react';

interface PhoneOtpFormProps {
  onSendOTP: (phone: string) => Promise<void>;
  onSwitchToEmail?: () => void;
  disabled?: boolean;
}

export default function PhoneOtpForm({
  onSendOTP,
  onSwitchToEmail,
  disabled = false,
}: PhoneOtpFormProps) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    setLoading(true);
    try {
      await onSendOTP(phone);
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned.startsWith('44') && cleaned.length > 0) {
      return '+44' + cleaned;
    }
    return '+' + cleaned;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-600">
        We'll text you a one-time code.
      </p>

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
            disabled={disabled || loading}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">Include country code (e.g., +44 for UK)</p>
      </div>

      <button
        type="submit"
        disabled={disabled || loading || !phone.trim()}
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

      {onSwitchToEmail && (
        <div className="text-center text-sm">
          <button
            type="button"
            onClick={onSwitchToEmail}
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mx-auto"
          >
            <Mail className="w-4 h-4" />
            Use email instead
          </button>
        </div>
      )}
    </form>
  );
}
