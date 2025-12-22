import React, { useState, useEffect } from 'react';
import { MapPin, Trophy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import LeaderboardCard from './LeaderboardCard';

interface RegionalLeaderboardProps {
  category: 'rides' | 'co2' | 'trust_score' | 'distance';
  period: 'week' | 'month' | 'all_time';
}

interface LeaderboardEntry {
  user_id: string;
  rank: number;
  score: number;
  region: string;
  profile?: {
    full_name: string;
    avatar_url: string;
    city: string;
  };
}

export default function RegionalLeaderboard({ category, period }: RegionalLeaderboardProps) {
  const { user, profile } = useAuth();
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);

  useEffect(() => {
    loadRegions();
  }, []);

  useEffect(() => {
    if (selectedRegion) {
      loadLeaderboard();
    }
  }, [category, period, selectedRegion]);

  const loadRegions = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('city')
        .not('city', 'is', null);

      if (error) throw error;

      const regions = [...new Set(data?.map(p => p.city).filter(Boolean))] as string[];
      setAvailableRegions(regions.sort());

      if (profile?.city) {
        setSelectedRegion(profile.city);
      } else if (regions.length > 0) {
        setSelectedRegion(regions[0]);
      }
    } catch (error) {
      console.error('Error loading regions:', error);
    }
  };

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leaderboard_cache')
        .select(`
          user_id,
          rank,
          score,
          region,
          profiles:user_id (
            full_name,
            avatar_url,
            city
          )
        `)
        .eq('category', category)
        .eq('period', period)
        .eq('region', selectedRegion)
        .order('rank', { ascending: true })
        .limit(20);

      if (error) throw error;

      const formattedData = data?.map(item => ({
        user_id: item.user_id,
        rank: item.rank,
        score: item.score,
        region: item.region || '',
        profile: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
      })) || [];

      setLeaders(formattedData);
    } catch (error) {
      console.error('Error loading regional leaderboard:', error);
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

  return (
    <div>
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Select Region
        </label>
        <select
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {availableRegions.map(region => (
            <option key={region} value={region}>{region}</option>
          ))}
        </select>
      </div>

      {loading ? (
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
      ) : leaders.length === 0 ? (
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No rankings for {selectedRegion} yet.</p>
          <p className="text-sm text-gray-500 mt-2">Be the first to represent your region!</p>
        </div>
      ) : (
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
      )}
    </div>
  );
}