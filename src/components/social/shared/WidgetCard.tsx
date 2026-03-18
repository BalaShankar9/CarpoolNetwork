import { type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface WidgetCardProps {
  title: string;
  icon: ReactNode;
  badge?: number | string;
  seeAllLink?: string;
  seeAllLabel?: string;
  loading?: boolean;
  children: ReactNode;
  className?: string;
  gradient?: string;
}

function WidgetCardSkeleton() {
  return (
    <div className="space-y-3 animate-pulse-soft">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-200 rounded-full w-3/4" />
          <div className="h-2 bg-gray-100 rounded-full w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-12 bg-gray-100 rounded-xl" />
        <div className="h-12 bg-gray-100 rounded-xl" />
        <div className="h-12 bg-gray-50 rounded-xl" />
      </div>
    </div>
  );
}

export default function WidgetCard({
  title,
  icon,
  badge,
  seeAllLink,
  seeAllLabel = 'See all',
  loading = false,
  children,
  className = '',
  gradient,
}: WidgetCardProps) {
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`flex items-center justify-center w-9 h-9 rounded-xl ${
              gradient
                ? `bg-gradient-to-br ${gradient}`
                : 'bg-gray-100'
            }`}
          >
            {icon}
          </div>
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {title}
          </h3>
          {badge !== undefined && badge !== 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold text-white bg-social-warm-500 rounded-full">
              {typeof badge === 'number' && badge > 99 ? '99+' : badge}
            </span>
          )}
        </div>

        {seeAllLink && !loading && (
          <Link
            to={seeAllLink}
            className="flex items-center gap-0.5 text-xs font-medium text-social-warm-600 hover:text-social-warm-700 transition-colors whitespace-nowrap"
          >
            {seeAllLabel}
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Body */}
      <div className="px-4 pb-4">
        {loading ? <WidgetCardSkeleton /> : children}
      </div>

      {/* Footer with "See all" for mobile - only shown if seeAllLink and not loading */}
      {seeAllLink && !loading && (
        <Link
          to={seeAllLink}
          className="flex items-center justify-center gap-1 px-4 py-2.5 text-xs font-medium text-social-warm-600 hover:text-social-warm-700 hover:bg-social-warm-50 border-t border-gray-100 transition-colors sm:hidden"
        >
          {seeAllLabel}
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}
