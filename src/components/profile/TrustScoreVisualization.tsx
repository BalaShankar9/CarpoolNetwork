import { useState, useEffect } from 'react';
import { Shield, CheckCircle, TrendingUp, Info, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface ScoreBreakdown {
  category: string;
  earned: number;
  possible: number;
  description: string;
  status: 'complete' | 'partial' | 'missing';
}

export default function TrustScoreVisualization() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trustScore, setTrustScore] = useState(0);
  const [licenseVerified, setLicenseVerified] = useState(false);
  const [insuranceActive, setInsuranceActive] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      loadTrustScoreData();
    }
  }, [profile?.id]);

  const loadTrustScoreData = async () => {
    try {
      setLoading(true);

      const [licenseResult, insuranceResult] = await Promise.all([
        supabase
          .from('driver_licenses')
          .select('id, status, expiry_date')
          .eq('user_id', profile?.id)
          .eq('status', 'verified')
          .gte('expiry_date', new Date().toISOString().split('T')[0])
          .maybeSingle(),
        supabase
          .from('vehicle_insurance')
          .select('id, status, expiry_date')
          .eq('user_id', profile?.id)
          .eq('status', 'active')
          .gte('expiry_date', new Date().toISOString().split('T')[0])
          .maybeSingle()
      ]);

      setLicenseVerified(!!licenseResult.data);
      setInsuranceActive(!!insuranceResult.data);
      setTrustScore(profile?.trust_score || 0);
    } catch (err) {
      console.error('Error loading trust score data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshScore = async () => {
    try {
      setRefreshing(true);
      const { data, error } = await supabase.rpc('refresh_my_trust_score');

      if (error) throw error;

      setTrustScore(data || 0);
      await loadTrustScoreData();
    } catch (err: any) {
      console.error('Error refreshing trust score:', err);
    } finally {
      setRefreshing(false);
    }
  };

  if (!profile) return null;

  const completedRides = profile.total_rides_offered + profile.total_rides_taken;
  const accountAgeDays = Math.floor(
    (new Date().getTime() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  const scoreBreakdown: ScoreBreakdown[] = [
    {
      category: 'Email Verification',
      earned: profile.is_verified ? 10 : 0,
      possible: 10,
      description: 'Verified email address',
      status: profile.is_verified ? 'complete' : 'missing'
    },
      {
        category: 'Phone Verification',
        earned: profile.phone_e164 && profile.phone_verified ? 10 : 0,
        possible: 10,
        description: 'Phone verified',
        status: profile.phone_e164 && profile.phone_verified ? 'complete' : 'missing'
      },
    {
      category: 'Profile Photo',
      earned: (profile as any).profile_verified ? 15 : 0,
      possible: 15,
      description: 'Face-verified profile photo',
      status: (profile as any).profile_verified ? 'complete' : 'missing'
    },
    {
      category: 'Driver License',
      earned: licenseVerified ? 20 : 0,
      possible: 20,
      description: 'Valid driver license verified',
      status: licenseVerified ? 'complete' : 'missing'
    },
    {
      category: 'Vehicle Insurance',
      earned: insuranceActive ? 15 : 0,
      possible: 15,
      description: 'Active insurance on file',
      status: insuranceActive ? 'complete' : 'missing'
    },
    {
      category: 'Completed Rides',
      earned: Math.min(completedRides, 15),
      possible: 15,
      description: `${completedRides} rides completed (1 point each, max 15)`,
      status: completedRides >= 15 ? 'complete' : completedRides > 0 ? 'partial' : 'missing'
    },
    {
      category: 'Average Rating',
      earned: Math.round(profile.average_rating * 2),
      possible: 10,
      description: `${profile.average_rating.toFixed(1)} star rating (2 points per star)`,
      status: profile.average_rating >= 4.5 ? 'complete' : profile.average_rating > 0 ? 'partial' : 'missing'
    },
    {
      category: 'Account Age',
      earned: Math.min(Math.floor(accountAgeDays / 30), 5),
      possible: 5,
      description: `${Math.floor(accountAgeDays / 30)} months active (1 point per month, max 5)`,
      status: accountAgeDays >= 150 ? 'complete' : accountAgeDays > 0 ? 'partial' : 'missing'
    }
  ];

  const totalEarned = scoreBreakdown.reduce((sum, item) => sum + item.earned, 0);
  const totalPossible = scoreBreakdown.reduce((sum, item) => sum + item.possible, 0);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'from-green-50 to-emerald-50 border-green-200';
    if (score >= 60) return 'from-blue-50 to-indigo-50 border-blue-200';
    if (score >= 40) return 'from-yellow-50 to-amber-50 border-yellow-200';
    return 'from-red-50 to-rose-50 border-red-200';
  };

  const getStatusColor = (status: string) => {
    if (status === 'complete') return 'bg-green-100 text-green-800';
    if (status === 'partial') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-600';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
            Trust Score
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Your community trust rating based on verifications and activity
          </p>
        </div>
        <button
          onClick={handleRefreshScore}
          disabled={refreshing}
          className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          title="Refresh trust score"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className={`p-6 rounded-xl border bg-gradient-to-r ${getScoreBgColor(trustScore)} mb-6`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className={`text-5xl font-bold ${getScoreColor(trustScore)}`}>
              {trustScore}
            </div>
            <div className="text-sm text-gray-600 mt-1">out of 100 points</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{totalEarned}</div>
            <div className="text-sm text-gray-600">earned</div>
          </div>
        </div>

        <div className="relative w-full h-4 bg-white bg-opacity-50 rounded-full overflow-hidden">
          <div
            className={`absolute top-0 left-0 h-full transition-all duration-500 ${
              trustScore >= 80 ? 'bg-green-500' :
              trustScore >= 60 ? 'bg-blue-500' :
              trustScore >= 40 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${trustScore}%` }}
          />
        </div>

        <div className="mt-4 flex items-start gap-2">
          <Info className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-700">
            {trustScore >= 80 && 'Excellent! Your profile is highly trusted in the community.'}
            {trustScore >= 60 && trustScore < 80 && 'Good work! Complete more verifications to increase your score.'}
            {trustScore >= 40 && trustScore < 60 && 'You\'re building trust. Add more verifications to improve.'}
            {trustScore < 40 && 'Get started by completing verifications and participating in rides.'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5" />
          Score Breakdown
        </h4>

        {scoreBreakdown.map((item, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
          >
            <div className={`p-2 rounded-full ${
              item.status === 'complete' ? 'bg-green-100' :
              item.status === 'partial' ? 'bg-blue-100' :
              'bg-gray-100'
            }`}>
              <CheckCircle className={`w-4 h-4 ${
                item.status === 'complete' ? 'text-green-600' :
                item.status === 'partial' ? 'text-blue-600' :
                'text-gray-400'
              }`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="font-medium text-gray-900">{item.category}</p>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                    {item.earned}/{item.possible} pts
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600">{item.description}</p>

              {item.earned < item.possible && (
                <div className="mt-2">
                  <div className="relative w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`absolute top-0 left-0 h-full ${
                        item.status === 'complete' ? 'bg-green-500' :
                        item.status === 'partial' ? 'bg-blue-500' :
                        'bg-gray-400'
                      }`}
                      style={{ width: `${(item.earned / item.possible) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>Why does trust score matter?</strong> A higher trust score increases your visibility
          in search results, improves booking acceptance rates, and builds confidence with other users.
        </p>
      </div>
    </div>
  );
}
