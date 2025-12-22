import { useState } from 'react';
import { User, Star, CheckCircle } from 'lucide-react';

interface UserAvatarUser {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

interface UserAvatarProps {
  user: UserAvatarUser;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  onClick?: () => void;
  rating?: number;
  verified?: boolean;
  showOnlineStatus?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'w-8 h-8 text-xs',
  sm: 'w-12 h-12 text-sm',
  md: 'w-16 h-16 text-base',
  lg: 'w-20 h-20 text-lg',
  xl: 'w-24 h-24 text-xl',
  '2xl': 'w-32 h-32 text-2xl'
};

const badgeSizeClasses = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-7 h-7',
  '2xl': 'w-8 h-8'
};

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-orange-500',
    'bg-red-500',
    'bg-purple-500',
    'bg-teal-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-yellow-500',
    'bg-cyan-500'
  ];

  return colors[Math.abs(hash) % colors.length];
}

export default function UserAvatar({
  user,
  size = 'md',
  onClick,
  rating,
  verified,
  showOnlineStatus,
  className = ''
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const initials = user.full_name
    ?.split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  const bgColor = stringToColor(user.id);
  const isClickable = !!onClick;

  const containerClasses = `
    ${sizeClasses[size]}
    ${className}
    rounded-full
    flex
    items-center
    justify-center
    overflow-hidden
    relative
    ${isClickable ? 'cursor-pointer hover:scale-105 hover:shadow-lg transition-all duration-200' : ''}
  `.trim();

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const showImage = user.avatar_url && !imageError;

  return (
    <div className={containerClasses} onClick={onClick} role={isClickable ? 'button' : undefined}>
      {showImage ? (
        <>
          {imageLoading && (
            <div className={`absolute inset-0 ${bgColor} animate-pulse`}></div>
          )}
          <img
            src={user.avatar_url}
            alt={user.full_name}
            className="w-full h-full object-cover"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </>
      ) : (
        <div className={`w-full h-full ${bgColor} flex items-center justify-center text-white font-semibold`}>
          {initials}
        </div>
      )}

      {verified && (
        <div className={`absolute bottom-0 right-0 ${badgeSizeClasses[size]} bg-green-500 rounded-full flex items-center justify-center border-2 border-white`}>
          <CheckCircle className="w-full h-full text-white p-0.5" />
        </div>
      )}

      {rating !== undefined && rating > 0 && (
        <div className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-yellow-400 rounded-full px-1.5 py-0.5 flex items-center gap-0.5 border border-white shadow-sm ${size === 'xs' || size === 'sm' ? 'text-[10px]' : 'text-xs'}`}>
          <Star className={`${size === 'xs' || size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'} fill-current text-white`} />
          <span className="text-white font-bold">{rating.toFixed(1)}</span>
        </div>
      )}

      {showOnlineStatus && (
        <div className={`absolute top-0 right-0 ${badgeSizeClasses[size]} bg-green-500 rounded-full border-2 border-white`}></div>
      )}
    </div>
  );
}
