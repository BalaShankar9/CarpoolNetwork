import React, { useState, useEffect } from 'react';
import { Target } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import ChallengeCard from './ChallengeCard';

interface Challenge {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  target_value: number;
  reward_type: string;
  reward_value: string;
  badge_icon: string;
  start_date: string;
  end_date: string;
  is_seasonal: boolean;
  season_theme: string;
}

interface UserChallenge {
  challenge_id: string;
  progress: number;
  completed: boolean;
}

interface ChallengeGridProps {
  onChallengeUpdate?: () => void;
}

export default function ChallengeGrid({ onChallengeUpdate }: ChallengeGridProps) {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [userProgress, setUserProgress] = useState<Map<string, UserChallenge>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChallenges();
  }, [user]);

  const loadChallenges = async () => {
    setLoading(true);
    try {
      const { data: challengesData, error: challengesError } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .lte('start_date', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (challengesError) throw challengesError;

      setChallenges(challengesData || []);

      if (user) {
        const { data: progressData } = await supabase
          .from('user_challenges')
          .select('*')
          .eq('user_id', user.id);

        const progressMap = new Map();
        progressData?.forEach(uc => {
          progressMap.set(uc.challenge_id, uc);
        });
        setUserProgress(progressMap);
      }
    } catch (error) {
      console.error('Error loading challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinChallenge = async (challengeId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_challenges')
        .insert({
          user_id: user.id,
          challenge_id: challengeId,
          progress: 0
        });

      if (error) throw error;

      await loadChallenges();
      onChallengeUpdate?.();
    } catch (error) {
      console.error('Error joining challenge:', error);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 rounded-xl h-64" />
          </div>
        ))}
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className="text-center py-16">
        <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600">No active challenges at the moment.</p>
        <p className="text-sm text-gray-500 mt-2">Check back soon for new challenges!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {challenges.map(challenge => {
        const progress = userProgress.get(challenge.id);
        const isJoined = !!progress;
        const progressPercent = progress ? Math.min((progress.progress / challenge.target_value) * 100, 100) : 0;

        return (
          <ChallengeCard
            key={challenge.id}
            challenge={challenge}
            isJoined={isJoined}
            progress={progress?.progress || 0}
            progressPercent={progressPercent}
            isCompleted={progress?.completed || false}
            onJoin={() => handleJoinChallenge(challenge.id)}
          />
        );
      })}
    </div>
  );
}