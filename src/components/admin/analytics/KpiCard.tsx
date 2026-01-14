/**
 * KPI Card Component
 * 
 * Displays a single KPI metric with value, delta indicator, and optional sparkline.
 */

import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface KpiCardProps {
  title: string;
  description?: string;
  value: string | number;
  delta?: number;
  icon: ReactNode;
  color: 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'teal' | 'indigo';
  sparklineData?: { value: number }[];
  isLoading?: boolean;
  onClick?: () => void;
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-100',
    chart: '#3B82F6',
  },
  green: {
    bg: 'bg-green-50',
    text: 'text-green-600',
    border: 'border-green-100',
    chart: '#10B981',
  },
  orange: {
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    border: 'border-orange-100',
    chart: '#F59E0B',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-100',
    chart: '#8B5CF6',
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-100',
    chart: '#EF4444',
  },
  teal: {
    bg: 'bg-teal-50',
    text: 'text-teal-600',
    border: 'border-teal-100',
    chart: '#14B8A6',
  },
  indigo: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    border: 'border-indigo-100',
    chart: '#6366F1',
  },
};

export default function KpiCard({
  title,
  description,
  value,
  delta,
  icon,
  color,
  sparklineData,
  isLoading = false,
  onClick,
}: KpiCardProps) {
  const colors = colorClasses[color];

  const getDeltaInfo = () => {
    if (delta === undefined || delta === null) return null;
    
    if (delta > 0) {
      return {
        icon: <TrendingUp className="w-4 h-4" />,
        text: `+${delta.toFixed(1)}%`,
        className: 'text-green-600 bg-green-50',
      };
    } else if (delta < 0) {
      return {
        icon: <TrendingDown className="w-4 h-4" />,
        text: `${delta.toFixed(1)}%`,
        className: 'text-red-600 bg-red-50',
      };
    }
    return {
      icon: <Minus className="w-4 h-4" />,
      text: '0%',
      className: 'text-gray-500 bg-gray-50',
    };
  };

  const deltaInfo = getDeltaInfo();

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm animate-pulse">
        <div className="flex items-start justify-between gap-2">
          <div className={`w-10 h-10 rounded-lg ${colors.bg}`} />
          <div className="w-16 h-6 bg-gray-200 rounded" />
        </div>
        <div className="mt-3">
          <div className="h-8 w-24 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-20 bg-gray-100 rounded" />
        </div>
        {sparklineData && (
          <div className="mt-3 h-10 bg-gray-100 rounded" />
        )}
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.bg} ${colors.text} ${colors.border} border`}>
          {icon}
        </div>
        {deltaInfo && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${deltaInfo.className}`}>
            {deltaInfo.icon}
            <span>{deltaInfo.text}</span>
          </div>
        )}
      </div>
      
      <div className="mt-3">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{title}</p>
        {description && (
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      
      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-3 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData}>
              <Line
                type="monotone"
                dataKey="value"
                stroke={colors.chart}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
