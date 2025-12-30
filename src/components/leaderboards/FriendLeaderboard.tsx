import React, { useState, useEffect } from 'react';
import { Users, Trophy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import LeaderboardCard from './LeaderboardCard';

interface FriendLeaderboardProps {
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

export default function FriendLeaderboard({ category, period }: FriendLeaderboardProps) {
  const { user } = useAuth();
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadFriendLeaderboard();
    }
  }, [category, period, user]);

  const loadFriendLeaderboard = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: friends, error: friendsError } = await supabase
        .from('friendships')
        .select('user_a, user_b')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

      if (friendsError) throw friendsError;

      const friendIds = friends?.map(friendship =>
        friendship.user_a === user.id ? friendship.user_b : friendship.user_a
      ) || [];

      friendIds.push(user.id);

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
        .in('user_id', friendIds)
        .eq('category', category)
        .eq('period', period)
        .is('region', null)
        .order('rank', { ascending: true });

      if (error) throw error;

      const formattedData = data?.map(item => ({
        user_id: item.user_id,
        rank: item.rank,
        score: item.score,
        profile: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
      })) || [];

      setLeaders(formattedData);
    } catch (error) {
      console.error('Error loading friend leaderboard:', error);
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
        {[1, 2, 3].map(i => (
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
        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600">No friend rankings available.</p>
        <p className="text-sm text-gray-500 mt-2">Add friends to compare your progress!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {leaders.map((entry, index) => (
        <LeaderboardCard
          key={entry.user_id}
          entry={{ ...entry, rank: index + 1 }}
          formatScore={formatScore}
          isCurrentUser={entry.user_id === user?.id}
        />
      ))}
    </div>
  );
}
