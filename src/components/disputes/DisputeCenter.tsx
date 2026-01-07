import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle,
    MessageSquare,
    Clock,
    User,
    Car,
    FileText,
    Send,
    Plus,
    Check,
    X,
    ChevronRight,
    Loader2,
    Upload,
    Scale,
} from 'lucide-react';
import {
    disputeService,
    Dispute,
    DisputeType,
    DisputeMessage,
    DisputeEvidence,
} from '@/services/disputeService';

interface DisputeCenterProps {
    userId: string;
}

export function DisputeCenter({ userId }: DisputeCenterProps) {
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);

    useEffect(() => {
        loadDisputes();
    }, [userId]);

    const loadDisputes = async () => {
        try {
            const data = await disputeService.getUserDisputes(userId);
            setDisputes(data);
        } catch (error) {
            console.error('Failed to load disputes:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: Dispute['status']) => {
        switch (status) {
            case 'open':
                return 'text-yellow-400 bg-yellow-500/20';
            case 'under_review':
                return 'text-blue-400 bg-blue-500/20';
            case 'awaiting_response':
                return 'text-orange-400 bg-orange-500/20';
            case 'mediation':
                return 'text-purple-400 bg-purple-500/20';
            case 'resolved':
                return 'text-emerald-400 bg-emerald-500/20';
            case 'closed':
                return 'text-slate-400 bg-slate-500/20';
            default:
                return 'text-slate-400 bg-slate-500/20';
        }
    };

    const getPriorityColor = (priority: Dispute['priority']) => {
        switch (priority) {
            case 'urgent':
                return 'text-red-400';
            case 'high':
                return 'text-orange-400';
            case 'medium':
                return 'text-yellow-400';
            default:
                return 'text-slate-400';
        }
    };

    const getTypeIcon = (type: DisputeType) => {
        switch (type) {
            case 'payment':
                return '💰';
            case 'no_show':
                return '👻';
            case 'safety':
                return '🚨';
            case 'behavior':
                return '😤';
            case 'property_damage':
                return '💥';
            case 'route_issue':
                return '🗺️';
            case 'cancellation':
                return '❌';
            default:
                return '❓';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/20 rounded-lg">
                        <Scale className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-white">Dispute Center</h2>
                        <p className="text-sm text-slate-400">
                            {disputes.filter((d) => d.status !== 'resolved' && d.status !== 'closed').length} active
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg flex items-center gap-2 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New Dispute
                </button>
            </div>

            {/* Disputes List */}
            {disputes.length === 0 ? (
                <div className="text-center py-12 bg-slate-800/50 rounded-xl">
                    <Scale className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No disputes filed</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {disputes.map((dispute) => (
                        <motion.button
                            key={dispute.id}
                            onClick={() => setSelectedDispute(dispute)}
                            className="w-full p-4 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-700 text-left transition-colors"
                            whileHover={{ scale: 1.01 }}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">{getTypeIcon(dispute.type)}</span>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-white capitalize">
                                                {dispute.type.replace('_', ' ')}
                                            </span>
                                            <span
                                                className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(
                                                    dispute.status
                                                )}`}
                                            >
                                                {dispute.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-400 line-clamp-1">
                                            {dispute.description}
                                        </p>
                                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(dispute.createdAt).toLocaleDateString()}
                                            </span>
                                            <span className={getPriorityColor(dispute.priority)}>
                                                {dispute.priority} priority
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-500" />
                            </div>
                        </motion.button>
                    ))}
                </div>
            )}

            {/* Create Dispute Form */}
            <AnimatePresence>
                {showCreateForm && (
                    <CreateDisputeForm
                        userId={userId}
                        onClose={() => setShowCreateForm(false)}
                        onCreated={(dispute) => {
                            setDisputes([dispute, ...disputes]);
                            setShowCreateForm(false);
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Dispute Detail */}
            <AnimatePresence>
                {selectedDispute && (
                    <DisputeDetail
                        dispute={selectedDispute}
                        userId={userId}
                        onClose={() => setSelectedDispute(null)}
                        onUpdate={(updated) => {
                            setDisputes(disputes.map((d) => (d.id === updated.id ? updated : d)));
                            setSelectedDispute(updated);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

interface CreateDisputeFormProps {
    userId: string;
    onClose: () => void;
    onCreated: (dispute: Dispute) => void;
}

function CreateDisputeForm({ userId, onClose, onCreated }: CreateDisputeFormProps) {
    const [step, setStep] = useState<'type' | 'details'>('type');
    const [formData, setFormData] = useState({
        rideId: '',
        againstUserId: '',
        type: '' as DisputeType,
        description: '',
    });
    const [submitting, setSubmitting] = useState(false);

    const disputeTypes: Array<{
        value: DisputeType;
        label: string;
        icon: string;
        description: string;
    }> = [
            { value: 'payment', label: 'Payment Issue', icon: '💰', description: 'Issues with ride costs or payments' },
            { value: 'no_show', label: 'No Show', icon: '👻', description: 'Driver or passenger didn\'t appear' },
            { value: 'safety', label: 'Safety Concern', icon: '🚨', description: 'Felt unsafe during the ride' },
            { value: 'behavior', label: 'Inappropriate Behavior', icon: '😤', description: 'Rude or inappropriate conduct' },
            { value: 'property_damage', label: 'Property Damage', icon: '💥', description: 'Vehicle or belongings damaged' },
            { value: 'route_issue', label: 'Route Issue', icon: '🗺️', description: 'Wrong route or significant detour' },
            { value: 'cancellation', label: 'Cancellation', icon: '❌', description: 'Unfair or late cancellation' },
            { value: 'other', label: 'Other', icon: '❓', description: 'Something else' },
        ];

    const handleSubmit = async () => {
        if (!formData.type || !formData.description) {
            alert('Please fill in all required fields');
            return;
        }

        setSubmitting(true);
        try {
            const dispute = await disputeService.createDispute(userId, {
                rideId: formData.rideId || 'unknown',
                againstUserId: formData.againstUserId || 'unknown',
                type: formData.type,
                description: formData.description,
            });
            onCreated(dispute);
        } catch (error) {
            console.error('Failed to create dispute:', error);
            alert('Failed to create dispute');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-slate-800 rounded-xl max-w-md w-full max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                    <h3 className="font-semibold text-white">File a Dispute</h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {step === 'type' && (
                        <motion.div
                            key="type"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="p-4 max-h-96 overflow-y-auto"
                        >
                            <p className="text-sm text-slate-400 mb-4">
                                What type of issue are you reporting?
                            </p>
                            <div className="space-y-2">
                                {disputeTypes.map((type) => (
                                    <button
                                        key={type.value}
                                        onClick={() => {
                                            setFormData({ ...formData, type: type.value });
                                            setStep('details');
                                        }}
                                        className="w-full p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg flex items-start gap-3 text-left transition-colors"
                                    >
                                        <span className="text-2xl">{type.icon}</span>
                                        <div>
                                            <p className="font-medium text-white">{type.label}</p>
                                            <p className="text-sm text-slate-400">{type.description}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {step === 'details' && (
                        <motion.div
                            key="details"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="p-4 space-y-4"
                        >
                            <div className="p-3 bg-slate-700/50 rounded-lg flex items-center gap-3">
                                <span className="text-xl">
                                    {disputeTypes.find((t) => t.value === formData.type)?.icon}
                                </span>
                                <span className="text-sm font-medium text-white capitalize">
                                    {formData.type.replace('_', ' ')}
                                </span>
                                <button
                                    onClick={() => setStep('type')}
                                    className="ml-auto text-sm text-purple-400"
                                >
                                    Change
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                    Describe what happened *
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Please provide details about the incident..."
                                    rows={5}
                                    className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 resize-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setStep('type')}
                                    className="flex-1 py-3 bg-slate-700 text-white font-medium rounded-lg hover:bg-slate-600 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting || !formData.description.trim()}
                                    className="flex-1 py-3 bg-purple-500 text-white font-medium rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        'Submit Dispute'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
}

interface DisputeDetailProps {
    dispute: Dispute;
    userId: string;
    onClose: () => void;
    onUpdate: (dispute: Dispute) => void;
}

function DisputeDetail({ dispute, userId, onClose, onUpdate }: DisputeDetailProps) {
    const [messages, setMessages] = useState<DisputeMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadMessages();
    }, [dispute.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadMessages = async () => {
        try {
            const data = await disputeService.getDisputeMessages(dispute.id);
            setMessages(data);
        } catch (error) {
            console.error('Failed to load messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;

        setSending(true);
        try {
            const message = await disputeService.sendMessage(
                dispute.id,
                userId,
                'user',
                newMessage
            );
            setMessages([...messages, message]);
            setNewMessage('');
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setSending(false);
        }
    };

    const getStatusColor = (status: Dispute['status']) => {
        switch (status) {
            case 'open':
                return 'text-yellow-400 bg-yellow-500/20';
            case 'under_review':
                return 'text-blue-400 bg-blue-500/20';
            case 'resolved':
                return 'text-emerald-400 bg-emerald-500/20';
            default:
                return 'text-slate-400 bg-slate-500/20';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-slate-800 rounded-xl max-w-lg w-full h-[80vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-white capitalize">
                                {dispute.type.replace('_', ' ')} Dispute
                            </h3>
                            <span
                                className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(
                                    dispute.status
                                )}`}
                            >
                                {dispute.status.replace('_', ' ')}
                            </span>
                        </div>
                        <p className="text-sm text-slate-400">
                            Opened {new Date(dispute.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Description */}
                <div className="p-4 border-b border-slate-700 flex-shrink-0">
                    <p className="text-sm text-slate-300">{dispute.description}</p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                        </div>
                    ) : messages.length === 0 ? (
                        <p className="text-center text-slate-400 py-8">No messages yet</p>
                    ) : (
                        messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.senderId === userId ? 'justify-end' : 'justify-start'
                                    }`}
                            >
                                <div
                                    className={`max-w-[80%] p-3 rounded-xl ${message.senderType === 'system'
                                            ? 'bg-slate-700/50 text-slate-400 text-center w-full text-sm'
                                            : message.senderId === userId
                                                ? 'bg-purple-500/20 text-white'
                                                : message.senderType === 'moderator'
                                                    ? 'bg-blue-500/20 text-white'
                                                    : 'bg-slate-700 text-white'
                                        }`}
                                >
                                    {message.senderType === 'moderator' && (
                                        <p className="text-xs text-blue-400 mb-1">Moderator</p>
                                    )}
                                    <p className="text-sm">{message.content}</p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {new Date(message.createdAt).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                {!['resolved', 'closed'].includes(dispute.status) && (
                    <div className="p-4 border-t border-slate-700 flex-shrink-0">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Type a message..."
                                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={sending || !newMessage.trim()}
                                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
                            >
                                {sending ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Send className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}

export default DisputeCenter;
