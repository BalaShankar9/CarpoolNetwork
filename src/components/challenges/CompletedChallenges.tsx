import React, { useState, useEffect } from 'react';
import { Award, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface CompletedChallenge {
  id: string;
  completed_at: string;
  reward_claimed: boolean;
  challenge: {
    title: string;
    description: string;
    reward_value: string;
    badge_icon: string;
  };
}

export default function CompletedChallenges() {
  const { user } = useAuth();
  const [completedChallenges, setCompletedChallenges] = useState<CompletedChallenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadCompletedChallenges();
    }
  }, [user]);

  const loadCompletedChallenges = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_challenges')
        .select(`
          id,
          completed_at,
          reward_claimed,
          challenges:challenge_id (
            title,
            description,
            reward_value,
            badge_icon
          )
        `)
        .eq('user_id', user.id)
        .eq('completed', true)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      const formatted = data?.map(item => ({
        id: item.id,
        completed_at: item.completed_at,
        reward_claimed: item.reward_claimed,
        challenge: Array.isArray(item.challenges) ? item.challenges[0] : item.challenges
      })) || [];

      setCompletedChallenges(formatted);
    } catch (error) {
      console.error('Error loading completed challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-gray-200 rounded-xl h-24" />
        ))}
      </div>
    );
  }

  if (completedChallenges.length === 0) {
    return (
      <div className="text-center py-16">
        <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600">No completed challenges yet.</p>
        <p className="text-sm text-gray-500 mt-2">Start a challenge to earn rewards!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {completedChallenges.map(item => (
        <div key={item.id} className="bg-white rounded-xl border-2 border-green-300 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>

            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-1">{item.challenge?.title}</h3>
              <p className="text-sm text-gray-600 mb-2">{item.challenge?.description}</p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-green-600">
                  <Award className="w-4 h-4" />
                  <span className="font-semibold">{item.challenge?.reward_value}</span>
                </div>
                <span className="text-gray-500">
                  Completed {new Date(item.completed_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {item.reward_claimed && (
              <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                Reward Claimed
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}