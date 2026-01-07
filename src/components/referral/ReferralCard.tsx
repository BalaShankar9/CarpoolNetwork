import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Gift, Copy, Check, Share2, Twitter, MessageCircle, Mail,
  Users, Trophy, Star, ChevronRight, Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { referralService, ReferralCode, ReferralStats, REFERRAL_TIERS } from '@/services/referralService';

export function ReferralCard() {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showShareMenu, setShowShareMenu] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        const [code, referralStats] = await Promise.all([
          referralService.getOrCreateReferralCode(user.id),
          referralService.getReferralStats(user.id)
        ]);
        
        setReferralCode(code);
        setStats(referralStats);
      } catch (error) {
        console.error('Failed to fetch referral data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleCopyCode = async () => {
    if (!referralCode) return;
    
    try {
      await navigator.clipboard.writeText(referralCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleCopyLink = async () => {
    if (!referralCode) return;
    
    const link = referralService.getShareLink(referralCode.code);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleShare = (platform: 'twitter' | 'whatsapp' | 'email') => {
    if (!referralCode) return;
    
    const shareText = referralService.getShareText(referralCode.code, platform);
    
    let url = '';
    switch (platform) {
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${shareText}`;
        break;
      case 'whatsapp':
        url = `https://wa.me/?text=${shareText}`;
        break;
      case 'email':
        url = `mailto:?${shareText}`;
        break;
    }
    
    window.open(url, '_blank');
    setShowShareMenu(false);
  };

  const getCurrentTier = () => {
    if (!stats) return REFERRAL_TIERS[0];
    return REFERRAL_TIERS.find(t => t.name.toLowerCase() === stats.tier) || REFERRAL_TIERS[0];
  };

  const getNextTier = () => {
    const currentIndex = REFERRAL_TIERS.findIndex(t => t.name.toLowerCase() === stats?.tier);
    return REFERRAL_TIERS[currentIndex + 1] || null;
  };

  const getProgressToNextTier = () => {
    if (!stats) return 0;
    const nextTier = getNextTier();
    if (!nextTier) return 100;
    
    const currentTier = getCurrentTier();
    const progress = ((stats.completedReferrals - currentTier.minReferrals) / 
                     (nextTier.minReferrals - currentTier.minReferrals)) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-1/3"></div>
          <div className="h-16 bg-slate-700 rounded-xl"></div>
          <div className="h-4 bg-slate-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  const currentTier = getCurrentTier();
  const nextTier = getNextTier();

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Invite Friends</h3>
              <p className="text-sm text-slate-400">Earn rewards for each referral</p>
            </div>
          </div>
          {stats && stats.rank <= 100 && (
            <div className="flex items-center gap-1 px-3 py-1 bg-amber-500/20 rounded-full">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-amber-400">#{stats.rank}</span>
            </div>
          )}
        </div>

        {/* Referral Code */}
        {referralCode && (
          <div className="bg-slate-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Your referral code</span>
              <button
                onClick={handleCopyCode}
                className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="text-2xl font-mono font-bold text-white tracking-wider">
              {referralCode.code}
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="px-6 pb-4 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{stats.totalReferrals}</div>
            <div className="text-xs text-slate-400">Total Invited</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">{stats.completedReferrals}</div>
            <div className="text-xs text-slate-400">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-400">{stats.pendingReferrals}</div>
            <div className="text-xs text-slate-400">Pending</div>
          </div>
        </div>
      )}

      {/* Tier Progress */}
      {stats && (
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{currentTier.badge}</span>
              <span className="text-sm font-medium" style={{ color: currentTier.color }}>
                {currentTier.name} Referrer
              </span>
            </div>
            {nextTier && (
              <span className="text-xs text-slate-400">
                {nextTier.minReferrals - stats.completedReferrals} more to {nextTier.name}
              </span>
            )}
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${getProgressToNextTier()}%` }}
              className="h-full rounded-full"
              style={{ 
                background: `linear-gradient(to right, ${currentTier.color}, ${nextTier?.color || currentTier.color})`
              }}
            />
          </div>
        </div>
      )}

      {/* Share Buttons */}
      <div className="p-6 pt-4 bg-slate-800/50 border-t border-slate-700/50">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-medium transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            Copy Link
          </button>
          <div className="relative">
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl text-white font-medium transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
            
            {/* Share Menu */}
            {showShareMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden z-10"
              >
                <button
                  onClick={() => handleShare('twitter')}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 transition-colors"
                >
                  <Twitter className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-white">Twitter</span>
                </button>
                <button
                  onClick={() => handleShare('whatsapp')}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-white">WhatsApp</span>
                </button>
                <button
                  onClick={() => handleShare('email')}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 transition-colors"
                >
                  <Mail className="w-4 h-4 text-amber-400" />
                  <span className="text-sm text-white">Email</span>
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="px-6 pb-6">
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
          <h4 className="text-sm font-medium text-emerald-300 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            What you & your friends get
          </h4>
          <ul className="space-y-1 text-sm text-emerald-400/80">
            <li className="flex items-center gap-2">
              <Star className="w-3 h-3" />
              Community Champion badge for you
            </li>
            <li className="flex items-center gap-2">
              <Star className="w-3 h-3" />
              Welcome Bonus badge for them
            </li>
            <li className="flex items-center gap-2">
              <Star className="w-3 h-3" />
              Rewards multiply with your tier!
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ReferralCard;
