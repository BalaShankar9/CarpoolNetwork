import { useEffect, useRef, useState } from 'react';
import { Phone, ChevronDown, Loader2, Search, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { countryCodes, CountryCode, defaultCountry } from '../../data/countryCodes';
import { normalizePhoneNumber } from '../../utils/phone';

interface PhoneVerificationStepProps {
  onVerified: (phoneE164: string) => void | Promise<void>;
  disabled?: boolean;
}

export default function PhoneVerificationStep({ onVerified, disabled = false }: PhoneVerificationStepProps) {
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(defaultCountry);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const filteredCountries = countryCodes.filter((country) =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.dialCode.includes(searchQuery) ||
    country.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const phoneNormalization = normalizePhoneNumber(phoneNumber, selectedCountry.dialCode);
  const fullPhoneNumber =
    phoneNormalization.e164 || `${selectedCountry.dialCode}${phoneNumber.replace(/^0+/, '')}`;

  const sendOtp = async () => {
    if (!phoneNormalization.isValid || !phoneNormalization.e164) {
      setError(phoneNormalization.error || 'Enter a valid phone number.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        phone: phoneNormalization.e164,
      });

      if (updateError) {
        setError(updateError.message || 'Failed to send verification code.');
        return;
      }

      setOtpSent(true);
      setCooldown(60);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch {
      setError('Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (code: string) => {
    if (!phoneNormalization.e164) return;
    setVerifying(true);
    setError('');

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: phoneNormalization.e164,
        token: code,
        type: 'phone_change',
      });

      if (verifyError) {
        setError('Invalid verification code. Please try again.');
        setOtp(['', '', '', '', '', '']);
        otpInputRefs.current[0]?.focus();
        return;
      }

      setVerified(true);
      await onVerified(phoneNormalization.e164);
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every((digit) => digit !== '') && newOtp.join('').length === 6) {
      verifyOtp(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      verifyOtp(pastedData);
    }
  };

  const handleResend = () => {
    if (cooldown > 0) return;
    sendOtp();
  };

  const handleChangeNumber = () => {
    setOtpSent(false);
    setVerified(false);
    setOtp(['', '', '', '', '', '']);
    setError('');
  };

  if (verified) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Phone Number
        </label>
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-lg">{selectedCountry.flag}</span>
            <span className="text-gray-700">{fullPhoneNumber}</span>
          </div>
          <CheckCircle className="w-5 h-5 text-green-600 ml-auto" />
        </div>
        <p className="text-xs text-green-600 font-medium">
          Phone number verified successfully
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Phone Number
        </label>

        <div className="flex gap-2">
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => !disabled && !otpSent && setShowCountryDropdown(!showCountryDropdown)}
              disabled={disabled || otpSent}
              className={`flex items-center gap-1 px-3 py-3 border rounded-xl bg-white hover:bg-gray-50 transition-colors min-w-[100px] ${
                disabled || otpSent ? 'opacity-50 cursor-not-allowed' : ''
              } ${showCountryDropdown ? 'border-red-500 ring-2 ring-red-500' : 'border-gray-300'}`}
              data-testid="onboarding-phone-country"
            >
              <span className="text-lg">{selectedCountry.flag}</span>
              <span className="text-sm text-gray-700">{selectedCountry.dialCode}</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showCountryDropdown && (
              <div className="absolute z-50 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-hidden">
                <div className="p-2 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search country..."
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="overflow-y-auto max-h-48">
                  {filteredCountries.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => {
                        setSelectedCountry(country);
                        setShowCountryDropdown(false);
                        setSearchQuery('');
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors ${
                        selectedCountry.code === country.code ? 'bg-red-50' : ''
                      }`}
                    >
                      <span className="text-lg">{country.flag}</span>
                      <span className="text-sm text-gray-700 flex-1 text-left">{country.name}</span>
                      <span className="text-sm text-gray-500">{country.dialCode}</span>
                    </button>
                  ))}
                  {filteredCountries.length === 0 && (
                    <p className="px-3 py-4 text-sm text-gray-500 text-center">No countries found</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d\s-]/g, ''))}
              placeholder="7700 900000"
              disabled={disabled || otpSent}
              data-testid="onboarding-phone-input"
              className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed ${
                error && !otpSent ? 'border-red-300' : 'border-gray-300'
              }`}
            />
          </div>
        </div>

        {!otpSent && (
          <>
            <p className="mt-1 text-xs text-gray-600">
              We'll send a verification code to this number
            </p>

            <button
              type="button"
              onClick={sendOtp}
              disabled={disabled || loading || !phoneNormalization.isValid}
              data-testid="onboarding-phone-send"
              className="mt-3 w-full bg-gray-100 text-gray-700 py-2.5 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending code...
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4" />
                  Send Verification Code
                </>
              )}
            </button>
          </>
        )}
      </div>

      {otpSent && !verified && (
        <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              Enter verification code
            </p>
            <p className="text-xs text-gray-600">
              We sent a 6-digit code to {fullPhoneNumber}
            </p>
          </div>

          <div className="flex justify-center gap-2">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (otpInputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                onPaste={handleOtpPaste}
                disabled={disabled || verifying}
                data-testid={`onboarding-phone-otp-${index}`}
                className={`w-11 h-12 text-center text-xl font-semibold border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100 ${
                  error ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
            ))}
          </div>

          {verifying && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Verifying...
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={handleChangeNumber}
              disabled={disabled || verifying}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              Change number
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={disabled || verifying || cooldown > 0}
              className={`font-medium ${
                cooldown > 0 ? 'text-gray-400' : 'text-red-600 hover:text-red-700'
              } transition-colors`}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
