import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Star } from 'lucide-react';
import RankBadge from './RankBadge';
import ClickableUserProfile from '../shared/ClickableUserProfile';
import { useAuth } from '../../contexts/AuthContext';

interface LeaderboardCardProps {
  entry: {
    user_id: string;
    rank: number;
    score: number;
    profile?: {
      full_name: string;
      avatar_url: string;
      city: string;
    };
  };
  formatScore: (score: number) => string;
  isCurrentUser?: boolean;
}

export default function LeaderboardCard({ entry, formatScore, isCurrentUser }: LeaderboardCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleProfileClick = () => {
    if (entry.user_id === user?.id) {
      navigate('/profile');
    } else {
      navigate(`/user/${entry.user_id}`);
    }
  };

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
        isCurrentUser
          ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-400'
          : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
      }`}
    >
      <RankBadge rank={entry.rank} size="md" />

      <div className="flex-shrink-0 cursor-pointer" onClick={handleProfileClick}>
        {entry.profile ? (
          <ClickableUserProfile
            user={{
              id: entry.user_id,
              full_name: entry.profile.full_name,
              avatar_url: entry.profile.avatar_url
            }}
            size="sm"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg border-2 border-white shadow hover:scale-105 transition-transform">
            ?
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={`font-semibold truncate cursor-pointer hover:text-blue-600 transition-colors ${isCurrentUser ? 'text-blue-900' : 'text-gray-900'}`}
            onClick={handleProfileClick}
          >
            {entry.profile?.full_name || 'Anonymous'}
          </p>
          {isCurrentUser && (
            <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full font-medium">
              You
            </span>
          )}
        </div>
        {entry.profile?.city && (
          <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" />
            {entry.profile.city}
          </p>
        )}
      </div>

      <div className="text-right">
        <div className={`text-xl font-bold ${isCurrentUser ? 'text-blue-700' : 'text-gray-900'}`}>
          {formatScore(entry.score)}
        </div>
        {entry.rank <= 10 && (
          <div className="flex items-center gap-1 text-yellow-600 text-xs">
            <Star className="w-3 h-3 fill-current" />
            <span className="font-medium">Top 10</span>
          </div>
        )}
      </div>
    </div>
  );
}