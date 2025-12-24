import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import UserAvatar from './UserAvatar';
import { getUserProfilePath } from '../../utils/profileNavigation';

interface ClickableUserProfileUser {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  profile_photo_url?: string | null;
}

interface ClickableUserProfileProps {
  user: ClickableUserProfileUser;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  rating?: number;
  verified?: boolean;
  showOnlineStatus?: boolean;
  className?: string;
  showName?: boolean;
  showNameRight?: boolean;
  additionalInfo?: ReactNode;
  disabled?: boolean;
}

export default function ClickableUserProfile({
  user,
  size = 'md',
  rating,
  verified,
  showOnlineStatus,
  className = '',
  showName = false,
  showNameRight = false,
  additionalInfo,
  disabled = false
}: ClickableUserProfileProps) {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const handleClick = () => {
    if (disabled) return;
    const path = getUserProfilePath(user.id, currentUser?.id);
    navigate(path);
  };

  const avatarUrl = user.profile_photo_url || user.avatar_url;
  const userWithAvatar = {
    ...user,
    avatar_url: avatarUrl
  };

  if (!showName && !showNameRight) {
    return (
      <UserAvatar
        user={userWithAvatar}
        size={size}
        onClick={handleClick}
        rating={rating}
        verified={verified}
        showOnlineStatus={showOnlineStatus}
        className={className}
      />
    );
  }

  if (showNameRight) {
    return (
      <div
        className={`flex items-center gap-3 ${disabled ? '' : 'cursor-pointer hover:opacity-80 transition-opacity'} ${className}`}
        onClick={handleClick}
      >
        <UserAvatar
          user={userWithAvatar}
          size={size}
          rating={rating}
          verified={verified}
          showOnlineStatus={showOnlineStatus}
        />
        <div className="flex flex-col min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {user.full_name}
          </p>
          {additionalInfo && (
            <div className="text-xs text-gray-500 truncate">
              {additionalInfo}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center gap-2 ${disabled ? '' : 'cursor-pointer hover:opacity-80 transition-opacity'} ${className}`}
      onClick={handleClick}
    >
      <UserAvatar
        user={userWithAvatar}
        size={size}
        rating={rating}
        verified={verified}
        showOnlineStatus={showOnlineStatus}
      />
      <div className="text-center">
        <p className="text-sm font-medium text-gray-900">
          {user.full_name}
        </p>
        {additionalInfo && (
          <div className="text-xs text-gray-500">
            {additionalInfo}
          </div>
        )}
      </div>
    </div>
  );
}
