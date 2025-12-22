import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import RankBadge from './RankBadge';
import LeaderboardCard from './LeaderboardCard';

interface GlobalLeaderboardProps {
  category: 'rides' | 'co2' | 'trust_score' | 'distance';
  period: 'week' | 'month' | 'all_time';
}

interface LeaderboardEntry {
  user_id: string;
  rank: number;
  score: number;
  profile?: {
    full_name: string;
    avatar_url: string;
    city: string;
  };
}

export default function GlobalLeaderboard({ category, period }: GlobalLeaderboardProps) {
  const { user } = useAuth();
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [category, period]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leaderboard_cache')
        .select(`
          user_id,
          rank,
          score,
          profiles:user_id (
            full_name,
            avatar_url,
            city
          )
        `)
        .eq('category', category)
        .eq('period', period)
        .is('region', null)
        .order('rank', { ascending: true })
        .limit(50);

      if (error) throw error;

      const formattedData = data?.map(item => ({
        user_id: item.user_id,
        rank: item.rank,
        score: item.score,
        profile: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
      })) || [];

      setLeaders(formattedData);

      if (user) {
        const userEntry = formattedData.find(entry => entry.user_id === user.id);
        if (userEntry) {
          setUserRank(userEntry);
        } else {
          const { data: userData } = await supabase
            .from('leaderboard_cache')
            .select('user_id, rank, score')
            .eq('user_id', user.id)
            .eq('category', category)
            .eq('period', period)
            .is('region', null)
            .maybeSingle();

          if (userData) {
            setUserRank(userData);
          }
        }
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatScore = (score: number) => {
    if (category === 'co2') return `${score.toFixed(1)}kg`;
    if (category === 'distance') return `${score.toFixed(0)}km`;
    if (category === 'trust_score') return score.toFixed(1);
    return score.toString();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="animate-pulse flex gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-12 h-12 bg-gray-200 rounded-full" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (leaders.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600">No leaderboard data available yet.</p>
        <p className="text-sm text-gray-500 mt-2">Be the first to climb the rankings!</p>
      </div>
    );
  }

  return (
    <div>
      {userRank && userRank.rank > 10 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RankBadge rank={userRank.rank} />
              <div>
                <p className="font-semibold text-gray-900">Your Ranking</p>
                <p className="text-sm text-gray-600">
                  #{userRank.rank} - {formatScore(userRank.score)}
                </p>
              </div>
            </div>
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      )}

      <div className="space-y-2">
        {leaders.map((entry) => (
          <LeaderboardCard
            key={entry.user_id}
            entry={entry}
            formatScore={formatScore}
            isCurrentUser={entry.user_id === user?.id}
          />
        ))}
      </div>
    </div>
  );
}