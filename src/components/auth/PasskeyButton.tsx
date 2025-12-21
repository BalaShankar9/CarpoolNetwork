import { useState, useEffect } from 'react';
import { Fingerprint, Loader2 } from 'lucide-react';
import { isPasskeySupported } from '../../services/passkeyService';

interface PasskeyButtonProps {
  onPasskeyLogin: () => Promise<void>;
  disabled?: boolean;
}

export default function PasskeyButton({ onPasskeyLogin, disabled = false }: PasskeyButtonProps) {
  const [loading, setLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(isPasskeySupported());
  }, []);

  const handleClick = async () => {
    setLoading(true);
    try {
      await onPasskeyLogin();
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || loading}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3.5 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Authenticating...
          </>
        ) : (
          <>
            <Fingerprint className="w-5 h-5" />
            Sign in with Passkey
          </>
        )}
      </button>
      <p className="text-xs text-center text-gray-500">
        Fast and secure. No password needed.
      </p>
    </div>
  );
}
