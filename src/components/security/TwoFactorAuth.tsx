import { useState, useEffect } from 'react';
import {
  Shield,
  Smartphone,
  Key,
  Check,
  X,
  Copy,
  AlertCircle,
  Download,
  RefreshCw,
  Lock,
  Unlock,
} from 'lucide-react';
import ConfirmModal from '../shared/ConfirmModal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface TwoFactorStatus {
  enabled: boolean;
  verified_at: string | null;
  last_used_at: string | null;
}

interface RecoveryCode {
  id: string;
  code: string;
  used: boolean;
}

export default function TwoFactorAuth() {
  const { user } = useAuth();
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<RecoveryCode[]>([]);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchTwoFactorStatus();
  }, [user]);

  const fetchTwoFactorStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('two_factor_auth')
        .select('enabled, verified_at, last_used_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      setTwoFactorStatus(data || { enabled: false, verified_at: null, last_used_at: null });
    } catch (error) {
      console.error('Error fetching 2FA status:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSecret = () => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return secret;
  };

  const startSetup = async () => {
    setError('');
    setProcessing(true);

    try {
      const newSecret = generateSecret();
      setSecret(newSecret);

      const issuer = 'CarpoolNetwork';
      const accountName = user?.email || '';
      const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${newSecret}&issuer=${encodeURIComponent(issuer)}`;

      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;
      setQrCodeUrl(qrUrl);

      const { error } = await supabase
        .from('two_factor_auth')
        .upsert({
          user_id: user?.id,
          secret: newSecret,
          enabled: false,
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      setShowSetup(true);
    } catch (error: any) {
      console.error('Error starting 2FA setup:', error);
      setError('Failed to start 2FA setup. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const verifyAndEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setError('');
    setSuccess('');
    setProcessing(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-2fa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          code: verificationCode,
          secret: secret,
        }),
      });

      const result = await response.json();

      if (!result.valid) {
        setError('Invalid verification code. Please try again.');
        return;
      }

      const codes = generateRecoveryCodes();
      const codeHashes = await Promise.all(
        codes.map(async (code) => ({
          user_id: user?.id,
          code_hash: await hashCode(code),
        }))
      );

      const { error: codesError } = await supabase
        .from('two_factor_recovery_codes')
        .insert(codeHashes);

      if (codesError) throw codesError;

      const { error: updateError } = await supabase
        .from('two_factor_auth')
        .update({
          enabled: true,
          verified_at: new Date().toISOString(),
          backup_codes_generated_at: new Date().toISOString(),
        })
        .eq('user_id', user?.id);

      if (updateError) throw updateError;

      await supabase
        .from('two_factor_audit_log')
        .insert({
          user_id: user?.id,
          action: 'enabled',
        });

      setRecoveryCodes(codes.map((code, idx) => ({ id: `${idx}`, code, used: false })));
      setShowRecoveryCodes(true);
      setShowSetup(false);
      setSuccess('Two-factor authentication enabled successfully!');
      fetchTwoFactorStatus();
    } catch (error: any) {
      console.error('Error enabling 2FA:', error);
      setError('Failed to enable 2FA. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  const disable2FA = async () => {
    setShowDisableConfirm(true);
  };

  const confirmDisable2FA = async () => {
    setShowDisableConfirm(false);
    setProcessing(true);
    setError('');

    try {
      const { error: deleteCodesError } = await supabase
        .from('two_factor_recovery_codes')
        .delete()
        .eq('user_id', user?.id);

      if (deleteCodesError) throw deleteCodesError;

      const { error: updateError } = await supabase
        .from('two_factor_auth')
        .update({
          enabled: false,
          secret: null,
          verified_at: null,
        })
        .eq('user_id', user?.id);

      if (updateError) throw updateError;

      await supabase
        .from('two_factor_audit_log')
        .insert({
          user_id: user?.id,
          action: 'disabled',
        });

      setSuccess('Two-factor authentication has been disabled.');
      fetchTwoFactorStatus();
    } catch (error: any) {
      console.error('Error disabling 2FA:', error);
      setError('Failed to disable 2FA. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const generateRecoveryCodes = (): string[] => {
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      let code = '';
      for (let j = 0; j < 8; j++) {
        code += Math.floor(Math.random() * 10);
      }
      codes.push(code);
    }
    return codes;
  };

  const hashCode = async (code: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(code + user?.id);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const copyRecoveryCodes = () => {
    const codesText = recoveryCodes.map(c => c.code).join('\n');
    navigator.clipboard.writeText(codesText);
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const downloadRecoveryCodes = () => {
    const codesText = recoveryCodes.map(c => c.code).join('\n');
    const blob = new Blob([`Carpool Network Recovery Codes\nGenerated: ${new Date().toLocaleString()}\n\n${codesText}\n\nStore these codes in a safe place. Each code can only be used once.`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'carpool-recovery-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-lg ${twoFactorStatus?.enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
              <Shield className={`w-6 h-6 ${twoFactorStatus?.enabled ? 'text-green-600' : 'text-gray-600'}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Two-Factor Authentication</h3>
              <p className="text-sm text-gray-600">
                Add an extra layer of security to your account
              </p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            twoFactorStatus?.enabled
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {twoFactorStatus?.enabled ? (
              <span className="flex items-center space-x-1">
                <Lock className="w-3 h-3" />
                <span>Enabled</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1">
                <Unlock className="w-3 h-3" />
                <span>Disabled</span>
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2 text-green-800">
            <Check className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{success}</span>
          </div>
        )}

        {!twoFactorStatus?.enabled && !showSetup && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Why enable 2FA?</h4>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start space-x-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Protects your account even if your password is compromised</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Prevents unauthorized access to your rides and messages</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Compatible with Google Authenticator, Authy, and other TOTP apps</span>
                </li>
              </ul>
            </div>
            <button
              onClick={startSetup}
              disabled={processing}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            >
              {processing ? 'Setting up...' : 'Enable Two-Factor Authentication'}
            </button>
          </div>
        )}

        {twoFactorStatus?.enabled && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                Your account is protected with two-factor authentication.
              </p>
              {twoFactorStatus.last_used_at && (
                <p className="text-xs text-green-700 mt-2">
                  Last used: {new Date(twoFactorStatus.last_used_at).toLocaleString()}
                </p>
              )}
            </div>
            <button
              onClick={disable2FA}
              disabled={processing}
              className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
            >
              {processing ? 'Disabling...' : 'Disable Two-Factor Authentication'}
            </button>
          </div>
        )}
      </div>

      {showSetup && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Set Up Two-Factor Authentication</h4>

          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </p>
              {qrCodeUrl && (
                <div className="flex justify-center mb-4">
                  <img src={qrCodeUrl} alt="2FA QR Code" className="border border-gray-300 rounded-lg" />
                </div>
              )}
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Or enter this code manually:</p>
                <p className="text-sm font-mono text-gray-900 break-all">{secret}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter the 6-digit code from your app
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl font-mono tracking-widest"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowSetup(false);
                  setVerificationCode('');
                  setSecret('');
                }}
                disabled={processing}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={verifyAndEnable}
                disabled={processing || verificationCode.length !== 6}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {processing ? 'Verifying...' : 'Verify & Enable'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRecoveryCodes && recoveryCodes.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Key className="w-5 h-5 text-yellow-600" />
            <h4 className="text-lg font-semibold text-gray-900">Recovery Codes</h4>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800 font-medium mb-2">Important: Save these codes now!</p>
            <p className="text-sm text-yellow-800">
              Store these recovery codes in a safe place. Each code can only be used once to access your account if you lose your authenticator device.
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {recoveryCodes.map((code) => (
                <div key={code.id} className="text-gray-900">
                  {code.code}
                </div>
              ))}
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={copyRecoveryCodes}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
            >
              {copiedCodes ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCodes ? 'Copied!' : 'Copy Codes'}</span>
            </button>
            <button
              onClick={downloadRecoveryCodes}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
          </div>

          <button
            onClick={() => setShowRecoveryCodes(false)}
            className="w-full mt-3 px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            I've saved my recovery codes
          </button>
        </div>
      )}

      {/* Disable 2FA Confirmation Modal */}
      <ConfirmModal
        isOpen={showDisableConfirm}
        onClose={() => setShowDisableConfirm(false)}
        onConfirm={confirmDisable2FA}
        title="Disable Two-Factor Authentication"
        message="Are you sure you want to disable two-factor authentication? This will make your account less secure."
        confirmText="Disable 2FA"
        cancelText="Keep Enabled"
        variant="warning"
        loading={processing}
      />
    </div>
  );
}
