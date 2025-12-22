import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

interface LoadingContextType {
  startLoading: (key: string, message?: string) => void;
  stopLoading: (key: string) => void;
  updateProgress: (key: string, progress: number) => void;
  isLoading: (key?: string) => boolean;
  getMessage: () => string | undefined;
  getProgress: () => number | undefined;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [loadingStates, setLoadingStates] = useState<Map<string, LoadingState>>(new Map());

  const startLoading = (key: string, message?: string) => {
    setLoadingStates(prev => {
      const next = new Map(prev);
      next.set(key, { isLoading: true, message, progress: 0 });
      return next;
    });
  };

  const stopLoading = (key: string) => {
    setLoadingStates(prev => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  };

  const updateProgress = (key: string, progress: number) => {
    setLoadingStates(prev => {
      const next = new Map(prev);
      const current = next.get(key);
      if (current) {
        next.set(key, { ...current, progress });
      }
      return next;
    });
  };

  const isLoading = (key?: string) => {
    if (key) {
      return loadingStates.get(key)?.isLoading || false;
    }
    return loadingStates.size > 0;
  };

  const getMessage = () => {
    const firstState = Array.from(loadingStates.values())[0];
    return firstState?.message;
  };

  const getProgress = () => {
    const firstState = Array.from(loadingStates.values())[0];
    return firstState?.progress;
  };

  return (
    <LoadingContext.Provider
      value={{
        startLoading,
        stopLoading,
        updateProgress,
        isLoading,
        getMessage,
        getProgress,
      }}
    >
      {children}
      {isLoading() && <GlobalLoadingIndicator />}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
}

function GlobalLoadingIndicator() {
  const { getMessage, getProgress } = useLoading();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const message = getMessage();
  const progress = getProgress();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <div className="bg-blue-600 text-white px-4 py-3 shadow-lg">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-medium">{message || 'Loading...'}</span>
          {progress !== undefined && progress > 0 && (
            <span className="text-sm opacity-90">({progress}%)</span>
          )}
        </div>

        {progress !== undefined && progress > 0 && (
          <div className="mt-2 w-full bg-blue-700 rounded-full h-1">
            <div
              className="bg-white h-1 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
}

export function LoadingSpinner({ message, size = 'md' }: { message?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
      {message && <p className="mt-4 text-gray-600 text-sm">{message}</p>}
    </div>
  );
}

export function InlineLoader({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
    </div>
  );
}

export function SkeletonLoader({ count = 1, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}

export function ButtonLoader() {
  return <Loader2 className="w-4 h-4 animate-spin" />;
}
