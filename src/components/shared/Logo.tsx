import { Car, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  clickable?: boolean;
}

export default function Logo({ size = 'md', showText = true, className = '', clickable = true }: LogoProps) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-16 h-16',
  };

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-8 h-8',
  };

  const smallIconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-4 h-4',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const content = (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        <div className={`${sizeClasses[size]} bg-gradient-to-br from-red-500 via-red-600 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-200`}>
          <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent rounded-2xl"></div>
          <div className="relative">
            <Car className={`${iconSizes[size]} text-white drop-shadow-md`} strokeWidth={2.5} />
            <Users className={`${smallIconSizes[size]} text-white absolute -bottom-1 -right-1 bg-orange-500 rounded-full p-0.5`} strokeWidth={3} />
          </div>
        </div>
      </div>
      {showText && (
        <div>
          <span className={`${textSizes[size]} font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent`}>
            Carpool Network
          </span>
          <p className="text-xs font-medium text-orange-600 -mt-1">Community Carpooling</p>
        </div>
      )}
    </div>
  );

  if (clickable) {
    return (
      <Link to="/" className="cursor-pointer">
        {content}
      </Link>
    );
  }

  return content;
}
