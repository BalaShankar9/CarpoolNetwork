import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  X,
  ThumbsUp,
  ThumbsDown,
  Star,
  TrendingUp,
  MapPin,
  Calendar,
  Users,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getSmartRecommendations,
  markRecommendationClicked,
  markRecommendationConverted,
  dismissRecommendation,
  submitRecommendationFeedback,
} from '../../services/smartRecommendations';

interface Recommendation {
  recommendation_id: string;
  ride_id: string | null;
  driver_id: string | null;
  score: number;
  reasoning: Record<string, any>;
  ride_details: any;
}

export default function SmartRecommendations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackMode, setFeedbackMode] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadRecommendations();
    }
  }, [user]);

  const loadRecommendations = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await getSmartRecommendations(user.id, 5);
      setRecommendations(data);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRideClick = async (rec: Recommendation) => {
    if (rec.ride_id) {
      await markRecommendationClicked(rec.recommendation_id);
      navigate(`/rides/${rec.ride_id}`);
    }
  };

  const handleDismiss = async (recId: string) => {
    await dismissRecommendation(recId);
    setRecommendations(recommendations.filter(r => r.recommendation_id !== recId));
  };

  const handleFeedback = async (recId: string, helpful: boolean) => {
    await submitRecommendationFeedback({
      recommendation_id: recId,
      feedback_type: helpful ? 'helpful' : 'not_helpful',
      rating: helpful ? 5 : 2
    });

    setFeedbackMode(recId);
    setTimeout(() => setFeedbackMode(null), 2000);
  };

  const getReasoningBadges = (reasoning: Record<string, any>) => {
    const badges = [];

    if (reasoning.smoking_match) badges.push('Smoking preference match');
    if (reasoning.pets_match) badges.push('Pet-friendly');
    if (reasoning.music_match) badges.push('Music preference match');
    if (reasoning.matches_recent_search) badges.push('Based on your searches');
    if (reasoning.driver_trust_score && reasoning.driver_trust_score > 70) {
      badges.push('Highly rated driver');
    }

    return badges;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  if (!user || loading) {
    return null;
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-bold text-gray-900">Recommended for You</h3>
        </div>
        <span className="text-sm text-gray-600">Personalized picks</span>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec) => {
          const rideDetails = rec.ride_details;
          if (!rideDetails) return null;

          const badges = getReasoningBadges(rec.reasoning);

          return (
            <div
              key={rec.recommendation_id}
              className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getScoreColor(rec.score)}`}>
                      <Star className="w-3 h-3 inline mr-1" />
                      {rec.score}% match
                    </span>
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  </div>

                  <button
                    onClick={() => handleRideClick(rec)}
                    className="text-left w-full hover:text-blue-600 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-gray-900 font-semibold mb-1">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{rideDetails.origin}</span>
                      <span className="text-gray-400">→</span>
                      <span>{rideDetails.destination}</span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(rideDetails.departure_time).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {rideDetails.available_seats} seats
                      </div>
                    </div>
                  </button>

                  {badges.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {badges.map((badge, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDismiss(rec.recommendation_id)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors ml-2"
                  title="Dismiss"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {feedbackMode === rec.recommendation_id ? (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                  <ThumbsUp className="w-4 h-4" />
                  <span>Thanks for your feedback!</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-600">Was this helpful?</span>
                  <button
                    onClick={() => handleFeedback(rec.recommendation_id, true)}
                    className="p-1.5 hover:bg-green-50 rounded transition-colors"
                    title="Helpful"
                  >
                    <ThumbsUp className="w-3.5 h-3.5 text-gray-400 hover:text-green-600" />
                  </button>
                  <button
                    onClick={() => handleFeedback(rec.recommendation_id, false)}
                    className="p-1.5 hover:bg-red-50 rounded transition-colors"
                    title="Not helpful"
                  >
                    <ThumbsDown className="w-3.5 h-3.5 text-gray-400 hover:text-red-600" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => navigate('/find-rides')}
        className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        View All Rides
      </button>
    </div>
  );
}
