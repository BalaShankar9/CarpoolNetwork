import { useEffect, useState } from 'react';
import { Award, X, Star, Trophy, Shield, Leaf, Users, CheckCircle } from 'lucide-react';
import { getAchievementById, TIER_COLORS, Achievement } from '../../services/achievementService';

interface AchievementCelebrationProps {
  achievementId: string;
  onClose: () => void;
}

// Map icon names to components
const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  car: ({ className }) => <span className={className}>🚗</span>,
  play: ({ className }) => <span className={className}>▶️</span>,
  shield: Shield,
  'trending-up': ({ className }) => <span className={className}>📈</span>,
  award: Award,
  trophy: Trophy,
  'message-square': ({ className }) => <span className={className}>💬</span>,
  star: Star,
  'thumbs-up': ({ className }) => <span className={className}>👍</span>,
  users: Users,
  leaf: Leaf,
  calendar: ({ className }) => <span className={className}>📅</span>,
  'check-circle': CheckCircle,
};

export default function AchievementCelebration({
  achievementId,
  onClose,
}: AchievementCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const achievement = getAchievementById(achievementId);

  useEffect(() => {
    // Generate confetti particles
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setParticles(newParticles);

    // Animate in
    const showTimer = setTimeout(() => setIsVisible(true), 50);

    // Auto-close after 5 seconds
    const closeTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 5000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(closeTimer);
    };
  }, [onClose]);

  if (!achievement) return null;

  const IconComponent = ICON_MAP[achievement.icon] || Award;
  const gradientClass = TIER_COLORS[achievement.tier];

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 transition-all duration-300 ${
        isVisible ? 'bg-black/60' : 'bg-transparent pointer-events-none'
      }`}
      onClick={handleClose}
    >
      {/* Confetti particles */}
      {isVisible && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute w-3 h-3 rounded-full animate-confetti"
              style={{
                left: `${particle.x}%`,
                top: '-10px',
                backgroundColor: particle.color,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <div
        className={`bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center transform transition-all duration-300 relative ${
          isVisible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        {/* Icon Badge */}
        <div className={`w-24 h-24 mx-auto mb-6 bg-gradient-to-br ${gradientClass} rounded-full flex items-center justify-center shadow-lg animate-bounce-slow`}>
          <IconComponent className="w-12 h-12 text-white" />
        </div>

        {/* Title */}
        <div className="mb-2">
          <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-yellow-100 text-yellow-800 rounded-full mb-3">
            Achievement Unlocked!
          </span>
        </div>

        {/* Achievement Card */}
        <div className={`bg-gradient-to-r ${gradientClass} text-white rounded-xl p-5 mb-6 shadow-md`}>
          <h2 className="text-xl font-bold mb-1">{achievement.name}</h2>
          <p className="text-sm opacity-90">{achievement.description}</p>
          <div className="mt-3 flex items-center justify-center gap-1">
            {[...Array(getTierStars(achievement.tier))].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-current" />
            ))}
          </div>
        </div>

        {/* Category Badge */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full capitalize">
            {achievement.category}
          </span>
          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full capitalize">
            {achievement.tier}
          </span>
        </div>

        {/* Encouragement */}
        <p className="text-gray-600 text-sm">
          Keep up the great work! 🎉
        </p>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="mt-6 w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
        >
          Continue
        </button>
      </div>

      {/* CSS for confetti animation */}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti-fall linear forwards;
        }
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

function getTierStars(tier: Achievement['tier']): number {
  switch (tier) {
    case 'bronze': return 1;
    case 'silver': return 2;
    case 'gold': return 3;
    case 'platinum': return 4;
    default: return 1;
  }
}

// Hook for achievement checking
export function useAchievementCheck() {
  const [newAchievement, setNewAchievement] = useState<string | null>(null);

  const checkAchievements = async (userId: string) => {
    try {
      const { checkAllAchievements } = await import('../../services/achievementService');
      const newlyUnlocked = await checkAllAchievements(userId);

      if (newlyUnlocked.length > 0) {
        // Show first new achievement
        setNewAchievement(newlyUnlocked[0]);
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  };

  const clearNewAchievement = () => setNewAchievement(null);

  return { newAchievement, checkAchievements, clearNewAchievement };
}
