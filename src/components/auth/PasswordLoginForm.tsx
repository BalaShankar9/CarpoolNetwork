import { useState } from 'react';
import { Mail, Lock, Loader2, Eye, EyeOff, Shield } from 'lucide-react';

interface PasswordLoginFormProps {
  onSubmit: (identifier: string, password: string, rememberMe: boolean) => Promise<void>;
  disabled?: boolean;
}

export default function PasswordLoginForm({ onSubmit, disabled = false }: PasswordLoginFormProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) return;

    setLoading(true);
    try {
      await onSubmit(identifier, password, rememberMe);
      setFailedAttempts(0);
    } catch {
      setFailedAttempts(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const isLocked = failedAttempts >= 5;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {failedAttempts >= 3 && failedAttempts < 5 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex items-center gap-2">
          <Shield className="w-4 h-4 flex-shrink-0" />
          <span>{5 - failedAttempts} attempt{5 - failedAttempts !== 1 ? 's' : ''} remaining before temporary lockout</span>
        </div>
      )}

      {isLocked && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          Too many failed attempts. Please try again in a few minutes or use the forgot password option.
        </div>
      )}

      <div>
        <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-2">
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            id="identifier"
            type="email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Enter your email"
            required
            autoComplete="username"
            disabled={disabled || loading || isLocked}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed transition-all hover:border-gray-400"
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
            placeholder="Enter your password"
            required
            autoComplete="current-password"
            disabled={disabled || loading || isLocked}
            className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed transition-all hover:border-gray-400"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            disabled={disabled || loading}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Remember Me */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={disabled || loading || isLocked}
            className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
          />
          <span className="text-sm text-gray-600">Remember me for 30 days</span>
        </label>
      </div>

      <button
        type="submit"
        disabled={disabled || loading || !identifier.trim() || !password.trim() || isLocked}
        className="w-full bg-gradient-to-r from-red-600 to-orange-500 text-white py-3 rounded-xl font-semibold hover:from-red-700 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Signing in...
          </>
        ) : (
          'Sign In'
        )}
      </button>
    </form>
  );
}
