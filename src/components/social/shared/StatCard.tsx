import { type ReactNode, useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface StatCardProps {
  label: string;
  value: number;
  icon: ReactNode;
  trend?: number; // positive = up, negative = down
  suffix?: string;
  gradient?: string; // Tailwind gradient classes
}

/**
 * Animates a number from 0 to `target` over `duration` ms.
 */
function useCountUp(target: number, duration = 800) {
  const [count, setCount] = useState(0);
  const frameRef = useRef<number>();
  const startRef = useRef<number>();

  useEffect(() => {
    startRef.current = undefined;

    const step = (timestamp: number) => {
      if (startRef.current === undefined) {
        startRef.current = timestamp;
      }
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out quad
      const easedProgress = 1 - (1 - progress) * (1 - progress);
      setCount(Math.round(easedProgress * target));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      }
    };

    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return count;
}

function MiniSparkline({ trend }: { trend: number }) {
  // Generate a simple sparkline shape based on trend direction
  const points =
    trend >= 0
      ? [
          [0, 16],
          [10, 14],
          [20, 12],
          [30, 10],
          [40, 6],
          [50, 4],
          [60, 2],
        ]
      : [
          [0, 2],
          [10, 4],
          [20, 6],
          [30, 10],
          [40, 12],
          [50, 14],
          [60, 16],
        ];

  const pathData =
    'M' + points.map(([x, y]) => `${x},${y}`).join(' L');

  return (
    <svg
      width="60"
      height="20"
      viewBox="0 0 60 20"
      className="flex-shrink-0"
      aria-hidden="true"
    >
      <path
        d={pathData}
        fill="none"
        stroke={trend >= 0 ? '#10b981' : '#ef4444'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r="2"
          fill={trend >= 0 ? '#10b981' : '#ef4444'}
        />
      ))}
    </svg>
  );
}

export default function StatCard({
  label,
  value,
  icon,
  trend,
  suffix = '',
  gradient = 'from-social-warm-500 to-social-warm-600',
}: StatCardProps) {
  const animatedValue = useCountUp(value);

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
      {/* Icon */}
      <div
        className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} text-white flex-shrink-0`}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium truncate">{label}</p>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="text-xl font-bold text-gray-900 tabular-nums">
            {animatedValue.toLocaleString()}
          </span>
          {suffix && (
            <span className="text-xs text-gray-500 font-medium">{suffix}</span>
          )}
        </div>

        {/* Trend */}
        {trend !== undefined && trend !== 0 && (
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                trend > 0 ? 'text-green-600' : 'text-red-500'
              }`}
            >
              {trend > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {Math.abs(trend)}%
            </span>
            <MiniSparkline trend={trend} />
          </div>
        )}
      </div>
    </div>
  );
}
