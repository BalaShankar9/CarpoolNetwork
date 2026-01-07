import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Wallet,
    ArrowUpRight,
    ArrowDownLeft,
    Receipt,
    Clock,
    CheckCircle,
    XCircle,
    RefreshCw,
    Filter,
    Download,
    Loader2,
    ChevronRight,
} from 'lucide-react';
import { paymentService, Payment } from '../../services/paymentService';
import { useAuth } from '../../contexts/AuthContext';

interface PaymentHistoryProps {
    limit?: number;
    showHeader?: boolean;
}

export function PaymentHistory({ limit, showHeader = true }: PaymentHistoryProps) {
    const { user } = useAuth();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');
    const [stats, setStats] = useState({
        totalPaid: 0,
        totalReceived: 0,
        pendingPayments: 0,
        paymentCount: 0,
    });

    useEffect(() => {
        if (user) {
            loadPayments();
            loadStats();
        }
    }, [user]);

    const loadPayments = async () => {
        if (!user) return;
        setLoading(true);
        const data = await paymentService.getUserPayments(user.id);
        setPayments(limit ? data.slice(0, limit) : data);
        setLoading(false);
    };

    const loadStats = async () => {
        if (!user) return;
        const data = await paymentService.getPaymentStats(user.id);
        setStats(data);
    };

    const filteredPayments = payments.filter((p) => {
        if (filter === 'sent') return p.payerId === user?.id;
        if (filter === 'received') return p.recipientId === user?.id;
        return true;
    });

    const getStatusIcon = (status: Payment['status']) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="w-4 h-4 text-emerald-400" />;
            case 'pending':
            case 'processing':
                return <Clock className="w-4 h-4 text-yellow-400" />;
            case 'failed':
            case 'cancelled':
                return <XCircle className="w-4 h-4 text-red-400" />;
            case 'refunded':
                return <RefreshCw className="w-4 h-4 text-blue-400" />;
            default:
                return null;
        }
    };

    const getStatusColor = (status: Payment['status']) => {
        switch (status) {
            case 'completed':
                return 'text-emerald-400 bg-emerald-500/20';
            case 'pending':
            case 'processing':
                return 'text-yellow-400 bg-yellow-500/20';
            case 'failed':
            case 'cancelled':
                return 'text-red-400 bg-red-500/20';
            case 'refunded':
                return 'text-blue-400 bg-blue-500/20';
            default:
                return 'text-slate-400 bg-slate-500/20';
        }
    };

    const getTypeLabel = (type: Payment['type']) => {
        switch (type) {
            case 'fuel_contribution':
                return 'Fuel Contribution';
            case 'premium_subscription':
                return 'Premium';
            case 'carbon_offset':
                return 'Carbon Offset';
            case 'tip':
                return 'Tip';
            default:
                return type;
        }
    };

    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency,
        }).format(amount);
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
            {showHeader && (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 bg-slate-800/50 rounded-xl border border-slate-700"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <ArrowUpRight className="w-4 h-4 text-red-400" />
                                <span className="text-sm text-slate-400">Sent</span>
                            </div>
                            <p className="text-xl font-bold text-white">
                                {formatCurrency(stats.totalPaid, 'GBP')}
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="p-4 bg-slate-800/50 rounded-xl border border-slate-700"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                                <span className="text-sm text-slate-400">Received</span>
                            </div>
                            <p className="text-xl font-bold text-white">
                                {formatCurrency(stats.totalReceived, 'GBP')}
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="p-4 bg-slate-800/50 rounded-xl border border-slate-700"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-4 h-4 text-yellow-400" />
                                <span className="text-sm text-slate-400">Pending</span>
                            </div>
                            <p className="text-xl font-bold text-white">{stats.pendingPayments}</p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="p-4 bg-slate-800/50 rounded-xl border border-slate-700"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Receipt className="w-4 h-4 text-purple-400" />
                                <span className="text-sm text-slate-400">Total</span>
                            </div>
                            <p className="text-xl font-bold text-white">{stats.paymentCount}</p>
                        </motion.div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                            {(['all', 'sent', 'received'] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f
                                            ? 'bg-purple-500 text-white'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                        }`}
                                >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>
                        <button className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                            <Download className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                </>
            )}

            {/* Payments List */}
            {filteredPayments.length === 0 ? (
                <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700">
                    <Wallet className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No payments found</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredPayments.map((payment, index) => {
                        const isSent = payment.payerId === user?.id;
                        return (
                            <motion.div
                                key={payment.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`p-2 rounded-lg ${isSent ? 'bg-red-500/20' : 'bg-emerald-500/20'
                                                }`}
                                        >
                                            {isSent ? (
                                                <ArrowUpRight className="w-5 h-5 text-red-400" />
                                            ) : (
                                                <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-white">
                                                    {getTypeLabel(payment.type)}
                                                </span>
                                                <span
                                                    className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(
                                                        payment.status
                                                    )}`}
                                                >
                                                    {payment.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-400">
                                                {new Date(payment.createdAt).toLocaleDateString('en-GB', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p
                                            className={`text-lg font-bold ${isSent ? 'text-red-400' : 'text-emerald-400'
                                                }`}
                                        >
                                            {isSent ? '-' : '+'}
                                            {formatCurrency(payment.amount, payment.currency)}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {limit && payments.length > limit && (
                <button className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg flex items-center justify-center gap-2 transition-colors">
                    View All Payments
                    <ChevronRight className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}

export default PaymentHistory;
