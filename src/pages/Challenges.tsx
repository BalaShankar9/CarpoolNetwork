import React, { useState, useEffect } from 'react';
import { Target, Trophy, Calendar, Award, Sparkles, CheckCircle } from 'lucide-react';
import Layout from '../components/layout/Layout';
import ChallengeGrid from '../components/challenges/ChallengeGrid';
import CompletedChallenges from '../components/challenges/CompletedChallenges';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ChallengeStats {
  active: number;
  completed: number;
  inProgress: number;
}

export default function Challenges() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [stats, setStats] = useState<ChallengeStats>({
    active: 0,
    completed: 0,
    inProgress: 0
  });

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    try {
      const { data: userChallenges } = await supabase
        .from('user_challenges')
        .select('completed, progress, challenge_id')
        .eq('user_id', user.id);

      const completed = userChallenges?.filter(uc => uc.completed).length || 0;
      const inProgress = userChallenges?.filter(uc => !uc.completed && uc.progress > 0).length || 0;

      const { count: activeCount } = await supabase
        .from('challenges')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .lte('start_date', new Date().toISOString());

      setStats({
        active: activeCount || 0,
        completed,
        inProgress
      });
    } catch (error) {
      console.error('Error loading challenge stats:', error);
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
              <Target className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Challenges</h1>
              <p className="text-gray-600">Complete challenges to earn badges and rewards</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                  <p className="text-sm text-gray-600">Active Challenges</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Sparkles className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
                  <p className="text-sm text-gray-600">In Progress</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                  <p className="text-sm text-gray-600">Completed</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                activeTab === 'active'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Active Challenges
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                activeTab === 'completed'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Completed
            </button>
          </div>
        </div>

        {activeTab === 'active' ? (
          <ChallengeGrid onChallengeUpdate={loadStats} />
        ) : (
          <CompletedChallenges />
        )}

        <div className="mt-8 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
          <div className="flex items-start gap-3">
            <Trophy className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-purple-900 mb-2">How Challenges Work</h3>
              <ul className="space-y-1.5 text-sm text-purple-800">
                <li>• Complete rides, save CO₂, and connect with others to progress</li>
                <li>• Earn exclusive badges and boost your trust score</li>
                <li>• New seasonal challenges added regularly</li>
                <li>• Compete with friends and the community</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}