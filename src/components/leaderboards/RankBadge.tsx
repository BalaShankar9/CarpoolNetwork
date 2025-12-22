import React from 'react';
import { Crown, Medal, Award } from 'lucide-react';

interface RankBadgeProps {
  rank: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function RankBadge({ rank, size = 'md' }: RankBadgeProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-lg'
  };

  const iconSize = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  if (rank === 1) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg`}>
        <Crown className={`${iconSize[size]} text-white`} />
      </div>
    );
  }

  if (rank === 2) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center shadow-lg`}>
        <Medal className={`${iconSize[size]} text-white`} />
      </div>
    );
  }

  if (rank === 3) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg`}>
        <Award className={`${iconSize[size]} text-white`} />
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-700`}>
      #{rank}
    </div>
  );
}