import { useState, useEffect } from 'react';
import { Shield, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock, Award } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ReliabilityData {
  reliability_score: number;
  total_rides: number;
  completed_rides: number;
  cancelled_rides: number;
  completion_ratio: number;
  cancellation_ratio: number;
  last_minute_cancellations: number;
  warnings_count: number;
  is_in_grace_period: boolean;
  grace_rides_remaining: number;
}

interface Restriction {
  restriction_type: string;
  reason: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
}

export default function ReliabilityScoreDisplay() {
  const { user } = useAuth();
  const [reliabilityData, setReliabilityData] = useState<ReliabilityData | null>(null);
  const [restrictions, setRestrictions] = useState<Restriction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadReliabilityData();
      loadRestrictions();
    }
  }, [user]);

  const loadReliabilityData = async () => {
    try {
      const { data, error } = await supabase
        .from('reliability_scores')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      setReliabilityData(data);
    } catch (error) {
      console.error('Error loading reliability data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRestrictions = async () => {
    try {
      const { data, error } = await supabase
        .from('booking_restrictions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRestrictions(data || []);
    } catch (error) {
      console.error('Error loading restrictions:', error);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 70) return 'text-blue-600 bg-blue-100';
    if (score >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Needs Improvement';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!reliabilityData) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <p className="text-gray-600">Reliability data not available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Shield className="w-6 h-6" />
              Reliability Score
            </h3>
            <p className="text-sm text-gray-600">
              Your reputation within the community
            </p>
          </div>
          <div className={`px-4 py-2 rounded-lg font-bold ${getScoreColor(reliabilityData.reliability_score)}`}>
            {reliabilityData.reliability_score}/100
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {getScoreLabel(reliabilityData.reliability_score)}
            </span>
            <span className="text-sm text-gray-600">
              {reliabilityData.reliability_score}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                reliabilityData.reliability_score >= 90
                  ? 'bg-green-600'
                  : reliabilityData.reliability_score >= 70
                  ? 'bg-blue-600'
                  : reliabilityData.reliability_score >= 50
                  ? 'bg-yellow-600'
                  : 'bg-red-600'
              }`}
              style={{ width: `${reliabilityData.reliability_score}%` }}
            ></div>
          </div>
        </div>

        {reliabilityData.is_in_grace_period && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Award className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-blue-900">Grace Period Active</div>
                <div className="text-sm text-blue-700 mt-1">
                  You have {reliabilityData.grace_rides_remaining} grace rides remaining with reduced penalties for cancellations.
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{reliabilityData.total_rides}</div>
            <div className="text-sm text-gray-600 mt-1">Total Rides</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{reliabilityData.completed_rides}</div>
            <div className="text-sm text-gray-600 mt-1">Completed</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{reliabilityData.cancelled_rides}</div>
            <div className="text-sm text-gray-600 mt-1">Cancelled</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{reliabilityData.last_minute_cancellations}</div>
            <div className="text-sm text-gray-600 mt-1">Last Minute</div>
          </div>
        </div>

        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <div className="text-sm text-gray-600">Completion Rate</div>
              <div className="font-semibold text-gray-900">
                {(reliabilityData.completion_ratio * 100).toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <Clock className="w-5 h-5 text-gray-600" />
            <div>
              <div className="text-sm text-gray-600">Cancellation Rate</div>
              <div className="font-semibold text-gray-900">
                {(reliabilityData.cancellation_ratio * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {reliabilityData.warnings_count > 0 && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-yellow-900">
                  {reliabilityData.warnings_count} Active Warning{reliabilityData.warnings_count > 1 ? 's' : ''}
                </div>
                <div className="text-sm text-yellow-700 mt-1">
                  Please be mindful of cancellations. Frequent cancellations may result in temporary restrictions.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {restrictions.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-red-300">
          <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            Active Restrictions
          </h4>
          <div className="space-y-3">
            {restrictions.map((restriction) => (
              <div key={restriction.starts_at} className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="font-semibold text-red-900 capitalize">
                  {restriction.restriction_type.replace(/_/g, ' ')}
                </div>
                <div className="text-sm text-red-700 mt-1">{restriction.reason}</div>
                {restriction.ends_at && (
                  <div className="text-sm text-red-600 mt-2">
                    Ends: {new Date(restriction.ends_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">How to Improve Your Score</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Complete rides without cancelling</li>
          <li>• Avoid last-minute cancellations (within 2 hours)</li>
          <li>• Cancel only when absolutely necessary</li>
          <li>• Provide valid reasons for cancellations (medical/emergency)</li>
          <li>• Your score improves with each completed ride</li>
        </ul>
      </div>
    </div>
  );
}
