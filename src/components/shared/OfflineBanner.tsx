import { WifiOff } from 'lucide-react';
import { useOfflineStatus } from '../../services/offlineSupport';

export default function OfflineBanner() {
  const { isOnline, queueLength } = useOfflineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <WifiOff className="w-4 h-4" />
          <span>You're offline. Actions will be queued.</span>
        </div>
        {queueLength > 0 && (
          <span className="font-medium">{queueLength} queued</span>
        )}
      </div>
    </div>
  );
}
