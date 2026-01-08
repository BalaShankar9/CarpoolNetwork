import { useState } from 'react';
import {
    X,
    AlertTriangle,
    Ban,
    ShieldAlert,
    UserCheck,
    ShieldCheck,
    Flag,
    Award,
    Sliders
} from 'lucide-react';

export type AccountActionType = 'warn' | 'suspend' | 'ban' | 'reinstate' | 'verify' | 'flag' | 'badge' | 'trust_score';

interface AccountActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: AccountActionData) => Promise<void>;
    actionType: AccountActionType;
    userName: string;
    userId: string;
    currentTrustScore?: number;
}

export interface AccountActionData {
    actionType: AccountActionType;
    userId: string;
    // Warning fields
    warningType?: string;
    severity?: string;
    title?: string;
    description?: string;
    // Suspension fields
    reason?: string;
    durationDays?: number | null;
    notifyUser?: boolean;
    // Flag fields
    flagType?: string;
    priority?: string;
    // Badge fields
    badge?: string;
    badgeAction?: 'add' | 'remove';
    // Trust score fields
    newTrustScore?: number;
}

const warningTypes = [
    { value: 'behavior', label: 'Behavior Issue' },
    { value: 'content', label: 'Inappropriate Content' },
    { value: 'safety', label: 'Safety Concern' },
    { value: 'spam', label: 'Spam/Abuse' },
    { value: 'fraud', label: 'Fraud/Scam' },
    { value: 'terms_violation', label: 'Terms Violation' },
    { value: 'other', label: 'Other' },
];

const severityOptions = [
    { value: 'notice', label: 'Notice (Informational)' },
    { value: 'warning', label: 'Warning' },
    { value: 'final_warning', label: 'Final Warning' },
];

const flagTypes = [
    { value: 'review_needed', label: 'Review Needed' },
    { value: 'suspicious', label: 'Suspicious Activity' },
    { value: 'high_risk', label: 'High Risk' },
    { value: 'vip', label: 'VIP User' },
    { value: 'watch', label: 'Watch List' },
    { value: 'fraud_alert', label: 'Fraud Alert' },
];

const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
];

const availableBadges = [
    'verified', 'premium', 'trusted_driver', 'top_passenger', 'community_leader',
    'early_adopter', 'frequent_traveler', 'eco_friendly', 'helpful', 'super_host'
];

export function AccountActionModal({
    isOpen,
    onClose,
    onSubmit,
    actionType,
    userName,
    userId,
    currentTrustScore = 50,
}: AccountActionModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<AccountActionData>({
        actionType,
        userId,
        warningType: 'behavior',
        severity: 'warning',
        title: '',
        description: '',
        reason: '',
        durationDays: 7,
        notifyUser: true,
        flagType: 'review_needed',
        priority: 'normal',
        badge: 'verified',
        badgeAction: 'add',
        newTrustScore: currentTrustScore,
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit(formData);
            onClose();
        } catch (error) {
            console.error('Action failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const getModalConfig = () => {
        switch (actionType) {
            case 'warn':
                return {
                    title: 'Issue Warning',
                    icon: AlertTriangle,
                    iconColor: 'text-yellow-500',
                    buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
                    buttonText: 'Issue Warning',
                };
            case 'suspend':
                return {
                    title: 'Suspend User',
                    icon: ShieldAlert,
                    iconColor: 'text-orange-500',
                    buttonColor: 'bg-orange-600 hover:bg-orange-700',
                    buttonText: 'Suspend User',
                };
            case 'ban':
                return {
                    title: 'Ban User',
                    icon: Ban,
                    iconColor: 'text-red-500',
                    buttonColor: 'bg-red-600 hover:bg-red-700',
                    buttonText: 'Ban User Permanently',
                };
            case 'reinstate':
                return {
                    title: 'Reinstate User',
                    icon: UserCheck,
                    iconColor: 'text-green-500',
                    buttonColor: 'bg-green-600 hover:bg-green-700',
                    buttonText: 'Reinstate User',
                };
            case 'verify':
                return {
                    title: 'Verify User Identity',
                    icon: ShieldCheck,
                    iconColor: 'text-blue-500',
                    buttonColor: 'bg-blue-600 hover:bg-blue-700',
                    buttonText: 'Verify Identity',
                };
            case 'flag':
                return {
                    title: 'Flag User',
                    icon: Flag,
                    iconColor: 'text-orange-500',
                    buttonColor: 'bg-orange-600 hover:bg-orange-700',
                    buttonText: 'Add Flag',
                };
            case 'badge':
                return {
                    title: 'Manage Badge',
                    icon: Award,
                    iconColor: 'text-purple-500',
                    buttonColor: 'bg-purple-600 hover:bg-purple-700',
                    buttonText: formData.badgeAction === 'add' ? 'Add Badge' : 'Remove Badge',
                };
            case 'trust_score':
                return {
                    title: 'Update Trust Score',
                    icon: Sliders,
                    iconColor: 'text-blue-500',
                    buttonColor: 'bg-blue-600 hover:bg-blue-700',
                    buttonText: 'Update Score',
                };
            default:
                return {
                    title: 'Action',
                    icon: AlertTriangle,
                    iconColor: 'text-gray-500',
                    buttonColor: 'bg-gray-600 hover:bg-gray-700',
                    buttonText: 'Submit',
                };
        }
    };

    const config = getModalConfig();
    const Icon = config.icon;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full bg-gray-100 dark:bg-gray-700 ${config.iconColor}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{config.title}</h2>
                            <p className="text-sm text-gray-500">User: {userName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Warning Form */}
                    {actionType === 'warn' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Warning Type
                                </label>
                                <select
                                    value={formData.warningType}
                                    onChange={(e) => setFormData({ ...formData, warningType: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                    required
                                >
                                    {warningTypes.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Severity
                                </label>
                                <select
                                    value={formData.severity}
                                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                    required
                                >
                                    {severityOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Warning Title
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Brief title for the warning"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Detailed explanation of the warning..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                    required
                                />
                            </div>

                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.notifyUser}
                                    onChange={(e) => setFormData({ ...formData, notifyUser: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">Notify user about this warning</span>
                            </label>
                        </>
                    )}

                    {/* Suspend Form */}
                    {actionType === 'suspend' && (
                        <>
                            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg text-sm text-orange-800 dark:text-orange-200">
                                This will immediately suspend the user's account. They will not be able to access the platform until reinstated.
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Reason for Suspension
                                </label>
                                <textarea
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    placeholder="Explain why this user is being suspended..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Duration (days)
                                </label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="number"
                                        min="1"
                                        max="365"
                                        value={formData.durationDays ?? ''}
                                        onChange={(e) => setFormData({ ...formData, durationDays: e.target.value ? parseInt(e.target.value) : null })}
                                        placeholder="e.g., 7"
                                        className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                    />
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={formData.durationDays === null}
                                            onChange={(e) => setFormData({ ...formData, durationDays: e.target.checked ? null : 7 })}
                                            className="w-4 h-4 text-blue-600 rounded"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Indefinite</span>
                                    </label>
                                </div>
                            </div>

                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.notifyUser}
                                    onChange={(e) => setFormData({ ...formData, notifyUser: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">Notify user about suspension</span>
                            </label>
                        </>
                    )}

                    {/* Ban Form */}
                    {actionType === 'ban' && (
                        <>
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">
                                <strong>Warning:</strong> This will permanently ban the user. This action should only be used for serious violations.
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Reason for Ban
                                </label>
                                <textarea
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    placeholder="Document the reason for this permanent ban..."
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                    required
                                />
                            </div>

                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.notifyUser}
                                    onChange={(e) => setFormData({ ...formData, notifyUser: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">Send ban notification to user</span>
                            </label>
                        </>
                    )}

                    {/* Reinstate Form */}
                    {actionType === 'reinstate' && (
                        <>
                            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-800 dark:text-green-200">
                                This will restore the user's account to active status and allow them to use the platform again.
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Reason for Reinstatement (Optional)
                                </label>
                                <textarea
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    placeholder="Document why the user is being reinstated..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                />
                            </div>

                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.notifyUser}
                                    onChange={(e) => setFormData({ ...formData, notifyUser: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">Notify user about reinstatement</span>
                            </label>
                        </>
                    )}

                    {/* Verify Form */}
                    {actionType === 'verify' && (
                        <>
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                                This will mark the user's identity as verified and add a verified badge to their profile.
                            </div>

                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.notifyUser}
                                    onChange={(e) => setFormData({ ...formData, notifyUser: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">Notify user about verification</span>
                            </label>
                        </>
                    )}

                    {/* Flag Form */}
                    {actionType === 'flag' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Flag Type
                                </label>
                                <select
                                    value={formData.flagType}
                                    onChange={(e) => setFormData({ ...formData, flagType: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                    required
                                >
                                    {flagTypes.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Priority
                                </label>
                                <select
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                    required
                                >
                                    {priorityOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Reason
                                </label>
                                <textarea
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    placeholder="Explain why this user is being flagged..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                />
                            </div>
                        </>
                    )}

                    {/* Badge Form */}
                    {actionType === 'badge' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Action
                                </label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="badgeAction"
                                            value="add"
                                            checked={formData.badgeAction === 'add'}
                                            onChange={() => setFormData({ ...formData, badgeAction: 'add' })}
                                            className="w-4 h-4 text-blue-600"
                                        />
                                        <span className="text-sm">Add Badge</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="badgeAction"
                                            value="remove"
                                            checked={formData.badgeAction === 'remove'}
                                            onChange={() => setFormData({ ...formData, badgeAction: 'remove' })}
                                            className="w-4 h-4 text-blue-600"
                                        />
                                        <span className="text-sm">Remove Badge</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Badge
                                </label>
                                <select
                                    value={formData.badge}
                                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                    required
                                >
                                    {availableBadges.map(badge => (
                                        <option key={badge} value={badge}>{badge.replace('_', ' ')}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    {/* Trust Score Form */}
                    {actionType === 'trust_score' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    New Trust Score: {formData.newTrustScore}
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={formData.newTrustScore}
                                    onChange={(e) => setFormData({ ...formData, newTrustScore: parseInt(e.target.value) })}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>0 (Low)</span>
                                    <span>50 (Average)</span>
                                    <span>100 (High)</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Reason for Change
                                </label>
                                <textarea
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    placeholder="Explain why the trust score is being adjusted..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                    required
                                />
                            </div>
                        </>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${config.buttonColor}`}
                        >
                            {loading ? 'Processing...' : config.buttonText}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
