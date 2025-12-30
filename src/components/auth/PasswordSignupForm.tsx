import { useState, useEffect } from 'react';
import { User, Mail, Phone, Lock, Loader2, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { validateEmail } from '../../services/emailValidation';

interface PasswordSignupFormProps {
  onSubmit: (email: string, password: string, fullName: string, phone: string) => Promise<void>;
  disabled?: boolean;
}

export default function PasswordSignupForm({ onSubmit, disabled = false }: PasswordSignupFormProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailValidating, setEmailValidating] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [emailError, setEmailError] = useState<string>('');

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

  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const passwordValid = Object.values(passwordRequirements).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !fullName.trim() || !phone.trim()) return;
    if (!passwordValid || !passwordsMatch) return;

    setLoading(true);
    try {
      if (emailValid !== true) {
        setEmailValidating(true);
        const result = await validateEmail(email);
        setEmailValid(result.valid);
        setEmailError(result.error || '');
        setEmailValidating(false);

        if (!result.valid) {
          return;
        }
      }
      await onSubmit(email, password, fullName, phone);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
            disabled={disabled || loading}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

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
          <p className="mt-1 text-xs text-red-600">
            {emailError}
          </p>
        )}
        {emailValid === true && (
          <p className="mt-1 text-xs text-green-600">
            Email is valid
          </p>
        )}
      </div>

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
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

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
            disabled={disabled || loading}
            className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            disabled={disabled || loading}
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
            disabled={disabled || loading}
            className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            disabled={disabled || loading}
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

      <button
        type="submit"
        disabled={disabled || loading || !passwordValid || !passwordsMatch}
        className="w-full bg-gradient-to-r from-red-600 to-orange-500 text-white py-3 rounded-xl font-semibold hover:from-red-700 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-500/30"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Creating account...
          </>
        ) : (
          'Create Account'
        )}
      </button>
    </form>
  );
}
