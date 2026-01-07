// Wait List Component - Join and manage wait lists for full rides
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Users,
  Bell,
  BellOff,
  Zap,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { matchingService, WaitListEntry } from '@/services/matchingService';
import { useAuth } from '@/contexts/AuthContext';

interface WaitListProps {
  rideId: string;
  rideName: string;
  availableSeats: number;
  onClose?: () => void;
}

export function WaitList({ rideId, rideName, availableSeats, onClose }: WaitListProps) {
  const { user } = useAuth();
  const [waitList, setWaitList] = useState<WaitListEntry[]>([]);
  const [userPosition, setUserPosition] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [options, setOptions] = useState({
    notifyOnAvailable: true,
    autoBook: false,
  });

  useEffect(() => {
    loadWaitList();
  }, [rideId, user]);

  const loadWaitList = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [list, position] = await Promise.all([
        matchingService.getRideWaitList(rideId),
        matchingService.getWaitListPosition(user.id, rideId),
      ]);
      setWaitList(list);
      setUserPosition(position);
    } catch (error) {
      console.error('Failed to load wait list:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user) return;
    setJoining(true);
    try {
      await matchingService.joinWaitList(user.id, rideId, options);
      await loadWaitList();
    } catch (error) {
      console.error('Failed to join wait list:', error);
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!user || !confirm('Leave the wait list?')) return;
    try {
      await matchingService.leaveWaitList(user.id, rideId);
      setUserPosition(null);
      await loadWaitList();
    } catch (error) {
      console.error('Failed to leave wait list:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  const isOnWaitList = userPosition !== null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6" />
            <div>
              <h3 className="font-bold">Wait List</h3>
              <p className="text-sm opacity-90">{rideName}</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        {/* Status Banner */}
        {availableSeats > 0 ? (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg mb-4">
            <CheckCircle className="w-5 h-5" />
            <span>{availableSeats} seat(s) available - Book now!</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg mb-4">
            <AlertCircle className="w-5 h-5" />
            <span>Ride is full - Join the wait list</span>
          </div>
        )}

        {/* User's Wait List Status */}
        {isOnWaitList ? (
          <div className="mb-6">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900 dark:text-white">You're on the list!</h4>
                <button
                  onClick={handleLeave}
                  className="text-sm text-red-500 hover:text-red-600 font-medium"
                >
                  Leave
                </button>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    #{userPosition}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Your Position</p>
                </div>
                <div className="flex-1 text-sm text-gray-600 dark:text-gray-400">
                  {userPosition === 1 ? (
                    <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                      🎉 You're next in line!
                    </p>
                  ) : (
                    <p>{userPosition! - 1} people ahead of you</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Join Form */
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
              Join the Wait List
            </h4>

            <div className="space-y-3 mb-4">
              {/* Notification Option */}
              <button
                onClick={() => setOptions((p) => ({ ...p, notifyOnAvailable: !p.notifyOnAvailable }))}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                  options.notifyOnAvailable
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {options.notifyOnAvailable ? (
                  <Bell className="w-5 h-5 text-emerald-500" />
                ) : (
                  <BellOff className="w-5 h-5 text-gray-400" />
                )}
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900 dark:text-white">Notify me</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Get notified when a seat becomes available
                  </p>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    options.notifyOnAvailable
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {options.notifyOnAvailable && (
                    <CheckCircle className="w-full h-full text-white" />
                  )}
                </div>
              </button>

              {/* Auto-book Option */}
              <button
                onClick={() => setOptions((p) => ({ ...p, autoBook: !p.autoBook }))}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                  options.autoBook
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <Zap
                  className={`w-5 h-5 ${options.autoBook ? 'text-purple-500' : 'text-gray-400'}`}
                />
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900 dark:text-white">Auto-book</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Automatically book when available
                  </p>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    options.autoBook
                      ? 'bg-purple-500 border-purple-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {options.autoBook && <CheckCircle className="w-full h-full text-white" />}
                </div>
              </button>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleJoin}
              disabled={joining}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {joining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  Join Wait List
                </>
              )}
            </motion.button>
          </div>
        )}

        {/* Wait List Display */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900 dark:text-white">Current Wait List</h4>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {waitList.length} {waitList.length === 1 ? 'person' : 'people'}
            </span>
          </div>

          {waitList.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Users className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 dark:text-gray-400">No one on the wait list yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">Be the first in line!</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {waitList.slice(0, 5).map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      entry.userId === user?.id
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-gray-50 dark:bg-gray-700/50'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        entry.position === 1
                          ? 'bg-amber-100 text-amber-700'
                          : entry.position === 2
                          ? 'bg-gray-200 text-gray-700'
                          : entry.position === 3
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {entry.position}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {entry.userId === user?.id ? 'You' : `Passenger #${entry.position}`}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Joined {formatTimeAgo(entry.joinedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {entry.notifyOnAvailable && (
                        <Bell className="w-4 h-4 text-gray-400" />
                      )}
                      {entry.autoBook && <Zap className="w-4 h-4 text-purple-400" />}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {waitList.length > 5 && (
                <p className="text-center text-sm text-gray-500 dark:text-gray-500 py-2">
                  +{waitList.length - 5} more
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Inline Wait List Button for ride cards
interface WaitListButtonProps {
  rideId: string;
  className?: string;
}

export function WaitListButton({ rideId, className = '' }: WaitListButtonProps) {
  const { user } = useAuth();
  const [position, setPosition] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (user) {
      checkPosition();
    }
  }, [user, rideId]);

  const checkPosition = async () => {
    if (!user) return;
    try {
      const pos = await matchingService.getWaitListPosition(user.id, rideId);
      setPosition(pos);
    } catch {
      // Ignore
    }
  };

  const handleQuickJoin = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await matchingService.joinWaitList(user.id, rideId, {
        notifyOnAvailable: true,
        autoBook: false,
      });
      await checkPosition();
    } catch (error) {
      console.error('Failed to join wait list:', error);
    } finally {
      setLoading(false);
    }
  };

  if (position !== null) {
    return (
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-1 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg text-sm font-medium ${className}`}
      >
        <Clock className="w-3.5 h-3.5" />
        #{position} in line
      </button>
    );
  }

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleQuickJoin}
        disabled={loading}
        className={`flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 ${className}`}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Users className="w-3.5 h-3.5" />
        )}
        Join Wait List
      </motion.button>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <WaitList
                rideId={rideId}
                rideName="This Ride"
                availableSeats={0}
                onClose={() => setShowModal(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

export default WaitList;
