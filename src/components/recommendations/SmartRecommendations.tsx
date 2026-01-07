import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Star, Clock, MapPin, TrendingUp, ChevronRight,
  Zap, Heart, Calendar, RefreshCw
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { smartRecommendationService, RideRecommendation } from '@/services/smartRecommendationService';
import { Link } from 'react-router-dom';

interface SmartRecommendationsProps {
  compact?: boolean;
  maxItems?: number;
  showRefresh?: boolean;
}

export function SmartRecommendations({ 
  compact = false, 
  maxItems = 5,
  showRefresh = true 
}: SmartRecommendationsProps) {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<RideRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecommendations = async () => {
    if (!user) return;
    
    try {
      const recs = await smartRecommendationService.getRecommendations(user.id, {
        limit: maxItems,
        includePatternBased: true
      });
      setRecommendations(recs);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [user]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRecommendations();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-blue-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-slate-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/20';
    if (score >= 60) return 'bg-blue-500/20';
    if (score >= 40) return 'bg-amber-500/20';
    return 'bg-slate-500/20';
  };

  const getReasonIcon = (type: string) => {
    switch (type) {
      case 'time_match': return <Clock className="w-3 h-3" />;
      case 'route_match':
      case 'regular_route': return <MapPin className="w-3 h-3" />;
      case 'price': return <TrendingUp className="w-3 h-3" />;
      case 'rating': return <Star className="w-3 h-3" />;
      case 'past_interaction': return <Heart className="w-3 h-3" />;
      default: return <Zap className="w-3 h-3" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-slate-700 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 text-center">
        <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
          <Sparkles className="w-6 h-6 text-purple-400" />
        </div>
        <h3 className="font-semibold text-white mb-1">No Recommendations Yet</h3>
        <p className="text-sm text-slate-400">
          Book a few rides and we'll learn your preferences to suggest perfect matches!
        </p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-white">Recommended for You</span>
          </div>
          {showRefresh && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-1 text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
        
        {recommendations.slice(0, 3).map((rec) => (
          <Link
            key={rec.id}
            to={`/rides/${rec.rideId}`}
            className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl hover:bg-slate-700/50 transition-colors"
          >
            <div className={`w-8 h-8 rounded-lg ${getScoreBg(rec.score)} flex items-center justify-center`}>
              <span className={`text-xs font-bold ${getScoreColor(rec.score)}`}>{rec.score}%</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white truncate">
                {rec.ride.origin.split(',')[0]} → {rec.ride.destination.split(',')[0]}
              </div>
              <div className="text-xs text-slate-400">
                {rec.ride.departureTime.toLocaleString([], {
                  weekday: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Smart Recommendations</h3>
            <p className="text-sm text-slate-400">Personalized rides based on your patterns</p>
          </div>
        </div>
        {showRefresh && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-700"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Recommendations List */}
      <div className="divide-y divide-slate-700/50">
        <AnimatePresence>
          {recommendations.map((rec, index) => (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                to={`/rides/${rec.rideId}`}
                className="block p-4 hover:bg-slate-700/30 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Score Badge */}
                  <div className={`w-12 h-12 rounded-xl ${getScoreBg(rec.score)} flex flex-col items-center justify-center flex-shrink-0`}>
                    <span className={`text-lg font-bold ${getScoreColor(rec.score)}`}>{rec.score}</span>
                    <span className="text-xs text-slate-500">match</span>
                  </div>

                  {/* Ride Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      <span className="text-white font-medium truncate">
                        {rec.ride.origin.split(',')[0]}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                      <span className="text-white font-medium truncate">
                        {rec.ride.destination.split(',')[0]}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-400 mb-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {rec.ride.departureTime.toLocaleDateString([], {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {rec.ride.departureTime.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <span className="text-emerald-400 font-medium">
                        {rec.ride.price === 0 ? 'Free' : `£${rec.ride.price}`}
                      </span>
                    </div>

                    {/* Match Reasons */}
                    <div className="flex flex-wrap gap-1.5">
                      {rec.reasons.slice(0, 3).map((reason, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300"
                        >
                          {getReasonIcon(reason.type)}
                          {reason.description.length > 30 
                            ? reason.description.substring(0, 30) + '...'
                            : reason.description
                          }
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Driver */}
                  <div className="flex flex-col items-end flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden mb-1">
                      {rec.ride.driver.avatar ? (
                        <img
                          src={rec.ride.driver.avatar}
                          alt={rec.ride.driver.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          {rec.ride.driver.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    {rec.ride.driver.rating > 0 && (
                      <div className="flex items-center gap-1 text-xs">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-slate-400">{rec.ride.driver.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* View All */}
      <div className="p-4 border-t border-slate-700/50">
        <Link
          to="/find-rides"
          className="flex items-center justify-center gap-2 text-purple-400 hover:text-purple-300 font-medium transition-colors"
        >
          View All Rides
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export default SmartRecommendations;
