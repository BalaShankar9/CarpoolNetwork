export interface PresenceIndicatorProps {
  status: 'online' | 'idle' | 'offline';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
} as const;

const statusConfig = {
  online: {
    color: 'bg-green-500',
    label: 'Online',
    animation: 'animate-presence-pulse',
  },
  idle: {
    color: 'bg-amber-400',
    label: 'Idle',
    animation: '',
  },
  offline: {
    color: 'bg-gray-300',
    label: 'Offline',
    animation: '',
  },
} as const;

export default function PresenceIndicator({
  status,
  size = 'md',
  showLabel = false,
  className = '',
}: PresenceIndicatorProps) {
  const config = statusConfig[status];
  const sizeClass = sizeMap[size];

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className={`
          ${sizeClass}
          ${config.color}
          ${config.animation}
          rounded-full
          ring-2
          ring-white
          flex-shrink-0
        `}
        aria-label={config.label}
        role="status"
      />
      {showLabel && (
        <span className="text-xs text-gray-500 font-medium">
          {config.label}
        </span>
      )}
    </span>
  );
}
