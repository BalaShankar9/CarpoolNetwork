import React from 'react';
import { Target, TrendingUp, Leaf, Users, Award, CheckCircle, Clock } from 'lucide-react';

interface ChallengeCardProps {
  challenge: {
    id: string;
    title: string;
    description: string;
    challenge_type: string;
    target_value: number;
    reward_type: string;
    reward_value: string;
    badge_icon: string;
    end_date: string;
    is_seasonal: boolean;
    season_theme: string;
  };
  isJoined: boolean;
  progress: number;
  progressPercent: number;
  isCompleted: boolean;
  onJoin: () => void;
}

export default function ChallengeCard({ challenge, isJoined, progress, progressPercent, isCompleted, onJoin }: ChallengeCardProps) {
  const getIcon = () => {
    switch (challenge.challenge_type) {
      case 'rides': return TrendingUp;
      case 'co2': return Leaf;
      case 'social': return Users;
      default: return Target;
    }
  };

  const Icon = getIcon();

  const formatTarget = () => {
    if (challenge.challenge_type === 'rides') return `${challenge.target_value} rides`;
    if (challenge.challenge_type === 'co2') return `${challenge.target_value}kg CO₂`;
    if (challenge.challenge_type === 'social') return `${challenge.target_value} friends`;
    return `${challenge.target_value}`;
  };

  const daysLeft = Math.ceil((new Date(challenge.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className={`bg-white rounded-xl border-2 overflow-hidden transition-all hover:shadow-lg ${
      isCompleted ? 'border-green-500' : isJoined ? 'border-blue-400' : 'border-gray-200'
    }`}>
      {challenge.is_seasonal && (
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-white text-sm font-semibold">
          {challenge.season_theme || 'Seasonal Challenge'}
        </div>
      )}

      <div className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className={`p-3 rounded-lg ${
            isCompleted ? 'bg-green-100' : 'bg-blue-100'
          }`}>
            {isCompleted ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <Icon className="w-6 h-6 text-blue-600" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 mb-1">{challenge.title}</h3>
            <p className="text-sm text-gray-600">{challenge.description}</p>
          </div>
        </div>

        {isJoined ? (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Progress</span>
                <span className="font-semibold text-gray-900">
                  {progress.toFixed(0)}/{challenge.target_value}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isCompleted ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {isCompleted ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">Completed!</span>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  Reward: {challenge.reward_value}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{daysLeft} days left</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Goal</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{formatTarget()}</p>
            </div>

            <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-900">Reward</span>
              </div>
              <p className="text-sm font-semibold text-yellow-800">{challenge.reward_value}</p>
            </div>

            <button
              onClick={onJoin}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold"
            >
              Join Challenge
            </button>
          </div>
        )}
      </div>
    </div>
  );
}