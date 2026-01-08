import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    User,
    Mail,
    Phone,
    Star,
    Shield,
    MessageSquare,
    ExternalLink,
    Copy,
    Check,
} from 'lucide-react';
import { toast } from '../../lib/toast';

interface QuickUserCardProps {
    user: {
        id: string;
        full_name: string;
        email: string;
        phone?: string | null;
        avatar_url?: string | null;
        rating?: number | null;
        trust_score?: number | null;
        verified?: boolean;
    };
    role: 'driver' | 'passenger' | 'user';
    onViewProfile?: () => void;
    onMessage?: () => void;
    compact?: boolean;
    showActions?: boolean;
}

export default function QuickUserCard({
    user,
    role,
    onViewProfile,
    onMessage,
    compact = false,
    showActions = true,
}: QuickUserCardProps) {
    const navigate = useNavigate();
    const [copiedEmail, setCopiedEmail] = useState(false);
    const [copiedPhone, setCopiedPhone] = useState(false);

    const handleCopyEmail = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(user.email);
        setCopiedEmail(true);
        toast.success('Email copied!');
        setTimeout(() => setCopiedEmail(false), 2000);
    };

    const handleCopyPhone = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (user.phone) {
            await navigator.clipboard.writeText(user.phone);
            setCopiedPhone(true);
            toast.success('Phone copied!');
            setTimeout(() => setCopiedPhone(false), 2000);
        }
    };

    const handleViewProfile = () => {
        if (onViewProfile) {
            onViewProfile();
        } else {
            navigate(`/admin/users?userId=${user.id}`);
        }
    };

    const getRoleColor = () => {
        switch (role) {
            case 'driver':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'passenger':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getTrustScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        if (score >= 40) return 'text-orange-600';
        return 'text-red-600';
    };

    if (compact) {
        return (
            <div className="flex items-center gap-3">
                <div className="relative">
                    {user.avatar_url ? (
                        <img
                            src={user.avatar_url}
                            alt={user.full_name}
                            className="w-8 h-8 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                            {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                    )}
                    {user.verified && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                    )}
                </div>
                <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{user.full_name || 'Unknown User'}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                {user.rating && (
                    <div className="flex items-center gap-1 text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span className="text-xs font-medium">{user.rating.toFixed(1)}</span>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
                <div className="relative flex-shrink-0">
                    {user.avatar_url ? (
                        <img
                            src={user.avatar_url}
                            alt={user.full_name}
                            className="w-12 h-12 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-medium">
                            {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                    )}
                    {user.verified && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                            <Check className="w-3 h-3 text-white" />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900 truncate">
                            {user.full_name || 'Unknown User'}
                        </h4>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full border capitalize ${getRoleColor()}`}>
                            {role}
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                        {user.rating && (
                            <div className="flex items-center gap-1 text-amber-500">
                                <Star className="w-4 h-4 fill-current" />
                                <span className="font-medium">{user.rating.toFixed(1)}</span>
                            </div>
                        )}
                        {user.trust_score !== undefined && user.trust_score !== null && (
                            <div className={`flex items-center gap-1 ${getTrustScoreColor(user.trust_score)}`}>
                                <Shield className="w-4 h-4" />
                                <span className="font-medium">{user.trust_score}%</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="truncate flex-1">{user.email}</span>
                    <button
                        onClick={handleCopyEmail}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        title="Copy email"
                    >
                        {copiedEmail ? (
                            <Check className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                            <Copy className="w-3.5 h-3.5 text-gray-400" />
                        )}
                    </button>
                </div>
                {user.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="flex-1">{user.phone}</span>
                        <button
                            onClick={handleCopyPhone}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="Copy phone"
                        >
                            {copiedPhone ? (
                                <Check className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                                <Copy className="w-3.5 h-3.5 text-gray-400" />
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Actions */}
            {showActions && (
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <button
                        onClick={handleViewProfile}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Profile
                    </button>
                    {onMessage && (
                        <button
                            onClick={onMessage}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                        >
                            <MessageSquare className="w-4 h-4" />
                            Message
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
