import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, Users, Star } from 'lucide-react';
import { referralService } from '@/services/referralService';
import { useAuth } from '@/contexts/AuthContext';

export function ReferralLeaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<{
    userId: string;
    name: string;
    avatar?: string;
    referralCount: number;
    tier: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const data = await referralService.getLeaderboard(10);
        setLeaderboard(data);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="w-5 h-5 text-amber-400" />;
      case 1:
        return <Medal className="w-5 h-5 text-slate-300" />;
      case 2:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="text-slate-400 font-bold">{index + 1}</span>;
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'platinum': return '💎';
      case 'gold': return '🥇';
      case 'silver': return '🥈';
      default: return '🥉';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum': return 'text-purple-400';
      case 'gold': return 'text-amber-400';
      case 'silver': return 'text-slate-300';
      default: return 'text-amber-600';
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-1/3"></div>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-14 bg-slate-700 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 text-center">
        <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="font-semibold text-white mb-1">No Leaders Yet</h3>
        <p className="text-sm text-slate-400">
          Be the first to invite friends and top the leaderboard!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50 flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
          <Trophy className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Referral Champions</h3>
          <p className="text-sm text-slate-400">Top community ambassadors</p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="divide-y divide-slate-700/50">
        {leaderboard.map((entry, index) => {
          const isCurrentUser = entry.userId === user?.id;
          
          return (
            <motion.div
              key={entry.userId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 flex items-center gap-4 ${
                isCurrentUser ? 'bg-purple-500/10' : ''
              } ${index < 3 ? 'bg-gradient-to-r from-transparent to-amber-500/5' : ''}`}
            >
              {/* Rank */}
              <div className="w-8 h-8 flex items-center justify-center">
                {getRankIcon(index)}
              </div>

              {/* Avatar */}
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden">
                  {entry.avatar ? (
                    <img
                      src={entry.avatar}
                      alt={entry.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-medium">
                      {entry.name.charAt(0)}
                    </div>
                  )}
                </div>
                <span className="absolute -bottom-1 -right-1 text-sm">
                  {getTierBadge(entry.tier)}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-medium truncate ${isCurrentUser ? 'text-purple-300' : 'text-white'}`}>
                    {entry.name}
                    {isCurrentUser && <span className="text-purple-400 text-xs ml-1">(You)</span>}
                  </span>
                </div>
                <span className={`text-xs capitalize ${getTierColor(entry.tier)}`}>
                  {entry.tier} Referrer
                </span>
              </div>

              {/* Count */}
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span className="font-bold text-white">{entry.referralCount}</span>
                </div>
                <span className="text-xs text-slate-500">referrals</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default ReferralLeaderboard;
