import React, { useState } from 'react';
import { Trophy, TrendingUp, Globe, MapPin, Users, Medal, Award, Crown } from 'lucide-react';
import Layout from '../components/layout/Layout';
import GlobalLeaderboard from '../components/leaderboards/GlobalLeaderboard';
import RegionalLeaderboard from '../components/leaderboards/RegionalLeaderboard';
import FriendLeaderboard from '../components/leaderboards/FriendLeaderboard';

type TabType = 'global' | 'regional' | 'friends';
type Category = 'rides' | 'co2' | 'trust_score' | 'distance';
type Period = 'week' | 'month' | 'all_time';

export default function Leaderboards() {
  const [activeTab, setActiveTab] = useState<TabType>('global');
  const [category, setCategory] = useState<Category>('rides');
  const [period, setPeriod] = useState<Period>('month');

  const tabs = [
    { id: 'global' as TabType, label: 'Global', icon: Globe },
    { id: 'regional' as TabType, label: 'Regional', icon: MapPin },
    { id: 'friends' as TabType, label: 'Friends', icon: Users }
  ];

  const categories = [
    { id: 'rides' as Category, label: 'Most Rides', icon: TrendingUp },
    { id: 'co2' as Category, label: 'Eco Warriors', icon: Trophy },
    { id: 'trust_score' as Category, label: 'Trust Score', icon: Award },
    { id: 'distance' as Category, label: 'Distance', icon: Medal }
  ];

  const periods = [
    { id: 'week' as Period, label: 'This Week' },
    { id: 'month' as Period, label: 'This Month' },
    { id: 'all_time' as Period, label: 'All Time' }
  ];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Leaderboards</h1>
              <p className="text-gray-600">See how you rank among the community</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 sticky top-4">
              <h3 className="font-semibold text-gray-900 mb-3">Leaderboard Type</h3>
              <div className="space-y-2 mb-6">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        activeTab === tab.id
                          ? 'bg-green-50 text-green-700 border-2 border-green-500'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <h3 className="font-semibold text-gray-900 mb-3">Category</h3>
              <div className="space-y-2 mb-6">
                {categories.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm ${
                        category === cat.id
                          ? 'bg-blue-50 text-blue-700 border border-blue-300'
                          : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              <h3 className="font-semibold text-gray-900 mb-3">Time Period</h3>
              <div className="space-y-2">
                {periods.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPeriod(p.id)}
                    className={`w-full px-4 py-2 rounded-lg transition-all text-sm ${
                      period === p.id
                        ? 'bg-purple-50 text-purple-700 border border-purple-300 font-medium'
                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <Crown className="w-6 h-6" />
                  <h2 className="text-2xl font-bold">
                    {categories.find(c => c.id === category)?.label}
                  </h2>
                </div>
                <p className="text-blue-100">
                  {periods.find(p => p.id === period)?.label}
                </p>
              </div>

              <div className="p-6">
                {activeTab === 'global' && (
                  <GlobalLeaderboard category={category} period={period} />
                )}
                {activeTab === 'regional' && (
                  <RegionalLeaderboard category={category} period={period} />
                )}
                {activeTab === 'friends' && (
                  <FriendLeaderboard category={category} period={period} />
                )}
              </div>
            </div>

            <div className="mt-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-200">
              <div className="flex items-start gap-3">
                <Trophy className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-yellow-900 mb-1">Climb the Rankings!</h3>
                  <p className="text-sm text-yellow-800">
                    Complete more rides, save more CO₂, and build your trust score to reach the top of the leaderboard.
                    Top performers get special badges and recognition in the community!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}