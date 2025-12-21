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

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const content = (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        <img
          src="/{a5cd9703-4f5f-4721-b7d1-1107e978797e}.png"
          alt="Carpool Network Logo"
          className={`${sizeClasses[size]} object-contain transform hover:scale-105 transition-transform duration-200`}
        />
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
