import { useState, useRef, useEffect } from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';

interface OtpVerifyFormProps {
  identifier: string;
  identifierType: 'email' | 'phone';
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onChangeIdentifier?: () => void;
  disabled?: boolean;
}

export default function OtpVerifyForm({
  identifier,
  identifierType,
  onVerify,
  onResend,
  onChangeIdentifier,
  disabled = false,
}: OtpVerifyFormProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = [...code];
    for (let i = 0; i < pastedData.length; i++) {
      newCode[i] = pastedData[i];
    }
    setCode(newCode);
    inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length !== 6) return;

    setLoading(true);
    try {
      await onVerify(fullCode);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await onResend();
      setResendCooldown(30);
    } finally {
      setResendLoading(false);
    }
  };

  const isComplete = code.every((digit) => digit !== '');

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Enter the 6-digit code sent to
        </p>
        <p className="font-medium text-gray-900 mt-1">{identifier}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
          Verification Code
        </label>
        <div className="flex gap-2 justify-center">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              disabled={disabled || loading}
              className="w-12 h-14 text-center text-xl font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={disabled || loading || !isComplete}
        className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Verifying...
          </>
        ) : (
          'Verify Code'
        )}
      </button>

      <div className="flex items-center justify-center gap-4 text-sm">
        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0 || resendLoading}
          className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resendLoading ? (
            'Sending...'
          ) : resendCooldown > 0 ? (
            `Resend in ${resendCooldown}s`
          ) : (
            'Resend code'
          )}
        </button>

        {onChangeIdentifier && (
          <>
            <span className="text-gray-400">|</span>
            <button
              type="button"
              onClick={onChangeIdentifier}
              className="text-gray-600 hover:text-gray-700 font-medium flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Change {identifierType}
            </button>
          </>
        )}
      </div>
    </form>
  );
}
