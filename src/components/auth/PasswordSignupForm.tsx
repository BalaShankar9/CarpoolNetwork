import { useState, useEffect, useRef } from 'react';
import { User, Mail, Lock, Loader2, Eye, EyeOff, CheckCircle, XCircle, ChevronDown, Search, Phone, ArrowLeft } from 'lucide-react';
import { validateEmail } from '../../services/emailValidation';
import { countryCodes, CountryCode, defaultCountry } from '../../data/countryCodes';
import { supabase } from '../../lib/supabase';

interface PasswordSignupFormProps {
  onSubmit: (email: string, password: string, fullName: string, phone: string) => Promise<void>;
  disabled?: boolean;
}

type SignupStep = 'details' | 'phone-verify' | 'creating';

export default function PasswordSignupForm({ onSubmit, disabled = false }: PasswordSignupFormProps) {
  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState<SignupStep>('details');

  // Email validation
  const [emailValidating, setEmailValidating] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [emailError, setEmailError] = useState<string>('');

  // Phone/Country
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(defaultCountry);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Phone OTP
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // General
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Email validation effect
  useEffect(() => {
    if (!email || email.length < 3) {
      setEmailValid(null);
      setEmailError('');
      return;
    }

    const timeoutId = setTimeout(async () => {
      setEmailValidating(true);
      setEmailError('');
      const result = await validateEmail(email);
      setEmailValid(result.valid);
      if (!result.valid && result.error) {
        setEmailError(result.error);
      }
      setEmailValidating(false);
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [email]);

  // Close dropdown on outside click
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

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const passwordRequirements = {
    length: password.length >= 6,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    digit: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };

  const passwordRequirementList = [
    { label: 'At least 6 characters', met: passwordRequirements.length },
    { label: 'One lowercase letter', met: passwordRequirements.lowercase },
    { label: 'One uppercase letter', met: passwordRequirements.uppercase },
    { label: 'One number', met: passwordRequirements.digit },
    { label: 'One symbol', met: passwordRequirements.symbol },
  ];

  const emailsMatch = email && confirmEmail && email.toLowerCase() === confirmEmail.toLowerCase();
  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const passwordValid = Object.values(passwordRequirements).every(Boolean);

  const fullPhoneNumber = `${selectedCountry.dialCode}${phoneNumber.replace(/^0+/, '').replace(/\D/g, '')}`;

  const isValidPhoneNumber = () => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    return cleaned.length >= 7 && cleaned.length <= 15;
  };

  const filteredCountries = countryCodes.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.dialCode.includes(searchQuery) ||
    country.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canProceedToPhoneVerification =
    fullName.trim() &&
    emailsMatch &&
    emailValid === true &&
    isValidPhoneNumber() &&
    passwordValid &&
    passwordsMatch;

  // Handle proceeding to phone verification
  const handleProceedToVerification = async () => {
    if (!canProceedToPhoneVerification) return;

    setStep('phone-verify');
    await sendOTP();
  };

  // Send OTP
  const sendOTP = async () => {
    setOtpSending(true);
    setPhoneError('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhoneNumber,
      });

      if (error) {
        if (error.message.includes('rate limit')) {
          setPhoneError('Too many attempts. Please wait a moment.');
        } else {
          setPhoneError(error.message || 'Failed to send verification code');
        }
      } else {
        setCooldown(60);
        setOtp(['', '', '', '', '', '']);
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
      }
    } catch (err) {
      setPhoneError('Failed to send verification code. Please try again.');
    } finally {
      setOtpSending(false);
    }
  };

  // Handle OTP input
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) {
      verifyOTP(newOtp.join(''));
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
      verifyOTP(pastedData);
    }
  };

  // Verify OTP
  const verifyOTP = async (code: string) => {
    setOtpVerifying(true);
    setPhoneError('');

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: fullPhoneNumber,
        token: code,
        type: 'sms',
      });

      if (error) {
        setPhoneError('Invalid verification code. Please try again.');
        setOtp(['', '', '', '', '', '']);
        otpInputRefs.current[0]?.focus();
      } else {
        // Phone verified! Now sign out from phone auth and create email account
        await supabase.auth.signOut();
        setPhoneVerified(true);
        // Proceed to create account
        await createAccount();
      }
    } catch (err) {
      setPhoneError('Verification failed. Please try again.');
    } finally {
      setOtpVerifying(false);
    }
  };

  // Create account after phone verification
  const createAccount = async () => {
    setStep('creating');
    setLoading(true);
    setGeneralError('');

    try {
      await onSubmit(email, password, fullName, fullPhoneNumber);
    } catch (err: any) {
      setGeneralError(err.message || 'Failed to create account. Please try again.');
      setStep('phone-verify');
    } finally {
      setLoading(false);
    }
  };

  // Go back to details
  const handleBackToDetails = () => {
    setStep('details');
    setOtp(['', '', '', '', '', '']);
    setPhoneError('');
  };

  // Render Step 1: Details
  if (step === 'details') {
    return (
      <form onSubmit={(e) => { e.preventDefault(); handleProceedToVerification(); }} className="space-y-4">
        {/* Full Name */}
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
            Full Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              required
              disabled={disabled}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Email */}
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
              disabled={disabled}
              className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed ${
                emailValid === false ? 'border-red-300 bg-red-50' : emailValid === true ? 'border-green-300 bg-green-50' : 'border-gray-300'
              }`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {emailValidating && <Loader2 className="w-5 h-5 text-red-500 animate-spin" />}
              {!emailValidating && emailValid === true && <CheckCircle className="w-5 h-5 text-green-600" />}
              {!emailValidating && emailValid === false && <XCircle className="w-5 h-5 text-red-600" />}
            </div>
          </div>
          {emailError && (
            <p className="mt-1 text-xs text-red-600 font-medium">
              {emailError}
            </p>
          )}
          {emailValid === true && (
            <p className="mt-1 text-xs text-green-600 font-medium">
              Email verified and can receive messages
            </p>
          )}
          {!emailError && emailValid === null && (
            <p className="mt-1 text-xs text-gray-600">
              We'll verify this email can receive messages
            </p>
          )}
        </div>

        {/* Confirm Email */}
        <div>
          <label htmlFor="confirmEmail" className="block text-sm font-medium text-gray-700 mb-2">
            Confirm Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="confirmEmail"
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder="Confirm your email"
              required
              disabled={disabled}
              className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed ${
                confirmEmail && !emailsMatch ? 'border-red-300 bg-red-50' : confirmEmail && emailsMatch ? 'border-green-300 bg-green-50' : 'border-gray-300'
              }`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {confirmEmail && emailsMatch && <CheckCircle className="w-5 h-5 text-green-600" />}
              {confirmEmail && !emailsMatch && <XCircle className="w-5 h-5 text-red-600" />}
            </div>
          </div>
          {confirmEmail && (
            <p className={`mt-1 text-xs ${emailsMatch ? 'text-green-600' : 'text-red-600'}`}>
              {emailsMatch ? 'Email addresses match' : 'Email addresses do not match'}
            </p>
          )}
        </div>

        {/* Phone Number with Country Code */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number
          </label>
          <div className="flex gap-2">
            {/* Country Code Selector */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => !disabled && setShowCountryDropdown(!showCountryDropdown)}
                disabled={disabled}
                className={`flex items-center gap-1 px-3 py-3 border rounded-xl bg-white hover:bg-gray-50 transition-colors min-w-[100px] ${
                  disabled ? 'opacity-50 cursor-not-allowed' : ''
                } ${showCountryDropdown ? 'border-red-500 ring-2 ring-red-500' : 'border-gray-300'}`}
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

            {/* Phone Input */}
            <div className="flex-1 relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d\s-]/g, ''))}
                placeholder="7700 900000"
                required
                disabled={disabled}
                className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed ${
                  phoneNumber && !isValidPhoneNumber() ? 'border-red-300' : 'border-gray-300'
                }`}
              />
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-600">
            We'll send a verification code to this number
          </p>
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              required
              disabled={disabled}
              className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              disabled={disabled}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {password && (
            <div className="mt-2 space-y-1 text-xs text-gray-600">
              {passwordRequirementList.map((requirement) => (
                <div key={requirement.label} className="flex items-center gap-2">
                  {requirement.met ? (
                    <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-600" />
                  )}
                  <span className={requirement.met ? 'text-green-700' : 'text-red-700'}>
                    {requirement.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              disabled={disabled}
              className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              disabled={disabled}
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {confirmPassword && (
            <p className={`mt-1 text-xs ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
              {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={disabled || !canProceedToPhoneVerification}
          className="w-full bg-gradient-to-r from-red-600 to-orange-500 text-white py-3 rounded-xl font-semibold hover:from-red-700 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-500/30"
        >
          Continue to Phone Verification
        </button>
      </form>
    );
  }

  // Render Step 2: Phone Verification
  if (step === 'phone-verify') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Verify Your Phone</h2>
          <p className="text-gray-600 text-sm">
            We sent a 6-digit code to
          </p>
          <p className="text-blue-600 font-semibold mt-1">
            {selectedCountry.flag} {fullPhoneNumber}
          </p>
        </div>

        {/* OTP Input */}
        <div>
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
                disabled={disabled || otpVerifying || otpSending}
                className={`w-12 h-14 text-center text-2xl font-semibold border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100 ${
                  phoneError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Status */}
          {otpSending && (
            <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending code...
            </div>
          )}
          {otpVerifying && (
            <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Verifying...
            </div>
          )}

          {/* Error */}
          {phoneError && (
            <div className="flex items-center justify-center gap-2 mt-4 text-sm text-red-600">
              <XCircle className="w-4 h-4" />
              {phoneError}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={handleBackToDetails}
            disabled={disabled || otpVerifying || otpSending}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            type="button"
            onClick={sendOTP}
            disabled={disabled || otpVerifying || otpSending || cooldown > 0}
            className={`font-medium ${
              cooldown > 0 ? 'text-gray-400' : 'text-red-600 hover:text-red-700'
            } transition-colors`}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-gray-700">
            <strong>Didn't receive the code?</strong>
            <br />
            Check your SMS messages. The code expires in 10 minutes.
          </p>
        </div>
      </div>
    );
  }

  // Render Step 3: Creating Account
  if (step === 'creating') {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-12 h-12 text-red-500 animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Creating Your Account</h2>
        <p className="text-gray-600">Please wait...</p>

        {generalError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600">{generalError}</p>
          </div>
        )}
      </div>
    );
  }

  return null;
}
