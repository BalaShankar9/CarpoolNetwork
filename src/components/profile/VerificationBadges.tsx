import { CheckCircle, Mail, Phone, Shield, FileText, Camera, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface VerificationStatus {
  id: string;
  label: string;
  icon: typeof CheckCircle;
  verified: boolean;
  description: string;
  actionLabel?: string;
  actionLink?: string;
}

export default function VerificationBadges() {
  const { profile } = useAuth();
  const [hasDriverLicense, setHasDriverLicense] = useState(false);
  const [hasInsurance, setHasInsurance] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      checkDocuments();
    }
  }, [profile?.id]);

  const checkDocuments = async () => {
    try {
      const [licenseResult, insuranceResult] = await Promise.all([
        supabase
          .from('driver_licenses')
          .select('id, status')
          .eq('user_id', profile?.id)
          .eq('status', 'verified')
          .maybeSingle(),
        supabase
          .from('vehicle_insurance')
          .select('id, status')
          .eq('user_id', profile?.id)
          .eq('status', 'active')
          .maybeSingle()
      ]);

      setHasDriverLicense(!!licenseResult.data);
      setHasInsurance(!!insuranceResult.data);
    } catch (err) {
      console.error('Error checking documents:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  const verifications: VerificationStatus[] = [
    {
      id: 'email',
      label: 'Email Verified',
      icon: Mail,
      verified: profile.is_verified || false,
      description: 'Email address confirmed',
      actionLabel: 'Verify Email',
      actionLink: '/verify-email'
    },
    {
      id: 'phone',
      label: 'Phone Verified',
      icon: Phone,
      verified: !!profile.phone,
      description: 'Phone number added',
      actionLabel: 'Add Phone',
      actionLink: '#edit-profile'
    },
    {
      id: 'face',
      label: 'Face Verified',
      icon: Camera,
      verified: !!(profile as any).profile_verified,
      description: 'Identity verified with face photo',
      actionLabel: 'Upload Photo',
      actionLink: '#profile-photo'
    },
    {
      id: 'license',
      label: 'Driver License',
      icon: FileText,
      verified: hasDriverLicense,
      description: 'Driver license verified',
      actionLabel: 'Upload License',
      actionLink: '#documents'
    },
    {
      id: 'insurance',
      label: 'Insurance',
      icon: Shield,
      verified: hasInsurance,
      description: 'Vehicle insurance on file',
      actionLabel: 'Upload Insurance',
      actionLink: '#documents'
    }
  ];

  const verifiedCount = verifications.filter(v => v.verified).length;
  const totalCount = verifications.length;
  const trustScore = Math.round((verifiedCount / totalCount) * 100);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 md:p-8 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Verification Status
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Increase trust by verifying your identity
          </p>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-bold ${
            trustScore >= 80 ? 'text-green-600' :
            trustScore >= 50 ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {trustScore}
          </div>
          <div className="text-xs text-gray-600 font-medium">Trust Score</div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {verifications.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded-lg border-2 transition-all ${
              item.verified
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200 hover:border-blue-300'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-full ${
                item.verified ? 'bg-green-100' : 'bg-gray-200'
              }`}>
                {item.verified ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-400" />
                )}
              </div>
              {item.verified && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                  Verified
                </span>
              )}
            </div>
            <h4 className={`font-semibold mb-1 ${
              item.verified ? 'text-green-900' : 'text-gray-900'
            }`}>
              {item.label}
            </h4>
            <p className={`text-xs mb-3 ${
              item.verified ? 'text-green-700' : 'text-gray-600'
            }`}>
              {item.description}
            </p>
            {!item.verified && item.actionLabel && (
              <a
                href={item.actionLink}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                {item.actionLabel} →
              </a>
            )}
          </div>
        ))}
      </div>

      <div className={`p-4 rounded-lg border ${
        trustScore >= 80 ? 'bg-green-50 border-green-200' :
        trustScore >= 50 ? 'bg-yellow-50 border-yellow-200' :
        'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-start gap-3">
          <Shield className={`w-5 h-5 flex-shrink-0 ${
            trustScore >= 80 ? 'text-green-600' :
            trustScore >= 50 ? 'text-yellow-600' :
            'text-red-600'
          }`} />
          <div>
            <p className={`text-sm font-medium ${
              trustScore >= 80 ? 'text-green-900' :
              trustScore >= 50 ? 'text-yellow-900' :
              'text-red-900'
            }`}>
              {trustScore >= 80 && 'Excellent! Your profile is highly trusted.'}
              {trustScore >= 50 && trustScore < 80 && 'Good progress! Complete more verifications to increase trust.'}
              {trustScore < 50 && 'Start verifying your profile to build trust with other users.'}
            </p>
            <p className={`text-xs mt-1 ${
              trustScore >= 80 ? 'text-green-700' :
              trustScore >= 50 ? 'text-yellow-700' :
              'text-red-700'
            }`}>
              {verifiedCount} of {totalCount} verifications complete
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
