import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CreditCard,
    Wallet,
    Plus,
    Trash2,
    Check,
    Star,
    Loader2,
    Shield,
    X,
    AlertCircle,
} from 'lucide-react';
import { paymentService, PaymentMethod } from '../../services/paymentService';
import { useAuth } from '../../contexts/AuthContext';

interface PaymentMethodsProps {
    onMethodSelected?: (method: PaymentMethod) => void;
    selectable?: boolean;
}

export function PaymentMethods({ onMethodSelected, selectable = false }: PaymentMethodsProps) {
    const { user } = useAuth();
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddCard, setShowAddCard] = useState(false);
    const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            loadPaymentMethods();
        }
    }, [user]);

    const loadPaymentMethods = async () => {
        if (!user) return;
        setLoading(true);
        const data = await paymentService.getUserPaymentMethods(user.id);
        setMethods(data);

        // Auto-select default method
        const defaultMethod = data.find((m) => m.isDefault);
        if (defaultMethod) {
            setSelectedMethodId(defaultMethod.id);
        }
        setLoading(false);
    };

    const handleSetDefault = async (methodId: string) => {
        if (!user) return;
        await paymentService.setDefaultPaymentMethod(user.id, methodId);
        setMethods(
            methods.map((m) => ({
                ...m,
                isDefault: m.id === methodId,
            }))
        );
    };

    const handleDelete = async (methodId: string) => {
        setDeletingId(methodId);
        const success = await paymentService.removePaymentMethod(methodId);
        if (success) {
            setMethods(methods.filter((m) => m.id !== methodId));
        }
        setDeletingId(null);
    };

    const handleSelect = (method: PaymentMethod) => {
        setSelectedMethodId(method.id);
        onMethodSelected?.(method);
    };

    const getCardIcon = (brand?: string) => {
        const brandLower = brand?.toLowerCase();
        if (brandLower === 'visa') return '💳';
        if (brandLower === 'mastercard') return '💳';
        if (brandLower === 'amex') return '💳';
        return '💳';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Wallet className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Payment Methods</h3>
                        <p className="text-sm text-slate-400">{methods.length} saved</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddCard(true)}
                    className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Card
                </button>
            </div>

            {/* Methods List */}
            {methods.length === 0 ? (
                <div className="text-center py-8 bg-slate-800/50 rounded-xl border border-slate-700">
                    <CreditCard className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 mb-4">No payment methods saved</p>
                    <button
                        onClick={() => setShowAddCard(true)}
                        className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors"
                    >
                        Add Your First Card
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {methods.map((method) => (
                        <motion.div
                            key={method.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-4 bg-slate-800/50 rounded-xl border transition-all cursor-pointer ${selectable && selectedMethodId === method.id
                                    ? 'border-purple-500 ring-1 ring-purple-500'
                                    : 'border-slate-700 hover:border-slate-600'
                                }`}
                            onClick={() => selectable && handleSelect(method)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{getCardIcon(method.brand)}</span>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-white capitalize">
                                                {method.brand || 'Card'}
                                            </span>
                                            <span className="text-slate-400">•••• {method.last4}</span>
                                            {method.isDefault && (
                                                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded">
                                                    Default
                                                </span>
                                            )}
                                        </div>
                                        {method.expiryMonth && method.expiryYear && (
                                            <p className="text-sm text-slate-500">
                                                Expires {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {!method.isDefault && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSetDefault(method.id);
                                            }}
                                            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                                            title="Set as default"
                                        >
                                            <Star className="w-4 h-4 text-slate-400" />
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(method.id);
                                        }}
                                        disabled={deletingId === method.id}
                                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                                        title="Remove"
                                    >
                                        {deletingId === method.id ? (
                                            <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4 text-red-400" />
                                        )}
                                    </button>
                                    {selectable && selectedMethodId === method.id && (
                                        <div className="p-1 bg-purple-500 rounded-full">
                                            <Check className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Security Note */}
            <div className="flex items-start gap-2 p-3 bg-slate-800/30 rounded-lg">
                <Shield className="w-4 h-4 text-emerald-400 mt-0.5" />
                <p className="text-xs text-slate-400">
                    Your payment information is securely stored and encrypted. We never store your full card number.
                </p>
            </div>

            {/* Add Card Modal */}
            <AnimatePresence>
                {showAddCard && (
                    <AddCardModal
                        onClose={() => setShowAddCard(false)}
                        onAdded={(method) => {
                            setMethods([...methods, method]);
                            setShowAddCard(false);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

interface AddCardModalProps {
    onClose: () => void;
    onAdded: (method: PaymentMethod) => void;
}

function AddCardModal({ onClose, onAdded }: AddCardModalProps) {
    const { user } = useAuth();
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvc, setCvc] = useState('');
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const formatCardNumber = (value: string) => {
        const cleaned = value.replace(/\D/g, '');
        const groups = cleaned.match(/.{1,4}/g) || [];
        return groups.join(' ').slice(0, 19);
    };

    const formatExpiry = (value: string) => {
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length >= 2) {
            return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
        }
        return cleaned;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setError('');
        setSaving(true);

        try {
            // In production, this would use Stripe Elements
            // For demo, create a mock payment method
            const mockMethod: PaymentMethod = {
                id: crypto.randomUUID(),
                userId: user.id,
                type: 'card',
                brand: detectCardBrand(cardNumber),
                last4: cardNumber.replace(/\s/g, '').slice(-4),
                expiryMonth: parseInt(expiry.split('/')[0]),
                expiryYear: 2000 + parseInt(expiry.split('/')[1]),
                isDefault: false,
                stripePaymentMethodId: `pm_demo_${Date.now()}`,
                createdAt: new Date(),
            };

            onAdded(mockMethod);
        } catch (err) {
            setError('Failed to add card. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const detectCardBrand = (number: string): string => {
        const cleaned = number.replace(/\s/g, '');
        if (cleaned.startsWith('4')) return 'Visa';
        if (/^5[1-5]/.test(cleaned)) return 'Mastercard';
        if (/^3[47]/.test(cleaned)) return 'Amex';
        return 'Card';
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
                className="bg-slate-800 rounded-xl max-w-md w-full overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                    <h3 className="font-semibold text-white">Add Payment Card</h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                            Card Number
                        </label>
                        <input
                            type="text"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                            placeholder="1234 5678 9012 3456"
                            maxLength={19}
                            className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                Expiry Date
                            </label>
                            <input
                                type="text"
                                value={expiry}
                                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                                placeholder="MM/YY"
                                maxLength={5}
                                className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                CVC
                            </label>
                            <input
                                type="text"
                                value={cvc}
                                onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                placeholder="123"
                                maxLength={4}
                                className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                            Cardholder Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="John Smith"
                            className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                            required
                        />
                    </div>

                    <div className="flex items-start gap-2 p-3 bg-slate-700/50 rounded-lg">
                        <Shield className="w-4 h-4 text-emerald-400 mt-0.5" />
                        <p className="text-xs text-slate-400">
                            Your card details are encrypted and processed securely via Stripe.
                            We never store your full card number.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-slate-700 text-white font-medium rounded-lg hover:bg-slate-600 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !cardNumber || !expiry || !cvc || !name}
                            className="flex-1 py-3 bg-purple-500 text-white font-medium rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Add Card'
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

export default PaymentMethods;
