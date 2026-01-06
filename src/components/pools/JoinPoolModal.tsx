import React, { useState } from 'react';
import { X, Users, Key, Car, Check, AlertCircle } from 'lucide-react';

interface JoinPoolModalProps {
    isOpen: boolean;
    onClose: () => void;
    onJoinPublic?: (isDriver: boolean) => Promise<void>;
    onJoinByCode?: (code: string, isDriver: boolean) => Promise<void>;
    poolName?: string;
    isPrivate?: boolean;
}

export const JoinPoolModal: React.FC<JoinPoolModalProps> = ({
    isOpen,
    onClose,
    onJoinPublic,
    onJoinByCode,
    poolName,
    isPrivate = false,
}) => {
    const [mode, setMode] = useState<'confirm' | 'code'>(isPrivate ? 'code' : 'confirm');
    const [inviteCode, setInviteCode] = useState('');
    const [isDriver, setIsDriver] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleJoin = async () => {
        setError(null);
        setIsSubmitting(true);

        try {
            if (mode === 'code' && onJoinByCode) {
                if (!inviteCode.trim()) {
                    setError('Please enter an invite code');
                    return;
                }
                await onJoinByCode(inviteCode.trim().toUpperCase(), isDriver);
            } else if (onJoinPublic) {
                await onJoinPublic(isDriver);
            }
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to join pool');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Join Pool
                            </h2>
                            {poolName && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {poolName}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Mode toggle - only show if both options available */}
                    {onJoinPublic && onJoinByCode && !poolName && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setMode('confirm')}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'confirm'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                    }`}
                            >
                                Join Public Pool
                            </button>
                            <button
                                onClick={() => setMode('code')}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'code'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                    }`}
                            >
                                Use Invite Code
                            </button>
                        </div>
                    )}

                    {/* Invite Code Input */}
                    {mode === 'code' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <Key className="w-4 h-4 inline mr-1" />
                                Invite Code
                            </label>
                            <input
                                type="text"
                                value={inviteCode}
                                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                                placeholder="Enter 6-character code"
                                maxLength={6}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono text-center text-xl tracking-widest uppercase"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Ask the pool admin for the invite code
                            </p>
                        </div>
                    )}

                    {/* Driver/Passenger selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Join as
                        </label>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsDriver(false)}
                                className={`flex-1 p-3 rounded-lg border-2 transition-colors ${!isDriver
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-200 dark:border-gray-600'
                                    }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <Users className={`w-5 h-5 ${!isDriver ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                                    <span className={`font-medium ${!isDriver ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                        Passenger
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Looking for rides
                                </p>
                            </button>

                            <button
                                onClick={() => setIsDriver(true)}
                                className={`flex-1 p-3 rounded-lg border-2 transition-colors ${isDriver
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-200 dark:border-gray-600'
                                    }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <Car className={`w-5 h-5 ${isDriver ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                                    <span className={`font-medium ${isDriver ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                        Driver
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Can offer rides
                                </p>
                            </button>
                        </div>
                    </div>

                    {/* Confirmation message */}
                    {mode === 'confirm' && poolName && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                You're about to join <strong>{poolName}</strong>. You'll be able to see other members and coordinate rides together.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleJoin}
                        disabled={isSubmitting || (mode === 'code' && !inviteCode.trim())}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Joining...
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                Join Pool
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JoinPoolModal;
