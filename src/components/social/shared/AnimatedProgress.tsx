import { type ReactNode, useId } from 'react';
import { motion } from 'framer-motion';

/* -------------------------------------------------------------------------- */
/*  Circular Progress                                                         */
/* -------------------------------------------------------------------------- */

export interface AnimatedCircularProgressProps {
  value: number; // 0-100
  size?: number; // diameter in px, default 64
  strokeWidth?: number; // default 4
  gradient?: { from: string; to: string };
  showValue?: boolean;
  label?: string;
  children?: ReactNode;
}

export function AnimatedCircularProgress({
  value,
  size = 64,
  strokeWidth = 4,
  gradient,
  showValue = false,
  label,
  children,
}: AnimatedCircularProgressProps) {
  const gradientId = useId();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || `${clampedValue}% progress`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {gradient && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={gradient.from} />
              <stop offset="100%" stopColor={gradient.to} />
            </linearGradient>
          </defs>
        )}

        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200"
        />

        {/* Progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={gradient ? `url(#${gradientId})` : 'currentColor'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{
            strokeDashoffset:
              circumference - (clampedValue / 100) * circumference,
          }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={gradient ? '' : 'text-social-warm-500'}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children ? (
          children
        ) : showValue ? (
          <span className="text-sm font-semibold text-gray-900">
            {Math.round(clampedValue)}%
          </span>
        ) : null}
        {label && !children && (
          <span className="text-[10px] text-gray-500 mt-0.5">{label}</span>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Linear Progress                                                           */
/* -------------------------------------------------------------------------- */

export interface AnimatedLinearProgressProps {
  value: number; // 0-100
  gradient?: string; // Tailwind gradient classes, e.g. 'from-social-warm-400 to-social-warm-600'
  height?: number; // px, default 6
  showValue?: boolean;
  animated?: boolean;
  className?: string;
}

export function AnimatedLinearProgress({
  value,
  gradient = 'from-social-warm-400 to-social-warm-600',
  height = 6,
  showValue = false,
  animated = true,
  className = '',
}: AnimatedLinearProgressProps) {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div className={`w-full ${className}`}>
      {showValue && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">Progress</span>
          <span className="text-xs font-semibold text-gray-700">
            {Math.round(clampedValue)}%
          </span>
        </div>
      )}
      <div
        className="w-full bg-gray-200 rounded-full overflow-hidden"
        style={{ height }}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {animated ? (
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
            initial={{ width: 0 }}
            animate={{ width: `${clampedValue}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        ) : (
          <div
            className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
            style={{ width: `${clampedValue}%` }}
          />
        )}
      </div>
    </div>
  );
}
