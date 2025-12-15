import { useState } from 'react';
import { Mail, Phone, Loader2 } from 'lucide-react';

interface OtpRequestFormProps {
  onSendOTP: (identifier: string, isPhone: boolean) => Promise<void>;
  disabled?: boolean;
}

export default function OtpRequestForm({ onSendOTP, disabled = false }: OtpRequestFormProps) {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const isPhone = identifier.trim().startsWith('+') || /^\d+$/.test(identifier.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || cooldown > 0) return;

    setLoading(true);
    try {
      await onSendOTP(identifier, isPhone);
      setCooldown(30);
      const interval = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-2">
          Email or Phone Number
        </label>
        <div className="relative">
          {isPhone ? (
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          ) : (
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          )}
          <input
            id="identifier"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Email or phone"
            required
            disabled={disabled || loading || cooldown > 0}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
        </div>
        <p className="mt-1.5 text-xs text-gray-500">
          {isPhone ? 'Include country code (e.g., +44 7700 900000)' : 'We\'ll send a one-time code to your email'}
        </p>
      </div>

      {cooldown > 0 && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2.5 rounded-lg text-sm">
          Please wait {cooldown} seconds before requesting another code.
        </div>
      )}

      <button
        type="submit"
        disabled={disabled || loading || !identifier.trim() || cooldown > 0}
        className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Sending code...
          </>
        ) : (
          'Send Code'
        )}
      </button>
    </form>
  );
}
